/**
 * Network Plexus visualizer - Connected particle network effect
 * @module visualizers/tech/networkPlexus
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const networkPlexus = {
  name_de: "Netzwerk-Plexus",
  name_en: "Network Plexus",
  init(width, height) {
    const numParticles = Math.floor(width / 15);
    visualizerState.networkPlexus = { particles: [], pulsePhase: 0 };
    for (let i = 0; i < numParticles; i++) {
      visualizerState.networkPlexus.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        baseRadius: 3 + Math.random() * 4,
        hueOffset: Math.random() * 40
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.networkPlexus || visualizerState.networkPlexus.particles.length === 0) {
      this.init(width, height);
    }
    const state = visualizerState.networkPlexus;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    state.pulsePhase += 0.05 + bassEnergy * 0.1;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + bassEnergy * 0.05})`;
    ctx.fillRect(0, 0, width, height);

    const speedMult = 1 + bassEnergy * 3 + midEnergy * 2;

    state.particles.forEach((p, index) => {
      p.x += p.vx * speedMult * intensity;
      p.y += p.vy * speedMult * intensity;

      if (p.x < 0 || p.x > width) {
        p.vx *= -1;
        p.vx += (Math.random() - 0.5) * bassEnergy * 2;
      }
      if (p.y < 0 || p.y > height) {
        p.vy *= -1;
        p.vy += (Math.random() - 0.5) * bassEnergy * 2;
      }

      const pulse = Math.sin(state.pulsePhase + index * 0.1) * 0.3 + 1;
      const radius = p.baseRadius * pulse * (1 + bassEnergy * 1.5) * intensity;

      const hue = (baseHsl.h + p.hueOffset + midEnergy * 30) % 360;
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${0.9 + highEnergy * 0.1})`);
      gradient.addColorStop(0.5, `hsla(${hue}, 90%, 60%, 0.5)`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, 90%, 0.9)`;
      ctx.fill();
    });

    const connectDistance = width / 6 + bassEnergy * 50;
    withSafeCanvasState(ctx, () => {
      ctx.lineWidth = (1 + midEnergy * 2) * intensity;

      for (let i = 0; i < state.particles.length; i++) {
        for (let j = i + 1; j < state.particles.length; j++) {
          const dx = state.particles[i].x - state.particles[j].x;
          const dy = state.particles[i].y - state.particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectDistance) {
            const alpha = (1 - dist / connectDistance) * (0.4 + midEnergy * 0.4);
            const hue = (baseHsl.h + (i + j) * 2) % 360;

            ctx.beginPath();
            ctx.moveTo(state.particles[i].x, state.particles[i].y);
            ctx.lineTo(state.particles[j].x, state.particles[j].y);
            ctx.strokeStyle = `hsla(${hue}, 100%, ${60 + highEnergy * 30}%, ${alpha})`;
            ctx.stroke();
          }
        }
      }
    });
  }
};
