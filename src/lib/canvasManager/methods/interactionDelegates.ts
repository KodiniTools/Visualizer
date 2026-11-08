// canvasManager/methods/interactionDelegates.js
import type { CanvasManager } from '../../canvasManager'
import type { DragDropHandler } from '../interaction/DragDropHandler'
import type { MouseHandler } from '../interaction/MouseHandler'
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

  moveObject(
    this: CanvasManager,
    obj: Parameters<DragDropHandler['moveObject']>[0],
    dx: number,
    dy: number,
  ): void {
    this.dragDropHandler.moveObject(obj, dx, dy)
  }

  resizeText(
    this: CanvasManager,
    obj: Parameters<DragDropHandler['resizeText']>[0],
    dx: number,
    dy: number,
  ): void {
    this.dragDropHandler.resizeText(obj, dx, dy)
  }

  resizeImage(
    this: CanvasManager,
    obj: Parameters<DragDropHandler['resizeImage']>[0],
    dx: number,
    dy: number,
  ): void {
    this.dragDropHandler.resizeImage(obj, dx, dy)
  }

  // ═══════════════════════════════════════════════════════════════════
  // MOUSE (delegiert an MouseHandler)
  // ═══════════════════════════════════════════════════════════════════

  getMousePos(this: CanvasManager, e: Parameters<MouseHandler['getMousePos']>[0]) {
    return this.mouseHandler.getMousePos(e)
  }

  onMouseDown(this: CanvasManager, e: MouseEvent): void {
    this.mouseHandler.onMouseDown(e)
  }

  onMouseMove(this: CanvasManager, e: MouseEvent): void {
    this.mouseHandler.onMouseMove(e)
  }

  onMouseUp(this: CanvasManager, e?: MouseEvent): void {
    this.mouseHandler.onMouseUp(e)
  }

  onDoubleClick(this: CanvasManager, e: MouseEvent): void {
    this.mouseHandler.onDoubleClick(e)
  }

  onMouseLeave(this: CanvasManager, e?: MouseEvent): void {
    this.mouseHandler.onMouseLeave(e)
  }

  onWindowMouseUp(this: CanvasManager, e?: MouseEvent): void {
    this.mouseHandler.onWindowMouseUp(e)
  }

  onWindowMouseMove(this: CanvasManager, e: MouseEvent): void {
    this.mouseHandler.onWindowMouseMove(e)
  }

  _startDragListeners(this: CanvasManager): void {
    this.mouseHandler._startDragListeners()
  }

  _stopDragListeners(this: CanvasManager): void {
    this.mouseHandler._stopDragListeners()
  }

  _endDrag(this: CanvasManager): void {
    this.mouseHandler._endDrag()
  }

  _updateResizeCursor(this: CanvasManager, handleKey: string): void {
    this.mouseHandler._updateResizeCursor(handleKey)
  }
}
