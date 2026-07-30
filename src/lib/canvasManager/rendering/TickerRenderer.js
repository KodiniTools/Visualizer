/**
 * TickerRenderer — Lauftext (Ticker): ein horizontal scrollendes Textband,
 * das über der gesamten Szene liegt (oben oder unten).
 *
 * Der Scroll-Offset wird zeitbasiert (performance.now) berechnet, damit
 * Live-Canvas, Aufnahme und Screenshot denselben Stand zeigen.
 */
export class TickerRenderer {
  render(ctx, width, height, settings) {
    if (!settings?.enabled) return

    const text = (settings.text || '').trim()
    if (!text) return

    const fontSize = Math.max(8, settings.fontSize || 48)
    const speed = settings.speed || 0
    const bandHeight = Math.round(fontSize * 1.6)
    const y = settings.position === 'top' ? 0 : height - bandHeight

    ctx.save()

    // Hintergrundband (mit einstellbarer Transparenz)
    const bgOpacity = Math.max(0, Math.min(100, settings.bgOpacity ?? 70)) / 100
    if (bgOpacity > 0) {
      ctx.globalAlpha = bgOpacity
      ctx.fillStyle = settings.bgColor || '#000000'
      ctx.fillRect(0, y, width, bandHeight)
    }

    // Text
    ctx.globalAlpha = 1
    ctx.font = `bold ${fontSize}px Arial, sans-serif`
    ctx.fillStyle = settings.color || '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'

    const gap = fontSize * 2
    const segWidth = ctx.measureText(text).width + gap
    const centerY = y + bandHeight / 2

    if (segWidth <= 0) {
      ctx.restore()
      return
    }

    // Zeitbasierter Offset → nahtloser, gleichmäßiger Lauf (rechts nach links)
    const elapsed = performance.now() / 1000
    let offset = (elapsed * speed) % segWidth
    if (offset < 0) offset += segWidth

    // Segmente wiederholen, bis die gesamte Breite gefüllt ist
    let x = -offset
    let guard = 0
    while (x < width && guard < 1000) {
      ctx.fillText(text, x, centerY)
      x += segWidth
      guard++
    }

    ctx.restore()
  }
}
