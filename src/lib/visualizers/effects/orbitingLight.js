/**
 * Orbiting Light visualizer - Displays lights orbiting around a center point
 * @module visualizers/effects/orbitingLight
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  withSafeCanvasState
} from '../core/index.js';

export const orbitingLight = {
  name_de: "Kreisendes Licht",
  name_en: "Orbiting Light",
  init(width, height) {
    const numLights = 4;
    const lights = [];

    for (let i = 0; i < numLights; i++) {
      lights.push({
        angle: (Math.PI * 2 / numLights) * i,
        orbitRadius: 80 + i * 60,
        speed: 0.02 + i * 0.01,
        baseSpeed: 0.02 + i * 0.01,
        size: 15 - i * 2,
        hueOffset: i * 90,
        trail: [],
        maxTrailLength: 30 + i * 10
      });
    }

    visualizerState.orbitingLight = {
      lights,
      time: 0,
      smoothedBass: 0,
      smoothedMid: 0,
      smoothedHigh: 0,
      smoothedEnergy: 0,
      pulsePhase: 0
    };
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.orbitingLight) this.init(width, height);
    const state = visualizerState.orbitingLight;
    const baseHsl = hexToHsl(color);
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.4;

    state.time += 0.016;
    state.pulsePhase += 0.05;

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.15)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.15), Math.floor(maxFreqIndex * 0.5)) / 255;
    const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.5), maxFreqIndex) / 255;
    const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

    state.smoothedBass = state.smoothedBass * 0.85 + bassEnergy * 0.15;
    state.smoothedMid = state.smoothedMid * 0.85 + midEnergy * 0.15;
    state.smoothedHigh = state.smoothedHigh * 0.85 + highEnergy * 0.15;
    state.smoothedEnergy = state.smoothedEnergy * 0.9 + overallEnergy * 0.1;

    withSafeCanvasState(ctx, () => {
      const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.3);
      centerGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 60%, ${state.smoothedEnergy * 0.3 * intensity})`);
      centerGlow.addColorStop(0.5, `hsla(${baseHsl.h}, 80%, 40%, ${state.smoothedEnergy * 0.15 * intensity})`);
      centerGlow.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      state.lights.forEach((light, index) => {
        const orbitRadius = light.orbitRadius * (1 + state.smoothedBass * 0.3) * (maxRadius / 200);
        const ringAlpha = 0.1 + state.smoothedEnergy * 0.1;

        ctx.beginPath();
        ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${(baseHsl.h + light.hueOffset) % 360}, 50%, 50%, ${ringAlpha * intensity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      state.lights.forEach((light, index) => {
        let speedMultiplier = 1;
        if (index === 0) speedMultiplier = 1 + state.smoothedBass * 3;
        else if (index === 1) speedMultiplier = 1 + state.smoothedMid * 2.5;
        else if (index === 2) speedMultiplier = 1 + state.smoothedHigh * 2;
        else speedMultiplier = 1 + state.smoothedEnergy * 2;

        light.angle += light.baseSpeed * speedMultiplier;

        const dynamicRadius = light.orbitRadius * (1 + state.smoothedBass * 0.4) * (maxRadius / 200);
        const x = centerX + Math.cos(light.angle) * dynamicRadius;
        const y = centerY + Math.sin(light.angle) * dynamicRadius;

        light.trail.unshift({ x, y, alpha: 1 });
        if (light.trail.length > light.maxTrailLength) {
          light.trail.pop();
        }

        light.trail.forEach((point, trailIndex) => {
          const trailProgress = trailIndex / light.trail.length;
          const trailAlpha = (1 - trailProgress) * 0.6 * intensity;
          const trailSize = light.size * (1 - trailProgress * 0.7);
          const trailHue = (baseHsl.h + light.hueOffset + trailIndex * 2) % 360;

          if (trailAlpha > 0.02) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${trailHue}, 90%, 60%, ${trailAlpha})`;
            ctx.fill();
          }
        });

        const pulseFactor = 1 + Math.sin(state.pulsePhase + index) * state.smoothedBass * 0.5;
        const lightSize = light.size * pulseFactor * intensity;
        const hue = (baseHsl.h + light.hueOffset) % 360;

        const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, lightSize * 3);
        outerGlow.addColorStop(0, `hsla(${hue}, 100%, 70%, ${0.8 * intensity})`);
        outerGlow.addColorStop(0.3, `hsla(${hue}, 100%, 60%, ${0.4 * intensity})`);
        outerGlow.addColorStop(0.6, `hsla(${hue}, 80%, 50%, ${0.15 * intensity})`);
        outerGlow.addColorStop(1, 'hsla(0, 0%, 0%, 0)');

        ctx.beginPath();
        ctx.arc(x, y, lightSize * 3, 0, Math.PI * 2);
        ctx.fillStyle = outerGlow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, lightSize * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 50%, 95%, ${intensity})`;
        ctx.fill();

        if (state.smoothedEnergy > 0.4) {
          const lineAlpha = (state.smoothedEnergy - 0.4) * 0.5 * intensity;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(x, y);
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${lineAlpha})`;
          ctx.lineWidth = 1 + state.smoothedBass * 2;
          ctx.stroke();
        }
      });

      const centerSize = 5 + state.smoothedBass * 20;
      const centerGlowInner = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, centerSize * 2);
      centerGlowInner.addColorStop(0, `hsla(${baseHsl.h}, 100%, 90%, ${0.9 * intensity})`);
      centerGlowInner.addColorStop(0.5, `hsla(${baseHsl.h}, 100%, 70%, ${0.5 * intensity})`);
      centerGlowInner.addColorStop(1, 'hsla(0, 0%, 0%, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, centerSize * 2, 0, Math.PI * 2);
      ctx.fillStyle = centerGlowInner;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, centerSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${baseHsl.h}, 30%, 95%, ${intensity})`;
      ctx.fill();
    });
  }
};
