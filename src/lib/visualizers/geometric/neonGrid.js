/**
 * Neon Grid visualizer - Retro-style perspective grid with neon glow effects
 * @module visualizers/geometric/neonGrid
 */

import {
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const neonGrid = {
  name_de: "Neon-Gitter",
  name_en: "Neon Grid",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

    const horizon = height * 0.35 + bassEnergy * 50 * intensity;
    const vanishingPointX = width / 2;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, `hsla(${(baseHsl.h + 180) % 360}, 60%, ${5 + bassEnergy * 5}%, 1)`);
    bgGradient.addColorStop(0.5, `hsla(${baseHsl.h}, 50%, 3%, 1)`);
    bgGradient.addColorStop(1, 'black');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const time = Date.now() * 0.001;

    withSafeCanvasState(ctx, () => {
      const numHLines = 20;
      const scrollOffset = (time * 50 * (1 + bassEnergy)) % (height / numHLines);

      for (let i = 0; i < numHLines; i++) {
        const baseProgress = i / numHLines;
        const progress = baseProgress + scrollOffset / height;
        if (progress > 1) continue;

        const y = horizon + progress * progress * (height - horizon);
        const freqIndex = Math.floor(baseProgress * maxFreqIndex);
        const freq = (dataArray[freqIndex] || 0) / 255;
        const wave = Math.sin(time * 3 + i * 0.5) * freq * 20 * intensity;

        ctx.beginPath();
        ctx.moveTo(0, y + wave);
        ctx.lineTo(width, y + wave);

        const alpha = 0.3 + (1 - progress) * 0.6 + freq * 0.2;
        const lightness = 50 + (1 - progress) * 30 + midEnergy * 20;
        ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, ${lightness}%, ${alpha})`;
        ctx.lineWidth = (2 + (1 - progress) * 4 + freq * 3) * intensity;
        ctx.shadowColor = `hsl(${baseHsl.h}, 100%, 60%)`;
        ctx.shadowBlur = 5 + bassEnergy * 10;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      const numVLines = 25;
      for (let i = 0; i <= numVLines; i++) {
        const progress = i / numVLines;
        const freqIndex = Math.floor(progress * maxFreqIndex);
        const freq = (dataArray[freqIndex] || 0) / 255;

        const startX = progress * width;
        const startY = height + freq * 20;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(vanishingPointX, horizon - 30 - bassEnergy * 30);

        const centerDistance = Math.abs(progress - 0.5) * 2;
        const alpha = (1 - centerDistance * 0.6) * (0.3 + freq * 0.5);
        const hue = (baseHsl.h + 40 + freq * 30) % 360;

        ctx.strokeStyle = `hsla(${hue}, 100%, ${50 + freq * 40}%, ${alpha})`;
        ctx.lineWidth = (1 + freq * 3) * intensity;
        ctx.stroke();
      }

      if (bassEnergy > 0.2) {
        const glowGradient = ctx.createRadialGradient(
          vanishingPointX, horizon, 0,
          vanishingPointX, horizon, 150 + bassEnergy * 100
        );
        glowGradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 70%, ${bassEnergy * 0.4})`);
        glowGradient.addColorStop(0.5, `hsla(${(baseHsl.h + 30) % 360}, 100%, 50%, ${bassEnergy * 0.2})`);
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, width, height);
      }
    });
  }
};
