import { describe, it, expect, beforeEach } from 'vitest'
import {
  smoothingToEnvelope,
  applyEnvelope,
  computeReactiveLevel,
  makeLevelResolver,
  resetReactiveLevel,
} from '../../lib/audio/ReactiveLevel.js'

describe('smoothingToEnvelope', () => {
  it('is instant (both coefs 1) at smoothing 0', () => {
    const { attack, release } = smoothingToEnvelope(0)
    expect(attack).toBeCloseTo(1, 5)
    expect(release).toBeCloseTo(1, 5)
  })

  it('keeps attack faster than release (snappy up, smooth down)', () => {
    const { attack, release } = smoothingToEnvelope(100)
    expect(attack).toBeGreaterThan(release)
    expect(release).toBeGreaterThan(0)
    expect(release).toBeLessThan(0.2)
  })

  it('clamps out-of-range input', () => {
    expect(smoothingToEnvelope(-50)).toEqual(smoothingToEnvelope(0))
    expect(smoothingToEnvelope(500)).toEqual(smoothingToEnvelope(100))
  })
})

describe('applyEnvelope', () => {
  it('seeds with the target when no previous value', () => {
    expect(applyEnvelope(undefined, 120, 0.5, 0.1)).toBe(120)
    expect(applyEnvelope(NaN, 80, 0.5, 0.1)).toBe(80)
  })

  it('uses the attack coefficient when rising', () => {
    expect(applyEnvelope(0, 100, 0.5, 0.1)).toBeCloseTo(50, 5)
  })

  it('uses the (slower) release coefficient when falling', () => {
    expect(applyEnvelope(100, 0, 0.5, 0.1)).toBeCloseTo(90, 5)
  })
})

describe('computeReactiveLevel', () => {
  const owner = {}
  const audioData = { bass: 255, mid: 128, treble: 64, volume: 100 }

  beforeEach(() => resetReactiveLevel(owner))

  it('returns 0 without audio data', () => {
    expect(computeReactiveLevel(owner, { source: 'bass', audioData: null })).toBe(0)
  })

  it('with smoothing 0 tracks the raw level immediately', () => {
    const level = computeReactiveLevel(owner, { source: 'bass', audioData, smoothing: 0 })
    expect(level).toBeCloseTo(1, 5) // 255/255
  })

  it('applies gain and clamps to 1', () => {
    const level = computeReactiveLevel(owner, {
      source: 'mid',
      audioData,
      smoothing: 0,
      gain: 4,
    })
    expect(level).toBe(1) // 128/255 * 4 clamped
  })

  it('seeds on the first frame, then smooths gradually toward a rising target', () => {
    resetReactiveLevel(owner)
    // Frame 1: silence seeds the envelope at 0.
    const seed = computeReactiveLevel(owner, {
      source: 'bass',
      audioData: { bass: 0 },
      smoothing: 90,
    })
    expect(seed).toBe(0)
    // Frame 2: loud bass — rises, but high smoothing prevents an instant jump.
    const rising = computeReactiveLevel(owner, { source: 'bass', audioData, smoothing: 90 })
    expect(rising).toBeGreaterThan(0)
    expect(rising).toBeLessThan(1)
  })

  it('revives beatBoost when the audio data carries a beat', () => {
    const plain = { bass: 100 }
    const beaty = { bass: 100, isBeat: true, beatIntensity: 1 }
    const a = {}
    const b = {}
    const noBoost = computeReactiveLevel(a, {
      source: 'bass',
      audioData: plain,
      smoothing: 0,
      beatBoost: 2,
    })
    const boosted = computeReactiveLevel(b, {
      source: 'bass',
      audioData: beaty,
      smoothing: 0,
      beatBoost: 2,
    })
    expect(boosted).toBeGreaterThan(noBoost)
  })
})

describe('computeReactiveLevel — text options', () => {
  it('gates quiet signals below the threshold to 0', () => {
    const owner = {}
    resetReactiveLevel(owner)
    // 25% level with a 50% threshold → gated to 0.
    const level = computeReactiveLevel(owner, {
      source: 'bass',
      audioData: { bass: 64 },
      threshold: 0.5,
      attack: 1,
      release: 1,
    })
    expect(level).toBe(0)
  })

  it('rescales above-threshold signals to the full 0–1 range', () => {
    const owner = {}
    resetReactiveLevel(owner)
    // Raw 0.75 with threshold 0.5 → (0.75-0.5)/0.5 = 0.5.
    const level = computeReactiveLevel(owner, {
      source: 'bass',
      audioData: { bass: Math.round(0.75 * 255) },
      threshold: 0.5,
      attack: 1,
      release: 1,
    })
    expect(level).toBeCloseTo(0.5, 2)
  })

  it('honors explicit attack/release over the smoothing slider', () => {
    const owner = {}
    resetReactiveLevel(owner)
    // Seed at 0, then rise with attack 0.25 → 0.25 of the way to 1.0.
    computeReactiveLevel(owner, {
      source: 'bass',
      audioData: { bass: 0 },
      attack: 0.25,
      release: 0.1,
    })
    const level = computeReactiveLevel(owner, {
      source: 'bass',
      audioData: { bass: 255 },
      attack: 0.25,
      release: 0.1,
    })
    expect(level).toBeCloseTo(0.25, 5)
  })

  it('preSmoothing dampens an instant jump on the first change', () => {
    const owner = {}
    resetReactiveLevel(owner)
    // Seed low, then jump; with heavy preSmoothing and instant attack the output
    // still lags because the input is low-passed first.
    computeReactiveLevel(owner, {
      source: 'bass',
      audioData: { bass: 0 },
      preSmoothing: 0.9,
      attack: 1,
      release: 1,
    })
    const level = computeReactiveLevel(owner, {
      source: 'bass',
      audioData: { bass: 255 },
      preSmoothing: 0.9,
      attack: 1,
      release: 1,
    })
    expect(level).toBeGreaterThan(0)
    expect(level).toBeLessThan(1)
  })
})

describe('makeLevelResolver', () => {
  it('advances each source envelope only once per frame (memoized)', () => {
    const owner = {}
    resetReactiveLevel(owner)
    const audioData = { bass: 255 }
    const resolve = makeLevelResolver(owner, { audioData, smoothing: 80 })
    const a = resolve('bass')
    const b = resolve('bass')
    expect(a).toBe(b) // same frame → identical, envelope not double-advanced
  })
})
