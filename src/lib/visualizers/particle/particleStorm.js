/**
 * Particle Storm visualizer - 3D particle system with starfield effect
 * @module visualizers/particle/particleStorm
 */

import {
  visualizerState,
  hexToHsl,
  averageRange
} from '../core/index.js';

export const particleStorm = {
  name_de: "Partikel-Sturm",
  name_en: "Particle Storm",
  init(width, height) {
    visualizerState.particleStorm = { particles: [], fov: width * 0.8 };
    for (let i = 0; i < 350; i++) {
      visualizerState.particleStorm.particles.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 1500,
        size: 1 + Math.random() * 3,
        hueOffset: Math.random() * 60
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.particleStorm) this.init(width, height);
    const state = visualizerState.particleStorm;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    const speed = (15 + bassEnergy * 50) * intensity;

    ctx.clearRect(0, 0, width, height);

    if (bassEnergy > 0.3) {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200);
      gradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 60%, ${bassEnergy * 0.3})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    state.particles.forEach((p, index) => {
      p.z -= speed;

      const freqIndex = Math.floor((index / state.particles.length) * maxFreqIndex);
      const freq = (dataArray[freqIndex] || 0) / 255;
      p.x += (Math.random() - 0.5) * freq * 5;
      p.y += (Math.random() - 0.5) * freq * 5;

      if (p.z <= 0) {
        p.x = (Math.random() - 0.5) * width * 1.5;
        p.y = (Math.random() - 0.5) * height * 1.5;
        p.z = 1500;
      }

      const scale = state.fov / (state.fov + p.z);
      const screenX = centerX + p.x * scale;
      const screenY = centerY + p.y * scale;
      const depth = 1 - p.z / 1500;

      const radius = depth * p.size * 4 * intensity;

      if (screenX > -50 && screenX < width + 50 && screenY > -50 && screenY < height + 50 && radius > 0.5) {
        const streakLength = Math.min(speed * depth * 0.5, 30);
        const hue = (baseHsl.h + p.hueOffset + midEnergy * 40) % 360;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX, screenY + streakLength);
        ctx.strokeStyle = `hsla(${hue}, 100%, ${60 + highEnergy * 30}%, ${depth * 0.7})`;
        ctx.lineWidth = radius * 0.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, ${70 + depth * 25}%, ${depth * 0.9})`;
        ctx.fill();
      }
    });
  }
};
