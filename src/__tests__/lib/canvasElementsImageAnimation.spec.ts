import { describe, it, expect } from 'vitest'
import { captureCanvasElements } from '../../lib/background/canvasElements'
import { stub } from '../helpers/canvasStubs'

function cmWith(images: object[]) {
  return stub<Parameters<typeof captureCanvasElements>[0]>({
    multiImageManager: { getAllImages: () => images },
    videoManager: { getAllVideos: () => [] },
    textManager: { textObjects: [] },
  })
}

const base = {
  imageObject: { src: 'data:a' },
  relX: 0,
  relY: 0,
  relWidth: 0.5,
  relHeight: 0.5,
  settings: {},
  fotoSettings: {},
}

describe('Canvas-Presets: Bild-Animationen', () => {
  it('nimmt timedAnimation als Kopie auf', () => {
    const timedAnimation = { slide: { enabled: true, from: 'left' } }
    const { images } = captureCanvasElements(cmWith([{ ...base, timedAnimation }]), { $state: {} })
    expect(images[0]!.timedAnimation).toEqual(timedAnimation)
    expect(images[0]!.timedAnimation).not.toBe(timedAnimation)
  })

  it('Bilder ohne Animation behalten ihre bisherige Form', () => {
    const { images } = captureCanvasElements(cmWith([base]), { $state: {} })
    expect(images[0]).not.toHaveProperty('timedAnimation')
  })
})
