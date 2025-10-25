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
        drops: Array.from({ length: columns }, () => 1),
        speeds: Array.from({ length: columns }, () => 0.5 + Math.random() * 1.5)
      };
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.matrixRain || visualizerState.matrixRain.columns !== Math.floor(width / 16)) {
        this.init(width, height);
      }
      const state = visualizerState.matrixRain;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${state.fontSize}px monospace`;
      const baseHsl = hexToHsl(color);
      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < state.columns; i++) {
          const [s, e] = rangeForBar(i, state.columns, bufferLength);
          const amplitude = averageRange(dataArray, s, e) / 255; // Changed variable name
          const text = String.fromCharCode(0x30A0 + Math.random() * 96);
          const x = i * state.fontSize;
          const y = state.drops[i] * state.fontSize;
          if (Math.floor(state.drops[i]) === 1) {
            ctx.fillStyle = '#c0ffc0';
          } else {
            ctx.fillStyle = `hsla(${baseHsl.h}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.5 + amplitude * 0.5})`;
          }
          if (amplitude > 0.7 && Math.random() > 0.95) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10 * amplitude;
          }
          ctx.fillText(text, x, y);
          ctx.shadowBlur = 0;
          if (y > height && Math.random() > 0.98 - amplitude * 0.1) {
            state.drops[i] = 0;
          }
          state.drops[i] += state.speeds[i] * (0.5 + amplitude * 2.5 * intensity);
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
    name_de: "Radiale Balken (Progressive-Boost)",
    name_en: "Radial Bars (Progressive Boost)",
    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      const numBars = 128;
      const centerX = w / 2;
      const centerY = h / 2;
      const maxRadius = Math.min(w, h) / 2;
      const minRadius = maxRadius * 0.15;
      const baseHsl = hexToHsl(color);
      if (visualizerState.smoothedRadialBars.length !== numBars) {
        visualizerState.smoothedRadialBars = new Array(numBars).fill(0);
      }
      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < numBars; i++) {
          const dynamicGain = calculateDynamicGain(i, numBars);
          const [s, e] = rangeForBar(i, numBars, bufferLength);
          const amplitude = averageRange(dataArray, s, e) / 255;
          const targetLength = amplitude * (maxRadius - minRadius) * dynamicGain * intensity;
          const smoothingFactor = getFrequencyBasedSmoothing(i, numBars, 0.6);
          visualizerState.smoothedRadialBars[i] = applySmoothValue(visualizerState.smoothedRadialBars[i] || 0, targetLength, smoothingFactor);
          const angle = (i / numBars) * 2 * Math.PI;
          const startX = centerX + Math.cos(angle) * minRadius;
          const startY = centerY + Math.sin(angle) * minRadius;
          const endX = centerX + Math.cos(angle) * (minRadius + visualizerState.smoothedRadialBars[i]);
          const endY = centerY + Math.sin(angle) * (minRadius + visualizerState.smoothedRadialBars[i]);
          const hue = (baseHsl.h + (i / numBars) * 180) % 360;
          ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${baseHsl.l}%)`;
          ctx.lineWidth = (2 + amplitude * 4) * intensity;
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
      withSafeCanvasState(ctx, () => {
        ctx.lineWidth = 3 * intensity;
        ctx.strokeStyle = color;
        ctx.beginPath();
        const sliceWidth = w / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = (dataArray[i] / 128.0);
          const y = (v * h) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      });
    }
  },
  circles: {
    name_de: 'Kreise (High-Freq-Boost)',
    name_en: 'Circles (High-Freq Boost)',
    draw(ctx, dataArray, bufferLength, w, h, color, intensity = 1.0) {
      const maxR = Math.min(w, h) / 2.5;
      const numCircles = 32;
      const baseHsl = hexToHsl(color);
      if (visualizerState.smoothedCircles.length !== numCircles) {
        visualizerState.smoothedCircles = new Array(numCircles).fill(0);
      }
      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < numCircles; i++) {
          const [s, e] = rangeForBar(i, numCircles, bufferLength);
          const dynamicGain = calculateDynamicGain(i, numCircles, { bassGain: 0.8, lowMidGain: 1.2, highMidGain: 1.6, highGain: 2.2, ultraHighGain: 3.5 });
          const targetRadius = (averageRange(dataArray, s, e) / 255) * maxR * dynamicGain * intensity;
          const smoothingFactor = getFrequencyBasedSmoothing(i, numCircles, 0.6);
          visualizerState.smoothedCircles[i] = applySmoothValue(visualizerState.smoothedCircles[i] || 0, targetRadius, smoothingFactor);
          if (visualizerState.smoothedCircles[i] > 1) {
            const normalizedPos = i / numCircles;
            const hue = (baseHsl.h + normalizedPos * 180) % 360;
            ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${baseHsl.l}%)`;
            ctx.lineWidth = (normalizedPos > 0.7 ? 3 : 2) * intensity;
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, visualizerState.smoothedCircles[i], 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });
    }
  },
  fluidWaves: {
    name_de: "Fluid Waves (High-Detail)",
    name_en: "Fluid Waves (High-Detail)",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const numWaves = 5;
      const baseHsl = hexToHsl(color);
      if (visualizerState.smoothedFluidWaves.length !== numWaves) {
        visualizerState.smoothedFluidWaves = Array.from({ length: numWaves }, () => new Array(100).fill(0));
      }
      for (let wave = 0; wave < numWaves; wave++) {
        const points = 100;
        const baseY = (wave + 1) * (height / numWaves) - (height / numWaves) / 2;
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseY);
        for (let i = 0; i <= points; i++) {
          const x = (i / points) * width;
          const [s, e] = rangeForBar(i, points + 1, bufferLength);
          const dynamicGain = calculateDynamicGain(i, points + 1, { bassGain: 1.0, lowMidGain: 1.2, highMidGain: 1.5, highGain: 2.0, ultraHighGain: 3.2 });
          const targetAmplitude = (averageRange(dataArray, s, e) / 255) * (height / numWaves) * 0.5 * dynamicGain;
          visualizerState.smoothedFluidWaves[wave][i] = applySmoothValue(visualizerState.smoothedFluidWaves[wave][i] || 0, targetAmplitude, 0.7);
          const y = baseY + Math.sin(x * 0.02 + wave * 1.5 + Date.now() * 0.001) * visualizerState.smoothedFluidWaves[wave][i];
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        const hue = (baseHsl.h + wave * 40) % 360;
        ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, 0.15)`;
        ctx.fill();
      }
    }
  },
  spiralGalaxy: {
    name_de: "Spiral-Galaxie (Ultra-Sparkle)",
    name_en: "Spiral Galaxy (Ultra-Sparkle)",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) / 2;
      const arms = 4;
      const pointsPerArm = Math.floor(bufferLength / arms);
      const baseHsl = hexToHsl(color);
      if (visualizerState.smoothedSpiralGalaxy.length !== arms * pointsPerArm) {
        visualizerState.smoothedSpiralGalaxy = new Array(arms * pointsPerArm).fill(0);
      }
      for (let arm = 0; arm < arms; arm++) {
        for (let i = 0; i < pointsPerArm; i++) {
          const globalIndex = arm * pointsPerArm + i;
          const [s, e] = rangeForBar(globalIndex, bufferLength, bufferLength);
          const dynamicGain = calculateDynamicGain(globalIndex, arms * pointsPerArm, { bassGain: 0.8, lowMidGain: 1.2, highMidGain: 1.8, highGain: 2.8, ultraHighGain: 4.5 });
          const targetIntensity = (averageRange(dataArray, s, e) / 255) * dynamicGain * 1.2 * intensity;
          visualizerState.smoothedSpiralGalaxy[globalIndex] = applySmoothValue(visualizerState.smoothedSpiralGalaxy[globalIndex] || 0, targetIntensity, 0.6);
          const t = i / pointsPerArm;
          const currentIntensity = visualizerState.smoothedSpiralGalaxy[globalIndex];
          const radius = t * maxRadius * (0.2 + currentIntensity * 0.8);
          const angle = arm * (2 * Math.PI / arms) + t * 5 * Math.PI + Date.now() * 0.0005;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const size = (1 + currentIntensity * (t > 0.6 ? 7 : 3)) * intensity;
          const hue = (baseHsl.h + t * 90 + arm * 20) % 360;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.5 + currentIntensity * 0.5})`;
          ctx.fill();
        }
      }
    }
  },
  bloomingMandala: {
    name_de: "Blühendes Mandala (High-Detail-Petals)",
    name_en: "Blooming Mandala (High-Detail Petals)",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const centerX = width / 2;
      const centerY = height / 2;
      const numSegments = 16;
      const baseHsl = hexToHsl(color);
      withSafeCanvasState(ctx, () => {
        ctx.translate(centerX, centerY);
        for (let i = 0; i < numSegments; i++) {
          ctx.rotate((Math.PI * 2) / numSegments);
          const [s1, e1] = rangeForBar(i, numSegments, bufferLength);
          const dynamicGain1 = calculateDynamicGain(i, numSegments, { bassGain: 1.0, lowMidGain: 1.4, highMidGain: 1.9, highGain: 2.8, ultraHighGain: 4.5 });
          const amplitude1 = (averageRange(dataArray, s1, e1) / 255) * dynamicGain1;
          const petalLength = (50 + amplitude1 * (Math.min(width, height) * 0.35)) * intensity;
          const petalWidth = (10 + (averageRange(dataArray, 0, bufferLength) / 255) * 80) * intensity;
          const hue = (baseHsl.h + i * 15) % 360;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(petalWidth, petalLength / 2, -petalWidth, petalLength / 2, 0, petalLength);
          ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${baseHsl.l}%)`;
          ctx.lineWidth = (1 + amplitude1 * 5) * intensity;
          ctx.stroke();
        }
      });
    }
  },
  rippleEffect: {
    name_de: "Wellen-Effekt (High-Freq-Bursts)",
    name_en: "Ripple Effect (High-Freq Bursts)",
    init() {
      visualizerState.ripples = [];
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      // REPARIERT: Nutze mid-range Frequenzen (10-21%) statt hoher Frequenzen
      const midStart = Math.floor(bufferLength * 0.10);
      const midEnd = Math.floor(bufferLength * 0.21);
      const midEnergy = averageRange(dataArray, midStart, midEnd) / 255;

      const baseHsl = hexToHsl(color);
      // Niedrigerer Threshold und höhere Wahrscheinlichkeit für mehr Ripples
      if (midEnergy > 0.15 && Math.random() < 0.6 * intensity) {
        visualizerState.ripples.push({
          x: Math.random() * width, y: Math.random() * height,
          radius: 0, maxRadius: (30 + midEnergy * 150) * intensity,
          hue: (baseHsl.h + Math.random() * 60) % 360, alpha: 1,
          speed: (2 + midEnergy * 3) * intensity
        });
      }
      withSafeCanvasState(ctx, () => {
        for (let i = visualizerState.ripples.length - 1; i >= 0; i--) {
          const r = visualizerState.ripples[i];
          r.radius += r.speed;
          r.alpha = 1 - (r.radius / r.maxRadius);
          if (r.alpha <= 0) {
            visualizerState.ripples.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${r.hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${r.alpha})`;
          ctx.lineWidth = 3 * intensity;
          ctx.stroke();
        }
      });
    }
  },
  networkPlexus: {
    name_de: "Netzwerk-Plexus",
    name_en: "Network Plexus",
    init(width, height) {
      const numParticles = Math.floor(width / 20);
      visualizerState.networkPlexus = { particles: [] };
      for (let i = 0; i < numParticles; i++) {
        visualizerState.networkPlexus.particles.push({
          x: Math.random() * width, y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1, vy: (Math.random() - 0.5) * 1,
          radius: 2 + Math.random() * 2,
        });
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.networkPlexus || visualizerState.networkPlexus.particles.length === 0) {
        this.init(width, height);
      }
      const state = visualizerState.networkPlexus;
      const bassAvg = averageRange(dataArray, 0, Math.floor(bufferLength * 0.1)) / 255;
      const baseHsl = hexToHsl(color);
      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        p.radius = (2 + bassAvg * 7) * intensity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
      const connectDistance = width / 8;
      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < state.particles.length; i++) {
          for (let j = i + 1; j < state.particles.length; j++) {
            const dist = Math.hypot(state.particles[i].x - state.particles[j].x, state.particles[i].y - state.particles[j].y);
            if (dist < connectDistance) {
              ctx.beginPath();
              ctx.moveTo(state.particles[i].x, state.particles[i].y);
              ctx.lineTo(state.particles[j].x, state.particles[j].y);
              ctx.strokeStyle = `hsla(${baseHsl.h}, ${baseHsl.s}%, ${baseHsl.l}%, ${1 - dist / connectDistance})`;
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
      const numLines = 30;
      const horizon = height / 2;
      const baseHsl = hexToHsl(color);
      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < numLines; i++) {
          const progress = i / numLines;
          const yOffset = horizon + (progress * progress) * (height / 2);
          const perspective = 1 - progress;
          ctx.beginPath();
          ctx.moveTo(0, yOffset);
          const sliceWidth = width / bufferLength;
          for (let j = 0; j < bufferLength; j++) {
            ctx.lineTo(j * sliceWidth, yOffset + (dataArray[j] - 128) * 0.5 * perspective * (0.3 + progress * 1.8));
          }
          const hue = (baseHsl.h + progress * 40) % 360;
          ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${20 + perspective * 50}%)`;
          ctx.lineWidth = (1 + perspective * 2) * intensity;
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
      for (let i = 0; i < 200; i++) {
        visualizerState.particleStorm.particles.push({
          x: (Math.random() - 0.5) * width, y: (Math.random() - 0.5) * height,
          z: Math.random() * 1000
        });
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.particleStorm) this.init(width, height);
      const state = visualizerState.particleStorm;
      const centerX = width / 2;
      const centerY = height / 2;
      const speed = (5 + (averageRange(dataArray, 0, Math.floor(bufferLength * 0.1)) / 255) * 25) * intensity;
      const baseHsl = hexToHsl(color);
      const highEnergy = averageRange(dataArray, Math.floor(bufferLength * 0.5), bufferLength) / 255;
      state.particles.forEach(p => {
        p.z -= speed;
        if (p.z <= 0) {
          p.x = (Math.random() - 0.5) * width;
          p.y = (Math.random() - 0.5) * height;
          p.z = 1000;
        }
        const scale = state.fov / (state.fov + p.z);
        const screenX = centerX + p.x * scale;
        const screenY = centerY + p.y * scale;
        const radius = (1 - p.z / 1000) * 5 * intensity;
        if (screenX > 0 && screenX < width && screenY > 0 && screenY < height) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(baseHsl.h + highEnergy * 60) % 360}, ${baseHsl.s}%, ${50 + highEnergy * 40}%, ${(1 - p.z / 1000) * 0.8})`;
          ctx.fill();
        }
      });
    }
  },
  frequencyBlossoms: {
    name_de: "Frequenz-Blüten (Dynamischer Beat)",
    name_en: "Frequency Blossoms (Dynamic Beat)",
    init(width, height) {
      visualizerState.singleBlossom = {
        x: width / 2, y: height / 2, life: 999, maxLife: 80,
        petals: 16, maxRadius: 300, hue: 280, smoothedEnergy: 0
      };
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.singleBlossom) this.init(width, height);
      const b = visualizerState.singleBlossom;
      const baseHsl = hexToHsl(color);
      b.x = width / 2; b.y = height / 2;

      // OPTIMIERT: Nutze niedrigere Frequenzen (0-21%) für bessere Beat-Erkennung
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const beatEnergy = averageRange(dataArray, 5, Math.min(40, maxFreqIndex)) / 255;
      b.smoothedEnergy = (b.smoothedEnergy * 0.92) + (beatEnergy * 0.08); // Schnellere Reaktion

      // GELOCKERT: Niedrigerer Threshold und kürzere Wartezeit
      if (beatEnergy > b.smoothedEnergy * 1.15 && beatEnergy > 0.05 * intensity && b.life > b.maxLife * 0.15) {
        b.life = 1;
        b.maxRadius = (250 + beatEnergy * 400) * intensity;
        b.petals = 12 + Math.floor(beatEnergy * 12);
        b.hue = baseHsl.h;
      }
      if (b.life <= b.maxLife) {
        const progress = b.life / b.maxLife;
        const easeOutProgress = Math.sin(progress * Math.PI);
        withSafeCanvasState(ctx, () => {
          ctx.translate(b.x, b.y);
          for (let p = 0; p < b.petals; p++) {
            const angle = (p / b.petals) * Math.PI * 2 + progress * Math.PI;
            const radius = easeOutProgress * b.maxRadius;
            const x2 = Math.cos(angle) * radius, y2 = Math.sin(angle) * radius;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(x2 / 2, y2 / 2, x2, y2);
            ctx.strokeStyle = `hsla(${(b.hue + p * 10) % 360}, ${baseHsl.s}%, ${60 + (1 - progress) * 40}%, ${easeOutProgress})`;
            ctx.lineWidth = 5 * easeOutProgress * intensity;
            ctx.stroke();
          }
        });
        b.life++;
      }
    }
  },
  centralGlowBlossom: {
    name_de: "Zentrale Leuchtblüte (Vibrierend)",
    name_en: "Central Glow Blossom (Vibrating)",
    init(width, height) {
      visualizerState.blossom = {
        x: width / 2, y: height / 2, life: 999, maxLife: 70,
        petals: 32, maxRadius: 350, hue: 300
      };
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.blossom) this.init(width, height);
      const b = visualizerState.blossom;
      const baseHsl = hexToHsl(color);
      b.x = width / 2; b.y = height / 2;
      const midHitValue = averageRange(dataArray, 10, 50) / 255;
      if (midHitValue > CONSTANTS.BEAT_THRESHOLD && b.life > b.maxLife * 0.5) {
        b.life = 1;
        b.maxRadius = (200 + midHitValue * 400) * intensity;
        b.hue = baseHsl.h;
      }
      if (b.life <= b.maxLife) {
        const progress = b.life / b.maxLife;
        const easeOutProgress = Math.sin(progress * Math.PI);
        withSafeCanvasState(ctx, () => {
          ctx.translate(b.x, b.y);
          for (let p = 0; p < b.petals; p++) {
            const freqIndex = Math.floor((p / b.petals) * (bufferLength * 0.75));
            const freqValue = dataArray[freqIndex] / 255;
            const dynamicRadius = (easeOutProgress * b.maxRadius) + (freqValue * 100 * easeOutProgress);
            const angle = (p / b.petals) * Math.PI * 2;
            const x2 = Math.cos(angle) * dynamicRadius, y2 = Math.sin(angle) * dynamicRadius;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x2, y2);
            ctx.strokeStyle = `hsla(${b.hue}, ${baseHsl.s}%, ${60 + freqValue * 40}%, ${easeOutProgress})`;
            ctx.lineWidth = (2 + freqValue * 4) * intensity;
            ctx.stroke();
          }
        });
        b.life++;
      }
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
      const horizon = height * 0.4 + (averageRange(dataArray, 0, 10) / 255) * 30 * intensity;
      const vanishingPointX = width / 2;
      const numHLines = 15;
      const baseHsl = hexToHsl(color);
      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < numHLines; i++) {
          const progress = i / numHLines;
          const y = horizon + progress * progress * (height - horizon);
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y);
          ctx.strokeStyle = `hsla(${baseHsl.h}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.1 + (1 - progress) * 0.5})`;
          ctx.lineWidth = (1 + (1 - progress) * 3) * intensity;
          ctx.stroke();
        }
        const numVLines = 20;
        for (let i = 0; i <= numVLines; i++) {
          const progress = i / numVLines;
          ctx.beginPath(); ctx.moveTo(progress * width, height); ctx.lineTo(vanishingPointX, horizon);
          ctx.strokeStyle = `hsla(${(baseHsl.h + 60) % 360}, ${baseHsl.s}%, ${baseHsl.l}%, ${0.1 + (1 - Math.abs(progress - 0.5)) * 0.4})`;
          ctx.lineWidth = 2 * intensity;
          ctx.stroke();
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
      const sliceWidth = width / bufferLength;
      const baseHsl = hexToHsl(color);
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] / 128.0) - 1.0;
        const x = i * sliceWidth;
        const y = centerY + v * (height / 3);
        const amplitude = Math.abs(v);
        const size = (1 + amplitude * 8) * intensity;
        const alpha = 0.5 + amplitude * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(baseHsl.h + v * 30) % 360}, ${baseHsl.s}%, ${baseHsl.l}%, ${alpha})`;
        ctx.fill();
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
      const columns = Math.floor(width / 20);
      visualizerState.digitalRain = {
        columns,
        drops: Array.from({ length: columns }, () => ({
          y: Math.random() * height,
          speed: 2 + Math.random() * 8,
          intensity: 0
        }))
      };
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.digitalRain) this.init(width, height);
      const state = visualizerState.digitalRain;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      const baseHsl = hexToHsl(color);
      const columnWidth = width / state.columns;
      for (let i = 0; i < state.columns; i++) {
        const [s, e] = rangeForBar(i, state.columns, bufferLength);
        const amplitude = averageRange(dataArray, s, e) / 255;
        const drop = state.drops[i];
        drop.intensity = amplitude;
        drop.speed = (2 + amplitude * 10) * intensity;
        for (let j = 0; j < 8; j++) {
          const segmentY = drop.y - j * 25;
          const alpha = (1 - j / 8) * (0.3 + amplitude * 0.7);
          if (segmentY > -25 && segmentY < height + 25) {
            const hue = (baseHsl.h + amplitude * 120) % 360;
            ctx.fillStyle = `hsla(${hue}, ${baseHsl.s}%, ${50 + amplitude * 40}%, ${alpha})`;
            ctx.fillRect(i * columnWidth, segmentY, columnWidth - 2, 20);
          }
        }
        drop.y += drop.speed;
        if (drop.y > height + 100) drop.y = -100;
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
      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < numBeams; i++) {
          // Audio-Daten über alle Strahlen verteilen (wiederholen wenn nötig)
          const dataIndex = Math.floor((i / numBeams) * bufferLength) % bufferLength;
          const sampleSize = Math.max(1, Math.floor(bufferLength / numBeams));
          const s = dataIndex;
          const e = Math.min(bufferLength, dataIndex + sampleSize);
          const amplitude = Math.max(0.15, averageRange(dataArray, s, e) / 255);
          const dynamicGain = calculateDynamicGain(i, numBeams);
          const angle = (i / numBeams) * Math.PI * 2;
          const length = amplitude * dynamicGain * Math.min(width, height) * 0.6;
          const beamWidth = (2 + amplitude * 8) * intensity;
          const x1 = centerX + Math.cos(angle) * 50;
          const y1 = centerY + Math.sin(angle) * 50;
          const x2 = centerX + Math.cos(angle) * (50 + length);
          const y2 = centerY + Math.sin(angle) * (50 + length);
          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          // Regenbogenfarben über 360 Grad verteilt
          const hue = (i / numBeams) * 360;
          gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.8 + amplitude * 0.2})`);
          gradient.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = beamWidth;
          ctx.stroke();
          if (amplitude > 0.6) {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${amplitude * 0.5})`;
            ctx.lineWidth = beamWidth * 0.5;
            ctx.stroke();
          }
        }
      });
    }
  },
  synthWave: {
    name_de: "Synth-Wave",
    name_en: "Synth Wave",
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      const horizon = height * 0.6;
      const numLines = 20;
      const baseHsl = hexToHsl(color);
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, `hsl(${(baseHsl.h + 180) % 360}, ${baseHsl.s * 0.3}%, 5%)`);
      bgGradient.addColorStop(0.6, `hsl(${baseHsl.h}, ${baseHsl.s * 0.2}%, 2%)`);
      bgGradient.addColorStop(1, 'black');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);
      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < numLines; i++) {
          const progress = i / numLines;
          const y = horizon + progress * progress * (height - horizon);
          const perspectiveScale = 1 - (progress * 0.7);
          const bassBoost = averageRange(dataArray, 0, Math.floor(bufferLength * 0.1)) / 255;
          const distortion = Math.sin(Date.now() * 0.001 + progress * 5) * bassBoost * 10 * intensity;
          ctx.beginPath();
          const segments = 50;
          for (let j = 0; j <= segments; j++) {
            const x = (j / segments) * width;
            const [s, e] = rangeForBar(j, segments, bufferLength);
            const amplitude = averageRange(dataArray, s, e) / 255;
            const waveY = y + distortion + Math.sin(x * 0.01 + Date.now() * 0.002) * amplitude * 20 * perspectiveScale * intensity;
            if (j === 0) ctx.moveTo(x, waveY);
            else ctx.lineTo(x, waveY);
          }
          const alpha = (1 - progress) * 0.8;
          const hue = (baseHsl.h + progress * 60) % 360;
          ctx.strokeStyle = `hsla(${hue}, ${baseHsl.s}%, ${50 + progress * 30}%, ${alpha})`;
          ctx.lineWidth = 1 + (1 - progress) * 2;
          ctx.stroke();
        }
        const numVerticals = 15;
        for (let i = 0; i <= numVerticals; i++) {
          const x = (i / numVerticals) * width;
          const vanishY = horizon - 50;
          ctx.beginPath();
          ctx.moveTo(x, height);
          ctx.lineTo(width * 0.5, vanishY);
          const centerDistance = Math.abs(x - width * 0.5) / (width * 0.5);
          const alpha = (1 - centerDistance) * 0.3;
          ctx.strokeStyle = `hsla(${(baseHsl.h + 40) % 360}, ${baseHsl.s}%, ${baseHsl.l}%, ${alpha})`;
          ctx.lineWidth = 1 * intensity;
          ctx.stroke();
        }
      });
    }
  },
  cosmicNebula: {
    name_de: "Kosmischer Nebel",
    name_en: "Cosmic Nebula",
    init(width, height) {
      visualizerState.cosmicNebula = { particles: [] };
      for (let i = 0; i < 300; i++) {
        visualizerState.cosmicNebula.particles.push({
          x: Math.random() * width, y: Math.random() * height,
          baseX: Math.random() * width, baseY: Math.random() * height,
          radius: 1 + Math.random() * 3, hueOffset: Math.random() * 60,
          speed: 0.2 + Math.random() * 0.5
        });
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.cosmicNebula || visualizerState.cosmicNebula.particles.length === 0) {
        this.init(width, height);
      }
      const state = visualizerState.cosmicNebula;
      const baseHsl = hexToHsl(color);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(bufferLength * 0.15)) / 255;
      const midEnergy = averageRange(dataArray, Math.floor(bufferLength * 0.3), Math.floor(bufferLength * 0.6)) / 255;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(0, 0, width, height);
      state.particles.forEach((p, index) => {
        const freqIndex = Math.floor((index / state.particles.length) * bufferLength);
        const amplitude = (dataArray[freqIndex] || 0) / 255;
        const orbitRadius = (50 + bassEnergy * 100) * intensity;
        const angle = Date.now() * 0.0001 * p.speed + index;
        p.x = p.baseX + Math.cos(angle) * orbitRadius * amplitude;
        p.y = p.baseY + Math.sin(angle) * orbitRadius * amplitude;
        const hue = (baseHsl.h + p.hueOffset + midEnergy * 40) % 360;
        const particleSize = p.radius * (1 + amplitude * intensity);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, particleSize * 4);
        gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, 70%, ${0.8 * amplitude * intensity})`);
        gradient.addColorStop(0.5, `hsla(${hue}, ${baseHsl.s}%, 50%, ${0.3 * amplitude * intensity})`);
        gradient.addColorStop(1, `hsla(${hue}, ${baseHsl.s}%, 30%, 0)`);
        ctx.beginPath(); ctx.arc(p.x, p.y, particleSize * 4, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2); ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${80 + amplitude * 20}%)`; ctx.fill();
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
      visualizerState.liquidCrystals = { crystals: [], numCrystals: 40 };
      for (let i = 0; i < 40; i++) {
        visualizerState.liquidCrystals.crystals.push({
          x: Math.random() * width, y: Math.random() * height,
          vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          size: 10 + Math.random() * 20, smoothedSize: 10 + Math.random() * 20
        });
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.liquidCrystals) this.init(width, height);
      const state = visualizerState.liquidCrystals;
      const baseHsl = hexToHsl(color);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);
      state.crystals.forEach((crystal, index) => {
        const [s, e] = rangeForBar(index, state.numCrystals, bufferLength);
        const amplitude = averageRange(dataArray, s, e) / 255;
        const dynamicGain = calculateDynamicGain(index, state.numCrystals);
        const effectiveAmplitude = amplitude * dynamicGain * intensity;
        crystal.x += crystal.vx * (1 + effectiveAmplitude * 2);
        crystal.y += crystal.vy * (1 + effectiveAmplitude * 2);
        crystal.rotation += crystal.rotationSpeed * (1 + effectiveAmplitude);
        if (crystal.x < 0 || crystal.x > width) crystal.vx *= -1;
        if (crystal.y < 0 || crystal.y > height) crystal.vy *= -1;
        const targetSize = crystal.size * (1 + effectiveAmplitude * 1.5);
        crystal.smoothedSize = applySmoothValue(crystal.smoothedSize, targetSize, 0.3);
        withSafeCanvasState(ctx, () => {
          ctx.translate(crystal.x, crystal.y);
          ctx.rotate(crystal.rotation);
          const sides = 6;
          const hue = (baseHsl.h + (index / state.numCrystals) * 180) % 360;
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const x = Math.cos(angle) * crystal.smoothedSize;
            const y = Math.sin(angle) * crystal.smoothedSize;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, crystal.smoothedSize);
          gradient.addColorStop(0, `hsla(${hue}, ${baseHsl.s}%, 70%, ${0.7 + effectiveAmplitude * 0.3})`);
          gradient.addColorStop(1, `hsla(${hue}, ${baseHsl.s}%, 30%, ${0.3 + effectiveAmplitude * 0.5})`);
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.strokeStyle = `hsl(${hue}, ${baseHsl.s}%, ${80 + effectiveAmplitude * 20}%)`;
          ctx.lineWidth = (1 + effectiveAmplitude * 2) * intensity;
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
      visualizerState.electricWeb = { nodes: [] };
      for (let i = 0; i < 30; i++) {
        visualizerState.electricWeb.nodes.push({
          x: Math.random() * width, y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
          charge: 0
        });
      }
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.electricWeb) this.init(width, height);
      const state = visualizerState.electricWeb;
      const baseHsl = hexToHsl(color);
      state.nodes.forEach((node, index) => {
        const [s, e] = rangeForBar(index, state.nodes.length, bufferLength);
        const amplitude = averageRange(dataArray, s, e) / 255;
        node.charge = amplitude * intensity;
        node.x += node.vx; node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        const nodeSize = (2 + node.charge * 8) * intensity;
        const hue = (baseHsl.h + (index / state.nodes.length) * 120) % 360;
        ctx.beginPath(); ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, ${baseHsl.s}%, ${60 + node.charge * 40}%)`;
        ctx.fill();
        if (node.charge > 0.4) {
          ctx.shadowColor = `hsl(${hue}, ${baseHsl.s}%, 80%)`;
          ctx.shadowBlur = node.charge * 20 * intensity;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      const connectionDistance = width / 5;
      withSafeCanvasState(ctx, () => {
        for (let i = 0; i < state.nodes.length; i++) {
          for (let j = i + 1; j < state.nodes.length; j++) {
            const dx = state.nodes[i].x - state.nodes[j].x;
            const dy = state.nodes[i].y - state.nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < connectionDistance) {
              const combinedCharge = (state.nodes[i].charge + state.nodes[j].charge) / 2;
              if (combinedCharge > 0.2) {
                const segments = 8;
                ctx.beginPath(); ctx.moveTo(state.nodes[i].x, state.nodes[i].y);
                for (let k = 1; k < segments; k++) {
                  const t = k / segments;
                  const x = state.nodes[i].x + dx * t;
                  const y = state.nodes[i].y + dy * t;
                  const jitter = (Math.random() - 0.5) * combinedCharge * 20 * intensity;
                  ctx.lineTo(x + jitter, y + jitter);
                }
                ctx.lineTo(state.nodes[j].x, state.nodes[j].y);
                const hue = (baseHsl.h + (i + j) * 10) % 360;
                const alpha = (1 - dist / connectionDistance) * combinedCharge;
                ctx.strokeStyle = `hsla(${hue}, ${baseHsl.s}%, ${70 + combinedCharge * 30}%, ${alpha})`;
                ctx.lineWidth = (1 + combinedCharge * 3) * intensity;
                ctx.stroke();
              }
            }
          }
        }
      });
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
        lastPulse: 0,
        smoothedBass: 0,
        bassHistory: [],  // NEU: Beat-History für bessere Erkennung
        avgBass: 0        // NEU: Durchschnitt für Threshold
      };
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.heartbeat) this.init(width, height);
      const state = visualizerState.heartbeat;

      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;

      // VERBESSERT: Smoothing mit weniger Trägheit
      state.smoothedBass = state.smoothedBass * 0.7 + bassEnergy * 0.3;

      // NEU: Rolling Average für dynamischen Threshold
      state.bassHistory.push(bassEnergy);
      if (state.bassHistory.length > 30) {
        state.bassHistory.shift();
      }
      state.avgBass = state.bassHistory.reduce((a, b) => a + b, 0) / state.bassHistory.length;

      // VERBESSERT: Beat-Erkennung mit dynamischem Threshold
      const now = Date.now();
      const timeSinceLastPulse = now - state.lastPulse;
      const minTimeBetweenBeats = 200; // Mindestens 200ms zwischen Beats
      const maxTimeBetweenBeats = 2000; // Maximal 2s, dann Force-Beat

      // Dynamischer Threshold basierend auf History
      const dynamicThreshold = Math.max(0.15, state.avgBass * 1.2);

      // Beat-Trigger-Bedingungen (flexibler!)
      const isStrongBeat = bassEnergy > dynamicThreshold && bassEnergy > state.smoothedBass * 1.15;
      const hasWaitedLongEnough = timeSinceLastPulse > minTimeBetweenBeats;
      const forceBeat = timeSinceLastPulse > maxTimeBetweenBeats && bassEnergy > 0.1;

      if ((isStrongBeat && hasWaitedLongEnough) || forceBeat) {
        state.targetScale = 1.25 + bassEnergy * 0.5 * intensity;
        state.lastPulse = now;
        state.pulseCount++;
      }

      // Scale Animation (schneller zurück zur Ruhe)
      state.scale = state.scale * 0.88 + state.targetScale * 0.12;
      state.targetScale = state.targetScale * 0.94 + 1.0 * 0.06;

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

      // Start mit einer Zelle in der Mitte
      visualizerState.cellGrowth.cells.push({
        x: width / 2,
        y: height / 2,
        radius: 5,
        targetRadius: 20,
        hue: Math.random() * 360,
        age: 0,
        maxAge: 200,
        generation: 0
      });
    },
    draw(ctx, dataArray, bufferLength, width, height, color, intensity = 1.0) {
      if (!visualizerState.cellGrowth) this.init(width, height);
      const state = visualizerState.cellGrowth;
      const baseHsl = hexToHsl(color);

      // Leichter Fade für Trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      ctx.fillRect(0, 0, width, height);

      // Audio-Energie berechnen
      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const overallEnergy = averageRange(dataArray, 0, maxFreqIndex) / 255;
      const bassEnergy = averageRange(dataArray, 0, Math.floor(maxFreqIndex * 0.3)) / 255;

      // Neue Zelle spawnen bei hoher Energie
      const now = Date.now();
      if (overallEnergy > 0.5 && now > state.nextSpawn && state.cells.length < 50) {
        const parentIdx = Math.floor(Math.random() * Math.min(5, state.cells.length));
        const parent = state.cells[parentIdx];

        if (parent && parent.radius > parent.targetRadius * 0.7) {
          const angle = Math.random() * Math.PI * 2;
          const distance = parent.radius * 1.5;

          state.cells.push({
            x: parent.x + Math.cos(angle) * distance,
            y: parent.y + Math.sin(angle) * distance,
            radius: 3,
            targetRadius: 15 + overallEnergy * 20,
            hue: (parent.hue + 20 + Math.random() * 40) % 360,
            age: 0,
            maxAge: 150 + Math.random() * 100,
            generation: parent.generation + 1
          });

          state.nextSpawn = now + 100 / intensity;
        }
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

      // Mehrere Schallquellen erstellen
      const numEmitters = 5;
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

      // Leichter Fade
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);

      const maxFreqIndex = Math.floor(bufferLength * 0.21);
      const now = Date.now();

      // Für jeden Emitter Wellen erzeugen
      state.emitters.forEach((emitter, index) => {
        const freqPerEmitter = maxFreqIndex / state.emitters.length;
        const s = Math.floor(index * freqPerEmitter);
        const e = Math.max(s + 1, Math.floor((index + 1) * freqPerEmitter));

        const amplitude = averageRange(dataArray, s, e) / 255;
        const dynamicGain = calculateDynamicGain(index, state.emitters.length);
        const energy = amplitude * dynamicGain;

        // Neue Welle bei ausreichender Energie
        if (energy > 0.2 && now > emitter.nextWave) {
          state.waves.push({
            x: emitter.x,
            y: emitter.y,
            radius: 0,
            maxRadius: (100 + energy * 300) * intensity,
            speed: (2 + energy * 5) * intensity,
            hue: (baseHsl.h + emitter.hue) % 360,
            thickness: (2 + energy * 6) * intensity,
            alpha: 0.8 + energy * 0.2
          });

          emitter.nextWave = now + (300 / (1 + energy * 2));
        }
      });

      // Wellen zeichnen und updaten
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

          // Interferenzmuster (mehrere Ringe)
          const rings = 3;
          for (let r = 0; r < rings; r++) {
            const ringRadius = wave.radius - r * 15;
            if (ringRadius > 0) {
              ctx.beginPath();
              ctx.arc(wave.x, wave.y, ringRadius, 0, Math.PI * 2);

              const ringAlpha = alpha * (1 - r / rings);
              ctx.strokeStyle = `hsla(${wave.hue}, ${baseHsl.s}%, ${baseHsl.l}%, ${ringAlpha})`;
              ctx.lineWidth = wave.thickness * (1 - r / rings);
              ctx.stroke();

              // Leuchten bei hoher Amplitude
              if (wave.thickness > 5) {
                ctx.shadowColor = `hsl(${wave.hue}, ${baseHsl.s}%, ${baseHsl.l}%)`;
                ctx.shadowBlur = wave.thickness * 2;
                ctx.stroke();
                ctx.shadowBlur = 0;
              }
            }
          }

          // Partikel an der Wellenfront
          if (progress < 0.8 && wave.thickness > 4) {
            const particleCount = Math.floor(wave.radius / 20);
            for (let p = 0; p < particleCount; p++) {
              const angle = (p / particleCount) * Math.PI * 2;
              const px = wave.x + Math.cos(angle) * wave.radius;
              const py = wave.y + Math.sin(angle) * wave.radius;

              ctx.beginPath();
              ctx.arc(px, py, 2 * intensity, 0, Math.PI * 2);
              ctx.fillStyle = `hsla(${wave.hue}, 100%, 70%, ${alpha})`;
              ctx.fill();
            }
          }
        }
      });

      // Emitter zeichnen
      state.emitters.forEach((emitter, index) => {
        const freqPerEmitter = maxFreqIndex / state.emitters.length;
        const s = Math.floor(index * freqPerEmitter);
        const e = Math.max(s + 1, Math.floor((index + 1) * freqPerEmitter));

        const amplitude = averageRange(dataArray, s, e) / 255;
        const radius = (5 + amplitude * 15) * intensity;

        // Emitter-Glow
        ctx.beginPath();
        ctx.arc(emitter.x, emitter.y, radius * 2, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(
          emitter.x, emitter.y, 0,
          emitter.x, emitter.y, radius * 2
        );
        const hue = (baseHsl.h + emitter.hue) % 360;
        glowGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${amplitude * 0.6})`);
        glowGradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Emitter-Kern
        ctx.beginPath();
        ctx.arc(emitter.x, emitter.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, 100%, ${60 + amplitude * 40}%)`;
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
