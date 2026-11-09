// canvasManager/methods/workspaceMethods.js
import type { CanvasManager } from '../../canvasManager'
import type { Rect } from '../../canvasObjects/geometry'
/**
 * Workspace-Presets (Social-Media-Formate), Umriss und Workspace-Bereich.
 *
 * `this` ist die CanvasManager-Instanz (Methoden werden per applyMethods()
 * auf CanvasManager.prototype übertragen).
 */
export class WorkspaceMethods {
  // ═══════════════════════════════════════════════════════════════════
  // WORKSPACE PRESETS
  // ═══════════════════════════════════════════════════════════════════

  setWorkspacePreset(this: CanvasManager, presetKey: string): void {
    const preset = this.socialMediaPresets[presetKey]
    if (preset) {
      this.workspacePreset = preset
      this.showWorkspaceOutline = true
    } else {
      this.workspacePreset = null
      this.showWorkspaceOutline = false
      this.workspaceBackground = null
    }
    this.redrawCallback()
  }

  toggleWorkspaceOutline(this: CanvasManager): boolean {
    this.showWorkspaceOutline = !this.showWorkspaceOutline
    this.redrawCallback()
    return this.showWorkspaceOutline
  }

  getWorkspaceBounds(this: CanvasManager): Rect | null {
    if (!this.workspacePreset) return null

    const canvasAspectRatio = this.canvas.width / this.canvas.height
    const workspaceAspectRatio = this.workspacePreset.width / this.workspacePreset.height

    let workspaceWidth, workspaceHeight

    if (workspaceAspectRatio > canvasAspectRatio) {
      workspaceWidth = this.canvas.width * 0.9
      workspaceHeight = workspaceWidth / workspaceAspectRatio
    } else {
      workspaceHeight = this.canvas.height * 0.9
      workspaceWidth = workspaceHeight * workspaceAspectRatio
    }

    const x = (this.canvas.width - workspaceWidth) / 2
    const y = (this.canvas.height - workspaceHeight) / 2

    return { x, y, width: workspaceWidth, height: workspaceHeight }
  }
}
