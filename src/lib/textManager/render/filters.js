/**
 * CSS-Filter-String aus den audio-reaktiven Farbeffekten.
 *
 * @module textManager/render/filters
 */
import { activeEffects } from './effects.js'

/**
 * Baut den Wert für `ctx.filter`.
 *
 * @param {object|null} audioReactive - Ergebnis von getAudioReactiveValues()
 * @param {number} strobeBrightnessMultiplier - 100 = kein Strobe
 * @returns {string} Filter-String, leer wenn kein Filter nötig ist
 */
export function buildFilterString(audioReactive, strobeBrightnessMultiplier) {
  const effects = activeEffects(audioReactive)

  if (!effects) {
    // Strobe ohne andere Audio-Effekte
    return strobeBrightnessMultiplier !== 100 ? `brightness(${strobeBrightnessMultiplier}%)` : ''
  }

  let filterString = ''

  // Hue-Rotation
  if (effects.hue) {
    filterString += `hue-rotate(${effects.hue.hueRotate}deg) `
  }

  // Helligkeit (kombiniert mit Strobe-Brightness)
  let totalBrightness = 100
  if (effects.brightness) {
    totalBrightness = effects.brightness.brightness
  }
  if (strobeBrightnessMultiplier !== 100) {
    totalBrightness = (totalBrightness / 100) * strobeBrightnessMultiplier
  }
  if (totalBrightness !== 100) {
    filterString += `brightness(${totalBrightness}%) `
  }

  // Weitere Farbfilter (gemeinsame Engine): Sättigung, Kontrast, Graustufen,
  // Sepia, Invertieren, Weichzeichnen, Farb-Strobe, Frequenz-Split
  if (effects.saturation) filterString += `saturate(${effects.saturation.saturation}%) `
  if (effects.contrast) filterString += `contrast(${effects.contrast.contrast}%) `
  if (effects.grayscale && effects.grayscale.grayscale > 0)
    filterString += `grayscale(${effects.grayscale.grayscale}%) `
  if (effects.sepia && effects.sepia.sepia > 0) filterString += `sepia(${effects.sepia.sepia}%) `
  if (effects.invert && effects.invert.invert > 0)
    filterString += `invert(${effects.invert.invert}%) `
  if (effects.blur && effects.blur.blur > 0) filterString += `blur(${effects.blur.blur}px) `
  if (effects.colorStrobe)
    filterString += `hue-rotate(${effects.colorStrobe.hueRotate}deg) saturate(${effects.colorStrobe.saturate}%) `
  if (effects.freqSplit && effects.freqSplit.hueRotate)
    filterString += `hue-rotate(${effects.freqSplit.hueRotate}deg) `

  return filterString.trim()
}
