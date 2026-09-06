/**
 * Gemeinsame Auswertung einer Audio-Reaktiv-Konfiguration zu Effektwerten –
 * genutzt von Canvas-Bildern/Hintergrund/Kacheln (über canvasManager) und dem
 * Lauftext (TickerRenderer).
 *
 * @module audio/audioReactiveEngine
 */
import { makeLevelResolver } from './ReactiveLevel.js'
import { calculateEffectValue } from './AudioReactiveEffects.js'

/**
 * Berechnet für alle aktivierten Effekte einer Konfiguration die Effektwerte.
 *
 * @param {object} owner - stabiles Objekt, an dem der Hüllkurven-Zustand hängt
 *   (in der Regel die Konfiguration selbst)
 * @param {object|null|undefined} audioSettings - Konfiguration
 *   ({ enabled, source, smoothing, easing, beatBoost, phase, gain, effects })
 * @param {object|null|undefined} audioData - window.audioAnalysisData
 * @param {(name: string, level: number, config: object) => object} [calculate]
 *   Effektberechnung; Default: gemeinsame Bild-Engine (erhält nur name/level)
 * @returns {{hasEffects: true, effects: Record<string, object>}|null}
 */
// Standard-Berechnung: bewusst nur (name, level) weiterreichen – der dritte
// Parameter von calculateEffectValue ist der Zeitstempel, NICHT die Effekt-
// Konfiguration (sonst werden alle zeitbasierten Effekte zu NaN).
const defaultCalculate = (name, level) => calculateEffectValue(name, level)

export function computeAudioReactiveValues(
  owner,
  audioSettings,
  audioData,
  calculate = defaultCalculate,
) {
  if (!audioSettings || !audioSettings.enabled || !audioData) return null
  const effects = audioSettings.effects
  if (!effects) return null

  const globalSource = audioSettings.source || 'bass'
  const resolveLevel = makeLevelResolver(owner || audioSettings, {
    audioData,
    smoothing: audioSettings.smoothing ?? 50,
    beatBoost: audioSettings.beatBoost ?? 1.0,
    phase: audioSettings.phase || 0,
    easing: audioSettings.easing || 'linear',
    gain: audioSettings.gain ?? 1.0,
  })

  const result = { hasEffects: false, effects: {} }
  for (const [effectName, effectConfig] of Object.entries(effects)) {
    if (!effectConfig || !effectConfig.enabled) continue
    const baseLevel = resolveLevel(effectConfig.source || globalSource)
    const intensity = (effectConfig.intensity || 80) / 100
    const normalizedLevel = Math.min(baseLevel * intensity, 1)
    result.hasEffects = true
    result.effects[effectName] = calculate(effectName, normalizedLevel, effectConfig)
  }
  return result.hasEffects ? result : null
}

/**
 * Produkt aller Skalierungsfaktoren (scale, beatPulse, zoomPunch, bpmPulse, freqSplit).
 * @param {Record<string, object>} effects
 */
export function combinedScale(effects) {
  let scale = 1
  for (const key of ['scale', 'beatPulse', 'zoomPunch', 'bpmPulse', 'freqSplit']) {
    if (effects[key] && typeof effects[key].scale === 'number') scale *= effects[key].scale
  }
  return scale
}

/**
 * Stärkstes Leuchten aus Glow/Beat-Puls/BPM-Puls/Frequenz-Split (oder null).
 * @param {Record<string, object>} effects
 */
export function strongestGlow(effects) {
  const candidates = [effects.glow, effects.beatPulse, effects.bpmPulse, effects.freqSplit].filter(
    (e) => e && e.glowBlur > 0,
  )
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (b.glowBlur > a.glowBlur ? b : a))
}

/**
 * CSS-Filter-String aus allen Filter-liefernden Effekten (inkl. Strobe-
 * Helligkeit, Farb-Strobe, Frequenz-Split-Farbton).
 * @param {Record<string, object>} effects
 * @returns {string} '' wenn kein Filter aktiv
 */
export function buildFilterString(effects) {
  const parts = []
  if (effects.hue) parts.push(`hue-rotate(${effects.hue.hueRotate}deg)`)
  if (effects.brightness) parts.push(`brightness(${effects.brightness.brightness}%)`)
  if (effects.saturation) parts.push(`saturate(${effects.saturation.saturation}%)`)
  if (effects.contrast) parts.push(`contrast(${effects.contrast.contrast}%)`)
  if (effects.grayscale && effects.grayscale.grayscale > 0)
    parts.push(`grayscale(${effects.grayscale.grayscale}%)`)
  if (effects.sepia && effects.sepia.sepia > 0) parts.push(`sepia(${effects.sepia.sepia}%)`)
  if (effects.invert && effects.invert.invert > 0) parts.push(`invert(${effects.invert.invert}%)`)
  if (effects.blur && effects.blur.blur > 0) parts.push(`blur(${effects.blur.blur}px)`)
  if (effects.strobe && effects.strobe.strobeBrightness && effects.strobe.strobeBrightness !== 100)
    parts.push(`brightness(${effects.strobe.strobeBrightness}%)`)
  if (effects.colorStrobe)
    parts.push(
      `hue-rotate(${effects.colorStrobe.hueRotate}deg) saturate(${effects.colorStrobe.saturate}%)`,
    )
  if (effects.freqSplit && effects.freqSplit.hueRotate)
    parts.push(`hue-rotate(${effects.freqSplit.hueRotate}deg)`)
  return parts.join(' ')
}
