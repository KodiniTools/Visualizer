import { describe, it, expect, beforeEach } from 'vitest'
import {
  AUDIO_TEX_WIDTH,
  AUDIO_TEX_ROWS,
  AUDIO_HISTORY_ROWS,
  createAudioFeatureState,
  resetAudioFeatureState,
  computeBands,
  updateAudioFeatures,
  updateAudioFeaturesFromTime,
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

  describe('spectrum history ring', () => {
    it('keeps the last smoothed rows and advances the head each frame', () => {
      const len = 1024
      const state = createAudioFeatureState()
      expect(AUDIO_TEX_ROWS).toBe(2 + AUDIO_HISTORY_ROWS)

      // 10 loud frames, then 10 silent frames.
      for (let i = 0; i < 10; i++)
        updateAudioFeatures(
          state,
          spectrum(len, () => 255),
          len,
        )
      const headAfterLoud = state.historyHead
      const loudRow = state.rows.slice(
        (2 + headAfterLoud) * AUDIO_TEX_WIDTH,
        (3 + headAfterLoud) * AUDIO_TEX_WIDTH,
      )
      expect(Math.max(...loudRow)).toBeGreaterThan(0)

      for (let i = 0; i < 10; i++) updateAudioFeatures(state, new Uint8Array(len), len)
      expect(state.historyHead).toBe((headAfterLoud + 10) % AUDIO_HISTORY_ROWS)
      // The loud row is still in the ring, 10 frames back.
      const kept = state.rows.slice(
        (2 + headAfterLoud) * AUDIO_TEX_WIDTH,
        (3 + headAfterLoud) * AUDIO_TEX_WIDTH,
      )
      expect(Array.from(kept)).toEqual(Array.from(loudRow))
      // The newest row is (nearly) silent again after smoothing decays.
      const newest = state.rows.slice(
        (2 + state.historyHead) * AUDIO_TEX_WIDTH,
        (3 + state.historyHead) * AUDIO_TEX_WIDTH,
      )
      expect(Math.max(...newest)).toBeLessThan(Math.max(...loudRow))
    })

    it('wraps around after AUDIO_HISTORY_ROWS frames', () => {
      const len = 1024
      const state = createAudioFeatureState()
      for (let i = 0; i < AUDIO_HISTORY_ROWS + 3; i++)
        updateAudioFeatures(state, new Uint8Array(len), len)
      expect(state.historyHead).toBe(3)
      expect(state.rows.length).toBe(AUDIO_TEX_WIDTH * AUDIO_TEX_ROWS)
    })
  })

  describe('time-domain path', () => {
    function wave(len, fn) {
      const arr = new Uint8Array(len)
      for (let i = 0; i < len; i++) arr[i] = Math.max(0, Math.min(255, Math.round(128 + fn(i))))
      return arr
    }

    it('keeps a silent waveform centred with an empty envelope and zero bands', () => {
      const len = 1024
      const state = createAudioFeatureState()
      updateAudioFeaturesFromTime(
        state,
        wave(len, () => 0),
        len,
      )
      for (let x = 0; x < AUDIO_TEX_WIDTH; x++) {
        expect(state.rows[x]).toBe(128)
        expect(state.rows[AUDIO_TEX_WIDTH + x]).toBe(0)
      }
      expect(Array.from(state.bands)).toEqual([0, 0, 0, 0])
    })

    it('writes the raw waveform into row 0 and a rising envelope into row 1', () => {
      const len = 1024
      const state = createAudioFeatureState()
      const data = wave(len, (i) => 100 * Math.sin(i * 0.2))
      for (let i = 0; i < 30; i++) updateAudioFeaturesFromTime(state, data, len)
      let min = 255
      let max = 0
      let envMax = 0
      for (let x = 0; x < AUDIO_TEX_WIDTH; x++) {
        min = Math.min(min, state.rows[x])
        max = Math.max(max, state.rows[x])
        envMax = Math.max(envMax, state.rows[AUDIO_TEX_WIDTH + x])
      }
      expect(min).toBeLessThan(60)
      expect(max).toBeGreaterThan(190)
      expect(envMax).toBeGreaterThan(150)
      expect(state.bands[3]).toBeGreaterThan(0.3) // volume
      expect(state.bands[3]).toBeLessThanOrEqual(1)
    })

    it('reports a slow wave as bass and a fast wave as treble', () => {
      const len = 2048
      const slow = createAudioFeatureState()
      updateAudioFeaturesFromTime(
        slow,
        wave(len, (i) => 100 * Math.sin(i * 0.02)),
        len,
      )
      const fast = createAudioFeatureState()
      updateAudioFeaturesFromTime(
        fast,
        wave(len, (i) => 100 * Math.sin(i * 2.5)),
        len,
      )
      expect(slow.bands[0]).toBeGreaterThan(fast.bands[0])
      expect(fast.bands[2]).toBeGreaterThan(slow.bands[2])
    })
  })
})
