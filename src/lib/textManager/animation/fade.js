/**
 * Fade-Animation: Ein- und Ausblenden über die Deckkraft.
 *
 * @module textManager/animation/fade
 */
import { resolveTimeline } from './timeline.js'
import { ensureAnimationState } from './state.js'

/**
 * Berechnet die Opacity für die Fade-Animation (0–1).
 *
 * @param {object} textObj
 * @param {number} [now] - Zeitstempel in ms
 * @returns {{opacity: number, isComplete: boolean}}
 */
export function getFadeOpacity(textObj, now = Date.now()) {
  const animation = textObj.animation

  // Wenn keine Animation oder Fade nicht aktiviert
  if (!animation || !animation.fade || !animation.fade.enabled) {
    return { opacity: 1, isComplete: true }
  }

  const fade = animation.fade
  const state = ensureAnimationState(animation)

  // Phasen-Marker, den useTextAnimations beim Neustart zurücksetzt
  if (!state.fadeStartTime) {
    state.fadePhase = 'waiting'
  }

  const { p, isComplete } = resolveTimeline(animation, fade, 'fadeStartTime', now)
  return { opacity: p, isComplete }
}

/**
 * Startet die Fade-Animation neu.
 * @param {object} textObj
 */
export function restartFade(textObj) {
  if (!textObj || !textObj.animation) return

  const state = ensureAnimationState(textObj.animation)
  state.fadeStartTime = null
  state.fadePhase = null
}
