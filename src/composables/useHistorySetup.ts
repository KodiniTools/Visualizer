import { onMounted, onUnmounted, watch } from 'vue'
import { getHistoryRecorder, type SegmentAdapter } from '../lib/history/historyRecorder'
import {
  createAudioFxSegment,
  createBackgroundTilesSegment,
  createBeatDropSegment,
  createBeatMarkerSegment,
  createGridSegment,
  createMarkerTransitionSegment,
  createTickerSegment,
  createVisualizerSegment,
  createWorkspaceSegment,
} from '../lib/history/segments/storeSegments'
import {
  createImagesSegment,
  createTextsSegment,
  createVideosSegment,
} from '../lib/history/segments/canvasSegments'
import { createShapesSegment } from '../lib/history/segments/shapesSegment'
import type { GetHistoryCanvasManager } from '../lib/history/segments/canvasSegments'
import type { CanvasManagerRef, HistoryRecorder } from './types'

/** Stores mit History-Segmenten */
export interface HistorySetupStores {
  workspaceStore: Parameters<typeof createWorkspaceSegment>[0]
  backgroundTilesStore: Parameters<typeof createBackgroundTilesSegment>[0]
  gridStore: Parameters<typeof createGridSegment>[0]
  visualizerStore: Parameters<typeof createVisualizerSegment>[0]
  audioFxStore: Parameters<typeof createAudioFxSegment>[0]
  beatDropStore: Parameters<typeof createBeatDropSegment>[0]
  tickerStore: Parameters<typeof createTickerSegment>[0]
  beatMarkerStore: Parameters<typeof createBeatMarkerSegment>[0]
  markerTransitionStore: Parameters<typeof createMarkerTransitionSegment>[0]
  /** optional, damit bestehende Aufrufer ohne shapeStore laufen */
  shapeStore?: Parameters<typeof createShapesSegment>[0] | null
}

/** Abhängigkeiten von useHistorySetup */
export interface HistorySetupDeps {
  historyStore: Parameters<typeof getHistoryRecorder>[0]
  canvasManagerInstance: CanvasManagerRef
  stores: HistorySetupStores
}

/**
 * ↩️ Richtet den globalen Undo/Redo-Verlauf über alle Panels ein.
 *
 * Registriert die History-Segmente der Stores sofort und die der
 * Canvas-Objekte (Texte, Bilder, Videos), sobald der Canvas initialisiert ist.
 * Das Hintergrund-Segment registriert useBgSettings selbst, da dort der
 * UI-Zustand (Farbe, Gradient, Audio-Reaktiv) lebt.
 */
export function useHistorySetup({
  historyStore,
  canvasManagerInstance,
  stores,
}: HistorySetupDeps): { recorder: HistoryRecorder } {
  const recorder = getHistoryRecorder(historyStore)
  const unregister: (() => void)[] = []

  const storeSegments: Record<string, SegmentAdapter> = {
    workspace: createWorkspaceSegment(stores.workspaceStore),
    backgroundTiles: createBackgroundTilesSegment(stores.backgroundTilesStore),
    grid: createGridSegment(stores.gridStore),
    visualizer: createVisualizerSegment(stores.visualizerStore),
    audioFx: createAudioFxSegment(stores.audioFxStore),
    beatDrop: createBeatDropSegment(stores.beatDropStore),
    ticker: createTickerSegment(stores.tickerStore),
    beatMarkers: createBeatMarkerSegment(stores.beatMarkerStore),
    markerTransition: createMarkerTransitionSegment(stores.markerTransitionStore),
  }
  // Formen & Symbole (optional, damit bestehende Aufrufer ohne shapeStore laufen)
  if (stores.shapeStore) storeSegments.shapes = createShapesSegment(stores.shapeStore)
  for (const [id, adapter] of Object.entries(storeSegments)) {
    unregister.push(recorder.registerSegment(id, adapter))
  }

  let canvasRegistered = false
  function registerCanvasSegments() {
    if (canvasRegistered) return
    canvasRegistered = true
    // HistoryCanvasManager ist die schmale Duck-Typing-Sicht der Segmente
    const getCanvasManager = (() => canvasManagerInstance.value) as GetHistoryCanvasManager
    unregister.push(recorder.registerSegment('images', createImagesSegment(getCanvasManager)))
    unregister.push(recorder.registerSegment('videos', createVideosSegment(getCanvasManager)))
    unregister.push(recorder.registerSegment('texts', createTextsSegment(getCanvasManager)))
  }

  // Canvas-Segmente, sobald der CanvasManager existiert (initializeCanvas)
  watch(
    canvasManagerInstance,
    (cm) => {
      if (cm) registerCanvasSegments()
    },
    { immediate: true },
  )

  onMounted(() => recorder.attach())

  onUnmounted(() => {
    recorder.detach()
    unregister.forEach((fn) => fn())
    unregister.length = 0
    canvasRegistered = false
  })

  return { recorder }
}
