import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSlideshowImageAdjustmentsStore } from '../../stores/slideshowImageAdjustmentsStore.js'
import {
  diffAdjustments,
  restorePersistedAdjustments,
} from '../../lib/slideshowAdjustmentsPersistence.js'
import { SlideshowManager } from '../../lib/slideshowManager.js'

const KEY = 'visualizer-slideshow-image-adjustments'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: vi.fn((k, v) => data.set(k, String(v))),
    removeItem: (k) => data.delete(k),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  setActivePinia(createPinia())
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('slideshowImageAdjustmentsStore', () => {
  it('merkt bereinigte Anpassungen dauerhaft; gleiche Werte → kein erneutes Schreiben', () => {
    const store = useSlideshowImageAdjustmentsStore()
    store.setAdjustments('upload:a.png|10x10', { brightness: 150, sepia: 30, evil: 'x' }, 'pulse')
    expect(store.getAdjustments('upload:a.png|10x10')).toEqual({
      adjustments: { brightness: 150, sepia: 30 },
      audioMode: 'pulse',
    })
    const writes = localStorage.setItem.mock.calls.length
    store.setAdjustments('upload:a.png|10x10', { brightness: 150, sepia: 30 }, 'pulse')
    expect(localStorage.setItem.mock.calls.length).toBe(writes)

    setActivePinia(createPinia())
    const again = useSlideshowImageAdjustmentsStore()
    expect(again.getAdjustments('upload:a.png|10x10').adjustments.brightness).toBe(150)
    again.setAdjustments('upload:a.png|10x10', null)
    expect(again.getAdjustments('upload:a.png|10x10')).toBeNull()
  })

  it('clearAll, Obergrenze, kaputter Speicher', () => {
    const store = useSlideshowImageAdjustmentsStore()
    for (let i = 0; i < 205; i++) store.setAdjustments(`k${i}`, { contrast: 120 }, 'default')
    expect(Object.keys(store.entries)).toHaveLength(200)
    expect(store.getAdjustments('k0')).toBeNull()
    store.clearAll()
    expect(store.getAdjustments('k204')).toBeNull()

    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(KEY, '{kaputt')
    setActivePinia(createPinia())
    expect(useSlideshowImageAdjustmentsStore().getAdjustments('x')).toBeNull()
  })
})

describe('diffAdjustments', () => {
  const defaults = { brightness: 100, sepia: 0, flipH: false, audioReactive: { enabled: false } }

  it('nur Abweichungen vom Standard; unverändert → null', () => {
    expect(diffAdjustments({ brightness: 100, sepia: 0, flipH: false }, defaults)).toBeNull()
    expect(
      diffAdjustments({ brightness: 140, sepia: 0, flipH: true, _cache: 'x' }, defaults),
    ).toEqual({ brightness: 140, flipH: true })
  })

  it('Audio nur, wenn es von der Panel-Vorgabe abweicht', () => {
    const panel = { enabled: true, source: 'bass' }
    expect(diffAdjustments({ brightness: 100, audioReactive: panel }, defaults, panel)).toBeNull()
    const changed = { enabled: true, source: 'treble' }
    expect(diffAdjustments({ audioReactive: changed }, defaults, panel)).toEqual({
      audioReactive: changed,
    })
  })
})

describe('restorePersistedAdjustments', () => {
  it('nur für Bilder ohne Anpassungen in dieser Sitzung, per dauerhaftem Schlüssel', () => {
    const a = { width: 10, height: 10 }
    const b = { width: 20, height: 10 }
    const session = new Map([[b, { contrast: 90 }]])
    const manager = {
      getImageAdjustments: (obj) => session.get(obj) ?? null,
      setImageAdjustments: vi.fn(),
    }
    const stored = { 'upload:a.png|10x10': { adjustments: { sepia: 40 }, audioMode: 'glow' } }
    const n = restorePersistedAdjustments(
      manager,
      [
        { name: 'a.png', imageObject: a },
        { name: 'b.png', imageObject: b },
      ],
      { resolveImageObject: (img) => img.imageObject, getAdjustments: (k) => stored[k] ?? null },
    )
    expect(n).toBe(1)
    expect(manager.setImageAdjustments).toHaveBeenCalledWith(a, { sepia: 40 }, 'glow')
  })
})

describe('Ablauf: Filter ändern → stoppen → neue Sitzung → Start', () => {
  function createManager(onImageAdjustmentsChange) {
    let nextId = 1
    const multiImageManager = {
      canvas: { width: 1000, height: 1000 },
      addImageWithBounds: vi.fn((imageObject, bounds) => ({
        id: nextId++,
        imageObject,
        ...bounds,
      })),
      removeImage: vi.fn(),
    }
    const fotoManager = {
      defaultSettings: { brightness: 100, sepia: 0 },
      initializeImageSettings: (img) => {
        img.fotoSettings ??= { brightness: 100, sepia: 0, audioReactive: null }
      },
    }
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
    return new SlideshowManager(multiImageManager, fotoManager, { onImageAdjustmentsChange })
  }

  it('Filter sind in der neuen Sitzung wieder da', async () => {
    const { slideshowStableKey } = await import(
      '../../components/foto-panel/slideshow/slideshowImageKey.js'
    )
    const store = useSlideshowImageAdjustmentsStore()
    const persist = ({ imageConfig, imageObject, adjustments, audioMode }) =>
      store.setAdjustments(
        slideshowStableKey({ ...imageConfig, imageObject }),
        diffAdjustments(adjustments, { brightness: 100, sepia: 0 }),
        audioMode,
      )
    const imgA = { width: 10, height: 10 }
    const imgs = () => [
      { name: 'a.png', imageObject: imgA, audioMode: 'default' },
      { name: 'b.png', imageObject: { width: 20, height: 10 }, audioMode: 'default' },
    ]

    const m1 = createManager(persist)
    m1.start(imgs())
    m1.activeImages[0].fotoSettings.brightness = 175
    m1.stop()
    expect(store.getAdjustments('upload:a.png|10x10').adjustments).toEqual({ brightness: 175 })
    // unverändertes Bild b → kein Eintrag
    expect(Object.keys(store.entries)).toEqual(['upload:a.png|10x10'])

    // Neue Sitzung: neuer Manager (leerer Sitzungsspeicher), neues Bildobjekt
    const m2 = createManager(persist)
    const fresh = [{ name: 'a.png', imageObject: { width: 10, height: 10 }, audioMode: 'default' }]
    restorePersistedAdjustments(m2, fresh, {
      resolveImageObject: (img) => img.imageObject,
      getAdjustments: (k) => store.getAdjustments(k),
    })
    m2.start([...fresh, { name: 'c.png', imageObject: { width: 5, height: 5 } }])
    expect(m2.activeImages[0].fotoSettings.brightness).toBe(175)
    m2.stop()
  })
})
