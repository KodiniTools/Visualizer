/**
 * Geometrie und Deckkraft eines Text-Objekts für einen Frame.
 *
 * Bündelt die Rechen-Phase von `drawText` aus drei unabhängigen Teilen:
 * Deckkraft, Position und Verformung. Die Canvas-Transformation wird getrennt
 * angewandt (./apply.js), damit die Berechnung ohne Canvas testbar bleibt.
 *
 * @module textManager/render/transform
 */
import { computeOpacity } from './opacity.js'
import { computePosition } from './position.js'
import { computeDeformation } from './deformation.js'

export { applyTextTransform } from './apply.js'
export { computeOpacity } from './opacity.js'
export { computePosition } from './position.js'
export { computeDeformation } from './deformation.js'

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
 * Berechnet Deckkraft, Position und Verformung für einen Frame.
 *
 * ⚠️ Die Reihenfolge der drei Teile ist bedeutsam, weil die Animationen ihre
 * Startzeitpunkte beim ersten Aufruf selbst setzen: `computeOpacity` wertet
 * über `getDisplayOpacity` die Startzeitpunkte von Slide und Scale aus, die
 * `computePosition` und `computeDeformation` erst anlegen. Wird die Reihenfolge
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
  const { opacity, strobeBrightnessMultiplier } = computeOpacity(textObj, audioReactive, now)
  const { pixelX, pixelY } = computePosition(textObj, audioReactive, canvasWidth, canvasHeight, now)
  const deformation = computeDeformation(textObj, audioReactive, now)

  return { opacity, strobeBrightnessMultiplier, pixelX, pixelY, ...deformation }
}
