import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useShapeStore } from '../../stores/shapeStore.js'
import { useHistoryStore } from '../../stores/historyStore.js'
import { createHistoryRecorder } from '../../lib/history/historyRecorder.js'
import { createShapesSegment } from '../../lib/history/segments/shapesSegment.js'

describe('shapeStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useShapeStore()
  })

  it('addShape legt die Form mittig an, wählt sie aus und merkt sich die Canvas-Größe', () => {
    const shape = store.addShape('star', 1920, 1080)
    expect(shape).toMatchObject({ type: 'star', x: 960, y: 540 })
    expect(store.selectedShapeId).toBe(shape.id)
    expect(store.selectedShape.id).toBe(shape.id)
    expect(store.canvasSize).toEqual({ width: 1920, height: 1080 })
    expect(store.addShape('unbekannt', 100, 100)).toBeNull()
  })

  it('duplizieren, Reihenfolge, löschen', () => {
    const a = store.addShape('rect', 800, 600)
    const b = store.addShape('ellipse', 800, 600)
    const copy = store.duplicateShape(a.id)
    expect(store.shapes.map((s) => s.id)).toEqual([a.id, copy.id, b.id])
    expect(copy.x).toBeGreaterThan(a.x)
    expect(store.selectedShapeId).toBe(copy.id)

    expect(store.moveShapeOrder(copy.id, 'up')).toBe(true)
    expect(store.shapes.at(-1).id).toBe(copy.id)
    expect(store.moveShapeOrder(copy.id, 'up')).toBe(false)

    expect(store.deleteShape(copy.id)).toBe(true)
    expect(store.selectedShapeId).toBeNull()
    expect(store.deleteShape('gibt-es-nicht')).toBe(false)
  })

  it('nummeriert Marker fortlaufend, auch beim Duplizieren', () => {
    store.addShape('marker', 400, 300)
    store.addShape('rect', 400, 300)
    const second = store.addShape('markerSquare', 400, 300)
    expect(second.number).toBe(2)
    expect(store.duplicateShape(second.id).number).toBe(3)
  })

  it('skaliert Formen mit, wenn sich die Canvas-Größe ändert', () => {
    const shape = store.addShape('rect', 1920, 1080)
    const { width } = shape
    expect(store.syncCanvasSize(1920, 1080)).toBe(false)
    expect(store.syncCanvasSize(960, 540)).toBe(true)
    expect(store.shapes[0]).toMatchObject({ x: 480, y: 270, width: Math.round(width / 2) })
    expect(store.canvasSize).toEqual({ width: 960, height: 540 })
    expect(store.syncCanvasSize(0, 0)).toBe(false)
  })

  it('Zeichenmodus hebt die Auswahl auf; Striche werden nicht ausgewählt', () => {
    store.addShape('rect', 800, 600)
    store.setDrawTool('highlighter')
    expect(store.drawTool).toBe('highlighter')
    expect(store.selectedShapeId).toBeNull()
    const stroke = store.addFreehandShape([
      { x: 0, y: 0 },
      { x: 40, y: 20 },
    ])
    expect(stroke).toMatchObject({ type: 'freehand', tool: 'highlighter' })
    expect(store.selectedShapeId).toBeNull()
    store.updateDrawSettings('highlighter', { width: 12 })
    expect(store.drawSettings.highlighter.width).toBe(12)
    store.setDrawTool('kein-werkzeug')
    expect(store.drawTool).toBeNull()
  })

  it('Snapshot hin und zurück; fehlende Auswahl wird aufgehoben', () => {
    const shape = store.addShape('heart', 800, 600)
    const originalX = shape.x
    const snap = store.captureSnapshot()
    store.updateShape(shape.id, { x: 10 })
    store.applySnapshot(snap)
    expect(store.shapes[0].x).toBe(originalX)
    expect(store.selectedShapeId).toBe(shape.id)
    store.applySnapshot({ shapes: [], canvasSize: { width: 1, height: 1 } })
    expect(store.shapes).toEqual([])
    expect(store.selectedShapeId).toBeNull()
  })
})

describe('History-Segment shapes', () => {
  let recorder

  afterEach(() => recorder?.destroy())

  it('Hinzufügen und Verschieben sind je ein Schritt; Undo/Redo stellt sie wieder her', async () => {
    setActivePinia(createPinia())
    const store = useShapeStore()
    const history = useHistoryStore()
    recorder = createHistoryRecorder({ historyStore: history })
    recorder.registerSegment('shapes', createShapesSegment(store))

    const shape = store.addShape('star', 800, 600)
    expect(recorder.checkpoint()).not.toBeNull()
    store.updateShape(shape.id, { x: 100 })
    expect(recorder.checkpoint()).not.toBeNull()
    expect(history.history.map((c) => c.segments)).toEqual([['shapes'], ['shapes']])

    await history.undo()
    expect(store.shapes[0].x).toBe(400)
    await history.undo()
    expect(store.shapes).toEqual([])
    await history.redo()
    expect(store.shapes).toHaveLength(1)
  })
})
