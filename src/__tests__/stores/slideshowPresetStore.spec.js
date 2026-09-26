import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useSlideshowPresetStore,
  normalizeSlideshowPreset,
} from '../../stores/slideshowPresetStore.js'

const KEY = 'visualizer-slideshow-presets'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    clear: () => data.clear(),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  setActivePinia(createPinia())
})

const snapshot = {
  settings: {
    fadeInDuration: 500,
    displayDuration: 4000,
    fadeOutDuration: 800,
    applyAudioReactive: false,
    loop: true,
    renderBehindVisualizer: true,
    fitToWorkspace: true,
    transform: { x: 5, y: 15, width: 70, height: 60 },
  },
  slots: [
    { displayDuration: 7000, audioMode: 'pulse' },
    { displayDuration: null, audioMode: 'default' },
  ],
}

describe('slideshowPresetStore', () => {
  it('speichert Anzeigedauer + Audio-Modus pro Position und persistiert', () => {
    const store = useSlideshowPresetStore()
    const preset = store.savePreset('Mein Preset', snapshot)
    expect(preset.name).toBe('Mein Preset')
    expect(preset.settings.displayDuration).toBe(4000)
    expect(preset.slots).toEqual(snapshot.slots.map((sl) => ({ ...sl, adjustments: null })))

    // Neuer Store liest aus dem localStorage
    setActivePinia(createPinia())
    const reloaded = useSlideshowPresetStore()
    reloaded.loadPresets()
    expect(reloaded.presets).toHaveLength(1)
    expect(reloaded.presets[0].slots[0]).toEqual({
      displayDuration: 7000,
      audioMode: 'pulse',
      adjustments: null,
    })
    expect(reloaded.presets[0].settings.fitToWorkspace).toBe(true)
    expect(reloaded.presets[0].settings.transform).toEqual({ x: 5, y: 15, width: 70, height: 60 })
  })

  it('löscht Presets', () => {
    const store = useSlideshowPresetStore()
    const p = store.savePreset('A', snapshot)
    store.deletePreset(p.id)
    expect(store.presets).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual([])
  })

  it('verkraftet kaputten localStorage-Inhalt', () => {
    localStorage.setItem(KEY, '{kaputt')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = useSlideshowPresetStore()
    store.loadPresets()
    expect(store.presets).toEqual([])
  })

  it('gibt null zurück, wenn der Speicher voll ist', () => {
    const store = useSlideshowPresetStore()
    store.loadPresets()
    localStorage.setItem = () => {
      throw new Error('QuotaExceeded')
    }
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(store.savePreset('X', snapshot)).toBeNull()
    expect(store.presets).toHaveLength(0)
  })

  it('speichert Bild-Anpassungen pro Position und bereinigt sie', () => {
    const store = useSlideshowPresetStore()
    const p = store.savePreset('Filter', {
      settings: snapshot.settings,
      slots: [
        {
          displayDuration: null,
          audioMode: 'default',
          adjustments: {
            brightness: 999,
            sepia: 40,
            flipH: true,
            shadowColor: '#ff0000',
            borderColor: 'javascript:alert(1)',
            preset: 'vintage',
            unknown: 'x',
            audioReactive: { enabled: true, source: 'mid' },
          },
        },
        { displayDuration: null, audioMode: 'default', adjustments: null },
      ],
    })
    const adj = p.slots[0].adjustments
    expect(adj).toMatchObject({
      brightness: 200,
      sepia: 40,
      flipH: true,
      shadowColor: '#ff0000',
      preset: 'vintage',
    })
    expect(adj.borderColor).toBeUndefined()
    expect(adj.unknown).toBeUndefined()
    expect(adj.audioReactive.source).toBe('mid')
    expect(adj.audioReactive.effects).toBeTypeOf('object')
    expect(p.slots[1].adjustments).toBeNull()
  })

  it('normalisiert ungültige Werte auf Standardwerte', () => {
    const p = normalizeSlideshowPreset({
      id: 1,
      name: '  ',
      settings: { displayDuration: 'x', fadeInDuration: 999999, transform: { width: 1 } },
      slots: [{ displayDuration: -5, audioMode: 'evil' }, null],
    })
    expect(p.name).toBe('Slideshow')
    expect(p.settings.displayDuration).toBe(3000)
    expect(p.settings.fadeInDuration).toBe(5000)
    expect(p.settings.fitToWorkspace).toBe(false)
    expect(p.settings.transform.width).toBe(10)
    expect(p.slots).toEqual([
      { displayDuration: null, audioMode: 'default', adjustments: null },
      { displayDuration: null, audioMode: 'default', adjustments: null },
    ])
    expect(normalizeSlideshowPreset(null)).toBeNull()
  })
})
