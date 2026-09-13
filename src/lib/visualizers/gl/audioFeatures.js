/**
 * Audio feature extraction for the GPU visualizer engine.
 *
 * Turns the raw AnalyserNode frequency data (Uint8Array, 0–255 per bin) into
 * the compact form the shaders consume:
 *
 *   - `rows`   Uint8Array of AUDIO_TEX_WIDTH * 2 bytes, uploaded as a 2-row
 *              R8 texture. Row 0 is the raw linear spectrum over the usable
 *              band, row 1 is a smoothed, log-mapped, gain-corrected spectrum
 *              (the same mapping the Canvas2D bar visualizers use).
 *   - `bands`  [bass, mid, treble, volume] in 0–1.
 *
 * Pure functions on plain typed arrays so they can be unit-tested without a GPU.
 *
 * @module visualizers/gl/audioFeatures
 */

import { CONSTANTS } from '../core/constants.js'
import {
  rangeForBar,
  averageRange,
  calculateDynamicGain,
  getFrequencyBasedSmoothing,
  applySmoothValue,
} from '../core/helpers.js'

/** Width of the audio texture (texels per row). */
export const AUDIO_TEX_WIDTH = 512
/** Number of rows in the audio texture. */
export const AUDIO_TEX_ROWS = 2

/**
 * Per-visualizer feature state. Kept per adapter (not per engine) so several
 * GPU layers running in the same frame do not double-step each other's
 * smoothing.
 * @returns {{rows: Uint8Array, smooth: Float32Array, bands: Float32Array}}
 */
export function createAudioFeatureState() {
  return {
    rows: new Uint8Array(AUDIO_TEX_WIDTH * AUDIO_TEX_ROWS),
    smooth: new Float32Array(AUDIO_TEX_WIDTH),
    bands: new Float32Array(4),
    scratch: new Float32Array(AUDIO_TEX_WIDTH + 1),
  }
}

/** Reset smoothing so a freshly selected visualizer starts from silence. */
export function resetAudioFeatureState(state) {
  state.rows.fill(0)
  state.smooth.fill(0)
  state.bands.fill(0)
}

/**
 * Compute bass / mid / treble / volume levels (0–1) from frequency data.
 * Uses the same usable band (CONSTANTS.FREQ_RATIO) as the Canvas2D visualizers.
 * @param {Uint8Array|number[]} dataArray
 * @param {number} bufferLength
 * @param {Float32Array} [out]
 * @returns {Float32Array} [bass, mid, treble, volume]
 */
export function computeBands(dataArray, bufferLength, out = new Float32Array(4)) {
  const usable = Math.max(1, Math.floor(bufferLength * CONSTANTS.FREQ_RATIO))
  const bassEnd = Math.max(1, Math.floor(usable * 0.3))
  const midEnd = Math.max(bassEnd + 1, Math.floor(usable * 0.7))
  out[0] = averageRange(dataArray, 0, bassEnd) / 255
  out[1] = averageRange(dataArray, bassEnd, midEnd) / 255
  out[2] = Math.min(1, (averageRange(dataArray, midEnd, usable) / 255) * 2.2)
  out[3] = averageRange(dataArray, 0, usable) / 255
  return out
}

/**
 * Update the texture rows + bands for the current frame.
 *
 * Row 0: raw spectrum, linear over the usable band (no smoothing – for
 *        transient-sensitive effects).
 * Row 1: log-mapped bars with dynamic gain and frequency-dependent smoothing
 *        (frame-rate independent via applySmoothValue), clamped to 0–1.
 *
 * @param {ReturnType<typeof createAudioFeatureState>} state
 * @param {Uint8Array|number[]} dataArray
 * @param {number} bufferLength
 */
export function updateAudioFeatures(state, dataArray, bufferLength) {
  const W = AUDIO_TEX_WIDTH
  const rows = state.rows
  const len = Math.max(1, bufferLength | 0)
  const usable = Math.max(1, Math.floor(len * CONSTANTS.FREQ_RATIO))

  // Row 0 – raw, linear.
  for (let x = 0; x < W; x++) {
    const idx = Math.min(usable - 1, Math.floor((x / W) * usable))
    rows[x] = dataArray[idx] || 0
  }

  // Row 1 – log-mapped, gain-corrected, smoothed.
  const masterGain = 0.5
  for (let x = 0; x < W; x++) {
    const [s, e] = rangeForBar(x, W, usable)
    const raw = averageRange(dataArray, s, e) / 255
    const gain = calculateDynamicGain(x, W)
    const target = Math.min(1, raw * gain * masterGain)
    const factor = getFrequencyBasedSmoothing(x, W, CONSTANTS.SMOOTHING_BASE)
    const v = applySmoothValue(state.smooth[x], target, factor)
    state.smooth[x] = v
    rows[W + x] = Math.max(0, Math.min(255, Math.round(v * 255)))
  }

  computeBands(dataArray, len, state.bands)
  return state
}

/**
 * Time-domain variant for presets that declare `needsTimeData` (the render
 * loop then hands them the AnalyserNode waveform, 0–255 centred at 128,
 * instead of the spectrum).
 *
 * Row 0: raw waveform resampled to the texture width (still 0–255, centre 128).
 * Row 1: smoothed absolute envelope (0–255).
 * Bands: estimated with cheap one-pole filters over the waveform, so the
 *        standard uniforms keep meaning "bass / mid / treble / volume".
 *
 * @param {ReturnType<typeof createAudioFeatureState>} state
 * @param {Uint8Array|number[]} timeData
 * @param {number} bufferLength
 */
export function updateAudioFeaturesFromTime(state, timeData, bufferLength) {
  const W = AUDIO_TEX_WIDTH
  const rows = state.rows
  const len = Math.max(1, bufferLength | 0)

  const step = Math.max(1, Math.floor(len / W))
  const win = step * 6 // peak window: ±6 texels worth of samples
  const prefix = state.scratch // prefix sums of the peak envelope for a cheap box blur
  prefix[0] = 0
  for (let x = 0; x < W; x++) {
    const idx = Math.min(len - 1, Math.floor((x / W) * len))
    const v = timeData[idx]
    rows[x] = Number.isFinite(v) ? v : 128
    let peak = 0
    for (let i = Math.max(0, idx - win); i < Math.min(len, idx + win); i += step) {
      const a = Math.abs(((timeData[i] || 128) - 128) / 128)
      if (a > peak) peak = a
    }
    prefix[x + 1] = prefix[x] + Math.min(1, peak * 1.2)
  }
  const blur = 10
  for (let x = 0; x < W; x++) {
    const lo = Math.max(0, x - blur)
    const hi = Math.min(W, x + blur + 1)
    const env = (prefix[hi] - prefix[lo]) / (hi - lo)
    const sm = applySmoothValue(state.smooth[x], env, CONSTANTS.SMOOTH_NORMAL)
    state.smooth[x] = sm
    rows[W + x] = Math.max(0, Math.min(255, Math.round(sm * 255)))
  }

  // Band estimate: low-pass (bass), residual of a faster low-pass (treble).
  let lpSlow = 0
  let lpFast = 0
  let eBass = 0
  let eTreble = 0
  let eAll = 0
  for (let i = 0; i < len; i++) {
    const v = timeData[i]
    const xVal = Number.isFinite(v) ? (v - 128) / 128 : 0
    lpSlow += 0.06 * (xVal - lpSlow)
    lpFast += 0.45 * (xVal - lpFast)
    const hp = xVal - lpFast
    eBass += lpSlow * lpSlow
    eTreble += hp * hp
    eAll += xVal * xVal
  }
  const rmsAll = Math.sqrt(eAll / len)
  const rmsBass = Math.sqrt(eBass / len)
  const rmsTreble = Math.sqrt(eTreble / len)
  const b = state.bands
  b[0] = Math.min(1, rmsBass * 3.0)
  b[2] = Math.min(1, rmsTreble * 4.0)
  b[1] = Math.min(1, Math.max(0, rmsAll * 2.5 - b[0] * 0.5 - b[2] * 0.3))
  b[3] = Math.min(1, rmsAll * 2.5)
  return state
}
