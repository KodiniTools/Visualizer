// canvasManager/methods/contentMethods.js
import type {
  CanvasManager,
  CanvasObject,
  CanvasTextObject,
  ImageBackgroundObject,
} from '../../canvasManager'
import type { TextManager } from '../../textManager'
import type { CanvasImage } from '../../multiImageManager'
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

  setEditing(this: CanvasManager, isEditing: boolean): void {
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

  addText(
    this: CanvasManager,
    text: string,
    options: Parameters<TextManager['add']>[1] = {},
  ): CanvasTextObject | null {
    if (!this.textManager) {
      return null
    }
    const newTextObject: CanvasTextObject = this.textManager.add(text, options)

    if (newTextObject && (!newTextObject.relWidth || !newTextObject.relHeight)) {
      this.calculateTextBounds(newTextObject)
    }

    this.setActiveObject(newTextObject)
    this.redrawCallback()
    return newTextObject
  }

  calculateTextBounds(this: CanvasManager, textObj: CanvasObject | null | undefined): void {
    if (!textObj || textObj.type !== 'text') return

    // 2D-Kontext eines HTMLCanvasElement ist immer verfügbar
    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.save()

    let actualFontSize = textObj.fontSize
    if (actualFontSize <= 1) {
      actualFontSize = actualFontSize * this.canvas.height
    }

    ctx.font = `${textObj.fontWeight || 400} ${actualFontSize}px ${textObj.fontFamily || 'Arial'}`
    // Altfeld `text` (Inhalt steht in `content`) – Verhalten unverändert übernommen
    const metrics = ctx.measureText(textObj.text as string)
    ctx.restore()

    const width = metrics.width
    const height = actualFontSize * 1.2

    textObj.relWidth = width / this.canvas.width
    textObj.relHeight = height / this.canvas.height
  }

  // ═══════════════════════════════════════════════════════════════════
  // IMAGE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  getActiveImage(this: CanvasManager): CanvasImage | ImageBackgroundObject | null {
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

  addImage(this: CanvasManager, imageObject: HTMLImageElement | null | undefined): void {
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

  updateActiveObjectProperty(this: CanvasManager, property: string, value: unknown): void {
    if (!this.activeObject) return

    if (this.activeObject.type === 'text') {
      // Dynamischer Eigenschaftspfad aus dem Panel ('prop' oder 'prop.sub')
      const target = this.activeObject as unknown as Record<string, unknown>
      if (property.includes('.')) {
        const [mainProp, subProp] = property.split('.') as [string, string]
        if (target[mainProp]) {
          ;(target[mainProp] as Record<string, unknown>)[subProp] = value
        }
      } else {
        target[property] = value
      }

      const boundsAffectingProps = ['text', 'fontSize', 'fontFamily', 'fontWeight']
      if (boundsAffectingProps.includes(property) || property.includes('.')) {
        this.calculateTextBounds(this.activeObject)
      }
    }

    this.redrawCallback()
  }

  updateActiveFotoProperty(this: CanvasManager, property: string, value: unknown): void {
    if (!this.activeObject || this.activeObject.type !== 'image') return

    if (this.fotoManager) {
      this.fotoManager.updateSetting(this.activeObject, property, value)
    }
  }
}
