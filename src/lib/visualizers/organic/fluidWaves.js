/**
 * Fluid Waves visualizer - Flowing wave patterns
 * @module visualizers/organic/fluidWaves
 */

import {
  visualizerState,
  hexToHsl,
  averageRange
} from '../core/index.js';

export const fluidWaves = {
  name_de: "Fluid-Wellen",
  name_en: "Fluid Waves",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const numWaves = 5;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const time = Date.now() * 0.001;

    if (!visualizerState.smoothedFluidWaves || visualizerState.smoothedFluidWaves.length !== numWaves) {
      visualizerState.smoothedFluidWaves = new Array(numWaves).fill(0);
    }

    ctx.clearRect(0, 0, w, h);

    // Pre-calculate wave data
    for (let wave = 0; wave < numWaves; wave++) {
      const freqPerWave = maxFreqIndex / numWaves;
      const s = Math.floor(wave * freqPerWave);
      const e = Math.max(s + 1, Math.floor((wave + 1) * freqPerWave));
      const amplitude = averageRange(dataArray, s, e) / 255;

      visualizerState.smoothedFluidWaves[wave] = visualizerState.smoothedFluidWaves[wave] * 0.8 + amplitude * 0.2;
      const smoothedAmp = visualizerState.smoothedFluidWaves[wave];

      const baseY = h * (0.3 + (wave / numWaves) * 0.5);
      const waveHeight = 50 + smoothedAmp * 100;

      ctx.beginPath();
      ctx.moveTo(0, h);

      // Use larger step for wave points (8 instead of 5)
      const step = 8;
      for (let x = 0; x <= w; x += step) {
        const y = baseY + Math.sin((x * 0.01) + time * (1 + wave * 0.3) + wave) * waveHeight * intensity;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.closePath();

      const hue = (baseHsl.h + wave * 30) % 360;
      const gradient = ctx.createLinearGradient(0, baseY - waveHeight, 0, h);
      gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.4 + smoothedAmp * 0.4})`);
      gradient.addColorStop(1, `hsla(${hue}, ${baseHsl.s}%, ${Math.max(20, baseHsl.l - 20)}%, 0.1)`);

      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }
};
