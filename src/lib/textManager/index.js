/**
 * Re-Exports der TextManager-Module.
 *
 * Die öffentliche API der Anwendung bleibt die Klasse `TextManager` aus
 * ../textManager.js; diese Module sind für Tests und gezielte Wiederverwendung.
 *
 * @module textManager
 */
export { createTextObject } from './createTextObject.js'
export { findObjectAt, getObjectBounds, isPointInRect } from './geometry/textBounds.js'
export {
  applyTextStyle,
  applyTextStyleForMeasurement,
  applyTextStyleWithAudio,
  resetShadow,
  strongestGlow,
} from './style/textStyle.js'

export { applyEasing } from './animation/easing.js'
export { ensureAnimationState } from './animation/state.js'
export { resolveTimeline } from './animation/timeline.js'
export { getTypewriterText, restartTypewriter } from './animation/typewriter.js'
export { getFadeOpacity, restartFade } from './animation/fade.js'
export { getScaleValue, restartScale } from './animation/scale.js'
export { getSlideOffset, restartSlide } from './animation/slide.js'
export { getDisplayOpacity } from './animation/displayOpacity.js'

export { calculateTextEffectValue, getAudioReactiveValues } from './audio/textEffectValues.js'

export { drawText } from './render/drawText.js'
export { activeEffects } from './render/effects.js'
export { applyTextTransform, computeTextTransform } from './render/transform.js'
export { buildFilterString } from './render/filters.js'
export { drawTextLines, drawTypewriterCursor } from './render/textLines.js'
