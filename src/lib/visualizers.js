/**
 * visualizers.js - Comprehensive Collection of Audio Visualizers
 * This file is bilingual (German/English).
 * * @description Audio visualization library with multiple effect types
 * @module Visualizers
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const CONSTANTS = {
  // Smoothing factors
  SMOOTHING_BASE: 0.5,
  SMOOTHING_MID_MULTIPLIER: 1.2,
  SMOOTHING_HIGH_MULTIPLIER: 1.5,

  // Animation
  FADE_RATE: 0.98,
  PARTICLE_FADE: 0.98,

  // Thresholds
  BASS_THRESHOLD: 0.15,
  LOW_MID_THRESHOLD: 0.4,
  HIGH_MID_THRESHOLD: 0.65,
  HIGH_THRESHOLD: 0.85,

  // Gains
  BASS_GAIN: 1.0,
  LOW_MID_GAIN: 1.4,
  HIGH_MID_GAIN: 1.8,
  HIGH_GAIN: 2.5,
  ULTRA_HIGH_GAIN: 3.5,

  // Visual thresholds
  MIN_VISIBLE_AMPLITUDE: 0.05,
  HIGH_ENERGY_THRESHOLD: 0.3,
  BEAT_THRESHOLD: 0.65,

  // Cache settings
  COLOR_CACHE_MAX_SIZE: 100
};

// ============================================================================
// HELPER CLASSES
// ============================================================================

/**
 * Particle class for particle-based effects
 */
class Particle {
  /**
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} radius - Particle radius
   * @param {string} color - Color in CSS format
   * @param {Object} velocity - Velocity object with x and y properties
   */
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
    this.alpha = 1;
  }

  /**
   * Draw the particle on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }

  /**
   * Update particle position and fade
   */
  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.alpha *= CONSTANTS.PARTICLE_FADE;
  }
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

/**
 * Global state for visualizers that need to persist data between frames
 */
const visualizerState = {
  particles: [],
  ripples: [],
  blossoms: [],
  shardTriangles: [],
  // Smoothed values arrays
  smoothedBars: [],
  smoothedMirroredBars: [],
  smoothedRadialBars: [],
  smooth3DBars: [],
  smoothedCircles: [],
  smoothedFluidWaves: [],
  smoothedSpiralGalaxy: [],
  // Visualizer-specific state
  matrixRain: null,
  networkPlexus: null,
  particleStorm: null,
  digitalRain: null,
  shardMosaic: null,
  singleBlossom: null,
  blossom: null,
  cosmicNebula: null,
  liquidCrystals: null,
  electricWeb: null
};

// ============================================================================
// COLOR CACHE
// ============================================================================

/**
 * Cache for hexToHsl conversions to improve performance
 */
const colorCache = new Map();

/**
 * Clear color cache if it gets too large
 */
function maintainColorCache() {
  if (colorCache.size > CONSTANTS.COLOR_CACHE_MAX_SIZE) {
    const firstKey = colorCache.keys().next().value;
    colorCache.delete(firstKey);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert HEX color to HSL
 * @param {string} hex - HEX color string (e.g., "#FF0000")
 * @returns {{h: number, s: number, l: number}} HSL color object
 */
function hexToHsl(hex) {
  if (colorCache.has(hex)) {
    return colorCache.get(hex);
  }
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
  let h = 0, s = 0, l = 0;
  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);
  const result = { h, s, l };
  colorCache.set(hex, result);
  maintainColorCache();
  return result;
}

/**
 * Exponential mapping from [0,1] to [0,1] with adjustable base
 * @param {number} u - Input value (0 to 1)
 * @param {number} base - Exponential base (default 4)
 * @returns {number} Mapped value (0 to 1)
 */
function expo01(u, base = 4) {
  return (Math.pow(base, Math.min(1, Math.max(0, u))) - 1) / (base - 1);
}

/**
 * Calculate frequency range for a given bar index using logarithmic mapping
 * @param {number} i - Bar index
 * @param {number} totalBars - Total number of bars
 * @param {number} dataSize - Size of frequency data array
 * @returns {[number, number]} Start and end indices for the frequency range
 */
function rangeForBar(i, totalBars, dataSize) {
  const t0 = i / totalBars;
  const t1 = (i + 1) / totalBars;
  const maxIdx = Math.max(1, dataSize) - 1;
  const start = Math.floor(expo01(t0) * maxIdx);
  const end = Math.max(start + 1, Math.floor(expo01(t1) * maxIdx));
  return [start, end];
}

/**
 * Calculate average value in a range of an array
 * @param {Uint8Array|Array<number>} arr - Data array
 * @param {number} start - Start index
 * @param {number} end - End index
 * @returns {number} Average value
 */
function averageRange(arr, start, end) {
  let sum = 0;
  const s = Math.max(0, start) | 0;
  const e = Math.max(s + 1, end) | 0;
  for (let i = s; i < e; i++) {
    sum += arr[i] || 0;
  }
  return sum / (e - s);
}

/**
 * Calculate dynamic gain based on frequency position
 * @param {number} barIndex - Current bar index
 * @param {number} totalBars - Total number of bars
 * @param {Object} settings - Optional gain settings override
 * @returns {number} Dynamic gain multiplier
 */
function calculateDynamicGain(barIndex, totalBars, settings = {}) {
  const {
    bassGain = CONSTANTS.BASS_GAIN, lowMidGain = CONSTANTS.LOW_MID_GAIN,
    highMidGain = CONSTANTS.HIGH_MID_GAIN, highGain = CONSTANTS.HIGH_GAIN,
    ultraHighGain = CONSTANTS.ULTRA_HIGH_GAIN, bassThreshold = CONSTANTS.BASS_THRESHOLD,
    lowMidThreshold = CONSTANTS.LOW_MID_THRESHOLD, highMidThreshold = CONSTANTS.HIGH_MID_THRESHOLD,
    highThreshold = CONSTANTS.HIGH_THRESHOLD
  } = settings;
  const normalizedPosition = barIndex / totalBars;
  if (normalizedPosition <= bassThreshold) return bassGain;
  if (normalizedPosition <= lowMidThreshold) return bassGain + ((normalizedPosition - bassThreshold) / (lowMidThreshold - bassThreshold)) * (lowMidGain - bassGain);
  if (normalizedPosition <= highMidThreshold) return lowMidGain + ((normalizedPosition - lowMidThreshold) / (highMidThreshold - lowMidThreshold)) * (highMidGain - lowMidGain);
  if (normalizedPosition <= highThreshold) return highMidGain + ((normalizedPosition - highMidThreshold) / (highThreshold - highMidThreshold)) * (highGain - highMidGain);
  return highGain + ((normalizedPosition - highThreshold) / (1.0 - highThreshold)) * (ultraHighGain - highGain);
}

/**
 * Get frequency-based smoothing factor
 * @param {number} barIndex - Current bar index
 * @param {number} totalBars - Total number of bars
 * @param {number} baseSmoothingFactor - Base smoothing factor
 * @returns {number} Adjusted smoothing factor
 */
function getFrequencyBasedSmoothing(barIndex, totalBars, baseSmoothingFactor = CONSTANTS.SMOOTHING_BASE) {
  const normalizedPosition = barIndex / totalBars;
  if (normalizedPosition > 0.7) return baseSmoothingFactor * CONSTANTS.SMOOTHING_HIGH_MULTIPLIER;
  if (normalizedPosition > 0.3) return baseSmoothingFactor * CONSTANTS.SMOOTHING_MID_MULTIPLIER;
  return baseSmoothingFactor;
}

/**
 * Apply smoothing to a target value
 * @param {number} current - Current smoothed value
 * @param {number} target - Target value
 * @param {number} factor - Smoothing factor (0-1)
 * @returns {number} New smoothed value
 */
function applySmoothValue(current, target, factor) {
  return current + (target - current) * factor;
}

/**
 * Safe canvas state wrapper
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Function} drawFunction - Function to execute with safe state
 */
function withSafeCanvasState(ctx, drawFunction) {
  ctx.save();
  try {
    drawFunction();
  } finally {
    ctx.restore();
  }
}

// ============================================================================
// VISUALIZERS
// ============================================================================

/**
 * Collection of audio visualizers
 * Each visualizer has:
 * - name_de: German name
 * - name_en: English name
 * - draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0): Main render function
 * - init(width, height): Optional initialization function
 * - needsTimeData: Optional boolean indicating time-domain data requirement
 */
export const Visualizers = {
  bars: {
    name_de: 'Balken (Ultra-Dynamisch)',
    name_en: 'Bars (Ultra-Dynamic)',
    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      // Setze Transform zurück für sauberes Zeichnen
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // OPTIMALE STRATEGIE: Nutze nur 21% der Frequenzen (wo garantiert Audio-Energie ist)
      const maxFreqIndex = Math.floor(bufferLength * 0.21); // 21% = ~107 Frequenzen
      const numBars = maxFreqIndex; // Jede Frequenz = 1 Balken

      const barWidth = w / numBars;
      const gapWidth = barWidth * 0.1;
      const actualBarWidth = barWidth - gapWidth;
      const baseHsl = hexToHsl(color);

      // State-Key basierend auf numBars für konsistentes Smoothing
      const stateKey = `bars_${numBars}`;
      if (!visualizerState[stateKey]) {
        visualizerState[stateKey] = new Array(numBars).fill(0);
      }
      if (visualizerState[stateKey].length !== numBars) {
        visualizerState[stateKey] = new Array(numBars).fill(0);
      }

      const masterGain = 0.35; // Reduziert für optimale Balkenhöhe

      // Zeichne Balken über die gesamte Breite
      for (let i = 0; i < numBars; i++) {
        const dynamicGain = calculateDynamicGain(i, numBars);

        // LINEARE Verteilung: Jeder Balken = 1 Frequenz
        const freqPerBar = maxFreqIndex / numBars;
        const s = Math.floor(i * freqPerBar);
        const e = Math.max(s + 1, Math.floor((i + 1) * freqPerBar));

        const rawValue = averageRange(dataArray, s, e);

        const targetHeight = (rawValue / 255) * h * dynamicGain * masterGain * intensity;
        const smoothingFactor = getFrequencyBasedSmoothing(i, numBars, CONSTANTS.SMOOTHING_BASE);
        visualizerState[stateKey][i] = applySmoothValue(visualizerState[stateKey][i] || 0, targetHeight, smoothingFactor);

        // Exakte Positionierung: Start bei 0, Ende bei w
        const x = i * barWidth;
        const hue = (baseHsl.h + (i / numBars) * 120) % 360;
        ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${baseHsl.l}%)`;

        // Zeichne Balken mit Gap
        ctx.fillRect(x + gapWidth / 2, h - visualizerState[stateKey][i], actualBarWidth, visualizerState[stateKey][i]);
      }

      // Stelle Transform wieder her
      ctx.restore();
    }
  },
  rainbowCube: {
    name_de: 'Vibrierender Regenbogen-Würfel',
    name_en: 'Vibrating Rainbow Cube',
    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      const bass = averageRange(dataArray, 0, Math.floor(bufferLength * 0.1)) / 255;
      const size = Math.min(w, h) * 0.15 * (1 + bass * 0.5 * intensity);
      const angle = Math.PI / 6;
      const vibrationX = (Math.random() - 0.5) * bass * 15 * intensity;
      const vibrationY = (Math.random() - 0.5) * bass * 15 * intensity;
      const centerX = w / 2 + vibrationX;
      const centerY = h / 2 + vibrationY;
      const p = [
        {x: -size, y: -size, z: -size}, {x: size, y: -size, z: -size},
        {x: size, y: size, z: -size}, {x: -size, y: size, z: -size},
        {x: -size, y: -size, z: size}, {x: size, y: -size, z: size},
        {x: size, y: size, z: size}, {x: -size, y: size, z: size}
      ];
      const rotation = Date.now() * 0.0005;
      const cos = Math.cos(rotation), sin = Math.sin(rotation);
      const projected = p.map(point => {
        const rotatedX = point.x * cos - point.z * sin;
        const rotatedZ = point.x * sin + point.z * cos;
        const isoX = (rotatedX - point.y) * Math.cos(angle);
        const isoY = (rotatedX + point.y) * Math.sin(angle) - rotatedZ;
        return { x: centerX + isoX, y: centerY + isoY };
      });
      const baseHsl = hexToHsl(color);
      const faces = [
        { points: [0, 1, 2, 3], color: `hsl(${baseHsl.h}, ${baseHsl.s}%, 60%)` },
        { points: [1, 5, 6, 2], color: `hsl(${(baseHsl.h + 30) % 360}, ${baseHsl.s}%, 60%)` },
        { points: [4, 5, 6, 7], color: `hsl(${(baseHsl.h + 60) % 360}, ${baseHsl.s}%, 50%)` },
        { points: [0, 4, 7, 3], color: `hsl(${(baseHsl.h + 90) % 360}, ${baseHsl.s}%, 50%)` },
        { points: [4, 5, 1, 0], color: `hsl(${(baseHsl.h + 120) % 360}, ${baseHsl.s}%, 70%)` },
        { points: [3, 2, 6, 7], color: `hsl(${(baseHsl.h + 150) % 360}, ${baseHsl.s}%, 40%)` }
      ];
      faces.forEach(face => {
        ctx.beginPath();
        ctx.moveTo(projected[face.points[0]].x, projected[face.points[0]].y);
        for (let i = 1; i < face.points.length; i++) {
          ctx.lineTo(projected[face.points[i]].x, projected[face.points[i]].y);
        }
        ctx.closePath();
        ctx.fillStyle = face.color;
        ctx.fill();
      });
    }
  },
  matrixRain: {
    name_de: "Matrix-Regen (Glitzer-Effekt)",
    name_en: "Matrix Rain (Glitter Effect)",
    init(width, height) {
      const fontSize = 16;
      const columns = Math.max(1, Math.floor(width / fontSize));
      visualizerState.matrixRain = {
        fontSize, columns,
        drops: Array.from({ length: columns }, () => Math.random() * -50),
        speeds: Array.from({ length: columns }, () => 0.5 + Math.random() * 1.5),
        chars: Array.from({ length: columns }, () => Array.from({ length: 30 }, () =>
          String.fromCharCode(0x30A0 + Math.random() * 96)))
      };
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.matrixRain || visualizerState.matrixRain.columns !== Math.floor(width / 16)) {
        this.init(width, height);
      }
      const state = visualizerState.matrixRain;

      // Dunklerer Hintergrund für längere Trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `bold ${state.fontSize}px monospace`;
      const baseHsl = hexToHsl(color);

      // NUR nutzbaren Frequenzbereich verwenden
      const maxFreqIndex = Math.floor(bufferLength * 0.21);

      // Globale Bass-Energie für Intensität
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;

      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < state.columns; i++) {
          // Frequenz-Mapping auf nutzbaren Bereich mit Wiederholung
          const freqPos = (i % Math.floor(state.columns / 3)) / (state.columns / 3);
          const freqIndex = Math.floor(freqPos * maxFreqIndex);
          const amplitude = (dataArray[freqIndex] || 0) / 255;

          const x = i * state.fontSize;
          const y = state.drops[i] * state.fontSize;

          // Mehrere Zeichen pro Spalte für Trail-Effekt
          const trailLength = Math.floor(5 + amplitude * 15);
          for (let t = 0; t < trailLength; t++) {
            const trailY = y - t * state.fontSize;
            if (trailY < 0 || trailY > height) continue;

            const trailFade = 1 - (t / trailLength);
            const charIndex = (Math.floor(state.drops[i]) + t) % state.chars[i].length;
            const text = state.chars[i][charIndex];

            if (t === 0) {
              // Kopf: IMMER hell und sichtbar
              ctx.fillStyle = `hsla(${baseHsl.h}, 100%, 90%, ${0.9 + bassEnergy * 0.1})`;
              ctx.shadowColor = `hsl(${baseHsl.h}, 100%, 70%)`;
              ctx.shadowBlur = 15 + bassEnergy * 10;
            } else {
              // Trail: Helligkeit basierend auf Audio
              const lightness = 40 + amplitude * 40 + trailFade * 20;
              ctx.fillStyle = `hsla(${baseHsl.h}, ${baseHsl.s}%, ${lightness}%, ${trailFade * (0.6 + amplitude * 0.4)})`;
              ctx.shadowBlur = 0;
            }

            ctx.fillText(text, x, trailY);
          }

          // Glitzer bei hoher Amplitude
          if (amplitude > 0.5 && Math.random() > 0.9) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 20;
            ctx.fillText(state.chars[i][0], x, y);
          }

          ctx.shadowBlur = 0;

          // Reset wenn unten angekommen
          if (y > height + trailLength * state.fontSize) {
            state.drops[i] = Math.random() * -20;
            // Neue zufällige Zeichen
            state.chars[i] = Array.from({ length: 30 }, () =>
              String.fromCharCode(0x30A0 + Math.random() * 96));
          }

          // Geschwindigkeit basierend auf Audio
          state.drops[i] += state.speeds[i] * (0.8 + amplitude * 2 + bassEnergy * 1.5) * intensity;
        }
      });
    }
  },
  mirroredBars: {
    name_de: "Gespiegelte Balken (Multi-Band-Boost)",
    name_en: "Mirrored Bars (Multi-Band Boost)",
    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      const numBars = 64;
      const barWidth = w / numBars;
      const centerX = w / 2;
      const centerY = h / 2;
      const baseHsl = hexToHsl(color);
      if (visualizerState.smoothedMirroredBars.length !== numBars) {
        visualizerState.smoothedMirroredBars = new Array(numBars).fill(0);
      }
      for (let i = 0; i < numBars / 2; i++) {
        const dynamicGain = calculateDynamicGain(i, numBars);
        const [s, e] = rangeForBar(i, numBars, bufferLength);
        const targetHeight = (averageRange(dataArray, s, e) / 255) * (h / 2) * dynamicGain * intensity;
        const smoothingFactor = getFrequencyBasedSmoothing(i, numBars, CONSTANTS.SMOOTHING_BASE);
        visualizerState.smoothedMirroredBars[i] = applySmoothValue(visualizerState.smoothedMirroredBars[i] || 0, targetHeight, smoothingFactor);
        const xLeft = centerX - (i + 1) * barWidth;
        const xRight = centerX + i * barWidth;
        const hue = (baseHsl.h + (i / (numBars / 2)) * 90) % 360;
        ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${baseHsl.l}%)`;
        const currentHeight = visualizerState.smoothedMirroredBars[i];
        ctx.fillRect(xLeft, centerY - currentHeight, barWidth * 0.9, currentHeight);
        ctx.fillRect(xLeft, centerY, barWidth * 0.9, currentHeight);
        ctx.fillRect(xRight, centerY - currentHeight, barWidth * 0.9, currentHeight);
        ctx.fillRect(xRight, centerY, barWidth * 0.9, currentHeight);
      }
    }
  },
  radialBars: {
    name_de: "Radiale Balken",
    name_en: "Radial Bars",
    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      const numBars = 64; // Voller Kreis
      const centerX = w / 2;
      const centerY = h / 2;
      const maxRadius = Math.min(w, h) / 2 * 0.85;
      const minRadius = 40; // Fester Innenradius
      const baseHsl = hexToHsl(color);
      const maxFreqIndex = Math.floor(bufferLength * 0.21);

      if (!visualizerState.smoothedRadialBars || visualizerState.smoothedRadialBars.length !== numBars) {
        visualizerState.smoothedRadialBars = new Array(numBars).fill(0);
      }

      const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

      withSafeCanvasState(ctx, () => {
        // Zentrum-Glow
        const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, minRadius * 2);
        glowGradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 70%, ${0.3 + overallEnergy * 0.5})`);
        glowGradient.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
        ctx.beginPath();
        ctx.arc(centerX, centerY, minRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        for (let i = 0; i < numBars; i++) {
          // ✅ ALLE Balken bekommen Daten durch Wiederholung des Frequenzbereichs
          const freqPos = (i % (numBars / 2)) / (numBars / 2); // 0-1, wiederholt sich
          const freqIndex = Math.floor(freqPos * maxFreqIndex);
          const sampleSize = Math.max(2, Math.floor(maxFreqIndex / (numBars / 2)));
          const rawAmplitude = averageRange(dataArray, freqIndex, Math.min(maxFreqIndex, freqIndex + sampleSize)) / 255;

          // ✅ FIX: IMMER sichtbare Balken - Mindestlänge 30% + Audio
          const minLength = (maxRadius - minRadius) * 0.3;
          const audioLength = rawAmplitude * (maxRadius - minRadius) * 0.7 * 1.5;
          const targetLength = (minLength + audioLength) * intensity;

          // Schnelleres Smoothing
          visualizerState.smoothedRadialBars[i] = visualizerState.smoothedRadialBars[i] * 0.6 + targetLength * 0.4;

          const barLength = visualizerState.smoothedRadialBars[i];
          const angle = (i / numBars) * 2 * Math.PI - Math.PI / 2;

          const startX = centerX + Math.cos(angle) * minRadius;
          const startY = centerY + Math.sin(angle) * minRadius;
          const endX = centerX + Math.cos(angle) * (minRadius + barLength);
          const endY = centerY + Math.sin(angle) * (minRadius + barLength);

          const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
          const hue = (baseHsl.h + (i / numBars) * 360) % 360; // Voller Regenbogen
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
  },
  vibratingCubes: {
    name_de: "Vibrierende Würfel (High-Freq-Shimmer)",
    name_en: "Vibrating Cubes (High-Freq Shimmer)",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      // OPTIMIERT: Nutze nur 21% der Frequenzen wie bei bars
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const numCubes = Math.min(32, maxFreqIndex);

      const overallGain = 0.7; // Reduziert von 1.2 auf 0.7 für optimale Höhe
      const cubeSpacing = width / (numCubes + 1);
      const maxCubeHeight = height * 0.7;
      const baseLine = height * 0.85;
      const baseHsl = hexToHsl(color);

      for (let i = 0; i < numCubes; i++) {
        // LINEARE Verteilung über nutzbaren Frequenzbereich
        const freqPerCube = maxFreqIndex / numCubes;
        const s = Math.floor(i * freqPerCube);
        const e = Math.max(s + 1, Math.floor((i + 1) * freqPerCube));

        const baseAmplitude = averageRange(dataArray, s, e) / 255;
        const dynamicGain = calculateDynamicGain(i, numCubes, { bassGain: 1.0, lowMidGain: 1.3, highMidGain: 1.8, highGain: 2.8, ultraHighGain: 4.5 });
        const amplitude = baseAmplitude * dynamicGain * overallGain * intensity;
        const cubeHeight = amplitude * maxCubeHeight;
        if (cubeHeight < 1) continue;
        const x = cubeSpacing * (i + 1);
        const y = baseLine;
        const cubeWidth = cubeSpacing * 0.7;
        const normalizedPos = i / numCubes;
        const hue = (baseHsl.h + normalizedPos * 90) % 360;
        const saturation = baseHsl.s;
        const lightness = baseHsl.l;
        const topColor = `hsl(${hue}, ${saturation}%, ${Math.min(80, lightness + 15)}%)`;
        const sideColor1 = `hsl(${hue}, ${Math.max(50, saturation - 10)}%, ${lightness}%)`;
        const sideColor2 = `hsl(${hue}, ${Math.max(40, saturation - 20)}%, ${Math.max(20, lightness - 15)}%)`;
        withSafeCanvasState(ctx, () => {
          ctx.translate(x, y);
          if (normalizedPos > 0.6) {
            ctx.translate((Math.random() - 0.5) * amplitude * 5, (Math.random() - 0.5) * amplitude * 5);
          }
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-cubeWidth / 2, -cubeWidth / 4); ctx.lineTo(-cubeWidth / 2, -cubeWidth / 4 - cubeHeight); ctx.lineTo(0, -cubeHeight); ctx.closePath(); ctx.fillStyle = sideColor2; ctx.fill();
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cubeWidth / 2, -cubeWidth / 4); ctx.lineTo(cubeWidth / 2, -cubeWidth / 4 - cubeHeight); ctx.lineTo(0, -cubeHeight); ctx.closePath(); ctx.fillStyle = sideColor1; ctx.fill();
          ctx.beginPath(); ctx.moveTo(0, -cubeHeight); ctx.lineTo(cubeWidth / 2, -cubeWidth / 4 - cubeHeight); ctx.lineTo(0, -cubeWidth / 2 - cubeHeight); ctx.lineTo(-cubeWidth / 2, -cubeWidth / 4 - cubeHeight); ctx.closePath(); ctx.fillStyle = topColor; ctx.fill();
          if (normalizedPos > 0.7 && amplitude > 0.4) {
            ctx.shadowColor = normalizedPos > 0.85 ? '#ffffff' : topColor;
            ctx.shadowBlur = amplitude * 20 * intensity;
            ctx.fill();
          }
        });
      }
    }
  },
  waveform: {
    name_de: 'Wellenform (Frequenz-Enhanced)',
    name_en: 'Waveform (Frequency-Enhanced)',
    needsTimeData: true,
    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      const baseHsl = hexToHsl(color);
      const centerY = h / 2;

      // Gesamtenergie für Effekte
      const totalEnergy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.3)) / 255;

      // Trail-Effekt
      ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + totalEnergy * 0.1})`;
      ctx.fillRect(0, 0, w, h);

      // Mittellinie
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.strokeStyle = `hsla(${baseHsl.h}, 50%, 30%, 0.3)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      withSafeCanvasState(ctx, () => {
        // Gefüllte Welle nach oben
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

        // Gradient-Fill
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 60%, ${0.4 + totalEnergy * 0.3})`);
        gradient.addColorStop(0.5, `hsla(${baseHsl.h}, 100%, 40%, ${0.2 + totalEnergy * 0.2})`);
        gradient.addColorStop(1, `hsla(${(baseHsl.h + 40) % 360}, 100%, 60%, ${0.4 + totalEnergy * 0.3})`);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Leuchtende Oberkante
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

        // Gespiegelte Welle (subtiler)
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        for (let i = 0; i < bufferLength; i++) {
          const v = (dataArray[i] / 128.0) - 1.0;
          const x = i * sliceWidth;
          const y = centerY - v * (h / 3); // Gespiegelt und kleiner
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${(baseHsl.h + 30) % 360}, 80%, 60%, ${0.3 + totalEnergy * 0.2})`;
        ctx.lineWidth = (2 + totalEnergy * 3) * intensity;
        ctx.stroke();
      });
    }
  },
  circles: {
    name_de: 'Konzentrische Kreise',
    name_en: 'Concentric Circles',
    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      const maxR = Math.min(w, h) / 2 * 0.85;
      const minR = 20; // Mindestradius
      const numCircles = 16; // Weniger Kreise, aber alle sichtbar
      const baseHsl = hexToHsl(color);
      const maxFreqIndex = Math.floor(bufferLength * 0.21); // ✅ Nur nutzbarer Bereich
      const centerX = w / 2;
      const centerY = h / 2;

      if (!visualizerState.smoothedCircles || visualizerState.smoothedCircles.length !== numCircles) {
        visualizerState.smoothedCircles = new Array(numCircles).fill(minR);
      }

      // Gesamtenergie für Pulsation
      const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

      withSafeCanvasState(ctx, () => {
        // Hintergrund-Glow
        const bgGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxR);
        bgGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 50%, ${overallEnergy * 0.15})`);
        bgGlow.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxR, 0, Math.PI * 2);
        ctx.fillStyle = bgGlow;
        ctx.fill();

        // Kreise von außen nach innen zeichnen
        for (let i = numCircles - 1; i >= 0; i--) {
          // ✅ FIX: Frequenzen auf nutzbaren Bereich mappen
          const freqIndex = Math.floor((i / numCircles) * maxFreqIndex);
          const sampleSize = Math.max(2, Math.floor(maxFreqIndex / numCircles));
          const amplitude = averageRange(dataArray, freqIndex, Math.min(maxFreqIndex, freqIndex + sampleSize)) / 255;

          // Basis-Radius + Audio-Modulation
          const baseRadius = minR + (i / numCircles) * (maxR - minR);
          const audioBoost = amplitude * 50 * intensity;
          const targetRadius = baseRadius + audioBoost;

          // Smoothing
          visualizerState.smoothedCircles[i] = visualizerState.smoothedCircles[i] * 0.7 + targetRadius * 0.3;
          const radius = visualizerState.smoothedCircles[i];

          const normalizedPos = i / numCircles;
          const hue = (baseHsl.h + normalizedPos * 60) % 360;

          // Dickere Linien, abhängig von Amplitude
          ctx.lineWidth = (3 + amplitude * 6) * intensity;

          // Glow bei hoher Amplitude
          if (amplitude > 0.4) {
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            ctx.shadowBlur = 10 + amplitude * 15;
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.strokeStyle = `hsla(${hue}, ${baseHsl.s}%, ${Math.min(80, baseHsl.l + amplitude * 20)}%, ${0.6 + amplitude * 0.4})`;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      });
    }
  },
  fluidWaves: {
    name_de: "Fließende Wellen",
    name_en: "Fluid Waves",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const numWaves = 6;
      const baseHsl = hexToHsl(color);
      const maxFreqIndex = Math.floor(bufferLength * 0.21); // ✅ Nur nutzbarer Bereich
      const points = 60;
      const time = Date.now() * 0.002;

      if (!visualizerState.smoothedFluidWaves || visualizerState.smoothedFluidWaves.length !== numWaves) {
        visualizerState.smoothedFluidWaves = Array.from({ length: numWaves }, () => new Array(points + 1).fill(0));
      }

      // Gesamtenergie für Dynamik
      const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;

      withSafeCanvasState(ctx, () => {
        // Wellen von hinten nach vorne zeichnen
        for (let wave = numWaves - 1; wave >= 0; wave--) {
          const waveProgress = wave / numWaves;
          const baseY = height * (0.3 + waveProgress * 0.5); // Wellen verteilt über 30-80% der Höhe
          const waveHeight = height * 0.25; // Maximale Wellenhöhe

          ctx.beginPath();
          ctx.moveTo(0, height);

          for (let i = 0; i <= points; i++) {
            const x = (i / points) * width;

            // ✅ FIX: Frequenzen auf nutzbaren Bereich mappen
            const freqIndex = Math.floor((i / points) * maxFreqIndex);
            const rawAmplitude = dataArray[freqIndex] / 255;

            // ✅ FIX: Größere Amplitude + Basis-Bewegung
            const baseWave = Math.sin(x * 0.008 + time + wave * 1.2) * (20 + overallEnergy * 30);
            const audioWave = rawAmplitude * waveHeight * 1.5;
            const targetY = baseY - baseWave - audioWave;

            // Schnelleres Smoothing
            visualizerState.smoothedFluidWaves[wave][i] =
              visualizerState.smoothedFluidWaves[wave][i] * 0.6 + targetY * 0.4;

            ctx.lineTo(x, visualizerState.smoothedFluidWaves[wave][i]);
          }

          ctx.lineTo(width, height);
          ctx.closePath();

          // ✅ FIX: VIEL hellere Farben mit Gradient
          const hue = (baseHsl.h + wave * 25) % 360;
          const gradient = ctx.createLinearGradient(0, baseY - waveHeight, 0, height);
          gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${0.7 + bassEnergy * 0.3})`);
          gradient.addColorStop(0.5, `hsla(${hue}, ${baseHsl.s}%, ${Math.min(70, baseHsl.l + 20)}%, ${0.5 + overallEnergy * 0.3})`);
          gradient.addColorStop(1, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 0.3)`);

          ctx.fillStyle = gradient;
          ctx.fill();

          // Leuchtende Oberkante
          ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${0.6 + bassEnergy * 0.4})`;
          ctx.lineWidth = (2 + bassEnergy * 3) * intensity;
          ctx.beginPath();
          for (let i = 0; i <= points; i++) {
            const x = (i / points) * width;
            if (i === 0) {
              ctx.moveTo(x, visualizerState.smoothedFluidWaves[wave][i]);
            } else {
              ctx.lineTo(x, visualizerState.smoothedFluidWaves[wave][i]);
            }
          }
          ctx.stroke();
        }
      });
    }
  },
  spiralGalaxy: {
    name_de: "Spiral-Galaxie",
    name_en: "Spiral Galaxy",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) / 2 * 0.9;
      const arms = 4;
      const pointsPerArm = 40; // ✅ FIX: Weniger Punkte, aber alle sichtbar
      const baseHsl = hexToHsl(color);
      const maxFreqIndex = Math.floor(bufferLength * 0.21); // ✅ Nur nutzbarer Bereich
      const totalPoints = arms * pointsPerArm;

      if (!visualizerState.smoothedSpiralGalaxy || visualizerState.smoothedSpiralGalaxy.length !== totalPoints) {
        visualizerState.smoothedSpiralGalaxy = new Array(totalPoints).fill(0.3);
      }

      // Gesamtenergie für Rotation und Glow
      const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;
      const rotationSpeed = 0.0003 + overallEnergy * 0.0005;
      const time = Date.now() * rotationSpeed;

      withSafeCanvasState(ctx, () => {
        // Zentrum-Glow
        const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.3);
        centerGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 80%, ${0.4 + overallEnergy * 0.4})`);
        centerGlow.addColorStop(0.5, `hsla(${baseHsl.h}, 100%, 60%, ${0.2 + overallEnergy * 0.2})`);
        centerGlow.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = centerGlow;
        ctx.fill();

        for (let arm = 0; arm < arms; arm++) {
          for (let i = 0; i < pointsPerArm; i++) {
            const globalIndex = arm * pointsPerArm + i;

            // ✅ FIX: Frequenzen auf nutzbaren Bereich mappen
            const freqIndex = Math.floor((i / pointsPerArm) * maxFreqIndex);
            const sampleSize = Math.max(2, Math.floor(maxFreqIndex / pointsPerArm));
            const amplitude = averageRange(dataArray, freqIndex, Math.min(maxFreqIndex, freqIndex + sampleSize)) / 255;

            // Boost für Sichtbarkeit
            const boostedAmplitude = Math.max(0.25, amplitude * 1.5);
            const targetIntensity = boostedAmplitude * intensity;

            // Smoothing
            visualizerState.smoothedSpiralGalaxy[globalIndex] =
              visualizerState.smoothedSpiralGalaxy[globalIndex] * 0.7 + targetIntensity * 0.3;
            const currentIntensity = visualizerState.smoothedSpiralGalaxy[globalIndex];

            const t = i / pointsPerArm;
            // ✅ FIX: Mindest-Radius, damit Spirale immer sichtbar
            const radius = 30 + t * (maxRadius - 30) * (0.5 + currentIntensity * 0.5);

            // Spiralwinkel mit Rotation
            const spiralTightness = 3; // Weniger eng
            const angle = arm * (2 * Math.PI / arms) + t * spiralTightness * Math.PI + time;

            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            // ✅ FIX: Größere Punkte
            const baseSize = 3 + t * 4; // Größer am Rand
            const size = (baseSize + currentIntensity * 8) * intensity;

            const hue = (baseHsl.h + t * 60 + arm * 30) % 360;

            // Glow für größere Punkte
            if (currentIntensity > 0.4) {
              ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
              ctx.shadowBlur = 8 + currentIntensity * 12;
            }

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${Math.min(80, baseHsl.l + currentIntensity * 20)}%, ${0.6 + currentIntensity * 0.4})`;
            ctx.fill();
          }
        }
        ctx.shadowBlur = 0;
      });
    }
  },
  bloomingMandala: {
    name_de: "Blühendes Mandala",
    name_en: "Blooming Mandala",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const centerX = width / 2;
      const centerY = height / 2;
      const numSegments = 24; // Mehr Petalen für volleren Kreis
      const baseHsl = hexToHsl(color);
      const maxFreqIndex = Math.floor(bufferLength * 0.21); // Nur nutzbaren Bereich

      withSafeCanvasState(ctx, () => {
        ctx.translate(centerX, centerY);

        // Gesamtenergie für Basis-Pulsation
        const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

        for (let i = 0; i < numSegments; i++) {
          const angle = (i / numSegments) * Math.PI * 2;
          ctx.save();
          ctx.rotate(angle);

          // Frequenz-Mapping auf nutzbaren Bereich
          const freqIndex = Math.floor((i / numSegments) * maxFreqIndex);
          const amplitude = (dataArray[freqIndex] / 255) * 1.5 + 0.3; // Mindest-Amplitude

          // Größere, gefüllte Petalen
          const petalLength = (80 + amplitude * (Math.min(width, height) * 0.35)) * intensity;
          const petalWidth = (20 + overallEnergy * 60) * intensity;
          const hue = (baseHsl.h + i * (360 / numSegments)) % 360;

          // Gefüllte Petale
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(
            petalWidth, petalLength * 0.4,
            petalWidth * 0.5, petalLength * 0.8,
            0, petalLength
          );
          ctx.bezierCurveTo(
            -petalWidth * 0.5, petalLength * 0.8,
            -petalWidth, petalLength * 0.4,
            0, 0
          );

          // Gradient-Füllung
          const gradient = ctx.createLinearGradient(0, 0, 0, petalLength);
          gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 0.9)`);
          gradient.addColorStop(0.5, `hsla(${hue}, ${baseHsl.s}%, ${Math.min(80, baseHsl.l + 20)}%, 0.7)`);
          gradient.addColorStop(1, `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 0.3)`);
          ctx.fillStyle = gradient;
          ctx.fill();

          // Leuchtender Rand
          ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.5 + amplitude * 0.5})`;
          ctx.lineWidth = (2 + amplitude * 3) * intensity;
          ctx.stroke();

          ctx.restore();
        }

        // Zentrum-Glow
        const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 50 * intensity);
        centerGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 80%, ${0.8 + overallEnergy * 0.2})`);
        centerGlow.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
        ctx.beginPath();
        ctx.arc(0, 0, 50 * intensity, 0, Math.PI * 2);
        ctx.fillStyle = centerGlow;
        ctx.fill();
      });
    }
  },
  rippleEffect: {
    name_de: "Wellen-Effekt (High-Freq-Bursts)",
    name_en: "Ripple Effect (High-Freq Bursts)",
    init() {
      visualizerState.ripples = [];
      visualizerState.rippleTime = 0;
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.ripples) this.init();

      const baseHsl = hexToHsl(color);
      const maxFreqIndex = Math.floor(bufferLength * 0.21);

      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
      const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

      // Animierter Hintergrund
      visualizerState.rippleTime = (visualizerState.rippleTime || 0) + 0.02;
      const time = visualizerState.rippleTime;

      // Dynamischer Gradient-Hintergrund
      ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + bassEnergy * 0.05})`;
      ctx.fillRect(0, 0, width, height);

      // Hintergrund-Pulse bei Bass
      if (bassEnergy > 0.3) {
        const pulseGradient = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, Math.max(width, height) * 0.6
        );
        pulseGradient.addColorStop(0, `hsla(${baseHsl.h}, 80%, 30%, ${bassEnergy * 0.2})`);
        pulseGradient.addColorStop(0.5, `hsla(${(baseHsl.h + 30) % 360}, 70%, 20%, ${bassEnergy * 0.1})`);
        pulseGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = pulseGradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Mehr Ripples basierend auf verschiedenen Frequenzbereichen
      const energyTypes = [
        { energy: bassEnergy, threshold: 0.25, size: 200, speed: 4, hueShift: 0 },
        { energy: midEnergy, threshold: 0.2, size: 150, speed: 5, hueShift: 30 },
        { energy: highEnergy, threshold: 0.15, size: 100, speed: 6, hueShift: 60 }
      ];

      energyTypes.forEach(({ energy, threshold, size, speed, hueShift }) => {
        if (energy > threshold && Math.random() < 0.5 * intensity && visualizerState.ripples.length < 30) {
          visualizerState.ripples.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: 0,
            maxRadius: (size * 0.5 + energy * size) * intensity,
            hue: (baseHsl.h + hueShift + Math.random() * 40) % 360,
            alpha: 1,
            speed: (speed + energy * 4) * intensity,
            thickness: 3 + energy * 5
          });
        }
      });

      withSafeCanvasState(ctx, () => {
        // Ripples zeichnen
        for (let i = visualizerState.ripples.length - 1; i >= 0; i--) {
          const r = visualizerState.ripples[i];
          r.radius += r.speed;
          const progress = r.radius / r.maxRadius;
          r.alpha = 1 - progress;

          if (r.alpha <= 0) {
            visualizerState.ripples.splice(i, 1);
            continue;
          }

          // Mehrere Ringe pro Ripple
          const rings = 2;
          for (let ring = 0; ring < rings; ring++) {
            const ringRadius = r.radius - ring * 20;
            if (ringRadius > 0) {
              ctx.beginPath();
              ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2);

              const ringAlpha = r.alpha * (1 - ring * 0.4);
              const lightness = 50 + (1 - progress) * 30;
              ctx.strokeStyle = `hsla(${r.hue}, 100%, ${lightness}%, ${ringAlpha})`;
              ctx.lineWidth = (r.thickness || 4) * (1 - ring * 0.3) * (1 - progress * 0.5);

              // Glow bei neuen Ripples
              if (progress < 0.3) {
                ctx.shadowColor = `hsl(${r.hue}, 100%, 60%)`;
                ctx.shadowBlur = 15 * (1 - progress * 3);
              }
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
          }

          // Zentraler Punkt bei neuen Ripples
          if (progress < 0.2) {
            ctx.beginPath();
            ctx.arc(r.x, r.y, 5 * (1 - progress * 5), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${r.hue}, 100%, 80%, ${1 - progress * 5})`;
            ctx.fill();
          }
        }
      });

      // Schwebende Partikel im Hintergrund
      const numParticles = 20;
      for (let i = 0; i < numParticles; i++) {
        const px = (Math.sin(time + i * 0.5) * 0.5 + 0.5) * width;
        const py = (Math.cos(time * 0.7 + i * 0.3) * 0.5 + 0.5) * height;
        const size = 2 + Math.sin(time * 2 + i) * 1 + midEnergy * 3;

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(baseHsl.h + i * 10) % 360}, 80%, 60%, ${0.2 + midEnergy * 0.3})`;
        ctx.fill();
      }
    }
  },
  networkPlexus: {
    name_de: "Netzwerk-Plexus",
    name_en: "Network Plexus",
    init(width, height) {
      const numParticles = Math.floor(width / 15); // Mehr Partikel
      visualizerState.networkPlexus = { particles: [], pulsePhase: 0 };
      for (let i = 0; i < numParticles; i++) {
        visualizerState.networkPlexus.particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 3, // 3x schnellere Basis
          vy: (Math.random() - 0.5) * 3,
          baseRadius: 3 + Math.random() * 4,
          hueOffset: Math.random() * 40
        });
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.networkPlexus || visualizerState.networkPlexus.particles.length === 0) {
        this.init(width, height);
      }
      const state = visualizerState.networkPlexus;
      const baseHsl = hexToHsl(color);

      // Nutzbarer Frequenzbereich
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
      const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

      // Puls-Phase für Welleneffekt
      state.pulsePhase += 0.05 + bassEnergy * 0.1;

      // Leichter Trail
      ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + bassEnergy * 0.05})`;
      ctx.fillRect(0, 0, width, height);

      // Geschwindigkeits-Multiplikator basierend auf Audio
      const speedMult = 1 + bassEnergy * 3 + midEnergy * 2;

      state.particles.forEach((p, index) => {
        // Audio-reaktive Bewegung
        p.x += p.vx * speedMult * intensity;
        p.y += p.vy * speedMult * intensity;

        // Bounce mit etwas Chaos
        if (p.x < 0 || p.x > width) {
          p.vx *= -1;
          p.vx += (Math.random() - 0.5) * bassEnergy * 2;
        }
        if (p.y < 0 || p.y > height) {
          p.vy *= -1;
          p.vy += (Math.random() - 0.5) * bassEnergy * 2;
        }

        // Pulsierender Radius
        const pulse = Math.sin(state.pulsePhase + index * 0.1) * 0.3 + 1;
        const radius = p.baseRadius * pulse * (1 + bassEnergy * 1.5) * intensity;

        // Leuchtende Knoten
        const hue = (baseHsl.h + p.hueOffset + midEnergy * 30) % 360;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${0.9 + highEnergy * 0.1})`);
        gradient.addColorStop(0.5, `hsla(${hue}, 90%, 60%, 0.5)`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Heller Kern
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 90%, 0.9)`;
        ctx.fill();
      });

      // Verbindungslinien - mit Glow bei hoher Energie
      const connectDistance = width / 6 + bassEnergy * 50;
      withSafeCanvasState(ctx, () => {
        ctx.lineWidth = (1 + midEnergy * 2) * intensity;

        for (let i = 0; i < state.particles.length; i++) {
          for (let j = i + 1; j < state.particles.length; j++) {
            const dx = state.particles[i].x - state.particles[j].x;
            const dy = state.particles[i].y - state.particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < connectDistance) {
              const alpha = (1 - dist / connectDistance) * (0.4 + midEnergy * 0.4);
              const hue = (baseHsl.h + (i + j) * 2) % 360;

              ctx.beginPath();
              ctx.moveTo(state.particles[i].x, state.particles[i].y);
              ctx.lineTo(state.particles[j].x, state.particles[j].y);
              ctx.strokeStyle = `hsla(${hue}, 100%, ${60 + highEnergy * 30}%, ${alpha})`;
              ctx.stroke();
            }
          }
        }
      });
    }
  },
  waveformHorizon: {
    name_de: "Wellenform-Horizont",
    name_en: "Waveform Horizon",
    needsTimeData: true,
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const numLines = 40; // Mehr Linien für dichteres Bild
      const horizon = height * 0.4; // Etwas höher für mehr Platz
      const baseHsl = hexToHsl(color);

      // Bass-Energie für globales "Beben"
      const bassEnergy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.15)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(bufferLength * 0.15), Math.floor(bufferLength * 0.4)) / 255;

      // Globaler Shake basierend auf Bass
      const shakeX = (Math.random() - 0.5) * bassEnergy * 15 * intensity;
      const shakeY = (Math.random() - 0.5) * bassEnergy * 10 * intensity;

      withSafeCanvasState(ctx, () => {
        ctx.translate(shakeX, shakeY); // Erdbeben-Shake!

        for (let i = 0; i < numLines; i++) {
          const progress = i / numLines;
          const yOffset = horizon + (progress * progress) * (height * 0.6);
          const perspective = 1 - progress;

          ctx.beginPath();
          ctx.moveTo(0, yOffset);

          // Weniger Punkte für Performance, aber größere Amplitude
          const sampleStep = Math.max(1, Math.floor(bufferLength / 200));
          const sliceWidth = width / (bufferLength / sampleStep);

          for (let j = 0; j < bufferLength; j += sampleStep) {
            // VIEL größere Amplitude! 3x statt 0.5x + Bass-Boost
            const amplitude = (dataArray[j] - 128) * 3.0 * perspective;
            const bassBoost = 1 + bassEnergy * 2; // Extra Boost bei Bass
            const finalY = yOffset + amplitude * bassBoost * (0.5 + progress * 2) * intensity;
            ctx.lineTo((j / sampleStep) * sliceWidth, finalY);
          }

          // VIEL hellere Farben
          const hue = (baseHsl.h + progress * 60 + bassEnergy * 30) % 360;
          const lightness = 50 + perspective * 40 + midEnergy * 10; // 50-100% statt 20-70%
          ctx.strokeStyle = `hsla(${hue}, ${Math.min(100, baseHsl.s + 20)}%, ${lightness}%, ${0.6 + perspective * 0.4})`;
          ctx.lineWidth = (2 + perspective * 4) * intensity; // Dickere Linien
          ctx.stroke();
        }

        // Leuchtender Horizont-Effekt bei starkem Bass
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
  },
  particleStorm: {
    name_de: "Partikel-Sturm",
    name_en: "Particle Storm",
    init(width, height) {
      visualizerState.particleStorm = { particles: [], fov: width * 0.8 };
      for (let i = 0; i < 350; i++) {
        visualizerState.particleStorm.particles.push({
          x: (Math.random() - 0.5) * width * 1.5,
          y: (Math.random() - 0.5) * height * 1.5,
          z: Math.random() * 1500,
          size: 1 + Math.random() * 3,
          hueOffset: Math.random() * 60
        });
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.particleStorm) this.init(width, height);
      const state = visualizerState.particleStorm;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseHsl = hexToHsl(color);

      // Nutzbarer Frequenzbereich
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
      const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

      // VIEL schnellere Basis-Geschwindigkeit + Audio-Boost
      const speed = (15 + bassEnergy * 50) * intensity;

      // Leichter Trail-Effekt
      ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + bassEnergy * 0.1})`;
      ctx.fillRect(0, 0, width, height);

      // Zentrales Glow bei Bass
      if (bassEnergy > 0.3) {
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200);
        gradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 60%, ${bassEnergy * 0.3})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      state.particles.forEach((p, index) => {
        // Schnellere Z-Bewegung
        p.z -= speed;

        // Seitliche Bewegung basierend auf Frequenz
        const freqIndex = Math.floor((index / state.particles.length) * maxFreqIndex);
        const freq = (dataArray[freqIndex] || 0) / 255;
        p.x += (Math.random() - 0.5) * freq * 5;
        p.y += (Math.random() - 0.5) * freq * 5;

        if (p.z <= 0) {
          p.x = (Math.random() - 0.5) * width * 1.5;
          p.y = (Math.random() - 0.5) * height * 1.5;
          p.z = 1500;
        }

        const scale = state.fov / (state.fov + p.z);
        const screenX = centerX + p.x * scale;
        const screenY = centerY + p.y * scale;
        const depth = 1 - p.z / 1500;

        // Größere Partikel vorne
        const radius = depth * p.size * 4 * intensity;

        if (screenX > -50 && screenX < width + 50 && screenY > -50 && screenY < height + 50 && radius > 0.5) {
          // Streak/Trail-Effekt für schnelle Partikel
          const streakLength = Math.min(speed * depth * 0.5, 30);
          const hue = (baseHsl.h + p.hueOffset + midEnergy * 40) % 360;

          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(screenX, screenY + streakLength);
          ctx.strokeStyle = `hsla(${hue}, 100%, ${60 + highEnergy * 30}%, ${depth * 0.7})`;
          ctx.lineWidth = radius * 0.8;
          ctx.stroke();

          // Leuchtender Kopf
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 100%, ${70 + depth * 25}%, ${depth * 0.9})`;
          ctx.fill();
        }
      });
    }
  },
  frequencyBlossoms: {
    name_de: "Frequenz-Blüten (Dynamischer Beat)",
    name_en: "Frequency Blossoms (Dynamic Beat)",
    init(width, height) {
      visualizerState.freqBlossom = {
        rotation: 0,
        smoothedEnergy: 0,
        petalLengths: new Array(24).fill(0)
      };
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.freqBlossom) this.init(width, height);
      const state = visualizerState.freqBlossom;
      const baseHsl = hexToHsl(color);
      const centerX = width / 2;
      const centerY = height / 2;

      // Nutzbarer Frequenzbereich
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

      // Smoothed Energy für Pulsation
      state.smoothedEnergy = state.smoothedEnergy * 0.85 + bassEnergy * 0.15;

      // Kontinuierliche Rotation
      state.rotation += 0.01 + bassEnergy * 0.03;

      // Trail
      ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + bassEnergy * 0.04})`;
      ctx.fillRect(0, 0, width, height);

      const numPetals = 24;
      const baseRadius = Math.min(width, height) * 0.15;
      const maxRadius = Math.min(width, height) * 0.4;

      withSafeCanvasState(ctx, () => {
        ctx.translate(centerX, centerY);
        ctx.rotate(state.rotation);

        // Äußerer Glow
        const glowRadius = baseRadius + state.smoothedEnergy * maxRadius * 0.5;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius * 1.5);
        glow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 60%, ${0.3 + bassEnergy * 0.3})`);
        glow.addColorStop(0.5, `hsla(${(baseHsl.h + 30) % 360}, 100%, 50%, ${0.1 + bassEnergy * 0.2})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Blütenblätter - IMMER sichtbar
        for (let p = 0; p < numPetals; p++) {
          const freqIndex = Math.floor((p / numPetals) * maxFreqIndex);
          const amplitude = (dataArray[freqIndex] || 0) / 255;

          // Smooth petal length
          const targetLength = baseRadius + amplitude * (maxRadius - baseRadius);
          state.petalLengths[p] = state.petalLengths[p] * 0.7 + targetLength * 0.3;

          const angle = (p / numPetals) * Math.PI * 2;
          const length = state.petalLengths[p] * intensity;

          // Kurvige Blütenblätter
          const x1 = Math.cos(angle) * length;
          const y1 = Math.sin(angle) * length;
          const cp1x = Math.cos(angle + 0.2) * length * 0.6;
          const cp1y = Math.sin(angle + 0.2) * length * 0.6;
          const cp2x = Math.cos(angle - 0.2) * length * 0.6;
          const cp2y = Math.sin(angle - 0.2) * length * 0.6;

          const hue = (baseHsl.h + p * (360 / numPetals) + midEnergy * 30) % 360;

          // Gefülltes Blütenblatt
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(cp1x, cp1y, x1, y1);
          ctx.quadraticCurveTo(cp2x, cp2y, 0, 0);

          const petalGradient = ctx.createLinearGradient(0, 0, x1, y1);
          petalGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.3)`);
          petalGradient.addColorStop(0.7, `hsla(${hue}, 100%, 60%, ${0.4 + amplitude * 0.4})`);
          petalGradient.addColorStop(1, `hsla(${hue}, 100%, 80%, ${0.6 + amplitude * 0.4})`);
          ctx.fillStyle = petalGradient;
          ctx.fill();

          // Leuchtende Kante
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(cp1x, cp1y, x1, y1);
          ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${0.5 + amplitude * 0.5})`;
          ctx.lineWidth = (2 + amplitude * 4) * intensity;
          ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
          ctx.shadowBlur = 10 + amplitude * 15;
          ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // Zentraler Kern
        const coreRadius = 15 + state.smoothedEnergy * 25;
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
        coreGradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 95%, 1)`);
        coreGradient.addColorStop(0.5, `hsla(${baseHsl.h}, 100%, 70%, 0.8)`);
        coreGradient.addColorStop(1, `hsla(${baseHsl.h}, 100%, 50%, 0)`);
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.fill();
      });
    }
  },
  centralGlowBlossom: {
    name_de: "Zentrale Leuchtblüte (Vibrierend)",
    name_en: "Central Glow Blossom (Vibrating)",
    init(width, height) {
      visualizerState.centralBlossom = {
        rotation: 0,
        pulse: 0,
        rayLengths: new Array(32).fill(0)
      };
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.centralBlossom) this.init(width, height);
      const state = visualizerState.centralBlossom;
      const baseHsl = hexToHsl(color);
      const centerX = width / 2;
      const centerY = height / 2;

      // Nutzbarer Frequenzbereich
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
      const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

      // Kontinuierliche Animation
      state.rotation += 0.005 + midEnergy * 0.02;
      state.pulse += 0.08 + bassEnergy * 0.1;

      // Trail
      ctx.fillStyle = `rgba(0, 0, 0, ${0.06 + bassEnergy * 0.03})`;
      ctx.fillRect(0, 0, width, height);

      const numRays = 32;
      const baseRadius = 50 + Math.sin(state.pulse) * 20;
      const maxRadius = Math.min(width, height) * 0.45;

      withSafeCanvasState(ctx, () => {
        ctx.translate(centerX, centerY);

        // Mehrschichtiger Hintergrund-Glow
        for (let layer = 3; layer >= 0; layer--) {
          const layerRadius = (baseRadius + bassEnergy * 100) * (1 + layer * 0.5);
          const layerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, layerRadius);
          const hue = (baseHsl.h + layer * 20) % 360;
          layerGlow.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.15 - layer * 0.03})`);
          layerGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = layerGlow;
          ctx.beginPath();
          ctx.arc(0, 0, layerRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.rotate(state.rotation);

        // Strahlen - IMMER sichtbar
        for (let r = 0; r < numRays; r++) {
          const freqIndex = Math.floor((r / numRays) * maxFreqIndex);
          const amplitude = (dataArray[freqIndex] || 0) / 255;

          // Vibrierende Länge
          const vibration = Math.sin(state.pulse + r * 0.3) * 0.2;
          const targetLength = baseRadius + (0.3 + amplitude * 0.7 + vibration) * (maxRadius - baseRadius);
          state.rayLengths[r] = state.rayLengths[r] * 0.75 + targetLength * 0.25;

          const angle = (r / numRays) * Math.PI * 2;
          const length = state.rayLengths[r] * intensity;

          const x = Math.cos(angle) * length;
          const y = Math.sin(angle) * length;

          const hue = (baseHsl.h + r * (180 / numRays) + highEnergy * 40) % 360;

          // Strahl mit Glow
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(x, y);

          const rayGradient = ctx.createLinearGradient(0, 0, x, y);
          rayGradient.addColorStop(0, `hsla(${hue}, 100%, 80%, 0.9)`);
          rayGradient.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${0.5 + amplitude * 0.4})`);
          rayGradient.addColorStop(1, `hsla(${hue}, 100%, 70%, ${0.3 + amplitude * 0.5})`);

          ctx.strokeStyle = rayGradient;
          ctx.lineWidth = (3 + amplitude * 6) * intensity;
          ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
          ctx.shadowBlur = 8 + amplitude * 12;
          ctx.stroke();

          // Endpunkt-Partikel
          if (amplitude > 0.3) {
            ctx.beginPath();
            ctx.arc(x, y, 3 + amplitude * 5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 100%, 85%, ${0.5 + amplitude * 0.5})`;
            ctx.fill();
          }
        }

        ctx.shadowBlur = 0;

        // Pulsierender Kern
        const coreSize = 20 + bassEnergy * 30 + Math.sin(state.pulse * 2) * 10;
        const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 2);
        coreGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 100%, 1)`);
        coreGlow.addColorStop(0.3, `hsla(${baseHsl.h}, 100%, 80%, 0.9)`);
        coreGlow.addColorStop(0.7, `hsla(${baseHsl.h}, 100%, 60%, 0.4)`);
        coreGlow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(0, 0, coreSize * 2, 0, Math.PI * 2);
        ctx.fillStyle = coreGlow;
        ctx.fill();
      });
    }
  },
  shardMosaic: {
    name_de: "Scherben-Mosaik",
    name_en: "Shard Mosaic",
    init(width, height) {
      const cols = 20, rows = 12;
      const cellWidth = width / cols, cellHeight = height / rows;
      visualizerState.shardTriangles = [];
      visualizerState.shardMosaic = { lastWidth: width, lastHeight: height };
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p1 = { x: c * cellWidth, y: r * cellHeight }, p2 = { x: (c + 1) * cellWidth, y: r * cellHeight };
          const p3 = { x: c * cellWidth, y: (r + 1) * cellHeight }, p4 = { x: (c + 1) * cellWidth, y: (r + 1) * cellHeight };
          visualizerState.shardTriangles.push({ points: [p1, p2, p3], smoothedVal: 0 });
          visualizerState.shardTriangles.push({ points: [p2, p4, p3], smoothedVal: 0 });
        }
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.shardMosaic || visualizerState.shardTriangles.length === 0 || visualizerState.shardMosaic.lastWidth !== width || visualizerState.shardMosaic.lastHeight !== height) {
        this.init(width, height);
      }
      const baseHsl = hexToHsl(color);
      visualizerState.shardTriangles.forEach((tri) => {
        const centerX = (tri.points[0].x + tri.points[1].x + tri.points[2].x) / 3;
        const normalizedX = centerX / width;
        const [s, e] = rangeForBar(Math.floor(normalizedX * 100), 100, bufferLength);
        const targetVal = averageRange(dataArray, s, e) / 255;
        tri.smoothedVal = applySmoothValue(tri.smoothedVal, targetVal, 0.4);
        if (tri.smoothedVal > CONSTANTS.MIN_VISIBLE_AMPLITUDE) {
          ctx.beginPath(); ctx.moveTo(tri.points[0].x, tri.points[0].y); ctx.lineTo(tri.points[1].x, tri.points[1].y); ctx.lineTo(tri.points[2].x, tri.points[2].y); ctx.closePath();
          ctx.fillStyle = `hsl(${(baseHsl.h + normalizedX * 60) % 360}, ${baseHsl.s}%, ${20 + tri.smoothedVal * 50}%)`;
          ctx.fill();
        }
      });
    }
  },
  neonGrid: {
    name_de: "Neon-Gitter",
    name_en: "Neon Grid",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const baseHsl = hexToHsl(color);

      // Nutzbarer Frequenzbereich
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

      // Dynamischer Horizont
      const horizon = height * 0.35 + bassEnergy * 50 * intensity;
      const vanishingPointX = width / 2;

      // Hintergrund-Gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, `hsla(${(baseHsl.h + 180) % 360}, 60%, ${5 + bassEnergy * 5}%, 1)`);
      bgGradient.addColorStop(0.5, `hsla(${baseHsl.h}, 50%, 3%, 1)`);
      bgGradient.addColorStop(1, 'black');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      const time = Date.now() * 0.001;

      withSafeCanvasState(ctx, () => {
        // Horizontale Linien - scrollend und pulsierend
        const numHLines = 20;
        const scrollOffset = (time * 50 * (1 + bassEnergy)) % (height / numHLines);

        for (let i = 0; i < numHLines; i++) {
          const baseProgress = i / numHLines;
          const progress = baseProgress + scrollOffset / height;
          if (progress > 1) continue;

          const y = horizon + progress * progress * (height - horizon);

          // Frequenz für diese Linie
          const freqIndex = Math.floor(baseProgress * maxFreqIndex);
          const freq = (dataArray[freqIndex] || 0) / 255;

          // Wellenförmige Verzerrung
          const wave = Math.sin(time * 3 + i * 0.5) * freq * 20 * intensity;

          ctx.beginPath();
          ctx.moveTo(0, y + wave);
          ctx.lineTo(width, y + wave);

          const alpha = 0.3 + (1 - progress) * 0.6 + freq * 0.2;
          const lightness = 50 + (1 - progress) * 30 + midEnergy * 20;
          ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, ${lightness}%, ${alpha})`;
          ctx.lineWidth = (2 + (1 - progress) * 4 + freq * 3) * intensity;
          ctx.shadowColor = `hsl(${baseHsl.h}, 100%, 60%)`;
          ctx.shadowBlur = 5 + bassEnergy * 10;
          ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // Vertikale Linien - audio-reaktiv
        const numVLines = 25;
        for (let i = 0; i <= numVLines; i++) {
          const progress = i / numVLines;
          const freqIndex = Math.floor(progress * maxFreqIndex);
          const freq = (dataArray[freqIndex] || 0) / 255;

          // Startpunkt am unteren Rand mit Variation
          const startX = progress * width;
          const startY = height + freq * 20;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(vanishingPointX, horizon - 30 - bassEnergy * 30);

          const centerDistance = Math.abs(progress - 0.5) * 2;
          const alpha = (1 - centerDistance * 0.6) * (0.3 + freq * 0.5);
          const hue = (baseHsl.h + 40 + freq * 30) % 360;

          ctx.strokeStyle = `hsla(${hue}, 100%, ${50 + freq * 40}%, ${alpha})`;
          ctx.lineWidth = (1 + freq * 3) * intensity;
          ctx.stroke();
        }

        // Zentraler Glow am Horizont bei Bass
        if (bassEnergy > 0.2) {
          const glowGradient = ctx.createRadialGradient(
            vanishingPointX, horizon, 0,
            vanishingPointX, horizon, 150 + bassEnergy * 100
          );
          glowGradient.addColorStop(0, `hsla(${baseHsl.h}, 100%, 70%, ${bassEnergy * 0.4})`);
          glowGradient.addColorStop(0.5, `hsla(${(baseHsl.h + 30) % 360}, 100%, 50%, ${bassEnergy * 0.2})`);
          glowGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGradient;
          ctx.fillRect(0, 0, width, height);
        }
      });
    }
  },
  texturedWave: {
    name_de: "Textur-Welle (Aktiviert)",
    name_en: "Texture Wave (Active)",
    needsTimeData: true,
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const centerY = height / 2;
      const baseHsl = hexToHsl(color);

      // Trail-Effekt
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Weniger Punkte für bessere Performance, aber mehr Effekt
      const numPoints = 150;
      const sliceWidth = width / numPoints;
      const time = Date.now() * 0.001;

      // Gesamtenergie für Effekte
      const totalEnergy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.21)) / 255;

      // Mehrere Wellenlinien
      const numWaves = 3;

      for (let wave = 0; wave < numWaves; wave++) {
        const waveOffset = (wave - 1) * height * 0.15;
        const points = [];

        // Punkte sammeln
        for (let i = 0; i < numPoints; i++) {
          const dataIndex = Math.floor((i / numPoints) * bufferLength);
          const v = (dataArray[dataIndex] / 128.0) - 1.0;
          const x = i * sliceWidth;

          // Größere Amplitude und Basis-Welle
          const baseWave = Math.sin(x * 0.02 + time * 2 + wave) * 30;
          const audioWave = v * (height / 2.5);
          const y = centerY + waveOffset + baseWave + audioWave;

          points.push({ x, y, v: Math.abs(v) });
        }

        // Gefüllte Welle zeichnen
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

        // Leuchtende Oberkante
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

        // Partikel an Peaks
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
  },
  pulsingOrbs: {
    name_de: "Pulsierende Kugeln",
    name_en: "Pulsing Orbs",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      // OPTIMIERT: Nutze nur 21% der Frequenzen mit linearer Verteilung
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const numOrbs = Math.min(12, maxFreqIndex);

      const baseHsl = hexToHsl(color);
      for (let i = 0; i < numOrbs; i++) {
        // LINEARE Verteilung über nutzbaren Frequenzbereich
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
          ctx.beginPath(); ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${70 + amplitude * 30}%)`; ctx.fill();
        });
      }
    }
  },
  digitalRain: {
    name_de: "Digitaler Regen",
    name_en: "Digital Rain",
    init(width, height) {
      const columns = Math.floor(width / 15); // Mehr Spalten
      visualizerState.digitalRain = {
        columns,
        drops: Array.from({ length: columns }, () => ({
          y: Math.random() * height * 2 - height,
          speed: 3 + Math.random() * 6,
          length: 10 + Math.floor(Math.random() * 15), // Variable Länge
          hueOffset: Math.random() * 30
        }))
      };
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.digitalRain) this.init(width, height);
      const state = visualizerState.digitalRain;
      const baseHsl = hexToHsl(color);

      // Nutzbarer Frequenzbereich
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

      // Trail
      ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + bassEnergy * 0.04})`;
      ctx.fillRect(0, 0, width, height);

      const columnWidth = width / state.columns;
      const segmentHeight = 12;

      for (let i = 0; i < state.columns; i++) {
        // Frequenz aus nutzbarem Bereich mit Wiederholung
        const freqPos = (i % Math.floor(state.columns / 3)) / (state.columns / 3);
        const freqIndex = Math.floor(freqPos * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] || 0) / 255;

        const drop = state.drops[i];

        // Geschwindigkeit basierend auf Audio
        const speedMult = 1 + bassEnergy * 2 + amplitude * 3;
        drop.speed = (4 + amplitude * 8) * intensity;

        // Dynamische Länge basierend auf Amplitude
        const currentLength = Math.floor(drop.length * (0.5 + amplitude * 1.5));

        const hue = (baseHsl.h + drop.hueOffset + midEnergy * 30) % 360;

        // Segmente zeichnen
        for (let j = 0; j < currentLength; j++) {
          const segmentY = drop.y - j * segmentHeight;

          if (segmentY > -segmentHeight && segmentY < height + segmentHeight) {
            const trailFade = 1 - (j / currentLength);
            const x = i * columnWidth + 1;
            const segWidth = columnWidth - 2;

            if (j === 0) {
              // Leuchtender Kopf
              const gradient = ctx.createLinearGradient(x, segmentY, x, segmentY + segmentHeight);
              gradient.addColorStop(0, `hsla(${hue}, 100%, 90%, ${0.95})`);
              gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, ${0.8})`);
              ctx.fillStyle = gradient;
              ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
              ctx.shadowBlur = 15 + amplitude * 10;
            } else {
              // Trail mit Gradient
              const lightness = 50 + trailFade * 30 + amplitude * 20;
              const alpha = trailFade * (0.5 + amplitude * 0.5);
              ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
              ctx.shadowBlur = 0;
            }

            // Abgerundete Rechtecke
            const radius = 3;
            ctx.beginPath();
            ctx.roundRect(x, segmentY, segWidth, segmentHeight - 2, radius);
            ctx.fill();
          }
        }

        ctx.shadowBlur = 0;

        // Bewegung
        drop.y += drop.speed * speedMult;

        // Reset wenn komplett unten
        if (drop.y - currentLength * segmentHeight > height) {
          drop.y = -drop.length * segmentHeight - Math.random() * 100;
          drop.length = 10 + Math.floor(Math.random() * 15);
        }
      }

      // Glitzer-Effekt bei hoher Energie
      if (midEnergy > 0.4) {
        for (let g = 0; g < 3; g++) {
          const gx = Math.random() * width;
          const gy = Math.random() * height;
          ctx.beginPath();
          ctx.arc(gx, gy, 2 + midEnergy * 3, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${baseHsl.h}, 100%, 90%, ${midEnergy * 0.6})`;
          ctx.fill();
        }
      }
    }
  },
  hexagonGrid: {
    name_de: "Sechseck-Gitter",
    name_en: "Hexagon Grid",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const hexSize = 30;
      const hexWidth = hexSize * 2;
      const hexHeight = hexSize * Math.sqrt(3);
      const cols = Math.floor(width / (hexWidth * 0.75)) + 1;
      const rows = Math.floor(height / hexHeight) + 1;
      const baseHsl = hexToHsl(color);
      withSafeCanvasState(ctx, () => {
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = col * hexWidth * 0.75;
            const y = row * hexHeight + (col % 2) * hexHeight * 0.5;
            const normalizedX = x / width;
            const normalizedY = y / height;
            const freqIndex = Math.floor((normalizedX + normalizedY) * 0.5 * bufferLength);
            const amplitude = (dataArray[freqIndex] || 0) / 255;
            if (amplitude > 0.1) {
              ctx.beginPath();
              for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const hx = x + Math.cos(angle) * hexSize;
                const hy = y + Math.sin(angle) * hexSize;
                if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
              }
              ctx.closePath();
              const hue = (baseHsl.h + amplitude * 180) % 360;
              ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${30 + amplitude * 50}%, ${amplitude})`;
              ctx.fill();
              ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${60 + amplitude * 30}%)`;
              ctx.lineWidth = (1 + amplitude * 2) * intensity;
              ctx.stroke();
            }
          }
        }
      });
    }
  },
  lightBeams: {
    name_de: "Lichtstrahlen",
    name_en: "Light Beams",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const numBeams = 72;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseHsl = hexToHsl(color);
      const maxFreqIndex = Math.floor(bufferLength * 0.21); // Nur nutzbaren Bereich!

      // Gesamtenergie für Basis-Helligkeit
      const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;

      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < numBeams; i++) {
          // ✅ FIX: Frequenzen auf nutzbaren Bereich mappen (0-21%)
          const freqIndex = Math.floor((i / numBeams) * maxFreqIndex);
          const sampleSize = Math.max(1, Math.floor(maxFreqIndex / numBeams));
          const s = freqIndex;
          const e = Math.min(maxFreqIndex, freqIndex + sampleSize);

          // ✅ FIX: Höhere Mindest-Amplitude + Boost
          const rawAmplitude = averageRange(dataArray, s, e) / 255;
          const amplitude = Math.max(0.4, rawAmplitude * 1.8 + overallEnergy * 0.3);

          const angle = (i / numBeams) * Math.PI * 2;
          // ✅ FIX: Längere Strahlen
          const length = (50 + amplitude * Math.min(width, height) * 0.5) * intensity;
          const beamWidth = (3 + amplitude * 10) * intensity;

          const x1 = centerX + Math.cos(angle) * 30;
          const y1 = centerY + Math.sin(angle) * 30;
          const x2 = centerX + Math.cos(angle) * (30 + length);
          const y2 = centerY + Math.sin(angle) * (30 + length);

          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          // Regenbogenfarben oder Benutzerfarbe
          const hue = (baseHsl.h + (i / numBeams) * 180) % 360;
          gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${0.9})`);
          gradient.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${0.6 * amplitude})`);
          gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = beamWidth;
          ctx.stroke();

          // Glow bei hoher Amplitude
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
  },
  synthWave: {
    name_de: "Synth-Wave",
    name_en: "Synth Wave",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const horizon = height * 0.55;
      const numLines = 25;
      const baseHsl = hexToHsl(color);

      // Nutzbarer Frequenzbereich
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

      // Dramatischer Gradient-Hintergrund
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, `hsl(${(baseHsl.h + 200) % 360}, 80%, ${8 + bassEnergy * 5}%)`);
      bgGradient.addColorStop(0.4, `hsl(${(baseHsl.h + 280) % 360}, 70%, ${5 + midEnergy * 3}%)`);
      bgGradient.addColorStop(0.6, `hsl(${baseHsl.h}, 60%, 3%)`);
      bgGradient.addColorStop(1, 'black');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      withSafeCanvasState(ctx, () => {
        // SONNE - pulsiert mit Bass
        const sunRadius = 60 + bassEnergy * 40;
        const sunY = horizon - 30;
        const sunGradient = ctx.createRadialGradient(width / 2, sunY, 0, width / 2, sunY, sunRadius * 1.5);
        sunGradient.addColorStop(0, `hsla(${(baseHsl.h + 30) % 360}, 100%, 70%, ${0.9 + bassEnergy * 0.1})`);
        sunGradient.addColorStop(0.3, `hsla(${baseHsl.h}, 100%, 60%, 0.8)`);
        sunGradient.addColorStop(0.6, `hsla(${(baseHsl.h - 20 + 360) % 360}, 100%, 50%, 0.4)`);
        sunGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGradient;
        ctx.fillRect(0, 0, width, horizon);

        // Horizontale Scanlines durch die Sonne
        const scanLines = 8;
        for (let i = 0; i < scanLines; i++) {
          const scanY = sunY - sunRadius + (i / scanLines) * sunRadius * 2;
          if (scanY < sunY - sunRadius * 0.3 || scanY > sunY + sunRadius) continue;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(width / 2 - sunRadius, scanY, sunRadius * 2, 3 + i * 0.5);
        }

        // Horizontale Grid-Linien mit VIEL mehr Bewegung
        for (let i = 0; i < numLines; i++) {
          const progress = i / numLines;
          const y = horizon + progress * progress * (height - horizon);
          const perspectiveScale = 1 - (progress * 0.6);

          // Stärkere Wellenverzerrung
          const distortion = Math.sin(Date.now() * 0.002 + progress * 8) * bassEnergy * 30 * intensity;

          ctx.beginPath();
          const segments = 60;
          for (let j = 0; j <= segments; j++) {
            const x = (j / segments) * width;

            // Frequenz aus nutzbarem Bereich
            const freqIndex = Math.floor((j / segments) * maxFreqIndex);
            const amplitude = (dataArray[freqIndex] || 0) / 255;

            // VIEL größere Amplitude
            const waveHeight = amplitude * 60 * perspectiveScale * intensity;
            const wave = Math.sin(x * 0.015 + Date.now() * 0.003) * waveHeight;
            const waveY = y + distortion + wave;

            if (j === 0) ctx.moveTo(x, waveY);
            else ctx.lineTo(x, waveY);
          }

          // Leuchtende Neon-Farben
          const hue = (baseHsl.h + progress * 80) % 360;
          const lightness = 55 + (1 - progress) * 35 + midEnergy * 10;
          ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}%, ${(1 - progress) * 0.9})`;
          ctx.lineWidth = (2 + (1 - progress) * 4) * intensity;
          ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
          ctx.shadowBlur = 10 + bassEnergy * 15;
          ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // Vertikale Linien - AUDIO-REAKTIV
        const numVerticals = 20;
        for (let i = 0; i <= numVerticals; i++) {
          const xRatio = i / numVerticals;
          const x = xRatio * width;
          const vanishY = horizon - 20;

          // Frequenz für diese Linie
          const freqIndex = Math.floor(xRatio * maxFreqIndex);
          const amplitude = (dataArray[freqIndex] || 0) / 255;

          ctx.beginPath();
          ctx.moveTo(x, height);
          ctx.lineTo(width * 0.5, vanishY);

          const centerDistance = Math.abs(x - width * 0.5) / (width * 0.5);
          // Alpha basierend auf Audio UND Position
          const alpha = (1 - centerDistance * 0.7) * (0.3 + amplitude * 0.5);

          const hue = (baseHsl.h + 60 + amplitude * 40) % 360;
          ctx.strokeStyle = `hsla(${hue}, 100%, ${50 + amplitude * 30}%, ${alpha})`;
          ctx.lineWidth = (1 + amplitude * 2) * intensity;
          ctx.stroke();
        }
      });
    }
  },
  cosmicNebula: {
    name_de: "Kosmischer Nebel",
    name_en: "Cosmic Nebula",
    init(width, height) {
      visualizerState.cosmicNebula = { particles: [], time: 0 };
      for (let i = 0; i < 400; i++) {
        // Cluster-basierte Verteilung für Nebel-Effekt
        const clusterX = Math.random() * width;
        const clusterY = Math.random() * height;
        visualizerState.cosmicNebula.particles.push({
          x: clusterX, y: clusterY,
          baseX: clusterX + (Math.random() - 0.5) * 100,
          baseY: clusterY + (Math.random() - 0.5) * 100,
          radius: 2 + Math.random() * 5,
          hueOffset: Math.random() * 120, // Mehr Farbvariation
          speed: 0.5 + Math.random() * 2, // Schnellere Basis
          phase: Math.random() * Math.PI * 2, // Zufällige Phase
          orbitSize: 30 + Math.random() * 80 // Individuelle Orbit-Größe
        });
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.cosmicNebula || visualizerState.cosmicNebula.particles.length === 0) {
        this.init(width, height);
      }
      const state = visualizerState.cosmicNebula;
      const baseHsl = hexToHsl(color);

      // NUR nutzbaren Frequenzbereich
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
      const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

      // Langsamerer Trail-Fade für schönere Trails
      ctx.fillStyle = `rgba(0, 0, 0, ${0.02 + bassEnergy * 0.03})`;
      ctx.fillRect(0, 0, width, height);

      // Zentrales Glow bei Bass
      if (bassEnergy > 0.2) {
        const centerGlow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 300 + bassEnergy * 200);
        centerGlow.addColorStop(0, `hsla(${baseHsl.h}, 100%, 50%, ${bassEnergy * 0.15})`);
        centerGlow.addColorStop(0.5, `hsla(${(baseHsl.h + 60) % 360}, 80%, 40%, ${bassEnergy * 0.08})`);
        centerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = centerGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // Zeit für Animation - 10x schneller als vorher!
      const time = Date.now() * 0.001;

      state.particles.forEach((p, index) => {
        // Frequenz aus nutzbarem Bereich mit Wiederholung
        const freqPos = (index % 100) / 100;
        const freqIndex = Math.floor(freqPos * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] || 0) / 255;

        // IMMER Bewegung + Audio-Boost
        const baseMovement = 0.3 + amplitude * 0.7; // Mindestens 30% Bewegung
        const orbitRadius = p.orbitSize * baseMovement * (1 + bassEnergy) * intensity;

        // VIEL schnellere Rotation
        const angle = time * p.speed + p.phase + index * 0.1;

        // Spiralförmige Bewegung
        const spiral = Math.sin(time * 0.5 + index * 0.05) * 20 * midEnergy;
        p.x = p.baseX + Math.cos(angle) * orbitRadius + spiral;
        p.y = p.baseY + Math.sin(angle) * orbitRadius + Math.cos(angle * 0.7) * spiral;

        // Wrap around screen
        if (p.x < -50) p.baseX += width + 100;
        if (p.x > width + 50) p.baseX -= width + 100;
        if (p.y < -50) p.baseY += height + 100;
        if (p.y > height + 50) p.baseY -= height + 100;

        // Dynamische Farben
        const hue = (baseHsl.h + p.hueOffset + midEnergy * 60 + time * 10) % 360;
        const particleSize = p.radius * (1 + amplitude * 2) * intensity;

        // Leuchtender Gradient - IMMER sichtbar
        const minAlpha = 0.3; // Mindest-Sichtbarkeit
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, particleSize * 5);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${minAlpha + amplitude * 0.6})`);
        gradient.addColorStop(0.3, `hsla(${hue}, 90%, 60%, ${(minAlpha + amplitude * 0.4) * 0.6})`);
        gradient.addColorStop(0.7, `hsla(${(hue + 30) % 360}, 80%, 40%, ${(minAlpha + amplitude * 0.2) * 0.3})`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(p.x, p.y, particleSize * 5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Heller Kern
        ctx.beginPath();
        ctx.arc(p.x, p.y, particleSize * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, ${85 + highEnergy * 15}%, ${0.7 + amplitude * 0.3})`;
        ctx.fill();
      });
    }
  },
  geometricKaleidoscope: {
    name_de: "Geometrisches Kaleidoskop",
    name_en: "Geometric Kaleidoscope",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const centerX = width / 2, centerY = height / 2;
      const numSegments = 8, numLayers = 6;
      const baseHsl = hexToHsl(color);

      // OPTIMIERT: Nutze nur 21% der Frequenzen mit linearer Verteilung
      const maxFreqIndex = Math.floor(bufferLength * 0.21);

      withSafeCanvasState(ctx, () => {
        ctx.translate(centerX, centerY);
        ctx.rotate(Date.now() * 0.0003);
        for (let layer = 0; layer < numLayers; layer++) {
          const layerProgress = layer / numLayers;

          // LINEARE Verteilung über nutzbaren Frequenzbereich
          const freqPerLayer = maxFreqIndex / numLayers;
          const s = Math.floor(layer * freqPerLayer);
          const e = Math.max(s + 1, Math.floor((layer + 1) * freqPerLayer));

          const amplitude = averageRange(dataArray, s, e) / 255;
          const dynamicGain = calculateDynamicGain(layer, numLayers);
          const effectiveAmplitude = amplitude * dynamicGain * intensity;
          const baseRadius = 50 + layer * 40;
          const radius = baseRadius + effectiveAmplitude * 120; // Verdoppelt von 60 auf 120
          for (let i = 0; i < numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2;
            const nextAngle = ((i + 1) / numSegments) * Math.PI * 2;
            const x1 = Math.cos(angle) * radius, y1 = Math.sin(angle) * radius;
            const x2 = Math.cos(nextAngle) * radius, y2 = Math.sin(nextAngle) * radius;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath();
            const hue = (baseHsl.h + layerProgress * 120 + i * 15) % 360;
            // VERBESSERT: Höhere Opazität und Helligkeit
            ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${40 + effectiveAmplitude * 50}%, ${0.5 + effectiveAmplitude * 0.5})`;
            ctx.fill();
            ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${70 + effectiveAmplitude * 30}%)`;
            ctx.lineWidth = (2 + effectiveAmplitude * 5) * intensity; // Dickere Linien
            ctx.stroke();
          }
        }
      });
    }
  },
  liquidCrystals: {
    name_de: "Flüssigkristalle",
    name_en: "Liquid Crystals",
    init(width, height) {
      visualizerState.liquidCrystals = { crystals: [], numCrystals: 60, time: 0 };
      for (let i = 0; i < 60; i++) {
        visualizerState.liquidCrystals.crystals.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 4, // 2x schneller
          vy: (Math.random() - 0.5) * 4,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.08, // 4x schnellere Rotation
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

      // Nutzbarer Frequenzbereich
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;

      state.time = (state.time || 0) + 0.02;

      // Trail mit dynamischer Stärke
      ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + bassEnergy * 0.05})`;
      ctx.fillRect(0, 0, width, height);

      // Hintergrund-Glow bei Bass
      if (bassEnergy > 0.3) {
        const bgGlow = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height) * 0.5);
        bgGlow.addColorStop(0, `hsla(${baseHsl.h}, 80%, 40%, ${bassEnergy * 0.15})`);
        bgGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = bgGlow;
        ctx.fillRect(0, 0, width, height);
      }

      state.crystals.forEach((crystal, index) => {
        // Frequenz aus nutzbarem Bereich
        const freqIndex = Math.floor((index / state.numCrystals) * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] || 0) / 255;
        const dynamicGain = calculateDynamicGain(index, state.numCrystals);
        const effectiveAmplitude = amplitude * dynamicGain * intensity;

        // Schnellere Bewegung mit Audio-Boost
        const speedMult = 1 + bassEnergy * 3 + effectiveAmplitude * 2;
        crystal.x += crystal.vx * speedMult;
        crystal.y += crystal.vy * speedMult;
        crystal.rotation += crystal.rotationSpeed * (1 + effectiveAmplitude * 3);

        // Bounce mit Chaos
        if (crystal.x < 0 || crystal.x > width) {
          crystal.vx *= -1;
          crystal.vy += (Math.random() - 0.5) * bassEnergy * 2;
        }
        if (crystal.y < 0 || crystal.y > height) {
          crystal.vy *= -1;
          crystal.vx += (Math.random() - 0.5) * bassEnergy * 2;
        }

        // Pulsierender Größen-Effekt
        const pulse = Math.sin(state.time * 3 + crystal.pulsePhase) * 0.2 + 1;
        const targetSize = crystal.baseSize * pulse * (1 + effectiveAmplitude * 2);
        crystal.smoothedSize = crystal.smoothedSize * 0.7 + targetSize * 0.3;

        withSafeCanvasState(ctx, () => {
          ctx.translate(crystal.x, crystal.y);
          ctx.rotate(crystal.rotation);

          const sides = 6;
          const hue = (baseHsl.h + crystal.hueOffset + midEnergy * 40) % 360;

          // Äußerer Glow
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const x = Math.cos(angle) * crystal.smoothedSize * 1.3;
            const y = Math.sin(angle) * crystal.smoothedSize * 1.3;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.1 + effectiveAmplitude * 0.2})`;
          ctx.fill();

          // Haupt-Kristall
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const wobble = Math.sin(state.time * 5 + i) * effectiveAmplitude * 5;
            const x = Math.cos(angle) * (crystal.smoothedSize + wobble);
            const y = Math.sin(angle) * (crystal.smoothedSize + wobble);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();

          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, crystal.smoothedSize);
          gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${0.8 + effectiveAmplitude * 0.2})`);
          gradient.addColorStop(0.5, `hsla(${hue}, 90%, 60%, ${0.5 + effectiveAmplitude * 0.3})`);
          gradient.addColorStop(1, `hsla(${hue}, 80%, 40%, ${0.3 + effectiveAmplitude * 0.4})`);
          ctx.fillStyle = gradient;
          ctx.fill();

          // Leuchtende Kante
          ctx.strokeStyle = `hsla(${hue}, 100%, ${75 + effectiveAmplitude * 25}%, ${0.7 + effectiveAmplitude * 0.3})`;
          ctx.lineWidth = (2 + effectiveAmplitude * 4) * intensity;
          ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
          ctx.shadowBlur = 10 + effectiveAmplitude * 20;
          ctx.stroke();
        });
      });
    }
  },
  vortexPortal: {
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
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
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
        ctx.beginPath(); ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2); ctx.fillStyle = coreGradient; ctx.fill();
      });
    }
  },
  electricWeb: {
    name_de: "Elektrisches Netz",
    name_en: "Electric Web",
    init(width, height) {
      // OPTIMIERT: Weniger Nodes = O(n²) wird viel besser
      const numNodes = 30;
      visualizerState.electricWeb = {
        nodes: [],
        // Vorberechnete Verbindungs-Distanz²
        maxDistSq: Math.pow(width / 5, 2)
      };
      for (let i = 0; i < numNodes; i++) {
        visualizerState.electricWeb.nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 2.5,
          vy: (Math.random() - 0.5) * 2.5,
          charge: 0.3 + Math.random() * 0.3
        });
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.electricWeb) this.init(width, height);
      const state = visualizerState.electricWeb;
      const baseHsl = hexToHsl(color);
      const nodes = state.nodes;
      const numNodes = nodes.length;

      // Frequenzbereich
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), maxFreqIndex) / 255;

      // Trail
      ctx.fillStyle = `rgba(0, 0, 0, 0.15)`;
      ctx.fillRect(0, 0, width, height);

      // Geschwindigkeit
      const speedMult = 1 + bassEnergy * 2.5;

      // Verbindungs-Distanz (quadriert für schnelleren Vergleich)
      const maxDist = width / 5 + bassEnergy * 30;
      const maxDistSq = maxDist * maxDist;

      // === VERBINDUNGEN ZUERST (weniger State-Änderungen) ===
      ctx.lineWidth = (1 + midEnergy * 2) * intensity;

      for (let i = 0; i < numNodes; i++) {
        const nodeA = nodes[i];

        for (let j = i + 1; j < numNodes; j++) {
          const nodeB = nodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;

          // OPTIMIERT: Quadrierte Distanz (kein sqrt nötig)
          const distSq = dx * dx + dy * dy;
          if (distSq > maxDistSq) continue;

          const dist = Math.sqrt(distSq);
          const distFactor = 1 - dist / maxDist;
          const charge = (nodeA.charge + nodeB.charge) * 0.5;

          // OPTIMIERT: Weniger Segmente (6 statt 12)
          ctx.beginPath();
          ctx.moveTo(nodeA.x, nodeA.y);

          const jitterStrength = charge * 25 * intensity;
          const segX = dx / 6;
          const segY = dy / 6;

          for (let k = 1; k < 6; k++) {
            const jx = (Math.random() - 0.5) * jitterStrength;
            const jy = (Math.random() - 0.5) * jitterStrength;
            ctx.lineTo(nodeA.x + segX * k + jx, nodeA.y + segY * k + jy);
          }
          ctx.lineTo(nodeB.x, nodeB.y);

          // OPTIMIERT: Einfache Farbe ohne Shadow
          const alpha = distFactor * (0.4 + charge * 0.5);
          ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, ${55 + charge * 35}%, ${alpha})`;
          ctx.stroke();
        }
      }

      // === NODES ZEICHNEN ===
      for (let i = 0; i < numNodes; i++) {
        const node = nodes[i];

        // Frequenz für diesen Node
        const freqIndex = Math.floor((i / numNodes) * maxFreqIndex);
        const amplitude = (dataArray[freqIndex] || 0) / 255;
        node.charge = 0.3 + amplitude * 0.6;

        // Bewegung
        node.x += node.vx * speedMult;
        node.y += node.vy * speedMult;

        // Bounce
        if (node.x < 0) { node.x = 0; node.vx *= -1; }
        else if (node.x > width) { node.x = width; node.vx *= -1; }
        if (node.y < 0) { node.y = 0; node.vy *= -1; }
        else if (node.y > height) { node.y = height; node.vy *= -1; }

        // OPTIMIERT: Einfacher Node ohne Gradient
        const nodeSize = (3 + node.charge * 8) * intensity;

        // Äußerer Ring (statt teurer Gradient)
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHsl.h}, 100%, 60%, ${node.charge * 0.25})`;
        ctx.fill();

        // Kern
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHsl.h}, 100%, ${65 + node.charge * 30}%, ${0.8 + node.charge * 0.2})`;
        ctx.fill();
      }

      // Gelegentlicher Blitz (selten, für Akzent)
      if (bassEnergy > 0.6 && Math.random() > 0.9) {
        const src = nodes[Math.floor(Math.random() * numNodes)];
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        let sx = src.x, sy = src.y;
        const angle = Math.random() * Math.PI * 2;
        for (let i = 0; i < 4; i++) {
          sx += Math.cos(angle + (Math.random() - 0.5) * 0.8) * 30;
          sy += Math.sin(angle + (Math.random() - 0.5) * 0.8) * 30;
          ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = `hsla(${baseHsl.h}, 100%, 85%, ${bassEnergy})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  },/**
   * ORGANIC/LIVING VISUALIZERS - Erweiterung für visualizers.js
   * Diese 5 Visualizer können direkt in das Visualizers-Objekt eingefügt werden
   */

// ============================================================================
// 1. HERZSCHLAG - Pulsierendes Herz-Symbol
// ============================================================================
  heartbeat: {
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

      // Schnelleres Smoothing für bessere Reaktion
      state.smoothedBass = state.smoothedBass * 0.5 + bassEnergy * 0.5;

      // Rolling Average für dynamischen Threshold
      state.bassHistory.push(bassEnergy);
      if (state.bassHistory.length > 20) {
        state.bassHistory.shift();
      }
      state.avgBass = state.bassHistory.reduce((a, b) => a + b, 0) / state.bassHistory.length;

      const now = Date.now();
      const timeSinceLastPulse = now - state.lastPulse;
      const minTimeBetweenBeats = 150; // Schnellere Beats erlaubt (400 BPM max)
      const maxTimeBetweenBeats = 800; // Force-Beat nach 0.8s statt 2s

      // ✅ FIX: Viel sensitivere Beat-Erkennung
      const dynamicThreshold = Math.max(0.05, state.avgBass * 0.8); // War 0.15 und 1.2

      // Beat wenn: Energie steigt UND über Threshold
      const isRising = bassEnergy > state.prevBass * 1.05;
      const isAboveThreshold = bassEnergy > dynamicThreshold;
      const isStrongBeat = isRising && isAboveThreshold;
      const hasWaitedLongEnough = timeSinceLastPulse > minTimeBetweenBeats;
      const forceBeat = timeSinceLastPulse > maxTimeBetweenBeats;

      if ((isStrongBeat && hasWaitedLongEnough) || forceBeat) {
        // ✅ FIX: Stärkere Pulsation
        state.targetScale = 1.3 + bassEnergy * 0.8 * intensity;
        state.lastPulse = now;
        state.pulseCount++;
      }

      state.prevBass = bassEnergy;

      // ✅ FIX: Kontinuierliche Mikro-Pulsation zur Musik
      const microPulse = 1 + state.smoothedBass * 0.15 * intensity;

      // Schnellere Animation
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

        ctx.bezierCurveTo(
          -size * 0.5, -size * 0.3,
          -size * 0.8, size * 0.1,
          0, size * 0.9
        );

        ctx.bezierCurveTo(
          size * 0.8, size * 0.1,
          size * 0.5, -size * 0.3,
          0, size * 0.3
        );

        ctx.closePath();

        const glowIntensity = (state.scale - 1) * 2;
        if (glowIntensity > 0.05) {
          ctx.shadowColor = `hsl(${baseHsl.h}, ${baseHsl.s}%, ${baseHsl.l}%)`;
          ctx.shadowBlur = glowIntensity * 40 * intensity;
        }

        const gradient = ctx.createRadialGradient(
          -size * 0.2, -size * 0.2, 0,
          0, 0, size
        );
        gradient.addColorStop(0, `hsl(${baseHsl.h}, ${baseHsl.s}%, ${Math.min(85, baseHsl.l + 20)}%)`);
        gradient.addColorStop(0.6, `hsl(${baseHsl.h}, ${baseHsl.s}%, ${baseHsl.l}%)`);
        gradient.addColorStop(1, `hsl(${baseHsl.h}, ${Math.max(40, baseHsl.s - 20)}%, ${Math.max(20, baseHsl.l - 20)}%)`);

        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = `hsl(${baseHsl.h}, ${baseHsl.s}%, ${Math.max(10, baseHsl.l - 30)}%)`;
        ctx.lineWidth = 2 * intensity;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // EKG-Linie
        const lineY = -size * 0.5;
        const lineWidth = size * 2;
        const segments = 50;

        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const x = (t - 0.5) * lineWidth;

          let y = lineY;

          // VERBESSERT: Kontinuierliche scrollende EKG-Linie
          const scrollSpeed = 0.05;
          const phase = (Date.now() * scrollSpeed * 0.001 + t * 2) % 1;

          // EKG-Pattern
          if (phase > 0.1 && phase < 0.2) {
            // P-Welle (kleine Erhebung)
            const localT = (phase - 0.1) / 0.1;
            y += Math.sin(localT * Math.PI) * size * 0.08;
          } else if (phase > 0.3 && phase < 0.35) {
            // Q-Zacke (klein nach unten)
            y -= size * 0.05;
          } else if (phase > 0.35 && phase < 0.4) {
            // R-Zacke (groß nach oben) - hier schlägt das Herz
            const localT = (phase - 0.35) / 0.05;
            y -= Math.sin(localT * Math.PI) * size * 0.35 * (1 + state.smoothedBass * 0.5);
          } else if (phase > 0.4 && phase < 0.45) {
            // S-Zacke (nach unten)
            y += size * 0.08;
          } else if (phase > 0.55 && phase < 0.7) {
            // T-Welle (abgerundete Erhebung)
            const localT = (phase - 0.55) / 0.15;
            y += Math.sin(localT * Math.PI) * size * 0.12;
          }

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = `hsla(${(baseHsl.h + 30) % 360}, 100%, 60%, ${0.7 + state.smoothedBass * 0.3})`;
        ctx.lineWidth = 2 * intensity;
        ctx.stroke();

        // BONUS: Herzfrequenz-Anzeige
        const bpm = Math.min(180, Math.max(40, Math.round(60000 / Math.max(500, timeSinceLastPulse))));
        ctx.font = `${size * 0.15}px monospace`;
        ctx.fillStyle = `hsla(${baseHsl.h}, ${baseHsl.s}%, ${baseHsl.l}%, 0.6)`;
        ctx.textAlign = 'center';
        ctx.fillText(`${bpm} BPM`, 0, size * 1.2);
      });
    }
  },
// ============================================================================
// 2. NEURONEN-NETZ - Feuernde Synapsen
// ============================================================================
  neuralNetwork: {
    name_de: "Neuronen-Netz",
    name_en: "Neural Network",
    init(width, height) {
      const numNeurons = 40;
      visualizerState.neuralNetwork = {
        neurons: [],
        signals: []
      };

      // Neuronen erstellen
      for (let i = 0; i < numNeurons; i++) {
        visualizerState.neuralNetwork.neurons.push({
          x: Math.random() * width,
          y: Math.random() * height,
          charge: 0,
          activation: 0,
          lastFire: 0,
          connections: []
        });
      }

      // Verbindungen erstellen
      const state = visualizerState.neuralNetwork;
      for (let i = 0; i < state.neurons.length; i++) {
        const connectionCount = 3 + Math.floor(Math.random() * 4);
        for (let j = 0; j < connectionCount; j++) {
          const target = Math.floor(Math.random() * state.neurons.length);
          if (target !== i) {
            state.neurons[i].connections.push(target);
          }
        }
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.neuralNetwork || visualizerState.neuralNetwork.neurons.length === 0) {
        this.init(width, height);
      }

      const state = visualizerState.neuralNetwork;
      const baseHsl = hexToHsl(color);
      const maxFreqIndex = Math.floor(bufferLength * 0.21);

      // Hintergrund leicht faden
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);

      // Neuronen aktivieren basierend auf Audio
      state.neurons.forEach((neuron, index) => {
        const freqPerNeuron = maxFreqIndex / state.neurons.length;
        const s = Math.floor(index * freqPerNeuron);
        const e = Math.max(s + 1, Math.floor((index + 1) * freqPerNeuron));

        const amplitude = averageRange(dataArray, s, e) / 255;
        const dynamicGain = calculateDynamicGain(index, state.neurons.length);

        neuron.charge = amplitude * dynamicGain * intensity;

        // Activation decay
        neuron.activation *= 0.92;

        // Feuer-Schwelle
        const now = Date.now();
        if (neuron.charge > 0.4 && (now - neuron.lastFire) > 200) {
          neuron.activation = 1.0;
          neuron.lastFire = now;

          // Signal aussenden
          neuron.connections.forEach(targetIdx => {
            state.signals.push({
              from: index,
              to: targetIdx,
              progress: 0,
              hue: (baseHsl.h + index * 10) % 360
            });
          });
        }
      });

      // Signale zeichnen und updaten
      withSafeCanvasState(ctx, () => {
        for (let i = state.signals.length - 1; i >= 0; i--) {
          const signal = state.signals[i];
          signal.progress += 0.05 * intensity;

          if (signal.progress >= 1) {
            // Signal erreicht Ziel - aktiviere Ziel-Neuron
            state.neurons[signal.to].activation = Math.min(1, state.neurons[signal.to].activation + 0.5);
            state.signals.splice(i, 1);
            continue;
          }

          const fromNeuron = state.neurons[signal.from];
          const toNeuron = state.neurons[signal.to];

          const x = fromNeuron.x + (toNeuron.x - fromNeuron.x) * signal.progress;
          const y = fromNeuron.y + (toNeuron.y - fromNeuron.y) * signal.progress;

          // Signal als leuchtender Punkt
          ctx.beginPath();
          ctx.arc(x, y, 3 * intensity, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${signal.hue}, 100%, 70%)`;
          ctx.shadowColor = `hsl(${signal.hue}, 100%, 70%)`;
          ctx.shadowBlur = 10 * intensity;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Verbindungen zeichnen
      withSafeCanvasState(ctx, () => {
        state.neurons.forEach((neuron, index) => {
          neuron.connections.forEach(targetIdx => {
            const target = state.neurons[targetIdx];
            const alpha = (neuron.activation + target.activation) / 2;

            if (alpha > 0.05) {
              ctx.beginPath();
              ctx.moveTo(neuron.x, neuron.y);
              ctx.lineTo(target.x, target.y);

              const hue = (baseHsl.h + index * 5) % 360;
              ctx.strokeStyle = `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${alpha * 0.3})`;
              ctx.lineWidth = (1 + alpha * 2) * intensity;
              ctx.stroke();
            }
          });
        });
      });

      // Neuronen zeichnen
      state.neurons.forEach((neuron, index) => {
        const baseRadius = 4;
        const activeRadius = baseRadius * (1 + neuron.activation * 2) * intensity;
        const hue = (baseHsl.h + (index / state.neurons.length) * 120) % 360;

        // Äußerer Glow bei Aktivierung
        if (neuron.activation > 0.3) {
          ctx.beginPath();
          ctx.arc(neuron.x, neuron.y, activeRadius * 2, 0, Math.PI * 2);
          const glowGradient = ctx.createRadialGradient(
            neuron.x, neuron.y, 0,
            neuron.x, neuron.y, activeRadius * 2
          );
          glowGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${neuron.activation * 0.5})`);
          glowGradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
          ctx.fillStyle = glowGradient;
          ctx.fill();
        }

        // Neuron-Körper
        ctx.beginPath();
        ctx.arc(neuron.x, neuron.y, activeRadius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${40 + neuron.activation * 50}%)`;
        ctx.fill();

        // Kern
        ctx.beginPath();
        ctx.arc(neuron.x, neuron.y, activeRadius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${70 + neuron.activation * 30}%)`;
        ctx.fill();
      });
    }
  },

// ============================================================================
// 3. ZELLWACHSTUM - Organisch wachsende Strukturen
// ============================================================================
  cellGrowth: {
    name_de: "Zellwachstum",
    name_en: "Cell Growth",
    init(width, height) {
      visualizerState.cellGrowth = {
        cells: [],
        nextSpawn: 0
      };

      const baseHue = Math.random() * 360;

      // ✅ FIX: Start mit 8 Zellen verteilt über den Canvas
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = Math.min(width, height) * 0.2;
        visualizerState.cellGrowth.cells.push({
          x: width / 2 + Math.cos(angle) * distance * (0.3 + Math.random() * 0.7),
          y: height / 2 + Math.sin(angle) * distance * (0.3 + Math.random() * 0.7),
          radius: 8 + Math.random() * 10,
          targetRadius: 25 + Math.random() * 20,
          hue: (baseHue + i * 45 + Math.random() * 20) % 360,
          age: 0,
          maxAge: 300 + Math.random() * 200,
          generation: 0
        });
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.cellGrowth) this.init(width, height);
      const state = visualizerState.cellGrowth;
      const baseHsl = hexToHsl(color);

      // Audio-Energie berechnen
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;

      // ✅ FIX: Neue Zellen spawnen - niedrigerer Threshold, mehr Zellen erlaubt
      const now = Date.now();
      const spawnThreshold = 0.15; // War 0.5, jetzt viel niedriger
      const maxCells = 100; // War 50
      const spawnCooldown = 30; // War 100ms

      if (overallEnergy > spawnThreshold && now > state.nextSpawn && state.cells.length < maxCells) {
        // Spawn von zufälligem Parent oder zufälliger Position
        const useParent = state.cells.length > 0 && Math.random() > 0.3;

        if (useParent) {
          const parentIdx = Math.floor(Math.random() * state.cells.length);
          const parent = state.cells[parentIdx];

          const angle = Math.random() * Math.PI * 2;
          const distance = parent.radius * (1.2 + Math.random());

          state.cells.push({
            x: Math.max(50, Math.min(width - 50, parent.x + Math.cos(angle) * distance)),
            y: Math.max(50, Math.min(height - 50, parent.y + Math.sin(angle) * distance)),
            radius: 5,
            targetRadius: 20 + overallEnergy * 30,
            hue: (parent.hue + 15 + Math.random() * 30) % 360,
            age: 0,
            maxAge: 200 + Math.random() * 150,
            generation: parent.generation + 1
          });
        } else {
          // Zufällige Position
          state.cells.push({
            x: 100 + Math.random() * (width - 200),
            y: 100 + Math.random() * (height - 200),
            radius: 5,
            targetRadius: 25 + overallEnergy * 25,
            hue: (baseHsl.h + Math.random() * 60) % 360,
            age: 0,
            maxAge: 250 + Math.random() * 150,
            generation: 0
          });
        }

        state.nextSpawn = now + spawnCooldown / intensity;
      }

      // Zellen updaten und zeichnen
      for (let i = state.cells.length - 1; i >= 0; i--) {
        const cell = state.cells[i];
        cell.age++;

        // Wachstum
        if (cell.radius < cell.targetRadius) {
          cell.radius += (cell.targetRadius - cell.radius) * 0.05 * (1 + bassEnergy * 2) * intensity;
        }

        // Lebenszyklus - Zelle stirbt und verblasst
        const lifeProgress = cell.age / cell.maxAge;
        if (lifeProgress >= 1) {
          state.cells.splice(i, 1);
          continue;
        }

        // Organische Pulsation
        const pulsePhase = Math.sin(cell.age * 0.1 + cell.generation) * 0.15;
        const displayRadius = cell.radius * (1 + pulsePhase + overallEnergy * 0.2) * intensity;

        // Fade-out am Ende des Lebens
        const alpha = lifeProgress > 0.7 ? (1 - lifeProgress) / 0.3 : 1;

        withSafeCanvasState(ctx, () => {
          // Äußere Membran (transparent)
          ctx.beginPath();
          ctx.arc(cell.x, cell.y, displayRadius * 1.3, 0, Math.PI * 2);
          const outerGradient = ctx.createRadialGradient(
            cell.x, cell.y, 0,
            cell.x, cell.y, displayRadius * 1.3
          );
          outerGradient.addColorStop(0, `hsla(${cell.hue}, 70%, 50%, 0)`);
          outerGradient.addColorStop(0.7, `hsla(${cell.hue}, 70%, 50%, ${0.15 * alpha})`);
          outerGradient.addColorStop(1, `hsla(${cell.hue}, 70%, 50%, ${0.3 * alpha})`);
          ctx.fillStyle = outerGradient;
          ctx.fill();

          // Haupt-Zellkörper
          ctx.beginPath();
          ctx.arc(cell.x, cell.y, displayRadius, 0, Math.PI * 2);
          const cellGradient = ctx.createRadialGradient(
            cell.x - displayRadius * 0.3,
            cell.y - displayRadius * 0.3,
            0,
            cell.x,
            cell.y,
            displayRadius
          );
          cellGradient.addColorStop(0, `hsla(${cell.hue}, ${baseHsl.s}%, ${Math.min(80, baseHsl.l + 20)}%, ${alpha})`);
          cellGradient.addColorStop(0.5, `hsla(${cell.hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${alpha})`);
          cellGradient.addColorStop(1, `hsla(${cell.hue}, ${Math.max(40, baseHsl.s - 20)}%, ${Math.max(30, baseHsl.l - 10)}%, ${alpha})`);
          ctx.fillStyle = cellGradient;
          ctx.fill();

          // Zellkern
          ctx.beginPath();
          ctx.arc(cell.x, cell.y, displayRadius * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(cell.hue + 30) % 360}, 80%, 70%, ${alpha})`;
          ctx.fill();

          // Organellen (kleine Punkte)
          const organelleCount = 3 + cell.generation;
          for (let j = 0; j < organelleCount; j++) {
            const angle = (j / organelleCount) * Math.PI * 2 + cell.age * 0.02;
            const distance = displayRadius * 0.5;
            const ox = cell.x + Math.cos(angle) * distance;
            const oy = cell.y + Math.sin(angle) * distance;

            ctx.beginPath();
            ctx.arc(ox, oy, displayRadius * 0.1, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(cell.hue + 60) % 360}, 70%, 60%, ${alpha * 0.7})`;
            ctx.fill();
          }
        });
      }

      // Verbindungslinien zwischen nahen Zellen (Zellkommunikation)
      withSafeCanvasState(ctx, () => {
        const connectionDistance = Math.min(width, height) * 0.15;

        for (let i = 0; i < state.cells.length; i++) {
          for (let j = i + 1; j < state.cells.length; j++) {
            const cell1 = state.cells[i];
            const cell2 = state.cells[j];

            const dx = cell1.x - cell2.x;
            const dy = cell1.y - cell2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < connectionDistance && Math.abs(cell1.generation - cell2.generation) <= 1) {
              const alpha = (1 - dist / connectionDistance) * 0.3;

              ctx.beginPath();
              ctx.moveTo(cell1.x, cell1.y);
              ctx.lineTo(cell2.x, cell2.y);

              const avgHue = (cell1.hue + cell2.hue) / 2;
              ctx.strokeStyle = `hsla(${avgHue}, 70%, 60%, ${alpha})`;
              ctx.lineWidth = 1 * intensity;
              ctx.stroke();
            }
          }
        }
      });
    }
  },

// ============================================================================
// 4. SCHALLWELLEN - Konzentrische Kreise
// ============================================================================
  soundWaves: {
    name_de: "Schallwellen",
    name_en: "Sound Waves",
    init(width, height) {
      visualizerState.soundWaves = {
        waves: [],
        emitters: []
      };

      // Weniger Schallquellen für bessere Performance (3 statt 5)
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

      // Etwas stärkerer Fade für weniger Überlagerung
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);

      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const now = Date.now();

      // Maximale Anzahl Wellen begrenzen für Performance
      const maxWaves = 15;

      // Für jeden Emitter Wellen erzeugen
      state.emitters.forEach((emitter, index) => {
        const freqPerEmitter = maxFreqIndex / state.emitters.length;
        const s = Math.floor(index * freqPerEmitter);
        const e = Math.max(s + 1, Math.floor((index + 1) * freqPerEmitter));

        const amplitude = averageRange(dataArray, s, e) / 255;
        const dynamicGain = calculateDynamicGain(index, state.emitters.length);
        const energy = amplitude * dynamicGain;

        // Neue Welle bei ausreichender Energie - längeres Intervall
        if (energy > 0.25 && now > emitter.nextWave && state.waves.length < maxWaves) {
          state.waves.push({
            x: emitter.x,
            y: emitter.y,
            radius: 0,
            maxRadius: (80 + energy * 200) * intensity, // Kleinere max Größe
            speed: (2 + energy * 4) * intensity,
            hue: (baseHsl.h + emitter.hue) % 360,
            thickness: (2 + energy * 4) * intensity, // Dünnere Linien
            alpha: 0.7 + energy * 0.2
          });

          // Längeres Intervall zwischen Wellen
          emitter.nextWave = now + (400 / (1 + energy));
        }
      });

      // Wellen zeichnen und updaten - vereinfacht
      withSafeCanvasState(ctx, () => {
        for (let i = state.waves.length - 1; i >= 0; i--) {
          const wave = state.waves[i];

          wave.radius += wave.speed;
          const progress = wave.radius / wave.maxRadius;

          // Welle entfernen wenn zu groß
          if (progress >= 1) {
            state.waves.splice(i, 1);
            continue;
          }

          // Fade-out
          const alpha = wave.alpha * (1 - progress);

          // NUR EIN Ring statt 3 - viel bessere Performance
          ctx.beginPath();
          ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${wave.hue}, ${baseHsl.s}%, ${50 + (1 - progress) * 30}%, ${alpha})`;
          ctx.lineWidth = wave.thickness * (1 - progress * 0.5);
          ctx.stroke();

          // Kein Shadow-Glow mehr - spart viel Performance
        }
      });

      // Emitter zeichnen - vereinfacht
      state.emitters.forEach((emitter, index) => {
        const freqPerEmitter = maxFreqIndex / state.emitters.length;
        const s = Math.floor(index * freqPerEmitter);
        const e = Math.max(s + 1, Math.floor((index + 1) * freqPerEmitter));

        const amplitude = averageRange(dataArray, s, e) / 255;
        const radius = (4 + amplitude * 10) * intensity;
        const hue = (baseHsl.h + emitter.hue) % 360;

        // Einfacher Emitter ohne Gradient
        ctx.beginPath();
        ctx.arc(emitter.x, emitter.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, ${60 + amplitude * 30}%, ${0.7 + amplitude * 0.3})`;
        ctx.fill();
      });
    }
  },

// ============================================================================
// 5. FRAKTALER BAUM - Wachsender/pulsierender Baum
// ============================================================================
  fractalTree: {
    name_de: "Fraktaler Baum",
    name_en: "Fractal Tree",
    init(width, height) {
      visualizerState.fractalTree = {
        smoothedBass: 0,
        smoothedMid: 0,
        smoothedHigh: 0,
        time: 0
      };
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.fractalTree) this.init(width, height);
      const state = visualizerState.fractalTree;
      const baseHsl = hexToHsl(color);

      state.time += 0.01;

      // Frequenzbänder
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.3), Math.floor(maxFreqIndex * 0.7)) / 255;
      const highEnergy = averageRange(dataArray, Math.floor(maxFreqIndex * 0.7), maxFreqIndex) / 255;

      // Smoothing
      state.smoothedBass = state.smoothedBass * 0.9 + bassEnergy * 0.1;
      state.smoothedMid = state.smoothedMid * 0.9 + midEnergy * 0.1;
      state.smoothedHigh = state.smoothedHigh * 0.9 + highEnergy * 0.1;

      // Rekursive Baum-Zeichen-Funktion
      const drawBranch = (x, y, length, angle, depth, energy) => {
        if (depth === 0 || length < 2) return;

        // Pulsation basierend auf Audio
        const pulse = 1 + Math.sin(state.time * 2 + depth * 0.5) * energy * 0.3;
        const effectiveLength = length * pulse * intensity;

        // End-Position berechnen
        const endX = x + Math.cos(angle) * effectiveLength;
        const endY = y + Math.sin(angle) * effectiveLength;

        // Branch-Dicke nimmt mit Tiefe ab
        const thickness = (depth / 2) * (1 + energy * 0.5) * intensity;

        // Farbe ändert sich mit Tiefe
        const depthProgress = 1 - depth / 8;
        const hue = (baseHsl.h + depthProgress * 80 + state.smoothedHigh * 40) % 360;

        // Branch zeichnen
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${30 + depthProgress * 50}%)`;
        ctx.lineWidth = thickness;
        ctx.stroke();

        // Leuchten bei hoher Energie
        if (energy > 0.5 && depth < 5) {
          ctx.shadowColor = `hsl(${hue}, ${baseHsl.s}%, 70%)`;
          ctx.shadowBlur = energy * 15 * intensity;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Blatt/Blüte am Ende bei hoher Tiefe
        if (depth <= 2) {
          const leafSize = (3 + state.smoothedHigh * 8) * intensity;
          ctx.beginPath();
          ctx.arc(endX, endY, leafSize, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(hue + 30) % 360}, 100%, 60%, ${0.6 + state.smoothedHigh * 0.4})`;
          ctx.fill();

          if (state.smoothedHigh > 0.5) {
            ctx.shadowColor = `hsl(${(hue + 30) % 360}, 100%, 70%)`;
            ctx.shadowBlur = 10 * intensity;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Rekursion - zwei Äste
        const angleVariation = (Math.PI / 6) * (1 + state.smoothedMid * 0.5);
        const lengthReduction = 0.67 + state.smoothedBass * 0.1;

        // Audio beeinflusst Branch-Energie
        const branchEnergy = energy * 0.9 + state.smoothedMid * 0.1;

        // Linker Ast
        drawBranch(
          endX, endY,
          effectiveLength * lengthReduction,
          angle - angleVariation,
          depth - 1,
          branchEnergy
        );

        // Rechter Ast
        drawBranch(
          endX, endY,
          effectiveLength * lengthReduction,
          angle + angleVariation,
          depth - 1,
          branchEnergy
        );

        // Zusätzlicher mittlerer Ast bei hoher Energie
        if (state.smoothedBass > 0.6 && depth > 4 && Math.random() > 0.7) {
          drawBranch(
            endX, endY,
            effectiveLength * lengthReduction * 0.8,
            angle + (Math.random() - 0.5) * angleVariation * 0.5,
            depth - 1,
            branchEnergy
          );
        }
      };

      // Hintergrund
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(0, 0, width, height);

      withSafeCanvasState(ctx, () => {
        // Baum von unten nach oben wachsen lassen
        const startX = width / 2;
        const startY = height * 0.9;
        const initialLength = Math.min(width, height) * 0.15;
        const initialAngle = -Math.PI / 2; // Nach oben
        const maxDepth = 8;
        const energy = (state.smoothedBass + state.smoothedMid + state.smoothedHigh) / 3;

        // Stamm zeichnen
        const trunkHeight = initialLength * 1.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX, startY - trunkHeight);
        ctx.strokeStyle = `hsl(${baseHsl.h}, ${Math.max(20, baseHsl.s - 30)}%, ${Math.max(20, baseHsl.l - 20)}%)`;
        ctx.lineWidth = (8 + state.smoothedBass * 4) * intensity;
        ctx.stroke();

        // Wurzeln
        const rootCount = 5;
        for (let i = 0; i < rootCount; i++) {
          const rootAngle = Math.PI / 2 + (i - rootCount / 2) * 0.3;
          const rootLength = trunkHeight * 0.4;
          const rootEndX = startX + Math.cos(rootAngle) * rootLength;
          const rootEndY = startY + Math.sin(rootAngle) * rootLength;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(
            startX + (rootEndX - startX) * 0.5,
            startY + (rootEndY - startY) * 0.3,
            rootEndX,
            rootEndY
          );
          ctx.strokeStyle = `hsl(${baseHsl.h}, ${Math.max(20, baseHsl.s - 30)}%, ${Math.max(15, baseHsl.l - 25)}%)`;
          ctx.lineWidth = (4 - i * 0.5) * intensity;
          ctx.stroke();
        }

        // Baum zeichnen
        drawBranch(
          startX,
          startY - trunkHeight,
          initialLength,
          initialAngle,
          maxDepth,
          energy
        );
      });
    }
  }
};
