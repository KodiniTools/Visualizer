/**
 * Constants for audio visualizers
 * @module visualizers/core/constants
 */

export const CONSTANTS = {
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
  COLOR_CACHE_MAX_SIZE: 100,

  // Frequency analysis
  FREQ_RATIO: 0.21, // Standard upper freq limit (% of buffer)

  // Smoothing presets (use with applySmoothValue)
  SMOOTH_FAST: 0.25, // Fast response (hi-hats, transients)
  SMOOTH_NORMAL: 0.45, // Balanced (mids)
  SMOOTH_SLOW: 0.7, // Slow inertia (bass, overall energy)
  SMOOTH_INERTIA: 0.88, // Very slow decay

  // Beat detection
  BEAT_RISE_FACTOR: 1.2, // Current must be this × previous to count as beat
  MAX_SIGNALS: 120, // Cap for unbounded signal arrays
}
