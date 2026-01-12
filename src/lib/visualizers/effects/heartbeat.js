/**
 * Heartbeat visualizer - Displays a pulsing heart with ECG line
 * @module visualizers/effects/heartbeat
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const heartbeat = {
  name_de: "Herzschlag",
  name_en: "Heartbeat",
  init(width, height) {
    visualizerState.heartbeat = {
      scale: 1,
      targetScale: 1,
      pulseCount: 0,
      lastPulse: Date.now(),
      smoothedBass: 0,
      prevBass: 0,
      bassHistory: [],
      avgBass: 0
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.heartbeat) this.init(width, height);
    const state = visualizerState.heartbeat;

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;

    state.smoothedBass = state.smoothedBass * 0.5 + bassEnergy * 0.5;

    state.bassHistory.push(bassEnergy);
    if (state.bassHistory.length > 20) {
      state.bassHistory.shift();
    }
    state.avgBass = state.bassHistory.reduce((a, b) => a + b, 0) / state.bassHistory.length;

    const now = Date.now();
    const timeSinceLastPulse = now - state.lastPulse;
    const minTimeBetweenBeats = 150;
    const maxTimeBetweenBeats = 800;

    const dynamicThreshold = Math.max(0.05, state.avgBass * 0.8);
    const isRising = bassEnergy > state.prevBass * 1.05;
    const isAboveThreshold = bassEnergy > dynamicThreshold;
    const isStrongBeat = isRising && isAboveThreshold;
    const hasWaitedLongEnough = timeSinceLastPulse > minTimeBetweenBeats;
    const forceBeat = timeSinceLastPulse > maxTimeBetweenBeats;

    if ((isStrongBeat && hasWaitedLongEnough) || forceBeat) {
      state.targetScale = 1.3 + bassEnergy * 0.8 * intensity;
      state.lastPulse = now;
      state.pulseCount++;
    }

    state.prevBass = bassEnergy;

    const microPulse = 1 + state.smoothedBass * 0.15 * intensity;

    state.scale = state.scale * 0.85 + state.targetScale * 0.15;
    state.targetScale = state.targetScale * 0.9 + microPulse * 0.1;

    const centerX = width / 2;
    const centerY = height / 2;
    const baseSize = Math.min(width, height) * 0.15;
    const size = baseSize * state.scale * intensity;

    const baseHsl = hexToHsl(color);

    withSafeCanvasState(ctx, () => {
      ctx.translate(centerX, centerY);

      ctx.beginPath();
      ctx.moveTo(0, size * 0.3);
      ctx.bezierCurveTo(-size * 0.5, -size * 0.3, -size * 0.8, size * 0.1, 0, size * 0.9);
      ctx.bezierCurveTo(size * 0.8, size * 0.1, size * 0.5, -size * 0.3, 0, size * 0.3);
      ctx.closePath();

      const glowIntensity = (state.scale - 1) * 2;
      if (glowIntensity > 0.05) {
        ctx.shadowColor = `hsl(${baseHsl.h}, ${baseHsl.s}%, ${baseHsl.l}%)`;
        ctx.shadowBlur = glowIntensity * 40 * intensity;
      }

      const gradient = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size);
      gradient.addColorStop(0, `hsl(${baseHsl.h}, ${baseHsl.s}%, ${Math.min(85, baseHsl.l + 20)}%)`);
      gradient.addColorStop(0.6, `hsl(${baseHsl.h}, ${baseHsl.s}%, ${baseHsl.l}%)`);
      gradient.addColorStop(1, `hsl(${baseHsl.h}, ${Math.max(40, baseHsl.s - 20)}%, ${Math.max(20, baseHsl.l - 20)}%)`);

      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = `hsl(${baseHsl.h}, ${baseHsl.s}%, ${Math.max(10, baseHsl.l - 30)}%)`;
      ctx.lineWidth = 2 * intensity;
      ctx.stroke();

      ctx.shadowBlur = 0;

      const lineY = -size * 0.5;
      const lineWidth = size * 2;
      const segments = 50;

      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = (t - 0.5) * lineWidth;
        let y = lineY;

        const scrollSpeed = 0.05;
        const phase = (Date.now() * scrollSpeed * 0.001 + t * 2) % 1;

        if (phase > 0.1 && phase < 0.2) {
          const localT = (phase - 0.1) / 0.1;
          y += Math.sin(localT * Math.PI) * size * 0.08;
        } else if (phase > 0.3 && phase < 0.35) {
          y -= size * 0.05;
        } else if (phase > 0.35 && phase < 0.4) {
          const localT = (phase - 0.35) / 0.05;
          y -= Math.sin(localT * Math.PI) * size * 0.35 * (1 + state.smoothedBass * 0.5);
        } else if (phase > 0.4 && phase < 0.45) {
          y += size * 0.08;
        } else if (phase > 0.55 && phase < 0.7) {
          const localT = (phase - 0.55) / 0.15;
          y += Math.sin(localT * Math.PI) * size * 0.12;
        }

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = `hsla(${(baseHsl.h + 30) % 360}, 100%, 60%, ${0.7 + state.smoothedBass * 0.3})`;
      ctx.lineWidth = 2 * intensity;
      ctx.stroke();

      const bpm = Math.min(180, Math.max(40, Math.round(60000 / Math.max(500, timeSinceLastPulse))));
      ctx.font = `${size * 0.15}px monospace`;
      ctx.fillStyle = `hsla(${baseHsl.h}, ${baseHsl.s}%, ${baseHsl.l}%, 0.6)`;
      ctx.textAlign = 'center';
      ctx.fillText(`${bpm} BPM`, 0, size * 1.2);
    });
  }
};
