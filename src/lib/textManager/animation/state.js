/**
 * Laufzeit-Zustand der Text-Animationen (`animation._state`).
 *
 * Der Zustand hängt am Text-Objekt, weil der Render-Loop jeden Frame neu
 * fragt: Start-Zeitpunkte dürfen dabei nicht verloren gehen.
 *
 * @module textManager/animation/state
 */

/**
 * ✅ DEFENSIVE: Stellt sicher, dass `animation._state` existiert.
 * Bisher dreimal identisch in _getFadeOpacity/_getScaleValue/_getSlideOffset.
 *
 * @param {object} animation - textObj.animation
 * @returns {object} der (ggf. neu angelegte) Zustand
 */
export function ensureAnimationState(animation) {
  if (!animation._state) {
    animation._state = { startTime: null, isPlaying: false, currentIndex: 0 }
  }
  return animation._state
}
