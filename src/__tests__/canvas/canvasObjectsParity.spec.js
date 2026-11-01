import { describe, it, expect, vi, beforeAll } from 'vitest'
import { MultiImageManager } from '../../lib/multiImageManager.js'
import { VideoManager } from '../../lib/videoManager.js'

/**
 * Charakterisierung der Canvas-Objekt-Logik, die Bild- und Video-Manager
 * gemeinsam haben (Handles, Löschbutton, Hit-Test, Einblend-Animation,
 * Z-Reihenfolge). Beide Manager müssen sich identisch verhalten.
 */

const CANVAS = { width: 1000, height: 500 }
const BOUNDS = { x: 100, y: 50, width: 200, height: 100 }

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

const MANAGERS = [
  {
    name: 'MultiImageManager',
    create: () => new MultiImageManager(CANVAS),
    select(mgr) {
      mgr.selectedImage = { id: 's', type: 'image' }
      mgr.getImageBounds = () => ({ ...BOUNDS })
    },
    list: (mgr) => mgr.images,
    setList(mgr, items) {
      mgr.images = items
    },
  },
  {
    name: 'VideoManager',
    create: () => new VideoManager(CANVAS),
    select(mgr) {
      mgr.selectedVideo = { id: 's', type: 'video' }
      mgr.getVideoBounds = () => ({ ...BOUNDS })
    },
    list: (mgr) => mgr.videos,
    setList(mgr, items) {
      mgr.videos = items
    },
  },
]

describe.each(MANAGERS)('$name – gemeinsame Canvas-Objekt-Logik', (m) => {
  it('getResizeHandles: 8 Handles à 10 px um die Bounds', () => {
    const h = m.create().getResizeHandles(BOUNDS)
    expect(h).toEqual({
      'resize-tl': { x: 95, y: 45, width: 10, height: 10 },
      'resize-tr': { x: 295, y: 45, width: 10, height: 10 },
      'resize-bl': { x: 95, y: 145, width: 10, height: 10 },
      'resize-br': { x: 295, y: 145, width: 10, height: 10 },
      'resize-t': { x: 195, y: 45, width: 10, height: 10 },
      'resize-b': { x: 195, y: 145, width: 10, height: 10 },
      'resize-l': { x: 95, y: 95, width: 10, height: 10 },
      'resize-r': { x: 295, y: 95, width: 10, height: 10 },
    })
  })

  it('getDeleteButtonBounds: 20 px, zentriert auf der Ecke oben rechts', () => {
    expect(m.create().getDeleteButtonBounds(BOUNDS)).toEqual({
      x: 290,
      y: 40,
      width: 20,
      height: 20,
    })
  })

  it('isPointInRect schließt die Ränder ein', () => {
    const mgr = m.create()
    expect(mgr.isPointInRect(100, 50, BOUNDS)).toBe(true)
    expect(mgr.isPointInRect(300, 150, BOUNDS)).toBe(true)
    expect(mgr.isPointInRect(300.1, 150, BOUNDS)).toBe(false)
    expect(mgr.isPointInRect(99.9, 60, BOUNDS)).toBe(false)
  })

  it('findHandleAt: nur mit Auswahl; trifft Ecken und Kanten', () => {
    const mgr = m.create()
    expect(mgr.findHandleAt(100, 50)).toBe(null)
    m.select(mgr)
    expect(mgr.findHandleAt(100, 50)).toBe('resize-tl')
    expect(mgr.findHandleAt(300, 150)).toBe('resize-br')
    expect(mgr.findHandleAt(200, 150)).toBe('resize-b')
    expect(mgr.findHandleAt(200, 100)).toBe(null)
  })

  it('isPointOnDeleteButton: nur mit Auswahl', () => {
    const mgr = m.create()
    expect(mgr.isPointOnDeleteButton(300, 50)).toBe(false)
    m.select(mgr)
    expect(mgr.isPointOnDeleteButton(300, 50)).toBe(true)
    expect(mgr.isPointOnDeleteButton(270, 50)).toBe(false)
  })

  it('getAnimationTransform: ohne aktive Animation neutral', () => {
    const mgr = m.create()
    const neutral = { opacity: 1, translateX: 0, translateY: 0, scale: 1, rotation: 0 }
    expect(mgr.getAnimationTransform({})).toEqual(neutral)
    expect(mgr.getAnimationTransform({ animation: { active: false } })).toEqual(neutral)
    expect(
      mgr.getAnimationTransform({ animation: { active: true, type: 'unknown', progress: 0.5 } }),
    ).toEqual(neutral)
  })

  it.each([
    'fade',
    'slideLeft',
    'slideRight',
    'slideUp',
    'slideDown',
    'zoom',
    'bounce',
    'spin',
    'elastic',
  ])('getAnimationTransform(%s) bei 0 / 0.3 / 0.7 / 1', (type) => {
    const mgr = m.create()
    const rows = [0, 0.3, 0.7, 1].map((progress) => {
      const r = mgr.getAnimationTransform({ animation: { active: true, type, progress } })
      return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v * 1e6) / 1e6]))
    })
    expect(rows).toMatchSnapshot()
  })

  it('bringToFront / sendToBack verschieben in der Liste und melden Änderungen', () => {
    const mgr = m.create()
    const a = { id: 'a' }
    const b = { id: 'b' }
    const c = { id: 'c' }
    m.setList(mgr, [a, b, c])
    const redraw = vi.fn()
    mgr.redrawCallback = redraw

    expect(mgr.bringToFront(a)).toBe(true)
    expect(m.list(mgr)).toEqual([b, c, a])
    expect(mgr.bringToFront(a)).toBe(false)

    expect(mgr.sendToBack(a)).toBe(true)
    expect(m.list(mgr)).toEqual([a, b, c])
    expect(mgr.sendToBack(a)).toBe(false)

    expect(mgr.bringToFront({ id: 'fremd' })).toBe(false)
    expect(mgr.bringToFront(null)).toBe(false)
    expect(redraw).toHaveBeenCalledTimes(2)
  })
})
