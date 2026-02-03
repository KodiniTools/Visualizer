/**
 * Vibrating Strings visualizer - Guitar/harp strings vibrating to frequencies
 * @module visualizers/spectrum/vibratingStrings
 */

import {
  visualizerState,
  hexToHsl,
  averageRange,
  CONSTANTS
} from '../core/index.js';

export const vibratingStrings = {
  name_de: "Vibrierende Saiten",
  name_en: "Vibrating Strings",

  init(width, height) {
    const stringCount = 12;
    const strings = [];

    for (let i = 0; i < stringCount; i++) {
      // Each string responds to a different frequency band
      // Lower strings (bass) are thicker, higher strings are thinner
      const stringRatio = i / (stringCount - 1);
      strings.push({
        index: i,
        thickness: 4 - stringRatio * 3, // 4px to 1px
        baseFreq: 0.5 + stringRatio * 3, // Vibration frequency
        amplitude: 0,
        targetAmplitude: 0,
        phase: Math.random() * Math.PI * 2,
        decay: 0.92 + stringRatio * 0.05, // Bass decays slower
        resonance: [], // Stores resonance points along the string
        lastPluck: 0,
        glowIntensity: 0
      });

      // Initialize resonance points for wave simulation
      const pointCount = 60;
      for (let j = 0; j < pointCount; j++) {
        strings[i].resonance.push({
          y: 0,
          velocity: 0
        });
      }
    }

    visualizerState.vibratingStrings = {
      strings,
      time: 0,
      width,
      height,
      smoothedEnergies: new Array(stringCount).fill(0)
    };
  },

  draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
    if (!visualizerState.vibratingStrings) {
      this.init(width, height);
    }

    const state = visualizerState.vibratingStrings;
    const baseHsl = hexToHsl(color);
    state.time += 0.016;

    // Clear canvas with dark background
    ctx.fillStyle = `hsla(${(baseHsl.h + 20) % 360}, 15%, 5%, 1)`;
    ctx.fillRect(0, 0, width, height);

    const stringCount = state.strings.length;
    const maxFreqIndex = Math.floor(bufferLength * 0.6);

    // Calculate layout
    const margin = 80;
    const stringSpacing = (height - margin * 2) / (stringCount - 1);
    const stringLength = width - margin * 2;
    const startX = margin;

    // Draw bridge/nut (guitar-like ends)
    this.drawBridges(ctx, startX, stringLength, height, margin, stringSpacing, stringCount, baseHsl);

    // Process each string
    state.strings.forEach((string, i) => {
      // Get frequency data for this string's band
      const bandStart = Math.floor((i / stringCount) * maxFreqIndex);
      const bandEnd = Math.floor(((i + 1) / stringCount) * maxFreqIndex);
      const bandEnergy = averageRange(dataArray, bandStart, bandEnd) / 255;

      // Smooth the energy
      state.smoothedEnergies[i] += (bandEnergy - state.smoothedEnergies[i]) * 0.3;
      const energy = state.smoothedEnergies[i];

      // Detect "plucks" (sudden increases in energy)
      const pluckThreshold = 0.15;
      if (energy - string.amplitude > pluckThreshold && state.time - string.lastPluck > 0.1) {
        string.lastPluck = state.time;
        // Add energy to the string
        const pluckPoint = 0.3 + Math.random() * 0.4; // Pluck somewhere in the middle
        const pluckIndex = Math.floor(pluckPoint * string.resonance.length);
        const pluckStrength = (energy - string.amplitude) * 50 * intensity;

        // Create a pluck wave
        for (let j = 0; j < string.resonance.length; j++) {
          const distance = Math.abs(j - pluckIndex) / string.resonance.length;
          const falloff = Math.exp(-distance * 5);
          string.resonance[j].velocity += pluckStrength * falloff * (Math.random() > 0.5 ? 1 : -1);
        }

        string.glowIntensity = 1.0;
      }

      // Update target amplitude
      string.targetAmplitude = energy * 30 * intensity;
      string.amplitude += (string.targetAmplitude - string.amplitude) * 0.2;

      // Physics simulation for the string
      this.updateStringPhysics(string, energy, intensity);

      // Calculate string Y position
      const stringY = margin + i * stringSpacing;

      // Draw the string
      this.drawString(ctx, string, startX, stringY, stringLength, energy, baseHsl, intensity);

      // Decay glow
      string.glowIntensity *= 0.95;
    });

    // Draw overall ambient lighting
    this.drawAmbientGlow(ctx, width, height, state.smoothedEnergies, baseHsl, intensity);
  },

  updateStringPhysics(string, energy, intensity) {
    const tension = 0.3 + energy * 0.2; // Higher tension for more energy
    const damping = 0.985;
    const points = string.resonance;

    // Wave equation simulation
    for (let i = 1; i < points.length - 1; i++) {
      const left = points[i - 1].y;
      const right = points[i + 1].y;
      const current = points[i].y;

      // Force from neighboring points (tension)
      const force = tension * (left + right - 2 * current);

      // Add subtle continuous vibration based on audio
      const audioForce = Math.sin(string.phase + i * 0.2) * energy * 2 * intensity;

      points[i].velocity += force + audioForce * 0.1;
      points[i].velocity *= damping;
    }

    // Update positions
    for (let i = 1; i < points.length - 1; i++) {
      points[i].y += points[i].velocity;
    }

    // Fixed endpoints
    points[0].y = 0;
    points[0].velocity = 0;
    points[points.length - 1].y = 0;
    points[points.length - 1].velocity = 0;

    // Update phase for continuous subtle vibration
    string.phase += string.baseFreq * 0.1;
  },

  drawString(ctx, string, startX, stringY, stringLength, energy, baseHsl, intensity) {
    const points = string.resonance;
    const segmentWidth = stringLength / (points.length - 1);

    // Calculate string color based on pitch (higher = brighter)
    const pitchOffset = string.index * 15;
    const hue = (baseHsl.h + pitchOffset) % 360;
    const saturation = 60 + energy * 30;
    const lightness = 40 + energy * 30 + string.glowIntensity * 20;

    // Draw glow effect
    if (energy > 0.1 || string.glowIntensity > 0.1) {
      ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, ${(energy + string.glowIntensity) * 0.5})`;
      ctx.shadowBlur = 15 + energy * 20;
    }

    // Draw the string as a smooth curve
    ctx.beginPath();
    ctx.moveTo(startX, stringY + points[0].y);

    // Use bezier curves for smooth string
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = startX + i * segmentWidth;
      const y1 = stringY + points[i].y;
      const x2 = startX + (i + 1) * segmentWidth;
      const y2 = stringY + points[i + 1].y;

      const cpx = (x1 + x2) / 2;
      const cpy1 = y1;
      const cpy2 = y2;

      ctx.quadraticCurveTo(x1 + segmentWidth * 0.5, (y1 + y2) / 2, x2, y2);
    }

    // String gradient (metallic look)
    const gradient = ctx.createLinearGradient(startX, stringY - 10, startX, stringY + 10);
    gradient.addColorStop(0, `hsla(${hue}, ${saturation * 0.5}%, ${lightness + 20}%, ${0.7 + energy * 0.3})`);
    gradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.9 + energy * 0.1})`);
    gradient.addColorStop(1, `hsla(${hue}, ${saturation * 0.7}%, ${lightness - 15}%, ${0.6 + energy * 0.3})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = string.thickness * (1 + energy * 0.5);
    ctx.lineCap = 'round';
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw vibration motion blur effect for active strings
    if (energy > 0.3) {
      ctx.globalAlpha = energy * 0.2;
      for (let blur = 1; blur <= 3; blur++) {
        ctx.beginPath();
        ctx.moveTo(startX, stringY + points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const x2 = startX + (i + 1) * segmentWidth;
          const y2 = stringY + points[i + 1].y * (1 + blur * 0.3);
          ctx.lineTo(x2, y2);
        }
        ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.1 / blur})`;
        ctx.lineWidth = string.thickness * (1 + blur * 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  },

  drawBridges(ctx, startX, stringLength, height, margin, stringSpacing, stringCount, baseHsl) {
    const bridgeWidth = 15;
    const bridgeHeight = stringSpacing * (stringCount - 1) + 40;
    const bridgeY = margin - 20;

    // Left bridge (nut)
    const leftGrad = ctx.createLinearGradient(startX - bridgeWidth, 0, startX, 0);
    leftGrad.addColorStop(0, `hsla(${baseHsl.h}, 20%, 15%, 1)`);
    leftGrad.addColorStop(0.5, `hsla(${baseHsl.h}, 15%, 25%, 1)`);
    leftGrad.addColorStop(1, `hsla(${baseHsl.h}, 10%, 20%, 1)`);

    ctx.fillStyle = leftGrad;
    ctx.fillRect(startX - bridgeWidth, bridgeY, bridgeWidth, bridgeHeight);

    // Right bridge
    const rightGrad = ctx.createLinearGradient(startX + stringLength, 0, startX + stringLength + bridgeWidth, 0);
    rightGrad.addColorStop(0, `hsla(${baseHsl.h}, 10%, 20%, 1)`);
    rightGrad.addColorStop(0.5, `hsla(${baseHsl.h}, 15%, 25%, 1)`);
    rightGrad.addColorStop(1, `hsla(${baseHsl.h}, 20%, 15%, 1)`);

    ctx.fillStyle = rightGrad;
    ctx.fillRect(startX + stringLength, bridgeY, bridgeWidth, bridgeHeight);

    // Tuning pegs (left side)
    for (let i = 0; i < stringCount; i++) {
      const pegY = margin + i * stringSpacing;
      ctx.beginPath();
      ctx.arc(startX - bridgeWidth - 10, pegY, 6, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${baseHsl.h}, 30%, 40%, 0.8)`;
      ctx.fill();
      ctx.strokeStyle = `hsla(${baseHsl.h}, 20%, 60%, 0.5)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },

  drawAmbientGlow(ctx, width, height, energies, baseHsl, intensity) {
    // Overall energy
    const totalEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;

    if (totalEnergy > 0.1) {
      // Subtle vignette glow
      const glowGrad = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7
      );
      glowGrad.addColorStop(0, `hsla(${baseHsl.h}, 60%, 50%, ${totalEnergy * 0.05 * intensity})`);
      glowGrad.addColorStop(0.5, `hsla(${(baseHsl.h + 30) % 360}, 40%, 30%, ${totalEnergy * 0.03 * intensity})`);
      glowGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Sound hole effect (subtle dark center at bottom)
    const holeGrad = ctx.createRadialGradient(
      width / 2, height + 50, 0,
      width / 2, height + 50, 200
    );
    holeGrad.addColorStop(0, `hsla(${baseHsl.h}, 30%, 5%, 0.8)`);
    holeGrad.addColorStop(0.5, `hsla(${baseHsl.h}, 20%, 8%, 0.4)`);
    holeGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = holeGrad;
    ctx.fillRect(0, height - 150, width, 200);
  },

  cleanup() {
    if (visualizerState.vibratingStrings) {
      visualizerState.vibratingStrings.strings = [];
      delete visualizerState.vibratingStrings;
    }
  }
};
