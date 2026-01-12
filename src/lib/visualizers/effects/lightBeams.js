/**
 * Light Beams visualizer - Displays radiating light beams from center
 * @module visualizers/effects/lightBeams
 */

import {
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const lightBeams = {
  name_de: "Lichtstrahlen",
  name_en: "Light Beams",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const numBeams = 72;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

    withSafeCanvasState(ctx, () => {
      for (let i = 0; i < numBeams; i++) {
        const freqIndex = Math.floor((i / numBeams) * maxFreqIndex);
        const sampleSize = Math.max(1, Math.floor(maxFreqIndex / numBeams));
        const s = freqIndex;
        const e = Math.min(maxFreqIndex, freqIndex + sampleSize);

        const rawAmplitude = averageRange(dataArray, s, e) / 255;
        const amplitude = Math.max(0.4, rawAmplitude * 1.8 + overallEnergy * 0.3);

        const angle = (i / numBeams) * Math.PI * 2;
        const length = (50 + amplitude * Math.min(width, height) * 0.5) * intensity;
        const beamWidth = (3 + amplitude * 10) * intensity;

        const x1 = centerX + Math.cos(angle) * 30;
        const y1 = centerY + Math.sin(angle) * 30;
        const x2 = centerX + Math.cos(angle) * (30 + length);
        const y2 = centerY + Math.sin(angle) * (30 + length);

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        const hue = (baseHsl.h + (i / numBeams) * 180) % 360;
        gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${0.6 * amplitude})`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = beamWidth;
        ctx.stroke();

        if (amplitude > 0.7) {
          ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
          ctx.shadowBlur = 15 * intensity;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `hsla(${hue}, 100%, 85%, ${amplitude * 0.6})`;
          ctx.lineWidth = beamWidth * 0.4;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    });
  }
};
