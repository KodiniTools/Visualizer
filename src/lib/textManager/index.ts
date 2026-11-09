/**
 * Re-Exports der TextManager-Module.
 *
 * Die öffentliche API der Anwendung bleibt die Klasse `TextManager` aus
 * ../textManager.js; diese Module sind für Tests und gezielte Wiederverwendung.
 *
 * @module textManager
 */
export { createTextObject } from './createTextObject'
export {
  findObjectAt,
  getObjectBounds,
  isPointInRect,
  measureTextBlock,
} from './geometry/textBounds'
export {
  applyTextStyle,
  applyTextStyleForMeasurement,
  applyTextStyleWithAudio,
  resetShadow,
  strongestGlow,
} from './style/textStyle'

export { applyEasing } from './animation/easing'
export { ensureAnimationState } from './animation/state'
export { resolveTimeline } from './animation/timeline'
export { getTypewriterText, restartTypewriter } from './animation/typewriter'
export { getFadeOpacity, restartFade } from './animation/fade'
export { getScaleValue, restartScale } from './animation/scale'
export { getSlideOffset, restartSlide } from './animation/slide'
export { getDisplayOpacity } from './animation/displayOpacity'
export { seekTextAnimation } from './animation/seek'

export { calculateTextEffectValue, getAudioReactiveValues } from './audio/textEffectValues'

export { drawText } from './render/drawText'
export { activeEffects } from './render/effects'
export { applyTextTransform, computeTextTransform } from './render/transform/index'
export { buildFilterString } from './render/filters'
export { drawTextLines, drawTypewriterCursor } from './render/textLines'
