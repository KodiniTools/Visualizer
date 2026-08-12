/**
 * OnsetDetector - per-band onset (beat) detection with auto-gain.
 *
 * The older audio-reactive path (see ReactiveLevel.js) reacts to the *level* of
 * a band: a loud, sustained "wall of sound" pins the level high and the image
 * freezes. This detector instead reacts to *change*. For each band it keeps:
 *
 *   - a FAST envelope follower (snappy attack, quick release) that tracks the
 *     instantaneous energy, and
 *   - a SLOW baseline (a long moving average) that represents the recent
 *     "normal" level.
 *
 * The onset is the positive excess of fast over slow (`fast - slow`): energy
 * rising above its own recent baseline. Sustained loudness raises the baseline
 * too, so it stops producing onsets — only fresh hits do.
 *
 * On top of that sits an AUTO-GAIN stage: a decaying per-band peak of the raw
 * onset. The output is `onset / peak`, so a quiet acoustic track and a loud
 * rock track both pulse to a similar 0–1 range (self-normalizing). The peak
 * decays slowly so the normalization adapts to dynamics without pumping.
 *
 * Two safeguards prevent phantom motion in near-silence:
 *   - NOISE GATE: if the fast envelope is below an absolute floor, the band's
 *     onset is forced to 0 (no dividing tiny noise by a tiny peak).
 *   - PEAK FLOOR: the auto-gain peak never drops below `minPeak`, so silence
 *     can't be amplified into full-scale flicker.
 *
 * Coefficients are per-frame and tuned for ~60fps analysis. State is held on
 * the instance, so create one detector per audio stream (see useGlobalAudioData).
 *
 * @module audio/OnsetDetector
 */

/**
 * Default configuration. All envelope coefficients are one-pole blend factors
 * in 0–1 applied once per analysis frame (higher = faster tracking).
 */
export const DEFAULT_CONFIG = {
  // Fast envelope: instant-ish attack so a hit registers immediately, moderate
  // release so the pulse has a short tail instead of a single-frame spike.
  fastAttack: 0.7,
  fastRelease: 0.35,

  // Slow baseline: a slow symmetric average of the signal. Long enough that a
  // single beat barely moves it, short enough to follow a section change.
  baseline: 0.04,

  // Auto-gain: the normalizing peak decays by this factor each frame and is
  // pulled up to the current onset. ~0.995 ≈ a few seconds of memory at 60fps.
  peakDecay: 0.995,
  // Peak never drops below this, so quiet noise isn't normalized up to 1.
  minPeak: 0.05,

  // Noise gate: fast envelope (0–1) must exceed this absolute floor for the
  // band to emit any onset at all. Kills false movement during silence.
  noiseFloor: 0.03,
}

/** Per-band running state. */
function makeBand() {
  return { fast: 0, slow: 0, peak: 0 }
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/**
 * OnsetDetector class. One instance per audio stream.
 */
export class OnsetDetector {
  /**
   * @param {object} config - overrides merged over DEFAULT_CONFIG
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.bands = {
      bass: makeBand(),
      mid: makeBand(),
      treble: makeBand(),
      all: makeBand(),
    }
  }

  /**
   * Advances one band's envelopes and returns its auto-gained onset (0–1).
   * @param {object} band - mutable state from `this.bands`
   * @param {number} x - normalized band energy (0–1)
   * @returns {number} onset level 0–1
   * @private
   */
  _stepBand(band, x) {
    const c = this.config

    // Fast envelope follower (asymmetric one-pole).
    const fastCoef = x > band.fast ? c.fastAttack : c.fastRelease
    band.fast = band.fast + (x - band.fast) * fastCoef

    // Slow baseline (symmetric one-pole moving average).
    band.slow = band.slow + (x - band.slow) * c.baseline

    // Raw onset = energy above the recent baseline.
    const onsetRaw = band.fast > band.slow ? band.fast - band.slow : 0

    // Auto-gain: decay the peak, then track the current onset; floor it so
    // silence isn't normalized up to full scale.
    band.peak = Math.max(onsetRaw, band.peak * c.peakDecay, c.minPeak)

    // Noise gate: no onset while the band is below the absolute floor.
    if (band.fast < c.noiseFloor) return 0

    return clamp01(onsetRaw / band.peak)
  }

  /**
   * Computes per-band onsets from one frame of raw band energies.
   * @param {object} levels - { bass, mid, treble, volume } each 0–255
   * @returns {{bass:number, mid:number, treble:number, all:number}} onsets 0–1
   */
  detect(levels = {}) {
    const bass = (levels.bass || 0) / 255
    const mid = (levels.mid || 0) / 255
    const treble = (levels.treble || 0) / 255
    // "All" uses overall volume so it fires on full-mix hits.
    const all = (levels.volume || 0) / 255

    return {
      bass: this._stepBand(this.bands.bass, bass),
      mid: this._stepBand(this.bands.mid, mid),
      treble: this._stepBand(this.bands.treble, treble),
      all: this._stepBand(this.bands.all, all),
    }
  }

  /** Resets all band state to silence. */
  reset() {
    this.bands.bass = makeBand()
    this.bands.mid = makeBand()
    this.bands.treble = makeBand()
    this.bands.all = makeBand()
  }

  /**
   * Updates configuration in place.
   * @param {object} newConfig - values merged over the current config
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
  }
}

export default OnsetDetector
