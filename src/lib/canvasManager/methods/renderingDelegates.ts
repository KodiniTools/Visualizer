// canvasManager/methods/renderingDelegates.js
import type { CanvasManager } from '../../canvasManager'
import type { RecordingRenderer } from '../recording/RecordingRenderer'
import type { SelectionManager } from '../interaction/SelectionManager'
import type { Rect } from '../../canvasObjects/geometry'

type Ctx = CanvasRenderingContext2D
type RecordingDrawCallback = Parameters<RecordingRenderer['drawForRecording']>[1]
/**
 * Zeichnen, Kacheln und Recording – delegiert an SceneRenderer,
 * UIRenderer, BackgroundRenderer und RecordingRenderer.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class RenderingDelegates {
  // Nur für die Getter unten typisiert (Felder des CanvasManagers, kein Laufzeit-Code)
  declare recordingRenderer: RecordingRenderer
  declare selectionManager: SelectionManager

  // ═══════════════════════════════════════════════════════════════════
  // DRAWING (delegiert an SceneRenderer)
  // ═══════════════════════════════════════════════════════════════════

  draw(this: CanvasManager, targetCtx: Ctx): void {
    this.sceneRenderer.draw(targetCtx)
  }

  drawScene(this: CanvasManager, ctx: Ctx): void {
    this.sceneRenderer.drawScene(ctx)
  }

  drawWorkspaceOutline(this: CanvasManager, ctx: Ctx): void {
    this.sceneRenderer.drawWorkspaceOutline(ctx)
  }

  drawFadedTextMarkers(this: CanvasManager, ctx: Ctx): void {
    this.sceneRenderer.drawFadedTextMarkers(ctx)
  }

  drawInteractiveElements(this: CanvasManager, ctx: Ctx): void {
    this.uiRenderer.drawInteractiveElements(ctx)
  }

  drawResizeHandles(this: CanvasManager, ctx: Ctx, bounds: Rect): void {
    this.uiRenderer.drawResizeHandles(ctx, bounds)
  }

  drawDeleteButton(this: CanvasManager, ctx: Ctx, bounds: Rect): void {
    this.uiRenderer.drawDeleteButton(ctx, bounds)
  }

  // ═══════════════════════════════════════════════════════════════════
  // BACKGROUND TILES (delegiert an BackgroundRenderer)
  // ═══════════════════════════════════════════════════════════════════

  drawBackgroundTiles(this: CanvasManager, ctx: Ctx) {
    return this.backgroundRenderer.drawBackgroundTiles(ctx)
  }

  getTileAtPosition(this: CanvasManager, x: number, y: number): number {
    return this.backgroundRenderer.getTileAtPosition(x, y)
  }

  // ═══════════════════════════════════════════════════════════════════
  // RECORDING (delegiert an RecordingRenderer)
  // ═══════════════════════════════════════════════════════════════════

  prepareForRecording(this: CanvasManager, targetCanvas: HTMLCanvasElement): boolean {
    return this.recordingRenderer.prepareForRecording(targetCanvas)
  }

  drawForRecording(
    this: CanvasManager,
    ctx: Ctx,
    visualizerCallback: RecordingDrawCallback = null,
  ): void {
    this.recordingRenderer.drawForRecording(ctx, visualizerCallback)
  }

  cleanupAfterRecording(this: CanvasManager): void {
    this.recordingRenderer.cleanupAfterRecording()
  }

  // Legacy compatibility - diese werden intern von den Modulen verwendet
  _initCanvasPool(this: CanvasManager, width: number, height: number): void {
    this.recordingRenderer.canvasPool.init(width, height)
  }

  _cleanupCanvasPool(this: CanvasManager): void {
    this.recordingRenderer.canvasPool.cleanup()
  }

  get _canvasPool() {
    return this.recordingRenderer.canvasPool._pool
  }

  get HANDLE_SIZE() {
    return this.selectionManager.HANDLE_SIZE
  }
}
