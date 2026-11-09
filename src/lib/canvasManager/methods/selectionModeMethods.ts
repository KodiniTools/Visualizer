// canvasManager/methods/selectionModeMethods.js
import type { CanvasManager } from '../../canvasManager'

type Ctx = CanvasRenderingContext2D
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

  startTextSelectionMode(
    this: CanvasManager,
    callback: CanvasManager['onTextSelectionComplete'],
  ): void {
    this.textSelectionMode = true
    this.textSelectionRect = null
    this.onTextSelectionComplete = callback
    this.canvas.style.cursor = 'crosshair'

    this.setActiveObject(null)
    this.redrawCallback()

    console.log('[CanvasManager] ✨ Text-Auswahl-Modus aktiviert')
  }

  cancelTextSelectionMode(this: CanvasManager): void {
    this.textSelectionMode = false
    this.textSelectionRect = null
    this.onTextSelectionComplete = null
    this.canvas.style.cursor = 'default'
    this.redrawCallback()

    console.log('[CanvasManager] ✨ Text-Auswahl-Modus beendet')
  }

  drawTextSelectionRect(this: CanvasManager, ctx: Ctx): void {
    this.uiRenderer.drawTextSelectionRect(ctx)
  }

  getTextSelectionBounds(this: CanvasManager) {
    return this.selectionManager.getTextSelectionBounds()
  }

  setTextPositionPreview(this: CanvasManager, relX: number | null, relY: number | null): void {
    if (relX === null || relY === null) {
      this.textPositionPreview = null
    } else {
      this.textPositionPreview = { relX, relY }
    }
  }

  clearTextPositionPreview(this: CanvasManager): void {
    this.textPositionPreview = null
  }

  drawTextPositionPreview(this: CanvasManager, ctx: Ctx): void {
    this.uiRenderer.drawTextPositionPreview(ctx)
  }

  // ═══════════════════════════════════════════════════════════════════
  // IMAGE SELECTION MODE
  // ═══════════════════════════════════════════════════════════════════

  startImageSelectionMode(
    this: CanvasManager,
    callback: CanvasManager['onImageSelectionComplete'],
    animation = 'none',
  ): void {
    this.imageSelectionMode = true
    this.imageSelectionRect = null
    this.onImageSelectionComplete = callback
    this.pendingImageAnimation = animation
    this.canvas.style.cursor = 'crosshair'

    this.setActiveObject(null)
    this.redrawCallback()

    console.log('[CanvasManager] ✨ Bild-Bereichsauswahl-Modus aktiviert mit Animation:', animation)
  }

  cancelImageSelectionMode(this: CanvasManager): void {
    this.imageSelectionMode = false
    this.imageSelectionRect = null
    this.onImageSelectionComplete = null
    this.pendingImageAnimation = null
    this.canvas.style.cursor = 'default'
    this.redrawCallback()

    console.log('[CanvasManager] ✨ Bild-Bereichsauswahl-Modus beendet')
  }

  drawImageSelectionRect(this: CanvasManager, ctx: Ctx): void {
    this.uiRenderer.drawImageSelectionRect(ctx)
  }

  getImageSelectionBounds(this: CanvasManager) {
    return this.selectionManager.getImageSelectionBounds()
  }

  setImageAnimation(this: CanvasManager, animation: string | null): void {
    this.pendingImageAnimation = animation
    console.log('[CanvasManager] Animation gesetzt:', animation)
  }

  getImageAnimation(this: CanvasManager): string {
    return this.pendingImageAnimation || 'none'
  }
}
