import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { onsetFlourish } from '../../lib/visualizers/core/onsetFlourish.js'
import { visualizerState } from '../../lib/visualizers/core/state.js'

describe('onsetFlourish', () => {
  beforeEach(() => {
    delete visualizerState._onsetFx
    globalThis.window = {
      audioAnalysisData: { onsetBass: 0.8, onsetMid: 0.4, onsetTreble: 0.2, onsetAll: 0.6 },
    }
  })
  afterEach(() => {
    delete globalThis.window
  })

  it('returns 0 when config is absent or disabled', () => {
    expect(onsetFlourish('all')).toBe(0)
    visualizerState._onsetFx = { enabled: false, strength: 100 }
    expect(onsetFlourish('all')).toBe(0)
  })

  it('returns the band onset scaled by strength when enabled', () => {
    visualizerState._onsetFx = { enabled: true, strength: 100 }
    expect(onsetFlourish('bass')).toBeCloseTo(0.8, 5)
    expect(onsetFlourish('all')).toBeCloseTo(0.6, 5)

    visualizerState._onsetFx = { enabled: true, strength: 50 }
    expect(onsetFlourish('bass')).toBeCloseTo(0.4, 5)
  })

  it("defaults to the 'all' band for unknown/missing source", () => {
    visualizerState._onsetFx = { enabled: true, strength: 100 }
    expect(onsetFlourish()).toBeCloseTo(0.6, 5)
    expect(onsetFlourish('nope')).toBeCloseTo(0.6, 5)
  })

  it('returns 0 when there is no audio data', () => {
    visualizerState._onsetFx = { enabled: true, strength: 100 }
    globalThis.window = {}
    expect(onsetFlourish('all')).toBe(0)
  })

  it('clamps the onset value to 0–1', () => {
    visualizerState._onsetFx = { enabled: true, strength: 100 }
    globalThis.window = { audioAnalysisData: { onsetAll: 5 } }
    expect(onsetFlourish('all')).toBe(1)
    globalThis.window = { audioAnalysisData: { onsetAll: -3 } }
    expect(onsetFlourish('all')).toBe(0)
  })
})
