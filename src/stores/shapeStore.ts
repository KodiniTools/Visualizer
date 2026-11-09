import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  createFreehandShape,
  createShape,
  DRAW_TOOLS,
  nextMarkerNumber,
  scaleShapesToCanvas,
  type Shape as BaseShape,
} from '../lib/shapes/shapes'
import { ensureShapeAudioReactive, supportsShapeAudio } from '../lib/shapes/shapeAudio'

/** Eine Form auf dem Canvas (Felder je nach Typ, siehe lib/shapes/shapes.ts). */
export interface Shape extends BaseShape {
  audioReactive?: object | null
  /** Animation (siehe lib/shapes/shapeAnimation.ts), null/fehlend = keine */
  animation?: object | null
  [key: string]: unknown
}

export type DrawTool = 'pen' | 'highlighter'

export interface DrawStyle {
  color: string
  /** null = automatisch */
  width: number | null
  opacity: number
}

export interface CanvasSize {
  width: number
  height: number
}

export interface ShapeSnapshot {
  shapes: Shape[]
  canvasSize: CanvasSize
}

const isDrawTool = (tool: unknown): tool is DrawTool =>
  (DRAW_TOOLS as readonly unknown[]).includes(tool)

/**
 * Formen & Symbole (Galerie aus dem Bildkonverter): Overlay-Ebene über Bildern
 * und Videos, unter den Texten. Formen liegen in Canvas-Pixeln; ändert sich die
 * Canvas-Größe (Workspace-Format), skaliert syncCanvasSize() sie mit.
 *
 * Gezeichnet wird in der Render-Schleife (renderLoop/sceneRenderer.js), die
 * Auswahl im Editor-Overlay; Zeiger-Interaktion in lib/shapes/shapeInteraction.js.
 * Undo/Redo über das History-Segment `shapes` (shapes + canvasSize).
 *
 * Audio-Reaktiv: `shape.audioReactive` (gleiche Struktur wie bei Bildern,
 * lib/shapes/shapeAudio.js), wird beim ersten Öffnen des Panels angelegt.
 * Beat-Marker: `markerHiddenIds` blendet zugewiesene Formen bis zu ihrem
 * Marker-Zeitpunkt aus. Reiner Laufzeit-Zustand, nicht Teil des Verlaufs.
 * Animationen: `shape.animation` (lib/shapes/shapeAnimation.ts); ihr
 * Startzeitpunkt ist ebenfalls Laufzeit-Zustand (getAnimationElapsed).
 */
export const useShapeStore = defineStore('shapes', () => {
  const shapes = ref<Shape[]>([])
  const selectedShapeId = ref<string | null>(null)
  /** Canvas-Größe, auf die sich die Koordinaten der Formen beziehen */
  const canvasSize = ref<CanvasSize>({ width: 0, height: 0 })

  // Zeichenmodus: null | 'pen' | 'highlighter' und Stil je Werkzeug (width null = automatisch)
  const drawTool = ref<DrawTool | null>(null)
  const drawSettings = ref<Record<DrawTool, DrawStyle>>({
    pen: { color: '#e53935', width: null, opacity: 100 },
    highlighter: { color: '#ffeb3b', width: null, opacity: 60 },
  })

  /** Von Beat-Markern bis zu ihrem Zeitpunkt ausgeblendete Formen (Laufzeit) */
  const markerHiddenIds = ref(new Set<string>())

  /**
   * Startzeitpunkte der Form-Animationen (performance.now()-Millisekunden).
   * Laufzeit-Zustand ohne Reaktivität – wird jedes Frame gelesen.
   */
  const animationStarts = new Map<string, number>()

  const selectedShape = computed(
    () => shapes.value.find((s) => s.id === selectedShapeId.value) || null,
  )

  /**
   * Bezugsgröße setzen; bei einer Änderung werden vorhandene Formen
   * proportional mitskaliert. @returns true, wenn skaliert wurde
   */
  function syncCanvasSize(width: unknown, height: unknown): boolean {
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
   * @returns die neue Form (null bei unbekanntem Galerie-Eintrag)
   */
  function addShape(galleryId: string, canvasWidth: number, canvasHeight: number): Shape | null {
    const shape = createShape(galleryId, canvasWidth, canvasHeight) as Shape | null
    if (!shape) return null
    syncCanvasSize(canvasWidth, canvasHeight)
    // Marker zählen automatisch weiter
    if (shape.type === 'marker') shape.number = nextMarkerNumber(shapes.value)
    shapes.value.push(shape)
    selectShape(shape.id)
    return shapes.value[shapes.value.length - 1] ?? null
  }

  function updateShape(shapeId: string, updates: Partial<Shape>): boolean {
    const shape = shapes.value.find((s) => s.id === shapeId)
    if (!shape) return false
    Object.assign(shape, updates)
    return true
  }

  function deleteShape(shapeId: string): boolean {
    const index = shapes.value.findIndex((s) => s.id === shapeId)
    if (index === -1) return false
    shapes.value.splice(index, 1)
    animationStarts.delete(shapeId)
    if (selectedShapeId.value === shapeId) selectedShapeId.value = null
    return true
  }

  /** Kopie leicht versetzt darüberlegen und auswählen */
  function duplicateShape(shapeId: string): Shape | null {
    const source = shapes.value.find((s) => s.id === shapeId)
    if (!source) return null
    // Typ stammt von einer bestehenden Form → createShape liefert eine Form
    const copy = createShape(source.type, 1, 1) as Shape
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
    return shapes.value[index + 1] ?? null
  }

  /** Reihenfolge ändern: 'up' = eine Ebene nach vorn, 'down' = nach hinten */
  function moveShapeOrder(shapeId: string, direction: 'up' | 'down' | string): boolean {
    const index = shapes.value.findIndex((s) => s.id === shapeId)
    if (index === -1) return false
    const target = direction === 'up' ? index + 1 : index - 1
    if (target < 0 || target >= shapes.value.length) return false
    const [shape] = shapes.value.splice(index, 1) as [Shape]
    shapes.value.splice(target, 0, shape)
    return true
  }

  /** Auswahl setzen (null hebt sie auf); unbekannte ids werden ignoriert */
  function selectShape(shapeId: string | null) {
    if (shapeId !== null && !shapes.value.some((s) => s.id === shapeId)) return
    selectedShapeId.value = shapeId
  }

  function clearShapes() {
    shapes.value = []
    selectedShapeId.value = null
    drawTool.value = null
    clearMarkerHidden()
    animationStarts.clear()
  }

  /** Zeichenwerkzeug ein-/ausschalten; beim Einschalten wird die Auswahl aufgehoben */
  function setDrawTool(tool: unknown) {
    drawTool.value = isDrawTool(tool) ? tool : null
    if (drawTool.value) selectShape(null)
  }

  function updateDrawSettings(tool: unknown, patch: Partial<DrawStyle>) {
    if (!isDrawTool(tool)) return
    drawSettings.value[tool] = { ...drawSettings.value[tool], ...patch }
  }

  /**
   * Fügt einen gezeichneten Strich als Form hinzu (ohne ihn auszuwählen, damit
   * direkt weitergezeichnet werden kann).
   */
  function addFreehandShape(
    canvasPoints: { x: number; y: number }[],
    tool: DrawTool | string | null = drawTool.value,
  ): Shape | null {
    const settings =
      (isDrawTool(tool) ? drawSettings.value[tool] : undefined) ?? drawSettings.value.pen
    const shape = createFreehandShape(canvasPoints, {
      tool: tool ?? undefined,
      ...settings,
      width: settings.width ?? undefined,
    }) as Shape | null
    if (!shape) return null
    shapes.value.push(shape)
    return shapes.value[shapes.value.length - 1] ?? null
  }

  /**
   * Audio-Reaktiv-Konfiguration einer Form anlegen bzw. vervollständigen.
   * @returns die Konfiguration (null bei unbekannter Form oder
   *   Effekt-Bereichen, die kein Audio-Reaktiv unterstützen)
   */
  function ensureAudioReactive(shapeId: string): object | null {
    const shape = shapes.value.find((s) => s.id === shapeId)
    if (!shape || !supportsShapeAudio(shape)) return null
    if (!shape.audioReactive) shape.audioReactive = ensureShapeAudioReactive(null)
    else ensureShapeAudioReactive(shape.audioReactive)
    return shape.audioReactive
  }

  function isMarkerHidden(shapeId: string): boolean {
    return markerHiddenIds.value.has(shapeId)
  }

  /** Beat-Marker: Formen aus-/einblenden (true = ausblenden) */
  function setMarkerHidden(shapeId: string, hidden: boolean) {
    const next = new Set(markerHiddenIds.value)
    if (hidden) next.add(shapeId)
    else if (next.delete(shapeId)) restartAnimation(shapeId) // Einblenden startet die Animation neu
    if (next.size !== markerHiddenIds.value.size) markerHiddenIds.value = next
  }

  function clearMarkerHidden() {
    if (markerHiddenIds.value.size > 0) markerHiddenIds.value = new Set()
  }

  /**
   * Millisekunden seit dem Start der Animation einer Form. Der erste Aufruf
   * (bzw. der erste nach restartAnimation) legt den Start auf `now`.
   */
  function getAnimationElapsed(shapeId: string, now: number = performance.now()): number {
    const start = animationStarts.get(shapeId)
    if (start === undefined || start > now) {
      animationStarts.set(shapeId, now)
      return 0
    }
    return now - start
  }

  /** Animation einer Form beim nächsten Frame von vorn beginnen lassen */
  function restartAnimation(shapeId: string) {
    animationStarts.delete(shapeId)
  }

  /** Alle Form-Animationen neu starten (z. B. Wiedergabe ab Anfang) */
  function restartAnimations() {
    animationStarts.clear()
  }

  /** Snapshot für den Verlauf (JSON-fähig) */
  function captureSnapshot(): ShapeSnapshot {
    return {
      shapes: JSON.parse(JSON.stringify(shapes.value)),
      canvasSize: { ...canvasSize.value },
    }
  }

  /** Snapshot wiederherstellen; eine nicht mehr vorhandene Auswahl wird aufgehoben */
  function applySnapshot(snapshot: Partial<ShapeSnapshot> | null | undefined) {
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
    markerHiddenIds,
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
    ensureAudioReactive,
    isMarkerHidden,
    setMarkerHidden,
    clearMarkerHidden,
    getAnimationElapsed,
    restartAnimation,
    restartAnimations,
    captureSnapshot,
    applySnapshot,
  }
})
