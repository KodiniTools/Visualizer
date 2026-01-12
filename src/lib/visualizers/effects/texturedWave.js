/**
 * Textured Wave visualizer - Displays layered audio waveforms
 * @module visualizers/effects/texturedWave
 */

import {
  hexToHsl,
  averageRange
} from '../core/index.js';

export const texturedWave = {
  name_de: "Textur-Welle (Aktiviert)",
  name_en: "Texture Wave (Active)",
  needsTimeData: true,
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const centerY = height / 2;
    const baseHsl = hexToHsl(color);

    ctx.clearRect(0, 0, width, height);

    const numPoints = 150;
    const sliceWidth = width / numPoints;
    const time = Date.now() * 0.001;
    const totalEnergy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.21)) / 255;

    const numWaves = 3;

    for (let wave = 0; wave < numWaves; wave++) {
      const waveOffset = (wave - 1) * height * 0.15;
      const points = [];

      for (let i = 0; i < numPoints; i++) {
        const dataIndex = Math.floor((i / numPoints) * bufferLength);
        const v = (dataArray[dataIndex] / 128.0) - 1.0;
        const x = i * sliceWidth;
        const baseWave = Math.sin(x * 0.02 + time * 2 + wave) * 30;
        const audioWave = v * (height / 2.5);
        const y = centerY + waveOffset + baseWave + audioWave;
        points.push({ x, y, v: Math.abs(v) });
      }

      ctx.beginPath();
      ctx.moveTo(0, height);
      points.forEach((p, i) => {
        if (i === 0) ctx.lineTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.lineTo(width, height);
      ctx.closePath();

      const hue = (baseHsl.h + wave * 30) % 360;
      const gradient = ctx.createLinearGradient(0, centerY - height / 3, 0, height);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.3 + totalEnergy * 0.2})`);
      gradient.addColorStop(0.5, `hsla(${hue}, 90%, 40%, ${0.2 + totalEnergy * 0.1})`);
      gradient.addColorStop(1, `hsla(${hue}, 80%, 20%, 0.1)`);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.6 + totalEnergy * 0.4})`;
      ctx.lineWidth = (3 + totalEnergy * 4) * intensity;
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 10 + totalEnergy * 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      points.forEach((p, i) => {
        if (p.v > 0.4 && i % 5 === 0) {
          const size = (4 + p.v * 12) * intensity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${0.5 + p.v * 0.5})`;
          ctx.fill();
        }
      });
    }
  }
};
