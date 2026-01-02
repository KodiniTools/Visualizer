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
  COLOR_CACHE_MAX_SIZE: 100
};
