// canvasManager/methods/backgroundMethods.js
/**
 * Bild-Hintergrund von Canvas und Workspace: setzen, ersetzen, spiegeln.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class BackgroundMethods {
  // ═══════════════════════════════════════════════════════════════════
  // BACKGROUND MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  setBackground(backgroundObject) {
    if (typeof backgroundObject === 'string') {
      this.background = backgroundObject
    } else if (backgroundObject && typeof backgroundObject === 'object') {
      this.background = {
        id: Date.now() + '_bg',
        type: 'background',
        imageObject: backgroundObject,
      }

      if (this.fotoManager) {
        this.fotoManager.initializeImageSettings(this.background)
      }
    } else {
      this.background = null
    }

    this.activeObject = null
    this.redrawCallback()
    this.updateUICallback()
  }

  setWorkspaceBackground(imageObject) {
    if (!this.workspacePreset) {
      return false
    }

    this.workspaceBackground = {
      id: Date.now() + '_wsbg',
      type: 'workspace-background',
      imageObject: imageObject,
    }

    if (this.fotoManager) {
      this.fotoManager.initializeImageSettings(this.workspaceBackground)
    }

    this.activeObject = null
    this.redrawCallback()
    this.updateUICallback()
    return true
  }

  updateBackgroundFlip(flipH, flipV) {
    if (!this.background || typeof this.background !== 'object') {
      console.warn('⚠️ Kein Bild-Hintergrund vorhanden')
      return false
    }

    if (!this.background.fotoSettings) {
      if (this.fotoManager) {
        this.fotoManager.initializeImageSettings(this.background)
      }
    }

    this.background.fotoSettings.flipH = flipH
    this.background.fotoSettings.flipV = flipV

    this.redrawCallback()
    return true
  }

  updateWorkspaceBackgroundFlip(flipH, flipV) {
    if (!this.workspaceBackground) {
      console.warn('⚠️ Kein Workspace-Hintergrund vorhanden')
      return false
    }

    if (!this.workspaceBackground.fotoSettings) {
      if (this.fotoManager) {
        this.fotoManager.initializeImageSettings(this.workspaceBackground)
      }
    }

    this.workspaceBackground.fotoSettings.flipH = flipH
    this.workspaceBackground.fotoSettings.flipV = flipV

    this.redrawCallback()
    return true
  }

  replaceBackground(newImageObject) {
    if (!newImageObject) {
      console.error('❌ Kein neues Bild zum Ersetzen übergeben')
      return null
    }

    if (!this.background || typeof this.background !== 'object') {
      console.warn('⚠️ Kein Bild-Hintergrund vorhanden zum Ersetzen')
      return null
    }

    const oldSettings = this.background.fotoSettings ? { ...this.background.fotoSettings } : null
    const oldAudioReactive = oldSettings?.audioReactive
      ? JSON.parse(JSON.stringify(oldSettings.audioReactive))
      : null
    const oldFlipH = oldSettings?.flipH || false
    const oldFlipV = oldSettings?.flipV || false
    const oldWidth = this.background.imageObject?.naturalWidth || 0
    const oldHeight = this.background.imageObject?.naturalHeight || 0

    this.background.imageObject = newImageObject

    if (this.fotoManager) {
      this.fotoManager.initializeImageSettings(this.background)
    }

    if (oldAudioReactive && this.background.fotoSettings) {
      this.background.fotoSettings.audioReactive = oldAudioReactive
    }

    if (this.background.fotoSettings) {
      this.background.fotoSettings.flipH = oldFlipH
      this.background.fotoSettings.flipV = oldFlipV
    }

    console.log(
      '🔄 Hintergrund ersetzt:',
      `Alt: ${oldWidth}x${oldHeight}`,
      `Neu: ${newImageObject.naturalWidth}x${newImageObject.naturalHeight}`,
      'Audio-Reactive übernommen:',
      !!oldAudioReactive,
    )

    this.redrawCallback()
    this.updateUICallback()

    return this.background
  }

  replaceWorkspaceBackground(newImageObject) {
    if (!newImageObject) {
      console.error('❌ Kein neues Bild zum Ersetzen übergeben')
      return null
    }

    if (!this.workspaceBackground) {
      console.warn('⚠️ Kein Workspace-Hintergrund vorhanden zum Ersetzen')
      return null
    }

    const oldSettings = this.workspaceBackground.fotoSettings
      ? { ...this.workspaceBackground.fotoSettings }
      : null
    const oldAudioReactive = oldSettings?.audioReactive
      ? JSON.parse(JSON.stringify(oldSettings.audioReactive))
      : null
    const oldFlipH = oldSettings?.flipH || false
    const oldFlipV = oldSettings?.flipV || false
    const oldWidth = this.workspaceBackground.imageObject?.naturalWidth || 0
    const oldHeight = this.workspaceBackground.imageObject?.naturalHeight || 0

    this.workspaceBackground.imageObject = newImageObject

    if (this.fotoManager) {
      this.fotoManager.initializeImageSettings(this.workspaceBackground)
    }

    if (oldAudioReactive && this.workspaceBackground.fotoSettings) {
      this.workspaceBackground.fotoSettings.audioReactive = oldAudioReactive
    }

    if (this.workspaceBackground.fotoSettings) {
      this.workspaceBackground.fotoSettings.flipH = oldFlipH
      this.workspaceBackground.fotoSettings.flipV = oldFlipV
    }

    console.log(
      '🔄 Workspace-Hintergrund ersetzt:',
      `Alt: ${oldWidth}x${oldHeight}`,
      `Neu: ${newImageObject.naturalWidth}x${newImageObject.naturalHeight}`,
      'Audio-Reactive übernommen:',
      !!oldAudioReactive,
    )

    this.redrawCallback()
    this.updateUICallback()

    return this.workspaceBackground
  }
}
