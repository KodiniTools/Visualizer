import { describe, it, expect } from 'vitest'
import {
  onsetForSource,
  advancePunch,
  punchScale,
} from '../../lib/visualizers/core/onsetReactive.js'

describe('onsetForSource', () => {
  const data = { onsetBass: 0.8, onsetMid: 0.4, onsetTreble: 0.2, onsetAll: 0.6 }

  it('maps each source key to its onset field', () => {
    expect(onsetForSource(data, 'bass')).toBe(0.8)
    expect(onsetForSource(data, 'mid')).toBe(0.4)
    expect(onsetForSource(data, 'treble')).toBe(0.2)
    expect(onsetForSource(data, 'all')).toBe(0.6)
  })

  it("defaults to 'all' for unknown/missing source", () => {
    expect(onsetForSource(data)).toBe(0.6)
    expect(onsetForSource(data, 'nope')).toBe(0.6)
  })

  it('returns 0 when data or field is missing', () => {
    expect(onsetForSource(null, 'bass')).toBe(0)
    expect(onsetForSource({}, 'bass')).toBe(0)
  })

  it('clamps to 0–1', () => {
    expect(onsetForSource({ onsetBass: 5 }, 'bass')).toBe(1)
    expect(onsetForSource({ onsetBass: -2 }, 'bass')).toBe(0)
  })
})

describe('advancePunch', () => {
  it('jumps instantly to a rising onset (fast attack)', () => {
    expect(advancePunch(0, 0.9)).toBe(0.9)
    expect(advancePunch(0.3, 0.7)).toBe(0.7)
  })

  it('decays when the onset falls below the envelope', () => {
    expect(advancePunch(1, 0, 0.85)).toBeCloseTo(0.85, 5)
    expect(advancePunch(0.5, 0.1, 0.8)).toBeCloseTo(0.4, 5)
  })

  it('seeds cleanly from a non-finite previous value', () => {
    expect(advancePunch(undefined, 0.5)).toBe(0.5)
    expect(advancePunch(NaN, 0.2)).toBe(0.2)
  })

  it('converges to ~0 over repeated silent frames', () => {
    let env = 1
    for (let i = 0; i < 100; i++) env = advancePunch(env, 0, 0.85)
    expect(env).toBeLessThan(0.001)
  })
})

describe('punchScale', () => {
  it('is identity (1.0) at zero envelope or zero strength', () => {
    expect(punchScale(0, 100)).toBe(1)
    expect(punchScale(1, 0)).toBe(1)
  })

  it('scales with envelope and strength up to maxScale', () => {
    expect(punchScale(1, 100, 0.12)).toBeCloseTo(1.12, 5)
    expect(punchScale(1, 50, 0.12)).toBeCloseTo(1.06, 5)
    expect(punchScale(0.5, 100, 0.12)).toBeCloseTo(1.06, 5)
  })

  it('clamps envelope and strength to valid ranges', () => {
    expect(punchScale(5, 200, 0.12)).toBeCloseTo(1.12, 5)
    expect(punchScale(-1, -1, 0.12)).toBe(1)
  })
})
