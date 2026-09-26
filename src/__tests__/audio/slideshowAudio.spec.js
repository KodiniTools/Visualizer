import { describe, it, expect } from 'vitest'
import {
  resolveSlideshowAudioReactive,
  isValidSlideshowAudioMode,
} from '../../lib/slideshowAudio.js'

const saved = { enabled: true, source: 'mid', effects: { glow: { enabled: true, intensity: 42 } } }

describe('resolveSlideshowAudioReactive', () => {
  it("'default' folgt der globalen Option", () => {
    expect(
      resolveSlideshowAudioReactive('default', { applyGlobal: true, savedSettings: saved }),
    ).toEqual(saved)
    expect(
      resolveSlideshowAudioReactive('default', { applyGlobal: false, savedSettings: saved }),
    ).toBeNull()
    expect(
      resolveSlideshowAudioReactive(undefined, { applyGlobal: true, savedSettings: null }),
    ).toBeNull()
  })

  it("'off' liefert eine deaktivierte Konfiguration (kein globaler Fallback)", () => {
    const ar = resolveSlideshowAudioReactive('off', { applyGlobal: true, savedSettings: saved })
    expect(ar.enabled).toBe(false)
    expect(Object.values(ar.effects).every((fx) => !fx.enabled)).toBe(true)
  })

  it("'saved' nutzt gespeicherte Einstellungen unabhängig von der Checkbox (als Kopie)", () => {
    const ar = resolveSlideshowAudioReactive('saved', { applyGlobal: false, savedSettings: saved })
    expect(ar).toEqual(saved)
    expect(ar).not.toBe(saved)
    expect(
      resolveSlideshowAudioReactive('saved', { applyGlobal: true, savedSettings: null }),
    ).toBeNull()
  })

  it('Preset-ID erzeugt die Preset-Konfiguration', () => {
    const ar = resolveSlideshowAudioReactive('pulse', { applyGlobal: false, savedSettings: null })
    expect(ar.enabled).toBe(true)
    expect(ar.source).toBe('bass')
    expect(ar.effects.scale.enabled).toBe(true)
    expect(ar.effects.glow.enabled).toBe(true)
    expect(ar.effects.shake.enabled).toBe(false)
  })

  it('ungültige Modi werden wie Standard behandelt', () => {
    expect(isValidSlideshowAudioMode('toString')).toBe(false)
    expect(isValidSlideshowAudioMode('glitch')).toBe(true)
    expect(
      resolveSlideshowAudioReactive('toString', { applyGlobal: false, savedSettings: saved }),
    ).toBeNull()
  })
})
