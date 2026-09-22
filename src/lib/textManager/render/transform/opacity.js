/**
 * Deckkraft eines Text-Objekts für einen Frame.
 *
 * @module textManager/render/transform/opacity
 */
import { getFadeOpacity } from '../../animation/fade.js'
import { getDisplayOpacity } from '../../animation/displayOpacity.js'
import { activeEffects } from '../effects.js'

/**
 * Multipliziert Slider-Wert, Audio-Deckkraft, Fade-Animation, Anzeigedauer und
 * Strobe zu einer Gesamt-Deckkraft.
 *
 * ⚠️ Wird VOR Position und Verformung aufgerufen: `getDisplayOpacity` liest die
 * Startzeitpunkte der übrigen Animationen, die Slide und Scale erst setzen.
 *
 * @param {object} textObj
 * @param {object|null} audioReactive
 * @param {number} [now] - Zeitstempel in ms
 * @returns {{opacity: number, strobeBrightnessMultiplier: number}}
 */
export function computeOpacity(textObj, audioReactive, now) {
  const fx = activeEffects(audioReactive)

  // ✨ TRANSPARENZ/DECKKRAFT anwenden (0-100% → 0.0-1.0)
  let opacity = (textObj.opacity !== undefined ? textObj.opacity : 100) / 100

  // Audio-reaktive Opacity moduliert den Basis-Wert (statt ihn zu überschreiben)
  if (fx && fx.opacity) {
    // fx.opacity.opacity ist 30-100, moduliert den Slider-Wert
    opacity = opacity * (fx.opacity.opacity / 100)
  }

  // ✨ FADE-ANIMATION: Opacity aus Fade-Effekt anwenden
  opacity = opacity * getFadeOpacity(textObj, now).opacity

  // ✨ ANZEIGEDAUER: Text nach eingestellter Dauer ausblenden (falls nicht permanent)
  opacity = opacity * getDisplayOpacity(textObj, now)

  // ✨ AUDIO-REAKTIV: Strobe-Effekt (Blitz bei Audio-Peaks)
  //
  // Auf `!== undefined` prüfen, NICHT auf Truthiness: der dunkle Blitz-Frame
  // liefert strobeOpacity 0, das ein `|| 1.0` zu voller Sichtbarkeit machen
  // würde – der Text hätte dann nie ausgeblendet. Ebenso bei Bildern, Kacheln
  // und dem Lauftext (audioReactiveDraw.js, multiImageManager.js,
  // TickerRenderer.js).
  let strobeBrightnessMultiplier = 100
  if (fx && fx.strobe) {
    const { strobeOpacity, strobeBrightness } = fx.strobe
    if (strobeOpacity !== undefined) opacity = opacity * strobeOpacity
    if (strobeBrightness !== undefined) strobeBrightnessMultiplier = strobeBrightness
  }

  return { opacity, strobeBrightnessMultiplier }
}
