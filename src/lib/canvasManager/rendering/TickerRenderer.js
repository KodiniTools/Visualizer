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
    // Beat-Puls (0..1): steigt bei einem Beat, klingt ab und treibt – je nach
    // gewähltem Modus – die verschiedenen Audio-Animationen an.
    this.pulse = 0
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

    // Audio-Reaktivität: ein Beat erzeugt einen Puls (0..1), der abklingt und –
    // je nach gewähltem Modus – eine andere Animation antreibt.
    const reactive = !!settings.audioReactive
    const reactMode = reactive ? settings.reactMode || 'tempo' : 'none'
    const strength = Math.max(0, Math.min(100, settings.beatIntensity ?? 60)) / 100

    if (reactive && audioData) {
      const level = (audioData.bass ?? audioData.smoothBass ?? 0) / 255
      const beat = this.beatDetector.detect(level * 255, now)
      if (beat.isBeat) {
        this.pulse = Math.min(1, 0.6 + beat.beatIntensity * 0.4)
      }
    } else {
      this.pulse = 0
    }
    // Puls abklingen lassen
    this.pulse *= Math.max(0, 1 - dt * 4)
    if (this.pulse < 0.005) this.pulse = 0

    // Normalisierte Reaktionsstärke dieses Frames (0..1)
    const react = this.pulse * strength

    // Tempo-Modus: Geschwindigkeit pulsiert zum Beat
    const currentSpeed = reactMode === 'tempo' ? baseSpeed * (1 + react * 3) : baseSpeed

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

    // Abstand zwischen den Wiederholungen entlang der Laufachse:
    // volle Laufstrecke + Ausdehnung des Textes. Dadurch ist immer nur EINE
    // Textinstanz gleichzeitig auf dem Canvas – die nächste erscheint erst am
    // gegenüberliegenden Rand, wenn die vorherige den Canvas verlassen hat.
    const segLength = isVertical ? height + lineHeight : width + textWidth

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

    // Umrandung (Kontur) vorbereiten
    const doStroke = settings.strokeEnabled && (settings.strokeWidth || 0) > 0
    if (doStroke) {
      ctx.lineWidth = settings.strokeWidth
      ctx.strokeStyle = settings.strokeColor || '#000000'
      ctx.lineJoin = 'round'
      ctx.miterLimit = 2
    }
    // Schatten (Farbe + Dicke/Weichzeichnung) vorbereiten
    const doShadow = settings.shadowEnabled && (settings.shadowBlur || 0) > 0

    // ── Audio-Animationen dieses Frames (nur bei aktiver Reaktivität) ──
    // scale  : Text pulsiert in der Größe zum Beat
    // shake  : Text zittert kurz beim Beat
    // glow   : ein Leuchten pulsiert um den Text zum Beat
    // opacity: Text ist zwischen den Beats gedimmt und blitzt beim Beat auf
    const doScale = reactMode === 'scale' && react > 0.001
    const doShake = reactMode === 'shake' && react > 0.001
    const doGlow = reactMode === 'glow' && react > 0.001
    const doOpacity = reactMode === 'opacity'

    const scaleFactor = doScale ? 1 + react * 0.4 : 1
    const shakeOffset = doShake ? Math.sin(now / 24) * react * fontSize * 0.25 : 0
    // Zwischen den Beats gedimmt (bis −60 %), auf dem Beat wieder volle Deckkraft
    const textAlpha = doOpacity ? Math.max(0, Math.min(1, 1 - strength * 0.6 + react * 0.6)) : 1
    const glowColor = settings.shadowEnabled ? settings.shadowColor : settings.color || '#ffffff'

    // Zeichnet eine Textinstanz inkl. Schatten/Glühen, Umrandung und der
    // aktiven Audio-Animation. Der Schatten wird vom äußersten sichtbaren Rand
    // geworfen (Umrandung, sonst Füllung); die Füllung darüber wirft keinen
    // zweiten Schatten.
    const paint = (x, y) => {
      const transform = scaleFactor !== 1 || shakeOffset !== 0
      if (transform) {
        ctx.save()
        if (shakeOffset) ctx.translate(0, shakeOffset)
        if (scaleFactor !== 1) {
          const px = x + textWidth / 2
          ctx.translate(px, y)
          ctx.scale(scaleFactor, scaleFactor)
          ctx.translate(-px, -y)
        }
      }
      if (doOpacity) ctx.globalAlpha = textAlpha

      if (doGlow) {
        ctx.shadowColor = glowColor
        ctx.shadowBlur = (doShadow ? settings.shadowBlur : 0) + react * 28
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      } else if (doShadow) {
        ctx.shadowColor = settings.shadowColor || '#000000'
        ctx.shadowBlur = settings.shadowBlur
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      }

      if (doStroke) {
        ctx.strokeText(text, x, y)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }
      ctx.fillText(text, x, y)

      if (doOpacity) ctx.globalAlpha = 1
      if (transform) ctx.restore()
    }

    // Segmente wiederholen, bis die gesamte Laufachse gefüllt ist.
    // Eine Länge Vorlauf/Nachlauf, damit an den Rändern keine Lücke entsteht.
    let a = -this.offset - segLength
    let guard = 0
    while (a < axisLength + segLength && guard < 1000) {
      if (isVertical) {
        paint(textX, a) // Schrift bleibt waagerecht, Zeile wandert
      } else {
        paint(a, lineY)
      }
      a += segLength
      guard++
    }

    ctx.restore()
  }
}
