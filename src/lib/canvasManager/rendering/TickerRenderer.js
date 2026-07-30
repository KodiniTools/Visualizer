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

    const fontSize = Math.max(8, settings.fontSize || 48)
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
    const segWidth = ctx.measureText(text).width + gap
    const centerY = y + bandHeight / 2

    if (segWidth <= 0) {
      ctx.restore()
      return
    }

    // Offset akkumulieren; Richtung: links = nach links, rechts = nach rechts
    const dir = settings.direction === 'right' ? -1 : 1
    this.offset += dir * currentSpeed * dt
    // In [0, segWidth) normalisieren (nahtlose Kachelung)
    this.offset = ((this.offset % segWidth) + segWidth) % segWidth

    // Segmente wiederholen, bis die gesamte Breite gefüllt ist
    let x = -this.offset
    let guard = 0
    while (x < width && guard < 1000) {
      ctx.fillText(text, x, centerY)
      x += segWidth
      guard++
    }

    ctx.restore()
  }
}
