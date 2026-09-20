/**
 * Scale-Animation: Rein-/Rauszoomen zwischen startScale und endScale.
 *
 * @module textManager/animation/scale
 */
import { resolveTimeline } from './timeline.js'

/**
 * Berechnet den Skalierungsfaktor für die Scale-Animation.
 *
 * @param {object} textObj
 * @param {number} [now] - Zeitstempel in ms
 * @returns {{scale: number, isComplete: boolean}}
 */
export function getScaleValue(textObj, now = Date.now()) {
  const animation = textObj.animation

  // Wenn keine Animation oder Scale nicht aktiviert
  if (!animation || !animation.scale || !animation.scale.enabled) {
    return { scale: 1, isComplete: true }
  }

  const scaleAnim = animation.scale
  const startScale = scaleAnim.startScale !== undefined ? scaleAnim.startScale : 0
  const endScale = scaleAnim.endScale !== undefined ? scaleAnim.endScale : 1

  const { p, isComplete } = resolveTimeline(animation, scaleAnim, 'scaleStartTime', now)
  return { scale: startScale + (endScale - startScale) * p, isComplete }
}

/**
 * Startet die Scale-Animation neu.
 * @param {object} textObj
 */
export function restartScale(textObj) {
  if (!textObj || !textObj.animation) return

  textObj.animation._state.scaleStartTime = null
}
