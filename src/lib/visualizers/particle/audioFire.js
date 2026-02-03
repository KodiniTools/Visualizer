/**
 * Audio Fire visualizer - Realistic fire simulation driven by audio
 * @module visualizers/particle/audioFire
 */

import {
  visualizerState,
  hexToHsl,
  averageRange
} from '../core/index.js';

/**
 * Fire particle class for realistic flame behavior
 */
class FireParticle {
  constructor(x, baseY, width) {
    this.reset(x, baseY, width);
  }

  reset(x, baseY, width) {
    this.x = x + (Math.random() - 0.5) * 30;
    this.y = baseY;
    this.baseX = x;
    this.baseY = baseY;
    this.width = width;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = -Math.random() * 3 - 2;
    this.life = 1.0;
    this.maxLife = 0.6 + Math.random() * 0.4;
    this.size = 15 + Math.random() * 25;
    this.decay = 0.015 + Math.random() * 0.02;
    this.turbulence = Math.random() * Math.PI * 2;
    this.flickerSpeed = 0.1 + Math.random() * 0.1;
  }

  update(intensity, windForce, time) {
    // Turbulent upward motion
    this.turbulence += this.flickerSpeed;
    this.vx += Math.sin(this.turbulence) * 0.3 + windForce * 0.1;
    this.vy -= 0.1 + intensity * 0.15;

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;

    // Dampen horizontal velocity
    this.vx *= 0.98;

    // Decay life based on intensity (higher intensity = longer flames)
    this.life -= this.decay * (1.2 - intensity * 0.5);

    // Shrink as life decreases
    this.size *= 0.985;

    return this.life > 0;
  }
}

export const audioFire = {
  name_de: "Audio-Feuer",
  name_en: "Audio Fire",

  init(width, height) {
    const particleCount = 300;
    const particles = [];
    const baseY = height;

    // Create fire columns across the width
    const columnCount = 12;
    const columnWidth = width / columnCount;

    for (let i = 0; i < particleCount; i++) {
      const column = i % columnCount;
      const x = column * columnWidth + columnWidth / 2;
      particles.push(new FireParticle(x, baseY, columnWidth));
    }

    visualizerState.audioFire = {
      particles,
      time: 0,
      columnCount,
      columnWidth,
      smoothedBass: 0,
      smoothedMid: 0,
      smoothedHigh: 0
    };
  },

  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.audioFire || visualizerState.audioFire.particles.length === 0) {
      this.init(width, height);
    }

    const state = visualizerState.audioFire;
    const baseHsl = hexToHsl(color);
    state.time += 0.016;

    // Analyze frequency bands
    const maxFreqIndex = Math.floor(bufferLength * 0.5);
    const bassRaw = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.15)) / 255;
    const midRaw = averageRange(dataArray, Math.floor(maxFreqIndex * 0.15), Math.floor(maxFreqIndex * 0.5)) / 255;
    const highRaw = averageRange(dataArray, Math.floor(maxFreqIndex * 0.5), maxFreqIndex) / 255;

    // Smooth the values
    state.smoothedBass += (bassRaw - state.smoothedBass) * 0.3;
    state.smoothedMid += (midRaw - state.smoothedMid) * 0.25;
    state.smoothedHigh += (highRaw - state.smoothedHigh) * 0.2;

    const bass = state.smoothedBass;
    const mid = state.smoothedMid;
    const high = state.smoothedHigh;
    const overallEnergy = (bass * 0.5 + mid * 0.3 + high * 0.2) * intensity;

    // Clear with slight fade for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, width, height);

    // Calculate wind based on treble variations
    const windForce = Math.sin(state.time * 2) * high * 3;

    // Get frequency data per column for varying flame heights
    const columnEnergies = [];
    for (let col = 0; col < state.columnCount; col++) {
      const startIdx = Math.floor((col / state.columnCount) * maxFreqIndex);
      const endIdx = Math.floor(((col + 1) / state.columnCount) * maxFreqIndex);
      const energy = averageRange(dataArray, startIdx, endIdx) / 255;
      columnEnergies.push(energy);
    }

    // Update and draw particles
    const baseY = height;

    // Sort particles by Y for proper layering (back to front)
    state.particles.sort((a, b) => a.y - b.y);

    state.particles.forEach((p, index) => {
      const column = index % state.columnCount;
      const columnEnergy = columnEnergies[column] || 0.5;
      const localIntensity = (columnEnergy * 0.7 + overallEnergy * 0.3) * intensity;

      if (!p.update(localIntensity, windForce, state.time)) {
        // Reset dead particle
        const x = column * state.columnWidth + state.columnWidth / 2;
        p.reset(x, baseY, state.columnWidth);
      }

      // Calculate color based on particle life and position
      // Hot core (white/yellow) -> orange -> red -> dark red/black
      const lifeRatio = p.life / p.maxLife;
      const heightRatio = 1 - (baseY - p.y) / (height * 0.8);

      let hue, saturation, lightness;

      if (lifeRatio > 0.7) {
        // Core: bright yellow/white
        hue = 45 + (baseHsl.h - 45) * 0.2;
        saturation = 100;
        lightness = 70 + lifeRatio * 25;
      } else if (lifeRatio > 0.4) {
        // Middle: orange
        hue = 25 + (baseHsl.h - 25) * 0.3;
        saturation = 100;
        lightness = 50 + lifeRatio * 20;
      } else {
        // Outer: red to dark
        hue = (baseHsl.h * 0.5 + 10);
        saturation = 90 + (1 - lifeRatio) * 10;
        lightness = 20 + lifeRatio * 40;
      }

      // Add some color variation based on input color
      hue = (hue + (baseHsl.h - 30) * 0.2) % 360;
      if (hue < 0) hue += 360;

      const alpha = lifeRatio * (0.6 + localIntensity * 0.4);
      const size = p.size * (0.5 + localIntensity * 0.5);

      // Draw glow
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
      gradient.addColorStop(0.4, `hsla(${hue - 10}, ${saturation}%, ${lightness * 0.7}%, ${alpha * 0.6})`);
      gradient.addColorStop(0.7, `hsla(${hue - 20}, ${saturation * 0.9}%, ${lightness * 0.4}%, ${alpha * 0.3})`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add bright core for hot particles
      if (lifeRatio > 0.6 && localIntensity > 0.3) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(55, 100%, 90%, ${alpha * 0.8})`;
        ctx.fill();
      }
    });

    // Draw embers/sparks on high energy
    if (bass > 0.5) {
      const sparkCount = Math.floor(bass * 10 * intensity);
      for (let i = 0; i < sparkCount; i++) {
        const x = Math.random() * width;
        const y = height - Math.random() * height * 0.6;
        const sparkSize = 1 + Math.random() * 2;

        ctx.beginPath();
        ctx.arc(x, y, sparkSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(40, 100%, 70%, ${0.5 + Math.random() * 0.5})`;
        ctx.fill();
      }
    }

    // Add base glow
    const baseGlow = ctx.createLinearGradient(0, height, 0, height - 100);
    baseGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 50%, ${0.3 + bass * 0.3})`);
    baseGlow.addColorStop(0.5, `hsla(${(baseHsl.h + 20) % 360}, 90%, 40%, ${0.1 + bass * 0.1})`);
    baseGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = baseGlow;
    ctx.fillRect(0, height - 100, width, 100);
  },

  cleanup() {
    if (visualizerState.audioFire) {
      visualizerState.audioFire.particles = [];
      delete visualizerState.audioFire;
    }
  }
};
