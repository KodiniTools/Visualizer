import { calculateEffectValue, getMotionOffset } from '../../audio/AudioReactiveEffects.js'
import {
  buildFilterString,
  combinedScale,
  computeAudioReactiveValues,
  strongestGlow,
} from '../../audio/audioReactiveEngine.js'

// Lauftext-eigene Effekte; alles andere kommt aus der gemeinsamen Bild-Engine.
function calculateTickerEffect(name, level) {
  switch (name) {
    case 'tempo':
      // Laufgeschwindigkeit pulsiert mit dem Pegel (bis 4×)
      return { speedFactor: 1 + level * 3 }
    case 'opacity':
      // Zwischen den Beats gedimmt (40 %), auf dem Beat volle Deckkraft
      return { opacity: 0.4 + level * 0.6 }
    default:
      return calculateEffectValue(name, level)
  }
}

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

    // Audio-Reaktivität: identische Konfiguration/Engine wie bei Canvas-Bildern
    // (settings.audioFx) plus die Lauftext-Effekte Tempo und Deckkraft.
    const audioFx = settings.audioReactive ? settings.audioFx : null
    const reactive = computeAudioReactiveValues(audioFx, audioFx, audioData, calculateTickerEffect)
    const fx = reactive ? reactive.effects : {}

    // Tempo-Effekt: Geschwindigkeit pulsiert mit dem Pegel
    const currentSpeed = baseSpeed * (fx.tempo?.speedFactor ?? 1)

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
    // Geometrie um das Zentrum jeder Textinstanz: Skalierung (alle scale-
    // liefernden Effekte), Rotation, Beat-Flip, Skew, Bewegungspfade.
    const scaleFactor = reactive ? combinedScale(fx) : 1
    const rotationDeg = fx.rotation ? fx.rotation.rotation || 0 : 0
    let flipScaleX = 1
    if (fx.beatFlip && typeof fx.beatFlip.flipScaleX === 'number') {
      const f = fx.beatFlip.flipScaleX
      flipScaleX = Math.abs(f) < 0.02 ? 0.02 * Math.sign(f || 1) : f
    }
    const skew = fx.skew || null
    const motion = reactive
      ? getMotionOffset(Object.assign({}, ...Object.values(fx)))
      : { x: 0, y: 0 }
    const hasTransform =
      scaleFactor !== 1 ||
      rotationDeg !== 0 ||
      flipScaleX !== 1 ||
      !!skew ||
      motion.x !== 0 ||
      motion.y !== 0

    // Filter (Farbton, Helligkeit, Sättigung, …, Strobe-Helligkeit, Farb-Strobe)
    const filterString = reactive ? buildFilterString(fx) : ''
    // Deckkraft: Lauftext-Effekt "Blitzen" × Strobe
    const textAlpha =
      (fx.opacity?.opacity ?? 1) *
      (fx.strobe?.strobeOpacity !== undefined ? fx.strobe.strobeOpacity : 1)
    // Leuchten: stärkstes aus Glow/Beat-Puls/BPM-Puls/Frequenz-Split
    const glow = reactive ? strongestGlow(fx) : null

    // Zeichnet eine Textinstanz inkl. Schatten/Glühen, Umrandung und der
    // aktiven Audio-Animationen. Der Schatten wird vom äußersten sichtbaren Rand
    // geworfen (Umrandung, sonst Füllung); die Füllung darüber wirft keinen
    // zweiten Schatten.
    const paint = (x, y) => {
      ctx.save()
      if (hasTransform) {
        const cx = x + textWidth / 2
        ctx.translate(cx + motion.x, y + motion.y)
        if (rotationDeg !== 0) ctx.rotate((rotationDeg * Math.PI) / 180)
        if (scaleFactor !== 1 || flipScaleX !== 1) ctx.scale(scaleFactor * flipScaleX, scaleFactor)
        if (skew) {
          const skewXRad = ((skew.skewX || 0) * Math.PI) / 180
          const skewYRad = ((skew.skewY || 0) * Math.PI) / 180
          ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0)
        }
        ctx.translate(-cx, -y)
      }
      if (filterString) ctx.filter = filterString
      if (textAlpha !== 1) ctx.globalAlpha = Math.max(0, Math.min(1, textAlpha))

      if (glow) {
        ctx.shadowColor = glow.glowColor
        ctx.shadowBlur = (doShadow ? settings.shadowBlur : 0) + glow.glowBlur
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
      ctx.restore()
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
