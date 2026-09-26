// canvasManager/methods/selectionModeMethods.js
/**
 * Rechteck-Auswahlmodi für Text und Bild sowie die Text-Positionsvorschau.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class SelectionModeMethods {
  // ═══════════════════════════════════════════════════════════════════
  // TEXT SELECTION MODE
  // ═══════════════════════════════════════════════════════════════════

  startTextSelectionMode(callback) {
    this.textSelectionMode = true
    this.textSelectionRect = null
    this.onTextSelectionComplete = callback
    this.canvas.style.cursor = 'crosshair'

    this.setActiveObject(null)
    this.redrawCallback()

    console.log('[CanvasManager] ✨ Text-Auswahl-Modus aktiviert')
  }

  cancelTextSelectionMode() {
    this.textSelectionMode = false
    this.textSelectionRect = null
    this.onTextSelectionComplete = null
    this.canvas.style.cursor = 'default'
    this.redrawCallback()

    console.log('[CanvasManager] ✨ Text-Auswahl-Modus beendet')
  }

  drawTextSelectionRect(ctx) {
    this.uiRenderer.drawTextSelectionRect(ctx)
  }

  getTextSelectionBounds() {
    return this.selectionManager.getTextSelectionBounds()
  }

  setTextPositionPreview(relX, relY) {
    if (relX === null || relY === null) {
      this.textPositionPreview = null
    } else {
      this.textPositionPreview = { relX, relY }
    }
  }

  clearTextPositionPreview() {
    this.textPositionPreview = null
  }

  drawTextPositionPreview(ctx) {
    this.uiRenderer.drawTextPositionPreview(ctx)
  }

  // ═══════════════════════════════════════════════════════════════════
  // IMAGE SELECTION MODE
  // ═══════════════════════════════════════════════════════════════════

  startImageSelectionMode(callback, animation = 'none') {
    this.imageSelectionMode = true
    this.imageSelectionRect = null
    this.onImageSelectionComplete = callback
    this.pendingImageAnimation = animation
    this.canvas.style.cursor = 'crosshair'

    this.setActiveObject(null)
    this.redrawCallback()

    console.log('[CanvasManager] ✨ Bild-Bereichsauswahl-Modus aktiviert mit Animation:', animation)
  }

  cancelImageSelectionMode() {
    this.imageSelectionMode = false
    this.imageSelectionRect = null
    this.onImageSelectionComplete = null
    this.pendingImageAnimation = null
    this.canvas.style.cursor = 'default'
    this.redrawCallback()

    console.log('[CanvasManager] ✨ Bild-Bereichsauswahl-Modus beendet')
  }

  drawImageSelectionRect(ctx) {
    this.uiRenderer.drawImageSelectionRect(ctx)
  }

  getImageSelectionBounds() {
    return this.selectionManager.getImageSelectionBounds()
  }

  setImageAnimation(animation) {
    this.pendingImageAnimation = animation
    console.log('[CanvasManager] Animation gesetzt:', animation)
  }

  getImageAnimation() {
    return this.pendingImageAnimation || 'none'
  }
}
