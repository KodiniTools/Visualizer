import { describe, it, expect, beforeEach } from 'vitest'
import {
  visualizerImages,
  registerVisualizerImage,
  getVisualizerImage,
  getVisualizerImageSource,
  removeVisualizerImage,
  clearVisualizerImages,
  registerCanvasImage,
  registerGalleryImage,
  resolveEffectiveImageId,
} from '../../lib/visualizers/imageRegistry'

/** Bild-Stub mit Maßen (jsdom lädt keine Bilder) */
const fakeImg = (width: number, height: number) =>
  ({ width, height }) as unknown as HTMLImageElement

describe('imageRegistry', () => {
  beforeEach(() => clearVisualizerImages())

  it('registers, lists, resolves and removes images', () => {
    const source = fakeImg(4, 4)
    const id = registerVisualizerImage({ name: 'face.png', source })
    expect(getVisualizerImage(id)?.name).toBe('face.png')
    expect(getVisualizerImageSource(id)).toBe(source)
    expect(visualizerImages.value.map((i) => i.id)).toEqual([id])
    expect(removeVisualizerImage(id)).toBe(true)
    expect(getVisualizerImage(id)).toBeNull()
    expect(visualizerImages.value).toEqual([])
  })

  it('rejects entries without a source and resolves unknown ids to null', () => {
    expect(() =>
      registerVisualizerImage({ name: 'x' } as Parameters<typeof registerVisualizerImage>[0]),
    ).toThrow()
    expect(getVisualizerImageSource('nope')).toBeNull()
    expect(getVisualizerImageSource(null)).toBeNull()
  })

  it('registers canvas images idempotently by canvas id', () => {
    const imageObject = fakeImg(2, 2)
    const a = registerCanvasImage({ id: 42, imageObject })
    const b = registerCanvasImage({ id: 42, imageObject })
    expect(a).toBe('canvas:42')
    expect(b).toBe(a)
    expect(visualizerImages.value.length).toBe(1)
    expect(visualizerImages.value[0]!.kind).toBe('canvas')
  })

  it('resolves the effective image: chosen → canvas → selected gallery → first gallery → null', () => {
    const chosen = registerVisualizerImage({ name: 'chosen', source: fakeImg(1, 1) })
    const canvasImages = [{ id: 1, imageObject: fakeImg(1, 1) }]
    const selectedGalleryImage = { id: 'g1', img: fakeImg(1, 1), name: 'g1' }
    const galleryImages = [{ id: 'g0', img: fakeImg(1, 1), name: 'g0' }, selectedGalleryImage]

    expect(
      resolveEffectiveImageId(chosen, { canvasImages, selectedGalleryImage, galleryImages }),
    ).toBe(chosen)
    expect(
      resolveEffectiveImageId('missing', { canvasImages, selectedGalleryImage, galleryImages }),
    ).toBe('canvas:1')
    expect(resolveEffectiveImageId(null, { selectedGalleryImage, galleryImages })).toBe(
      'gallery:g1',
    )
    expect(resolveEffectiveImageId(null, { galleryImages })).toBe('gallery:g0')
    expect(resolveEffectiveImageId(null, {})).toBeNull()
    expect(registerGalleryImage(selectedGalleryImage)).toBe('gallery:g1')
  })
})
