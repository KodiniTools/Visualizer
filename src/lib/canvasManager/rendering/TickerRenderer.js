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

    // Laufachse: links/rechts = horizontal, oben/unten = vertikal (Abspann-Stil).
    // In beiden Fällen bleibt die Schrift normal (waagerecht) ausgerichtet.
    const isVertical = settings.direction === 'up' || settings.direction === 'down'

    const fontSize = Math.max(8, settings.fontSize || 48)
    const lineHeight = Math.round(fontSize * 1.6)

    ctx.save()

    // Text-Stil zuerst setzen, damit measureText die echte Breite liefert
    const weight = settings.bold ? 'bold ' : ''
    const family = settings.fontFamily || 'Arial'
    ctx.font = `${weight}${fontSize}px "${family}", Arial, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    // Buchstabenabstand (moderne Browser; measureText berücksichtigt ihn)
    const spacing = settings.letterSpacing || 0
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`

    const textWidth = ctx.measureText(text).width

    // Bandgeometrie:
    // - horizontal: volle Breite, Höhe = Zeilenhöhe
    // - vertikal (Abspann): volle Höhe, Breite = Textbreite (+ Rand)
    const bandThickness = isVertical
      ? Math.min(width, Math.round(textWidth + fontSize))
      : lineHeight
    const crossExtent = isVertical ? width : height
    // Position quer zur Laufrichtung (0 % = oben/links, 100 % = unten/rechts);
    // das Band bleibt dabei immer vollständig sichtbar.
    const crossPos = Math.max(0, Math.min(100, settings.positionY ?? 100)) / 100
    const bandStart = Math.round(crossPos * Math.max(0, crossExtent - bandThickness))

    // Hintergrundband (mit einstellbarer Transparenz)
    const bgOpacity = Math.max(0, Math.min(100, settings.bgOpacity ?? 70)) / 100
    if (bgOpacity > 0) {
      ctx.globalAlpha = bgOpacity
      ctx.fillStyle = settings.bgColor || '#000000'
      if (isVertical) {
        ctx.fillRect(bandStart, 0, bandThickness, height)
      } else {
        ctx.fillRect(0, bandStart, width, bandThickness)
      }
    }

    ctx.globalAlpha = 1
    ctx.fillStyle = settings.color || '#ffffff'

    // Abstand zwischen den Wiederholungen entlang der Laufachse
    const segLength = isVertical
      ? lineHeight + Math.round(fontSize * 0.8) // Zeilenabstand im Abspann
      : textWidth + fontSize * 2 // Lücke zwischen den Durchläufen

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

    const axisLength = isVertical ? height : width
    // Textzeile im Band zentrieren (vertikal: waagerecht mittig im Band)
    const textX = bandStart + (bandThickness - textWidth) / 2
    const lineY = bandStart + bandThickness / 2

    // Segmente wiederholen, bis die gesamte Laufachse gefüllt ist.
    // Eine Länge Vorlauf/Nachlauf, damit an den Rändern keine Lücke entsteht.
    let a = -this.offset - segLength
    let guard = 0
    while (a < axisLength + segLength && guard < 1000) {
      if (isVertical) {
        ctx.fillText(text, textX, a) // Schrift bleibt waagerecht, Zeile wandert
      } else {
        ctx.fillText(text, a, lineY)
      }
      a += segLength
      guard++
    }

    ctx.restore()
  }
}
