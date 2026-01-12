/**
 * Sound Waves visualizer - Expanding circular waves from multiple emitters
 * @module visualizers/spectrum/soundWaves
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  calculateDynamicGain,
  withSafeCanvasState
} from '../core/index.js';

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

    ctx.clearRect(0, 0, width, height);

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
