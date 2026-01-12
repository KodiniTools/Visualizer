/**
 * Waveform Horizon visualizer - Perspective waveform lines
 * @module visualizers/spectrum/waveformHorizon
 */

import {
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const waveformHorizon = {
  name_de: "Wellenform-Horizont",
  name_en: "Waveform Horizon",
  needsTimeData: true,
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const numLines = 40;
    const horizon = height * 0.4;
    const baseHsl = hexToHsl(color);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.15)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(bufferLength * 0.15), Math.floor(bufferLength * 0.4)) / 255;

    const shakeX = (Math.random() - 0.5) * bassEnergy * 15 * intensity;
    const shakeY = (Math.random() - 0.5) * bassEnergy * 10 * intensity;

    withSafeCanvasState(ctx, () => {
      ctx.translate(shakeX, shakeY);

      for (let i = 0; i < numLines; i++) {
        const progress = i / numLines;
        const yOffset = horizon + (progress * progress) * (height * 0.6);
        const perspective = 1 - progress;

        ctx.beginPath();
        ctx.moveTo(0, yOffset);

        const sampleStep = Math.max(1, Math.floor(bufferLength / 200));
        const sliceWidth = width / (bufferLength / sampleStep);

        for (let j = 0; j < bufferLength; j += sampleStep) {
          const amplitude = (dataArray[j] - 128) * 3.0 * perspective;
          const bassBoost = 1 + bassEnergy * 2;
          const finalY = yOffset + amplitude * bassBoost * (0.5 + progress * 2) * intensity;
          ctx.lineTo((j / sampleStep) * sliceWidth, finalY);
        }

        const hue = (baseHsl.h + progress * 60 + bassEnergy * 30) % 360;
        const lightness = 50 + perspective * 40 + midEnergy * 10;
        ctx.strokeStyle = `hsla(${hue}, ${Math.min(100, baseHsl.s + 20)}%, ${lightness}%, ${0.6 + perspective * 0.4})`;
        ctx.lineWidth = (2 + perspective * 4) * intensity;
        ctx.stroke();
      }

      if (bassEnergy > 0.3) {
        ctx.beginPath();
        ctx.moveTo(0, horizon);
        ctx.lineTo(width, horizon);
        ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, 80%, ${bassEnergy * 0.5})`;
        ctx.lineWidth = 3 + bassEnergy * 5;
        ctx.stroke();
      }
    });
  }
};
