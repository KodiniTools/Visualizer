/**
 * Gemeinsame Canvas-Zeichenhilfen für Audio-Reaktiv-Effekte – genutzt von
 * Hintergrund, Kacheln, Videos und Video-Hintergründen, damit alle Ziele die
 * Effektwerte der gemeinsamen Engine identisch darstellen.
 *
 * @module canvasManager/rendering/audioReactiveDraw
 */
import { getMotionOffset } from '../../audio/AudioReactiveEffects.js'
import { combinedScale, strongestGlow } from '../../audio/audioReactiveEngine.js'

/**
 * Wendet alle Filter-Effekte (Farbfilter, Strobe, Farb-Strobe, Frequenz-Split-
 * Farbton) sowie das stärkste Leuchten als Schatten auf den Kontext an.
 * Bestehende `ctx.filter`-Werte bleiben erhalten (werden ergänzt).
 */
export function applyAudioReactiveFilters(ctx, audioReactive) {
  if (!audioReactive || !audioReactive.hasEffects) return

  let currentFilter = ctx.filter || 'none'
  if (currentFilter === 'none') currentFilter = ''
  const effects = audioReactive.effects

  if (effects.hue) currentFilter += ` hue-rotate(${effects.hue.hueRotate}deg)`
  if (effects.brightness) currentFilter += ` brightness(${effects.brightness.brightness}%)`
  if (effects.saturation) currentFilter += ` saturate(${effects.saturation.saturation}%)`
  if (effects.blur) currentFilter += ` blur(${effects.blur.blur}px)`
  if (effects.contrast) currentFilter += ` contrast(${effects.contrast.contrast}%)`
  if (effects.grayscale) currentFilter += ` grayscale(${effects.grayscale.grayscale}%)`
  if (effects.sepia) currentFilter += ` sepia(${effects.sepia.sepia}%)`
  if (effects.invert) currentFilter += ` invert(${effects.invert.invert}%)`
  if (effects.strobe && effects.strobe.strobeBrightness !== 100) {
    currentFilter += ` brightness(${effects.strobe.strobeBrightness}%)`
  }
  if (effects.freqSplit && effects.freqSplit.hueRotate) {
    currentFilter += ` hue-rotate(${effects.freqSplit.hueRotate}deg)`
  }
  if (effects.colorStrobe) {
    currentFilter += ` hue-rotate(${effects.colorStrobe.hueRotate}deg) saturate(${effects.colorStrobe.saturate}%)`
  }

  const glow = strongestGlow(effects)
  if (glow) {
    ctx.shadowColor = glow.glowColor
    ctx.shadowBlur = glow.glowBlur
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  if (
    effects.strobe &&
    effects.strobe.strobeOpacity !== undefined &&
    effects.strobe.strobeOpacity !== 1
  ) {
    ctx.globalAlpha = ctx.globalAlpha * effects.strobe.strobeOpacity
  }

  if (currentFilter.trim()) ctx.filter = currentFilter.trim()
}

/**
 * Wendet die geometrischen Effekte (Skalierung, Rotation, Beat-Flip, Skew,
 * Perspektive, Bewegungspfade) um das Zentrum (cx, cy) auf den Kontext an –
 * dieselbe Semantik wie bei Canvas-Bildern.
 * @returns {boolean} true, wenn transformiert wurde
 */
export function applyAudioReactiveTransform(ctx, audioReactive, cx, cy) {
  if (!audioReactive || !audioReactive.hasEffects) return false
  const fx = audioReactive.effects

  const scale = combinedScale(fx)
  const rotationDeg = fx.rotation ? fx.rotation.rotation || 0 : 0
  let flipScaleX = 1
  if (fx.beatFlip && typeof fx.beatFlip.flipScaleX === 'number') {
    const f = fx.beatFlip.flipScaleX
    flipScaleX = Math.abs(f) < 0.02 ? 0.02 * Math.sign(f || 1) : f
  }
  const skew = fx.skew
  const persp = fx.perspective
  const motion = getMotionOffset(Object.assign({}, ...Object.values(fx)))

  const hasTransform =
    scale !== 1 ||
    rotationDeg !== 0 ||
    flipScaleX !== 1 ||
    !!skew ||
    !!persp ||
    motion.x !== 0 ||
    motion.y !== 0
  if (!hasTransform) return false

  ctx.translate(cx + motion.x, cy + motion.y)
  if (rotationDeg !== 0) ctx.rotate((rotationDeg * Math.PI) / 180)
  if (scale !== 1 || flipScaleX !== 1) ctx.scale(scale * flipScaleX, scale)
  if (skew) {
    const skewXRad = ((skew.skewX || 0) * Math.PI) / 180
    const skewYRad = ((skew.skewY || 0) * Math.PI) / 180
    ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0)
  }
  if (persp) {
    // Canvas 2D kennt keine echte Perspektive: Simulation über asymmetrische
    // Skalierung + leichte Scherung (wie bei Canvas-Bildern).
    const rotX = ((persp.perspectiveRotateX || 0) * Math.PI) / 180
    const rotY = ((persp.perspectiveRotateY || 0) * Math.PI) / 180
    ctx.scale(1 - Math.abs(Math.sin(rotY)) * 0.15, 1 - Math.abs(Math.sin(rotX)) * 0.15)
    ctx.transform(1, Math.sin(rotX) * 0.1, Math.sin(rotY) * 0.1, 1, 0, 0)
  }
  ctx.translate(-cx, -cy)
  return true
}

/**
 * Zeichnet die Overlay-Effekte (audio-reaktive Kontur, Vignette-Puls) über
 * einer rechteckigen Fläche.
 */
export function drawAudioReactiveOverlays(ctx, audioReactive, x, y, w, h) {
  if (!audioReactive || !audioReactive.hasEffects) return
  const fx = audioReactive.effects

  if (fx.border && fx.border.borderWidth > 0.5) {
    const bw = fx.border.borderWidth
    ctx.save()
    ctx.filter = 'none'
    ctx.globalAlpha = Math.min(1, fx.border.borderOpacity ?? 1)
    ctx.lineWidth = bw
    ctx.strokeStyle = '#ffffff'
    if (fx.border.borderGlow > 0) {
      ctx.shadowColor = 'rgba(139, 92, 246, 0.9)'
      ctx.shadowBlur = fx.border.borderGlow
    }
    ctx.strokeRect(x + bw / 2, y + bw / 2, w - bw, h - bw)
    ctx.restore()
  }

  if (fx.vignettePulse) {
    const strength = fx.vignettePulse.vignetteStrength || 0
    if (strength > 0.01) {
      const cx = x + w / 2
      const cy = y + h / 2
      const grad = ctx.createRadialGradient(
        cx,
        cy,
        Math.min(w, h) * 0.3,
        cx,
        cy,
        Math.max(w, h) * 0.7,
      )
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, strength).toFixed(3)})`)
      ctx.save()
      ctx.filter = 'none'
      ctx.shadowBlur = 0
      ctx.shadowColor = 'transparent'
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = grad
      ctx.fillRect(x, y, w, h)
      ctx.restore()
    }
  }
}

/**
 * Zeichnet ein Medium (Bild/Video) mit oder ohne chromatische Aberration.
 * Ohne aktiven Chromatik-Effekt ein normales drawImage.
 */
export function drawMediaWithAudioReactive(ctx, audioReactive, media, dx, dy, dw, dh) {
  const chromatic = audioReactive?.effects?.chromatic
  if (chromatic && chromatic.chromaticOffset > 0.5) {
    drawMediaChromatic(ctx, media, dx, dy, dw, dh, chromatic.chromaticOffset)
  } else {
    ctx.drawImage(media, dx, dy, dw, dh)
  }
}

/**
 * Chromatische Aberration: Medium in drei verschobenen, eingefärbten Kanälen
 * (Screen-Blend) plus Original – wie bei Canvas-Bildern.
 */
export function drawMediaChromatic(ctx, media, dx, dy, dw, dh, offset) {
  const baseFilter = ctx.filter && ctx.filter !== 'none' ? ctx.filter : ''
  const baseAlpha = ctx.globalAlpha
  try {
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = baseAlpha * 0.8
    ctx.filter = `${baseFilter} saturate(0%) brightness(100%) sepia(100%) hue-rotate(-50deg) saturate(600%)`
    ctx.drawImage(media, dx + offset, dy, dw, dh)
    ctx.filter = `${baseFilter} saturate(0%) brightness(100%) sepia(100%) hue-rotate(50deg) saturate(600%)`
    ctx.drawImage(media, dx, dy, dw, dh)
    ctx.filter = `${baseFilter} saturate(0%) brightness(100%) sepia(100%) hue-rotate(170deg) saturate(600%)`
    ctx.drawImage(media, dx - offset, dy, dw, dh)
    ctx.globalCompositeOperation = 'source-over'
    ctx.filter = baseFilter || 'none'
    ctx.globalAlpha = baseAlpha * 0.4
    ctx.drawImage(media, dx, dy, dw, dh)
  } catch (e) {
    console.warn('[audioReactiveDraw] Chromatic effect error:', e)
  } finally {
    ctx.globalAlpha = baseAlpha
    ctx.globalCompositeOperation = 'source-over'
  }
}
