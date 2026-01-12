/**
 * EasingFunctions - Collection of easing functions for audio-reactive effects
 * Pure functions for smooth transitions and animations
 *
 * @module audio/EasingFunctions
 */

/**
 * Linear easing - no acceleration
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function linear(t) {
  return clamp(t);
}

/**
 * Ease In - slow start, accelerates to end
 * Cubic curve (t^3)
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function easeIn(t) {
  const c = clamp(t);
  return c * c * c;
}

/**
 * Ease Out - fast start, decelerates to end
 * Cubic curve
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function easeOut(t) {
  const c = clamp(t);
  return 1 - Math.pow(1 - c, 3);
}

/**
 * Ease In Out - slow start and end, fast in middle
 * Cubic curve
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function easeInOut(t) {
  const c = clamp(t);
  return c < 0.5
    ? 4 * c * c * c
    : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/**
 * Bounce - spring/bounce effect
 * Simulates bouncing ball physics
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function bounce(t) {
  const c = clamp(t);
  const n1 = 7.5625;
  const d1 = 2.75;

  if (c < 1 / d1) {
    return n1 * c * c;
  } else if (c < 2 / d1) {
    const t2 = c - 1.5 / d1;
    return n1 * t2 * t2 + 0.75;
  } else if (c < 2.5 / d1) {
    const t2 = c - 2.25 / d1;
    return n1 * t2 * t2 + 0.9375;
  } else {
    const t2 = c - 2.625 / d1;
    return n1 * t2 * t2 + 0.984375;
  }
}

/**
 * Elastic - elastic spring effect
 * Overshoots and oscillates before settling
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function elastic(t) {
  const c = clamp(t);
  if (c === 0 || c === 1) return c;

  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * c) * Math.sin((c * 10 - 0.75) * c4) + 1;
}

/**
 * Punch - strong attack effect for beats
 * Quick rise with subtle oscillation
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function punch(t) {
  const c = clamp(t);
  return Math.pow(c, 0.5) * (1 + Math.sin(c * Math.PI) * 0.3);
}

/**
 * Exponential In - very slow start, explosive end
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function exponentialIn(t) {
  const c = clamp(t);
  return c === 0 ? 0 : Math.pow(2, 10 * c - 10);
}

/**
 * Exponential Out - explosive start, gentle end
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function exponentialOut(t) {
  const c = clamp(t);
  return c === 1 ? 1 : 1 - Math.pow(2, -10 * c);
}

/**
 * Sine In - gentle acceleration
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function sineIn(t) {
  const c = clamp(t);
  return 1 - Math.cos((c * Math.PI) / 2);
}

/**
 * Sine Out - gentle deceleration
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function sineOut(t) {
  const c = clamp(t);
  return Math.sin((c * Math.PI) / 2);
}

/**
 * Back In - slight pullback before acceleration
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function backIn(t) {
  const c = clamp(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * c * c * c - c1 * c * c;
}

/**
 * Back Out - overshoots then settles
 * @param {number} t - Input value (0-1)
 * @returns {number} Output value (0-1)
 */
export function backOut(t) {
  const c = clamp(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
}

/**
 * Clamps value to 0-1 range
 * @param {number} value - Value to clamp
 * @returns {number} Clamped value
 */
function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * Map of all available easing functions
 */
export const easingMap = {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  bounce,
  elastic,
  punch,
  exponentialIn,
  exponentialOut,
  sineIn,
  sineOut,
  backIn,
  backOut
};

/**
 * List of all available easing function names
 */
export const easingNames = Object.keys(easingMap);

/**
 * Applies easing function by name
 * @param {number} value - Input value (0-1)
 * @param {string} easingType - Name of easing function
 * @returns {number} Output value with easing applied
 */
export function applyEasing(value, easingType = 'linear') {
  const easingFn = easingMap[easingType];
  if (easingFn) {
    return easingFn(value);
  }
  return linear(value);
}

export default {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  bounce,
  elastic,
  punch,
  exponentialIn,
  exponentialOut,
  sineIn,
  sineOut,
  backIn,
  backOut,
  easingMap,
  easingNames,
  applyEasing
};
