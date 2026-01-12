/**
 * Matrix Rain visualizer - Classic falling character effect
 * @module visualizers/tech/matrixRain
 */

import {
  visualizerState,
  hexToHsl,
  averageRange
} from '../core/index.js';

export const matrixRain = {
  name_de: "Matrix-Regen",
  name_en: "Matrix Rain",
  init(width, height) {
    const columns = Math.floor(width / 20);
    visualizerState.matrixRain = {
      columns,
      drops: new Array(columns).fill(0).map(() => ({
        y: Math.random() * -100,
        speed: 2 + Math.random() * 5,
        chars: []
      }))
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.matrixRain) this.init(width, height);
    const state = visualizerState.matrixRain;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    const columnWidth = width / state.columns;
    const charHeight = 20;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';

    ctx.font = `${charHeight}px monospace`;

    state.drops.forEach((drop, col) => {
      const freqIndex = Math.floor((col / state.columns) * maxFreqIndex);
      const amplitude = (dataArray[freqIndex] || 0) / 255;
      const speedMult = 1 + overallEnergy * 3;

      drop.y += drop.speed * speedMult * intensity;

      const x = col * columnWidth + columnWidth / 2;

      for (let i = 0; i < 15; i++) {
        const charY = drop.y - i * charHeight;
        if (charY < 0 || charY > height) continue;

        const fadeAlpha = (1 - i / 15) * (0.5 + amplitude * 0.5);
        const lightness = i === 0 ? 90 : 50 + (1 - i / 15) * 30;
        const hue = (baseHsl.h + amplitude * 30) % 360;

        ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${fadeAlpha})`;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x, charY);
      }

      if (drop.y > height + 300) {
        drop.y = Math.random() * -100;
        drop.speed = 2 + Math.random() * 5;
      }
    });
  }
};
