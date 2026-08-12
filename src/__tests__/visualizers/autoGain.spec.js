import { describe, it, expect, beforeEach } from 'vitest'
import { autoGain } from '../../lib/visualizers/core/autoGain.js'
import { peakRange } from '../../lib/visualizers/core/helpers.js'
import { visualizerState } from '../../lib/visualizers/core/state.js'

describe('peakRange', () => {
  it('returns the max value in the range', () => {
    expect(peakRange([1, 9, 3, 200, 4], 0, 5)).toBe(200)
    expect(peakRange([1, 9, 3, 200, 4], 0, 3)).toBe(9)
  })

  it('clamps the start and guarantees at least one sample', () => {
    expect(peakRange([5, 2], -3, 1)).toBe(5)
    expect(peakRange([7], 0, 0)).toBe(7)
  })

  it('treats missing entries as 0', () => {
    expect(peakRange(new Array(4), 0, 4)).toBe(0)
  })
})

describe('autoGain', () => {
  beforeEach(() => {
    // Clear any peak/config state between tests.
    for (const k of Object.keys(visualizerState)) {
      if (k.startsWith('_ag_') || k === '_autoGain') delete visualizerState[k]
    }
  })

  it('is identity (1) when config is absent or disabled', () => {
    expect(autoGain(0.3, 'x')).toBe(1)
    visualizerState._autoGain = { enabled: false, strength: 100 }
    expect(autoGain(0.3, 'x')).toBe(1)
  })

  it('boosts a quiet signal toward the target', () => {
    visualizerState._autoGain = { enabled: true, strength: 100 }
    // Quiet reference (0.3): recent peak ~0.3 → gain ~0.9/0.3 = 3.
    const g = autoGain(0.3, 'quiet')
    expect(g).toBeGreaterThan(2)
    expect(g).toBeLessThanOrEqual(4)
  })

  it('leaves a loud signal near unity (no runaway boost)', () => {
    visualizerState._autoGain = { enabled: true, strength: 100 }
    const g = autoGain(1.0, 'loud')
    // peak ~1 → gain ~0.9; peak-referenced value*gain stays ≤ ~target.
    expect(g).toBeGreaterThan(0.5)
    expect(g).toBeLessThan(1.05)
  })

  it('self-limits: reference * gain never exceeds ~target for the peak band', () => {
    visualizerState._autoGain = { enabled: true, strength: 100 }
    for (const ref of [0.15, 0.35, 0.6, 0.85]) {
      const g = autoGain(ref, `k_${ref}`)
      expect(ref * g).toBeLessThanOrEqual(0.95)
    }
  })

  it('scales the effect by strength (0 = identity)', () => {
    visualizerState._autoGain = { enabled: true, strength: 0 }
    expect(autoGain(0.2, 'zero')).toBe(1)
  })

  it('caps the boost at 4x for near-silence', () => {
    visualizerState._autoGain = { enabled: true, strength: 100 }
    const g = autoGain(0, 'silent')
    expect(g).toBeLessThanOrEqual(4)
  })

  it('keeps independent peak state per key', () => {
    visualizerState._autoGain = { enabled: true, strength: 100 }
    autoGain(0.9, 'a')
    autoGain(0.2, 'b')
    expect(visualizerState._ag_a).not.toBe(visualizerState._ag_b)
  })
})
