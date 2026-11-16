/**
 * Klick auf den Canvas bei übereinanderliegenden Elementen (MouseHandler):
 * Regression: Waren zwei Videos canvasfüllend gestreckt und das hintere
 * ausgewählt, behielt es jeden Klick – das vordere Video war nie per Klick
 * auswählbar. Jetzt bekommt das oberste Element den Klick; Alt+Klick wählt
 * das darunterliegende.
 */
import { describe, expect, it, vi } from 'vitest'
import { MouseHandler, isSameObject } from '../../lib/canvasManager/interaction/MouseHandler'
import { SelectionManager } from '../../lib/canvasManager/interaction/SelectionManager'
import type { CanvasManager, CanvasObject } from '../../lib/canvasManager'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface FakeObj {
  id: string
  type: 'image' | 'video' | 'text'
  bounds: Rect
  fotoSettings?: { renderBehindVisualizer?: boolean }
  stackOrder?: number
  offCanvas?: boolean
}

const FULL: Rect = { x: 0, y: 0, width: 200, height: 100 }

function obj(id: string, type: FakeObj['type'], bounds = FULL, behind = false): FakeObj {
  return { id, type, bounds, fotoSettings: { renderBehindVisualizer: behind } }
}

function setup({
  images = [] as FakeObj[],
  videos = [] as FakeObj[],
  texts = [] as FakeObj[],
  active = null as FakeObj | null,
} = {}) {
  const manager = {
    activeObject: active as unknown,
    selectedObjects: [] as unknown[],
    currentAction: null as string | null,
    dragStartPos: { x: 0, y: 0 },
    isEditingText: false,
    textSelectionMode: false,
    imageSelectionMode: false,
    canvas: { style: { cursor: 'default' } },
    textManager: { textObjects: texts, moveToTop: vi.fn() },
    videoManager: { getAllVideos: () => videos, isMarkerHidden: () => false },
    multiImageManager: {
      getAllImages: () => images,
      isMarkerHidden: () => false,
      setSelectedImage: vi.fn(),
    },
    getObjectBounds: (o: FakeObj | null) => o?.bounds ?? null,
    workspaceBackground: null,
    background: null,
    redrawCallback: vi.fn(),
    deleteActiveObject: vi.fn(),
    calculateTextBounds: vi.fn(),
    onSelectionChange: vi.fn(),
    _notifySelectionListeners: vi.fn(),
    selectionManager: null as unknown as SelectionManager,
    setActiveObject(o: CanvasObject | null) {
      this.selectionManager.setActiveObject(o)
    },
  }
  const cm = manager as unknown as CanvasManager
  manager.selectionManager = new SelectionManager(cm)
  const handler = new MouseHandler(cm)
  return { manager, handler }
}

/** mousedown an (x, y) – getMousePos braucht kein echtes Canvas */
function press(handler: MouseHandler, x: number, y: number, mods: Partial<MouseEvent> = {}) {
  vi.spyOn(handler, 'getMousePos').mockReturnValue({ x, y })
  handler.onMouseDown({
    clientX: x,
    clientY: y,
    shiftKey: false,
    altKey: false,
    ...mods,
  } as MouseEvent)
}

const activeId = (m: { activeObject: unknown }) => (m.activeObject as FakeObj | null)?.id ?? null

describe('MouseHandler – oberstes Element bekommt den Klick', () => {
  it('zwei canvasfüllende Videos, das hintere ausgewählt: Klick wählt das vordere', () => {
    const back = obj('back', 'video')
    const front = obj('front', 'video')
    const { manager, handler } = setup({ videos: [back, front], active: back })
    press(handler, 50, 50)
    expect(activeId(manager)).toBe('front')
    expect(manager.currentAction).toBe('move')
  })

  it('das vordere Video bleibt ausgewählt und lässt sich verschieben', () => {
    const back = obj('back', 'video')
    const front = obj('front', 'video')
    const { manager, handler } = setup({ videos: [back, front], active: front })
    press(handler, 50, 50)
    expect(activeId(manager)).toBe('front')
    expect(manager.currentAction).toBe('move')
  })

  it('canvasfüllendes Bild ausgewählt: Klick auf das Video darüber wählt das Video', () => {
    const img = obj('img', 'image')
    const vid = obj('vid', 'video')
    const { manager, handler } = setup({ images: [img], videos: [vid], active: img })
    press(handler, 50, 50)
    expect(activeId(manager)).toBe('vid')
  })

  it('außerhalb des oberen Elements bleibt das ausgewählte hintere Element aktiv', () => {
    const back = obj('back', 'video')
    const front = obj('front', 'video', { x: 0, y: 0, width: 50, height: 50 })
    const { manager, handler } = setup({ videos: [back, front], active: back })
    press(handler, 150, 80)
    expect(activeId(manager)).toBe('back')
    expect(manager.currentAction).toBe('move')
  })

  it('Text über dem Video bekommt weiterhin den Klick (Regression)', () => {
    const vid = obj('vid', 'video')
    const text = obj('txt', 'text', { x: 40, y: 40, width: 20, height: 20 })
    const { manager, handler } = setup({ videos: [vid], texts: [text], active: vid })
    press(handler, 50, 50)
    expect(activeId(manager)).toBe('txt')
  })

  it('Resize-Griffe des ausgewählten (verdeckten) Videos haben weiter Vorrang', () => {
    const back = obj('back', 'video', { x: 20, y: 20, width: 100, height: 60 })
    const front = obj('front', 'video')
    const { manager, handler } = setup({ videos: [back, front], active: back })
    press(handler, 120, 80) // Ecke unten rechts von „back“
    expect(activeId(manager)).toBe('back')
    expect(manager.currentAction).toBe('resize-br')
  })

  it('reaktiver Proxy und Rohobjekt gelten als dasselbe Element', () => {
    const front = obj('front', 'video')
    const { manager, handler } = setup({ videos: [obj('back', 'video'), front] })
    manager.activeObject = { ...front } // andere Referenz, gleiche ID
    press(handler, 50, 50)
    expect(manager.onSelectionChange).not.toHaveBeenCalled()
    expect(manager.currentAction).toBe('move')
  })
})

describe('MouseHandler – Alt+Klick wählt das darunterliegende Element', () => {
  it('geht vom vorderen zum hinteren Video und danach wieder nach oben', () => {
    const img = obj('img', 'image')
    const back = obj('back', 'video')
    const front = obj('front', 'video')
    const { manager, handler } = setup({ images: [img], videos: [back, front], active: front })
    press(handler, 50, 50, { altKey: true })
    expect(activeId(manager)).toBe('back')
    press(handler, 50, 50, { altKey: true })
    expect(activeId(manager)).toBe('img')
    press(handler, 50, 50, { altKey: true })
    expect(activeId(manager)).toBe('front')
  })

  it('erreicht ein Video hinter dem Visualizer unter einem canvasfüllenden Bild', () => {
    const img = obj('img', 'image')
    const vid = obj('vid', 'video', FULL, true)
    const { manager, handler } = setup({ images: [img], videos: [vid] })
    press(handler, 50, 50)
    expect(activeId(manager)).toBe('img')
    press(handler, 50, 50, { altKey: true })
    expect(activeId(manager)).toBe('vid')
  })

  it('ohne Elemente an der Stelle verhält sich Alt+Klick wie ein normaler Klick', () => {
    const vid = obj('vid', 'video', { x: 0, y: 0, width: 10, height: 10 })
    const { manager, handler } = setup({ videos: [vid], active: vid })
    press(handler, 150, 80, { altKey: true })
    expect(activeId(manager)).toBeNull()
  })
})

describe('isSameObject', () => {
  it('vergleicht Typ und ID', () => {
    const a = { id: 'x', type: 'video' } as unknown as CanvasObject
    expect(isSameObject(a, { ...a } as CanvasObject)).toBe(true)
    expect(isSameObject(a, { id: 'x', type: 'image' } as unknown as CanvasObject)).toBe(false)
    expect(isSameObject(a, null)).toBe(false)
  })
})

describe('SelectionManager.getObjectsAtPos', () => {
  it('liefert Texte, dann Medien vor und hinter dem Visualizer – oben zuerst', () => {
    const { manager } = setup({
      images: [obj('img-behind', 'image', FULL, true), obj('img', 'image')],
      videos: [obj('vid', 'video')],
      texts: [obj('txt', 'text')],
    })
    const ids = manager.selectionManager
      .getObjectsAtPos(50, 50)
      .map((o) => (o as { id: string }).id)
    expect(ids).toEqual(['txt', 'vid', 'img', 'img-behind'])
  })
})
