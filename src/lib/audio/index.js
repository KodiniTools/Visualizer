/**
 * Audio Processing Module
 * Modular audio-reactive processing for visualizations
 *
 * @module audio
 */

// Main processor
export { AudioProcessor, createWorkerProcessor } from './AudioProcessor.js';

// Frequency analysis
export {
  FrequencyAnalyzer,
  DEFAULT_CONFIG as FREQUENCY_CONFIG
} from './FrequencyAnalyzer.js';

// Beat detection
export {
  BeatDetector,
  DEFAULT_CONFIG as BEAT_CONFIG
} from './BeatDetector.js';

// Easing functions
export {
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
} from './EasingFunctions.js';

// Audio level calculation
export {
  AUDIO_SOURCES,
  sourceNames,
  getAudioLevel,
  calculateDynamicLevel,
  getNormalizedLevel,
  applyBeatBoost,
  applyPhaseOffset,
  AudioLevelCalculator
} from './AudioLevelCalculator.js';

// Audio-reactive effects
export {
  EFFECT_NAMES,
  EFFECT_CATEGORIES,
  calculateEffectValue,
  getMotionOffset,
  getFilterString,
  AudioReactiveEffects
} from './AudioReactiveEffects.js';

// Default export: main AudioProcessor class
export { AudioProcessor as default } from './AudioProcessor.js';
