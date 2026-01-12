/**
 * Pulsing Orbs visualizer - Displays audio-reactive glowing orbs
 * @module visualizers/effects/pulsingOrbs
 */

import {
  hexToHsl,
  averageRange,
  calculateDynamicGain,
  withSafeCanvasState
} from '../core/index.js';

export const pulsingOrbs = {
  name_de: "Pulsierende Kugeln",
  name_en: "Pulsing Orbs",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const numOrbs = Math.min(12, maxFreqIndex);
    const baseHsl = hexToHsl(color);

    for (let i = 0; i < numOrbs; i++) {
      const freqPerOrb = maxFreqIndex / numOrbs;
      const s = Math.floor(i * freqPerOrb);
      const e = Math.max(s + 1, Math.floor((i + 1) * freqPerOrb));

      const amplitude = averageRange(dataArray, s, e) / 255;
      const dynamicGain = calculateDynamicGain(i, numOrbs);
      const x = (width / (numOrbs + 1)) * (i + 1);
      const y = height / 2;
      const baseRadius = Math.min(width, height) / 30;
      const radius = baseRadius + (amplitude * dynamicGain * baseRadius * 2 * intensity);

      withSafeCanvasState(ctx, () => {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
        const hue = (baseHsl.h + (i / numOrbs) * 60) % 360;
        gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.8 + amplitude * 0.2})`);
        gradient.addColorStop(0.7, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.4 + amplitude * 0.6})`);
        gradient.addColorStop(1, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${70 + amplitude * 30}%)`;
        ctx.fill();
      });
    }
  }
};
