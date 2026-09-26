// canvasManager/methods/renderingDelegates.js
/**
 * Zeichnen, Kacheln und Recording – delegiert an SceneRenderer,
 * UIRenderer, BackgroundRenderer und RecordingRenderer.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class RenderingDelegates {
  // ═══════════════════════════════════════════════════════════════════
  // DRAWING (delegiert an SceneRenderer)
  // ═══════════════════════════════════════════════════════════════════

  draw(targetCtx) {
    this.sceneRenderer.draw(targetCtx)
  }

  drawScene(ctx) {
    this.sceneRenderer.drawScene(ctx)
  }

  drawWorkspaceOutline(ctx) {
    this.sceneRenderer.drawWorkspaceOutline(ctx)
  }

  drawFadedTextMarkers(ctx) {
    this.sceneRenderer.drawFadedTextMarkers(ctx)
  }

  drawInteractiveElements(ctx) {
    this.uiRenderer.drawInteractiveElements(ctx)
  }

  drawResizeHandles(ctx, bounds) {
    this.uiRenderer.drawResizeHandles(ctx, bounds)
  }

  drawDeleteButton(ctx, bounds) {
    this.uiRenderer.drawDeleteButton(ctx, bounds)
  }

  // ═══════════════════════════════════════════════════════════════════
  // BACKGROUND TILES (delegiert an BackgroundRenderer)
  // ═══════════════════════════════════════════════════════════════════

  drawBackgroundTiles(ctx) {
    return this.backgroundRenderer.drawBackgroundTiles(ctx)
  }

  getTileAtPosition(x, y) {
    return this.backgroundRenderer.getTileAtPosition(x, y)
  }

  // ═══════════════════════════════════════════════════════════════════
  // RECORDING (delegiert an RecordingRenderer)
  // ═══════════════════════════════════════════════════════════════════

  prepareForRecording(targetCanvas) {
    return this.recordingRenderer.prepareForRecording(targetCanvas)
  }

  drawForRecording(ctx, visualizerCallback = null) {
    this.recordingRenderer.drawForRecording(ctx, visualizerCallback)
  }

  cleanupAfterRecording() {
    this.recordingRenderer.cleanupAfterRecording()
  }

  // Legacy compatibility - diese werden intern von den Modulen verwendet
  _initCanvasPool(width, height) {
    this.recordingRenderer.canvasPool.init(width, height)
  }

  _cleanupCanvasPool() {
    this.recordingRenderer.canvasPool.cleanup()
  }

  get _canvasPool() {
    return this.recordingRenderer.canvasPool._pool
  }

  get HANDLE_SIZE() {
    return this.selectionManager.HANDLE_SIZE
  }
}
