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
