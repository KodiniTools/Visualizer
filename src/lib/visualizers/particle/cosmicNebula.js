/**
 * Cosmic Nebula visualizer - Swirling particle clouds with orbital motion
 * @module visualizers/particle/cosmicNebula
 */

import {
  visualizerState,
  hexToHsl,
  averageRange
} from '../core/index.js';

export const cosmicNebula = {
  name_de: "Kosmischer Nebel",
  name_en: "Cosmic Nebula",
  init(width, height) {
    visualizerState.cosmicNebula = { particles: [], time: 0 };
    for (let i = 0; i < 400; i++) {
      const clusterX = Math.random() * width;
      const clusterY = Math.random() * height;
      visualizerState.cosmicNebula.particles.push({
        x: clusterX, y: clusterY,
        baseX: clusterX + (Math.random() - 0.5) * 100,
        baseY: clusterY + (Math.random() - 0.5) * 100,
        radius: 2 + Math.random() * 5,
        hueOffset: Math.random() * 120,
        speed: 0.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        orbitSize: 30 + Math.random() * 80
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.cosmicNebula || visualizerState.cosmicNebula.particles.length === 0) {
      this.init(width, height);
    }
    const state = visualizerState.cosmicNebula;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    ctx.clearRect(0, 0, width, height);

    if (bassEnergy > 0.2) {
      const centerGlow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 300 + bassEnergy * 200);
      centerGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 50%, ${bassEnergy * 0.15})`);
      centerGlow.addColorStop(0.5, `hsla(${(baseHsl.h + 60) % 360}, 80%, 40%, ${bassEnergy * 0.08})`);
      centerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);
    }

    const time = Date.now() * 0.001;

    state.particles.forEach((p, index) => {
      const freqPos = (index % 100) / 100;
      const freqIndex = Math.floor(freqPos * maxFreqIndex);
      const amplitude = (dataArray[freqIndex] || 0) / 255;

      const baseMovement = 0.3 + amplitude * 0.7;
      const orbitRadius = p.orbitSize * baseMovement * (1 + bassEnergy) * intensity;

      const angle = time * p.speed + p.phase + index * 0.1;

      const spiral = Math.sin(time * 0.5 + index * 0.05) * 20 * midEnergy;
      p.x = p.baseX + Math.cos(angle) * orbitRadius + spiral;
      p.y = p.baseY + Math.sin(angle) * orbitRadius + Math.cos(angle * 0.7) * spiral;

      if (p.x < -50) p.baseX += width + 100;
      if (p.x > width + 50) p.baseX -= width + 100;
      if (p.y < -50) p.baseY += height + 100;
      if (p.y > height + 50) p.baseY -= height + 100;

      const hue = (baseHsl.h + p.hueOffset + midEnergy * 60 + time * 10) % 360;
      const particleSize = p.radius * (1 + amplitude * 2) * intensity;

      const minAlpha = 0.3;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, particleSize * 5);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${minAlpha + amplitude * 0.6})`);
      gradient.addColorStop(0.3, `hsla(${hue}, 90%, 60%, ${(minAlpha + amplitude * 0.4) * 0.6})`);
      gradient.addColorStop(0.7, `hsla(${(hue + 30) % 360}, 80%, 40%, ${(minAlpha + amplitude * 0.2) * 0.3})`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(p.x, p.y, particleSize * 5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, particleSize * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, ${85 + highEnergy * 15}%, ${0.7 + amplitude * 0.3})`;
      ctx.fill();
    });
  }
};
