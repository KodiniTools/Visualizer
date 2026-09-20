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
