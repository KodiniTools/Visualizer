import { describe, it, expect } from 'vitest'
import { applyEasing } from '../../lib/textManager/animation/easing.js'
import { ensureAnimationState } from '../../lib/textManager/animation/state.js'
import { easeIn as audioEaseIn, easeOut as audioEaseOut } from '../../lib/audio/EasingFunctions.js'

/**
 * Tests für die gemeinsamen Animations-Bausteine
 * (siehe docs/REFACTORING-textManager.md, Schritte 3–4).
 */

describe('applyEasing', () => {
  it('ist an den Rändern für jede Kurve 0 bzw. 1', () => {
    for (const kurve of ['linear', 'easeIn', 'easeOut', 'ease', undefined]) {
      expect(applyEasing(0, kurve)).toBe(0)
      expect(applyEasing(1, kurve)).toBe(1)
    }
  })

  it('bildet linear unverändert ab', () => {
    expect(applyEasing(0.25, 'linear')).toBe(0.25)
    expect(applyEasing(0.75, 'linear')).toBe(0.75)
  })

  it('verwendet QUADRATISCHE Kurven – nicht die kubischen aus audio/EasingFunctions', () => {
    // Dieser Test ist Absicht: ein "Aufräumen" per Import aus audio/EasingFunctions.js
    // würde jede bestehende Text-Animation sichtbar verändern.
    expect(applyEasing(0.5, 'easeIn')).toBeCloseTo(0.25, 10) // t² statt t³
    expect(applyEasing(0.5, 'easeOut')).toBeCloseTo(0.75, 10)

    expect(audioEaseIn(0.5)).toBeCloseTo(0.125, 10)
    expect(audioEaseOut(0.5)).toBeCloseTo(0.875, 10)
    expect(applyEasing(0.5, 'easeIn')).not.toBeCloseTo(audioEaseIn(0.5), 3)
  })

  it('nutzt für "ease" und unbekannte Namen Ease-In-Out', () => {
    expect(applyEasing(0.5, 'ease')).toBeCloseTo(0.5, 10)
    expect(applyEasing(0.25, 'ease')).toBeCloseTo(0.125, 10)
    expect(applyEasing(0.75, 'ease')).toBeCloseTo(0.875, 10)
    expect(applyEasing(0.25, 'unbekannt')).toBe(applyEasing(0.25, 'ease'))
  })

  it('ist monoton steigend', () => {
    for (const kurve of ['linear', 'easeIn', 'easeOut', 'ease']) {
      let vorher = -Infinity
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const wert = applyEasing(t, kurve)
        expect(wert).toBeGreaterThanOrEqual(vorher)
        vorher = wert
      }
    }
  })
})

describe('ensureAnimationState', () => {
  it('legt einen fehlenden Zustand an', () => {
    const animation = {}
    const state = ensureAnimationState(animation)
    expect(state).toEqual({ startTime: null, isPlaying: false, currentIndex: 0 })
    expect(animation._state).toBe(state)
  })

  it('lässt einen vorhandenen Zustand unangetastet', () => {
    const vorhanden = { startTime: 42, isPlaying: true, currentIndex: 7, fadeStartTime: 99 }
    const animation = { _state: vorhanden }
    expect(ensureAnimationState(animation)).toBe(vorhanden)
    expect(animation._state).toEqual(vorhanden)
  })
})
