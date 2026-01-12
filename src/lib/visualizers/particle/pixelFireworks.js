/**
 * Pixel Fireworks visualizer - Retro starfield with warp effect
 * @module visualizers/particle/pixelFireworks
 */

import {
  visualizerState,
  hexToHsl
} from '../core/index.js';

export const pixelFireworks = {
  name_de: 'Retro-Sternenfeld (Warp)',
  name_en: 'Retro Starfield (Warp)',
  init() {
    visualizerState.retroStarfield = null;
  },
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const baseHsl = hexToHsl(color);

    if (!visualizerState.retroStarfield) {
      const stars = [];
      for (let i = 0; i < 150; i++) {
        stars.push({
          x: (Math.random() - 0.5) * w * 3,
          y: (Math.random() - 0.5) * h * 3,
          z: Math.random() * 1000 + 1
        });
      }
      visualizerState.retroStarfield = { stars };
    }
    const state = visualizerState.retroStarfield;

    ctx.clearRect(0, 0, w, h);

    const bassEnd = Math.floor(bufferLength * 0.15);
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += dataArray[i];
    }
    const bassEnergy = bassSum / (bassEnd * 255);

    const speed = 8 + bassEnergy * 40;
    const centerX = w / 2;
    const centerY = h / 2;

    for (const star of state.stars) {
      star.z -= speed;

      if (star.z <= 1) {
        star.x = (Math.random() - 0.5) * w * 3;
        star.y = (Math.random() - 0.5) * h * 3;
        star.z = 1000;
      }

      const screenX = centerX + (star.x / star.z) * 400;
      const screenY = centerY + (star.y / star.z) * 400;

      const oldZ = star.z + speed * 0.5;
      const oldScreenX = centerX + (star.x / oldZ) * 400;
      const oldScreenY = centerY + (star.y / oldZ) * 400;

      if (screenX >= 0 && screenX <= w && screenY >= 0 && screenY <= h) {
        const size = Math.max(1, (1 - star.z / 1000) * 6);
        const brightness = Math.min(100, 30 + (1 - star.z / 1000) * 70);
        const hue = (baseHsl.h + (1 - star.z / 1000) * 60) % 360;

        if (speed > 15) {
          ctx.beginPath();
          ctx.moveTo(oldScreenX, oldScreenY);
          ctx.lineTo(screenX, screenY);
          ctx.strokeStyle = `hsla(${hue}, 80%, ${brightness * 0.6}%, ${intensity * 0.7})`;
          ctx.lineWidth = size * 0.5;
          ctx.stroke();
        }

        ctx.fillStyle = `hsl(${hue}, 70%, ${brightness}%)`;
        ctx.fillRect(
          Math.floor(screenX - size / 2),
          Math.floor(screenY - size / 2),
          Math.ceil(size),
          Math.ceil(size)
        );

        if (star.z < 200) {
          ctx.fillStyle = `hsla(${hue}, 50%, 95%, ${intensity})`;
          ctx.fillRect(
            Math.floor(screenX - size / 4),
            Math.floor(screenY - size / 4),
            Math.ceil(size / 2),
            Math.ceil(size / 2)
          );
        }
      }
    }

    ctx.restore();
  }
};
