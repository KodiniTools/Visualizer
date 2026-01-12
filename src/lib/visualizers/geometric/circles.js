/**
 * Circles visualizer - Dynamic concentric circles that respond to audio frequencies
 * @module visualizers/geometric/circles
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  calculateDynamicGain,
  applySmoothValue,
  withSafeCanvasState
} from '../core/index.js';

export const circles = {
  name_de: "Kreise (Dynamisch)",
  name_en: "Circles (Dynamic)",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const numCircles = 10;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) / 2 * 0.9;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    if (visualizerState.smoothedCircles.length !== numCircles) {
      visualizerState.smoothedCircles = new Array(numCircles).fill(0);
    }

    withSafeCanvasState(ctx, () => {
      for (let i = numCircles - 1; i >= 0; i--) {
        const freqPerCircle = maxFreqIndex / numCircles;
        const s = Math.floor(i * freqPerCircle);
        const e = Math.max(s + 1, Math.floor((i + 1) * freqPerCircle));

        const rawAmplitude = averageRange(dataArray, s, e) / 255;
        const dynamicGain = calculateDynamicGain(i, numCircles);

        const baseRadius = ((numCircles - i) / numCircles) * maxRadius;
        const targetRadius = baseRadius * (1 + rawAmplitude * dynamicGain * 0.5);
        visualizerState.smoothedCircles[i] = applySmoothValue(visualizerState.smoothedCircles[i] || 0, targetRadius, 0.4);

        const currentRadius = visualizerState.smoothedCircles[i] * intensity;
        const hue = (baseHsl.h + (i / numCircles) * 120) % 360;

        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.6 + rawAmplitude * 0.4})`;
        ctx.lineWidth = (3 + rawAmplitude * dynamicGain * 6) * intensity;
        ctx.stroke();

        if (rawAmplitude > 0.3) {
          ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
          ctx.shadowBlur = rawAmplitude * 20 * intensity;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    });
  }
};
