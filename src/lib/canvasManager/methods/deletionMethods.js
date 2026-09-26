// canvasManager/methods/deletionMethods.js
/**
 * Löschen von Objekten (aktives Objekt, mehrere Texte, Bild nach Quelle)
 * mit Undo-Unterstützung.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class DeletionMethods {
  deleteActiveObject() {
    if (!this.activeObject) return

    const obj = this.activeObject
    const type = obj.type

    // Baut Löschen/Wiederherstellen-Helfer für undo-fähige Objekt-Typen.
    // remove() gibt den Index vor dem Entfernen zurück, restore() fügt an
    // dieser Ebenen-Position wieder ein.
    let helpers = null

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
      const mgr = this.textManager
      helpers = {
        remove: () => {
          const index = mgr.textObjects.findIndex((t) => t.id === obj.id)
          mgr.delete(obj)
          return index
        },
        restore: (index) => mgr.restore(obj, index),
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

  // ↩️ Undo-fähiges Löschen mehrerer Text-Objekte in einem Schritt.
  // Wird z.B. vom "Alle löschen"-Button im Mehrfach-Bearbeiten-Panel genutzt.
  // Registriert EINEN gemeinsamen History-Command, sodass ein einziges
  // Undo (Strg+Z bzw. Toast-Button) alle Texte gemeinsam wiederherstellt.
  deleteTexts(textsToDelete) {
    if (!this.textManager || !Array.isArray(textsToDelete) || textsToDelete.length === 0) {
      return
    }

    // Nur tatsächlich vorhandene Text-Objekte berücksichtigen
    const targets = textsToDelete.filter((obj) =>
      this.textManager.textObjects.some((existing) => existing.id === obj.id),
    )
    if (targets.length === 0) return

    // Entfernt alle Ziel-Texte und merkt sich ihre Ebenen-Positionen.
    // Löschung von hinten (größter Index zuerst), damit die noch nicht
    // gelöschten Indizes gültig bleiben. Rückgabe aufsteigend nach Index.
    const removeAll = () => {
      const removed = targets.map((obj) => ({
        object: obj,
        index: this.textManager.textObjects.findIndex((t) => t.id === obj.id),
      }))
      removed
        .slice()
        .sort((a, b) => b.index - a.index)
        .forEach(({ object }) => this.textManager.delete(object))
      return removed.sort((a, b) => a.index - b.index)
    }

    // Fügt alle Texte an ihren ursprünglichen Ebenen-Positionen wieder ein.
    // Aufsteigend einfügen, damit jeder Index beim Einsetzen stimmt.
    const restoreAll = (removed) => {
      removed
        .slice()
        .sort((a, b) => a.index - b.index)
        .forEach(({ object, index }) => this.textManager.restore(object, index))
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

  removeImageBySource(imageObjectToRemove) {
    if (!imageObjectToRemove) return

    if (this.background && this.background.imageObject === imageObjectToRemove) {
      this.background = null
    }

    if (this.workspaceBackground && this.workspaceBackground.imageObject === imageObjectToRemove) {
      this.workspaceBackground = null
    }

    if (this.multiImageManager) {
      const images = this.multiImageManager.getAllImages()
      const imagesToRemove = images.filter((imgData) => imgData.imageObject === imageObjectToRemove)
      imagesToRemove.forEach((img) => {
        this.multiImageManager.removeImage(img.id)
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
