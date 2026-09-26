import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useSlideshowPresetStore,
  normalizeSlideshowPreset,
  normalizeImageBounds,
  normalizeStockRef,
  normalizeUploadRef,
  collectUploadKeys,
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
    moveWholeSlideshow: true,
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
    expect(preset.slots).toEqual(
      snapshot.slots.map((sl) => ({
        ...sl,
        adjustments: null,
        bounds: null,
        transition: null,
        stock: null,
        upload: null,
      })),
    )

    // Neuer Store liest aus dem localStorage
    setActivePinia(createPinia())
    const reloaded = useSlideshowPresetStore()
    reloaded.loadPresets()
    expect(reloaded.presets).toHaveLength(1)
    expect(reloaded.presets[0].slots[0]).toEqual({
      displayDuration: 7000,
      audioMode: 'pulse',
      transition: null,
      adjustments: null,
      bounds: null,
      transition: null,
      stock: null,
      upload: null,
    })
    expect(reloaded.presets[0].settings.fitToWorkspace).toBe(true)
    expect(reloaded.presets[0].settings.moveWholeSlideshow).toBe(true)
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
      slots: [{ displayDuration: -5, audioMode: 'evil', transition: 'boom' }, null],
    })
    expect(p.name).toBe('Slideshow')
    expect(p.settings.displayDuration).toBe(3000)
    expect(p.settings.fadeInDuration).toBe(5000)
    expect(p.settings.fitToWorkspace).toBe(false)
    expect(p.settings.moveWholeSlideshow).toBe(false)
    expect(p.settings.transition).toBe('fade')
    expect(p.settings.transform.width).toBe(10)
    expect(p.slots).toEqual([
      {
        displayDuration: null,
        audioMode: 'default',
        adjustments: null,
        bounds: null,
        transition: null,
        stock: null,
        upload: null,
      },
      {
        displayDuration: null,
        audioMode: 'default',
        adjustments: null,
        bounds: null,
        transition: null,
        stock: null,
        upload: null,
      },
    ])
    expect(normalizeSlideshowPreset(null)).toBeNull()
  })
})

describe('normalizeImageBounds', () => {
  it('übernimmt gültige Bounds und verwirft ungültige', () => {
    const b = { relX: 0.1, relY: 0.2, relWidth: 0.4, relHeight: 0.3 }
    expect(normalizeImageBounds(b)).toEqual(b)
    expect(normalizeImageBounds({ ...b, relWidth: 'x' })).toBeNull()
    expect(normalizeImageBounds({ ...b, relWidth: 0 })).toBeNull()
    expect(normalizeImageBounds(null)).toBeNull()
    // Position so begrenzt, dass das Bild sichtbar bleibt
    expect(normalizeImageBounds({ ...b, relX: 50 }).relX).toBe(1)
  })
})

describe('slideshowPresetStore – Bilder nur für die Sitzung', () => {
  it('merkt Bilder im Speicher, nicht im localStorage; Löschen entfernt sie', () => {
    const store = useSlideshowPresetStore()
    const imgObj = { width: 10, height: 10 }
    const p = store.savePreset('Mit Bildern', snapshot, [
      { id: 'u1', name: 'A', source: 'upload', imageObject: imgObj },
      { id: 'stock:s1', name: 'B', source: 'stock', stockImage: { id: 's1' } },
    ])
    const images = store.getSessionImages(p.id)
    expect(images.map((i) => i.id)).toEqual(['u1', 'stock:s1'])
    expect(images[0].imageObject).toBe(imgObj)
    expect(localStorage.getItem('visualizer-slideshow-presets')).not.toContain('stock:s1')

    // Neuer Store (≈ Seite neu geladen): Preset da, Bilder nicht
    setActivePinia(createPinia())
    const reloaded = useSlideshowPresetStore()
    reloaded.loadPresets()
    expect(reloaded.presets).toHaveLength(1)
    expect(reloaded.getSessionImages(p.id)).toBeNull()

    store.deletePreset(p.id)
    expect(store.getSessionImages(p.id)).toBeNull()
  })

  it('ohne Bilder wird nichts gemerkt', () => {
    const store = useSlideshowPresetStore()
    const p = store.savePreset('Ohne', snapshot, [])
    expect(store.getSessionImages(p.id)).toBeNull()
  })
})

describe('Stock-Verweise dauerhaft im Preset', () => {
  const ref = {
    id: 'ba-gradient-forest',
    name: 'Gradient Forest',
    file: 'gallery/backgrounds/gradient-forest.svg',
    thumbnail: 'gallery/backgrounds/gradient-forest.svg',
  }

  it('normalizeStockRef erlaubt nur Galerie-Pfade', () => {
    expect(normalizeStockRef(ref)).toEqual(ref)
    expect(normalizeStockRef({ ...ref, file: 'https://evil.example/x.png' })).toBeNull()
    expect(normalizeStockRef({ ...ref, file: 'gallery/../secret.png' })).toBeNull()
    expect(normalizeStockRef({ ...ref, file: 'javascript:alert(1)' })).toBeNull()
    expect(normalizeStockRef({ ...ref, id: '<script>' })).toBeNull()
    expect(normalizeStockRef({ ...ref, thumbnail: 'data:x' }).thumbnail).toBe(ref.file)
    expect(normalizeStockRef(null)).toBeNull()
  })

  it('bleibt nach „Neuladen“ im localStorage erhalten', () => {
    const store = useSlideshowPresetStore()
    const p = store.savePreset('Stock', {
      settings: snapshot.settings,
      slots: [
        { displayDuration: 5000, audioMode: 'pulse', stock: ref },
        { displayDuration: null, audioMode: 'default', stock: null },
      ],
    })
    setActivePinia(createPinia())
    const reloaded = useSlideshowPresetStore()
    reloaded.loadPresets()
    const again = reloaded.presets.find((x) => x.id === p.id)
    expect(again.slots[0].stock).toEqual(ref)
    expect(again.slots[1].stock).toBeNull()
  })
})

describe('Upload-Verweise dauerhaft im Preset', () => {
  it('normalizeUploadRef akzeptiert nur gültige Schlüssel', () => {
    const key = 'f'.repeat(64)
    expect(normalizeUploadRef({ key, name: ' foto.png ' })).toEqual({ key, name: 'foto.png' })
    expect(normalizeUploadRef({ key: 'fnv-1a2b-1234', name: 'x' })).toEqual({
      key: 'fnv-1a2b-1234',
      name: 'x',
    })
    expect(normalizeUploadRef({ key: '../etc', name: 'x' })).toBeNull()
    expect(normalizeUploadRef({ key: 123 })).toBeNull()
    expect(normalizeUploadRef(null)).toBeNull()
  })

  it('bleibt nach „Neuladen“ erhalten; collectUploadKeys sammelt Schlüssel', () => {
    const key = 'e'.repeat(64)
    const store = useSlideshowPresetStore()
    store.savePreset('Upload', {
      settings: snapshot.settings,
      slots: [{ upload: { key, name: 'foto.png' } }, { upload: null }],
    })
    setActivePinia(createPinia())
    const reloaded = useSlideshowPresetStore()
    reloaded.loadPresets()
    expect(reloaded.presets[0].slots[0].upload).toEqual({ key, name: 'foto.png' })
    expect([...collectUploadKeys(reloaded.presets)]).toEqual([key])
  })
})
