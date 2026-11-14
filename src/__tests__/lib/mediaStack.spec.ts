/**
 * Gemeinsame Ebenen-Reihenfolge von Canvas-Bildern und -Videos
 * (lib/canvasObjects/mediaStack). Regression: Ein Bild auf „Ebene 3 / 3“ lag
 * unter einem Video und war unsichtbar und nicht anklickbar, weil Videos
 * immer nach allen Bildern gezeichnet wurden.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  canMoveInStack,
  drawMediaStack,
  moveInStack,
  nextStackOrder,
  stackMedia,
  stackPosition,
  type StackObject,
} from '../../lib/canvasObjects/mediaStack'

interface Item extends StackObject {
  id: string
}

const item = (id: string, stackOrder?: number, behind = false): Item => ({
  id,
  ...(stackOrder !== undefined ? { stackOrder } : {}),
  fotoSettings: { renderBehindVisualizer: behind },
})
const ids = (images: Item[], videos: Item[]) => stackMedia(images, videos).map((e) => e.obj.id)

describe('stackMedia', () => {
  it('ohne Ebenen-Werte wie bisher: Bilder in Array-Reihenfolge, Videos darüber', () => {
    expect(ids([item('i1'), item('i2')], [item('v1'), item('v2')])).toEqual([
      'i1',
      'i2',
      'v1',
      'v2',
    ])
  })

  it('neues Bild (nextStackOrder) liegt über Altvideos', () => {
    const fresh = item('neu', nextStackOrder())
    expect(ids([item('i1'), fresh], [item('v1')])).toEqual(['i1', 'v1', 'neu'])
  })

  it('verzahnt nach stackOrder, je Art gilt die Array-Reihenfolge', () => {
    // Array der Bilder umsortiert (z. B. Thumbnail-Leiste): Plätze bleiben,
    // die Bilder belegen sie in Array-Reihenfolge
    const images = [item('b', 3), item('a', 1)]
    const videos = [item('v', 2)]
    expect(ids(images, videos)).toEqual(['b', 'v', 'a'])
  })

  it('nextStackOrder steigt streng', () => {
    const a = nextStackOrder()
    const b = nextStackOrder()
    expect(b).toBeGreaterThan(a)
  })
})

describe('moveInStack', () => {
  it('„Nach vorne“ bringt ein Bild über ein Video und sortiert beide Arrays', () => {
    const images = [item('i1'), item('i2')]
    const videos = [item('v1')]
    expect(moveInStack(images, videos, images[0], 'bringToFront')).toBe(true)
    expect(ids(images, videos)).toEqual(['i2', 'v1', 'i1'])
    expect(images.map((i) => i.id)).toEqual(['i2', 'i1'])
    expect(images.map((i) => i.stackOrder)).toEqual([0, 2])
    expect(videos[0]!.stackOrder).toBe(1)
  })

  it('Ein Schritt nach oben/unten tauscht mit dem Nachbarn (auch über die Art hinweg)', () => {
    const images = [item('i1')]
    const videos = [item('v1'), item('v2')]
    expect(moveInStack(images, videos, images[0], 'moveUp')).toBe(true)
    expect(ids(images, videos)).toEqual(['v1', 'i1', 'v2'])
    expect(moveInStack(images, videos, videos[1], 'moveDown')).toBe(true)
    expect(ids(images, videos)).toEqual(['v1', 'v2', 'i1'])
    expect(moveInStack(images, videos, videos[0], 'sendToBack')).toBe(false)
  })

  it('Nachbarn nur in derselben Zeichen-Ebene (hinter / vor dem Visualizer)', () => {
    const images = [item('vorn', 1)]
    const videos = [item('hinten', 2, true)]
    // Das Video liegt in einer anderen Ebene – ein Tausch hätte keine Wirkung
    expect(canMoveInStack(images, videos, images[0], 'moveUp')).toBe(false)
    expect(moveInStack(images, videos, images[0], 'moveUp')).toBe(false)
  })

  it('oben/unten angekommen: nichts zu tun; unbekanntes Ziel: false', () => {
    const images = [item('i1')]
    const videos = [item('v1')]
    expect(canMoveInStack(images, videos, videos[0], 'moveUp')).toBe(false)
    expect(canMoveInStack(images, videos, images[0], 'moveDown')).toBe(false)
    expect(moveInStack(images, videos, item('fremd'), 'moveUp')).toBe(false)
    expect(moveInStack(images, videos, null, 'moveUp')).toBe(false)
  })
})

describe('stackPosition', () => {
  it('Position im gemeinsamen Stapel, -1 für fremde Objekte', () => {
    const images = [item('i1')]
    const videos = [item('v1')]
    expect(stackPosition(images, videos, images[0])).toEqual({ index: 0, count: 2 })
    expect(stackPosition(images, videos, videos[0])).toEqual({ index: 1, count: 2 })
    expect(stackPosition(images, videos, item('hg'))).toEqual({ index: -1, count: 2 })
  })
})

describe('drawMediaStack', () => {
  it('zeichnet je Ebene in gemeinsamer Reihenfolge und überspringt Unsichtbares', () => {
    const calls: string[] = []
    const images = [item('hinten', 0, true), item('i2', 1), item('i1', 3)]
    const videos = [item('v1', 2), item('versteckt', 4)]
    const imageLayer = {
      images,
      isImageDrawable: (img: Item, behind: boolean | null) =>
        (img.fotoSettings?.renderBehindVisualizer || false) === behind,
      drawImage: (_ctx: CanvasRenderingContext2D, img: Item) => calls.push(img.id),
    }
    const videoLayer = {
      videos,
      beginVideoFrame: vi.fn(),
      isVideoDrawable: (v: Item, behind: boolean | null) =>
        v.id !== 'versteckt' && (v.fotoSettings?.renderBehindVisualizer || false) === behind,
      drawVideo: (_ctx: CanvasRenderingContext2D, v: Item) => calls.push(v.id),
    }
    const ctx = {} as CanvasRenderingContext2D
    drawMediaStack(ctx, imageLayer, videoLayer, false)
    expect(calls).toEqual(['i2', 'v1', 'i1'])
    expect(videoLayer.beginVideoFrame).toHaveBeenCalledWith(false)
    calls.length = 0
    drawMediaStack(ctx, imageLayer, videoLayer, true)
    expect(calls).toEqual(['hinten'])
  })
})
