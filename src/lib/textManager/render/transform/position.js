/**
 * Position eines Text-Objekts für einen Frame.
 *
 * @module textManager/render/transform/position
 */
import { getMotionOffset } from '../../../audio/index.js'
import { getSlideOffset } from '../../animation/slide.js'
import { activeEffects } from '../effects.js'

/**
 * Basis-Position aus den relativen Koordinaten plus Slide-Animation und alle
 * audio-reaktiven Bewegungen.
 *
 * @param {object} textObj
 * @param {object|null} audioReactive
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} [now] - Zeitstempel in ms
 * @returns {{pixelX: number, pixelY: number}}
 */
export function computePosition(textObj, audioReactive, canvasWidth, canvasHeight, now) {
  const fx = activeEffects(audioReactive)

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

  return { pixelX, pixelY }
}
