/**
 * Rainbow Cube visualizer - Animated rainbow-colored rotating cube
 * @module visualizers/geometric/rainbowCube
 */

import {
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const rainbowCube = {
  name_de: "Regenbogen-Würfel",
  name_en: "Rainbow Cube",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const size = Math.min(w, h) * 0.4;
    const centerX = w / 2;
    const centerY = h / 2;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const energy = averageRange(dataArray, 0, maxFreqIndex) / 255;
    const time = Date.now() * 0.001;

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);
      ctx.rotate(time * 0.5 + energy);

      const faces = [
        { offset: { x: 0, y: -size * 0.3 }, scale: 1 + energy * 0.3 },
        { offset: { x: -size * 0.25, y: size * 0.15 }, scale: 0.9 + energy * 0.2 },
        { offset: { x: size * 0.25, y: size * 0.15 }, scale: 0.9 + energy * 0.2 }
      ];

      faces.forEach((face, i) => {
        const hue = (baseHsl.h + i * 120 + time * 50) % 360;
        const faceSize = size * face.scale * intensity;

        ctx.beginPath();
        ctx.rect(face.offset.x - faceSize / 2, face.offset.y - faceSize / 2, faceSize, faceSize);

        const gradient = ctx.createLinearGradient(
          face.offset.x - faceSize / 2,
          face.offset.y - faceSize / 2,
          face.offset.x + faceSize / 2,
          face.offset.y + faceSize / 2
        );
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.7 + energy * 0.3})`);
        gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 100%, 40%, ${0.5 + energy * 0.3})`);

        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${0.8})`;
        ctx.lineWidth = 2 * intensity;
        ctx.stroke();
      });
    });
  }
};
