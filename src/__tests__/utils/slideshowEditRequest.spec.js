import { describe, it, expect, vi, afterEach } from 'vitest'
import { requestSlideshowImageEdit, SLIDESHOW_EDIT_EVENT } from '../../lib/slideshowEditRequest.js'

afterEach(() => {
  delete window.slideshowManager
})

describe('requestSlideshowImageEdit (Leiste + Canvas-Klick)', () => {
  const img = { isSlideshowImage: true, slideshow: { imageIndex: 3 } }

  it('nur bei pausierter Slideshow und Slideshow-Bildern', () => {
    const handler = vi.fn()
    window.addEventListener(SLIDESHOW_EDIT_EVENT, handler)
    window.slideshowManager = { isPaused: false }
    expect(requestSlideshowImageEdit(img)).toBe(false)
    window.slideshowManager = { isPaused: true }
    expect(requestSlideshowImageEdit({ id: 1 })).toBe(false)
    expect(requestSlideshowImageEdit(null)).toBe(false)
    expect(requestSlideshowImageEdit(img)).toBe(true)
    window.removeEventListener(SLIDESHOW_EDIT_EVENT, handler)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].detail).toEqual({ index: 3 })
  })
})
