/**
 * MarkerTransitionRenderer — zeichnet den Aus-/Einblende-Übergang beim
 * Marker-Wechsel als vollflächiges Overlay ganz oben auf der Szene.
 * Wird pro Frame NACH allen anderen Render-Schritten aufgerufen, damit der
 * Übergang alles (Hintergrund, Visualizer, Bilder, Text) überdeckt und auch
 * in der Aufnahme erscheint.
 */
export class MarkerTransitionRenderer {
  /**
   * @param {object} store - markerTransitionStore-Instanz
   */
  constructor(store) {
    this.store = store
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  render(ctx, width, height) {
    if (!this.store) return
    const alpha = this.store.overlayAlpha()
    if (alpha <= 0) return

    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
    ctx.fillStyle = this.store.color || '#000000'
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }
}
