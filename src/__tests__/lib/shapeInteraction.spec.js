import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useShapeStore } from '../../stores/shapeStore.js'
import {
  createShapeInteraction,
  getCanvasDisplayScale,
  getCanvasPointer,
  SHAPES_OPEN_EVENT,
  SHAPES_FOCUS_TEXT_EVENT,
} from '../../lib/shapes/shapeInteraction.js'

// Canvas 1000 × 500, angezeigt in 500 × 250 → 2 Canvas-Pixel pro Bildschirm-Pixel
function setup({ textAt = null, activeObject = null } = {}) {
  const parent = document.createElement('div')
  const canvas = document.createElement('canvas')
  canvas.width = 1000
  canvas.height = 500
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 250 })
  parent.appendChild(canvas)
  document.body.appendChild(parent)

  const canvasMouseDown = vi.fn()
  canvas.addEventListener('mousedown', canvasMouseDown)

  const cm = {
    activeObject,
    setActiveObject: vi.fn((obj) => (cm.activeObject = obj)),
    getObjectBounds: () => null,
    selectionManager: { getTextAtPos: () => textAt },
  }
  const store = useShapeStore()
  const commit = vi.fn()
  const interaction = createShapeInteraction({
    canvas,
    store,
    getCanvasManager: () => cm,
    commit,
  })
  return { parent, canvas, store, commit, interaction, cm, canvasMouseDown }
}

// Bildschirm-Koordinaten zu Canvas-Koordinaten (Faktor 2)
const mouse = (target, type, x, y, extra = {}) =>
  target.dispatchEvent(
    new MouseEvent(type, { clientX: x / 2, clientY: y / 2, bubbles: true, button: 0, ...extra }),
  )

describe('shapeInteraction', () => {
  let ctx

  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => {
    ctx?.interaction.destroy()
    ctx?.parent.remove()
    ctx = null
  })

  it('rechnet Bildschirm- in Canvas-Koordinaten um (Letterboxing)', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1000
    canvas.height = 500
    canvas.getBoundingClientRect = () => ({ left: 10, top: 0, width: 500, height: 500 })
    expect(getCanvasDisplayScale(canvas)).toBe(0.5)
    // Oben/unten je 125 px Rand
    expect(getCanvasPointer(canvas, { clientX: 260, clientY: 250 })).toEqual({ x: 500, y: 250 })
  })

  it('Klick auf eine Form wählt sie aus, öffnet das Panel und verschiebt sie per Ziehen', () => {
    ctx = setup({ activeObject: { type: 'image' } })
    const shape = ctx.store.addShape('rect', 1000, 500)
    ctx.store.selectShape(null)
    const opened = vi.fn()
    window.addEventListener(SHAPES_OPEN_EVENT, opened)

    mouse(ctx.canvas, 'mousedown', 500, 250)
    expect(ctx.store.selectedShapeId).toBe(shape.id)
    expect(ctx.cm.setActiveObject).toHaveBeenCalledWith(null)
    expect(opened).toHaveBeenCalled()
    // Der MouseHandler des Canvas sieht das Ereignis nicht
    expect(ctx.canvasMouseDown).not.toHaveBeenCalled()

    mouse(window, 'mousemove', 600, 300)
    mouse(window, 'mouseup', 600, 300)
    expect(ctx.store.shapes[0]).toMatchObject({ x: 600, y: 300 })
    expect(ctx.commit).toHaveBeenCalledTimes(1)
    window.removeEventListener(SHAPES_OPEN_EVENT, opened)
  })

  it('Klick ins Leere hebt die Auswahl auf und reicht das Ereignis weiter', () => {
    ctx = setup()
    ctx.store.addShape('rect', 1000, 500)
    mouse(ctx.canvas, 'mousedown', 20, 20)
    expect(ctx.store.selectedShapeId).toBeNull()
    expect(ctx.canvasMouseDown).toHaveBeenCalled()
  })

  it('Texte liegen über den Formen und gewinnen', () => {
    ctx = setup({ textAt: { type: 'text' } })
    ctx.store.addShape('rect', 1000, 500)
    ctx.store.selectShape(null)
    mouse(ctx.canvas, 'mousedown', 500, 250)
    expect(ctx.store.selectedShapeId).toBeNull()
    expect(ctx.canvasMouseDown).toHaveBeenCalled()
  })

  it('Eck-Griff ändert die Größe, ohne Verschieben ohne Verlaufsschritt', () => {
    ctx = setup()
    const shape = { ...ctx.store.addShape('rect', 1000, 500) }
    const { width, height } = shape
    // Rahmen-Abstand 6 Bildschirm-px = 12 Canvas-px
    const se = { x: shape.x + width / 2 + 12, y: shape.y + height / 2 + 12 }
    mouse(ctx.canvas, 'mousedown', se.x, se.y)
    mouse(window, 'mousemove', se.x + 40, se.y + 20)
    mouse(window, 'mouseup', se.x + 40, se.y + 20)
    // Die Ecke folgt dem Zeiger (Griff sitzt 12 Canvas-px außerhalb der Form)
    expect(ctx.store.shapes[0].width).toBe(width + 52)
    expect(ctx.store.shapes[0].height).toBe(height + 32)
    expect(ctx.commit).toHaveBeenCalledTimes(1)

    ctx.commit.mockClear()
    mouse(ctx.canvas, 'mousedown', shape.x, shape.y)
    mouse(window, 'mouseup', shape.x, shape.y)
    expect(ctx.commit).not.toHaveBeenCalled()
  })

  it('Zeichenmodus: ein Zug ergibt einen Freihand-Strich', () => {
    ctx = setup()
    ctx.store.setDrawTool('pen')
    mouse(ctx.canvas, 'mousedown', 100, 100)
    mouse(window, 'mousemove', 200, 150)
    mouse(window, 'mousemove', 300, 100)
    mouse(window, 'mouseup', 300, 100)
    expect(ctx.store.shapes).toHaveLength(1)
    expect(ctx.store.shapes[0]).toMatchObject({ type: 'freehand', tool: 'pen', x: 200 })
    expect(ctx.store.shapes[0].points.length).toBeGreaterThanOrEqual(3)
    expect(ctx.commit).toHaveBeenCalledTimes(1)
    expect(ctx.canvasMouseDown).not.toHaveBeenCalled()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(ctx.store.drawTool).toBeNull()
  })

  it('Tastatur: Pfeile verschieben, Strg+D dupliziert, Entf löscht – nicht in Eingabefeldern', () => {
    ctx = setup()
    const startX = ctx.store.addShape('rect', 1000, 500).x
    const key = (k, extra = {}, target = window) =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...extra }))
    const bubbled = vi.fn()
    document.addEventListener('keydown', bubbled)

    key('ArrowRight', { shiftKey: true })
    expect(ctx.store.shapes[0].x).toBe(startX + 10)
    key('d', { ctrlKey: true })
    expect(ctx.store.shapes).toHaveLength(2)

    const input = document.createElement('input')
    document.body.appendChild(input)
    key('Delete', {}, input)
    expect(ctx.store.shapes).toHaveLength(2)
    input.remove()

    key('Delete')
    expect(ctx.store.shapes).toHaveLength(1)
    expect(ctx.commit).toHaveBeenCalledTimes(3)
    // Behandelte Tasten erreichen die globalen Kürzel nicht
    expect(bubbled).toHaveBeenCalledTimes(1)
    document.removeEventListener('keydown', bubbled)
  })

  it('Doppelklick auf eine Textform fokussiert die Texteingabe', () => {
    ctx = setup()
    ctx.store.addShape('textBox', 1000, 500)
    const focus = vi.fn()
    window.addEventListener(SHAPES_FOCUS_TEXT_EVENT, focus)
    mouse(ctx.canvas, 'dblclick', 500, 250)
    expect(focus).toHaveBeenCalled()
    window.removeEventListener(SHAPES_FOCUS_TEXT_EVENT, focus)
  })
})
