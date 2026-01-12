/**
 * Helper functions for audio visualizers
 * @module visualizers/core/helpers
 */

import { CONSTANTS } from './constants.js';

/**
 * Exponential mapping from [0,1] to [0,1] with adjustable base
 * @param {number} u - Input value (0 to 1)
 * @param {number} base - Exponential base (default 4)
 * @returns {number} Mapped value (0 to 1)
 */
export function expo01(u, base = 4) {
  return (Math.pow(base, Math.min(1, Math.max(0, u))) - 1) / (base - 1);
}

/**
 * Calculate frequency range for a given bar index using logarithmic mapping
 * @param {number} i - Bar index
 * @param {number} totalBars - Total number of bars
 * @param {number} dataSize - Size of frequency data array
 * @returns {[number, number]} Start and end indices for the frequency range
 */
export function rangeForBar(i, totalBars, dataSize) {
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
export function averageRange(arr, start, end) {
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
export function calculateDynamicGain(barIndex, totalBars, settings = {}) {
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
export function getFrequencyBasedSmoothing(barIndex, totalBars, baseSmoothingFactor = CONSTANTS.SMOOTHING_BASE) {
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
export function applySmoothValue(current, target, factor) {
  return current + (target - current) * factor;
}

/**
 * Safe canvas state wrapper
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Function} drawFunction - Function to execute with safe state
 */
export function withSafeCanvasState(ctx, drawFunction) {
  ctx.save();
  try {
    drawFunction();
  } finally {
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ✨ PERFORMANCE UTILITIES - Optimized Canvas Rendering
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Batch canvas style changes to minimize state manipulation
 * Sets multiple style properties at once, only if they differ from current values
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} styles - Style properties to set
 */
export function batchStyleChanges(ctx, styles) {
  for (const [key, value] of Object.entries(styles)) {
    if (value !== undefined && ctx[key] !== value) {
      ctx[key] = value;
    }
  }
}

/**
 * Optimized rotation loop helper - avoids save/restore inside loops
 * Uses mathematical rotation instead of canvas state changes
 * @param {number} count - Number of segments
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {Function} callback - Function(index, angle, cos, sin) for each segment
 */
export function forEachRotatedSegment(count, centerX, centerY, callback) {
  const angleStep = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const angle = i * angleStep;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    callback(i, angle, cos, sin);
  }
}

/**
 * Pre-calculated gradient cache for reuse across frames
 * Reduces gradient creation overhead in animation loops
 */
const gradientCache = new Map();

/**
 * Creates or retrieves a cached radial gradient
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} key - Unique cache key
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} r1 - Inner radius
 * @param {number} r2 - Outer radius
 * @param {Array} colorStops - Array of [offset, color] pairs
 * @returns {CanvasGradient} Cached or new gradient
 */
export function getCachedRadialGradient(ctx, key, x, y, r1, r2, colorStops) {
  const cacheKey = `${key}_${r1.toFixed(0)}_${r2.toFixed(0)}`;

  // Check if we have a valid cached gradient
  if (!gradientCache.has(cacheKey)) {
    const gradient = ctx.createRadialGradient(x, y, r1, x, y, r2);
    colorStops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    gradientCache.set(cacheKey, gradient);

    // Limit cache size
    if (gradientCache.size > 100) {
      const firstKey = gradientCache.keys().next().value;
      gradientCache.delete(firstKey);
    }
  }

  return gradientCache.get(cacheKey);
}

/**
 * Clears the gradient cache (call on visualizer change or resize)
 */
export function clearGradientCache() {
  gradientCache.clear();
}

/**
 * Optimized shadow effect - only applies when needed and resets efficiently
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {boolean} condition - Whether to apply shadow
 * @param {string} color - Shadow color
 * @param {number} blur - Shadow blur amount
 * @param {Function} drawFn - Drawing function to execute
 */
export function withConditionalShadow(ctx, condition, color, blur, drawFn) {
  if (condition) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    drawFn();
    ctx.shadowBlur = 0;
  } else {
    drawFn();
  }
}

/**
 * Batch multiple arc drawings without individual beginPath calls
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} arcs - Array of {x, y, radius, startAngle, endAngle, fillStyle}
 */
export function batchArcs(ctx, arcs) {
  // Group arcs by fillStyle for efficient rendering
  const groups = new Map();

  for (const arc of arcs) {
    const key = arc.fillStyle || 'default';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(arc);
  }

  for (const [fillStyle, group] of groups) {
    if (fillStyle !== 'default') {
      ctx.fillStyle = fillStyle;
    }

    for (const arc of group) {
      ctx.beginPath();
      ctx.arc(arc.x, arc.y, arc.radius, arc.startAngle || 0, arc.endAngle || Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Transform coordinates for rotated drawing without canvas rotation
 * @param {number} x - Local X coordinate
 * @param {number} y - Local Y coordinate
 * @param {number} angle - Rotation angle in radians
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @returns {Object} Transformed {x, y} coordinates
 */
export function rotatePoint(x, y, angle, centerX = 0, centerY = 0) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: centerX + x * cos - y * sin,
    y: centerY + x * sin + y * cos
  };
}

/**
 * Draw a rounded rectangle (bar) with optional glow effect
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {number} radius - Corner radius
 * @param {Object} options - Optional settings for glow effect
 */
export function drawRoundedBar(ctx, x, y, width, height, radius, options = {}) {
  const { glow = false, glowColor = null, glowBlur = 15, glowIntensity = 0.6 } = options;

  // Ensure radius doesn't exceed half of width or height
  const r = Math.min(radius, width / 2, Math.abs(height) / 2);

  if (height === 0) return;

  ctx.beginPath();

  if (height > 0) {
    // Drawing upward (normal bars)
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y - r, r);
    ctx.lineTo(x + width, y - height + r);
    ctx.arcTo(x + width, y - height, x + width - r, y - height, r);
    ctx.lineTo(x + r, y - height);
    ctx.arcTo(x, y - height, x, y - height + r, r);
    ctx.lineTo(x, y - r);
    ctx.arcTo(x, y, x + r, y, r);
  } else {
    // Drawing downward (mirrored bars)
    const absHeight = Math.abs(height);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + absHeight - r);
    ctx.arcTo(x + width, y + absHeight, x + width - r, y + absHeight, r);
    ctx.lineTo(x + r, y + absHeight);
    ctx.arcTo(x, y + absHeight, x, y + absHeight - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }

  ctx.closePath();

  // Apply glow effect if enabled
  if (glow && glowColor) {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur * glowIntensity;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fill();
    ctx.restore();
  }

  ctx.fill();
}
