// DragDropHandler.js - Drag & Drop und Resize-Operationen

/**
 * DragDropHandler - Verantwortlich für Drag & Drop und Resize-Operationen
 *
 * Funktionen:
 * - Objekte verschieben
 * - Text skalieren
 * - Bilder/Videos skalieren
 */
export class DragDropHandler {
  constructor(canvasManager) {
    this.manager = canvasManager
    // Ungerastete Position pro Objekt während des Ziehens (Einrasten am Raster)
    this._snapState = new WeakMap()
  }

  /**
   * Verschiebt ein Objekt um dx/dy Pixel
   * @param {{ shiftKey?: boolean }} [options] - Shift kehrt bei Slideshow-Bildern
   *   den Modus um (einzelnes Bild ↔ ganze Slideshow)
   */
  moveObject(obj, dx, dy, options = {}) {
    if (obj.type === 'background' || obj.type === 'workspace-background') {
      return
    }

    const relDx = dx / this.manager.canvas.width
    const relDy = dy / this.manager.canvas.height

    // Slideshow-Bilder: jedes Bild hat eigene Position (im Workspace-Modus fest)
    const slideshow = obj.isSlideshowImage ? window.slideshowManager : null
    if (slideshow?.isFittedToWorkspace()) return
    if (slideshow && Boolean(options.shiftKey) !== Boolean(slideshow.moveWholeSlideshow)) {
      slideshow.moveSlideshow(relDx, relDy)
      return
    }

    const startX = obj.relX
    const startY = obj.relY
    const grid = this.manager.gridManager?.isSnapActive?.() ? this.manager.gridManager : null

    if (grid) {
      // Ungerastete Position mitführen: Mausdeltas kommen schrittweise – würde
      // die eingerastete Position weitergeschoben, bliebe das Objekt an der
      // Linie hängen. Wurde das Objekt anderweitig bewegt, neu beginnen.
      let state = this._snapState.get(obj)
      if (!state || state.x !== obj.relX || state.y !== obj.relY) {
        state = { rawX: obj.relX, rawY: obj.relY }
      }
      state.rawX += relDx
      state.rawY += relDy
      if (obj.type !== 'text') {
        state.rawX = Math.max(0, Math.min(state.rawX, 1 - obj.relWidth))
        state.rawY = Math.max(0, Math.min(state.rawY, 1 - obj.relHeight))
      }
      obj.relX = state.rawX
      obj.relY = state.rawY
      this._snapToGrid(obj, grid)
      state.x = obj.relX
      state.y = obj.relY
      this._snapState.set(obj, state)
    } else {
      obj.relX += relDx
      obj.relY += relDy

      // Text-Objekte haben kein relWidth/relHeight
      // Sie können überall positioniert werden (auch außerhalb Canvas für Effekte)
      if (obj.type !== 'text') {
        // Nur Bilder auf Canvas begrenzen
        obj.relX = Math.max(0, Math.min(obj.relX, 1 - obj.relWidth))
        obj.relY = Math.max(0, Math.min(obj.relY, 1 - obj.relHeight))
      }
      // Text wird nicht begrenzt - kann frei positioniert werden
    }

    slideshow?.commitImageBounds(obj)

    // When multiple texts are selected, move them all together (um dieselbe
    // tatsächliche Verschiebung – auch wenn das gezogene Objekt eingerastet ist)
    const appliedDx = obj.relX - startX
    const appliedDy = obj.relY - startY
    if (this.manager.selectedObjects && this.manager.selectedObjects.length > 0) {
      for (const other of this.manager.selectedObjects) {
        if (other !== obj && other.type === 'text') {
          other.relX += appliedDx
          other.relY += appliedDy
        }
      }
    }
  }

  /**
   * Rastet ein Objekt am Raster ein: Bilder/Videos mit linker/rechter bzw.
   * oberer/unterer Kante oder Mitte, Texte mit ihrem Ankerpunkt. Die Toleranz
   * gilt in Bildschirm-Pixeln (unabhängig von der Canvas-Skalierung).
   */
  _snapToGrid(obj, grid) {
    const canvas = this.manager.canvas
    const w = canvas.width
    const h = canvas.height
    const displayed = canvas.clientWidth || canvas.getBoundingClientRect?.().width || w
    const tolerance = grid.snapTolerance * (w / displayed)
    const hasBox = obj.type !== 'text' && obj.relWidth > 0 && obj.relHeight > 0
    const bw = hasBox ? obj.relWidth * w : 0
    const bh = hasBox ? obj.relHeight * h : 0
    obj.relX = grid.snapAxis(obj.relX * w, bw, tolerance) / w
    obj.relY = grid.snapAxis(obj.relY * h, bh, tolerance) / h
    if (hasBox) {
      obj.relX = Math.max(0, Math.min(obj.relX, 1 - obj.relWidth))
      obj.relY = Math.max(0, Math.min(obj.relY, 1 - obj.relHeight))
    }
  }

  /**
   * Skaliert ein Text-Objekt
   */
  resizeText(obj, dx, dy) {
    const currentPixelWidth = obj.relWidth * this.manager.canvas.width
    const currentPixelHeight = obj.relHeight * this.manager.canvas.height

    const oldRelX = obj.relX
    const oldRelY = obj.relY
    const oldRelWidth = obj.relWidth
    const oldRelHeight = obj.relHeight
    const oldFontSize = obj.fontSize

    let newPixelWidth = currentPixelWidth
    let newPixelHeight = currentPixelHeight

    const currentAction = this.manager.currentAction

    switch (currentAction) {
      case 'resize-tl':
      case 'resize-tr':
      case 'resize-bl':
      case 'resize-br':
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)

        let pixelChange
        if (absDx > absDy) {
          pixelChange = currentAction.includes('l') ? -dx : dx
          newPixelWidth = currentPixelWidth + pixelChange
          newPixelHeight = newPixelWidth * (currentPixelHeight / currentPixelWidth)
        } else {
          pixelChange = currentAction.includes('t') ? -dy : dy
          newPixelHeight = currentPixelHeight + pixelChange
          newPixelWidth = newPixelHeight * (currentPixelWidth / currentPixelHeight)
        }
        break

      case 'resize-t':
      case 'resize-b':
        const heightPixelChange = currentAction === 'resize-t' ? -dy : dy
        newPixelHeight = currentPixelHeight + heightPixelChange
        newPixelWidth = newPixelHeight * (currentPixelWidth / currentPixelHeight)
        break

      case 'resize-l':
      case 'resize-r':
        const widthPixelChange = currentAction === 'resize-l' ? -dx : dx
        newPixelWidth = currentPixelWidth + widthPixelChange
        newPixelHeight = newPixelWidth * (currentPixelHeight / currentPixelWidth)
        break
    }

    const scaleFactor = newPixelWidth / currentPixelWidth
    const newFontSize = obj.fontSize * scaleFactor

    const minFontSize = 8
    if (newFontSize < minFontSize) {
      return
    }

    const newRelWidth = newPixelWidth / this.manager.canvas.width
    const newRelHeight = newPixelHeight / this.manager.canvas.height

    const widthChange = newRelWidth - obj.relWidth
    const heightChange = newRelHeight - obj.relHeight

    obj.relWidth = newRelWidth
    obj.relHeight = newRelHeight
    obj.fontSize = newFontSize

    if (currentAction.includes('l')) {
      obj.relX -= widthChange
    } else if (currentAction === 'resize-t' || currentAction === 'resize-b') {
      obj.relX -= widthChange / 2
    }

    if (currentAction.includes('t')) {
      obj.relY -= heightChange
    } else if (currentAction === 'resize-l' || currentAction === 'resize-r') {
      obj.relY -= heightChange / 2
    }

    const minPixelSize = this.manager.selectionManager.HANDLE_SIZE * 3

    if (newPixelWidth < minPixelSize || newPixelHeight < minPixelSize) {
      obj.relX = oldRelX
      obj.relY = oldRelY
      obj.relWidth = oldRelWidth
      obj.relHeight = oldRelHeight
      obj.fontSize = oldFontSize
    }
  }

  /**
   * Skaliert ein Bild oder Video
   */
  resizeImage(obj, dx, dy) {
    // Slideshow-Bilder: wie normale Bilder skalieren (Griff folgt der Maus),
    // Ergebnis als eigene Größe des Bildes merken. Im Workspace-Modus fest.
    const slideshow = obj.isSlideshowImage ? window.slideshowManager : null
    if (slideshow?.isFittedToWorkspace()) return

    // Unterstützung für Videos und Bilder
    let imgAspectRatio
    if (obj.type === 'video' && obj.videoElement) {
      imgAspectRatio = obj.videoElement.videoWidth / obj.videoElement.videoHeight
    } else if (obj.imageObject) {
      imgAspectRatio = obj.imageObject.width / obj.imageObject.height
    } else {
      imgAspectRatio = 16 / 9 // Fallback
    }

    const currentPixelWidth = obj.relWidth * this.manager.canvas.width
    const currentPixelHeight = obj.relHeight * this.manager.canvas.height

    const oldRelX = obj.relX
    const oldRelY = obj.relY
    const oldRelWidth = obj.relWidth
    const oldRelHeight = obj.relHeight

    let newPixelWidth = currentPixelWidth
    let newPixelHeight = currentPixelHeight

    const currentAction = this.manager.currentAction

    switch (currentAction) {
      case 'resize-tl':
      case 'resize-tr':
      case 'resize-bl':
      case 'resize-br':
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)

        let pixelChange
        if (absDx > absDy) {
          pixelChange = currentAction.includes('l') ? -dx : dx
          newPixelWidth = currentPixelWidth + pixelChange
          newPixelHeight = newPixelWidth / imgAspectRatio
        } else {
          pixelChange = currentAction.includes('t') ? -dy : dy
          newPixelHeight = currentPixelHeight + pixelChange
          newPixelWidth = newPixelHeight * imgAspectRatio
        }
        break

      case 'resize-t':
      case 'resize-b':
        const heightPixelChange = currentAction === 'resize-t' ? -dy : dy
        newPixelHeight = currentPixelHeight + heightPixelChange
        newPixelWidth = newPixelHeight * imgAspectRatio
        break

      case 'resize-l':
      case 'resize-r':
        const widthPixelChange = currentAction === 'resize-l' ? -dx : dx
        newPixelWidth = currentPixelWidth + widthPixelChange
        newPixelHeight = newPixelWidth / imgAspectRatio
        break
    }

    const newRelWidth = newPixelWidth / this.manager.canvas.width
    const newRelHeight = newPixelHeight / this.manager.canvas.height

    const widthChange = newRelWidth - obj.relWidth
    const heightChange = newRelHeight - obj.relHeight

    obj.relWidth = newRelWidth
    obj.relHeight = newRelHeight

    if (currentAction.includes('l')) {
      obj.relX -= widthChange
    } else if (currentAction === 'resize-t' || currentAction === 'resize-b') {
      obj.relX -= widthChange / 2
    }

    if (currentAction.includes('t')) {
      obj.relY -= heightChange
    } else if (currentAction === 'resize-l' || currentAction === 'resize-r') {
      obj.relY -= heightChange / 2
    }

    const minPixelSize = this.manager.selectionManager.HANDLE_SIZE * 3

    if (newPixelWidth < minPixelSize || newPixelHeight < minPixelSize) {
      obj.relX = oldRelX
      obj.relY = oldRelY
      obj.relWidth = oldRelWidth
      obj.relHeight = oldRelHeight
    }

    slideshow?.commitImageBounds(obj)
  }
}
