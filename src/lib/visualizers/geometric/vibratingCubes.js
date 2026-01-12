/**
 * Vibrating Cubes visualizer - 3D frequency grid with boost effect
 * @module visualizers/geometric/vibratingCubes
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  calculateDynamicGain,
  withSafeCanvasState
} from '../core/index.js';

export const vibratingCubes = {
  name_de: "3D Frequenz-Raster (Boost)",
  name_en: "3D Frequency Grid (Boost)",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const rows = 12, cols = 16;
    const cubeWidth = w / cols;
    const cubeHeight = h / rows;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const totalCubes = rows * cols;

    if (!visualizerState.smooth3DBars || visualizerState.smooth3DBars.length !== totalCubes) {
      visualizerState.smooth3DBars = new Array(totalCubes).fill(0);
    }

    withSafeCanvasState(ctx, () => {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const flatIndex = row * cols + col;
          const freqPos = col / cols;
          const freqIndex = Math.floor(freqPos * maxFreqIndex);
          const sampleSize = Math.max(2, Math.floor(maxFreqIndex / cols));
          const rawAmplitude = averageRange(dataArray, freqIndex, Math.min(maxFreqIndex, freqIndex + sampleSize)) / 255;

          const dynamicGain = calculateDynamicGain(col, cols) * 2;
          const targetHeight = rawAmplitude * dynamicGain * intensity;
          visualizerState.smooth3DBars[flatIndex] = visualizerState.smooth3DBars[flatIndex] * 0.6 + targetHeight * 0.4;

          const currentVal = visualizerState.smooth3DBars[flatIndex];
          if (currentVal < 0.03) continue;

          const x = col * cubeWidth + cubeWidth * 0.1;
          const y = row * cubeHeight + cubeHeight * 0.1;
          const size = cubeWidth * 0.8;

          const hue = (baseHsl.h + col * (120 / cols) + currentVal * 60) % 360;
          const lightness = 30 + currentVal * 50;
          const alpha = 0.3 + currentVal * 0.7;

          ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${lightness}%, ${alpha})`;
          ctx.fillRect(x, y, size, size);

          if (currentVal > 0.5) {
            ctx.strokeStyle = `hsla(${hue}, 100%, ${70 + currentVal * 20}%, ${currentVal})`;
            ctx.lineWidth = 2 * intensity;
            ctx.strokeRect(x, y, size, size);
          }
        }
      }
    });
  }
};
