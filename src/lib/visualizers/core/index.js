/**
 * Core module exports for visualizers
 * @module visualizers/core
 */

export { CONSTANTS } from './constants.js';
export { visualizerState } from './state.js';
export { hexToHsl } from './colorUtils.js';
export { Particle } from './Particle.js';
export {
  expo01,
  rangeForBar,
  averageRange,
  calculateDynamicGain,
  getFrequencyBasedSmoothing,
  applySmoothValue,
  withSafeCanvasState,
  drawRoundedBar,
  // ✨ Performance utilities
  batchStyleChanges,
  forEachRotatedSegment,
  getCachedRadialGradient,
  clearGradientCache,
  withConditionalShadow,
  batchArcs,
  rotatePoint
} from './helpers.js';

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
  validateAngle
} from './validation.js';
