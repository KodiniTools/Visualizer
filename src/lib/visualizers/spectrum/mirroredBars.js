/**
 * Mirrored Bars visualizer - Multi-band boost mirrored bars
 * @module visualizers/spectrum/mirroredBars
 */

import {
  CONSTANTS,
  visualizerState,
  hexToHsl,
  rangeForBar,
  averageRange,
  calculateDynamicGain,
  getFrequencyBasedSmoothing,
  applySmoothValue,
  drawRoundedBar
} from '../core/index.js';

export const mirroredBars = {
  name_de: "Gespiegelte Balken (Multi-Band-Boost)",
  name_en: "Mirrored Bars (Multi-Band Boost)",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const numBars = 64;
    const barWidth = w / numBars;
    const actualBarWidth = barWidth * 0.9;
    const centerX = w / 2;
    const centerY = h / 2;
    const baseHsl = hexToHsl(color);
    const cornerRadius = Math.max(2, actualBarWidth * 0.3);

    if (visualizerState.smoothedMirroredBars.length !== numBars) {
      visualizerState.smoothedMirroredBars = new Array(numBars).fill(0);
    }

    for (let i = 0; i < numBars / 2; i++) {
      const dynamicGain = calculateDynamicGain(i, numBars);
      const [s, e] = rangeForBar(i, numBars, bufferLength);
      const rawValue = averageRange(dataArray, s, e);
      const normalizedValue = rawValue / 255;
      const targetHeight = normalizedValue * (h / 2) * dynamicGain * intensity;
      const smoothingFactor = getFrequencyBasedSmoothing(i, numBars, CONSTANTS.SMOOTHING_BASE);
      visualizerState.smoothedMirroredBars[i] = applySmoothValue(visualizerState.smoothedMirroredBars[i] || 0, targetHeight, smoothingFactor);

      const currentHeight = visualizerState.smoothedMirroredBars[i];
      if (currentHeight < 1) continue;

      const xLeft = centerX - (i + 1) * barWidth;
      const xRight = centerX + i * barWidth;
      const hue = (baseHsl.h + (i / (numBars / 2)) * 90) % 360;
      const barColor = `hsl(${hue}, ${baseHsl.s}%, ${baseHsl.l}%)`;
      const glowColor = `hsla(${hue}, 100%, 60%, ${0.4 + normalizedValue * 0.6})`;

      ctx.fillStyle = barColor;

      const glowOptions = {
        glow: true,
        glowColor: glowColor,
        glowBlur: 10 + normalizedValue * 10,
        glowIntensity: 0.5 + normalizedValue * 0.5
      };

      drawRoundedBar(ctx, xLeft, centerY, actualBarWidth, currentHeight, cornerRadius, glowOptions);
      drawRoundedBar(ctx, xLeft, centerY, actualBarWidth, -currentHeight, cornerRadius, glowOptions);
      drawRoundedBar(ctx, xRight, centerY, actualBarWidth, currentHeight, cornerRadius, glowOptions);
      drawRoundedBar(ctx, xRight, centerY, actualBarWidth, -currentHeight, cornerRadius, glowOptions);
    }
  }
};
