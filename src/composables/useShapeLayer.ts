import { onUnmounted, watch, type Ref } from 'vue'
import type { useShapeStore } from '../stores/shapeStore'
import type { useHistoryStore } from '../stores/historyStore'
import type { CanvasManagerRef } from './types'
import { drawShapeWithAudio, getShapeAudioFx } from '../lib/shapes/shapeAudio'
import { drawShapeAnimated, getShapeAnimationFx } from '../lib/shapes/shapeAnimation'
import {
  createShapeInteraction,
  drawShapeSelection,
  getCanvasDisplayScale,
} from '../lib/shapes/shapeInteraction'
import type { ShapeInteractionCanvasManager } from '../lib/shapes/shapeInteraction'
import type { Shape } from '../lib/shapes/shapes'
import { getHistoryRecorder } from '../lib/history/historyRecorder'
import { getAudioAnalysisData } from '../lib/audio/audioAnalysisData'

/** Akzentfarbe des aktuellen Themes für den Auswahlrahmen */
function accentColor() {
  if (typeof document === 'undefined') return '#c9a227'
  const value = getComputedStyle(document.documentElement).getPropertyValue('--ds-accent').trim()
  return value || '#c9a227'
}

/** Abhängigkeiten von useShapeLayer */
export interface ShapeLayerDeps {
  canvasRef: Ref<HTMLCanvasElement | null | undefined>
  canvasManagerInstance: CanvasManagerRef
  shapeStore: ReturnType<typeof useShapeStore>
  historyStore: ReturnType<typeof useHistoryStore>
}

/**
 * Formen-Ebene (Formen & Symbole) im Visualizer: Zeichnen in der Szene,
 * Auswahl im Editor-Overlay, Zeiger-/Tastatur-Interaktion und
 * Auswahl-Exklusivität mit den Canvas-Objekten (Text/Bild/Video).
 */
export function useShapeLayer({
  canvasRef,
  canvasManagerInstance,
  shapeStore,
  historyStore,
}: ShapeLayerDeps) {
  let interaction: ReturnType<typeof createShapeInteraction> | null = null

  function commit() {
    try {
      getHistoryRecorder(historyStore).checkpoint()
    } catch (error) {
      console.error('❌ [Shapes] Verlaufsschritt fehlgeschlagen:', error)
    }
  }

  /** Alle Formen in die Szene zeichnen (Live, Aufnahme, Screenshot), inkl. Audio-Reaktiv und Animation. */
  function drawShapes(ctx: CanvasRenderingContext2D | null | undefined) {
    const canvas = ctx?.canvas
    if (!canvas || shapeStore.shapes.length === 0) return
    // Live-Canvas bestimmt die Bezugsgröße (Workspace-Wechsel skaliert mit)
    const live = canvasRef.value
    if (live?.width && live?.height) shapeStore.syncCanvasSize(live.width, live.height)
    const audioData = getAudioAnalysisData()
    const now = performance.now()
    for (const shape of shapeStore.shapes) {
      // Beat-Marker: zugewiesene Formen erscheinen erst zum Marker-Zeitpunkt
      if (shapeStore.isMarkerHidden(shape.id)) continue
      // Animation (Pulsieren, Ein-/Ausblenden …) innerhalb von Audio-Reaktiv
      const anim = shape.animation
        ? getShapeAnimationFx(shape.animation, shapeStore.getAnimationElapsed(shape.id, now), shape)
        : null
      const draw = anim
        ? (c: CanvasRenderingContext2D, s: Shape) => drawShapeAnimated(c, s, anim)
        : undefined
      drawShapeWithAudio(ctx, shape, getShapeAudioFx(shape.audioReactive, audioData), draw)
    }
  }

  /** Auswahlrahmen der ausgewählten Form (nur Editor-Overlay). */
  function drawSelection(ctx: CanvasRenderingContext2D) {
    const shape = shapeStore.selectedShape
    if (!shape || shapeStore.isMarkerHidden(shape.id)) return
    drawShapeSelection(ctx, shape, getCanvasDisplayScale(ctx.canvas), accentColor())
  }

  function attach(canvas: HTMLCanvasElement) {
    interaction?.destroy()
    interaction = createShapeInteraction({
      canvas,
      store: shapeStore,
      getCanvasManager: () =>
        canvasManagerInstance.value as ShapeInteractionCanvasManager | null | undefined,
      commit,
    })
  }

  watch(
    () => [canvasRef.value, canvasManagerInstance.value] as const,
    ([canvas, cm], old) => {
      if (!canvas || !cm) return
      const [oldCanvas, oldCm] = old || []
      if (canvas !== oldCanvas || !interaction) attach(canvas)
      if (cm !== oldCm && typeof cm.onSelectionChanged === 'function') {
        // Text/Bild/Video ausgewählt → Formen-Auswahl aufheben (immer nur eins aktiv)
        cm.onSelectionChanged((obj) => {
          if (obj && shapeStore.selectedShapeId !== null) shapeStore.selectShape(null)
        })
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    interaction?.destroy()
    interaction = null
  })

  return { drawShapes, drawSelection, commit }
}
