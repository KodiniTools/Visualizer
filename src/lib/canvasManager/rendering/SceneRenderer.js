// SceneRenderer.js - Haupt-Szenen-Rendering

/**
 * SceneRenderer - Verantwortlich für das Zeichnen der kompletten Szene
 *
 * Funktionen:
 * - Haupt-Zeichenmethoden (draw, drawScene)
 * - Text-Rendering Koordination
 * - Grid-Rendering Koordination
 */
export class SceneRenderer {
  constructor(canvasManager) {
    this.manager = canvasManager
  }

  /**
   * Haupt-Draw-Methode - Zeichnet alles
   */
  draw(targetCtx) {
    this.drawScene(targetCtx)

    if (this.manager.gridManager) {
      this.manager.gridManager.drawGrid(targetCtx)
    }

    if (targetCtx === this.manager.ctx) {
      // Markierungen für ausgeblendete Texte zeichnen (immer sichtbar)
      this.drawFadedTextMarkers(targetCtx)
      this.manager.uiRenderer.drawInteractiveElements(targetCtx)
      this.drawWorkspaceOutline(targetCtx)
      // Text-Auswahl-Rechteck zeichnen (immer obendrauf)
      this.manager.uiRenderer.drawTextSelectionRect(targetCtx)
      // Bild-Auswahl-Rechteck zeichnen (immer obendrauf)
      this.manager.uiRenderer.drawImageSelectionRect(targetCtx)
    }
  }

  /**
   * Zeichnet die Hauptszene (Hintergrund + Text)
   */
  drawScene(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // 1. Hintergrund zeichnen (delegiert an BackgroundRenderer)
    this.manager.backgroundRenderer.drawBackground(ctx)

    // 3. BILDER werden jetzt NUR im multiImageManager.drawImages() gezeichnet
    // Das verhindert doppelte Bilder und ermöglicht korrekte Rotation
    // (multiImageManager.drawImages() wird in App.vue renderScene() aufgerufen)

    // 3.5 VIDEOS werden in App.vue renderScene() gezeichnet (nach Bildern, vor Text)
    // damit sie korrekt über Bildern aber unter Text erscheinen

    // 4. TEXTE rendern (verhindert Geist-Bug beim Drag)
    if (this.manager.textManager && this.manager.textManager.draw) {
      this.manager.textManager.draw(ctx)
    }
  }

  /**
   * Zeichnet die Workspace-Outline
   */
  drawWorkspaceOutline(ctx) {
    if (!this.manager.showWorkspaceOutline || !this.manager.workspacePreset) return

    const bounds = this.manager.getWorkspaceBounds()
    if (!bounds) return

    ctx.save()
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 3
    ctx.setLineDash([10, 5])
    ctx.globalAlpha = 0.8
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)

    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    const labelText = `${this.manager.workspacePreset.name} - ${this.manager.workspacePreset.width}×${this.manager.workspacePreset.height}`
    const textMetrics = ctx.measureText(labelText)
    const labelPadding = 8
    const labelWidth = textMetrics.width + labelPadding * 2
    const labelHeight = 24

    ctx.fillRect(bounds.x, bounds.y - labelHeight, labelWidth, labelHeight)
    ctx.fillStyle = '#000000'
    ctx.fillText(labelText, bounds.x + labelPadding, bounds.y - labelHeight + 4)
    ctx.restore()
  }

  /**
   * Zeichnet Markierungen für ausgeblendete Texte
   * Diese bleiben sichtbar, damit der Benutzer sie wieder anklicken kann
   */
  drawFadedTextMarkers(ctx) {
    if (!this.manager.textManager || !this.manager.textManager.textObjects) return

    const tm = this.manager.textManager
    const texts = tm.textObjects

    for (const textObj of texts) {
      const anim = textObj.animation
      if (!anim) continue

      // Aktives Objekt bekommt sowieso eine Markierung
      if (this.manager.activeObject === textObj) continue

      // Nur Texte mit einer (potenziell ausblendenden) Animation berücksichtigen
      const hasAnim =
        anim.fade?.enabled || anim.scale?.enabled || anim.slide?.enabled || anim.typewriter?.enabled
      if (!hasAnim) continue

      // Effektive Sichtbarkeit über alle Ausblend-Arten berechnen:
      // Fade-Opacity × Anzeigedauer-Opacity × Basis-Deckkraft
      const fadeOpacity = tm._getFadeOpacity(textObj).opacity
      const displayOpacity = tm._getDisplayOpacity(textObj)
      const baseOpacity = (textObj.opacity != null ? textObj.opacity : 100) / 100
      const effectiveOpacity = fadeOpacity * displayOpacity * baseOpacity

      // Scale: auf ~0 geschrumpft = unsichtbar
      const scaleValue = anim.scale?.enabled ? tm._getScaleValue(textObj).scale : 1

      let hidden = effectiveOpacity < 0.1 || scaleValue < 0.05
      let bounds = null

      // Slide: Text vollständig außerhalb des Canvas geschoben = nicht sichtbar
      if (!hidden && anim.slide?.enabled) {
        bounds = tm.getObjectBounds(textObj, ctx.canvas)
        if (bounds) {
          const slide = tm._getSlideOffset(textObj, ctx.canvas.width, ctx.canvas.height)
          const ax = bounds.x + slide.offsetX
          const ay = bounds.y + slide.offsetY
          hidden =
            ax + bounds.width < 0 ||
            ax > ctx.canvas.width ||
            ay + bounds.height < 0 ||
            ay > ctx.canvas.height
        }
      }

      if (!hidden) continue

      // Bounds an Ruheposition (relX/relY) – zeigt, wo der Text hingehört
      if (!bounds) bounds = tm.getObjectBounds(textObj, ctx.canvas)
      if (!bounds) continue

      ctx.save()

      // Gestrichelter Rahmen in Orange/Gelb für "versteckte" Texte
      ctx.strokeStyle = 'rgba(255, 193, 7, 0.8)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
      ctx.setLineDash([])

      // Kleines Label "Ausgeblendet"
      ctx.fillStyle = 'rgba(255, 193, 7, 0.9)'
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      const label = '👻 Ausgeblendet'
      const labelMetrics = ctx.measureText(label)
      const labelPadding = 4
      const labelWidth = labelMetrics.width + labelPadding * 2
      const labelHeight = 16

      // Label oben links am Rahmen
      ctx.fillRect(bounds.x, bounds.y - labelHeight - 2, labelWidth, labelHeight)
      ctx.fillStyle = '#000000'
      ctx.fillText(label, bounds.x + labelPadding, bounds.y - labelHeight)

      ctx.restore()
    }
  }
}
