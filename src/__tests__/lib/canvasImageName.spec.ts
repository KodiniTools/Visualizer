// Dateiname von Canvas-Bildern: Ableitung, Speicherung im multiImageManager
// (Hinzufügen, mit Bounds, Ersetzen, Duplizieren) und Canvas-Presets.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fileNameFromSrc, resolveImageName, splitFileName } from '../../lib/canvasObjects/imageName'
import { MultiImageManager } from '../../lib/multiImageManager'
import { stub } from '../helpers/canvasStubs'

const fakeImage = (src: string, width = 200, height = 100) =>
  stub<HTMLImageElement>({ src, width, height, naturalWidth: width, naturalHeight: height })

const fakeCanvas = () => stub<HTMLCanvasElement>({ width: 1000, height: 500 })

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
  let mgr: MultiImageManager
  let changed: ReturnType<typeof vi.fn>
  beforeEach(() => {
    changed = vi.fn()
    mgr = new MultiImageManager(fakeCanvas(), { onImageChanged: changed })
  })

  it('addImage speichert den übergebenen Namen, sonst aus der URL, sonst null', () => {
    expect(mgr.addImage(fakeImage('data:,a'), { name: 'snovi moji.png' })!.name).toBe(
      'snovi moji.png',
    )
    expect(mgr.addImage(fakeImage('gallery/elements/stern.svg'))!.name).toBe('stern.svg')
    expect(mgr.addImage(fakeImage('data:,b'))!.name).toBeNull()
  })

  it('addImageWithBounds speichert den Namen aus den Optionen', () => {
    const bounds = { relX: 0, relY: 0, relWidth: 0.2, relHeight: 0.2 }
    const img = mgr.addImageWithBounds(fakeImage('data:,a'), bounds, 'none', { name: 'a.png' })
    expect(img!.name).toBe('a.png')
  })

  it('replaceImage übernimmt den neuen Namen (Upload) bzw. leitet ihn ab (Galerie)', () => {
    const img = mgr.addImage(fakeImage('data:,a'), { name: 'alt.png' })!
    mgr.replaceImage(img.id, fakeImage('data:,b'), 'neu.jpg')
    expect(img.name).toBe('neu.jpg')
    mgr.replaceImage(img.id, fakeImage('gallery/backgrounds/wald.svg'))
    expect(img.name).toBe('wald.svg')
    mgr.replaceImage(img.id, fakeImage('data:,c'))
    expect(img.name).toBeNull()
  })

  it('duplicateImage übernimmt den Dateinamen', () => {
    const src = mgr.addImage(fakeImage('data:,a'), { name: 'haus.png' })!
    const copy = mgr.duplicateImage(src)!
    expect(copy).not.toBe(src)
    expect(copy.name).toBe('haus.png')
  })
})

describe('Canvas-Presets – Dateiname', () => {
  /** Image-Ersatz: jsdom lädt keine Bilder, onload daher sofort auslösen. */
  class FakeImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    crossOrigin = ''
    private _src = ''
    set src(value: string) {
      this._src = value
      this.onload?.()
    }
    get src() {
      return this._src
    }
  }

  it('speichert den Namen nur wenn bekannt und stellt ihn wieder her', async () => {
    const { captureCanvasElements, restoreCanvasElements } = await import(
      '../../lib/background/canvasElements'
    )
    const mgr = new MultiImageManager(fakeCanvas())
    mgr.addImage(fakeImage('data:,a'), { name: 'haus.png' })
    mgr.addImage(fakeImage('data:,b'))
    const cm = stub<Parameters<typeof captureCanvasElements>[0]>({
      multiImageManager: mgr,
      textManager: { textObjects: [] },
    })

    const ticker = stub<Parameters<typeof captureCanvasElements>[1]>({
      $state: {},
      $patch: () => {},
    })
    const { images } = captureCanvasElements(cm, ticker)
    expect(images.map((i) => i.name)).toEqual(['haus.png', undefined])
    expect('name' in images[1]!).toBe(false)

    vi.stubGlobal('Image', FakeImage)
    try {
      restoreCanvasElements(
        () => cm,
        { images: [...images, stub<(typeof images)[number]>({ src: '/x/stern.svg' })] },
        stub<Parameters<typeof restoreCanvasElements>[2]>(ticker),
      )
    } finally {
      vi.unstubAllGlobals()
    }
    expect(mgr.images.map((i) => i.name)).toEqual(['haus.png', null, 'stern.svg'])
  })
})
