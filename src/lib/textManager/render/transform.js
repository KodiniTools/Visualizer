/**
 * Geometrie und Deckkraft eines Text-Objekts für einen Frame.
 *
 * Bündelt die Rechen-Phase von `drawText`: statische Werte, Animationen und
 * audio-reaktive Effekte ergeben zusammen Deckkraft, Position und
 * Transformation. Die Canvas-Transformation wird getrennt angewandt, damit
 * die Berechnung ohne Canvas testbar bleibt.
 *
 * @module textManager/render/transform
 */
import { getMotionOffset } from '../../audio/index.js'
import { getFadeOpacity } from '../animation/fade.js'
import { getScaleValue } from '../animation/scale.js'
import { getSlideOffset } from '../animation/slide.js'
import { getDisplayOpacity } from '../animation/displayOpacity.js'
import { activeEffects } from './effects.js'

/**
 * @typedef {object} TextTransform
 * @property {number} opacity - finale Deckkraft 0–1 (ctx.globalAlpha)
 * @property {number} pixelX - Basis-Position X in Pixeln
 * @property {number} pixelY - Basis-Position Y in Pixeln
 * @property {number} scale - Gesamt-Skalierung
 * @property {number} totalRotation - Drehung in Grad (statisch + audio)
 * @property {number} skewX - Scherung X in Grad
 * @property {number} skewY - Scherung Y in Grad
 * @property {number} stretchX - Elastic-Stretch X
 * @property {number} stretchY - Elastic-Stretch Y
 * @property {number} flipScaleX - Beat-Flip Spiegelung
 * @property {number} strobeBrightnessMultiplier - 100 = kein Strobe
 */

/**
 * Berechnet Deckkraft, Position und Transformation für einen Frame.
 *
 * ⚠️ Die Reihenfolge der Animations-Aufrufe ist bedeutsam: Fade und
 * Anzeigedauer laufen VOR Slide und Scale, weil `getDisplayOpacity` die
 * Startzeitpunkte der anderen Animationen liest. Wird die Reihenfolge
 * getauscht, blendet der erste Frame anders aus.
 *
 * @param {object} textObj
 * @param {object|null} audioReactive - Ergebnis von getAudioReactiveValues()
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} [now] - Zeitstempel in ms
 * @returns {TextTransform}
 */
export function computeTextTransform(textObj, audioReactive, canvasWidth, canvasHeight, now) {
  const fx = activeEffects(audioReactive)

  // ✨ TRANSPARENZ/DECKKRAFT anwenden (0-100% → 0.0-1.0)
  let opacity = (textObj.opacity !== undefined ? textObj.opacity : 100) / 100

  // Audio-reaktive Opacity moduliert den Basis-Wert (statt ihn zu überschreiben)
  if (fx && fx.opacity) {
    // fx.opacity.opacity ist 30-100, moduliert den Slider-Wert
    opacity = opacity * (fx.opacity.opacity / 100)
  }

  // ✨ FADE-ANIMATION: Opacity aus Fade-Effekt anwenden
  opacity = opacity * getFadeOpacity(textObj, now).opacity

  // ✨ ANZEIGEDAUER: Text nach eingestellter Dauer ausblenden (falls nicht permanent)
  opacity = opacity * getDisplayOpacity(textObj, now)

  // ✨ AUDIO-REAKTIV: Strobe-Effekt (Blitz bei Audio-Peaks)
  let strobeBrightnessMultiplier = 100
  if (fx && fx.strobe) {
    opacity = opacity * (fx.strobe.strobeOpacity || 1.0)
    strobeBrightnessMultiplier = fx.strobe.strobeBrightness || 100
  }

  // Basis-Position berechnen
  let pixelX = textObj.relX * canvasWidth
  let pixelY = textObj.relY * canvasHeight

  // ✨ SLIDE-ANIMATION: Position-Offset aus Slide-Effekt anwenden
  const slideResult = getSlideOffset(textObj, canvasWidth, canvasHeight, now)
  pixelX += slideResult.offsetX
  pixelY += slideResult.offsetY

  if (fx) {
    // ✨ AUDIO-REAKTIV: Shake (Erschütterung), Bounce (Hüpfen), Swing (Pendeln)
    if (fx.shake) {
      pixelX += fx.shake.shakeX || 0
      pixelY += fx.shake.shakeY || 0
    }
    if (fx.bounce) pixelY += fx.bounce.bounceY || 0
    if (fx.swing) pixelX += fx.swing.swingX || 0

    // ✨ AUDIO-REAKTIV: Weitere Bewegungspfade (Orbit, Acht, Spirale, Schweben,
    // Impuls-Shake) – gemeinsame Engine mit den Canvas-Bildern
    const extraMotion = getMotionOffset(
      Object.assign({}, fx.orbit, fx.figure8, fx.spiral, fx.float, fx.impulseShake),
    )
    pixelX += extraMotion.x
    pixelY += extraMotion.y
  }

  // ✨ AUDIO-REAKTIV: Scale-Effekt (pulsieren) und Beat-Puls
  let scale = fx && fx.scale ? fx.scale.scale : 1.0
  if (fx && fx.beatPulse) scale *= fx.beatPulse.scale || 1.0

  // ✨ AUDIO-REAKTIV: Zoom-Punch, BPM-Puls, Frequenz-Split (Skalierung) und Beat-Flip
  let flipScaleX = 1
  if (fx) {
    for (const key of ['zoomPunch', 'bpmPulse', 'freqSplit']) {
      if (fx[key] && typeof fx[key].scale === 'number') scale *= fx[key].scale
    }
    if (fx.beatFlip && typeof fx.beatFlip.flipScaleX === 'number') {
      const f = fx.beatFlip.flipScaleX
      flipScaleX = Math.abs(f) < 0.02 ? 0.02 * Math.sign(f || 1) : f
    }
  }

  // ✨ SCALE-ANIMATION: Scale aus Animation anwenden
  scale = scale * getScaleValue(textObj, now).scale

  // ✨ AUDIO-REAKTIV: 3D-Perspektive-Effekt (Skalierung + Scherung)
  let skewX = 0
  let skewY = 0
  if (fx && fx.perspective3d) {
    const p3d = fx.perspective3d
    scale = scale * (p3d.perspective3dScale || 1.0)
    skewX = p3d.perspective3dSkewX || 0
    skewY = p3d.perspective3dSkewY || 0
  }

  // ✨ AUDIO-REAKTIV: Skew-Effekt (Verzerrung)
  if (fx && fx.skew) {
    skewX += fx.skew.skewX || 0
    skewY += fx.skew.skewY || 0
  }

  // ✨ AUDIO-REAKTIV: Rotation-Effekt (oszillierende Drehung)
  const audioRotation = fx && fx.rotation ? fx.rotation.rotationAngle || 0 : 0

  // ✨ AUDIO-REAKTIV: Elastic-Effekt (Gummi-Verformung)
  let stretchX = 1.0
  let stretchY = 1.0
  if (fx && fx.elastic) {
    stretchX = fx.elastic.stretchX || 1.0
    stretchY = fx.elastic.stretchY || 1.0
  }

  return {
    opacity,
    pixelX,
    pixelY,
    scale,
    totalRotation: (textObj.rotation || 0) + audioRotation,
    skewX,
    skewY,
    stretchX,
    stretchY,
    flipScaleX,
    strobeBrightnessMultiplier,
  }
}

/**
 * Wendet Rotation, Skalierung, Beat-Flip und Scherung um die Text-Position an.
 * Ohne wirksame Transformation bleibt der Context unberührt.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {TextTransform} t
 */
export function applyTextTransform(ctx, t) {
  const { pixelX, pixelY, scale, totalRotation, skewX, skewY, stretchX, stretchY, flipScaleX } = t

  const hasElastic = stretchX !== 1.0 || stretchY !== 1.0
  const hasTransform =
    totalRotation !== 0 ||
    scale !== 1.0 ||
    skewX !== 0 ||
    skewY !== 0 ||
    hasElastic ||
    flipScaleX !== 1
  if (!hasTransform) return

  ctx.translate(pixelX, pixelY)
  if (totalRotation !== 0) {
    ctx.rotate((totalRotation * Math.PI) / 180)
  }
  // ✨ Elastic: Asymmetrische Skalierung (Stretch)
  if (hasElastic) {
    ctx.scale(stretchX * scale, stretchY * scale)
  } else if (scale !== 1.0) {
    ctx.scale(scale, scale)
  }
  // ✨ Beat-Flip: horizontale Spiegelung im Takt
  if (flipScaleX !== 1) {
    ctx.scale(flipScaleX, 1)
  }
  // ✨ Skew-Transformation anwenden (Scheren-Effekt)
  if (skewX !== 0 || skewY !== 0) {
    // ctx.transform(a, b, c, d, e, f) - b und c sind die Scherfaktoren
    const skewXRad = (skewX * Math.PI) / 180
    const skewYRad = (skewY * Math.PI) / 180
    ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0)
  }
  ctx.translate(-pixelX, -pixelY)
}
