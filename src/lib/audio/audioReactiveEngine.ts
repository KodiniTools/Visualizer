/**
 * Gemeinsame Auswertung einer Audio-Reaktiv-Konfiguration zu Effektwerten –
 * genutzt von Canvas-Bildern/Hintergrund/Kacheln (über canvasManager), Videos,
 * dem Lauftext (TickerRenderer) und den Canvas-Texten (textManager).
 *
 * Der Text-Pfad steuert seine Hüllkurve über `levelOptions` selbst; alle
 * anderen leiten sie aus dem einzelnen `smoothing`-Regler ab.
 *
 * @module audio/audioReactiveEngine
 */
import { makeLevelResolver, type ReactiveLevelOptions } from './ReactiveLevel'
import { calculateEffectValue, type EffectValues } from './AudioReactiveEffects'
import type { AudioLevelData } from './AudioLevelCalculator'

/** Effekt-Konfiguration, wie die Engine sie liest */
export interface EngineEffectConfig {
  enabled?: boolean
  intensity?: number
  source?: string | null
  [extra: string]: unknown
}

/** Audio-Reaktiv-Einstellungen, wie die Engine sie liest (Felder optional) */
export interface EngineAudioSettings {
  enabled?: boolean
  source?: string
  smoothing?: number
  beatBoost?: number
  phase?: number
  easing?: string
  gain?: number
  effects?: Record<string, EngineEffectConfig | null | undefined> | null
}

/** Berechnet die Werte eines Effekts aus seinem Pegel (0–1) */
export type EffectCalculator<V> = (name: string, level: number, config: EngineEffectConfig) => V

export interface AudioReactiveValues<V = EffectValues> {
  hasEffects: true
  effects: Record<string, V>
}

/**
 * Berechnet für alle aktivierten Effekte einer Konfiguration die Effektwerte.
 *
 * @param {object} owner - stabiles Objekt, an dem der Hüllkurven-Zustand hängt
 *   (in der Regel die Konfiguration selbst)
 * @param {object|null|undefined} audioSettings - Konfiguration
 *   ({ enabled, source, smoothing, easing, beatBoost, phase, gain, effects })
 * @param {object|null|undefined} audioData - getAudioAnalysisData()
 * @param {(name: string, level: number, config: object) => object} [calculate]
 *   Effektberechnung; Default: gemeinsame Bild-Engine (erhält nur name/level)
 * @param {object|null} [levelOptions] - zusätzliche bzw. überschreibende
 *   Optionen für den Level-Resolver (siehe computeReactiveLevel), etwa
 *   `preSmoothing`, `threshold`, `attack`, `release`. Der Text-Pfad steuert
 *   seine Hüllkurve darüber explizit; sind `attack`/`release` gesetzt, hat
 *   das Vorrang vor dem abgeleiteten `smoothing`.
 * @returns {{hasEffects: true, effects: Record<string, object>}|null}
 */
// Standard-Berechnung: bewusst nur (name, level) weiterreichen – der dritte
// Parameter von calculateEffectValue ist der Zeitstempel, NICHT die Effekt-
// Konfiguration (sonst werden alle zeitbasierten Effekte zu NaN).
const defaultCalculate: EffectCalculator<EffectValues> = (name, level) =>
  calculateEffectValue(name, level)

export function computeAudioReactiveValues<V = EffectValues>(
  owner: object | null | undefined,
  audioSettings: EngineAudioSettings | null | undefined,
  audioData: AudioLevelData | null | undefined,
  calculate?: EffectCalculator<V>,
  levelOptions: ReactiveLevelOptions | null = null,
): AudioReactiveValues<V> | null {
  // Ohne eigene Berechnung liefert die Standard-Berechnung EffectValues (V = Standard)
  const calc = calculate ?? (defaultCalculate as unknown as EffectCalculator<V>)
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
    ...levelOptions,
  })

  const result: { hasEffects: boolean; effects: Record<string, V> } = {
    hasEffects: false,
    effects: {},
  }
  for (const [effectName, effectConfig] of Object.entries(effects)) {
    if (!effectConfig || !effectConfig.enabled) continue
    const baseLevel = resolveLevel(effectConfig.source || globalSource)
    const intensity = (effectConfig.intensity || 80) / 100
    const normalizedLevel = Math.min(baseLevel * intensity, 1)
    result.hasEffects = true
    result.effects[effectName] = calc(effectName, normalizedLevel, effectConfig)
  }
  return result.hasEffects ? (result as AudioReactiveValues<V>) : null
}

/**
 * Produkt aller Skalierungsfaktoren (scale, beatPulse, zoomPunch, bpmPulse, freqSplit).
 * @param {Record<string, object>} effects
 */
type EffectMap = Record<string, EffectValues | null | undefined>

export function combinedScale(effects: EffectMap): number {
  let scale = 1
  for (const key of ['scale', 'beatPulse', 'zoomPunch', 'bpmPulse', 'freqSplit']) {
    const s = effects[key]?.scale
    if (typeof s === 'number') scale *= s
  }
  return scale
}

/**
 * Stärkstes Leuchten aus Glow/Beat-Puls/BPM-Puls/Frequenz-Split (oder null).
 * @param {Record<string, object>} effects
 */
export function strongestGlow(effects: EffectMap): EffectValues | null {
  const candidates = [effects.glow, effects.beatPulse, effects.bpmPulse, effects.freqSplit].filter(
    (e): e is EffectValues & { glowBlur: number } => !!e && (e.glowBlur ?? 0) > 0,
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
export function buildFilterString(effects: EffectMap): string {
  const parts: string[] = []
  if (effects.hue) parts.push(`hue-rotate(${effects.hue.hueRotate}deg)`)
  if (effects.brightness) parts.push(`brightness(${effects.brightness.brightness}%)`)
  if (effects.saturation) parts.push(`saturate(${effects.saturation.saturation}%)`)
  if (effects.contrast) parts.push(`contrast(${effects.contrast.contrast}%)`)
  if (effects.grayscale && (effects.grayscale.grayscale ?? 0) > 0)
    parts.push(`grayscale(${effects.grayscale.grayscale}%)`)
  if (effects.sepia && (effects.sepia.sepia ?? 0) > 0) parts.push(`sepia(${effects.sepia.sepia}%)`)
  if (effects.invert && (effects.invert.invert ?? 0) > 0)
    parts.push(`invert(${effects.invert.invert}%)`)
  if (effects.blur && (effects.blur.blur ?? 0) > 0) parts.push(`blur(${effects.blur.blur}px)`)
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
