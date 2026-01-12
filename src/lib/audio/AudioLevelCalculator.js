/**
 * AudioLevelCalculator - Calculate audio levels from different sources
 * Provides unified access to bass, mid, treble, volume, and dynamic modes
 *
 * @module audio/AudioLevelCalculator
 */

/**
 * Available audio source types
 */
export const AUDIO_SOURCES = {
  BASS: 'bass',
  MID: 'mid',
  TREBLE: 'treble',
  VOLUME: 'volume',
  DYNAMIC: 'dynamic'
};

/**
 * List of all available source names
 */
export const sourceNames = Object.values(AUDIO_SOURCES);

/**
 * Gets the audio level for a specific source
 * @param {string} source - Source type ('bass', 'mid', 'treble', 'volume', 'dynamic')
 * @param {object} audioData - Audio analysis data containing frequency values
 * @param {boolean} useSmooth - Whether to use smoothed values (default: true)
 * @returns {number} Audio level (0-255)
 */
export function getAudioLevel(source, audioData, useSmooth = true) {
  if (!audioData) return 0;

  switch (source) {
    case AUDIO_SOURCES.BASS:
      return useSmooth ? (audioData.smoothBass || 0) : (audioData.bass || 0);

    case AUDIO_SOURCES.MID:
      return useSmooth ? (audioData.smoothMid || 0) : (audioData.mid || 0);

    case AUDIO_SOURCES.TREBLE:
      return useSmooth ? (audioData.smoothTreble || 0) : (audioData.treble || 0);

    case AUDIO_SOURCES.VOLUME:
      return useSmooth ? (audioData.smoothVolume || 0) : (audioData.volume || 0);

    case AUDIO_SOURCES.DYNAMIC:
      return calculateDynamicLevel(audioData, useSmooth);

    default:
      // Default to bass if unknown source
      return useSmooth ? (audioData.smoothBass || 0) : (audioData.bass || 0);
  }
}

/**
 * Calculates dynamic audio level - weighted mix of all frequency bands
 * @param {object} audioData - Audio analysis data
 * @param {boolean} useSmooth - Whether to use smoothed values
 * @returns {number} Dynamic audio level (0-255)
 */
export function calculateDynamicLevel(audioData, useSmooth = true) {
  if (!audioData) return 0;

  const bass = useSmooth ? (audioData.smoothBass || 0) : (audioData.bass || 0);
  const mid = useSmooth ? (audioData.smoothMid || 0) : (audioData.mid || 0);
  const treble = useSmooth ? (audioData.smoothTreble || 0) : (audioData.treble || 0);

  // Calculate energy-based weights
  const totalEnergy = Math.max(bass + mid + treble, 1);
  const bassWeight = bass / totalEnergy;
  const midWeight = mid / totalEnergy;
  const trebleWeight = treble / totalEnergy;

  // Weighted combination
  let rawLevel = (bass * bassWeight) + (mid * midWeight) + (treble * trebleWeight);

  // Normalize and apply compression for more consistent output
  const normalized = rawLevel / 255;
  const compressed = Math.pow(normalized, 0.7);

  return Math.floor(compressed * 255 * 0.85);
}

/**
 * Gets normalized audio level (0-1) for a specific source
 * @param {string} source - Source type
 * @param {object} audioData - Audio analysis data
 * @param {boolean} useSmooth - Whether to use smoothed values
 * @returns {number} Normalized audio level (0-1)
 */
export function getNormalizedLevel(source, audioData, useSmooth = true) {
  return getAudioLevel(source, audioData, useSmooth) / 255;
}

/**
 * Applies beat boost to audio level
 * @param {number} level - Current audio level (0-255)
 * @param {object} audioData - Audio data containing beat information
 * @param {number} beatBoost - Beat boost multiplier (1.0 = no boost, 2.0 = 100% boost)
 * @returns {number} Boosted audio level (0-255)
 */
export function applyBeatBoost(level, audioData, beatBoost = 1.0) {
  if (!audioData || beatBoost <= 1.0 || !audioData.isBeat) {
    return level;
  }

  const beatIntensity = audioData.beatIntensity || 0;
  const boostAmount = 1 + ((beatBoost - 1) * beatIntensity);

  return Math.min(255, level * boostAmount);
}

/**
 * Applies phase offset to audio level (oscillating modifier)
 * @param {number} level - Current audio level (0-255)
 * @param {number} phase - Phase offset in degrees (0-360)
 * @param {number} time - Current time in ms (defaults to Date.now())
 * @returns {number} Phase-modified audio level (0-255)
 */
export function applyPhaseOffset(level, phase, time = Date.now()) {
  if (phase <= 0) return level;

  const phaseRad = (phase * Math.PI) / 180;
  const timeOffset = time * 0.002;
  const phaseModifier = (Math.sin(timeOffset + phaseRad) + 1) / 2;

  return level * (0.5 + phaseModifier * 0.5);
}

/**
 * AudioLevelCalculator class
 * Provides stateful audio level calculation with configuration
 */
export class AudioLevelCalculator {
  /**
   * Creates a new AudioLevelCalculator instance
   * @param {object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      defaultSource: AUDIO_SOURCES.BASS,
      useSmooth: true,
      beatBoost: 1.0,
      phase: 0,
      ...config
    };
  }

  /**
   * Calculates audio level with all modifiers applied
   * @param {object} audioData - Audio analysis data
   * @param {object} options - Override options
   * @returns {number} Calculated audio level (0-255)
   */
  calculate(audioData, options = {}) {
    const source = options.source || this.config.defaultSource;
    const useSmooth = options.useSmooth ?? this.config.useSmooth;
    const beatBoost = options.beatBoost ?? this.config.beatBoost;
    const phase = options.phase ?? this.config.phase;

    // Get base level
    let level = getAudioLevel(source, audioData, useSmooth);

    // Apply beat boost
    level = applyBeatBoost(level, audioData, beatBoost);

    // Apply phase offset
    level = applyPhaseOffset(level, phase);

    return level;
  }

  /**
   * Calculates normalized level (0-1)
   * @param {object} audioData - Audio analysis data
   * @param {object} options - Override options
   * @returns {number} Normalized level (0-1)
   */
  calculateNormalized(audioData, options = {}) {
    return this.calculate(audioData, options) / 255;
  }

  /**
   * Updates configuration
   * @param {object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current configuration
   * @returns {object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

export default {
  AUDIO_SOURCES,
  sourceNames,
  getAudioLevel,
  calculateDynamicLevel,
  getNormalizedLevel,
  applyBeatBoost,
  applyPhaseOffset,
  AudioLevelCalculator
};
