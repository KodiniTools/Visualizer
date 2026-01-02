/**
 * Spectrum visualizers - Bar, waveform, and frequency-based effects
 * @module visualizers/spectrum
 */

import {
  CONSTANTS,
  visualizerState,
  hexToHsl,
  rangeForBar,
  averageRange,
  calculateDynamicGain,
  getFrequencyBasedSmoothing,
  applySmoothValue,
  withSafeCanvasState,
  drawRoundedBar
} from '../core/index.js';

export const bars = {
  name_de: 'Balken (Ultra-Dynamisch)',
  name_en: 'Bars (Ultra-Dynamic)',
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const numBars = maxFreqIndex;
    const barWidth = w / numBars;
    const gapWidth = barWidth * 0.1;
    const actualBarWidth = barWidth - gapWidth;
    const baseHsl = hexToHsl(color);

    const stateKey = `bars_${numBars}`;
    if (!visualizerState[stateKey]) {
      visualizerState[stateKey] = new Array(numBars).fill(0);
    }
    if (visualizerState[stateKey].length !== numBars) {
      visualizerState[stateKey] = new Array(numBars).fill(0);
    }

    const masterGain = 0.35;
    const cornerRadius = Math.max(2, actualBarWidth * 0.3);

    for (let i = 0; i < numBars; i++) {
      const dynamicGain = calculateDynamicGain(i, numBars);
      const freqPerBar = maxFreqIndex / numBars;
      const s = Math.floor(i * freqPerBar);
      const e = Math.max(s + 1, Math.floor((i + 1) * freqPerBar));

      const rawValue = averageRange(dataArray, s, e);
      const normalizedValue = rawValue / 255;

      const targetHeight = normalizedValue * h * dynamicGain * masterGain * intensity;
      const smoothingFactor = getFrequencyBasedSmoothing(i, numBars, CONSTANTS.SMOOTHING_BASE);
      visualizerState[stateKey][i] = applySmoothValue(visualizerState[stateKey][i] || 0, targetHeight, smoothingFactor);

      const barHeight = visualizerState[stateKey][i];
      if (barHeight < 1) continue;

      const x = i * barWidth + gapWidth / 2;
      const hue = (baseHsl.h + (i / numBars) * 120) % 360;
      const barColor = `hsl(${hue}, ${baseHsl.s}%, ${baseHsl.l}%)`;
      const glowColor = `hsla(${hue}, 100%, 60%, ${0.4 + normalizedValue * 0.6})`;

      ctx.fillStyle = barColor;
      drawRoundedBar(ctx, x, h, actualBarWidth, barHeight, cornerRadius, {
        glow: true,
        glowColor: glowColor,
        glowBlur: 12 + normalizedValue * 8,
        glowIntensity: 0.5 + normalizedValue * 0.5
      });
    }

    ctx.restore();
  }
};

export const mirroredBars = {
  name_de: "Gespiegelte Balken (Multi-Band-Boost)",
  name_en: "Mirrored Bars (Multi-Band Boost)",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const numBars = 64;
    const barWidth = w / numBars;
    const actualBarWidth = barWidth * 0.9;
    const centerX = w / 2;
    const centerY = h / 2;
    const baseHsl = hexToHsl(color);
    const cornerRadius = Math.max(2, actualBarWidth * 0.3);

    if (visualizerState.smoothedMirroredBars.length !== numBars) {
      visualizerState.smoothedMirroredBars = new Array(numBars).fill(0);
    }

    for (let i = 0; i < numBars / 2; i++) {
      const dynamicGain = calculateDynamicGain(i, numBars);
      const [s, e] = rangeForBar(i, numBars, bufferLength);
      const rawValue = averageRange(dataArray, s, e);
      const normalizedValue = rawValue / 255;
      const targetHeight = normalizedValue * (h / 2) * dynamicGain * intensity;
      const smoothingFactor = getFrequencyBasedSmoothing(i, numBars, CONSTANTS.SMOOTHING_BASE);
      visualizerState.smoothedMirroredBars[i] = applySmoothValue(visualizerState.smoothedMirroredBars[i] || 0, targetHeight, smoothingFactor);

      const currentHeight = visualizerState.smoothedMirroredBars[i];
      if (currentHeight < 1) continue;

      const xLeft = centerX - (i + 1) * barWidth;
      const xRight = centerX + i * barWidth;
      const hue = (baseHsl.h + (i / (numBars / 2)) * 90) % 360;
      const barColor = `hsl(${hue}, ${baseHsl.s}%, ${baseHsl.l}%)`;
      const glowColor = `hsla(${hue}, 100%, 60%, ${0.4 + normalizedValue * 0.6})`;

      ctx.fillStyle = barColor;

      const glowOptions = {
        glow: true,
        glowColor: glowColor,
        glowBlur: 10 + normalizedValue * 10,
        glowIntensity: 0.5 + normalizedValue * 0.5
      };

      drawRoundedBar(ctx, xLeft, centerY, actualBarWidth, currentHeight, cornerRadius, glowOptions);
      drawRoundedBar(ctx, xLeft, centerY, actualBarWidth, -currentHeight, cornerRadius, glowOptions);
      drawRoundedBar(ctx, xRight, centerY, actualBarWidth, currentHeight, cornerRadius, glowOptions);
      drawRoundedBar(ctx, xRight, centerY, actualBarWidth, -currentHeight, cornerRadius, glowOptions);
    }
  }
};

export const radialBars = {
  name_de: "Radiale Balken",
  name_en: "Radial Bars",
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const numBars = 64;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) / 2 * 0.85;
    const minRadius = 40;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);

    if (!visualizerState.smoothedRadialBars || visualizerState.smoothedRadialBars.length !== numBars) {
      visualizerState.smoothedRadialBars = new Array(numBars).fill(0);
    }

    const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

    withSafeCanvasState(ctx, () => {
      const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, minRadius * 2);
      glowGradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 70%, ${0.3 + overallEnergy * 0.5})`);
      glowGradient.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(centerX, centerY, minRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      for (let i = 0; i < numBars; i++) {
        const freqPos = (i % (numBars / 2)) / (numBars / 2);
        const freqIndex = Math.floor(freqPos * maxFreqIndex);
        const sampleSize = Math.max(2, Math.floor(maxFreqIndex / (numBars / 2)));
        const rawAmplitude = averageRange(dataArray, freqIndex, Math.min(maxFreqIndex, freqIndex + sampleSize)) / 255;

        const minLength = (maxRadius - minRadius) * 0.3;
        const audioLength = rawAmplitude * (maxRadius - minRadius) * 0.7 * 1.5;
        const targetLength = (minLength + audioLength) * intensity;

        visualizerState.smoothedRadialBars[i] = visualizerState.smoothedRadialBars[i] * 0.6 + targetLength * 0.4;

        const barLength = visualizerState.smoothedRadialBars[i];
        const angle = (i / numBars) * 2 * Math.PI - Math.PI / 2;

        const startX = centerX + Math.cos(angle) * minRadius;
        const startY = centerY + Math.sin(angle) * minRadius;
        const endX = centerX + Math.cos(angle) * (minRadius + barLength);
        const endY = centerY + Math.sin(angle) * (minRadius + barLength);

        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        const hue = (baseHsl.h + (i / numBars) * 360) % 360;
        gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 1)`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 75%, ${0.7 + rawAmplitude * 0.3})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = (4 + rawAmplitude * 6) * intensity;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
  }
};

export const waveform = {
  name_de: 'Wellenform (Frequenz-Enhanced)',
  name_en: 'Waveform (Frequency-Enhanced)',
  needsTimeData: true,
  draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
    const baseHsl = hexToHsl(color);
    const centerY = h / 2;
    const totalEnergy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.3)) / 255;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + totalEnergy * 0.1})`;
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.strokeStyle = `hsla(${baseHsl.h}, 50%, 30%, 0.3)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    withSafeCanvasState(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      const sliceWidth = w / bufferLength;

      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] / 128.0) - 1.0;
        const x = i * sliceWidth;
        const y = centerY + v * (h / 2.5);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, centerY);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 60%, ${0.4 + totalEnergy * 0.3})`);
      gradient.addColorStop(0.5, `hsla(${baseHsl.h}, 100%, 40%, ${0.2 + totalEnergy * 0.2})`);
      gradient.addColorStop(1, `hsla(${(baseHsl.h + 40) % 360}, 100%, 60%, ${0.4 + totalEnergy * 0.3})`);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] / 128.0) - 1.0;
        const x = i * sliceWidth;
        const y = centerY + v * (h / 2.5);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, 70%, ${0.7 + totalEnergy * 0.3})`;
      ctx.lineWidth = (4 + totalEnergy * 6) * intensity;
      ctx.shadowColor = `hsl(${baseHsl.h}, 100%, 60%)`;
      ctx.shadowBlur = 15 + totalEnergy * 20;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] / 128.0) - 1.0;
        const x = i * sliceWidth;
        const y = centerY - v * (h / 3);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${(baseHsl.h + 30) % 360}, 80%, 60%, ${0.3 + totalEnergy * 0.2})`;
      ctx.lineWidth = (2 + totalEnergy * 3) * intensity;
      ctx.stroke();
    });
  }
};

export const waveformHorizon = {
  name_de: "Wellenform-Horizont",
  name_en: "Waveform Horizon",
  needsTimeData: true,
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const numLines = 40;
    const horizon = height * 0.4;
    const baseHsl = hexToHsl(color);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.15)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(bufferLength * 0.15), Math.floor(bufferLength * 0.4)) / 255;

    const shakeX = (Math.random() - 0.5) * bassEnergy * 15 * intensity;
    const shakeY = (Math.random() - 0.5) * bassEnergy * 10 * intensity;

    withSafeCanvasState(ctx, () => {
      ctx.translate(shakeX, shakeY);

      for (let i = 0; i < numLines; i++) {
        const progress = i / numLines;
        const yOffset = horizon + (progress * progress) * (height * 0.6);
        const perspective = 1 - progress;

        ctx.beginPath();
        ctx.moveTo(0, yOffset);

        const sampleStep = Math.max(1, Math.floor(bufferLength / 200));
        const sliceWidth = width / (bufferLength / sampleStep);

        for (let j = 0; j < bufferLength; j += sampleStep) {
          const amplitude = (dataArray[j] - 128) * 3.0 * perspective;
          const bassBoost = 1 + bassEnergy * 2;
          const finalY = yOffset + amplitude * bassBoost * (0.5 + progress * 2) * intensity;
          ctx.lineTo((j / sampleStep) * sliceWidth, finalY);
        }

        const hue = (baseHsl.h + progress * 60 + bassEnergy * 30) % 360;
        const lightness = 50 + perspective * 40 + midEnergy * 10;
        ctx.strokeStyle = `hsla(${hue}, ${Math.min(100, baseHsl.s + 20)}%, ${lightness}%, ${0.6 + perspective * 0.4})`;
        ctx.lineWidth = (2 + perspective * 4) * intensity;
        ctx.stroke();
      }

      if (bassEnergy > 0.3) {
        ctx.beginPath();
        ctx.moveTo(0, horizon);
        ctx.lineTo(width, horizon);
        ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, 80%, ${bassEnergy * 0.5})`;
        ctx.lineWidth = 3 + bassEnergy * 5;
        ctx.stroke();
      }
    });
  }
};

export const soundWaves = {
  name_de: "Schallwellen",
  name_en: "Sound Waves",
  init(width, height) {
    visualizerState.soundWaves = {
      waves: [],
      emitters: []
    };

    const numEmitters = 3;
    for (let i = 0; i < numEmitters; i++) {
      visualizerState.soundWaves.emitters.push({
        x: (width / (numEmitters + 1)) * (i + 1),
        y: height / 2,
        nextWave: 0,
        hue: (360 / numEmitters) * i
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.soundWaves) this.init(width, height);
    const state = visualizerState.soundWaves;
    const baseHsl = hexToHsl(color);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, width, height);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const now = Date.now();
    const maxWaves = 15;

    state.emitters.forEach((emitter, index) => {
      const freqPerEmitter = maxFreqIndex / state.emitters.length;
      const s = Math.floor(index * freqPerEmitter);
      const e = Math.max(s + 1, Math.floor((index + 1) * freqPerEmitter));

      const amplitude = averageRange(dataArray, s, e) / 255;
      const dynamicGain = calculateDynamicGain(index, state.emitters.length);
      const energy = amplitude * dynamicGain;

      if (energy > 0.25 && now > emitter.nextWave && state.waves.length < maxWaves) {
        state.waves.push({
          x: emitter.x,
          y: emitter.y,
          radius: 0,
          maxRadius: (80 + energy * 200) * intensity,
          speed: (2 + energy * 4) * intensity,
          hue: (baseHsl.h + emitter.hue) % 360,
          thickness: (2 + energy * 4) * intensity,
          alpha: 0.7 + energy * 0.2
        });

        emitter.nextWave = now + (400 / (1 + energy));
      }
    });

    withSafeCanvasState(ctx, () => {
      for (let i = state.waves.length - 1; i >= 0; i--) {
        const wave = state.waves[i];
        wave.radius += wave.speed;
        const progress = wave.radius / wave.maxRadius;

        if (progress >= 1) {
          state.waves.splice(i, 1);
          continue;
        }

        const alpha = wave.alpha * (1 - progress);

        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${wave.hue}, ${baseHsl.s}%, ${50 + (1 - progress) * 30}%, ${alpha})`;
        ctx.lineWidth = wave.thickness * (1 - progress * 0.5);
        ctx.stroke();
      }
    });

    state.emitters.forEach((emitter, index) => {
      const freqPerEmitter = maxFreqIndex / state.emitters.length;
      const s = Math.floor(index * freqPerEmitter);
      const e = Math.max(s + 1, Math.floor((index + 1) * freqPerEmitter));

      const amplitude = averageRange(dataArray, s, e) / 255;
      const radius = (4 + amplitude * 10) * intensity;
      const hue = (baseHsl.h + emitter.hue) % 360;

      ctx.beginPath();
      ctx.arc(emitter.x, emitter.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, ${60 + amplitude * 30}%, ${0.7 + amplitude * 0.3})`;
      ctx.fill();
    });
  }
};

export const spectrumVisualizers = {
  bars,
  mirroredBars,
  radialBars,
  waveform,
  waveformHorizon,
  soundWaves
};
