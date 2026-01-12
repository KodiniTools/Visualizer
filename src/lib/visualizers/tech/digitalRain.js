/**
 * Digital Rain visualizer - Modern falling block effect
 * @module visualizers/tech/digitalRain
 */

import {
  visualizerState,
  hexToHsl,
  averageRange
} from '../core/index.js';

export const digitalRain = {
  name_de: "Digitaler Regen",
  name_en: "Digital Rain",
  init(width, height) {
    const columns = Math.floor(width / 15);
    visualizerState.digitalRain = {
      columns,
      drops: Array.from({ length: columns }, () => ({
        y: Math.random() * height * 2 - height,
        speed: 3 + Math.random() * 6,
        length: 10 + Math.floor(Math.random() * 15),
        hueOffset: Math.random() * 30
      }))
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.digitalRain) this.init(width, height);
    const state = visualizerState.digitalRain;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + bassEnergy * 0.04})`;
    ctx.fillRect(0, 0, width, height);

    const columnWidth = width / state.columns;
    const segmentHeight = 12;

    for (let i = 0; i < state.columns; i++) {
      const freqPos = (i % Math.floor(state.columns / 3)) / (state.columns / 3);
      const freqIndex = Math.floor(freqPos * maxFreqIndex);
      const amplitude = (dataArray[freqIndex] || 0) / 255;

      const drop = state.drops[i];
      const speedMult = 1 + bassEnergy * 2 + amplitude * 3;
      drop.speed = (4 + amplitude * 8) * intensity;

      const currentLength = Math.floor(drop.length * (0.5 + amplitude * 1.5));
      const hue = (baseHsl.h + drop.hueOffset + midEnergy * 30) % 360;

      for (let j = 0; j < currentLength; j++) {
        const segmentY = drop.y - j * segmentHeight;

        if (segmentY > -segmentHeight && segmentY < height + segmentHeight) {
          const trailFade = 1 - (j / currentLength);
          const x = i * columnWidth + 1;
          const segWidth = columnWidth - 2;

          if (j === 0) {
            const gradient = ctx.createLinearGradient(x, segmentY, x, segmentY + segmentHeight);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.95)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0.8)`);
            ctx.fillStyle = gradient;
            ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
            ctx.shadowBlur = 15 + amplitude * 10;
          } else {
            const lightness = 50 + trailFade * 30 + amplitude * 20;
            const alpha = trailFade * (0.5 + amplitude * 0.5);
            ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
            ctx.shadowBlur = 0;
          }

          const radius = 3;
          ctx.beginPath();
          ctx.roundRect(x, segmentY, segWidth, segmentHeight - 2, radius);
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;

      drop.y += drop.speed * speedMult;

      if (drop.y - currentLength * segmentHeight > height) {
        drop.y = -drop.length * segmentHeight - Math.random() * 100;
        drop.length = 10 + Math.floor(Math.random() * 15);
      }
    }

    if (midEnergy > 0.4) {
      for (let g = 0; g < 3; g++) {
        const gx = Math.random() * width;
        const gy = Math.random() * height;
        ctx.beginPath();
        ctx.arc(gx, gy, 2 + midEnergy * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHsl.h}, 100%, 90%, ${midEnergy * 0.6})`;
        ctx.fill();
      }
    }
  }
};
