// Bildvorschau → „Ersetzen mit“: der Dateiname des Ersatzbildes landet am
// Canvas-Bild (Upload: File.name, Galerie: aus der Bild-URL abgeleitet).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCanvasImages } from '../../composables/useCanvasImages'
import type { CanvasImage, MultiImageManager } from '../../lib/multiImageManager'
import { stub } from '../helpers/canvasStubs'

/** Image-Ersatz: jsdom lädt keine Bilder, onload daher sofort auslösen. */
class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  crossOrigin = ''
  private _src = ''
  set src(value: string) {
    this._src = value
    queueMicrotask(() => this.onload?.())
  }
  get src() {
    return this._src
  }
}

/** FileReader-Ersatz: liefert sofort eine Data-URL. */
class FakeReader {
  onload: ((e: { target: { result: string } }) => void) | null = null
  readAsDataURL() {
    queueMicrotask(() => this.onload?.({ target: { result: 'data:image/png;base64,NEU' } }))
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0))
const fileEvent = (name: string) => stub<Event>({ target: { files: [{ name }], value: 'x' } })

beforeEach(() => {
  vi.stubGlobal('Image', FakeImage)
  vi.stubGlobal('FileReader', FakeReader)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function setup() {
  const live = stub<CanvasImage>({ id: 1, name: 'alt.png', imageObject: { src: 'data:,alt' } })
  const replaceImage = vi.fn(
    (_id: CanvasImage['id'], img: HTMLImageElement, name?: string | null) =>
      ({ ...live, imageObject: img, name: name ?? null }) as CanvasImage,
  )
  const manager = stub<MultiImageManager>({ getAllImages: () => [live], replaceImage })
  const api = useCanvasImages({
    multiImageManagerInstance: ref(manager),
    canvasManagerInstance: ref(null),
    t: (k: string) => k,
  })
  api.openImagePreview(live, 0)
  return { api, replaceImage }
}

describe('Bildvorschau – Ersetzen übergibt den Dateinamen', () => {
  it('Upload: File.name wird an replaceImage übergeben', async () => {
    const { api, replaceImage } = setup()
    api.handleReplaceCanvasImage(fileEvent('neu.jpg'))
    await flush()
    api.confirmPendingReplace()
    expect(replaceImage).toHaveBeenCalledTimes(1)
    expect(replaceImage.mock.calls[0]![2]).toBe('neu.jpg')
    expect(api.previewImageData.value!.name).toBe('neu.jpg')
  })

  it('Abbrechen verwirft den Namen; Galerie-Ersatz ohne expliziten Namen', async () => {
    const { api, replaceImage } = setup()
    api.handleReplaceCanvasImage(fileEvent('verworfen.jpg'))
    await flush()
    api.cancelPendingReplace()

    api.selectReplaceGalleryImage({
      id: 'wald',
      name: 'Wald',
      file: 'gallery/backgrounds/wald.svg',
    })
    await api.confirmReplaceFromGallery()
    api.confirmPendingReplace()
    expect(replaceImage).toHaveBeenCalledTimes(1)
    const [, img, name] = replaceImage.mock.calls[0]!
    expect(img.src).toBe('gallery/backgrounds/wald.svg')
    expect(name).toBeNull()
  })
})
