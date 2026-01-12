/**
 * Chiptune Pulse visualizer - Futuristic neon grid
 * @module visualizers/retro/chiptunePulse
 */

import {
  visualizerState,
  hexToHsl,
  applySmoothValue
} from '../core/index.js';

export const chiptunePulse = {
  name_de: 'Chiptune-Puls (Futuristisch)',
  name_en: 'Chiptune Pulse (Futuristic)',
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const baseHsl = hexToHsl(color);
    const gridSize = Math.max(8, Math.floor(Math.min(w, h) / 50));
    const cols = Math.ceil(w / gridSize);
    const rows = Math.ceil(h / gridSize);

    const stateKey = 'chiptunePulse_grid';
    const totalCells = cols * rows;
    if (!visualizerState[stateKey] || visualizerState[stateKey].length !== totalCells) {
      visualizerState[stateKey] = new Array(totalCells).fill(0);
    }

    ctx.fillStyle = 'rgba(0, 0, 10, 0.15)';
    ctx.fillRect(0, 0, w, h);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const neonColors = [180, 300, 220, 120, 280, 200];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellIndex = row * cols + col;
        const distFromCenter = Math.sqrt(
          Math.pow((col - cols / 2) / cols, 2) +
          Math.pow((row - rows / 2) / rows, 2)
        );

        const waveOffset = Math.sin((col + row) * 0.3) * 0.5 + 0.5;
        const freqIndex = Math.floor((distFromCenter + waveOffset * 0.3) * maxFreqIndex * 2) % maxFreqIndex;
        const value = dataArray[freqIndex] / 255;

        const target = value * intensity;
        visualizerState[stateKey][cellIndex] = applySmoothValue(
          visualizerState[stateKey][cellIndex] || 0,
          target,
          0.4
        );
        const smoothedValue = visualizerState[stateKey][cellIndex];

        if (smoothedValue > 0.05) {
          const x = col * gridSize;
          const y = row * gridSize;
          const pulseSize = gridSize * (0.2 + smoothedValue * 0.8);
          const offset = (gridSize - pulseSize) / 2;
          const colorIndex = Math.floor((distFromCenter * 3 + smoothedValue * 2) % neonColors.length);
          const hue = neonColors[colorIndex];

          if (smoothedValue > 0.3) {
            ctx.shadowBlur = smoothedValue * 20;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
          }

          const lightness = 45 + smoothedValue * 40;
          ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
          ctx.fillRect(x + offset, y + offset, pulseSize, pulseSize);

          if (smoothedValue > 0.5) {
            const coreSize = pulseSize * 0.6;
            const coreOffset = (gridSize - coreSize) / 2;
            ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${smoothedValue * 0.8})`;
            ctx.fillRect(x + coreOffset, y + coreOffset, coreSize, coreSize);
          }

          ctx.shadowBlur = 0;
        }
      }
    }

    ctx.restore();
  }
};
