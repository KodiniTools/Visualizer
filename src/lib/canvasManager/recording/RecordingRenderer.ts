// RecordingRenderer.js - Recording-spezifisches Rendering

import { CanvasPool } from './CanvasPool'
import type { Rect } from '../../canvasObjects/geometry'

type Ctx = CanvasRenderingContext2D

/** Benötigter Ausschnitt des CanvasManagers */
export interface RecordingRendererManager {
  canvas: HTMLCanvasElement
  workspacePreset?: { width: number; height: number } | null
  isRecording: boolean
  multiImageManager?: {
    prepareForRecording?(ctx: Ctx | null): void
    cleanupAfterRecording?(): void
  } | null
  sceneRenderer: { drawScene(ctx: Ctx): void }
  getWorkspaceBounds(): Rect | null | undefined
}

/**
 * RecordingRenderer - Verantwortlich für Recording-Rendering
 *
 * Funktionen:
 * - prepareForRecording
 * - drawForRecording
 * - cleanupAfterRecording
 */
export class RecordingRenderer {
  manager: RecordingRendererManager
  canvasPool: CanvasPool

  constructor(canvasManager: RecordingRendererManager) {
    this.manager = canvasManager
    this.canvasPool = new CanvasPool()
  }

  /**
   * Bereitet das Recording vor
   */
  prepareForRecording(targetCanvas: HTMLCanvasElement): boolean {
    if (!this.manager.workspacePreset) return false

    // Set canvas size
    targetCanvas.width = this.manager.workspacePreset.width
    targetCanvas.height = this.manager.workspacePreset.height

    // Prepare multiImageManager if exists
    if (this.manager.multiImageManager && this.manager.multiImageManager.prepareForRecording) {
      const ctx = targetCanvas.getContext('2d')
      this.manager.multiImageManager.prepareForRecording(ctx)
    }

    return true
  }

  /**
   * CRITICAL FIX: Canvas-Pooling für Recording
   *
   * Vorher: Neue Canvas bei JEDEM Frame (450 Frames = 900 Canvas)
   * Nachher: 2 wiederverwendete Canvas für alle Frames
   *
   * Memory: 4.8GB → 50MB (99% Reduktion)
   */
  drawForRecording(ctx: Ctx, visualizerCallback: ((ctx: Ctx) => void) | null = null): void {
    // Recording-Modus aktivieren (keine UI-Elemente wie Auswahlrahmen zeichnen)
    this.manager.isRecording = true

    if (!this.manager.workspacePreset) {
      this.manager.sceneRenderer.drawScene(ctx)
      if (visualizerCallback) visualizerCallback(ctx)
      this.manager.isRecording = false
      return
    }

    const workspaceBounds = this.manager.getWorkspaceBounds()
    if (!workspaceBounds) {
      this.manager.sceneRenderer.drawScene(ctx)
      if (visualizerCallback) visualizerCallback(ctx)
      this.manager.isRecording = false
      return
    }

    // CRITICAL: Initialize canvas pool (reuse canvases)
    this.canvasPool.init(this.manager.canvas.width, this.manager.canvas.height)

    // nach init() vorhanden
    const tempCanvas = this.canvasPool.getTempCanvas() as HTMLCanvasElement
    const tempCtx = this.canvasPool.getTempCtx() as Ctx

    // Clear temp canvas
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)

    // Draw complete scene
    this.manager.sceneRenderer.drawScene(tempCtx)

    // Visualizer (if present)
    if (visualizerCallback) {
      // CRITICAL: Reuse viz canvas from pool
      const vizCanvas = this.canvasPool.getVizCanvas() as HTMLCanvasElement
      const vizCtx = this.canvasPool.getVizCtx() as Ctx

      // Resize viz canvas only if needed
      this.canvasPool.resizeVizCanvas(workspaceBounds.width, workspaceBounds.height)

      // Clear viz canvas
      vizCtx.clearRect(0, 0, vizCanvas.width, vizCanvas.height)

      tempCtx.save()
      tempCtx.beginPath()
      tempCtx.rect(
        workspaceBounds.x,
        workspaceBounds.y,
        workspaceBounds.width,
        workspaceBounds.height,
      )
      tempCtx.clip()
      tempCtx.translate(workspaceBounds.x, workspaceBounds.y)

      visualizerCallback(vizCtx)
      tempCtx.drawImage(vizCanvas, 0, 0)
      tempCtx.restore()
    }

    // CRITICAL: Extract workspace region
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.drawImage(
      tempCanvas,
      workspaceBounds.x,
      workspaceBounds.y,
      workspaceBounds.width,
      workspaceBounds.height,
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
    )

    // NOTE: Canvas werden NICHT gelöscht - sie werden wiederverwendet!
    // Cleanup nur wenn Recording beendet wird (via cleanupAfterRecording())

    // Recording-Modus deaktivieren
    this.manager.isRecording = false
  }

  /**
   * Cleanup nach Recording
   * Gibt Image-Context Referenzen frei
   */
  cleanupAfterRecording(): void {
    console.log('[RecordingRenderer] 🧹 Cleanup after recording...')

    // Cleanup MultiImageManager
    if (this.manager.multiImageManager && this.manager.multiImageManager.cleanupAfterRecording) {
      this.manager.multiImageManager.cleanupAfterRecording()
    }

    // Cleanup Canvas Pool
    this.canvasPool.cleanup()

    console.log('[RecordingRenderer] ✅ Cleanup complete')
  }
}
