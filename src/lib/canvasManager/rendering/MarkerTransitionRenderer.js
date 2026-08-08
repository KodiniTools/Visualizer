/**
 * MarkerTransitionRenderer — echter Crossfade beim Marker-Wechsel.
 *
 * Technik: In der Capture-Phase wird der aktuelle (alte) Frame pro Render-Ziel
 * (Live-Canvas & Aufnahme-Canvas getrennt) in eine Offscreen-Canvas eingefroren.
 * In der Fade-Phase wird dieser eingefrorene alte Frame über der neuen, live
 * animierten Szene ausgeblendet (globalAlpha 1 → 0) – ein weicher Übergang ohne
 * Schwarz-Zwischenschritt.
 *
 * Jedes Ziel friert seinen eigenen Frame ein, damit Skalierung/Workspace-Format
 * exakt passen. Wird pro Frame NACH allen anderen Render-Schritten aufgerufen.
 */
export class MarkerTransitionRenderer {
  /**
   * @param {object} store - markerTransitionStore-Instanz
   */
  constructor(store) {
    this.store = store
    // Pro Ziel-Key ('live' | 'rec') eine eingefrorene Frame-Canvas
    this.frames = new Map()
    // Ziele, die im aktuellen Übergang bereits eingefroren haben
    this.captured = new Set()
    // Zuletzt gesehene Phase ('idle' | 'capture' | 'fade') zur Erkennung eines
    // neuen Capture-Fensters – auch bei direkt aufeinanderfolgenden Markern.
    this._lastPhase = 'idle'
  }

  _reset() {
    this._lastPhase = 'idle'
    this.captured.clear()
    // Frame-Canvases behalten (Wiederverwendung), nur Inhalt gilt als veraltet
  }

  _captureFrame(key, sourceCanvas) {
    let frame = this.frames.get(key)
    if (
      !frame ||
      frame.canvas.width !== sourceCanvas.width ||
      frame.canvas.height !== sourceCanvas.height
    ) {
      const canvas = document.createElement('canvas')
      canvas.width = sourceCanvas.width
      canvas.height = sourceCanvas.height
      frame = { canvas, ctx: canvas.getContext('2d') }
      this.frames.set(key, frame)
    }
    frame.ctx.clearRect(0, 0, frame.canvas.width, frame.canvas.height)
    frame.ctx.drawImage(sourceCanvas, 0, 0)
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   * @param {string} [key='live'] - Render-Ziel ('live' | 'rec')
   */
  render(ctx, width, height, key = 'live') {
    if (!this.store) return

    const capturing = this.store.isCapturing()
    const fading = this.store.isFading()
    const phase = capturing ? 'capture' : fading ? 'fade' : 'idle'

    // Übergang zu Ende / inaktiv → aufräumen
    if (phase === 'idle') {
      if (this._lastPhase !== 'idle') this._reset()
      return
    }

    // Neues Capture-Fenster (auch direkt nach einem laufenden Fade) →
    // eingefrorene Frames als veraltet markieren, damit neu erfasst wird.
    if (phase === 'capture' && this._lastPhase !== 'capture') {
      this.captured.clear()
    }
    this._lastPhase = phase

    // Capture-Phase: alten Frame einfrieren, alte Szene bleibt sichtbar
    if (capturing) {
      if (!this.captured.has(key)) {
        this._captureFrame(key, ctx.canvas)
        this.captured.add(key)
      }
      return
    }

    // Fade-Phase: alten Frame über der neuen Szene ausblenden
    const progress = this.store.fadeProgress()
    if (progress === null || progress >= 1) {
      this.store.end()
      this._reset()
      return
    }

    const frame = this.frames.get(key)
    if (!frame) return // Ziel hat nicht rechtzeitig eingefroren → kein Fade

    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, 1 - progress))
    ctx.drawImage(frame.canvas, 0, 0, width, height)
    ctx.restore()
  }
}
