import { describe, it, expect } from 'vitest'
import {
  REACT_SOURCES,
  REACT_EASINGS,
  DEFAULT_REACT_SHAPE,
  isReactSource,
  isOnsetSource,
  reactDrive,
  advanceReactEnvelope,
  reactFactor,
  applyReactFactor,
  smoothingCoefficient,
  shapeReactDrive,
  shapeReactLevel,
  stepReactGate,
  normalizeReactShape,
  normalizeReactSmoothing,
  normalizeReactGain,
  normalizeReactBeatBoost,
  normalizeReactPhase,
  normalizeReactEasing,
} from '../../lib/visualizers/core/reactSource.js'
import { easingNames } from '../../lib/audio/EasingFunctions.js'

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

  describe('shaping (same controls as the image audio-reactive panel)', () => {
    it('smoothing 50 keeps the classic envelope, 0 is instant, 100 glides', () => {
      // Onset: classic retain of 0.86 per frame ⇒ decay share 0.14.
      expect(smoothingCoefficient(50, 0.14)).toBeCloseTo(0.14, 6)
      expect(smoothingCoefficient(0, 0.14)).toBe(1)
      expect(smoothingCoefficient(100, 0.14)).toBeLessThan(0.14 / 4)
      // Default parameter reproduces the previous behaviour exactly.
      expect(advanceReactEnvelope(0.9, 0, 'allOnset')).toBeCloseTo(0.9 * 0.86, 6)
      expect(advanceReactEnvelope(0, 1, 'bass')).toBeCloseTo(0.35, 6)
      // Smoothing 0 follows the drive instantly on both source kinds.
      expect(advanceReactEnvelope(0.9, 0, 'allOnset', undefined, 0)).toBe(0)
      expect(advanceReactEnvelope(0, 1, 'bass', undefined, 0)).toBe(1)
      // Smoothing 100 holds the kick longer and breathes slower.
      expect(advanceReactEnvelope(0.9, 0, 'allOnset', undefined, 100)).toBeGreaterThan(0.9 * 0.86)
      expect(advanceReactEnvelope(0, 1, 'bass', undefined, 100)).toBeLessThan(0.35)
      // Onset attack stays instant whatever the smoothing.
      expect(advanceReactEnvelope(0, 0.8, 'bassOnset', undefined, 100)).toBe(0.8)
    })

    it('beat boost lifts the drive only on a detected beat, phase modulates over time', () => {
      const quiet = { isBeat: false, beatIntensity: 1 }
      const beat = { isBeat: true, beatIntensity: 1 }
      expect(shapeReactDrive(0.4, beat, {})).toBe(0.4) // default boost = off
      expect(shapeReactDrive(0.4, quiet, { reactBeatBoost: 2 })).toBe(0.4)
      expect(shapeReactDrive(0.4, beat, { reactBeatBoost: 2 })).toBeCloseTo(0.8, 6)
      expect(shapeReactDrive(0.9, beat, { reactBeatBoost: 3 })).toBe(1) // clamped
      // Phase: sinusoidal modifier between 0.5 and 1.0 of the drive.
      const seen = new Set()
      for (let t = 0; t < 4000; t += 100) {
        const v = shapeReactDrive(1, null, { reactPhase: 90 }, t)
        expect(v).toBeGreaterThanOrEqual(0.5 - 1e-9)
        expect(v).toBeLessThanOrEqual(1)
        seen.add(v.toFixed(3))
      }
      expect(seen.size).toBeGreaterThan(5)
      expect(shapeReactDrive(1, null, { reactPhase: 0 }, 1234)).toBe(1)
    })

    it('easing and gain shape the envelope like the image path', () => {
      expect(shapeReactLevel(0.5, {})).toBe(0.5)
      expect(shapeReactLevel(0.5, { reactEasing: 'easeIn' })).toBeCloseTo(0.125, 6)
      expect(shapeReactLevel(0.5, { reactGain: 200 })).toBe(1)
      expect(shapeReactLevel(0.3, { reactGain: 200 })).toBeCloseTo(0.6, 6)
      expect(shapeReactLevel(0.9, { reactGain: 0 })).toBe(0)
      expect(shapeReactLevel(0.5, { reactGain: 50, reactEasing: 'linear' })).toBeCloseTo(0.25, 6)
    })

    it('offers exactly the easings the image panel offers', () => {
      for (const e of REACT_EASINGS) expect(easingNames).toContain(e)
      expect(REACT_EASINGS).toEqual([
        'linear',
        'easeIn',
        'easeOut',
        'easeInOut',
        'bounce',
        'elastic',
        'punch',
      ])
    })

    it('normalises every shaping field and falls back to the defaults', () => {
      expect(normalizeReactSmoothing(120)).toBe(100)
      expect(normalizeReactSmoothing(-3)).toBe(0)
      expect(normalizeReactSmoothing('abc')).toBe(50)
      expect(normalizeReactGain(999)).toBe(200)
      expect(normalizeReactGain(undefined)).toBe(100)
      expect(normalizeReactBeatBoost(0.2)).toBe(1)
      expect(normalizeReactBeatBoost(2.26)).toBe(2.3)
      expect(normalizeReactBeatBoost(9)).toBe(3)
      expect(normalizeReactPhase(400)).toBe(360)
      expect(normalizeReactPhase(null)).toBe(0)
      expect(normalizeReactEasing('bounce')).toBe('bounce')
      expect(normalizeReactEasing('sineIn')).toBe('linear') // not offered
      expect(normalizeReactShape(null)).toEqual(DEFAULT_REACT_SHAPE)
      expect(normalizeReactShape({ reactGain: 150, reactPhase: 45 })).toEqual({
        ...DEFAULT_REACT_SHAPE,
        reactGain: 150,
        reactPhase: 45,
      })
    })

    it('stepReactGate runs the whole chain and returns state plus factor', () => {
      const data = { onsetBass: 1, isBeat: false }
      const settings = { reactSource: 'bassOnset', reactStrength: 100 }
      let { env, factor } = stepReactGate(0, settings, data)
      expect(env).toBe(1)
      expect(factor).toBe(1)
      ;({ env, factor } = stepReactGate(env, settings, { onsetBass: 0 }))
      expect(env).toBeCloseTo(0.86, 6)
      expect(factor).toBeCloseTo(0.86, 6)
      // Strength blends; gain scales the level before the blend.
      const half = stepReactGate(0, { ...settings, reactStrength: 50 }, { onsetBass: 0 })
      expect(half.factor).toBe(0.5)
      const gained = stepReactGate(0, { ...settings, reactGain: 200 }, { onsetBass: 0.4 })
      expect(gained.factor).toBeCloseTo(0.8, 6)
      // Missing settings fall back to defaults (spectrum ⇒ untouched).
      expect(stepReactGate(0, {}, data).factor).toBe(1)
    })
  })
})
