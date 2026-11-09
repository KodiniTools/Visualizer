import { watch } from 'vue'
import type { Ref } from 'vue'
import type { GridManager } from '../../lib/gridManager'
import type { CanvasManagerRef } from '../types'

/**
 * Watcher, die Store-Einstellungen auf Canvas und Manager übertragen.
 * Werden in VisualizerApp.onMounted registriert.
 */

/**
 * Raster: Sichtbarkeit, Farbe/Deckkraft und Einrasten auf den GridManager
 * übertragen – auch bei neu erzeugtem GridManager (gespeicherte Einstellungen
 * übernehmen). Der Render-Loop liest gridColor, der DragDropHandler fragt
 * gridManager.isSnapActive().
 */
export function watchGridSettings({
  gridManagerInstance,
  gridStore,
}: {
  gridManagerInstance: Ref<GridManager | null | undefined>
  gridStore: { isVisible: boolean; gridColor: string; gridOpacity: number; snapToGrid: boolean }
}): void {
  watch(
    () => [gridManagerInstance.value, gridStore.isVisible] as const,
    ([gm, v]) => {
      if (gm) gm.setVisibility(v)
    },
    { immediate: true },
  )
  watch(
    () => [gridManagerInstance.value, gridStore.gridColor, gridStore.gridOpacity] as const,
    ([gm, color, opacity]) => {
      if (gm) gm.setGridColor(color, opacity)
    },
    { immediate: true },
  )
  watch(
    () => [gridManagerInstance.value, gridStore.snapToGrid] as const,
    ([gm, v]) => {
      if (gm) gm.setSnapToGrid(v)
    },
    { immediate: true },
  )
}

/**
 * Workspace-Preset: CanvasManager umstellen und Canvas + Aufnahme-Canvas auf
 * die Preset-Größe bringen (ohne Preset 1920×1080).
 */
export function watchWorkspacePreset({
  workspaceStore,
  canvasRef,
  canvasManagerInstance,
  presets,
  getRecordingCanvas,
}: {
  workspaceStore: { selectedPresetKey: string | null }
  canvasRef: Ref<HTMLCanvasElement | null | undefined>
  canvasManagerInstance: CanvasManagerRef
  presets: Record<string, { width: number; height: number }>
  getRecordingCanvas: () => HTMLCanvasElement | null | undefined
}): void {
  watch(
    () => workspaceStore.selectedPresetKey,
    (newKey) => {
      const canvas = canvasRef.value
      if (!canvas || !canvasManagerInstance.value) return

      canvasManagerInstance.value.setWorkspacePreset(newKey as string)
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
 */
export function watchRecordingCanvasSize({
  canvasRef,
  getRecordingCanvas,
}: {
  canvasRef: Ref<HTMLCanvasElement | null | undefined>
  getRecordingCanvas: () => HTMLCanvasElement
}): void {
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
