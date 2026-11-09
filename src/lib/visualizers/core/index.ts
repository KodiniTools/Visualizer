/**
 * Core module exports for visualizers
 * @module visualizers/core
 */

export { CONSTANTS } from './constants'
export { visualizerState } from './state'
export { hexToHsl } from './colorUtils'
export { Particle } from './Particle'
export { onsetFlourish } from './onsetFlourish'
export {
  expo01,
  rangeForBar,
  averageRange,
  calculateDynamicGain,
  getFrequencyBasedSmoothing,
  applySmoothValue,
  applyDecay,
  withSafeCanvasState,
  drawRoundedBar,
  // ✨ Performance utilities
  batchStyleChanges,
  forEachRotatedSegment,
  getCachedRadialGradient,
  clearGradientCache,
  withConditionalShadow,
  batchArcs,
  rotatePoint,
  // 🎯 Easing & animation
  lerp,
  easing,
  detectBeat,
  energyRamp,
  // 🎨 Linear gradient cache
  getCachedLinearGradient,
  clearAllGradientCaches,
} from './helpers'

// ✨ Input validation utilities
export {
  validateNumber,
  validatePositiveNumber,
  validateRange,
  validateDataArray,
  validateBufferLength,
  validateDimensions,
  validateCanvasContext,
  validateHexColor,
  validateIntensity,
  validateDrawParams,
  createSafeDrawWrapper,
  validateArrayIndex,
  clampFrequencyIndex,
  safeGetAudioValue,
  validateAngle,
} from './validation'
