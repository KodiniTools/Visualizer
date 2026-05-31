/**
 * Radial Bars visualizer - Circular frequency bars
 * @module visualizers/spectrum/radialBars
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState,
  getCachedRadialGradient,
  CONSTANTS
} from '../core/index.js';

export const radialBars = {
  name_de: "Radiale Balken",
  name_en: "Radial Bars",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const numBars = 64;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) / 2 * 0.85;
    const minRadius = 40;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * CONSTANTS.FREQ_RATIO);

    if (!visualizerState.smoothedRadialBars || visualizerState.smoothedRadialBars.length !== numBars) {
      visualizerState.smoothedRadialBars = new Array(numBars).fill(0);
    }

    const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

    withSafeCanvasState(ctx, () => {
      const glowGradient = getCachedRadialGradient(
        ctx, `radial_center_${baseHsl.h | 0}`,
        centerX, centerY, 0, minRadius * 2,
        [
          [0, `hsla(${baseHsl.h}, 100%, 70%, 0.8)`],
          [1, `hsla(${baseHsl.h}, 100%, 50%, 0)`]
        ]
      );
      ctx.globalAlpha = 0.3 + overallEnergy * 0.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, minRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();
      ctx.globalAlpha = 1;

      const sampleSize = Math.max(2, Math.floor(maxFreqIndex / (numBars / 2)));
      ctx.lineCap = 'round';

      for (let i = 0; i < numBars; i++) {
        const freqPos = (i % (numBars / 2)) / (numBars / 2);
        const freqIndex = Math.floor(freqPos * maxFreqIndex);
        const rawAmplitude = averageRange(dataArray, freqIndex, Math.min(maxFreqIndex, freqIndex + sampleSize)) / 255;

        const minLength = (maxRadius - minRadius) * 0.3;
        const audioLength = rawAmplitude * (maxRadius - minRadius) * 0.7 * 1.5;
        const targetLength = (minLength + audioLength) * intensity;

        // Use frequency-appropriate smoothing: bass=slower, treble=faster
        const smoothing = i < numBars * 0.3 ? 0.35 : i < numBars * 0.7 ? 0.42 : 0.55;
        visualizerState.smoothedRadialBars[i] = visualizerState.smoothedRadialBars[i] * (1 - smoothing) + targetLength * smoothing;

        const barLength = visualizerState.smoothedRadialBars[i];
        const angle = (i / numBars) * 2 * Math.PI - Math.PI / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const startX = centerX + cos * minRadius;
        const startY = centerY + sin * minRadius;
        const endX = centerX + cos * (minRadius + barLength);
        const endY = centerY + sin * (minRadius + barLength);

        // Cache gradient by hue bucket (8° increments) — avoids 64 new gradients/frame
        const hue = (baseHsl.h + (i / numBars) * 360) % 360;
        const hueBucket = Math.round(hue / 8) * 8;
        const gradKey = `radialbar_${hueBucket}_${minRadius | 0}`;
        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 1)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 78%, ${0.65 + rawAmplitude * 0.35})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = (3 + rawAmplitude * 5) * intensity;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
  }
};
