import { describe, it, expect } from 'vitest'
import { EFFECT_NAMES } from '../../lib/audio/AudioReactiveEffects.js'
import { FotoManager } from '../../lib/fotoManager.js'

describe('FotoManager – Audio-Reaktiv-Konfiguration', () => {
  it('gives new images the full shared config, each its own copy', () => {
    const fm = new FotoManager(() => {})
    const a = {}
    const b = {}
    fm.initializeImageSettings(a)
    fm.initializeImageSettings(b)
    expect(Object.keys(a.fotoSettings.audioReactive.effects).sort()).toEqual(
      [...EFFECT_NAMES].sort(),
    )
    expect(a.fotoSettings.audioReactive).toMatchObject({ easing: 'linear', beatBoost: 1, gain: 1 })
    a.fotoSettings.audioReactive.effects.hue.enabled = true
    expect(b.fotoSettings.audioReactive.effects.hue.enabled).toBe(false)
  })

  it('completes legacy image configs in place without losing user values', () => {
    const fm = new FotoManager(() => {})
    const img = {
      fotoSettings: {
        brightness: 120,
        audioReactive: {
          enabled: true,
          source: 'mid',
          effects: {
            hue: { enabled: true, intensity: 33 },
            orbit: { enabled: true, intensity: 50 },
          },
        },
      },
    }
    const before = img.fotoSettings.audioReactive
    fm.initializeImageSettings(img)
    expect(img.fotoSettings.audioReactive).toBe(before)
    expect(img.fotoSettings.brightness).toBe(120)
    expect(before.effects.hue).toEqual({ enabled: true, intensity: 33, source: null })
    expect(before.effects.beatFlip).toEqual({ enabled: false, intensity: 80, source: null })
    expect(before.gain).toBe(1)
  })
})
