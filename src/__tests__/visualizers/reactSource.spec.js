import { describe, it, expect } from 'vitest'
import {
  REACT_SOURCES,
  isReactSource,
  isOnsetSource,
  reactDrive,
  advanceReactEnvelope,
  reactFactor,
  applyReactFactor,
} from '../../lib/visualizers/core/reactSource.js'

describe('reactSource', () => {
  it('knows its sources', () => {
    expect(REACT_SOURCES[0]).toBe('spectrum')
    expect(isReactSource('allOnset')).toBe(true)
    expect(isReactSource('nope')).toBe(false)
    expect(isOnsetSource('bassOnset')).toBe(true)
    expect(isOnsetSource('bass')).toBe(false)
  })

  it('reads the drive from the analysis snapshot on either scale', () => {
    const data = { bass: 128, mid: 0.5, treble: 255, volume: 0, onsetBass: 0.7, onsetAll: 2 }
    expect(reactDrive('spectrum', data)).toBe(1)
    expect(reactDrive('bass', data)).toBeCloseTo(128 / 255, 5)
    expect(reactDrive('mid', data)).toBe(0.5)
    expect(reactDrive('treble', data)).toBe(1)
    expect(reactDrive('volume', data)).toBe(0)
    expect(reactDrive('bassOnset', data)).toBe(0.7)
    expect(reactDrive('allOnset', data)).toBe(1) // clamped
    expect(reactDrive('midOnset', data)).toBe(0) // missing field
    expect(reactDrive('bass', null)).toBe(0)
  })

  it('onset envelope: instant attack, exponential decay', () => {
    let env = advanceReactEnvelope(0, 0.9, 'allOnset')
    expect(env).toBe(0.9)
    env = advanceReactEnvelope(env, 0, 'allOnset')
    expect(env).toBeLessThan(0.9)
    expect(env).toBeGreaterThan(0.7)
    // A larger frame time decays further in one step.
    const slow = advanceReactEnvelope(0.9, 0, 'allOnset', 1000 / 60)
    const fast = advanceReactEnvelope(0.9, 0, 'allOnset', 1000 / 20)
    expect(fast).toBeLessThan(slow)
  })

  it('level envelope: smooths in both directions', () => {
    const up = advanceReactEnvelope(0, 1, 'bass')
    expect(up).toBeGreaterThan(0)
    expect(up).toBeLessThan(1)
    const down = advanceReactEnvelope(1, 0, 'bass')
    expect(down).toBeLessThan(1)
    expect(down).toBeGreaterThan(0)
  })

  it('factor blends between untouched and fully gated by strength', () => {
    expect(reactFactor(0, 0)).toBe(1)
    expect(reactFactor(0, 100)).toBe(0)
    expect(reactFactor(0.5, 100)).toBe(0.5)
    expect(reactFactor(0, 50)).toBe(0.5)
    expect(reactFactor(2, 100)).toBe(1)
  })

  it('scales frequency data towards zero and returns the source when unneeded', () => {
    const src = new Uint8Array([0, 100, 200, 255])
    expect(applyReactFactor(src, 1, null)).toBe(src)
    const out = applyReactFactor(src, 0.5, null)
    expect(out).not.toBe(src)
    expect(Array.from(out)).toEqual([0, 50, 100, 127])
    // Scratch buffer is reused when the size matches.
    const again = applyReactFactor(src, 0.25, out)
    expect(again).toBe(out)
    expect(Array.from(again)).toEqual([0, 25, 50, 63])
  })

  it('scales time-domain data around the centre line', () => {
    const src = new Uint8Array([28, 128, 228])
    const out = applyReactFactor(src, 0.5, null, true)
    expect(Array.from(out)).toEqual([78, 128, 178])
    const silent = applyReactFactor(src, 0, null, true)
    expect(Array.from(silent)).toEqual([128, 128, 128])
  })
})
