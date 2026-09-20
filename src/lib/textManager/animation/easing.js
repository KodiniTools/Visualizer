/**
 * Easing-Kurven der Text-Animationen.
 *
 * ⚠️ NICHT durch audio/EasingFunctions.js ersetzen: dort sind easeIn/easeOut
 * KUBISCH (t³), hier QUADRATISCH (t²). Ein Austausch würde jede bestehende
 * Text-Animation sichtbar verändern.
 *
 * Bisher dreimal identisch inline in _getFadeOpacity, _getScaleValue und
 * _getSlideOffset definiert – 1:1 übernommen.
 *
 * @module textManager/animation/easing
 */

/**
 * @param {number} t - Fortschritt 0–1
 * @param {'linear'|'easeIn'|'easeOut'|'ease'} [easing] - Default: 'ease' (ease-in-out)
 * @returns {number} gekrümmter Fortschritt 0–1
 */
export function applyEasing(t, easing) {
  switch (easing) {
    case 'linear':
      return t
    case 'easeIn':
      return t * t
    case 'easeOut':
      return 1 - (1 - t) * (1 - t)
    case 'ease':
    default:
      // Ease-In-Out
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }
}
