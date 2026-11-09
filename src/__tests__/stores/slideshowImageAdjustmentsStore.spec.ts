import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSlideshowImageAdjustmentsStore } from '../../stores/slideshowImageAdjustmentsStore'
import {
  diffAdjustments,
  restorePersistedAdjustments,
  restorePersistedBounds,
} from '../../lib/slideshowAdjustmentsPersistence'
import { useSlideshowImageSettingsStore } from '../../stores/slideshowImageSettingsStore'
import {
  SlideshowManager,
  type SlideshowAdjustmentsChange,
  type SlideshowBoundsChange,
} from '../../lib/slideshowManager'
import { stub } from '../helpers/canvasStubs'

const KEY = 'visualizer-slideshow-image-adjustments'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k) : null),
    setItem: vi.fn((k: string, v: unknown) => data.set(k, String(v))),
    removeItem: (k: string) => data.delete(k),
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
    const writes = vi.mocked(localStorage.setItem).mock.calls.length
    store.setAdjustments('upload:a.png|10x10', { brightness: 150, sepia: 30 }, 'pulse')
    expect(vi.mocked(localStorage.setItem).mock.calls.length).toBe(writes)

    setActivePinia(createPinia())
    const again = useSlideshowImageAdjustmentsStore()
    expect(
      (again.getAdjustments('upload:a.png|10x10')!.adjustments as Record<string, unknown>)
        .brightness,
    ).toBe(150)
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
    const session = new Map<object, object>([[b, { contrast: 90 }]])
    const manager = {
      getImageAdjustments: (obj: object) => session.get(obj) ?? null,
      setImageAdjustments: vi.fn(),
    }
    const stored: Record<string, { adjustments: object; audioMode: string }> = {
      'upload:a.png|10x10': { adjustments: { sepia: 40 }, audioMode: 'glow' },
    }
    const n = restorePersistedAdjustments(
      manager,
      [
        { name: 'a.png', imageObject: a },
        { name: 'b.png', imageObject: b },
      ],
      {
        resolveImageObject: (img) => img.imageObject as object,
        getAdjustments: (k) => stored[k as string] ?? null,
      },
    )
    expect(n).toBe(1)
    expect(manager.setImageAdjustments).toHaveBeenCalledWith(a, { sepia: 40 }, 'glow')
  })
})

describe('Ablauf: Filter ändern → stoppen → neue Sitzung → Start', () => {
  function createManager(
    onImageAdjustmentsChange?: (change: SlideshowAdjustmentsChange) => void,
    onImageBoundsChange?: (change: SlideshowBoundsChange) => void,
  ) {
    let nextId = 1
    const multiImageManager = {
      canvas: { width: 1000, height: 1000 },
      addImageWithBounds: vi.fn((imageObject: object, bounds: object) => ({
        id: nextId++,
        imageObject,
        ...bounds,
      })),
      removeImage: vi.fn(),
    }
    const fotoManager = {
      defaultSettings: { brightness: 100, sepia: 0 },
      initializeImageSettings: (img: { fotoSettings?: object | null }) => {
        img.fotoSettings ??= { brightness: 100, sepia: 0, audioReactive: null }
      },
    }
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
    return new SlideshowManager(stub(multiImageManager), stub(fotoManager), {
      onImageAdjustmentsChange,
      onImageBoundsChange,
    })
  }

  it('Filter sind in der neuen Sitzung wieder da', async () => {
    const { slideshowStableKey } = await import(
      '../../components/foto-panel/slideshow/slideshowImageKey'
    )
    const store = useSlideshowImageAdjustmentsStore()
    const persist = ({
      imageConfig,
      imageObject,
      adjustments,
      audioMode,
    }: SlideshowAdjustmentsChange) =>
      store.setAdjustments(
        slideshowStableKey({ ...imageConfig, imageObject }),
        diffAdjustments(adjustments, { brightness: 100, sepia: 0 }),
        audioMode as string | undefined,
      )
    const imgA = { width: 10, height: 10 }
    const imgs = () => [
      { name: 'a.png', imageObject: imgA, audioMode: 'default' },
      { name: 'b.png', imageObject: { width: 20, height: 10 }, audioMode: 'default' },
    ]

    const m1 = createManager(persist)
    m1.start(stub(imgs()))
    m1.activeImages[0]!.fotoSettings!.brightness = 175
    m1.stop()
    expect(store.getAdjustments('upload:a.png|10x10')!.adjustments).toEqual({ brightness: 175 })
    // unverändertes Bild b → kein Eintrag
    expect(Object.keys(store.entries)).toEqual(['upload:a.png|10x10'])

    // Neue Sitzung: neuer Manager (leerer Sitzungsspeicher), neues Bildobjekt
    const m2 = createManager(persist)
    const fresh = [{ name: 'a.png', imageObject: { width: 10, height: 10 }, audioMode: 'default' }]
    restorePersistedAdjustments(m2, fresh, {
      resolveImageObject: (img) => stub<HTMLImageElement>(img.imageObject as object),
      getAdjustments: (k) => store.getAdjustments(k as string),
    })
    m2.start(stub([...fresh, { name: 'c.png', imageObject: { width: 5, height: 5 } }]))
    expect(m2.activeImages[0]!.fotoSettings!.brightness).toBe(175)
    m2.stop()
  })
})

describe('Ablauf: Größe/Position ändern → neue Sitzung → Start', () => {
  it('eigene Größe und Verschieben der ganzen Slideshow werden gemeldet und wiederhergestellt', async () => {
    const { slideshowStableKey } = await import(
      '../../components/foto-panel/slideshow/slideshowImageKey'
    )
    const settings = useSlideshowImageSettingsStore()
    const onBounds = ({ imageConfig, imageObject, bounds }: SlideshowBoundsChange) =>
      settings.updateImageSettings(slideshowStableKey({ ...imageConfig, imageObject }), { bounds })

    let nextId = 1
    const make = () => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.stubGlobal('requestAnimationFrame', () => 1)
      vi.stubGlobal('cancelAnimationFrame', () => {})
      return new SlideshowManager(
        stub({
          canvas: { width: 1000, height: 1000 },
          addImageWithBounds: vi.fn((imageObject: object, bounds: object) => ({
            id: nextId++,
            imageObject,
            ...bounds,
          })),
          removeImage: vi.fn(),
        }),
        stub({
          initializeImageSettings: (img: { fotoSettings?: object | null }) =>
            (img.fotoSettings ??= { audioReactive: null }),
        }),
        { onImageBoundsChange: onBounds },
      )
    }
    const imgA = { width: 10, height: 10 }
    const m1 = make()
    m1.start(
      stub([
        { name: 'a.png', imageObject: imgA },
        { name: 'b.png', imageObject: { width: 20, height: 10 } },
      ]),
    )
    const a = m1.activeImages[0]
    Object.assign(a!, { relX: 0.05, relY: 0.05, relWidth: 0.3, relHeight: 0.3 })
    m1.commitImageBounds(a!)
    expect(settings.getImageSettings('upload:a.png|10x10')!.bounds!.relWidth).toBeCloseTo(0.3)
    // ganze Slideshow verschieben → auch gemeldet
    m1.moveSlideshow(0.1, 0)
    expect(settings.getImageSettings('upload:a.png|10x10')!.bounds!.relX).toBeCloseTo(0.15)
    m1.stop()

    const m2 = make()
    const fresh = [{ name: 'a.png', imageObject: { width: 10, height: 10 } }]
    const n = restorePersistedBounds(m2, fresh, {
      resolveImageObject: (img) => stub<HTMLImageElement>(img.imageObject as object),
      getBounds: (k) => settings.getImageSettings(k as string)?.bounds ?? null,
    })
    expect(n).toBe(1)
    m2.start(stub([...fresh, { name: 'c.png', imageObject: { width: 5, height: 5 } }]))
    const again = m2.activeImages[0]
    expect([again!.relX, again!.relWidth].map((v) => +v.toFixed(3))).toEqual([0.15, 0.3])
    m2.stop()
  })
})
