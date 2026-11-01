import { watch } from 'vue'

/**
 * Watcher, die Store-Einstellungen auf Canvas und Manager übertragen.
 * Werden in VisualizerApp.onMounted registriert.
 */

/**
 * Raster: Sichtbarkeit, Farbe/Deckkraft und Einrasten auf den GridManager
 * übertragen – auch bei neu erzeugtem GridManager (gespeicherte Einstellungen
 * übernehmen). Der Render-Loop liest gridColor, der DragDropHandler fragt
 * gridManager.isSnapActive().
 *
 * @param {{ gridManagerInstance: import('vue').Ref<object|null>, gridStore: object }} deps
 */
export function watchGridSettings({ gridManagerInstance, gridStore }) {
  watch(
    () => [gridManagerInstance.value, gridStore.isVisible],
    ([gm, v]) => {
      if (gm) gm.setVisibility(v)
    },
    { immediate: true },
  )
  watch(
    () => [gridManagerInstance.value, gridStore.gridColor, gridStore.gridOpacity],
    ([gm, color, opacity]) => {
      if (gm) gm.setGridColor(color, opacity)
    },
    { immediate: true },
  )
  watch(
    () => [gridManagerInstance.value, gridStore.snapToGrid],
    ([gm, v]) => {
      if (gm) gm.setSnapToGrid(v)
    },
    { immediate: true },
  )
}

/**
 * Workspace-Preset: CanvasManager umstellen und Canvas + Aufnahme-Canvas auf
 * die Preset-Größe bringen (ohne Preset 1920×1080).
 *
 * @param {object} deps
 * @param {object} deps.workspaceStore
 * @param {import('vue').Ref<HTMLCanvasElement|null>} deps.canvasRef
 * @param {import('vue').Ref<object|null>} deps.canvasManagerInstance
 * @param {Record<string, { width: number, height: number }>} deps.presets
 * @param {() => HTMLCanvasElement|null} deps.getRecordingCanvas
 */
export function watchWorkspacePreset({
  workspaceStore,
  canvasRef,
  canvasManagerInstance,
  presets,
  getRecordingCanvas,
}) {
  watch(
    () => workspaceStore.selectedPresetKey,
    (newKey) => {
      const canvas = canvasRef.value
      if (!canvas || !canvasManagerInstance.value) return

      canvasManagerInstance.value.setWorkspacePreset(newKey)
      const preset = newKey ? presets[newKey] : null

      canvas.width = preset?.width ?? 1920
      canvas.height = preset?.height ?? 1080
      const rec = getRecordingCanvas()
      if (rec) {
        rec.width = canvas.width
        rec.height = canvas.height
      }
    },
    { immediate: true },
  )
}

/**
 * Aufnahme-Canvas an die Größe des Anzeige-Canvas angleichen.
 *
 * @param {{ canvasRef: import('vue').Ref<HTMLCanvasElement|null>, getRecordingCanvas: () => HTMLCanvasElement }} deps
 */
export function watchRecordingCanvasSize({ canvasRef, getRecordingCanvas }) {
  watch(
    () => [canvasRef.value?.width, canvasRef.value?.height],
    ([width, height]) => {
      if (width && height) {
        const rec = getRecordingCanvas()
        rec.width = width
        rec.height = height
      }
    },
  )
}
