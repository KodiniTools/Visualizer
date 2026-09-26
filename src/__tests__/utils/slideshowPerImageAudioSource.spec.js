import { describe, it, expect, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  applySlideshowAudioSource,
  isValidSlideshowAudioSource,
  resolveSlideshowAudioReactive,
} from '../../lib/slideshowAudio.js'
import { normalizeSlideshowPreset } from '../../stores/slideshowPresetStore.js'
import { useSlideshowImageSettingsStore } from '../../stores/slideshowImageSettingsStore.js'
import { SlideshowManager } from '../../lib/slideshowManager.js'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('Slideshow – eigene Audio-Quelle pro Bild', () => {
  it('gültige Quellen wie beim Bild (inkl. Onset/Dynamisch)', () => {
    for (const s of [
      'bass',
      'volume',
      'dynamic',
      'bassOnset',
      'midOnset',
      'trebleOnset',
      'allOnset',
    ]) {
      expect(isValidSlideshowAudioSource(s)).toBe(true)
    }
    for (const s of ['', null, 'default', 'x', 42])
      expect(isValidSlideshowAudioSource(s)).toBe(false)
  })

  it('setzt Master-Quelle, Effekte folgen ihr; ungültig/leer ändert nichts', () => {
    const ar = {
      source: 'bass',
      effects: { hue: { enabled: true, source: 'mid' }, scale: { enabled: true, source: '' } },
    }
    applySlideshowAudioSource(ar, 'allOnset')
    expect(ar.source).toBe('allOnset')
    expect(ar.effects.hue.source).toBe('')
    expect(ar.effects.scale.source).toBe('')
    const untouched = { source: 'mid', effects: {} }
    applySlideshowAudioSource(untouched, null)
    applySlideshowAudioSource(untouched, 'nope')
    expect(untouched.source).toBe('mid')
    expect(applySlideshowAudioSource(null, 'bass')).toBeNull()
  })

  it('resolve: Preset/Gespeichert/Standard bekommen die Quelle; ohne Einstellung bleibt null', () => {
    const preset = resolveSlideshowAudioReactive('pulse', {
      applyGlobal: false,
      savedSettings: null,
      source: 'bassOnset',
    })
    expect(preset.source).toBe('bassOnset')
    const saved = { enabled: true, source: 'treble', effects: {} }
    const fromSaved = resolveSlideshowAudioReactive('saved', {
      applyGlobal: false,
      savedSettings: saved,
      source: 'midOnset',
    })
    expect(fromSaved.source).toBe('midOnset')
    expect(saved.source).toBe('treble') // Original unverändert (Kopie)
    const global = resolveSlideshowAudioReactive('default', {
      applyGlobal: true,
      savedSettings: saved,
      source: 'dynamic',
    })
    expect(global.source).toBe('dynamic')
    expect(
      resolveSlideshowAudioReactive('default', {
        applyGlobal: false,
        savedSettings: saved,
        source: 'bass',
      }),
    ).toBeNull()
    // ohne eigene Quelle wie bisher
    expect(
      resolveSlideshowAudioReactive('saved', { applyGlobal: false, savedSettings: saved }).source,
    ).toBe('treble')
  })

  it('dauerhaft pro Bild und in Presets (ungültig → nicht gespeichert)', () => {
    setActivePinia(createPinia())
    const store = useSlideshowImageSettingsStore()
    store.updateImageSettings('upload:a|1x1', { audioSource: 'trebleOnset' })
    expect(store.getImageSettings('upload:a|1x1').audioSource).toBe('trebleOnset')
    store.updateImageSettings('upload:b|1x1', { audioSource: 'evil' })
    expect(store.getImageSettings('upload:b|1x1')).toBeNull()

    const p = normalizeSlideshowPreset({
      id: 1,
      settings: {},
      slots: [{ audioSource: 'allOnset' }, { audioSource: 'x' }, {}],
    })
    expect(p.slots.map((s) => s.audioSource)).toEqual(['allOnset', null, null])
  })

  it('Manager: gemerkte Anpassungen übernehmen die eigene Quelle', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const fotoManager = { initializeImageSettings: (img) => (img.fotoSettings ??= {}) }
    const m = new SlideshowManager({ canvas: { width: 10, height: 10 } }, fotoManager)
    const obj = {}
    m.config.images = [{ audioSource: 'bassOnset' }]
    m._panelAr = ['P']
    m._imageMemory.set(obj, {
      fotoSettings: {
        sepia: 5,
        audioReactive: { source: 'bass', effects: { hue: { source: 'mid' } } },
      },
      panelAr: 'P',
    })
    const imageData = { imageObject: obj }
    m._restoreImageSettings(imageData, 0)
    expect(imageData.fotoSettings.sepia).toBe(5)
    expect(imageData.fotoSettings.audioReactive.source).toBe('bassOnset')
    expect(imageData.fotoSettings.audioReactive.effects.hue.source).toBe('')
    // Speicher selbst bleibt unverändert (Kopie)
    expect(m._imageMemory.get(obj).fotoSettings.audioReactive.source).toBe('bass')
  })
})
