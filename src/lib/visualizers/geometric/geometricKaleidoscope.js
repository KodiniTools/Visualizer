/**
 * Geometric Kaleidoscope visualizer - Rotating kaleidoscope pattern with layered segments
 * @module visualizers/geometric/geometricKaleidoscope
 */

import {
  hexToHsl,
  averageRange,
  calculateDynamicGain,
  withSafeCanvasState
} from '../core/index.js';

export const geometricKaleidoscope = {
  name_de: "Geometrisches Kaleidoskop",
  name_en: "Geometric Kaleidoscope",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const centerX = width / 2, centerY = height / 2;
    const numSegments = 8, numLayers = 6;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);
      ctx.rotate(Date.now() * 0.0003);
      for (let layer = 0; layer < numLayers; layer++) {
        const layerProgress = layer / numLayers;
        const freqPerLayer = maxFreqIndex / numLayers;
        const s = Math.floor(layer * freqPerLayer);
        const e = Math.max(s + 1, Math.floor((layer + 1) * freqPerLayer));

        const amplitude = averageRange(dataArray, s, e) / 255;
        const dynamicGain = calculateDynamicGain(layer, numLayers);
        const effectiveAmplitude = amplitude * dynamicGain * intensity;
        const baseRadius = 50 + layer * 40;
        const radius = baseRadius + effectiveAmplitude * 120;
        for (let i = 0; i < numSegments; i++) {
          const angle = (i / numSegments) * Math.PI * 2;
          const nextAngle = ((i + 1) / numSegments) * Math.PI * 2;
          const x1 = Math.cos(angle) * radius, y1 = Math.sin(angle) * radius;
          const x2 = Math.cos(nextAngle) * radius, y2 = Math.sin(nextAngle) * radius;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath();
          const hue = (baseHsl.h + layerProgress * 120 + i * 15) % 360;
          ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${40 + effectiveAmplitude * 50}%, ${0.5 + effectiveAmplitude * 0.5})`;
          ctx.fill();
          ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${70 + effectiveAmplitude * 30}%)`;
          ctx.lineWidth = (2 + effectiveAmplitude * 5) * intensity;
          ctx.stroke();
        }
      }
    });
  }
};
