/**
 * FrequencyAnalyzer - Frequency band analysis module
 * Extracts bass, mid, treble, and volume from FFT data
 *
 * @module audio/FrequencyAnalyzer
 */

/**
 * Default configuration for frequency analysis
 */
export const DEFAULT_CONFIG = {
  // FFT size determines frequency resolution (2048 = standard, 44100Hz sample rate)
  fftSize: 2048,
  sampleRate: 44100,

  // Frequency band boundaries (percentage of usable FFT data)
  bassEndPercent: 0.15,    // 0-15% = Sub-Bass + Bass (~0-330Hz)
  midEndPercent: 0.35,     // 15-35% = Mids (~330-770Hz)
  // 35-100% = Treble (~770Hz+)

  // Amplification factors
  bassGain: 1.0,
  midGain: 1.2,
  trebleGain: 3.0,
  volumeGain: 1.0,

  // Treble calculation weights
  trebleAvgWeight: 0.6,
  treblePeakWeight: 0.4,

  // Smoothing factors
  defaultSmoothFactor: 0.4,
  trebleSmoothFactor: 0.5
};

/**
 * FrequencyAnalyzer class
 * Analyzes FFT data and calculates frequency band levels
 */
export class FrequencyAnalyzer {
  /**
   * Creates a new FrequencyAnalyzer instance
   * @param {object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Smoothed values state
    this.smoothBass = 0;
    this.smoothMid = 0;
    this.smoothTreble = 0;
    this.smoothVolume = 0;
  }

  /**
   * Analyzes FFT data and returns frequency band levels
   * @param {Uint8Array} audioDataArray - FFT frequency data from AnalyserNode
   * @param {number} bufferLength - Length of the data buffer
   * @returns {object|null} Analyzed frequency data or null if invalid input
   */
  analyze(audioDataArray, bufferLength) {
    if (!audioDataArray || bufferLength === 0) {
      return null;
    }

    // Only use lower 50% of FFT data (upper part contains less useful info)
    const usableLength = Math.floor(bufferLength * 0.5);

    // Calculate frequency band boundaries
    const bassEnd = Math.floor(usableLength * this.config.bassEndPercent);
    const midEnd = Math.floor(usableLength * this.config.midEndPercent);

    // Accumulators
    let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0;
    let bassCount = 0, midCount = 0, trebleCount = 0;
    let treblePeak = 0;

    // Single-pass analysis loop
    for (let i = 0; i < usableLength; i++) {
      const value = audioDataArray[i];
      totalSum += value;

      if (i < bassEnd) {
        bassSum += value;
        bassCount++;
      } else if (i < midEnd) {
        midSum += value;
        midCount++;
      } else {
        trebleSum += value;
        trebleCount++;
        if (value > treblePeak) treblePeak = value;
      }
    }

    // Calculate raw values with gain
    const bass = this._calculateBandValue(bassSum, bassCount, this.config.bassGain);
    const mid = this._calculateBandValue(midSum, midCount, this.config.midGain);
    const treble = this._calculateTrebleValue(trebleSum, trebleCount, treblePeak);
    const volume = this._calculateBandValue(totalSum, usableLength, this.config.volumeGain);

    // Apply smoothing
    this.smoothBass = this._applySmoothing(this.smoothBass, bass, this.config.defaultSmoothFactor);
    this.smoothMid = this._applySmoothing(this.smoothMid, mid, this.config.defaultSmoothFactor);
    this.smoothTreble = this._applySmoothing(this.smoothTreble, treble, this.config.trebleSmoothFactor);
    this.smoothVolume = this._applySmoothing(this.smoothVolume, volume, this.config.defaultSmoothFactor);

    return {
      bass,
      mid,
      treble,
      volume,
      smoothBass: this.smoothBass,
      smoothMid: this.smoothMid,
      smoothTreble: this.smoothTreble,
      smoothVolume: this.smoothVolume
    };
  }

  /**
   * Calculates band value from sum and count with gain
   * @private
   */
  _calculateBandValue(sum, count, gain) {
    if (count === 0) return 0;
    return Math.min(255, Math.floor((sum / count) * gain));
  }

  /**
   * Calculates treble value combining average and peak
   * @private
   */
  _calculateTrebleValue(sum, count, peak) {
    if (count === 0) return 0;
    const avg = sum / count;
    const combined = (avg * this.config.trebleAvgWeight) + (peak * this.config.treblePeakWeight);
    return Math.min(255, Math.floor(combined * this.config.trebleGain));
  }

  /**
   * Applies exponential smoothing
   * @private
   */
  _applySmoothing(currentValue, newValue, factor) {
    return Math.floor(currentValue * (1 - factor) + newValue * factor);
  }

  /**
   * Resets all smoothed values to zero
   */
  reset() {
    this.smoothBass = 0;
    this.smoothMid = 0;
    this.smoothTreble = 0;
    this.smoothVolume = 0;
  }

  /**
   * Gets the current smoothed values
   * @returns {object} Current smoothed frequency values
   */
  getSmoothedValues() {
    return {
      smoothBass: this.smoothBass,
      smoothMid: this.smoothMid,
      smoothTreble: this.smoothTreble,
      smoothVolume: this.smoothVolume
    };
  }

  /**
   * Updates configuration
   * @param {object} newConfig - New configuration values to merge
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

export default FrequencyAnalyzer;
