/**
 * Audio Processing Module
 * Modular audio-reactive processing for visualizations
 *
 * @module audio
 */

// Main processor
export { AudioProcessor, createWorkerProcessor } from './AudioProcessor'

// Frequency analysis
export { FrequencyAnalyzer, DEFAULT_CONFIG as FREQUENCY_CONFIG } from './FrequencyAnalyzer'

// Beat detection
export { BeatDetector, DEFAULT_CONFIG as BEAT_CONFIG } from './BeatDetector'

// Onset detection (per-band, change-based, auto-gained)
export { OnsetDetector, DEFAULT_CONFIG as ONSET_CONFIG } from './OnsetDetector'

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
  applyEasing,
} from './EasingFunctions'

// Audio level calculation
export {
  AUDIO_SOURCES,
  sourceNames,
  getAudioLevel,
  calculateDynamicLevel,
  getNormalizedLevel,
  applyBeatBoost,
  applyPhaseOffset,
  AudioLevelCalculator,
} from './AudioLevelCalculator'

// Audio-reactive effects
export {
  EFFECT_NAMES,
  EFFECT_CATEGORIES,
  calculateEffectValue,
  getMotionOffset,
  getFilterString,
  resetBeatPulseEnvelope,
  calculateBeatPulse,
  AudioReactiveEffects,
} from './AudioReactiveEffects'

// Default export: main AudioProcessor class
export { AudioProcessor as default } from './AudioProcessor'
