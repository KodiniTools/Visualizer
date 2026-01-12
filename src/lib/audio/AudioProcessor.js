/**
 * AudioProcessor - Main audio processing class
 * Combines FrequencyAnalyzer, BeatDetector, and provides unified API
 *
 * @module audio/AudioProcessor
 */

import { FrequencyAnalyzer } from './FrequencyAnalyzer.js';
import { BeatDetector } from './BeatDetector.js';
import {
  getAudioLevel,
  applyBeatBoost,
  applyPhaseOffset,
  AUDIO_SOURCES
} from './AudioLevelCalculator.js';
import { applyEasing } from './EasingFunctions.js';
import { calculateEffectValue, EFFECT_NAMES } from './AudioReactiveEffects.js';

/**
 * AudioProcessor class
 * Main entry point for audio analysis and reactive processing
 */
export class AudioProcessor {
  /**
   * Creates a new AudioProcessor instance
   * @param {object} config - Configuration options
   */
  constructor(config = {}) {
    this.frequencyAnalyzer = new FrequencyAnalyzer(config.frequency);
    this.beatDetector = new BeatDetector(config.beat);

    // Store last analysis result for global access
    this.lastAnalysis = null;
  }

  /**
   * Analyzes FFT audio data
   * @param {Uint8Array} audioDataArray - FFT frequency data from AnalyserNode
   * @param {number} bufferLength - Length of the data buffer
   * @returns {object|null} Complete audio analysis data
   */
  analyze(audioDataArray, bufferLength) {
    // Frequency analysis
    const frequencyData = this.frequencyAnalyzer.analyze(audioDataArray, bufferLength);
    if (!frequencyData) return null;

    // Beat detection (uses bass level)
    const beatData = this.beatDetector.detect(frequencyData.bass);

    // Combine results
    this.lastAnalysis = {
      ...frequencyData,
      ...beatData
    };

    return this.lastAnalysis;
  }

  /**
   * Resets all analyzers
   */
  reset() {
    this.frequencyAnalyzer.reset();
    this.beatDetector.reset();
    this.lastAnalysis = null;
  }

  /**
   * Gets the last analysis result
   * @returns {object|null} Last analysis data
   */
  getLastAnalysis() {
    return this.lastAnalysis;
  }

  /**
   * Gets audio level for a specific source with modifiers
   * @param {object} options - Options for level calculation
   * @param {string} options.source - Audio source ('bass', 'mid', 'treble', 'volume', 'dynamic')
   * @param {boolean} options.useSmooth - Use smoothed values (default: true)
   * @param {number} options.beatBoost - Beat boost multiplier (default: 1.0)
   * @param {number} options.phase - Phase offset in degrees (default: 0)
   * @param {string} options.easing - Easing function name (default: 'linear')
   * @param {object} audioData - Audio data (uses lastAnalysis if not provided)
   * @returns {number} Calculated audio level (0-1 normalized)
   */
  getLevel(options = {}, audioData = null) {
    const data = audioData || this.lastAnalysis;
    if (!data) return 0;

    const {
      source = AUDIO_SOURCES.BASS,
      useSmooth = true,
      beatBoost = 1.0,
      phase = 0,
      easing = 'linear'
    } = options;

    // Get base level
    let level = getAudioLevel(source, data, useSmooth);

    // Apply beat boost
    level = applyBeatBoost(level, data, beatBoost);

    // Apply phase offset
    level = applyPhaseOffset(level, phase);

    // Normalize to 0-1
    let normalizedLevel = level / 255;

    // Apply easing
    normalizedLevel = applyEasing(normalizedLevel, easing);

    return normalizedLevel;
  }

  /**
   * Calculates audio-reactive effect values
   * @param {object} audioSettings - Audio reactive settings
   * @param {object} audioData - Audio data (uses lastAnalysis if not provided)
   * @returns {object|null} Calculated effect values
   */
  getAudioReactiveValues(audioSettings, audioData = null) {
    if (!audioSettings || !audioSettings.enabled) {
      return null;
    }

    const data = audioData || this.lastAnalysis;
    if (!data) return null;

    // Global settings
    const globalSource = audioSettings.source || 'bass';
    const smoothing = audioSettings.smoothing || 50;
    const easing = audioSettings.easing || 'linear';
    const phase = audioSettings.phase || 0;
    const beatBoost = audioSettings.beatBoost ?? 1.0;
    const useSmooth = smoothing > 30;

    const result = {
      hasEffects: false,
      effects: {}
    };

    const effects = audioSettings.effects;
    if (!effects) {
      // Fallback for old structure (single effect)
      const level = this.getLevel({
        source: globalSource,
        useSmooth,
        beatBoost,
        phase,
        easing
      }, data);

      const effect = audioSettings.effect || 'hue';
      const intensity = (audioSettings.intensity || 80) / 100;

      result.hasEffects = true;
      result.effects[effect] = calculateEffectValue(effect, level * intensity);
      return result;
    }

    // Calculate values for each enabled effect
    for (const [effectName, effectConfig] of Object.entries(effects)) {
      if (effectConfig && effectConfig.enabled) {
        // Use individual source or global source
        const effectSource = effectConfig.source || globalSource;

        const level = this.getLevel({
          source: effectSource,
          useSmooth,
          beatBoost,
          phase,
          easing
        }, data);

        const intensity = (effectConfig.intensity || 80) / 100;
        const effectLevel = level * intensity;

        result.hasEffects = true;
        result.effects[effectName] = calculateEffectValue(effectName, effectLevel);
      }
    }

    return result.hasEffects ? result : null;
  }

  /**
   * Updates frequency analyzer configuration
   * @param {object} config - New configuration
   */
  updateFrequencyConfig(config) {
    this.frequencyAnalyzer.updateConfig(config);
  }

  /**
   * Updates beat detector configuration
   * @param {object} config - New configuration
   */
  updateBeatConfig(config) {
    this.beatDetector.updateConfig(config);
  }

  /**
   * Gets current BPM statistics
   * @returns {object} BPM statistics from beat detector
   */
  getBpmStats() {
    return this.beatDetector.getStats();
  }
}

/**
 * Creates a standalone audio processor for use in Web Workers
 * This function can be copied into a Worker for independent processing
 */
export function createWorkerProcessor() {
  return new AudioProcessor();
}

export default AudioProcessor;
