// canvasManager/methods/stateMethods.js
/**
 * Zustand: Zurücksetzen, Aufräumen, Zustands-Abfragen.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class StateMethods {
  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  reset() {
    if (this.multiImageManager) {
      this.multiImageManager.clear()
    }
    if (this.textManager && this.textManager.textObjects) {
      this.textManager.textObjects = []
    }

    if (this.videoManager) {
      this.videoManager.clear()
    }

    this.background = null
    this.workspaceBackground = null

    if (this.videoBackground) {
      const video = this.videoBackground.videoElement
      if (video) {
        video.pause()
        video.src = ''
      }
      this.videoBackground = null
    }

    if (this.workspaceVideoBackground) {
      const wsVideo = this.workspaceVideoBackground.videoElement
      if (wsVideo) {
        wsVideo.pause()
        wsVideo.src = ''
      }
      this.workspaceVideoBackground = null
    }

    this.setActiveObject(null)

    // Cleanup recording resources
    this.recordingRenderer.cleanupAfterRecording()

    this.redrawCallback()
    this.updateUICallback()
  }

  destroy() {
    this.mouseHandler.destroy()

    this.activeObject = null
    this.hoveredObject = null
    this.currentAction = null
    this._cachedBounds = null

    this.recordingRenderer.cleanupAfterRecording()

    console.log('[CanvasManager] ✅ Destroyed and cleaned up')
  }

  getCanvasState() {
    const images = this.multiImageManager ? this.multiImageManager.getAllImages() : []
    const videos = this.videoManager ? this.videoManager.getAllVideos() : []
    return {
      images: images,
      videos: videos,
      background: this.background,
      workspaceBackground: this.workspaceBackground,
      textObjects:
        this.textManager && this.textManager.textObjects ? this.textManager.textObjects : [],
    }
  }

  isCanvasEmpty() {
    const isBgEmpty = !this.background || this.background === '#ffffff'
    const isWorkspaceBgEmpty = !this.workspaceBackground
    const isVideoBgEmpty = !this.videoBackground
    const isWsVideoBgEmpty = !this.workspaceVideoBackground
    const imageCount = this.multiImageManager ? this.multiImageManager.getAllImages().length : 0
    const videoCount = this.videoManager ? this.videoManager.getAllVideos().length : 0
    const textCount =
      this.textManager && this.textManager.textObjects ? this.textManager.textObjects.length : 0
    return (
      imageCount === 0 &&
      videoCount === 0 &&
      textCount === 0 &&
      isBgEmpty &&
      isWorkspaceBgEmpty &&
      isVideoBgEmpty &&
      isWsVideoBgEmpty
    )
  }
}
