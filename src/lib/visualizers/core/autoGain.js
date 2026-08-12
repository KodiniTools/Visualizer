/**
 * autoGain - self-normalizing amplitude gain for spectrum visualizers.
 *
 * FFT visualizers map the raw 0–255 band values straight to bar heights, so a
 * quiet track shows tiny bars and a loud track clips against the top. This
 * helper tracks a slowly-decaying peak of the loudest band and returns a gain
 * that maps that recent peak toward a fixed target — quiet tracks fill the
 * frame, loud tracks stay in range — without a hard per-frame reset (the slow
 * decay adapts to dynamics instead of pumping).
 *
 * It is OPT-IN: the render loop bridges the store setting onto
 * `visualizerState._autoGain = { enabled, strength }` once per frame. When
 * that flag is absent or disabled, autoGain() returns 1 (identity), so a
 * visualizer that calls it behaves exactly as before until the user turns it
 * on.
 *
 * State (the per-visualizer decaying peak) lives on the shared `visualizerState`
 * bag under a `_ag_<key>` slot, matching how the visualizers already persist
 * their smoothing state.
 *
 * @module visualizers/core/autoGain
 */

import { visualizerState } from './state.js'

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

// Tuning — deliberately gentle so it reads as "consistent loudness", not pumping.
const DECAY = 0.995 // per-frame peak decay (~a few seconds of memory at 60fps)
const MIN_PEAK = 0.1 // floor so near-silence isn't amplified into noise
const MAX_GAIN = 4 // cap on how far a quiet track is boosted
const TARGET = 0.9 // recent peak is mapped toward this fraction of full scale

/**
 * Returns a gain multiplier for normalized (0–1) amplitudes.
 * @param {number} reference - current frame reference 0–1 (the loudest band)
 * @param {string} key - unique per-visualizer state key
 * @returns {number} gain multiplier; 1 when auto-gain is disabled
 */
export function autoGain(reference, key) {
  const cfg = visualizerState._autoGain
  if (!cfg || !cfg.enabled) return 1

  const stateKey = `_ag_${key}`
  const prev = visualizerState[stateKey] ?? MIN_PEAK
  const ref = clamp01(reference)
  const peak = Math.max(ref, prev * DECAY, MIN_PEAK)
  visualizerState[stateKey] = peak

  const strength = clamp(cfg.strength ?? 100, 0, 100) / 100
  const rawGain = clamp(TARGET / peak, 0.5, MAX_GAIN)
  // Blend between identity and the raw gain by user strength.
  return 1 + (rawGain - 1) * strength
}
