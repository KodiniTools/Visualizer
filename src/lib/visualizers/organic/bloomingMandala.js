/**
 * Blooming Mandala visualizer - Rotating flower petals
 * @module visualizers/organic/bloomingMandala
 */

import {
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const bloomingMandala = {
  name_de: "Blühendes Mandala",
  name_en: "Blooming Mandala",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const centerX = width / 2;
    const centerY = height / 2;
    const numSegments = 24;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);
      const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

      // Pre-calculate segment data, NO save/restore inside loop
      const segmentAngle = (Math.PI * 2) / numSegments;

      for (let i = 0; i < numSegments; i++) {
        const angle = i * segmentAngle;

        const freqIndex = Math.floor((i / numSegments) * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] / 255) * 1.5 + 0.3;
        const petalLength = (80 + amplitude * (Math.min(width, height) * 0.35)) * intensity;
        const petalWidth = (20 + overallEnergy * 60) * intensity;
        const hue = (baseHsl.h + i * (360 / numSegments)) % 360;

        // Use rotatePoint instead of save/rotate/restore
        // Calculate bezier points in rotated space mathematically
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Transform local petal coordinates to global
        const transformPoint = (lx, ly) => ({
          x: lx * cos - ly * sin,
          y: lx * sin + ly * cos
        });

        // Petal control and end points in local coordinates (Y is along petal length)
        const p0 = transformPoint(0, 0);
        const cp1 = transformPoint(petalWidth, petalLength * 0.4);
        const cp2 = transformPoint(petalWidth * 0.5, petalLength * 0.8);
        const pEnd = transformPoint(0, petalLength);
        const cp3 = transformPoint(-petalWidth * 0.5, petalLength * 0.8);
        const cp4 = transformPoint(-petalWidth, petalLength * 0.4);

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, pEnd.x, pEnd.y);
        ctx.bezierCurveTo(cp3.x, cp3.y, cp4.x, cp4.y, p0.x, p0.y);

        // Create gradient along transformed axis
        const gradient = ctx.createLinearGradient(p0.x, p0.y, pEnd.x, pEnd.y);
        gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${hue}, ${baseHsl.s}%, ${Math.min(80, baseHsl.l + 20)}%, 0.7)`);
        gradient.addColorStop(1, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 0.3)`);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.5 + amplitude * 0.5})`;
        ctx.lineWidth = (2 + amplitude * 3) * intensity;
        ctx.stroke();
      }

      // Center glow
      const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 50 * intensity);
      centerGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 80%, ${0.8 + overallEnergy * 0.2})`);
      centerGlow.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(0, 0, 50 * intensity, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();
    });
  }
};
