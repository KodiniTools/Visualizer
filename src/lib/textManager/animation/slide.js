/**
 * Slide-Animation: Herein-/Herausgleiten von einer Canvas-Kante.
 *
 * @module textManager/animation/slide
 */
import { resolveTimeline } from './timeline.js'

/**
 * Maximaler Versatz in Pixeln, abhängig von Richtung und Canvas-Größe.
 *
 * @param {object} slide - animation.slide
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {{maxOffsetX: number, maxOffsetY: number}}
 */
function maxOffset(slide, canvasWidth, canvasHeight) {
  const distancePercent = slide.distance || 100

  switch (slide.from) {
    case 'left':
      return { maxOffsetX: -((canvasWidth * distancePercent) / 100), maxOffsetY: 0 }
    case 'right':
      return { maxOffsetX: (canvasWidth * distancePercent) / 100, maxOffsetY: 0 }
    case 'top':
      return { maxOffsetX: 0, maxOffsetY: -((canvasHeight * distancePercent) / 100) }
    case 'bottom':
      return { maxOffsetX: 0, maxOffsetY: (canvasHeight * distancePercent) / 100 }
    default:
      return { maxOffsetX: 0, maxOffsetY: 0 }
  }
}

/**
 * Berechnet den Positions-Versatz für die Slide-Animation.
 *
 * @param {object} textObj
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} [now] - Zeitstempel in ms
 * @returns {{offsetX: number, offsetY: number, isComplete: boolean}}
 */
export function getSlideOffset(textObj, canvasWidth, canvasHeight, now = Date.now()) {
  const animation = textObj.animation

  // Wenn keine Animation oder Slide nicht aktiviert
  if (!animation || !animation.slide || !animation.slide.enabled) {
    return { offsetX: 0, offsetY: 0, isComplete: true }
  }

  const slide = animation.slide
  const { maxOffsetX, maxOffsetY } = maxOffset(slide, canvasWidth, canvasHeight)

  const { p, isComplete } = resolveTimeline(animation, slide, 'slideStartTime', now)
  // p = 1 ⇒ in Position, p = 0 ⇒ ganz außen.
  // Bei p = 1 exakt 0 zurückgeben: `max * (1 - 1)` ergaebe bei negativem max
  // die vorzeichenbehaftete Null -0.
  const offset = (max) => (p === 1 ? 0 : max * (1 - p))
  return { offsetX: offset(maxOffsetX), offsetY: offset(maxOffsetY), isComplete }
}

/**
 * Startet die Slide-Animation neu.
 * @param {object} textObj
 */
export function restartSlide(textObj) {
  if (!textObj || !textObj.animation) return

  textObj.animation._state.slideStartTime = null
}
