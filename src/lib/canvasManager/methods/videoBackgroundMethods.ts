// canvasManager/methods/videoBackgroundMethods.js
import type { CanvasManager } from '../../canvasManager'
/**
 * Video-Hintergrund von Canvas und Workspace.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class VideoBackgroundMethods {
  // ═══════════════════════════════════════════════════════════════════
  // VIDEO BACKGROUND MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  setVideoBackground(this: CanvasManager, videoElement: HTMLVideoElement | null | undefined): void {
    if (!videoElement) {
      this.videoBackground = null
      this.redrawCallback()
      this.updateUICallback()
      return
    }

    this.videoBackground = {
      id: Date.now() + '_vbg',
      type: 'video-background',
      videoElement: videoElement,
      loop: true,
      muted: true,
    }

    videoElement.loop = true
    videoElement.muted = true
    videoElement.crossOrigin = 'anonymous'

    if (this.fotoManager) {
      this.fotoManager.initializeImageSettings(this.videoBackground)
    }

    if (typeof this.background === 'object') {
      this.background = '#ffffff'
    }

    this.activeObject = null
    this.redrawCallback()
    this.updateUICallback()

    console.log('✅ Video als Hintergrund gesetzt')
  }

  setWorkspaceVideoBackground(
    this: CanvasManager,
    videoElement: HTMLVideoElement | null | undefined,
  ): boolean {
    if (!this.workspacePreset) {
      console.warn('Kein Workspace-Preset ausgewählt')
      return false
    }

    if (!videoElement) {
      this.workspaceVideoBackground = null
      this.redrawCallback()
      this.updateUICallback()
      return true
    }

    this.workspaceVideoBackground = {
      id: Date.now() + '_wsvbg',
      type: 'workspace-video-background',
      videoElement: videoElement,
      loop: true,
      muted: true,
    }

    videoElement.loop = true
    videoElement.muted = true
    videoElement.crossOrigin = 'anonymous'

    if (this.fotoManager) {
      this.fotoManager.initializeImageSettings(this.workspaceVideoBackground)
    }

    this.workspaceBackground = null
    this.activeObject = null
    this.redrawCallback()
    this.updateUICallback()

    console.log('✅ Video als Workspace-Hintergrund gesetzt')
    return true
  }

  getVideoBackground(this: CanvasManager) {
    return this.videoBackground
  }

  getWorkspaceVideoBackground(this: CanvasManager) {
    return this.workspaceVideoBackground
  }
}
