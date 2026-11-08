/**
 * Gemeinsame Typen der Render-Loop-Teile (Einzel- und Multi-Layer-Renderer)
 * @module composables/renderLoop/types
 */

import type { useVisualizerStore } from '../../stores/visualizerStore'
import type { RenderPostProcessor } from './postFx'

/** Visualizer-Store, wie ihn die Renderer lesen */
export type RenderVisualizerStore = ReturnType<typeof useVisualizerStore>

/** Zeichen-Callback für die Szene: setzt den gerenderten Visualizer ein */
export type VisualizerDrawCallback = (
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
) => void

/** Gemeinsame Abhängigkeiten der Visualizer-Renderer */
export interface VisualizerRendererDeps {
  visualizerStore: RenderVisualizerStore
  /** Zeitdaten des Frames (einmal pro Frame gelesen) */
  getTimeDomainData: (analyser: AnalyserNode, len: number) => Uint8Array
  /** Bild für Portrait-Presets (siehe resolveEffectiveImageId) */
  effectiveImageId: (preferredId: string | null | undefined) => string | null
  currentQuality: () => number
  /** Post-FX-Prozessor des Main-Threads (passende Größe) */
  ensureMainPostProcessor: (w: number, h: number) => RenderPostProcessor | null
}
