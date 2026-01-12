/**
 * Liquid Crystals visualizer - Displays floating hexagonal crystals
 * @module visualizers/effects/liquidCrystals
 */

import {
  visualizerState,
  hexToHsl,
  calculateDynamicGain,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const liquidCrystals = {
  name_de: "Fluessigkristalle",
  name_en: "Liquid Crystals",
  init(width, height) {
    visualizerState.liquidCrystals = { crystals: [], numCrystals: 60, time: 0 };
    for (let i = 0; i < 60; i++) {
      visualizerState.liquidCrystals.crystals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        baseSize: 15 + Math.random() * 25,
        smoothedSize: 15 + Math.random() * 25,
        hueOffset: Math.random() * 60,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.liquidCrystals) this.init(width, height);
    const state = visualizerState.liquidCrystals;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

    state.time = (state.time || 0) + 0.02;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + bassEnergy * 0.05})`;
    ctx.fillRect(0, 0, width, height);

    if (bassEnergy > 0.3) {
      const bgGlow = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height) * 0.5);
      bgGlow.addColorStop(0, `hsla(${baseHsl.h}, 80%, 40%, ${bassEnergy * 0.15})`);
      bgGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);
    }

    state.crystals.forEach((crystal, index) => {
      const freqIndex = Math.floor((index / state.numCrystals) * maxFreqIndex);
      const amplitude = (dataArray[freqIndex] || 0) / 255;
      const dynamicGain = calculateDynamicGain(index, state.numCrystals);
      const effectiveAmplitude = amplitude * dynamicGain * intensity;

      const speedMult = 1 + bassEnergy * 3 + effectiveAmplitude * 2;
      crystal.x += crystal.vx * speedMult;
      crystal.y += crystal.vy * speedMult;
      crystal.rotation += crystal.rotationSpeed * (1 + effectiveAmplitude * 3);

      if (crystal.x < 0 || crystal.x > width) {
        crystal.vx *= -1;
        crystal.vy += (Math.random() - 0.5) * bassEnergy * 2;
      }
      if (crystal.y < 0 || crystal.y > height) {
        crystal.vy *= -1;
        crystal.vx += (Math.random() - 0.5) * bassEnergy * 2;
      }

      const pulse = Math.sin(state.time * 3 + crystal.pulsePhase) * 0.2 + 1;
      const targetSize = crystal.baseSize * pulse * (1 + effectiveAmplitude * 2);
      crystal.smoothedSize = crystal.smoothedSize * 0.7 + targetSize * 0.3;

      withSafeCanvasState(ctx, () => {
        ctx.translate(crystal.x, crystal.y);
        ctx.rotate(crystal.rotation);

        const sides = 6;
        const hue = (baseHsl.h + crystal.hueOffset + midEnergy * 40) % 360;

        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2;
          const x = Math.cos(angle) * crystal.smoothedSize * 1.3;
          const y = Math.sin(angle) * crystal.smoothedSize * 1.3;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.1 + effectiveAmplitude * 0.2})`;
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2;
          const wobble = Math.sin(state.time * 5 + i) * effectiveAmplitude * 5;
          const x = Math.cos(angle) * (crystal.smoothedSize + wobble);
          const y = Math.sin(angle) * (crystal.smoothedSize + wobble);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, crystal.smoothedSize);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${0.8 + effectiveAmplitude * 0.2})`);
        gradient.addColorStop(0.5, `hsla(${hue}, 90%, 60%, ${0.5 + effectiveAmplitude * 0.3})`);
        gradient.addColorStop(1, `hsla(${hue}, 80%, 40%, ${0.3 + effectiveAmplitude * 0.4})`);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = `hsla(${hue}, 100%, ${75 + effectiveAmplitude * 25}%, ${0.7 + effectiveAmplitude * 0.3})`;
        ctx.lineWidth = (2 + effectiveAmplitude * 4) * intensity;
        ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowBlur = 10 + effectiveAmplitude * 20;
        ctx.stroke();
      });
    });
  }
};
