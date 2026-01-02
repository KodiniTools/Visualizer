/**
 * Retro visualizers - 80s, synthwave, and pixel art styles
 * @module visualizers/retro
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  calculateDynamicGain,
  applySmoothValue,
  withSafeCanvasState
} from '../core/index.js';

export const synthWave = {
  name_de: "Synth-Wave",
  name_en: "Synth Wave",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const horizon = height * 0.55;
    const numLines = 25;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, `hsl(${(baseHsl.h + 200) % 360}, 80%, ${8 + bassEnergy * 5}%)`);
    bgGradient.addColorStop(0.4, `hsl(${(baseHsl.h + 280) % 360}, 70%, ${5 + midEnergy * 3}%)`);
    bgGradient.addColorStop(0.6, `hsl(${baseHsl.h}, 60%, 3%)`);
    bgGradient.addColorStop(1, 'black');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    withSafeCanvasState(ctx, () => {
      const sunRadius = 60 + bassEnergy * 40;
      const sunY = horizon - 30;
      const sunGradient = ctx.createRadialGradient(width / 2, sunY, 0, width / 2, sunY, sunRadius * 1.5);
      sunGradient.addColorStop(0, `hsla(${(baseHsl.h + 30) % 360}, 100%, 70%, ${0.9 + bassEnergy * 0.1})`);
      sunGradient.addColorStop(0.3, `hsla(${baseHsl.h}, 100%, 60%, 0.8)`);
      sunGradient.addColorStop(0.6, `hsla(${(baseHsl.h - 20 + 360) % 360}, 100%, 50%, 0.4)`);
      sunGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGradient;
      ctx.fillRect(0, 0, width, horizon);

      const scanLines = 8;
      for (let i = 0; i < scanLines; i++) {
        const scanY = sunY - sunRadius + (i / scanLines) * sunRadius * 2;
        if (scanY < sunY - sunRadius * 0.3 || scanY > sunY + sunRadius) continue;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(width / 2 - sunRadius, scanY, sunRadius * 2, 3 + i * 0.5);
      }

      for (let i = 0; i < numLines; i++) {
        const progress = i / numLines;
        const y = horizon + progress * progress * (height - horizon);
        const perspectiveScale = 1 - (progress * 0.6);
        const distortion = Math.sin(Date.now() * 0.002 + progress * 8) * bassEnergy * 30 * intensity;

        ctx.beginPath();
        const segments = 60;
        for (let j = 0; j <= segments; j++) {
          const x = (j / segments) * width;
          const freqIndex = Math.floor((j / segments) * maxFreqIndex);
          const amplitude = (dataArray[freqIndex] || 0) / 255;
          const waveHeight = amplitude * 60 * perspectiveScale * intensity;
          const wave = Math.sin(x * 0.015 + Date.now() * 0.003) * waveHeight;
          const waveY = y + distortion + wave;

          if (j === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }

        const hue = (baseHsl.h + progress * 80) % 360;
        const lightness = 55 + (1 - progress) * 35 + midEnergy * 10;
        ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}%, ${(1 - progress) * 0.9})`;
        ctx.lineWidth = (2 + (1 - progress) * 4) * intensity;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 10 + bassEnergy * 15;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      const numVerticals = 20;
      for (let i = 0; i <= numVerticals; i++) {
        const xRatio = i / numVerticals;
        const x = xRatio * width;
        const vanishY = horizon - 20;

        const freqIndex = Math.floor(xRatio * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] || 0) / 255;

        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(width * 0.5, vanishY);

        const centerDistance = Math.abs(x - width * 0.5) / (width * 0.5);
        const alpha = (1 - centerDistance * 0.7) * (0.3 + amplitude * 0.5);

        const hue = (baseHsl.h + 60 + amplitude * 40) % 360;
        ctx.strokeStyle = `hsla(${hue}, 100%, ${50 + amplitude * 30}%, ${alpha})`;
        ctx.lineWidth = (1 + amplitude * 2) * intensity;
        ctx.stroke();
      }
    });
  }
};

export const retroOscilloscope = {
  name_de: 'Retro-Oszilloskop (Grün)',
  name_en: 'Retro Oscilloscope (Green)',
  needsTimeData: true,
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = 'rgba(0, 10, 0, 0.15)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0, 80, 0, 0.3)';
    ctx.lineWidth = 1;

    const gridSpacing = w / 10;
    for (let x = 0; x <= w; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = 0; y <= h; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 120, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    const sliceWidth = w / bufferLength;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 255, 0, ${0.1 * intensity})`;
    ctx.lineWidth = 8;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff00';

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;
      const x = i * sliceWidth;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 255, 0, ${0.3 * intensity})`;
    ctx.lineWidth = 4;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;
      const x = i * sliceWidth;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = `rgba(150, 255, 150, ${0.9 * intensity})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;
      const x = i * sliceWidth;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
};

export const arcadeBlocks = {
  name_de: 'Arcade-Blöcke (Tetris)',
  name_en: 'Arcade Blocks (Tetris)',
  init() {
    visualizerState.arcadeBlocks = {
      blocks: [],
      lastBeat: 0
    };
  },
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const baseHsl = hexToHsl(color);
    const blockSize = Math.max(16, Math.floor(w / 32));
    const cols = Math.floor(w / blockSize);

    if (!visualizerState.arcadeBlocks) {
      visualizerState.arcadeBlocks = { blocks: [], lastBeat: 0 };
    }
    const state = visualizerState.arcadeBlocks;

    const bassEnd = Math.floor(bufferLength * 0.1);
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += dataArray[i];
    }
    const bassEnergy = bassSum / (bassEnd * 255);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, w, h);

    const now = Date.now();
    if (bassEnergy > 0.5 && now - state.lastBeat > 100) {
      state.lastBeat = now;

      const numNewBlocks = Math.floor(bassEnergy * 5) + 1;
      for (let i = 0; i < numNewBlocks; i++) {
        const col = Math.floor(Math.random() * cols);
        const tetrisColors = [0, 60, 120, 180, 240, 300];
        state.blocks.push({
          x: col * blockSize,
          y: -blockSize,
          speed: 2 + bassEnergy * 8,
          hue: tetrisColors[Math.floor(Math.random() * tetrisColors.length)],
          size: blockSize
        });
      }
    }

    for (let i = state.blocks.length - 1; i >= 0; i--) {
      const block = state.blocks[i];
      block.y += block.speed;

      const gradient = ctx.createLinearGradient(block.x, block.y, block.x + block.size, block.y + block.size);
      gradient.addColorStop(0, `hsl(${block.hue}, 80%, 60%)`);
      gradient.addColorStop(1, `hsl(${block.hue}, 80%, 40%)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(block.x + 2, block.y + 2, block.size - 4, block.size - 4);

      ctx.fillStyle = `hsl(${block.hue}, 80%, 75%)`;
      ctx.fillRect(block.x + 2, block.y + 2, block.size - 4, 4);
      ctx.fillRect(block.x + 2, block.y + 2, 4, block.size - 4);

      ctx.fillStyle = `hsl(${block.hue}, 80%, 30%)`;
      ctx.fillRect(block.x + block.size - 6, block.y + 6, 4, block.size - 8);
      ctx.fillRect(block.x + 6, block.y + block.size - 6, block.size - 8, 4);

      if (block.y > h) {
        state.blocks.splice(i, 1);
      }
    }

    if (state.blocks.length > 200) {
      state.blocks.splice(0, state.blocks.length - 200);
    }

    ctx.restore();
  }
};

export const chiptunePulse = {
  name_de: 'Chiptune-Puls (Futuristisch)',
  name_en: 'Chiptune Pulse (Futuristic)',
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const baseHsl = hexToHsl(color);
    const gridSize = Math.max(8, Math.floor(Math.min(w, h) / 50));
    const cols = Math.ceil(w / gridSize);
    const rows = Math.ceil(h / gridSize);

    const stateKey = 'chiptunePulse_grid';
    const totalCells = cols * rows;
    if (!visualizerState[stateKey] || visualizerState[stateKey].length !== totalCells) {
      visualizerState[stateKey] = new Array(totalCells).fill(0);
    }

    ctx.fillStyle = 'rgba(0, 0, 10, 0.15)';
    ctx.fillRect(0, 0, w, h);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const neonColors = [180, 300, 220, 120, 280, 200];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellIndex = row * cols + col;
        const distFromCenter = Math.sqrt(
          Math.pow((col - cols / 2) / cols, 2) +
          Math.pow((row - rows / 2) / rows, 2)
        );

        const waveOffset = Math.sin((col + row) * 0.3) * 0.5 + 0.5;
        const freqIndex = Math.floor((distFromCenter + waveOffset * 0.3) * maxFreqIndex * 2) % maxFreqIndex;
        const value = dataArray[freqIndex] / 255;

        const target = value * intensity;
        visualizerState[stateKey][cellIndex] = applySmoothValue(
          visualizerState[stateKey][cellIndex] || 0,
          target,
          0.4
        );
        const smoothedValue = visualizerState[stateKey][cellIndex];

        if (smoothedValue > 0.05) {
          const x = col * gridSize;
          const y = row * gridSize;
          const pulseSize = gridSize * (0.2 + smoothedValue * 0.8);
          const offset = (gridSize - pulseSize) / 2;
          const colorIndex = Math.floor((distFromCenter * 3 + smoothedValue * 2) % neonColors.length);
          const hue = neonColors[colorIndex];

          if (smoothedValue > 0.3) {
            ctx.shadowBlur = smoothedValue * 20;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
          }

          const lightness = 45 + smoothedValue * 40;
          ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
          ctx.fillRect(x + offset, y + offset, pulseSize, pulseSize);

          if (smoothedValue > 0.5) {
            const coreSize = pulseSize * 0.6;
            const coreOffset = (gridSize - coreSize) / 2;
            ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${smoothedValue * 0.8})`;
            ctx.fillRect(x + coreOffset, y + coreOffset, coreSize, coreSize);
          }

          ctx.shadowBlur = 0;
        }
      }
    }

    ctx.restore();
  }
};

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

export const retroVisualizers = {
  synthWave,
  retroOscilloscope,
  arcadeBlocks,
  chiptunePulse,
  pixelSpectrum
};
