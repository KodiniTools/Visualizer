// canvasManager/methods/interactionDelegates.js
/**
 * Drag & Drop und Maus-Events – delegiert an DragDropHandler und
 * MouseHandler.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class InteractionDelegates {
  // ═══════════════════════════════════════════════════════════════════
  // DRAG & DROP (delegiert an DragDropHandler)
  // ═══════════════════════════════════════════════════════════════════

  moveObject(obj, dx, dy) {
    this.dragDropHandler.moveObject(obj, dx, dy)
  }

  resizeText(obj, dx, dy) {
    this.dragDropHandler.resizeText(obj, dx, dy)
  }

  resizeImage(obj, dx, dy) {
    this.dragDropHandler.resizeImage(obj, dx, dy)
  }

  // ═══════════════════════════════════════════════════════════════════
  // MOUSE (delegiert an MouseHandler)
  // ═══════════════════════════════════════════════════════════════════

  getMousePos(e) {
    return this.mouseHandler.getMousePos(e)
  }

  onMouseDown(e) {
    this.mouseHandler.onMouseDown(e)
  }

  onMouseMove(e) {
    this.mouseHandler.onMouseMove(e)
  }

  onMouseUp(e) {
    this.mouseHandler.onMouseUp(e)
  }

  onDoubleClick(e) {
    this.mouseHandler.onDoubleClick(e)
  }

  onMouseLeave(e) {
    this.mouseHandler.onMouseLeave(e)
  }

  onWindowMouseUp(e) {
    this.mouseHandler.onWindowMouseUp(e)
  }

  onWindowMouseMove(e) {
    this.mouseHandler.onWindowMouseMove(e)
  }

  _startDragListeners() {
    this.mouseHandler._startDragListeners()
  }

  _stopDragListeners() {
    this.mouseHandler._stopDragListeners()
  }

  _endDrag() {
    this.mouseHandler._endDrag()
  }

  _updateResizeCursor(handleKey) {
    this.mouseHandler._updateResizeCursor(handleKey)
  }
}
