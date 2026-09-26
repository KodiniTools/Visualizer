// canvasManager/methods/contentMethods.js
/**
 * Inhalte: Texte und Bilder hinzufügen sowie Eigenschaften des aktiven
 * Objekts ändern.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class ContentMethods {
  // ═══════════════════════════════════════════════════════════════════
  // TEXT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  setEditing(isEditing) {
    this.isEditingText = isEditing
    if (!isEditing && this.activeObject) {
      const currentActive = this.activeObject
      this.activeObject = null
      this.setActiveObject(currentActive)
    } else if (isEditing) {
      this.onSelectionChange(null)
    }
    this.redrawCallback()
  }

  addText(text, options = {}) {
    if (!this.textManager) {
      return null
    }
    const newTextObject = this.textManager.add(text, options)

    if (newTextObject && (!newTextObject.relWidth || !newTextObject.relHeight)) {
      this.calculateTextBounds(newTextObject)
    }

    this.setActiveObject(newTextObject)
    this.redrawCallback()
    return newTextObject
  }

  calculateTextBounds(textObj) {
    if (!textObj || textObj.type !== 'text') return

    const ctx = this.canvas.getContext('2d')
    ctx.save()

    let actualFontSize = textObj.fontSize
    if (actualFontSize <= 1) {
      actualFontSize = actualFontSize * this.canvas.height
    }

    ctx.font = `${textObj.fontWeight || 400} ${actualFontSize}px ${textObj.fontFamily || 'Arial'}`
    const metrics = ctx.measureText(textObj.text)
    ctx.restore()

    const width = metrics.width
    const height = actualFontSize * 1.2

    textObj.relWidth = width / this.canvas.width
    textObj.relHeight = height / this.canvas.height
  }

  // ═══════════════════════════════════════════════════════════════════
  // IMAGE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  getActiveImage() {
    if (this.activeObject) {
      if (this.activeObject.type === 'image') {
        return this.activeObject
      }
      if (
        this.activeObject.type === 'background' ||
        this.activeObject.type === 'workspace-background'
      ) {
        return this.activeObject
      }
    }
    return null
  }

  addImage(imageObject) {
    if (!this.multiImageManager) {
      return
    }

    const newImage = this.multiImageManager.addImage(imageObject)
    if (newImage) {
      this.setActiveObject(newImage)
      this.redrawCallback()
      this.updateUICallback()
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // OBJECT PROPERTY UPDATES
  // ═══════════════════════════════════════════════════════════════════

  updateActiveObjectProperty(property, value) {
    if (!this.activeObject) return

    if (this.activeObject.type === 'text') {
      if (property.includes('.')) {
        const [mainProp, subProp] = property.split('.')
        if (this.activeObject[mainProp]) {
          this.activeObject[mainProp][subProp] = value
        }
      } else {
        this.activeObject[property] = value
      }

      const boundsAffectingProps = ['text', 'fontSize', 'fontFamily', 'fontWeight']
      if (boundsAffectingProps.includes(property) || property.includes('.')) {
        this.calculateTextBounds(this.activeObject)
      }
    }

    this.redrawCallback()
  }

  updateActiveFotoProperty(property, value) {
    if (!this.activeObject || this.activeObject.type !== 'image') return

    if (this.fotoManager) {
      this.fotoManager.updateSetting(this.activeObject, property, value)
    }
  }
}
