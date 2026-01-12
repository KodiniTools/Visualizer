/**
 * Arcade Blocks visualizer - Tetris-style falling blocks
 * @module visualizers/retro/arcadeBlocks
 */

import {
  visualizerState,
  hexToHsl
} from '../core/index.js';

export const arcadeBlocks = {
  name_de: 'Arcade-Blöcke (Tetris)',
  name_en: 'Arcade Blocks (Tetris)',
  init() {
    visualizerState.arcadeBlocks = {
      blocks: [],
      lastBeat: 0
    };
  },
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const baseHsl = hexToHsl(color);
    const blockSize = Math.max(16, Math.floor(w / 32));
    const cols = Math.floor(w / blockSize);

    if (!visualizerState.arcadeBlocks) {
      visualizerState.arcadeBlocks = { blocks: [], lastBeat: 0 };
    }
    const state = visualizerState.arcadeBlocks;

    const bassEnd = Math.floor(bufferLength * 0.1);
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += dataArray[i];
    }
    const bassEnergy = bassSum / (bassEnd * 255);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, w, h);

    const now = Date.now();
    if (bassEnergy > 0.5 && now - state.lastBeat > 100) {
      state.lastBeat = now;

      const numNewBlocks = Math.floor(bassEnergy * 5) + 1;
      for (let i = 0; i < numNewBlocks; i++) {
        const col = Math.floor(Math.random() * cols);
        const tetrisColors = [0, 60, 120, 180, 240, 300];
        state.blocks.push({
          x: col * blockSize,
          y: -blockSize,
          speed: 2 + bassEnergy * 8,
          hue: tetrisColors[Math.floor(Math.random() * tetrisColors.length)],
          size: blockSize
        });
      }
    }

    for (let i = state.blocks.length - 1; i >= 0; i--) {
      const block = state.blocks[i];
      block.y += block.speed;

      const gradient = ctx.createLinearGradient(block.x, block.y, block.x + block.size, block.y + block.size);
      gradient.addColorStop(0, `hsl(${block.hue}, 80%, 60%)`);
      gradient.addColorStop(1, `hsl(${block.hue}, 80%, 40%)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(block.x + 2, block.y + 2, block.size - 4, block.size - 4);

      ctx.fillStyle = `hsl(${block.hue}, 80%, 75%)`;
      ctx.fillRect(block.x + 2, block.y + 2, block.size - 4, 4);
      ctx.fillRect(block.x + 2, block.y + 2, 4, block.size - 4);

      ctx.fillStyle = `hsl(${block.hue}, 80%, 30%)`;
      ctx.fillRect(block.x + block.size - 6, block.y + 6, 4, block.size - 8);
      ctx.fillRect(block.x + 6, block.y + block.size - 6, block.size - 8, 4);

      if (block.y > h) {
        state.blocks.splice(i, 1);
      }
    }

    if (state.blocks.length > 200) {
      state.blocks.splice(0, state.blocks.length - 200);
    }

    ctx.restore();
  }
};
