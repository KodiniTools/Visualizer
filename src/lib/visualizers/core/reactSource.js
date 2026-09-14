/**
 * Reaction source for visualizers ("Reaktionsquelle").
 *
 * By default a visualizer draws straight from the spectrum, i.e. it follows
 * sustained loudness. A reaction source gates the audio data the visualizer
 * receives with an envelope derived from one signal: a band level (bass,
 * mid, treble, volume) or a self-normalising onset (beat) of a band. With an
 * onset source the visualizer keeps its shape from the spectrum but only
 * jumps on beats and settles in between. `strength` (0–100) blends between
 * untouched data (0) and fully gated data (100).
 *
 * Pure, frame-based helpers so the render loop can drive them per layer and
 * they can be unit-tested without audio.
 *
 * @module visualizers/core/reactSource
 */

import { REFERENCE_FRAME_MS } from './helpers.js'

export const REACT_SOURCES = Object.freeze([
  'spectrum',
  'bass',
  'mid',
  'treble',
  'volume',
  'bassOnset',
  'midOnset',
  'trebleOnset',
  'allOnset',
])

export const DEFAULT_REACT_SOURCE = 'spectrum'
export const DEFAULT_REACT_STRENGTH = 70

const ONSET_FIELD = {
  bassOnset: 'onsetBass',
  midOnset: 'onsetMid',
  trebleOnset: 'onsetTreble',
  allOnset: 'onsetAll',
}
const LEVEL_FIELD = { bass: 'bass', mid: 'mid', treble: 'treble', volume: 'volume' }

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** @param {string} source */
export function isReactSource(source) {
  return REACT_SOURCES.includes(source)
}

/** @param {string} source */
export function isOnsetSource(source) {
  return Object.prototype.hasOwnProperty.call(ONSET_FIELD, source)
}

/**
 * Raw drive value (0–1) of a source from an audio-analysis snapshot
 * (window.audioAnalysisData or the same shape). Levels may arrive on a 0–255
 * scale; anything above 1 is treated as such.
 * @param {string} source
 * @param {object|null|undefined} audioData
 * @returns {number}
 */
export function reactDrive(source, audioData) {
  if (source === 'spectrum' || !source) return 1
  if (!audioData) return 0
  const onsetField = ONSET_FIELD[source]
  const field = onsetField || LEVEL_FIELD[source]
  if (!field) return 1
  const v = audioData[field]
  if (!Number.isFinite(v)) return 0
  // Onsets are 0–1 by definition; band levels may arrive on a 0–255 scale.
  if (onsetField) return clamp01(v)
  return clamp01(v > 1 ? v / 255 : v)
}

/**
 * Advances the reaction envelope one frame, frame-rate independent.
 * Onset sources: instant attack, exponential decay (reads as a kick).
 * Level sources: symmetric smoothing so the visualizer breathes with the band.
 * @param {number} prev - previous envelope (0–1)
 * @param {number} drive - current drive (0–1)
 * @param {string} source
 * @param {number} [dtMs] - elapsed ms since the last frame
 * @returns {number} envelope 0–1
 */
export function advanceReactEnvelope(prev, drive, source, dtMs = REFERENCE_FRAME_MS) {
  const p = Number.isFinite(prev) ? clamp01(prev) : 0
  const d = clamp01(drive)
  const k = dtMs > 0 && dtMs < 250 ? dtMs / REFERENCE_FRAME_MS : 1
  if (isOnsetSource(source)) {
    const decayed = p * Math.pow(0.86, k)
    return d > decayed ? d : decayed
  }
  const a = 1 - Math.pow(1 - 0.35, k)
  return p + (d - p) * a
}

/**
 * Gate factor applied to the audio data: 1 at strength 0, the envelope itself
 * at strength 100.
 * @param {number} env - envelope 0–1
 * @param {number} strength - 0–100
 * @returns {number} factor 0–1
 */
export function reactFactor(env, strength) {
  const s = Math.max(0, Math.min(100, Number.isFinite(strength) ? strength : 0)) / 100
  return 1 - s + s * clamp01(env)
}

/**
 * Scales audio data by `factor` into `out` (allocated / resized as needed).
 * Frequency data (0–255) scales towards 0; time-domain data (centred at 128)
 * scales around 128 so the waveform shrinks instead of drifting.
 * Returns `src` untouched when no scaling is needed.
 * @param {Uint8Array} src
 * @param {number} factor - 0–1
 * @param {Uint8Array|null} out - scratch buffer (reused when large enough)
 * @param {boolean} [timeDomain=false]
 * @returns {Uint8Array}
 */
export function applyReactFactor(src, factor, out, timeDomain = false) {
  if (!src) return src
  if (!(factor < 0.999)) return src
  const f = clamp01(factor)
  const len = src.length
  let dst = out
  if (!dst || dst.length !== len) dst = new Uint8Array(len)
  if (timeDomain) {
    for (let i = 0; i < len; i++) dst[i] = 128 + (src[i] - 128) * f
  } else {
    for (let i = 0; i < len; i++) dst[i] = src[i] * f
  }
  return dst
}
