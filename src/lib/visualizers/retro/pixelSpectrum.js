/**
 * Pixel Spectrum visualizer - 8-bit style spectrum analyzer
 * @module visualizers/retro/pixelSpectrum
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  calculateDynamicGain,
  applySmoothValue
} from '../core/index.js';

export const pixelSpectrum = {
  name_de: 'Pixel-Spektrum (8-Bit)',
  name_en: 'Pixel Spectrum (8-Bit)',
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const baseHsl = hexToHsl(color);
    const pixelSize = Math.max(8, Math.floor(w / 40));
    const numBars = Math.floor(w / pixelSize);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    const stateKey = 'pixelSpectrum_bars';
    if (!visualizerState[stateKey] || visualizerState[stateKey].length !== numBars) {
      visualizerState[stateKey] = new Array(numBars).fill(0);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }

    for (let i = 0; i < numBars; i++) {
      const freqPerBar = maxFreqIndex / numBars;
      const s = Math.floor(i * freqPerBar);
      const e = Math.max(s + 1, Math.floor((i + 1) * freqPerBar));
      const rawValue = averageRange(dataArray, s, e);

      const dynamicGain = calculateDynamicGain(i, numBars);
      const targetHeight = (rawValue / 255) * h * dynamicGain * 0.8 * intensity;
      visualizerState[stateKey][i] = applySmoothValue(visualizerState[stateKey][i] || 0, targetHeight, 0.4);

      const barHeight = visualizerState[stateKey][i];
      const numPixelsY = Math.ceil(barHeight / pixelSize);
      const x = i * pixelSize;

      for (let py = 0; py < numPixelsY; py++) {
        const y = h - (py + 1) * pixelSize;
        const pixelEnergy = py / numPixelsY;

        let hue;
        if (pixelEnergy < 0.5) {
          hue = 120;
        } else if (pixelEnergy < 0.75) {
          hue = 60;
        } else {
          hue = 0;
        }

        ctx.fillStyle = `hsl(${hue}, 100%, ${40 + pixelEnergy * 30}%)`;
        ctx.fillRect(x + 1, y + 1, pixelSize - 2, pixelSize - 2);

        ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.3)`;
        ctx.fillRect(x + 1, y + 1, pixelSize - 2, 2);
      }
    }

    ctx.restore();
  }
};
