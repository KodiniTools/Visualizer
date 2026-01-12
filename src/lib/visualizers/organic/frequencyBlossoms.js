/**
 * Frequency Blossoms visualizer - Dynamic beat-reactive flower
 * @module visualizers/organic/frequencyBlossoms
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const frequencyBlossoms = {
  name_de: "Frequenz-Blüten (Dynamischer Beat)",
  name_en: "Frequency Blossoms (Dynamic Beat)",
  init(width, height) {
    visualizerState.freqBlossom = {
      rotation: 0,
      smoothedEnergy: 0,
      petalLengths: new Array(24).fill(0)
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.freqBlossom) this.init(width, height);
    const state = visualizerState.freqBlossom;
    const baseHsl = hexToHsl(color);
    const centerX = width / 2;
    const centerY = height / 2;

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

    state.smoothedEnergy = state.smoothedEnergy * 0.85 + bassEnergy * 0.15;
    state.rotation += 0.01 + bassEnergy * 0.03;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + bassEnergy * 0.04})`;
    ctx.fillRect(0, 0, width, height);

    const numPetals = 24;
    const baseRadius = Math.min(width, height) * 0.15;
    const maxRadius = Math.min(width, height) * 0.4;

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);
      ctx.rotate(state.rotation);

      // Background glow
      const glowRadius = baseRadius + state.smoothedEnergy * maxRadius * 0.5;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius * 1.5);
      glow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 60%, ${0.3 + bassEnergy * 0.3})`);
      glow.addColorStop(0.5, `hsla(${(baseHsl.h + 30) % 360}, 100%, 50%, ${0.1 + bassEnergy * 0.2})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Batch shadow state changes
      let shadowActive = false;

      for (let p = 0; p < numPetals; p++) {
        const freqIndex = Math.floor((p / numPetals) * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] || 0) / 255;

        const targetLength = baseRadius + amplitude * (maxRadius - baseRadius);
        state.petalLengths[p] = state.petalLengths[p] * 0.7 + targetLength * 0.3;

        const angle = (p / numPetals) * Math.PI * 2;
        const length = state.petalLengths[p] * intensity;

        const x1 = Math.cos(angle) * length;
        const y1 = Math.sin(angle) * length;
        const cp1x = Math.cos(angle + 0.2) * length * 0.6;
        const cp1y = Math.sin(angle + 0.2) * length * 0.6;
        const cp2x = Math.cos(angle - 0.2) * length * 0.6;
        const cp2y = Math.sin(angle - 0.2) * length * 0.6;

        const hue = (baseHsl.h + p * (360 / numPetals) + midEnergy * 30) % 360;

        // Draw filled petal
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(cp1x, cp1y, x1, y1);
        ctx.quadraticCurveTo(cp2x, cp2y, 0, 0);

        const petalGradient = ctx.createLinearGradient(0, 0, x1, y1);
        petalGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.3)`);
        petalGradient.addColorStop(0.7, `hsla(${hue}, 100%, 60%, ${0.4 + amplitude * 0.4})`);
        petalGradient.addColorStop(1, `hsla(${hue}, 100%, 80%, ${0.6 + amplitude * 0.4})`);
        ctx.fillStyle = petalGradient;
        ctx.fill();

        // Set shadow only once for stroke batch
        if (!shadowActive) {
          ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
          ctx.shadowBlur = 10 + amplitude * 15;
          shadowActive = true;
        }

        // Draw petal outline
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(cp1x, cp1y, x1, y1);
        ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${0.5 + amplitude * 0.5})`;
        ctx.lineWidth = (2 + amplitude * 4) * intensity;
        ctx.stroke();
      }

      // Reset shadow once after loop
      if (shadowActive) {
        ctx.shadowBlur = 0;
      }

      // Core
      const coreRadius = 15 + state.smoothedEnergy * 25;
      const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
      coreGradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 95%, 1)`);
      coreGradient.addColorStop(0.5, `hsla(${baseHsl.h}, 100%, 70%, 0.8)`);
      coreGradient.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();
    });
  }
};
