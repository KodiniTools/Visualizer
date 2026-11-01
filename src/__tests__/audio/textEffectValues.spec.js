// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import {
  calculateTextEffectValue,
  getAudioReactiveValues,
} from '../../lib/textManager/audio/textEffectValues.js'
import { createTextAudioReactiveConfig } from '../../lib/audio/audioReactiveConfig.js'
import { setAudioAnalysisData } from '../../lib/audio/audioAnalysisData.js'

/**
 * Tests für den Text-Audio-Pfad (docs/REFACTORING-textManager.md, Schritte 6–7).
 */

const LAUT = { bass: 255, mid: 200, treble: 180, volume: 240 }

function konfig(master = {}, effekte = {}) {
  const ar = createTextAudioReactiveConfig({ enabled: true, ...master })
  for (const [name, cfg] of Object.entries(effekte)) {
    Object.assign(ar.effects[name], { enabled: true, intensity: 100 }, cfg)
  }
  return ar
}

describe('getAudioReactiveValues', () => {
  afterEach(() => {
    setAudioAnalysisData(null)
  })

  it('gibt null zurück ohne Konfiguration, ohne enabled, ohne Audio oder ohne Effekte', () => {
    setAudioAnalysisData(LAUT)
    expect(getAudioReactiveValues(null)).toBeNull()
    expect(getAudioReactiveValues(undefined)).toBeNull()
    expect(getAudioReactiveValues({ enabled: false })).toBeNull()
    expect(getAudioReactiveValues(konfig())).toBeNull() // kein Effekt aktiv

    setAudioAnalysisData(null)
    expect(getAudioReactiveValues(konfig({}, { hue: {} }))).toBeNull()
  })

  it('berechnet nur aktivierte Effekte', () => {
    setAudioAnalysisData(LAUT)
    const out = getAudioReactiveValues(konfig({}, { hue: {}, brightness: {} }))

    expect(out.hasEffects).toBe(true)
    expect(Object.keys(out.effects).sort()).toEqual(['brightness', 'hue'])
  })

  it('nutzt die Text-eigene Hüllkurve: threshold gated den Pegel', () => {
    setAudioAnalysisData({ bass: 60, mid: 0, treble: 0, volume: 60 })

    // bass 60/255 ≈ 0.24 – eine Schwelle von 50% schneidet das weg
    const gated = getAudioReactiveValues(konfig({ threshold: 50 }, { hue: {} }))
    expect(gated.effects.hue.hueRotate).toBe(0)

    const offen = getAudioReactiveValues(konfig({ threshold: 0 }, { hue: {} }))
    expect(offen.effects.hue.hueRotate).toBeGreaterThan(0)
  })

  it('respektiert die Audio-Quelle je Effekt', () => {
    setAudioAnalysisData({ bass: 255, mid: 0, treble: 0, volume: 255 })
    const out = getAudioReactiveValues(
      konfig({ source: 'bass', threshold: 0 }, { hue: {}, brightness: { source: 'mid' } }),
    )

    expect(out.effects.hue.hueRotate).toBeGreaterThan(0)
    // 'mid' ist still ⇒ Grundhelligkeit 60%
    expect(out.effects.brightness.brightness).toBeCloseTo(60, 5)
  })

  it('skaliert mit der Intensität des Effekts', () => {
    setAudioAnalysisData(LAUT)
    const voll = getAudioReactiveValues(konfig({ threshold: 0 }, { hue: { intensity: 100 } }))
    const schwach = getAudioReactiveValues(konfig({ threshold: 0 }, { hue: { intensity: 20 } }))

    expect(schwach.effects.hue.hueRotate).toBeLessThan(voll.effects.hue.hueRotate)
  })

  it('hält den Hüllkurven-Zustand je Konfiguration getrennt', () => {
    const a = konfig({ attack: 100, release: 0 }, { hue: {} })
    const b = konfig({ attack: 100, release: 0 }, { hue: {} })

    setAudioAnalysisData(LAUT)
    getAudioReactiveValues(a) // nur a sieht den lauten Frame

    setAudioAnalysisData({ bass: 0, mid: 0, treble: 0, volume: 0 })
    // a klingt aus (release 0 ⇒ haelt den Wert), b startet bei still
    expect(getAudioReactiveValues(a).effects.hue.hueRotate).toBeGreaterThan(0)
    expect(getAudioReactiveValues(b).effects.hue.hueRotate).toBe(0)
  })
})

describe('calculateTextEffectValue', () => {
  it('bildet die Text-Sonderfälle auf ihren Wertebereich ab', () => {
    expect(calculateTextEffectValue('hue', 0.5)).toEqual({ hueRotate: 360 })
    expect(calculateTextEffectValue('brightness', 0.5)).toEqual({ brightness: 120 })
    expect(calculateTextEffectValue('scale', 0.5)).toEqual({ scale: 1.25 })
    expect(calculateTextEffectValue('letterSpacing', 1)).toEqual({ letterSpacing: 30 })
    expect(calculateTextEffectValue('strokeWidth', 1)).toEqual({ strokeWidth: 10 })
  })

  it('reicht unbekannte Effekte an die gemeinsame Bild-Engine weiter', () => {
    expect(calculateTextEffectValue('saturation', 0.5)).toHaveProperty('saturation')
    expect(calculateTextEffectValue('contrast', 0.5)).toHaveProperty('contrast')
  })
})
