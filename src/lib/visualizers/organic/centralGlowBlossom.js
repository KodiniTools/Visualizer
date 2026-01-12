/**
 * Central Glow Blossom visualizer - Vibrating rays emanating from center
 * @module visualizers/organic/centralGlowBlossom
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const centralGlowBlossom = {
  name_de: "Zentrale Leuchtblüte (Vibrierend)",
  name_en: "Central Glow Blossom (Vibrating)",
  init(width, height) {
    visualizerState.centralBlossom = {
      rotation: 0,
      pulse: 0,
      rayLengths: new Array(32).fill(0)
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.centralBlossom) this.init(width, height);
    const state = visualizerState.centralBlossom;
    const baseHsl = hexToHsl(color);
    const centerX = width / 2;
    const centerY = height / 2;

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    state.rotation += 0.005 + midEnergy * 0.02;
    state.pulse += 0.08 + bassEnergy * 0.1;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.06 + bassEnergy * 0.03})`;
    ctx.fillRect(0, 0, width, height);

    const numRays = 32;
    const baseRadius = 50 + Math.sin(state.pulse) * 20;
    const maxRadius = Math.min(width, height) * 0.45;

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);

      // Draw all glow layers in sequence without state changes
      for (let layer = 3; layer >= 0; layer--) {
        const layerRadius = (baseRadius + bassEnergy * 100) * (1 + layer * 0.5);
        const layerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, layerRadius);
        const hue = (baseHsl.h + layer * 20) % 360;
        layerGlow.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.15 - layer * 0.03})`);
        layerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = layerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, layerRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.rotate(state.rotation);

      // Collect points for high-amplitude effects
      const highAmplitudePoints = [];

      for (let r = 0; r < numRays; r++) {
        const freqIndex = Math.floor((r / numRays) * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] || 0) / 255;

        const vibration = Math.sin(state.pulse + r * 0.3) * 0.2;
        const targetLength = baseRadius + (0.3 + amplitude * 0.7 + vibration) * (maxRadius - baseRadius);
        state.rayLengths[r] = state.rayLengths[r] * 0.75 + targetLength * 0.25;

        const angle = (r / numRays) * Math.PI * 2;
        const length = state.rayLengths[r] * intensity;

        const x = Math.cos(angle) * length;
        const y = Math.sin(angle) * length;

        const hue = (baseHsl.h + r * (180 / numRays) + highEnergy * 40) % 360;

        // Draw ray line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);

        const rayGradient = ctx.createLinearGradient(0, 0, x, y);
        rayGradient.addColorStop(0, `hsla(${hue}, 100%, 80%, 0.9)`);
        rayGradient.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${0.5 + amplitude * 0.4})`);
        rayGradient.addColorStop(1, `hsla(${hue}, 100%, 70%, ${0.3 + amplitude * 0.5})`);

        ctx.strokeStyle = rayGradient;
        ctx.lineWidth = (3 + amplitude * 6) * intensity;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 8 + amplitude * 12;
        ctx.stroke();

        // Collect high amplitude points for batch rendering
        if (amplitude > 0.3) {
          highAmplitudePoints.push({ x, y, amplitude, hue });
        }
      }

      // Reset shadow once, then batch draw high amplitude points
      ctx.shadowBlur = 0;

      for (const point of highAmplitudePoints) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3 + point.amplitude * 5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${point.hue}, 100%, 85%, ${0.5 + point.amplitude * 0.5})`;
        ctx.fill();
      }

      // Core
      const coreSize = 20 + bassEnergy * 30 + Math.sin(state.pulse * 2) * 10;
      const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 2);
      coreGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 100%, 1)`);
      coreGlow.addColorStop(0.3, `hsla(${baseHsl.h}, 100%, 80%, 0.9)`);
      coreGlow.addColorStop(0.7, `hsla(${baseHsl.h}, 100%, 60%, 0.4)`);
      coreGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(0, 0, coreSize * 2, 0, Math.PI * 2);
      ctx.fillStyle = coreGlow;
      ctx.fill();
    });
  }
};
