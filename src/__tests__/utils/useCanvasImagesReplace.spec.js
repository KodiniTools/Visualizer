// Bildvorschau → „Ersetzen mit“: der Dateiname des Ersatzbildes landet am
// Canvas-Bild (Upload: File.name, Galerie: aus der Bild-URL abgeleitet).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCanvasImages } from '../../composables/useCanvasImages.js'

/** Image-Ersatz: jsdom lädt keine Bilder, onload daher sofort auslösen. */
class FakeImage {
  constructor() {
    this.onload = null
    this.onerror = null
    this._src = ''
  }
  set src(value) {
    this._src = value
    queueMicrotask(() => this.onload?.())
  }
  get src() {
    return this._src
  }
}

/** FileReader-Ersatz: liefert sofort eine Data-URL. */
class FakeReader {
  readAsDataURL() {
    queueMicrotask(() => this.onload?.({ target: { result: 'data:image/png;base64,NEU' } }))
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.stubGlobal('Image', FakeImage)
  vi.stubGlobal('FileReader', FakeReader)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function setup() {
  const live = { id: 1, name: 'alt.png', imageObject: { src: 'data:,alt' } }
  const manager = {
    getAllImages: () => [live],
    replaceImage: vi.fn((id, img, name) => ({ ...live, imageObject: img, name: name ?? null })),
  }
  const api = useCanvasImages({
    multiImageManagerInstance: ref(manager),
    canvasManagerInstance: ref(null),
    t: (k) => k,
  })
  api.openImagePreview(live, 0)
  return { api, manager }
}

describe('Bildvorschau – Ersetzen übergibt den Dateinamen', () => {
  it('Upload: File.name wird an replaceImage übergeben', async () => {
    const { api, manager } = setup()
    api.handleReplaceCanvasImage({ target: { files: [{ name: 'neu.jpg' }], value: 'x' } })
    await flush()
    api.confirmPendingReplace()
    expect(manager.replaceImage).toHaveBeenCalledTimes(1)
    expect(manager.replaceImage.mock.calls[0][2]).toBe('neu.jpg')
    expect(api.previewImageData.value.name).toBe('neu.jpg')
  })

  it('Abbrechen verwirft den Namen; Galerie-Ersatz ohne expliziten Namen', async () => {
    const { api, manager } = setup()
    api.handleReplaceCanvasImage({ target: { files: [{ name: 'verworfen.jpg' }], value: 'x' } })
    await flush()
    api.cancelPendingReplace()

    api.selectReplaceGalleryImage({ file: 'gallery/backgrounds/wald.svg' })
    await api.confirmReplaceFromGallery()
    api.confirmPendingReplace()
    expect(manager.replaceImage).toHaveBeenCalledTimes(1)
    const [, img, name] = manager.replaceImage.mock.calls[0]
    expect(img.src).toBe('gallery/backgrounds/wald.svg')
    expect(name).toBeNull()
  })
})
