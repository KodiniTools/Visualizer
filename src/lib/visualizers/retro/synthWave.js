/**
 * Synth Wave visualizer - 80s retro grid with neon sun
 * @module visualizers/retro/synthWave
 */

import {
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const synthWave = {
  name_de: "Synth-Wave",
  name_en: "Synth Wave",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const horizon = height * 0.55;
    const numLines = 25;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, `hsl(${(baseHsl.h + 200) % 360}, 80%, ${8 + bassEnergy * 5}%)`);
    bgGradient.addColorStop(0.4, `hsl(${(baseHsl.h + 280) % 360}, 70%, ${5 + midEnergy * 3}%)`);
    bgGradient.addColorStop(0.6, `hsl(${baseHsl.h}, 60%, 3%)`);
    bgGradient.addColorStop(1, 'black');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    withSafeCanvasState(ctx, () => {
      const sunRadius = 60 + bassEnergy * 40;
      const sunY = horizon - 30;
      const sunGradient = ctx.createRadialGradient(width / 2, sunY, 0, width / 2, sunY, sunRadius * 1.5);
      sunGradient.addColorStop(0, `hsla(${(baseHsl.h + 30) % 360}, 100%, 70%, ${0.9 + bassEnergy * 0.1})`);
      sunGradient.addColorStop(0.3, `hsla(${baseHsl.h}, 100%, 60%, 0.8)`);
      sunGradient.addColorStop(0.6, `hsla(${(baseHsl.h - 20 + 360) % 360}, 100%, 50%, 0.4)`);
      sunGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGradient;
      ctx.fillRect(0, 0, width, horizon);

      const scanLines = 8;
      for (let i = 0; i < scanLines; i++) {
        const scanY = sunY - sunRadius + (i / scanLines) * sunRadius * 2;
        if (scanY < sunY - sunRadius * 0.3 || scanY > sunY + sunRadius) continue;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(width / 2 - sunRadius, scanY, sunRadius * 2, 3 + i * 0.5);
      }

      for (let i = 0; i < numLines; i++) {
        const progress = i / numLines;
        const y = horizon + progress * progress * (height - horizon);
        const perspectiveScale = 1 - (progress * 0.6);
        const distortion = Math.sin(Date.now() * 0.002 + progress * 8) * bassEnergy * 30 * intensity;

        ctx.beginPath();
        const segments = 60;
        for (let j = 0; j <= segments; j++) {
          const x = (j / segments) * width;
          const freqIndex = Math.floor((j / segments) * maxFreqIndex);
          const amplitude = (dataArray[freqIndex] || 0) / 255;
          const waveHeight = amplitude * 60 * perspectiveScale * intensity;
          const wave = Math.sin(x * 0.015 + Date.now() * 0.003) * waveHeight;
          const waveY = y + distortion + wave;

          if (j === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }

        const hue = (baseHsl.h + progress * 80) % 360;
        const lightness = 55 + (1 - progress) * 35 + midEnergy * 10;
        ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}%, ${(1 - progress) * 0.9})`;
        ctx.lineWidth = (2 + (1 - progress) * 4) * intensity;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 10 + bassEnergy * 15;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      const numVerticals = 20;
      for (let i = 0; i <= numVerticals; i++) {
        const xRatio = i / numVerticals;
        const x = xRatio * width;
        const vanishY = horizon - 20;

        const freqIndex = Math.floor(xRatio * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] || 0) / 255;

        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(width * 0.5, vanishY);

        const centerDistance = Math.abs(x - width * 0.5) / (width * 0.5);
        const alpha = (1 - centerDistance * 0.7) * (0.3 + amplitude * 0.5);

        const hue = (baseHsl.h + 60 + amplitude * 40) % 360;
        ctx.strokeStyle = `hsla(${hue}, 100%, ${50 + amplitude * 30}%, ${alpha})`;
        ctx.lineWidth = (1 + amplitude * 2) * intensity;
        ctx.stroke();
      }
    });
  }
};
