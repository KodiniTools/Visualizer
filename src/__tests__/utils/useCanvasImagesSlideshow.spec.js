import { describe, it, expect, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCanvasImages } from '../../composables/useCanvasImages.js'

afterEach(() => {
  delete window.slideshowManager
  vi.restoreAllMocks()
})

function setup() {
  const manager = { setSelectedImage: vi.fn(), getAllImages: () => [] }
  return useCanvasImages({
    multiImageManagerInstance: ref(manager),
    canvasManagerInstance: ref(null),
    t: (k) => k,
  })
}

describe('Leiste „Bilder auf Canvas“ – Slideshow-Bild anklicken', () => {
  const img = { id: 7, isSlideshowImage: true, slideshow: { imageIndex: 2 } }

  it('pausiert → Einstellungen des Bildes öffnen (Event mit Index)', () => {
    window.slideshowManager = { isPaused: true }
    const handler = vi.fn()
    window.addEventListener('slideshow:edit-image', handler)
    setup().selectCanvasImage(img)
    window.removeEventListener('slideshow:edit-image', handler)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].detail).toEqual({ index: 2 })
  })

  it('läuft oder normales Bild → kein Event', () => {
    const handler = vi.fn()
    window.addEventListener('slideshow:edit-image', handler)
    window.slideshowManager = { isPaused: false }
    setup().selectCanvasImage(img)
    window.slideshowManager = { isPaused: true }
    setup().selectCanvasImage({ id: 8 })
    window.removeEventListener('slideshow:edit-image', handler)
    expect(handler).not.toHaveBeenCalled()
  })
})
