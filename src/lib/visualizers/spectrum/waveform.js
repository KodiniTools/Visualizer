/**
 * Waveform visualizer - Frequency-enhanced waveform display
 * @module visualizers/spectrum/waveform
 */

import {
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const waveform = {
  name_de: 'Wellenform (Frequenz-Enhanced)',
  name_en: 'Waveform (Frequency-Enhanced)',
  needsTimeData: true,
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const baseHsl = hexToHsl(color);
    const centerY = h / 2;
    const totalEnergy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.3)) / 255;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.strokeStyle = `hsla(${baseHsl.h}, 50%, 30%, 0.3)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    withSafeCanvasState(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      const sliceWidth = w / bufferLength;

      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] / 128.0) - 1.0;
        const x = i * sliceWidth;
        const y = centerY + v * (h / 2.5);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, centerY);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 60%, ${0.4 + totalEnergy * 0.3})`);
      gradient.addColorStop(0.5, `hsla(${baseHsl.h}, 100%, 40%, ${0.2 + totalEnergy * 0.2})`);
      gradient.addColorStop(1, `hsla(${(baseHsl.h + 40) % 360}, 100%, 60%, ${0.4 + totalEnergy * 0.3})`);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] / 128.0) - 1.0;
        const x = i * sliceWidth;
        const y = centerY + v * (h / 2.5);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, 70%, ${0.7 + totalEnergy * 0.3})`;
      ctx.lineWidth = (4 + totalEnergy * 6) * intensity;
      ctx.shadowColor = `hsl(${baseHsl.h}, 100%, 60%)`;
      ctx.shadowBlur = 15 + totalEnergy * 20;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] / 128.0) - 1.0;
        const x = i * sliceWidth;
        const y = centerY - v * (h / 3);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${(baseHsl.h + 30) % 360}, 80%, 60%, ${0.3 + totalEnergy * 0.2})`;
      ctx.lineWidth = (2 + totalEnergy * 3) * intensity;
      ctx.stroke();
    });
  }
};
