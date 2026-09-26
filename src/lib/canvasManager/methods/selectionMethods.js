// canvasManager/methods/selectionMethods.js
/**
 * Auswahl: Listener, Mehrfachauswahl (Texte) sowie Hit-Tests,
 * Objekt-Bounds und Handles (delegiert an SelectionManager).
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class SelectionMethods {
  /**
   * Selection Listener registrieren
   */
  onSelectionChanged(callback) {
    this._selectionListeners.push(callback)
  }

  _notifySelectionListeners(obj) {
    this._selectionListeners.forEach((listener) => listener(obj))
  }

  // ───────── Multi-selection helpers ─────────

  toggleMultiSelect(obj) {
    if (!obj || obj.type !== 'text') return

    // On first shift+click ensure activeObject is part of the set
    if (this.activeObject && !this.selectedObjects.includes(this.activeObject)) {
      this.selectedObjects.unshift(this.activeObject)
    }

    const idx = this.selectedObjects.indexOf(obj)
    if (idx >= 0) {
      this.selectedObjects.splice(idx, 1)
      // If we removed the activeObject, promote the next one
      if (obj === this.activeObject && this.selectedObjects.length > 0) {
        this.activeObject = this.selectedObjects[this.selectedObjects.length - 1]
      } else if (obj === this.activeObject) {
        this.activeObject = null
      }
    } else {
      this.selectedObjects.push(obj)
    }

    // Notify listeners with array so TextManagerPanel can show multi-edit
    this._selectionListeners.forEach((listener) =>
      listener(this.activeObject, this.selectedObjects),
    )
    this.redrawCallback()
  }

  clearMultiSelection() {
    this.selectedObjects = []
  }

  isInMultiSelection(obj) {
    return this.selectedObjects.includes(obj)
  }

  selectAllTexts() {
    if (!this.textManager) return
    const texts = this.textManager.textObjects
    if (!texts || texts.length === 0) return
    this.activeObject = texts[texts.length - 1]
    this.selectedObjects = [...texts]
    this._selectionListeners.forEach((listener) =>
      listener(this.activeObject, this.selectedObjects),
    )
    this.redrawCallback()
  }

  // ═══════════════════════════════════════════════════════════════════
  // SELECTION (delegiert an SelectionManager)
  // ═══════════════════════════════════════════════════════════════════

  setActiveObject(obj) {
    this.selectionManager.setActiveObject(obj)
  }

  getObjectAtPos(x, y) {
    return this.selectionManager.getObjectAtPos(x, y)
  }

  getTextAtPos(x, y) {
    return this.selectionManager.getTextAtPos(x, y)
  }

  getObjectBounds(obj) {
    if (!obj) return null

    if (obj.type === 'text') {
      if (this.textManager && this.textManager.getObjectBounds) {
        return this.textManager.getObjectBounds(obj, this.canvas)
      }
      return null
    }

    if (obj.type === 'image') {
      // Slideshow-Bilder: sichtbarer Bereich inkl. Übergang (siehe getDisplayBounds)
      if (obj.isSlideshowImage && window.slideshowManager) {
        const sm = window.slideshowManager
        const transform = sm.getDisplayBounds
          ? sm.getDisplayBounds(obj)
          : sm.getSelectionBounds(obj)
        return {
          x: transform.relX * this.canvas.width,
          y: transform.relY * this.canvas.height,
          width: transform.relWidth * this.canvas.width,
          height: transform.relHeight * this.canvas.height,
        }
      }
      return {
        x: obj.relX * this.canvas.width,
        y: obj.relY * this.canvas.height,
        width: obj.relWidth * this.canvas.width,
        height: obj.relHeight * this.canvas.height,
      }
    }

    if (obj.type === 'video') {
      return {
        x: obj.relX * this.canvas.width,
        y: obj.relY * this.canvas.height,
        width: obj.relWidth * this.canvas.width,
        height: obj.relHeight * this.canvas.height,
      }
    }

    return null
  }

  isPointInRect(x, y, rect) {
    return this.selectionManager.isPointInRect(x, y, rect)
  }

  getResizeHandles(bounds) {
    return this.selectionManager.getResizeHandles(bounds)
  }

  getHandleAtPos(bounds, x, y) {
    return this.selectionManager.getHandleAtPos(bounds, x, y)
  }

  getDeleteButtonBounds(objectBounds) {
    return this.selectionManager.getDeleteButtonBounds(objectBounds)
  }
}
