import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  createFreehandShape,
  createShape,
  DRAW_TOOLS,
  nextMarkerNumber,
  scaleShapesToCanvas,
} from '../lib/shapes/shapes.js'

/**
 * Formen & Symbole (Galerie aus dem Bildkonverter): Overlay-Ebene über Bildern
 * und Videos, unter den Texten. Formen liegen in Canvas-Pixeln; ändert sich die
 * Canvas-Größe (Workspace-Format), skaliert syncCanvasSize() sie mit.
 *
 * Gezeichnet wird in der Render-Schleife (renderLoop/sceneRenderer.js), die
 * Auswahl im Editor-Overlay; Zeiger-Interaktion in lib/shapes/shapeInteraction.js.
 * Undo/Redo über das History-Segment `shapes` (shapes + canvasSize).
 */
export const useShapeStore = defineStore('shapes', () => {
  const shapes = ref([])
  const selectedShapeId = ref(null)
  /** Canvas-Größe, auf die sich die Koordinaten der Formen beziehen */
  const canvasSize = ref({ width: 0, height: 0 })

  // Zeichenmodus: null | 'pen' | 'highlighter' und Stil je Werkzeug (width null = automatisch)
  const drawTool = ref(null)
  const drawSettings = ref({
    pen: { color: '#e53935', width: null, opacity: 100 },
    highlighter: { color: '#ffeb3b', width: null, opacity: 60 },
  })

  const selectedShape = computed(
    () => shapes.value.find((s) => s.id === selectedShapeId.value) || null,
  )

  /**
   * Bezugsgröße setzen; bei einer Änderung werden vorhandene Formen
   * proportional mitskaliert. @returns {boolean} true, wenn skaliert wurde
   */
  function syncCanvasSize(width, height) {
    const w = Number(width) || 0
    const h = Number(height) || 0
    if (w <= 0 || h <= 0) return false
    const from = canvasSize.value
    if (from.width === w && from.height === h) return false
    const scaled =
      from.width > 0 && from.height > 0
        ? scaleShapesToCanvas(shapes.value, from, { width: w, height: h })
        : false
    canvasSize.value = { width: w, height: h }
    return scaled
  }

  /**
   * Fügt eine Form aus der Galerie hinzu und wählt sie aus.
   * @returns {object|null} die neue Form (null bei unbekanntem Galerie-Eintrag)
   */
  function addShape(galleryId, canvasWidth, canvasHeight) {
    const shape = createShape(galleryId, canvasWidth, canvasHeight)
    if (!shape) return null
    syncCanvasSize(canvasWidth, canvasHeight)
    // Marker zählen automatisch weiter
    if (shape.type === 'marker') shape.number = nextMarkerNumber(shapes.value)
    shapes.value.push(shape)
    selectShape(shape.id)
    return shapes.value[shapes.value.length - 1]
  }

  function updateShape(shapeId, updates) {
    const shape = shapes.value.find((s) => s.id === shapeId)
    if (!shape) return false
    Object.assign(shape, updates)
    return true
  }

  function deleteShape(shapeId) {
    const index = shapes.value.findIndex((s) => s.id === shapeId)
    if (index === -1) return false
    shapes.value.splice(index, 1)
    if (selectedShapeId.value === shapeId) selectedShapeId.value = null
    return true
  }

  /** Kopie leicht versetzt darüberlegen und auswählen */
  function duplicateShape(shapeId) {
    const source = shapes.value.find((s) => s.id === shapeId)
    if (!source) return null
    const copy = createShape(source.type, 1, 1)
    const offset = Math.max(10, Math.round(Math.min(source.width, source.height) * 0.1))
    Object.assign(copy, JSON.parse(JSON.stringify(source)), {
      id: copy.id,
      x: source.x + offset,
      y: source.y + offset,
    })
    if (copy.type === 'marker') copy.number = nextMarkerNumber(shapes.value)
    const index = shapes.value.findIndex((s) => s.id === shapeId)
    shapes.value.splice(index + 1, 0, copy)
    selectShape(copy.id)
    return shapes.value[index + 1]
  }

  /** Reihenfolge ändern: 'up' = eine Ebene nach vorn, 'down' = nach hinten */
  function moveShapeOrder(shapeId, direction) {
    const index = shapes.value.findIndex((s) => s.id === shapeId)
    if (index === -1) return false
    const target = direction === 'up' ? index + 1 : index - 1
    if (target < 0 || target >= shapes.value.length) return false
    const [shape] = shapes.value.splice(index, 1)
    shapes.value.splice(target, 0, shape)
    return true
  }

  /** Auswahl setzen (null hebt sie auf); unbekannte ids werden ignoriert */
  function selectShape(shapeId) {
    if (shapeId !== null && !shapes.value.some((s) => s.id === shapeId)) return
    selectedShapeId.value = shapeId
  }

  function clearShapes() {
    shapes.value = []
    selectedShapeId.value = null
    drawTool.value = null
  }

  /** Zeichenwerkzeug ein-/ausschalten; beim Einschalten wird die Auswahl aufgehoben */
  function setDrawTool(tool) {
    drawTool.value = DRAW_TOOLS.includes(tool) ? tool : null
    if (drawTool.value) selectShape(null)
  }

  function updateDrawSettings(tool, patch) {
    if (!DRAW_TOOLS.includes(tool)) return
    drawSettings.value[tool] = { ...drawSettings.value[tool], ...patch }
  }

  /**
   * Fügt einen gezeichneten Strich als Form hinzu (ohne ihn auszuwählen, damit
   * direkt weitergezeichnet werden kann).
   * @param {{x:number,y:number}[]} canvasPoints
   */
  function addFreehandShape(canvasPoints, tool = drawTool.value) {
    const settings = drawSettings.value[tool] ?? drawSettings.value.pen
    const shape = createFreehandShape(canvasPoints, { tool, ...settings })
    if (!shape) return null
    shapes.value.push(shape)
    return shapes.value[shapes.value.length - 1]
  }

  /** Snapshot für den Verlauf (JSON-fähig) */
  function captureSnapshot() {
    return {
      shapes: JSON.parse(JSON.stringify(shapes.value)),
      canvasSize: { ...canvasSize.value },
    }
  }

  /** Snapshot wiederherstellen; eine nicht mehr vorhandene Auswahl wird aufgehoben */
  function applySnapshot(snapshot) {
    const list = Array.isArray(snapshot?.shapes) ? snapshot.shapes : []
    shapes.value = JSON.parse(JSON.stringify(list))
    const size = snapshot?.canvasSize
    canvasSize.value = {
      width: Number(size?.width) || 0,
      height: Number(size?.height) || 0,
    }
    if (!shapes.value.some((s) => s.id === selectedShapeId.value)) selectedShapeId.value = null
  }

  return {
    shapes,
    selectedShapeId,
    selectedShape,
    canvasSize,
    drawTool,
    drawSettings,
    syncCanvasSize,
    addShape,
    updateShape,
    deleteShape,
    duplicateShape,
    moveShapeOrder,
    selectShape,
    clearShapes,
    setDrawTool,
    updateDrawSettings,
    addFreehandShape,
    captureSnapshot,
    applySnapshot,
  }
})
