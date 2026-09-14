import { describe, it, expect, beforeEach } from 'vitest'
import {
  visualizerImages,
  registerVisualizerImage,
  getVisualizerImage,
  getVisualizerImageSource,
  removeVisualizerImage,
  clearVisualizerImages,
  registerCanvasImage,
} from '../../lib/visualizers/imageRegistry.js'

describe('imageRegistry', () => {
  beforeEach(() => clearVisualizerImages())

  it('registers, lists, resolves and removes images', () => {
    const source = { width: 4, height: 4 }
    const id = registerVisualizerImage({ name: 'face.png', source })
    expect(getVisualizerImage(id)?.name).toBe('face.png')
    expect(getVisualizerImageSource(id)).toBe(source)
    expect(visualizerImages.value.map((i) => i.id)).toEqual([id])
    expect(removeVisualizerImage(id)).toBe(true)
    expect(getVisualizerImage(id)).toBeNull()
    expect(visualizerImages.value).toEqual([])
  })

  it('rejects entries without a source and resolves unknown ids to null', () => {
    expect(() => registerVisualizerImage({ name: 'x' })).toThrow()
    expect(getVisualizerImageSource('nope')).toBeNull()
    expect(getVisualizerImageSource(null)).toBeNull()
  })

  it('registers canvas images idempotently by canvas id', () => {
    const imageObject = { width: 2, height: 2 }
    const a = registerCanvasImage({ id: 42, imageObject })
    const b = registerCanvasImage({ id: 42, imageObject })
    expect(a).toBe('canvas:42')
    expect(b).toBe(a)
    expect(visualizerImages.value.length).toBe(1)
    expect(visualizerImages.value[0].kind).toBe('canvas')
  })
})
