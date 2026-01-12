/**
 * Spiral Galaxy visualizer - Star trails flowing in spiral arms
 * @module visualizers/organic/spiralGalaxy
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const spiralGalaxy = {
  name_de: "Spiralgalaxie (Sternenspuren)",
  name_en: "Spiral Galaxy (Star Trails)",
  init() {
    visualizerState.smoothedSpiralGalaxy = new Array(200).fill(0);
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.smoothedSpiralGalaxy) this.init();
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.45;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const time = Date.now() * 0.0005;
    const arms = 4;
    const pointsPerArm = 50;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    withSafeCanvasState(ctx, () => {
      // Center glow drawn once
      const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.2);
      centerGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 70%, 0.4)`);
      centerGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      // Track if shadow is active to avoid unnecessary resets
      let shadowActive = false;

      for (let arm = 0; arm < arms; arm++) {
        for (let i = 0; i < pointsPerArm; i++) {
          const globalIndex = arm * pointsPerArm + i;
          const freqIndex = Math.floor((i / pointsPerArm) * maxFreqIndex);
          const sampleSize = Math.max(2, Math.floor(maxFreqIndex / pointsPerArm));
          const amplitude = averageRange(dataArray, freqIndex, Math.min(maxFreqIndex, freqIndex + sampleSize)) / 255;
          const boostedAmplitude = Math.max(0.25, amplitude * 1.5);
          const targetIntensity = boostedAmplitude * intensity;

          visualizerState.smoothedSpiralGalaxy[globalIndex] =
            visualizerState.smoothedSpiralGalaxy[globalIndex] * 0.7 + targetIntensity * 0.3;
          const currentIntensity = visualizerState.smoothedSpiralGalaxy[globalIndex];

          const t = i / pointsPerArm;
          const radius = 30 + t * (maxRadius - 30) * (0.5 + currentIntensity * 0.5);
          const spiralTightness = 3;
          const angle = arm * (2 * Math.PI / arms) + t * spiralTightness * Math.PI + time;

          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          const baseSize = 3 + t * 4;
          const size = (baseSize + currentIntensity * 8) * intensity;
          const hue = (baseHsl.h + t * 60 + arm * 30) % 360;

          // Only set shadow when needed
          if (currentIntensity > 0.4) {
            ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
            ctx.shadowBlur = 8 + currentIntensity * 12;
            shadowActive = true;
          } else if (shadowActive) {
            ctx.shadowBlur = 0;
            shadowActive = false;
          }

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${Math.min(80, baseHsl.l + currentIntensity * 20)}%, ${0.6 + currentIntensity * 0.4})`;
          ctx.fill();
        }
      }

      // Only reset if shadow was active
      if (shadowActive) {
        ctx.shadowBlur = 0;
      }
    });
  }
};
