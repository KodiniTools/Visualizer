// Dateiname von Canvas-Bildern: Ableitung, Speicherung im multiImageManager
// (Hinzufügen, mit Bounds, Ersetzen, Duplizieren) und Canvas-Presets.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fileNameFromSrc,
  resolveImageName,
  splitFileName,
} from '../../lib/canvasObjects/imageName.js'
import { MultiImageManager } from '../../lib/multiImageManager.js'

const fakeImage = (src, width = 200, height = 100) => ({
  src,
  width,
  height,
  naturalWidth: width,
  naturalHeight: height,
})

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('fileNameFromSrc', () => {
  it.each([
    ['gallery/backgrounds/gradient-forest.svg', 'gradient-forest.svg'],
    ['https://example.com/a/b/haus%20alt.jpg?v=2#x', 'haus alt.jpg'],
    ['/bild.png', 'bild.png'],
    ['data:image/png;base64,AAA', null],
    ['blob:https://example.com/123', null],
    ['https://example.com/ordner/', null],
    ['', null],
    [undefined, null],
    [42, null],
  ])('%s → %s', (src, expected) => {
    expect(fileNameFromSrc(src)).toBe(expected)
  })

  it('kaputte Prozent-Kodierung bleibt roh', () => {
    expect(fileNameFromSrc('/x/100%.png')).toBe('100%.png')
  })
})

describe('resolveImageName', () => {
  it('expliziter Name hat Vorrang und wird getrimmt', () => {
    expect(resolveImageName('  urlaub.jpg ', fakeImage('/x/anders.png'))).toBe('urlaub.jpg')
  })
  it('sonst aus der URL, sonst null', () => {
    expect(resolveImageName('', fakeImage('/x/anders.png'))).toBe('anders.png')
    expect(resolveImageName(undefined, fakeImage('data:,a'))).toBeNull()
    expect(resolveImageName(null, null)).toBeNull()
  })
})

describe('splitFileName', () => {
  it.each([
    ['foto.jpeg', { base: 'foto', ext: '.jpeg' }],
    ['archiv.tar.gz', { base: 'archiv.tar', ext: '.gz' }],
    ['ohne-endung', { base: 'ohne-endung', ext: '' }],
    ['.versteckt', { base: '.versteckt', ext: '' }],
    ['punkt.am-ende-sehr-lang', { base: 'punkt.am-ende-sehr-lang', ext: '' }],
    ['', { base: '', ext: '' }],
  ])('%s', (name, expected) => {
    expect(splitFileName(name)).toEqual(expected)
  })
})

describe('MultiImageManager – Dateiname', () => {
  let mgr
  let changed
  beforeEach(() => {
    changed = vi.fn()
    mgr = new MultiImageManager({ width: 1000, height: 500 }, { onImageChanged: changed })
  })

  it('addImage speichert den übergebenen Namen, sonst aus der URL, sonst null', () => {
    expect(mgr.addImage(fakeImage('data:,a'), { name: 'snovi moji.png' }).name).toBe(
      'snovi moji.png',
    )
    expect(mgr.addImage(fakeImage('gallery/elements/stern.svg')).name).toBe('stern.svg')
    expect(mgr.addImage(fakeImage('data:,b')).name).toBeNull()
  })

  it('addImageWithBounds speichert den Namen aus den Optionen', () => {
    const bounds = { relX: 0, relY: 0, relWidth: 0.2, relHeight: 0.2 }
    const img = mgr.addImageWithBounds(fakeImage('data:,a'), bounds, 'none', { name: 'a.png' })
    expect(img.name).toBe('a.png')
  })

  it('replaceImage übernimmt den neuen Namen (Upload) bzw. leitet ihn ab (Galerie)', () => {
    const img = mgr.addImage(fakeImage('data:,a'), { name: 'alt.png' })
    mgr.replaceImage(img.id, fakeImage('data:,b'), 'neu.jpg')
    expect(img.name).toBe('neu.jpg')
    mgr.replaceImage(img.id, fakeImage('gallery/backgrounds/wald.svg'))
    expect(img.name).toBe('wald.svg')
    mgr.replaceImage(img.id, fakeImage('data:,c'))
    expect(img.name).toBeNull()
  })

  it('duplicateImage: gleiches Bild-Element, Name, Größe und Einstellungen – unabhängig, versetzt', () => {
    const element = fakeImage('data:,a')
    const src = mgr.addImage(element, { name: 'haus.png' })
    Object.assign(src, { relX: 0.1, relY: 0.2, relWidth: 0.4, relHeight: 0.3, rotation: 15 })
    src.fotoSettings = { rotation: 15, audioReactive: { enabled: true } }
    src.settings.brightness = 120
    changed.mockClear()

    const copy = mgr.duplicateImage(src)
    expect(copy).not.toBe(src)
    expect(copy.id).not.toBe(src.id)
    expect(copy.imageObject).toBe(element)
    expect(copy.name).toBe('haus.png')
    expect(copy.relX).toBeCloseTo(0.15)
    expect(copy.relY).toBeCloseTo(0.25)
    expect([copy.relWidth, copy.relHeight, copy.rotation]).toEqual([0.4, 0.3, 15])
    expect(copy.settings.brightness).toBe(120)
    expect(copy.fotoSettings).toEqual(src.fotoSettings)
    copy.fotoSettings.audioReactive.enabled = false
    expect(src.fotoSettings.audioReactive.enabled).toBe(true)
    expect(mgr.images).toEqual([src, copy])
    expect(mgr.getSelectedImage()).toBe(copy)
    expect(changed).toHaveBeenCalledTimes(1)
  })

  it('duplicateImage ohne Bild-Element tut nichts', () => {
    expect(mgr.duplicateImage(null)).toBeNull()
    expect(mgr.duplicateImage({ type: 'image', relX: 0 })).toBeNull()
    expect(mgr.images).toHaveLength(0)
  })
})

describe('Canvas-Presets – Dateiname', () => {
  /** Image-Ersatz: jsdom lädt keine Bilder, onload daher sofort auslösen. */
  class FakeImage {
    set src(value) {
      this._src = value
      this.onload?.()
    }
    get src() {
      return this._src
    }
  }

  it('speichert den Namen nur wenn bekannt und stellt ihn wieder her', async () => {
    const { captureCanvasElements, restoreCanvasElements } = await import(
      '../../lib/background/canvasElements.js'
    )
    const mgr = new MultiImageManager({ width: 1000, height: 500 })
    mgr.addImage(fakeImage('data:,a'), { name: 'haus.png' })
    mgr.addImage(fakeImage('data:,b'))
    const cm = { multiImageManager: mgr, textManager: { textObjects: [] } }

    const { images } = captureCanvasElements(cm, null)
    expect(images.map((i) => i.name)).toEqual(['haus.png', undefined])
    expect('name' in images[1]).toBe(false)

    vi.stubGlobal('Image', FakeImage)
    try {
      restoreCanvasElements(() => cm, { images: [...images, { src: '/x/stern.svg' }] }, null)
    } finally {
      vi.unstubAllGlobals()
    }
    expect(mgr.images.map((i) => i.name)).toEqual(['haus.png', null, 'stern.svg'])
  })
})
