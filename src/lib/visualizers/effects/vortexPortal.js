/**
 * Vortex Portal visualizer - Displays spiraling vortex effect
 * @module visualizers/effects/vortexPortal
 */

import {
  hexToHsl,
  rangeForBar,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const vortexPortal = {
  name_de: "Vortex-Portal",
  name_en: "Vortex Portal",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const centerX = width / 2, centerY = height / 2;
    const numSpirals = 5, numPoints = 80;
    const baseHsl = hexToHsl(color);
    const time = Date.now() * 0.001;

    withSafeCanvasState(ctx, () => {
      for (let spiral = 0; spiral < numSpirals; spiral++) {
        const spiralOffset = (spiral / numSpirals) * Math.PI * 2;
        const [s, e] = rangeForBar(spiral, numSpirals, bufferLength);
        const spiralEnergy = averageRange(dataArray, s, e) / 255;
        const effectiveEnergy = spiralEnergy * intensity;

        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
          const t = i / numPoints;
          const freqIndex = Math.floor(t * bufferLength);
          const amplitude = (dataArray[freqIndex] || 0) / 255;
          const angle = spiralOffset + t * Math.PI * 8 + time * (1 + spiral * 0.2);
          const radius = t * Math.min(width, height) * 0.45 * (1 + effectiveEnergy * 0.5);
          const wobble = Math.sin(t * 10 + time * 2) * amplitude * 30 * intensity;
          const x = centerX + Math.cos(angle) * (radius + wobble);
          const y = centerY + Math.sin(angle) * (radius + wobble);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const hue = (baseHsl.h + spiral * 40 + time * 20) % 360;
        ctx.strokeStyle = `hsla(${hue}, ${baseHsl.s}%, ${40 + effectiveEnergy * 40}%, ${0.5 + effectiveEnergy * 0.5})`;
        ctx.lineWidth = (2 + effectiveEnergy * 4) * intensity;
        ctx.stroke();

        if (effectiveEnergy > 0.5) {
          ctx.strokeStyle = `hsla(${hue}, ${baseHsl.s}%, 80%, ${effectiveEnergy * 0.5})`;
          ctx.lineWidth = 1 * intensity;
          ctx.stroke();
        }
      }

      const coreEnergy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.2)) / 255;
      const coreRadius = (20 + coreEnergy * 60) * intensity;
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
      coreGradient.addColorStop(0, `hsla(${baseHsl.h}, ${baseHsl.s}%, 90%, 0.9)`);
      coreGradient.addColorStop(0.5, `hsla(${baseHsl.h}, ${baseHsl.s}%, 60%, 0.6)`);
      coreGradient.addColorStop(1, `hsla(${baseHsl.h}, ${baseHsl.s}%, 30%, 0)`);
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();
    });
  }
};
