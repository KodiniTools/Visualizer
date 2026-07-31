import { BeatDetector } from '../../audio/BeatDetector.js'

/**
 * TickerRenderer — Lauftext (Ticker): ein horizontal scrollendes Textband,
 * das über der gesamten Szene liegt (oben oder unten).
 *
 * Der Scroll-Offset wird laufzeit-akkumuliert (Δt × Geschwindigkeit), damit
 * eine variable Geschwindigkeit (Audio-Reaktivität: Tempo pulsiert zum Beat)
 * möglich ist. Der Offset wird geteilt über alle Render-Ziele (Live, Aufnahme,
 * Screenshot), sodass diese praktisch synchron bleiben.
 */
export class TickerRenderer {
  constructor() {
    this.offset = 0
    this.lastTime = null
    this.speedBoost = 0
    this.beatDetector = new BeatDetector({ beatThreshold: 0.2, beatRiseThreshold: 0.05 })
  }

  render(ctx, width, height, audioData, settings) {
    const now = performance.now()

    const text = (settings?.text || '').trim()
    if (!settings?.enabled || !text) {
      // Zeitbasis zurücksetzen, damit nach dem Aktivieren kein Sprung entsteht
      this.lastTime = now
      return
    }

    // Δt bestimmen (auf 0.1 s begrenzt gegen Sprünge nach Pausen)
    if (this.lastTime == null) this.lastTime = now
    let dt = (now - this.lastTime) / 1000
    this.lastTime = now
    if (dt < 0) dt = 0
    if (dt > 0.1) dt = 0.1

    const baseSpeed = settings.speed || 0

    // Audio-Reaktivität: bei einem Beat die Geschwindigkeit kurz anheben
    if (settings.audioReactive && audioData) {
      const level = (audioData.bass ?? audioData.smoothBass ?? 0) / 255
      const beat = this.beatDetector.detect(level * 255, now)
      if (beat.isBeat) {
        const intensity = Math.max(0, Math.min(100, settings.beatIntensity ?? 60)) / 100
        this.speedBoost = baseSpeed * intensity * 4 * (0.6 + beat.beatIntensity * 0.4)
      }
    } else {
      this.speedBoost = 0
    }
    // Boost abklingen lassen
    this.speedBoost *= Math.max(0, 1 - dt * 3)
    if (this.speedBoost < 0.01) this.speedBoost = 0

    const currentSpeed = baseSpeed + this.speedBoost

    // Laufachse: links/rechts = horizontal, oben/unten = vertikal
    const isVertical = settings.direction === 'up' || settings.direction === 'down'

    const fontSize = Math.max(8, settings.fontSize || 48)
    // Banddicke (Höhe bei horizontalem, Breite bei vertikalem Lauf)
    const thickness = Math.round(fontSize * 1.6)
    // Länge der Laufachse und Ausdehnung quer dazu
    const axisLength = isVertical ? height : width
    const crossExtent = isVertical ? width : height
    // Position quer zur Laufrichtung (0 % = oben/links, 100 % = unten/rechts);
    // das Band bleibt dabei immer vollständig sichtbar.
    const crossPos = Math.max(0, Math.min(100, settings.positionY ?? 100)) / 100
    const bandStart = Math.round(crossPos * Math.max(0, crossExtent - thickness))
    const bandCenter = bandStart + thickness / 2

    ctx.save()

    // Hintergrundband (mit einstellbarer Transparenz) – im Bildschirm-Koordinatensystem
    const bgOpacity = Math.max(0, Math.min(100, settings.bgOpacity ?? 70)) / 100
    if (bgOpacity > 0) {
      ctx.globalAlpha = bgOpacity
      ctx.fillStyle = settings.bgColor || '#000000'
      if (isVertical) {
        ctx.fillRect(bandStart, 0, thickness, height)
      } else {
        ctx.fillRect(0, bandStart, width, thickness)
      }
    }

    // Text-Stil
    ctx.globalAlpha = 1
    const weight = settings.bold ? 'bold ' : ''
    const family = settings.fontFamily || 'Arial'
    ctx.font = `${weight}${fontSize}px "${family}", Arial, sans-serif`
    ctx.fillStyle = settings.color || '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    // Buchstabenabstand (moderne Browser; measureText berücksichtigt ihn)
    const spacing = settings.letterSpacing || 0
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`

    const gap = fontSize * 2
    const segLength = ctx.measureText(text).width + gap

    if (segLength <= 0) {
      ctx.restore()
      return
    }

    // Offset akkumulieren; links/oben laufen in negative Achsrichtung,
    // rechts/unten in positive.
    const dir = settings.direction === 'right' || settings.direction === 'down' ? -1 : 1
    this.offset += dir * currentSpeed * dt
    // In [0, segLength) normalisieren (nahtlose Kachelung)
    this.offset = ((this.offset % segLength) + segLength) % segLength

    // Bei vertikalem Lauf das Koordinatensystem um 90° drehen: die lokale
    // x-Achse zeigt dann nach unten, die Schrift läuft entlang der Spalte.
    if (isVertical) {
      ctx.translate(bandCenter, 0)
      ctx.rotate(Math.PI / 2)
    }

    // Segmente wiederholen, bis die gesamte Laufachse gefüllt ist
    let a = -this.offset
    let guard = 0
    while (a < axisLength && guard < 1000) {
      ctx.fillText(text, a, isVertical ? 0 : bandCenter)
      a += segLength
      guard++
    }

    ctx.restore()
  }
}
