/**
 * Hexagon Grid visualizer - Audio-reactive hexagonal grid pattern
 * @module visualizers/geometric/hexagonGrid
 */

import {
  hexToHsl,
  withSafeCanvasState
} from '../core/index.js';

export const hexagonGrid = {
  name_de: "Sechseck-Gitter",
  name_en: "Hexagon Grid",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const hexSize = 30;
    const hexWidth = hexSize * 2;
    const hexHeight = hexSize * Math.sqrt(3);
    const cols = Math.floor(width / (hexWidth * 0.75)) + 1;
    const rows = Math.floor(height / hexHeight) + 1;
    const baseHsl = hexToHsl(color);
    withSafeCanvasState(ctx, () => {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * hexWidth * 0.75;
          const y = row * hexHeight + (col % 2) * hexHeight * 0.5;
          const normalizedX = x / width;
          const normalizedY = y / height;
          const freqIndex = Math.floor((normalizedX + normalizedY) * 0.5 * bufferLength);
          const amplitude = (dataArray[freqIndex] || 0) / 255;
          if (amplitude > 0.1) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3;
              const hx = x + Math.cos(angle) * hexSize;
              const hy = y + Math.sin(angle) * hexSize;
              if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            const hue = (baseHsl.h + amplitude * 180) % 360;
            ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${30 + amplitude * 50}%, ${amplitude})`;
            ctx.fill();
            ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${60 + amplitude * 30}%)`;
            ctx.lineWidth = (1 + amplitude * 2) * intensity;
            ctx.stroke();
          }
        }
      }
    });
  }
};
