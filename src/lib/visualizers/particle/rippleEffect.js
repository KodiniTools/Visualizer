/**
 * Ripple Effect visualizer - Expanding ripples triggered by audio frequencies
 * @module visualizers/particle/rippleEffect
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const rippleEffect = {
  name_de: "Wellen-Effekt (High-Freq-Bursts)",
  name_en: "Ripple Effect (High-Freq Bursts)",
  init() {
    visualizerState.ripples = [];
    visualizerState.rippleTime = 0;
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.ripples) this.init();

    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

    visualizerState.rippleTime = (visualizerState.rippleTime || 0) + 0.02;
    const time = visualizerState.rippleTime;

    ctx.clearRect(0, 0, width, height);

    if (bassEnergy > 0.3) {
      const pulseGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.6
      );
      pulseGradient.addColorStop(0, `hsla(${baseHsl.h}, 80%, 30%, ${bassEnergy * 0.2})`);
      pulseGradient.addColorStop(0.5, `hsla(${(baseHsl.h + 30) % 360}, 70%, 20%, ${bassEnergy * 0.1})`);
      pulseGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = pulseGradient;
      ctx.fillRect(0, 0, width, height);
    }

    const energyTypes = [
      { energy: bassEnergy, threshold: 0.25, size: 200, speed: 4, hueShift: 0 },
      { energy: midEnergy, threshold: 0.2, size: 150, speed: 5, hueShift: 30 },
      { energy: highEnergy, threshold: 0.15, size: 100, speed: 6, hueShift: 60 }
    ];

    energyTypes.forEach(({ energy, threshold, size, speed, hueShift }) => {
      if (energy > threshold && Math.random() < 0.5 * intensity && visualizerState.ripples.length < 30) {
        visualizerState.ripples.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0,
          maxRadius: (size * 0.5 + energy * size) * intensity,
          hue: (baseHsl.h + hueShift + Math.random() * 40) % 360,
          alpha: 1,
          speed: (speed + energy * 4) * intensity,
          thickness: 3 + energy * 5
        });
      }
    });

    withSafeCanvasState(ctx, () => {
      for (let i = visualizerState.ripples.length - 1; i >= 0; i--) {
        const r = visualizerState.ripples[i];
        r.radius += r.speed;
        const progress = r.radius / r.maxRadius;
        r.alpha = 1 - progress;

        if (r.alpha <= 0) {
          visualizerState.ripples.splice(i, 1);
          continue;
        }

        const rings = 2;
        for (let ring = 0; ring < rings; ring++) {
          const ringRadius = r.radius - ring * 20;
          if (ringRadius > 0) {
            ctx.beginPath();
            ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2);

            const ringAlpha = r.alpha * (1 - ring * 0.4);
            const lightness = 50 + (1 - progress) * 30;
            ctx.strokeStyle = `hsla(${r.hue}, 100%, ${lightness}%, ${ringAlpha})`;
            ctx.lineWidth = (r.thickness || 4) * (1 - ring * 0.3) * (1 - progress * 0.5);

            if (progress < 0.3) {
              ctx.shadowColor = `hsl(${r.hue}, 100%, 60%)`;
              ctx.shadowBlur = 15 * (1 - progress * 3);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }

        if (progress < 0.2) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, 5 * (1 - progress * 5), 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${r.hue}, 100%, 80%, ${1 - progress * 5})`;
          ctx.fill();
        }
      }
    });

    const numParticles = 20;
    for (let i = 0; i < numParticles; i++) {
      const px = (Math.sin(time + i * 0.5) * 0.5 + 0.5) * width;
      const py = (Math.cos(time * 0.7 + i * 0.3) * 0.5 + 0.5) * height;
      const size = 2 + Math.sin(time * 2 + i) * 1 + midEnergy * 3;

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${(baseHsl.h + i * 10) % 360}, 80%, 60%, ${0.2 + midEnergy * 0.3})`;
      ctx.fill();
    }
  }
};
