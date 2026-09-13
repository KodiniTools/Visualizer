import { describe, it, expect, beforeEach } from 'vitest'
import {
  AUDIO_TEX_WIDTH,
  AUDIO_TEX_ROWS,
  createAudioFeatureState,
  resetAudioFeatureState,
  computeBands,
  updateAudioFeatures,
} from '../../../lib/visualizers/gl/audioFeatures.js'
import { visualizerState } from '../../../lib/visualizers/core/state.js'

function spectrum(bufferLength, fn) {
  const arr = new Uint8Array(bufferLength)
  for (let i = 0; i < bufferLength; i++) arr[i] = Math.max(0, Math.min(255, Math.round(fn(i))))
  return arr
}

describe('gl/audioFeatures', () => {
  beforeEach(() => {
    visualizerState._dtMs = 1000 / 60
  })

  it('creates a state sized for the audio texture', () => {
    const s = createAudioFeatureState()
    expect(s.rows.length).toBe(AUDIO_TEX_WIDTH * AUDIO_TEX_ROWS)
    expect(s.smooth.length).toBe(AUDIO_TEX_WIDTH)
    expect(s.bands.length).toBe(4)
  })

  it('computes bands in 0–1 and silence yields zeros', () => {
    const len = 1024
    const silent = computeBands(new Uint8Array(len), len)
    expect(Array.from(silent)).toEqual([0, 0, 0, 0])

    const loud = computeBands(
      spectrum(len, () => 255),
      len,
    )
    for (const v of loud) {
      expect(v).toBeGreaterThan(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('separates bass from treble', () => {
    const len = 1024
    const bassOnly = spectrum(len, (i) => (i < 60 ? 255 : 0))
    const b = computeBands(bassOnly, len)
    expect(b[0]).toBeGreaterThan(0.5)
    expect(b[2]).toBe(0)
  })

  it('fills row 0 with the raw spectrum and row 1 with a smoothed version', () => {
    const len = 1024
    const state = createAudioFeatureState()
    const data = spectrum(len, () => 255)
    updateAudioFeatures(state, data, len)

    // Row 0: raw → every texel is 255 for a flat full-scale spectrum.
    for (let x = 0; x < AUDIO_TEX_WIDTH; x++) expect(state.rows[x]).toBe(255)

    // Row 1: smoothed → after one frame it must be above zero but not yet at
    // the target (smoothing), then approach the target over more frames.
    const first = state.rows[AUDIO_TEX_WIDTH + 10]
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(255)
    for (let i = 0; i < 120; i++) updateAudioFeatures(state, data, len)
    const later = state.rows[AUDIO_TEX_WIDTH + 10]
    expect(later).toBeGreaterThan(first)
  })

  it('keeps every texel within 0–255 for extreme input', () => {
    const len = 1024
    const state = createAudioFeatureState()
    const data = spectrum(len, (i) => (i % 2 ? 255 : 0))
    for (let i = 0; i < 30; i++) updateAudioFeatures(state, data, len)
    for (const v of state.rows) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(255)
    }
  })

  it('handles a tiny buffer without throwing', () => {
    const state = createAudioFeatureState()
    expect(() => updateAudioFeatures(state, new Uint8Array(2), 2)).not.toThrow()
    expect(() => updateAudioFeatures(state, new Uint8Array(0), 0)).not.toThrow()
  })

  it('reset clears smoothing and bands', () => {
    const len = 1024
    const state = createAudioFeatureState()
    updateAudioFeatures(
      state,
      spectrum(len, () => 200),
      len,
    )
    resetAudioFeatureState(state)
    expect(state.rows.every((v) => v === 0)).toBe(true)
    expect(state.smooth.every((v) => v === 0)).toBe(true)
    expect(Array.from(state.bands)).toEqual([0, 0, 0, 0])
  })
})
