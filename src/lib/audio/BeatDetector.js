/**
 * BeatDetector - Beat detection and BPM estimation module
 * Detects beats from bass level and estimates BPM
 *
 * @module audio/BeatDetector
 */

/**
 * Default configuration for beat detection
 */
export const DEFAULT_CONFIG = {
  // Beat detection thresholds
  beatThreshold: 0.45,      // Minimum level for beat (45% of normalized max)
  beatRiseThreshold: 0.15,  // Minimum rise for beat detection (15%)
  minBeatInterval: 150,     // Minimum ms between beats (~400 BPM max)

  // BPM calculation
  historySize: 8,           // Number of beat intervals to track
  maxBeatInterval: 2000,    // Maximum ms between beats for BPM calculation
  minHistoryForBpm: 3       // Minimum beats needed for BPM estimation
};

/**
 * BeatDetector class
 * Detects beats from audio level and calculates BPM
 */
export class BeatDetector {
  /**
   * Creates a new BeatDetector instance
   * @param {object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // State
    this.lastLevel = 0;
    this.lastBeatTime = 0;
    this.beatHistory = [];
    this.averageBeatInterval = 500;
    this.beatConfidence = 0;
  }

  /**
   * Analyzes audio level for beat detection
   * @param {number} level - Current audio level (0-255)
   * @param {number} timestamp - Current timestamp in ms (defaults to Date.now())
   * @returns {object} Beat detection results
   */
  detect(level, timestamp = Date.now()) {
    // Normalize level to 0-1 range
    const normalizedLevel = level / 255;
    const lastNormalizedLevel = this.lastLevel / 255;

    // Calculate timing
    const timeSinceLastBeat = timestamp - this.lastBeatTime;

    // Beat detection conditions
    const isRising = normalizedLevel - lastNormalizedLevel > this.config.beatRiseThreshold;
    const isAboveThreshold = normalizedLevel > this.config.beatThreshold;
    const hasMinInterval = timeSinceLastBeat > this.config.minBeatInterval;

    let isBeat = false;
    let beatIntensity = 0;

    if (isRising && isAboveThreshold && hasMinInterval) {
      isBeat = true;
      // Calculate beat intensity as how much above threshold
      beatIntensity = Math.min(1, (normalizedLevel - this.config.beatThreshold) /
        (1 - this.config.beatThreshold));

      // Update BPM calculation
      this._updateBpmHistory(timestamp, timeSinceLastBeat);

      this.lastBeatTime = timestamp;
    }

    // Store level for next frame
    this.lastLevel = level;

    // Calculate BPM
    const bpm = this._calculateBpm();

    return {
      isBeat,
      beatIntensity,
      timeSinceLastBeat,
      bpm,
      beatConfidence: this.beatConfidence
    };
  }

  /**
   * Updates BPM history with new beat interval
   * @private
   */
  _updateBpmHistory(timestamp, interval) {
    // Only add to history if this isn't the first beat and interval is reasonable
    if (this.lastBeatTime > 0 && interval < this.config.maxBeatInterval) {
      this.beatHistory.push(interval);

      // Keep only the most recent intervals
      if (this.beatHistory.length > this.config.historySize) {
        this.beatHistory.shift();
      }

      // Calculate confidence based on interval consistency
      this._updateConfidence();
    }
  }

  /**
   * Calculates average BPM from beat history
   * @private
   */
  _calculateBpm() {
    if (this.beatHistory.length < this.config.minHistoryForBpm) {
      return 0;
    }

    const sum = this.beatHistory.reduce((a, b) => a + b, 0);
    this.averageBeatInterval = sum / this.beatHistory.length;

    return Math.round(60000 / this.averageBeatInterval);
  }

  /**
   * Updates beat detection confidence based on interval consistency
   * @private
   */
  _updateConfidence() {
    if (this.beatHistory.length < this.config.minHistoryForBpm) {
      this.beatConfidence = 0;
      return;
    }

    // Calculate standard deviation of intervals
    const variance = this.beatHistory.reduce((sum, val) =>
      sum + Math.pow(val - this.averageBeatInterval, 2), 0) / this.beatHistory.length;
    const stdDev = Math.sqrt(variance);

    // Confidence is higher when intervals are consistent
    this.beatConfidence = Math.max(0, 1 - (stdDev / this.averageBeatInterval));
  }

  /**
   * Resets beat detection state
   */
  reset() {
    this.lastLevel = 0;
    this.lastBeatTime = 0;
    this.beatHistory = [];
    this.averageBeatInterval = 500;
    this.beatConfidence = 0;
  }

  /**
   * Gets current BPM statistics
   * @returns {object} BPM statistics
   */
  getStats() {
    return {
      bpm: this._calculateBpm(),
      confidence: this.beatConfidence,
      averageInterval: this.averageBeatInterval,
      historyLength: this.beatHistory.length
    };
  }

  /**
   * Updates configuration
   * @param {object} newConfig - New configuration values to merge
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Manually triggers a beat (for testing or external beat sources)
   * @param {number} intensity - Beat intensity (0-1)
   * @param {number} timestamp - Timestamp of the beat
   */
  triggerBeat(intensity = 1, timestamp = Date.now()) {
    const timeSinceLastBeat = timestamp - this.lastBeatTime;

    if (timeSinceLastBeat >= this.config.minBeatInterval) {
      this._updateBpmHistory(timestamp, timeSinceLastBeat);
      this.lastBeatTime = timestamp;
    }

    return {
      isBeat: true,
      beatIntensity: Math.max(0, Math.min(1, intensity)),
      timeSinceLastBeat,
      bpm: this._calculateBpm(),
      beatConfidence: this.beatConfidence
    };
  }
}

export default BeatDetector;
