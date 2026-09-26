/**
 * Render-Schritte für MultiImageManager.drawImages().
 *
 * Jede Funktion bildet genau einen Schritt der Bild-Pipeline ab. Die REIHENFOLGE
 * der Canvas-Operationen ist Teil des Verhaltens (Transformationen sind nicht
 * kommutativ, Filter/Alpha werden überschrieben) – siehe
 * src/__tests__/canvas/multiImageDrawImages.spec.js.
 *
 * Bounds-Objekte haben die Form { x, y, width, height } (Pixel).
 */

/**
 * Führt `fn` mit einer Transformation um den Punkt (cx, cy) aus.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {() => void} fn
 */
export function transformAround(ctx, cx, cy, fn) {
  ctx.translate(cx, cy)
  fn()
  ctx.translate(-cx, -cy)
}

function centerOf(b) {
  return [b.x + b.width / 2, b.y + b.height / 2]
}

/** Skaliert Bounds um ihr Zentrum (neues Objekt). */
export function scaleBoundsFromCenter(b, factor) {
  const [cx, cy] = centerOf(b)
  const width = b.width * factor
  const height = b.height * factor
  return { x: cx - width / 2, y: cy - height / 2, width, height }
}

/**
 * Rechnet den Slideshow-Übergang in die Eintritts-Animation ein.
 * Translate-Werte des Übergangs sind relativ zur Bildgröße.
 */
export function mergeTransitionTransform(animTransform, transition, bounds) {
  if (!transition) return animTransform
  return {
    ...animTransform,
    translateX: animTransform.translateX + (transition.translateX || 0) * bounds.width,
    translateY: animTransform.translateY + (transition.translateY || 0) * bounds.height,
    scale: animTransform.scale * (transition.scale ?? 1),
    rotation: animTransform.rotation + (transition.rotation || 0),
  }
}

/** Slideshow „An Workspace anpassen“: auf den Workspace-Bereich beschneiden. */
export function clipToWorkspace(ctx, clip, canvas) {
  if (!clip) return
  ctx.beginPath()
  ctx.rect(
    clip.relX * canvas.width,
    clip.relY * canvas.height,
    clip.relWidth * canvas.width,
    clip.relHeight * canvas.height,
  )
  ctx.clip()
}

/** Slideshow-Übergang „Wischen“: nur den aufgedeckten Teil des Bildes zeigen. */
export function clipToWipe(ctx, wipe, bounds) {
  if (!wipe) return
  const start = Math.max(0, Math.min(1, wipe.start))
  const end = Math.max(start, Math.min(1, wipe.end))
  ctx.beginPath()
  ctx.rect(bounds.x + start * bounds.width, bounds.y, (end - start) * bounds.width, bounds.height)
  ctx.clip()
}

/**
 * CSS-Filter-Fragmente der audio-reaktiven Effekte, in fester Reihenfolge.
 * @param {Record<string, any>} fx
 * @returns {string} z.B. " hue-rotate(30deg) blur(2px)" (führendes Leerzeichen je Fragment)
 */
export function buildAudioFilterString(fx) {
  let filter = ''
  if (fx.hue) filter += ` hue-rotate(${fx.hue.hueRotate}deg)`
  // Frequenz-Split: Höhen verschieben den Farbton
  if (fx.freqSplit && fx.freqSplit.hueRotate) filter += ` hue-rotate(${fx.freqSplit.hueRotate}deg)`
  // Beat-Color-Strobe: Farbton wechselt pro Beat, Sättigung pulst mit
  if (fx.colorStrobe) {
    filter += ` hue-rotate(${fx.colorStrobe.hueRotate}deg) saturate(${fx.colorStrobe.saturate}%)`
  }
  if (fx.brightness) filter += ` brightness(${fx.brightness.brightness}%)`
  if (fx.saturation) filter += ` saturate(${fx.saturation.saturation}%)`
  if (fx.blur) filter += ` blur(${fx.blur.blur}px)`
  if (fx.contrast) filter += ` contrast(${fx.contrast.contrast}%)`
  if (fx.grayscale) filter += ` grayscale(${fx.grayscale.grayscale}%)`
  if (fx.sepia) filter += ` sepia(${fx.sepia.sepia}%)`
  if (fx.invert) filter += ` invert(${fx.invert.invert}%)`
  // Strobe: zusätzlicher Brightness-Boost bei Peaks
  if (fx.strobe && fx.strobe.strobeBrightness !== 100) {
    filter += ` brightness(${fx.strobe.strobeBrightness}%)`
  }
  return filter
}

/**
 * Stärkstes Leuchten aus Glow/Beat-Puls/BPM-Puls/Frequenz-Split
 * (mehrere Rhythmus-Effekte liefern Glow). Bei Gleichstand gewinnt der frühere.
 * @returns {{ glowBlur: number, glowColor: string } | null}
 */
export function pickStrongestGlow(fx) {
  const candidates = [fx.glow, fx.beatPulse, fx.bpmPulse, fx.freqSplit].filter(
    (e) => e && e.glowBlur > 0,
  )
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (b.glowBlur > a.glowBlur ? b : a))
}

/** Hängt audio-reaktive Filter an ctx.filter an und setzt den Glow-Schatten. */
export function applyAudioFilters(ctx, fx) {
  let currentFilter = ctx.filter || 'none'
  if (currentFilter === 'none') currentFilter = ''
  currentFilter += buildAudioFilterString(fx)

  const glow = pickStrongestGlow(fx)
  if (glow) {
    ctx.shadowColor = glow.glowColor
    ctx.shadowBlur = glow.glowBlur
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  if (currentFilter.trim()) {
    ctx.filter = currentFilter.trim()
  }
}

/** Slideshow-Übergang „Weichzeichnen“: Blur an die übrigen Filter anhängen. */
export function applyTransitionBlur(ctx, blur) {
  if (!(blur > 0)) return
  const base = ctx.filter && ctx.filter !== 'none' ? `${ctx.filter} ` : ''
  ctx.filter = `${base}blur(${blur.toFixed(2)}px)`
}

/**
 * Transformationen um das Bild-Zentrum (Original-Bounds), in dieser Reihenfolge:
 * Kippen (Übergang) → Rotation (statisch + audio) → Flip → Beat-Flip.
 */
export function applyBaseTransforms(ctx, bounds, { transition, fotoSettings, fx }) {
  const [cx, cy] = centerOf(bounds)

  // Slideshow-Übergang „Kippen“: horizontale Skalierung
  if (transition && transition.scaleX !== undefined && transition.scaleX !== 1) {
    transformAround(ctx, cx, cy, () => ctx.scale(Math.max(0.001, transition.scaleX), 1))
  }

  let totalRotation = fotoSettings?.rotation || 0
  if (fx?.rotation) totalRotation += fx.rotation.rotation
  if (totalRotation !== 0) {
    transformAround(ctx, cx, cy, () => ctx.rotate((totalRotation * Math.PI) / 180))
  }

  const flipH = fotoSettings?.flipH || false
  const flipV = fotoSettings?.flipV || false
  if (flipH || flipV) {
    transformAround(ctx, cx, cy, () => ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1))
  }

  // Beat-Flip: horizontale Skalierung 1 → -1 simuliert den Kartendreh
  const flipScaleX = fx?.beatFlip?.flipScaleX
  if (typeof flipScaleX === 'number' && flipScaleX !== 1) {
    // Nicht exakt 0 skalieren (unsichtbar + Matrix-Singularität vermeiden)
    const sx = Math.abs(flipScaleX) < 0.02 ? 0.02 * Math.sign(flipScaleX || 1) : flipScaleX
    transformAround(ctx, cx, cy, () => ctx.scale(sx, 1))
  }
}

/**
 * Eintritts-Animation: verschiebt/skaliert die Zeichen-Bounds und rotiert den ctx
 * um deren (neues) Zentrum.
 * @returns {{x:number,y:number,width:number,height:number}} neue Bounds
 */
export function applyEntryAnimation(ctx, bounds, anim) {
  let b = { ...bounds }
  if (anim.translateX !== 0 || anim.translateY !== 0) {
    b.x += anim.translateX
    b.y += anim.translateY
  }
  if (anim.scale !== 1) b = scaleBoundsFromCenter(b, anim.scale)
  if (anim.rotation !== 0) {
    const [cx, cy] = centerOf(b)
    transformAround(ctx, cx, cy, () => ctx.rotate((anim.rotation * Math.PI) / 180))
  }
  return b
}

/**
 * Audio-reaktive Positions-Offsets: [Effekt, x-Property, y-Property].
 * Reihenfolge = Additions-Reihenfolge (relevant für Float-Rundung).
 */
const MOTION_OFFSETS = [
  ['shake', 'shakeX', 'shakeY'],
  ['impulseShake', 'shakeX', 'shakeY'],
  ['bounce', null, 'bounceY'],
  ['swing', 'swingX', null],
  ['orbit', 'orbitX', 'orbitY'],
  ['figure8', 'figure8X', 'figure8Y'],
  ['wave', 'waveX', 'waveY'],
  ['spiral', 'spiralX', 'spiralY'],
  ['float', 'floatX', 'floatY'],
]

/** Addiert alle audio-reaktiven Bewegungs-Offsets (neues Objekt). */
export function applyMotionOffsets(bounds, fx) {
  const b = { ...bounds }
  for (const [name, xKey, yKey] of MOTION_OFFSETS) {
    const e = fx[name]
    if (!e) continue
    if (xKey) b.x += e[xKey] || 0
    if (yKey) b.y += e[yKey] || 0
  }
  return b
}

/**
 * Skew und simulierte Perspektive um das Zentrum der Zeichen-Bounds.
 * Canvas 2D hat keine echte 3D-Perspektive → asymmetrische Skalierung + Scherung.
 */
export function applyDistortion(ctx, bounds, fx) {
  const [cx, cy] = centerOf(bounds)

  if (fx.skew) {
    const skewXRad = ((fx.skew.skewX || 0) * Math.PI) / 180
    const skewYRad = ((fx.skew.skewY || 0) * Math.PI) / 180
    transformAround(ctx, cx, cy, () =>
      ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0),
    )
  }

  if (fx.perspective) {
    const rotX = ((fx.perspective.perspectiveRotateX || 0) * Math.PI) / 180
    const rotY = ((fx.perspective.perspectiveRotateY || 0) * Math.PI) / 180
    const scaleXFactor = 1 - Math.abs(Math.sin(rotY)) * 0.15
    const scaleYFactor = 1 - Math.abs(Math.sin(rotX)) * 0.15
    transformAround(ctx, cx, cy, () => {
      ctx.scale(scaleXFactor, scaleYFactor)
      ctx.transform(1, Math.sin(rotX) * 0.1, Math.sin(rotY) * 0.1, 1, 0, 0)
    })
  }
}

/**
 * Multiplikativer Skalierungsfaktor aller scale-liefernden Effekte:
 * Scale, Beat-Puls, Zoom-Punch, BPM-Puls, Frequenz-Split.
 */
export function audioScaleFactor(fx) {
  let factor = 1.0
  if (fx.scale) factor *= fx.scale.scale || 1.0
  if (fx.beatPulse) factor *= fx.beatPulse.scale || 1.0
  if (fx.zoomPunch) factor *= fx.zoomPunch.scale || 1.0
  if (fx.bpmPulse) factor *= fx.bpmPulse.scale || 1.0
  if (fx.freqSplit) factor *= fx.freqSplit.scale || 1.0
  return factor
}

/**
 * Audio-reaktive Geometrie in fester Reihenfolge: Bewegungs-Offsets →
 * Skew/Perspektive → Strobe-Deckkraft → Pulsieren (Skalierung um das Zentrum).
 * @returns {{x:number,y:number,width:number,height:number}} neue Zeichen-Bounds
 */
export function applyAudioGeometry(ctx, bounds, fx) {
  let b = applyMotionOffsets(bounds, fx)
  applyDistortion(ctx, b, fx)

  const strobeOpacity = fx.strobe?.strobeOpacity
  if (strobeOpacity !== undefined && strobeOpacity !== 1) {
    ctx.globalAlpha = ctx.globalAlpha * strobeOpacity
  }

  const scaleFactor = audioScaleFactor(fx)
  if (scaleFactor !== 1.0) b = scaleBoundsFromCenter(b, scaleFactor)
  return b
}

/**
 * Kontur-Parameter: statische Werte, von audio-reaktiver Kontur erweitert.
 * @returns {{ width: number, color: string, opacity: number, glow: number }}
 */
export function resolveBorder(fotoSettings, fx) {
  const border = {
    width: fotoSettings?.borderWidth || 0,
    color: fotoSettings?.borderColor || '#ffffff',
    opacity: (fotoSettings?.borderOpacity ?? 100) / 100,
    glow: 0,
  }
  if (fx?.border) {
    border.width = Math.max(border.width, fx.border.borderWidth)
    border.opacity = Math.max(border.opacity, fx.border.borderOpacity)
    border.glow = fx.border.borderGlow
  }
  return border
}

const CHROMATIC_CHANNELS = [
  // [x-Verschiebung in Vielfachen des Offsets, Farbton-Drehung]
  [1, -50], // Rot (rechts)
  [0, 50], // Grün (mittig)
  [-1, 170], // Blau (links)
]

/**
 * Chromatische Aberration: RGB-Kanäle mit Versatz, danach Original für Farbtreue.
 * Fehler werden geloggt, nicht geworfen.
 */
export function drawChromatic(ctx, image, b, offset) {
  try {
    const currentFilter = ctx.filter
    const currentAlpha = ctx.globalAlpha

    ctx.globalCompositeOperation = 'screen'
    for (const [dir, hue] of CHROMATIC_CHANNELS) {
      ctx.filter = `${currentFilter} saturate(0%) brightness(100%) sepia(100%) hue-rotate(${hue}deg) saturate(600%)`
      ctx.globalAlpha = currentAlpha * 0.8
      ctx.drawImage(image, dir === 0 ? b.x : b.x + dir * offset, b.y, b.width, b.height)
    }

    ctx.globalCompositeOperation = 'source-over'
    ctx.filter = currentFilter
    ctx.globalAlpha = currentAlpha * 0.4
    ctx.drawImage(image, b.x, b.y, b.width, b.height)

    ctx.globalAlpha = currentAlpha
    ctx.globalCompositeOperation = 'source-over'
  } catch (e) {
    console.warn('[MultiImageManager] Chromatic effect error:', e)
  }
}

/** Zeichnet das Bild ohne Effekte; Fehler werden geloggt, nicht geworfen. */
export function drawPlain(ctx, image, b) {
  try {
    ctx.drawImage(image, b.x, b.y, b.width, b.height)
  } catch (e) {
    console.warn('[MultiImageManager] Image render error:', e)
  }
}

/** Vignette-Puls: Ränder im Takt abdunkeln (nach dem Bild gezeichnet). */
export function drawVignette(ctx, b, strength) {
  if (!(strength > 0.01)) return
  const [cx, cy] = centerOf(b)
  const grad = ctx.createRadialGradient(
    cx,
    cy,
    Math.min(b.width, b.height) * 0.3,
    cx,
    cy,
    Math.max(b.width, b.height) * 0.7,
  )
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, strength).toFixed(3)})`)
  ctx.save()
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = grad
  ctx.fillRect(b.x, b.y, b.width, b.height)
  ctx.restore()
}
