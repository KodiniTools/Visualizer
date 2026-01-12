/**
 * Radial Bars visualizer - Circular frequency bars
 * @module visualizers/spectrum/radialBars
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
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
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    if (!visualizerState.smoothedRadialBars || visualizerState.smoothedRadialBars.length !== numBars) {
      visualizerState.smoothedRadialBars = new Array(numBars).fill(0);
    }

    const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

    withSafeCanvasState(ctx, () => {
      const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, minRadius * 2);
      glowGradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 70%, ${0.3 + overallEnergy * 0.5})`);
      glowGradient.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(centerX, centerY, minRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      for (let i = 0; i < numBars; i++) {
        const freqPos = (i % (numBars / 2)) / (numBars / 2);
        const freqIndex = Math.floor(freqPos * maxFreqIndex);
        const sampleSize = Math.max(2, Math.floor(maxFreqIndex / (numBars / 2)));
        const rawAmplitude = averageRange(dataArray, freqIndex, Math.min(maxFreqIndex, freqIndex + sampleSize)) / 255;

        const minLength = (maxRadius - minRadius) * 0.3;
        const audioLength = rawAmplitude * (maxRadius - minRadius) * 0.7 * 1.5;
        const targetLength = (minLength + audioLength) * intensity;

        visualizerState.smoothedRadialBars[i] = visualizerState.smoothedRadialBars[i] * 0.6 + targetLength * 0.4;

        const barLength = visualizerState.smoothedRadialBars[i];
        const angle = (i / numBars) * 2 * Math.PI - Math.PI / 2;

        const startX = centerX + Math.cos(angle) * minRadius;
        const startY = centerY + Math.sin(angle) * minRadius;
        const endX = centerX + Math.cos(angle) * (minRadius + barLength);
        const endY = centerY + Math.sin(angle) * (minRadius + barLength);

        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        const hue = (baseHsl.h + (i / numBars) * 360) % 360;
        gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 1)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 75%, ${0.7 + rawAmplitude * 0.3})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = (4 + rawAmplitude * 6) * intensity;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
  }
};
