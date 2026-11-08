// canvasManager/methods/deletionMethods.js
import type { CanvasManager } from '../../canvasManager'
import type { TextObject } from '../../textManager/types'

/** Löschen/Wiederherstellen an der ursprünglichen Ebenen-Position */
interface DeletionHelpers {
  remove(): number
  restore(index: number): void
}

interface RemovedText {
  object: TextObject
  index: number
}
/**
 * Löschen von Objekten (aktives Objekt, mehrere Texte, Bild nach Quelle)
 * mit Undo-Unterstützung.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class DeletionMethods {
  deleteActiveObject(this: CanvasManager): void {
    if (!this.activeObject) return

    const obj = this.activeObject
    const type = obj.type

    // Baut Löschen/Wiederherstellen-Helfer für undo-fähige Objekt-Typen.
    // remove() gibt den Index vor dem Entfernen zurück, restore() fügt an
    // dieser Ebenen-Position wieder ein.
    let helpers: DeletionHelpers | null = null

    if (type === 'image' && this.multiImageManager) {
      const mgr = this.multiImageManager
      helpers = {
        remove: () => {
          const index = mgr.images.findIndex((i) => i.id === obj.id)
          mgr.removeImage(obj.id)
          return index
        },
        restore: (index) => mgr.restoreImage(obj, index),
      }
    } else if (type === 'video' && this.videoManager) {
      const mgr = this.videoManager
      helpers = {
        remove: () => {
          const index = mgr.videos.findIndex((v) => v.id === obj.id)
          // Video-Element erhalten, damit Undo möglich ist
          mgr.removeVideo(obj.id, { destroyElement: false })
          return index
        },
        restore: (index) => mgr.restoreVideo(obj, index),
      }
    } else if (type === 'text' && this.textManager) {
      // Texte werden nur vom Canvas entfernt: Sie bleiben mit allen
      // Einstellungen im Text-Verzeichnis (und für Beat-Marker verfügbar),
      // bis sie dort endgültig gelöscht werden.
      const mgr = this.textManager
      helpers = {
        remove: () => {
          const index = mgr.textObjects.findIndex((t) => t.id === obj.id)
          mgr.removeFromCanvas(obj)
          return index
        },
        restore: (index) => {
          // Endgültig gelöscht (Fallback-Pfad) → wieder einfügen
          if (!mgr.returnToCanvas(obj)) mgr.restore(obj, index)
        },
      }
    }

    if (helpers) {
      let lastIndex = helpers.remove()

      this.setActiveObject(null)
      this.redrawCallback()
      this.updateUICallback()

      // Undo/Redo-Hooks an die Anwendung geben (History + Toast)
      this.onObjectDeleted?.({
        type,
        object: obj,
        undo: () => {
          helpers.restore(lastIndex)
          this.redrawCallback()
          this.updateUICallback()
        },
        redo: () => {
          lastIndex = helpers.remove()
          if (this.activeObject === obj) this.setActiveObject(null)
          this.redrawCallback()
          this.updateUICallback()
        },
      })
      return
    }

    // Hintergrund-Typen: kein Undo-Command
    if (type === 'background') {
      this.background = null
    } else if (type === 'workspace-background') {
      this.workspaceBackground = null
    }

    this.setActiveObject(null)
    this.redrawCallback()
    this.updateUICallback()
  }

  // ↩️ Undo-fähiges Entfernen mehrerer Text-Objekte vom Canvas in einem Schritt.
  // Wie beim Einzel-Löschen bleiben die Texte im Text-Verzeichnis.
  // Wird z.B. vom "Alle löschen"-Button im Mehrfach-Bearbeiten-Panel genutzt.
  // Registriert EINEN gemeinsamen History-Command, sodass ein einziges
  // Undo (Strg+Z bzw. Toast-Button) alle Texte gemeinsam wiederherstellt.
  deleteTexts(this: CanvasManager, textsToDelete: TextObject[]): void {
    if (!this.textManager || !Array.isArray(textsToDelete) || textsToDelete.length === 0) {
      return
    }
    const textManager = this.textManager

    // Nur tatsächlich vorhandene Text-Objekte auf dem Canvas berücksichtigen
    const targets = textsToDelete.filter((obj) =>
      textManager.textObjects.some((existing) => existing.id === obj.id && !existing.offCanvas),
    )
    if (targets.length === 0) return

    // Entfernt alle Ziel-Texte und merkt sich ihre Ebenen-Positionen.
    // Löschung von hinten (größter Index zuerst), damit die noch nicht
    // gelöschten Indizes gültig bleiben. Rückgabe aufsteigend nach Index.
    const removeAll = () => {
      const removed = targets.map((obj) => ({
        object: obj,
        index: textManager.textObjects.findIndex((t) => t.id === obj.id),
      }))
      removed
        .slice()
        .sort((a, b) => b.index - a.index)
        .forEach(({ object }) => textManager.removeFromCanvas(object))
      return removed.sort((a, b) => a.index - b.index)
    }

    // Fügt alle Texte an ihren ursprünglichen Ebenen-Positionen wieder ein.
    // Aufsteigend einfügen, damit jeder Index beim Einsetzen stimmt.
    const restoreAll = (removed: RemovedText[]) => {
      removed
        .slice()
        .sort((a, b) => a.index - b.index)
        .forEach(({ object, index }) => {
          if (!textManager.returnToCanvas(object)) textManager.restore(object, index)
        })
    }

    let removed = removeAll()

    this.clearMultiSelection()
    this.setActiveObject(null)
    this.redrawCallback()
    this.updateUICallback()

    this.onObjectDeleted?.({
      type: 'text',
      count: targets.length,
      undo: () => {
        restoreAll(removed)
        this.redrawCallback()
        this.updateUICallback()
      },
      redo: () => {
        removed = removeAll()
        this.clearMultiSelection()
        this.setActiveObject(null)
        this.redrawCallback()
        this.updateUICallback()
      },
    })
  }

  removeImageBySource(
    this: CanvasManager,
    imageObjectToRemove: HTMLImageElement | null | undefined,
  ): void {
    if (!imageObjectToRemove) return

    if (
      this.background &&
      typeof this.background === 'object' &&
      this.background.imageObject === imageObjectToRemove
    ) {
      this.background = null
    }

    if (this.workspaceBackground && this.workspaceBackground.imageObject === imageObjectToRemove) {
      this.workspaceBackground = null
    }

    if (this.multiImageManager) {
      const mgr = this.multiImageManager
      const images = mgr.getAllImages()
      const imagesToRemove = images.filter((imgData) => imgData.imageObject === imageObjectToRemove)
      imagesToRemove.forEach((img) => {
        mgr.removeImage(img.id)
      })
    }

    if (
      this.activeObject &&
      this.activeObject.type === 'image' &&
      this.activeObject.imageObject === imageObjectToRemove
    ) {
      this.setActiveObject(null)
    }

    this.redrawCallback?.()
    this.updateUICallback?.()
  }
}
