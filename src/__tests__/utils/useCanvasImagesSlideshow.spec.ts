import { describe, it, expect, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { useCanvasImages } from '../../composables/useCanvasImages'
import { setSlideshowManager } from '../../lib/slideshowManagerBridge'

afterEach(() => {
  setSlideshowManager(null)
  vi.restoreAllMocks()
})

type CanvasImagesOptions = Parameters<typeof useCanvasImages>[0]
type CanvasImageArg = Parameters<ReturnType<typeof useCanvasImages>['selectCanvasImage']>[0]
const manager = (isPaused: boolean) =>
  ({ isPaused }) as unknown as Parameters<typeof setSlideshowManager>[0]
const canvasImage = (value: object) => value as CanvasImageArg

function setup() {
  const multi = { setSelectedImage: vi.fn(), getAllImages: () => [] }
  return useCanvasImages({
    multiImageManagerInstance: ref(multi),
    canvasManagerInstance: ref(null),
    t: (k: string) => k,
  } as unknown as CanvasImagesOptions)
}

describe('Leiste „Bilder auf Canvas“ – Slideshow-Bild anklicken', () => {
  const img = canvasImage({ id: 7, isSlideshowImage: true, slideshow: { imageIndex: 2 } })

  it('pausiert → Einstellungen des Bildes öffnen (Event mit Index)', () => {
    setSlideshowManager(manager(true))
    const handler = vi.fn()
    window.addEventListener('slideshow:edit-image', handler)
    setup().selectCanvasImage(img)
    window.removeEventListener('slideshow:edit-image', handler)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]![0].detail).toEqual({ index: 2 })
  })

  it('läuft oder normales Bild → kein Event', () => {
    const handler = vi.fn()
    window.addEventListener('slideshow:edit-image', handler)
    setSlideshowManager(manager(false))
    setup().selectCanvasImage(img)
    setSlideshowManager(manager(true))
    setup().selectCanvasImage(canvasImage({ id: 8 }))
    window.removeEventListener('slideshow:edit-image', handler)
    expect(handler).not.toHaveBeenCalled()
  })
})
