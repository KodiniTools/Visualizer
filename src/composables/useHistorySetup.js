import { onMounted, onUnmounted, watch } from 'vue'
import { getHistoryRecorder } from '../lib/history/historyRecorder.js'
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
} from '../lib/history/segments/storeSegments.js'
import {
  createImagesSegment,
  createTextsSegment,
  createVideosSegment,
} from '../lib/history/segments/canvasSegments.js'

/**
 * ↩️ Richtet den globalen Undo/Redo-Verlauf über alle Panels ein.
 *
 * Registriert die History-Segmente der Stores sofort und die der
 * Canvas-Objekte (Texte, Bilder, Videos), sobald der Canvas initialisiert ist.
 * Das Hintergrund-Segment registriert useBgSettings selbst, da dort der
 * UI-Zustand (Farbe, Gradient, Audio-Reaktiv) lebt.
 *
 * @param {Object} deps
 * @param {Object} deps.historyStore
 * @param {import('vue').Ref} deps.canvasManagerInstance
 * @param {Object} deps.stores - { workspaceStore, backgroundTilesStore, gridStore,
 *   visualizerStore, audioFxStore, beatDropStore, tickerStore, beatMarkerStore,
 *   markerTransitionStore }
 * @returns {{ recorder: ReturnType<typeof getHistoryRecorder> }}
 */
export function useHistorySetup({ historyStore, canvasManagerInstance, stores }) {
  const recorder = getHistoryRecorder(historyStore)
  const unregister = []

  const storeSegments = {
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
  for (const [id, adapter] of Object.entries(storeSegments)) {
    unregister.push(recorder.registerSegment(id, adapter))
  }

  let canvasRegistered = false
  function registerCanvasSegments() {
    if (canvasRegistered) return
    canvasRegistered = true
    const getCanvasManager = () => canvasManagerInstance.value
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
