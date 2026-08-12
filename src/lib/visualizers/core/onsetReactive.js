/**
 * onsetReactive - shared onset-driven helpers for the visualizer engine.
 *
 * The visualizers render on the raw FFT array and never touch the
 * audio-reactive overlay pipeline. This module lets them tap the per-band
 * onset signal (fast envelope vs slow baseline + auto-gain) that
 * useGlobalAudioData already publishes on window.audioAnalysisData, without
 * changing any visualizer's draw signature.
 *
 * The first consumer is the global "beat punch": a short zoom of the whole
 * visualizer layer on each onset. The math here is pure and frame-based so it
 * can be unit-tested and driven from the render loop.
 *
 * @module visualizers/core/onsetReactive
 */

/** Maps a punch source key to its onset field on window.audioAnalysisData. */
const ONSET_FIELD = {
  bass: 'onsetBass',
  mid: 'onsetMid',
  treble: 'onsetTreble',
  all: 'onsetAll',
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/**
 * Reads the current onset (0–1) for a band from an audio-analysis snapshot.
 * @param {object} audioData - window.audioAnalysisData (or any object with onset* fields)
 * @param {string} source - 'bass' | 'mid' | 'treble' | 'all' (default 'all')
 * @returns {number} onset level 0–1 (0 when data or field is missing)
 */
export function onsetForSource(audioData, source = 'all') {
  if (!audioData) return 0
  const field = ONSET_FIELD[source] || ONSET_FIELD.all
  return clamp01(audioData[field] ?? 0)
}

/**
 * Advances a punch envelope one frame. Instant attack (jumps to the onset on a
 * hit) and exponential decay (smooth settle), so the punch reads as a kick
 * rather than following the raw, spiky onset.
 * @param {number} prevEnv - previous envelope value (0–1)
 * @param {number} onset - current onset (0–1)
 * @param {number} [decay=0.85] - per-frame decay factor (0–1); higher = longer tail
 * @returns {number} new envelope value 0–1
 */
export function advancePunch(prevEnv, onset, decay = 0.85) {
  const prev = Number.isFinite(prevEnv) ? prevEnv : 0
  const o = clamp01(onset)
  const decayed = prev * clamp01(decay)
  return o > decayed ? o : decayed
}

/**
 * Converts a punch envelope into a scale multiplier.
 * @param {number} env - punch envelope 0–1
 * @param {number} strength - user strength 0–100
 * @param {number} [maxScale=0.12] - extra scale at full env & full strength (0.12 = +12%)
 * @returns {number} scale multiplier ≥ 1 (1.0 = no punch)
 */
export function punchScale(env, strength, maxScale = 0.12) {
  const e = clamp01(env)
  const s = Math.max(0, Math.min(100, strength ?? 0)) / 100
  return 1 + e * maxScale * s
}
