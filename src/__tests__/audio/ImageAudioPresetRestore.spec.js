import { describe, it, expect, beforeEach } from 'vitest'
import { useImageAudioReactive } from '../../composables/useImageAudioReactive.js'

/**
 * "Kein Preset": nach dem Aktivieren eines Bild-Presets muss der Nutzer seine
 * eigenen (benutzerdefinierten) Audio-Reaktiv-Effekte wieder herstellen können.
 */

function makeAr() {
  return {
    enabled: true,
    source: 'treble',
    easing: 'linear',
    beatBoost: 1.0,
    smoothing: 50,
    phase: 0,
    gain: 1.0,
    effects: {
      hue: { enabled: true, intensity: 42, source: null },
      scale: { enabled: false, intensity: 80, source: null },
      glow: { enabled: false, intensity: 80, source: null },
      shake: { enabled: true, intensity: 33, source: 'mid' },
    },
  }
}

describe('useImageAudioReactive – Kein Preset', () => {
  let api, img

  beforeEach(() => {
    const fotoManager = { value: { initializeImageSettings: () => {} } }
    api = useImageAudioReactive(fotoManager)
    img = { id: 'img1', fotoSettings: { audioReactive: makeAr() } }
    api.currentActiveImage.value = img
    api.activeAudioPreset.value = null
  })

  it('restores the user effects after a preset via clearAudioPreset', () => {
    api.toggleAudioPreset('pulse')
    const ar = img.fotoSettings.audioReactive
    expect(api.activeAudioPreset.value).toBe('pulse')
    expect(ar.effects.scale.enabled).toBe(true) // preset enabled scale
    expect(ar.effects.hue.enabled).toBe(false) // preset disabled the user's hue

    api.clearAudioPreset()
    expect(api.activeAudioPreset.value).toBe(null)
    // Custom effects are back exactly as before
    expect(ar.effects.hue.enabled).toBe(true)
    expect(ar.effects.hue.intensity).toBe(42)
    expect(ar.effects.shake.enabled).toBe(true)
    expect(ar.effects.shake.source).toBe('mid')
    expect(ar.effects.scale.enabled).toBe(false)
    expect(ar.source).toBe('treble')
  })

  it('keeps the original custom snapshot when switching preset → preset', () => {
    api.toggleAudioPreset('pulse')
    api.toggleAudioPreset('glow') // must NOT overwrite the custom snapshot
    expect(api.activeAudioPreset.value).toBe('glow')

    api.clearAudioPreset()
    const ar = img.fotoSettings.audioReactive
    expect(ar.effects.hue.enabled).toBe(true)
    expect(ar.effects.hue.intensity).toBe(42)
  })
})
