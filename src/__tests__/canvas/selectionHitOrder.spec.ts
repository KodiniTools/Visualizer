/**
 * Klick-Reihenfolge auf dem Canvas (SelectionManager.getObjectAtPos):
 * Was oben gezeichnet wird, bekommt den Klick. Regression: Ein Bild vor dem
 * Visualizer lag sichtbar über einem Video hinter dem Visualizer, der Klick
 * traf aber immer das Video – das Bild ließ sich nur über „Bilder auf
 * Canvas“ auswählen.
 */
import { describe, expect, it } from 'vitest'
import { SelectionManager } from '../../lib/canvasManager/interaction/SelectionManager'
import type { CanvasManager } from '../../lib/canvasManager'

interface FakeMedia {
  id: string
  type: string
  stackOrder?: number
  bounds: { x: number; y: number; width: number; height: number }
  fotoSettings?: { renderBehindVisualizer?: boolean }
}

const FULL = { x: 0, y: 0, width: 100, height: 100 }

function media(id: string, type: 'image' | 'video', behind = false): FakeMedia {
  return { id, type, bounds: FULL, fotoSettings: { renderBehindVisualizer: behind } }
}

function setup({
  images = [] as FakeMedia[],
  videos = [] as FakeMedia[],
  hiddenImages = [] as string[],
  hiddenVideos = [] as string[],
} = {}) {
  const manager = {
    textManager: { textObjects: [] },
    videoManager: {
      getAllVideos: () => videos,
      isMarkerHidden: (id: string) => hiddenVideos.includes(id),
    },
    multiImageManager: {
      getAllImages: () => images,
      isMarkerHidden: (id: string) => hiddenImages.includes(id),
    },
    getObjectBounds: (obj: FakeMedia) => obj.bounds,
    workspaceBackground: null,
    background: null,
  }
  return new SelectionManager(manager as unknown as CanvasManager)
}

const hitId = (sm: SelectionManager) => (sm.getObjectAtPos(50, 50) as { id?: string } | null)?.id

describe('SelectionManager.getObjectAtPos – Zeichen-Reihenfolge', () => {
  it('Bild vor dem Visualizer schlägt Video dahinter', () => {
    const sm = setup({
      images: [media('img', 'image', false)],
      videos: [media('vid', 'video', true)],
    })
    expect(hitId(sm)).toBe('img')
  })

  it('auf derselben Ebene liegt das Video über dem Bild (wie gezeichnet)', () => {
    expect(hitId(setup({ images: [media('img', 'image')], videos: [media('vid', 'video')] }))).toBe(
      'vid',
    )
    expect(
      hitId(
        setup({ images: [media('img', 'image', true)], videos: [media('vid', 'video', true)] }),
      ),
    ).toBe('vid')
  })

  it('Video vor dem Visualizer schlägt Bild dahinter', () => {
    const sm = setup({
      images: [media('img', 'image', true)],
      videos: [media('vid', 'video', false)],
    })
    expect(hitId(sm)).toBe('vid')
  })

  it('vom Marker ausgeblendete Elemente sind nicht anklickbar', () => {
    const sm = setup({
      images: [media('behind', 'image', true), media('front', 'image', false)],
      videos: [media('vid', 'video', false)],
      hiddenVideos: ['vid'],
      hiddenImages: ['front'],
    })
    expect(hitId(sm)).toBe('behind')
  })

  it('oberste Ebene innerhalb der Bilder gewinnt', () => {
    const sm = setup({ images: [media('unten', 'image'), media('oben', 'image')] })
    expect(hitId(sm)).toBe('oben')
  })

  it('gemeinsame Ebenen: Bild mit höherem stackOrder schlägt Video derselben Ebene', () => {
    const img = { ...media('img', 'image'), stackOrder: 5 }
    const vid = { ...media('vid', 'video'), stackOrder: 4 }
    expect(hitId(setup({ images: [img], videos: [vid] }))).toBe('img')
    vid.stackOrder = 6
    expect(hitId(setup({ images: [img], videos: [vid] }))).toBe('vid')
  })
})
