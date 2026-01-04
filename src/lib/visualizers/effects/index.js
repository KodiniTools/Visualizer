/**
 * Effects visualizers - Special effects and ambient visuals
 * @module visualizers/effects
 */

import {
  visualizerState,
  hexToHsl,
  rangeForBar,
  averageRange,
  calculateDynamicGain,
  withSafeCanvasState
} from '../core/index.js';

export const pulsingOrbs = {
  name_de: "Pulsierende Kugeln",
  name_en: "Pulsing Orbs",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const numOrbs = Math.min(12, maxFreqIndex);
    const baseHsl = hexToHsl(color);

    for (let i = 0; i < numOrbs; i++) {
      const freqPerOrb = maxFreqIndex / numOrbs;
      const s = Math.floor(i * freqPerOrb);
      const e = Math.max(s + 1, Math.floor((i + 1) * freqPerOrb));

      const amplitude = averageRange(dataArray, s, e) / 255;
      const dynamicGain = calculateDynamicGain(i, numOrbs);
      const x = (width / (numOrbs + 1)) * (i + 1);
      const y = height / 2;
      const baseRadius = Math.min(width, height) / 30;
      const radius = baseRadius + (amplitude * dynamicGain * baseRadius * 2 * intensity);

      withSafeCanvasState(ctx, () => {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
        const hue = (baseHsl.h + (i / numOrbs) * 60) % 360;
        gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.8 + amplitude * 0.2})`);
        gradient.addColorStop(0.7, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.4 + amplitude * 0.6})`);
        gradient.addColorStop(1, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${70 + amplitude * 30}%)`;
        ctx.fill();
      });
    }
  }
};

export const lightBeams = {
  name_de: "Lichtstrahlen",
  name_en: "Light Beams",
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    const numBeams = 72;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseHsl = hexToHsl(color);
    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

    withSafeCanvasState(ctx, () => {
      for (let i = 0; i < numBeams; i++) {
        const freqIndex = Math.floor((i / numBeams) * maxFreqIndex);
        const sampleSize = Math.max(1, Math.floor(maxFreqIndex / numBeams));
        const s = freqIndex;
        const e = Math.min(maxFreqIndex, freqIndex + sampleSize);

        const rawAmplitude = averageRange(dataArray, s, e) / 255;
        const amplitude = Math.max(0.4, rawAmplitude * 1.8 + overallEnergy * 0.3);

        const angle = (i / numBeams) * Math.PI * 2;
        const length = (50 + amplitude * Math.min(width, height) * 0.5) * intensity;
        const beamWidth = (3 + amplitude * 10) * intensity;

        const x1 = centerX + Math.cos(angle) * 30;
        const y1 = centerY + Math.sin(angle) * 30;
        const x2 = centerX + Math.cos(angle) * (30 + length);
        const y2 = centerY + Math.sin(angle) * (30 + length);

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        const hue = (baseHsl.h + (i / numBeams) * 180) % 360;
        gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${0.6 * amplitude})`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = beamWidth;
        ctx.stroke();

        if (amplitude > 0.7) {
          ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
          ctx.shadowBlur = 15 * intensity;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `hsla(${hue}, 100%, 85%, ${amplitude * 0.6})`;
          ctx.lineWidth = beamWidth * 0.4;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    });
  }
};

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

export const liquidCrystals = {
  name_de: "Flüssigkristalle",
  name_en: "Liquid Crystals",
  init(width, height) {
    visualizerState.liquidCrystals = { crystals: [], numCrystals: 60, time: 0 };
    for (let i = 0; i < 60; i++) {
      visualizerState.liquidCrystals.crystals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        baseSize: 15 + Math.random() * 25,
        smoothedSize: 15 + Math.random() * 25,
        hueOffset: Math.random() * 60,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  },
  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.liquidCrystals) this.init(width, height);
    const state = visualizerState.liquidCrystals;
    const baseHsl = hexToHsl(color);

    const maxFreqIndex = Math.floor(bufferLength * 0.21);
    const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
    const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

    state.time = (state.time || 0) + 0.02;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + bassEnergy * 0.05})`;
    ctx.fillRect(0, 0, width, height);

    if (bassEnergy > 0.3) {
      const bgGlow = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height) * 0.5);
      bgGlow.addColorStop(0, `hsla(${baseHsl.h}, 80%, 40%, ${bassEnergy * 0.15})`);
      bgGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);
    }

    state.crystals.forEach((crystal, index) => {
      const freqIndex = Math.floor((index / state.numCrystals) * maxFreqIndex);
      const amplitude = (dataArray[freqIndex] || 0) / 255;
      const dynamicGain = calculateDynamicGain(index, state.numCrystals);
      const effectiveAmplitude = amplitude * dynamicGain * intensity;

      const speedMult = 1 + bassEnergy * 3 + effectiveAmplitude * 2;
      crystal.x += crystal.vx * speedMult;
      crystal.y += crystal.vy * speedMult;
      crystal.rotation += crystal.rotationSpeed * (1 + effectiveAmplitude * 3);

      if (crystal.x < 0 || crystal.x > width) {
        crystal.vx *= -1;
        crystal.vy += (Math.random() - 0.5) * bassEnergy * 2;
      }
      if (crystal.y < 0 || crystal.y > height) {
        crystal.vy *= -1;
        crystal.vx += (Math.random() - 0.5) * bassEnergy * 2;
      }

      const pulse = Math.sin(state.time * 3 + crystal.pulsePhase) * 0.2 + 1;
      const targetSize = crystal.baseSize * pulse * (1 + effectiveAmplitude * 2);
      crystal.smoothedSize = crystal.smoothedSize * 0.7 + targetSize * 0.3;

      withSafeCanvasState(ctx, () => {
        ctx.translate(crystal.x, crystal.y);
        ctx.rotate(crystal.rotation);

        const sides = 6;
        const hue = (baseHsl.h + crystal.hueOffset + midEnergy * 40) % 360;

        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2;
          const x = Math.cos(angle) * crystal.smoothedSize * 1.3;
          const y = Math.sin(angle) * crystal.smoothedSize * 1.3;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.1 + effectiveAmplitude * 0.2})`;
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2;
          const wobble = Math.sin(state.time * 5 + i) * effectiveAmplitude * 5;
          const x = Math.cos(angle) * (crystal.smoothedSize + wobble);
          const y = Math.sin(angle) * (crystal.smoothedSize + wobble);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, crystal.smoothedSize);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${0.8 + effectiveAmplitude * 0.2})`);
        gradient.addColorStop(0.5, `hsla(${hue}, 90%, 60%, ${0.5 + effectiveAmplitude * 0.3})`);
        gradient.addColorStop(1, `hsla(${hue}, 80%, 40%, ${0.3 + effectiveAmplitude * 0.4})`);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = `hsla(${hue}, 100%, ${75 + effectiveAmplitude * 25}%, ${0.7 + effectiveAmplitude * 0.3})`;
        ctx.lineWidth = (2 + effectiveAmplitude * 4) * intensity;
        ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowBlur = 10 + effectiveAmplitude * 20;
        ctx.stroke();
      });
    });
  }
};

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

export const effectsVisualizers = {
  pulsingOrbs,
  lightBeams,
  vortexPortal,
  liquidCrystals,
  orbitingLight,
  heartbeat,
  texturedWave
};
