import { describe, it, expect } from 'vitest'
import { EFFECT_NAMES } from '../../lib/audio/AudioReactiveEffects'
import { FotoManager, type FotoImageObject, type FotoSettings } from '../../lib/fotoManager'

describe('FotoManager – Audio-Reaktiv-Konfiguration', () => {
  it('gives new images the full shared config, each its own copy', () => {
    const fm = new FotoManager(() => {})
    const a: FotoImageObject = {}
    const b: FotoImageObject = {}
    fm.initializeImageSettings(a)
    fm.initializeImageSettings(b)
    const sa = a.fotoSettings as FotoSettings
    const sb = b.fotoSettings as FotoSettings
    expect(Object.keys(sa.audioReactive.effects).sort()).toEqual([...EFFECT_NAMES].sort())
    expect(sa.audioReactive).toMatchObject({ easing: 'linear', beatBoost: 1, gain: 1 })
    sa.audioReactive.effects.hue!.enabled = true
    expect(sb.audioReactive.effects.hue!.enabled).toBe(false)
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
    const before = img.fotoSettings.audioReactive as Record<string, unknown> & {
      effects: Record<string, unknown>
    }
    // Altes Format: unvollständige Konfiguration wird ergänzt
    fm.initializeImageSettings(img as unknown as FotoImageObject)
    expect(img.fotoSettings.audioReactive).toBe(before)
    expect(img.fotoSettings.brightness).toBe(120)
    expect(before.effects.hue).toEqual({ enabled: true, intensity: 33, source: null })
    expect(before.effects.beatFlip).toEqual({ enabled: false, intensity: 80, source: null })
    expect(before.gain).toBe(1)
  })
})
