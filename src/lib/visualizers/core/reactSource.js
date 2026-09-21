/**
 * Reaction source for visualizers ("Reaktionsquelle").
 *
 * By default a visualizer draws straight from the spectrum, i.e. it follows
 * sustained loudness. A reaction source gates the audio data the visualizer
 * receives with an envelope derived from one signal: a band level (bass,
 * mid, treble, volume) or a self-normalising onset (beat) of a band. With an
 * onset source the visualizer keeps its shape from the spectrum but only
 * jumps on beats and settles in between. `strength` (0–100) blends between
 * untouched data (0) and fully gated data (100).
 *
 * The envelope can be shaped with the same controls the image audio-reactive
 * panel offers ("Audio-Reaktiv"): smoothing, beat boost, phase, easing and
 * gain. Beat boost, phase and easing reuse the image helpers so both paths
 * behave identically; the smoothing mapping is the visualizer's own and is
 * chosen so that the default (50) reproduces the envelope the visualizer had
 * before these controls existed.
 *
 * Per frame, in order:
 *   drive (reactDrive) → beat boost + phase (shapeReactDrive)
 *   → attack/release envelope (advanceReactEnvelope)
 *   → easing + gain (shapeReactLevel) → gate factor (reactFactor).
 *
 * Pure, frame-based helpers so the render loop can drive them per layer and
 * they can be unit-tested without audio.
 *
 * @module visualizers/core/reactSource
 */

import { REFERENCE_FRAME_MS } from './helpers.js'
import { applyBeatBoost, applyPhaseOffset } from '../../audio/AudioLevelCalculator.js'
import { applyEasing } from '../../audio/EasingFunctions.js'

export const REACT_SOURCES = Object.freeze([
  'spectrum',
  'bass',
  'mid',
  'treble',
  'volume',
  'bassOnset',
  'midOnset',
  'trebleOnset',
  'allOnset',
])

/** Übergänge (Easing) – dieselbe Auswahl wie im Bild-Panel "Audio-Reaktiv". */
export const REACT_EASINGS = Object.freeze([
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'bounce',
  'elastic',
  'punch',
])

export const DEFAULT_REACT_SOURCE = 'spectrum'
export const DEFAULT_REACT_STRENGTH = 70
/** Glättung 0–100; 50 = bisheriges Verhalten. */
export const DEFAULT_REACT_SMOOTHING = 50
/** Audio-Pegel (Gain) in Prozent, 0–200. */
export const DEFAULT_REACT_GAIN = 100
export const DEFAULT_REACT_EASING = 'linear'
/** Beat-Verstärkung als Faktor 1.0 (aus) – 3.0. */
export const DEFAULT_REACT_BEAT_BOOST = 1
/** Phase in Grad 0–360 (0 = aus). */
export const DEFAULT_REACT_PHASE = 0

export const REACT_GAIN_MAX = 200
export const REACT_BEAT_BOOST_MAX = 3

/** Standardwerte aller Formungs-Parameter (für Layer, Presets, Store). */
export const DEFAULT_REACT_SHAPE = Object.freeze({
  reactSmoothing: DEFAULT_REACT_SMOOTHING,
  reactGain: DEFAULT_REACT_GAIN,
  reactEasing: DEFAULT_REACT_EASING,
  reactBeatBoost: DEFAULT_REACT_BEAT_BOOST,
  reactPhase: DEFAULT_REACT_PHASE,
})

const ONSET_FIELD = {
  bassOnset: 'onsetBass',
  midOnset: 'onsetMid',
  trebleOnset: 'onsetTreble',
  allOnset: 'onsetAll',
}
const LEVEL_FIELD = { bass: 'bass', mid: 'mid', treble: 'treble', volume: 'volume' }

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const clampNum = (v, min, max, fallback) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return n < min ? min : n > max ? max : n
}

/** @param {string} source */
export function isReactSource(source) {
  return REACT_SOURCES.includes(source)
}

/** @param {string} source */
export function isOnsetSource(source) {
  return Object.prototype.hasOwnProperty.call(ONSET_FIELD, source)
}

/** @param {string} easing */
export function isReactEasing(easing) {
  return REACT_EASINGS.includes(easing)
}

// ── Normalisierung der Formungs-Parameter ───────────────────────────────────

/** @param {*} v → 0–100 (ganzzahlig) */
export function normalizeReactSmoothing(v) {
  return Math.round(clampNum(v, 0, 100, DEFAULT_REACT_SMOOTHING))
}

/** @param {*} v → 0–200 % (ganzzahlig) */
export function normalizeReactGain(v) {
  return Math.round(clampNum(v, 0, REACT_GAIN_MAX, DEFAULT_REACT_GAIN))
}

/** @param {*} v → 1.0–3.0 (eine Nachkommastelle) */
export function normalizeReactBeatBoost(v) {
  return Math.round(clampNum(v, 1, REACT_BEAT_BOOST_MAX, DEFAULT_REACT_BEAT_BOOST) * 10) / 10
}

/** @param {*} v → 0–360° (ganzzahlig) */
export function normalizeReactPhase(v) {
  return Math.round(clampNum(v, 0, 360, DEFAULT_REACT_PHASE))
}

/** @param {*} v → gültiges Easing, sonst Standard */
export function normalizeReactEasing(v) {
  return isReactEasing(v) ? v : DEFAULT_REACT_EASING
}

/**
 * Liest die Formungs-Parameter aus einem Objekt (Store, Layer, Preset) und
 * liefert sie normalisiert; fehlende Felder erhalten den Standardwert.
 * @param {object|null|undefined} settings
 * @returns {{reactSmoothing:number, reactGain:number, reactEasing:string, reactBeatBoost:number, reactPhase:number}}
 */
export function normalizeReactShape(settings) {
  const s = settings || {}
  return {
    reactSmoothing: normalizeReactSmoothing(s.reactSmoothing),
    reactGain: normalizeReactGain(s.reactGain),
    reactEasing: normalizeReactEasing(s.reactEasing),
    reactBeatBoost: normalizeReactBeatBoost(s.reactBeatBoost),
    reactPhase: normalizeReactPhase(s.reactPhase),
  }
}

// ── Signalkette ─────────────────────────────────────────────────────────────

/**
 * Raw drive value (0–1) of a source from an audio-analysis snapshot
 * (window.audioAnalysisData or the same shape). Levels may arrive on a 0–255
 * scale; anything above 1 is treated as such.
 * @param {string} source
 * @param {object|null|undefined} audioData
 * @returns {number}
 */
export function reactDrive(source, audioData) {
  if (source === 'spectrum' || !source) return 1
  if (!audioData) return 0
  const onsetField = ONSET_FIELD[source]
  const field = onsetField || LEVEL_FIELD[source]
  if (!field) return 1
  const v = audioData[field]
  if (!Number.isFinite(v)) return 0
  // Onsets are 0–1 by definition; band levels may arrive on a 0–255 scale.
  if (onsetField) return clamp01(v)
  return clamp01(v > 1 ? v / 255 : v)
}

/**
 * Formt den Rohwert vor der Hüllkurve: Beat-Verstärkung (auf erkannten Beats,
 * skaliert mit der Beat-Intensität) und Phase (langsame Sinus-Modulation),
 * beides mit den Bild-Helfern aus AudioLevelCalculator.
 * @param {number} drive - 0–1
 * @param {object|null|undefined} audioData - für isBeat / beatIntensity
 * @param {{reactBeatBoost?:number, reactPhase?:number}} [shape]
 * @param {number} [time=Date.now()] - ms, für die Phase
 * @returns {number} 0–1
 */
export function shapeReactDrive(drive, audioData, shape, time = Date.now()) {
  let v = clamp01(drive)
  const boost = shape?.reactBeatBoost ?? DEFAULT_REACT_BEAT_BOOST
  const phase = shape?.reactPhase ?? DEFAULT_REACT_PHASE
  if (boost > 1) v = applyBeatBoost(v, audioData, boost)
  if (phase > 0) v = applyPhaseOffset(v, phase, time)
  return clamp01(v)
}

/**
 * Bewegungsanteil pro Referenz-Frame (1/60 s) aus dem Glättungsregler.
 * `base` ist der Anteil bei Glättung 50 (bisheriges Verhalten); 0 = sofort
 * (roh), 100 = sehr träge (Faktor 8 je Richtung). Exponentiell, damit der
 * Regler gleichmäßig wirkt.
 * @param {number} smoothing - 0–100
 * @param {number} base - Anteil bei 50
 * @returns {number} 0–1
 */
export function smoothingCoefficient(smoothing, base) {
  const s = clampNum(smoothing, 0, 100, DEFAULT_REACT_SMOOTHING) / 100
  const c = base * Math.pow(8, 1 - 2 * s)
  return c > 1 ? 1 : c
}

/** Onset: Abkling-Anteil pro Frame bei Glättung 50 (Halten von 0.86). */
const ONSET_DECAY_BASE = 0.14
/** Bandpegel: symmetrischer Nachlauf-Anteil pro Frame bei Glättung 50. */
const LEVEL_FOLLOW_BASE = 0.35

/**
 * Advances the reaction envelope one frame, frame-rate independent.
 * Onset sources: instant attack, exponential decay (reads as a kick).
 * Level sources: symmetric smoothing so the visualizer breathes with the band.
 * `smoothing` (0–100) sets how fast the envelope moves; 50 keeps the classic
 * behaviour, 0 follows the drive instantly, 100 glides.
 * @param {number} prev - previous envelope (0–1)
 * @param {number} drive - current drive (0–1)
 * @param {string} source
 * @param {number} [dtMs] - elapsed ms since the last frame
 * @param {number} [smoothing=50]
 * @returns {number} envelope 0–1
 */
export function advanceReactEnvelope(
  prev,
  drive,
  source,
  dtMs = REFERENCE_FRAME_MS,
  smoothing = DEFAULT_REACT_SMOOTHING,
) {
  const p = Number.isFinite(prev) ? clamp01(prev) : 0
  const d = clamp01(drive)
  const k = dtMs > 0 && dtMs < 250 ? dtMs / REFERENCE_FRAME_MS : 1
  if (isOnsetSource(source)) {
    const retain = 1 - smoothingCoefficient(smoothing, ONSET_DECAY_BASE)
    const decayed = p * Math.pow(retain, k)
    return d > decayed ? d : decayed
  }
  const a = 1 - Math.pow(1 - smoothingCoefficient(smoothing, LEVEL_FOLLOW_BASE), k)
  return p + (d - p) * a
}

/**
 * Formt die Hüllkurve nach: Übergang (Easing-Kurve) und Audio-Pegel (Gain in
 * Prozent), wie im Bild-Pfad; Ergebnis auf 0–1 begrenzt.
 * @param {number} env - 0–1
 * @param {{reactEasing?:string, reactGain?:number}} [shape]
 * @returns {number} 0–1
 */
export function shapeReactLevel(env, shape) {
  const easing = shape?.reactEasing ?? DEFAULT_REACT_EASING
  const gain = shape?.reactGain ?? DEFAULT_REACT_GAIN
  let v = clamp01(env)
  if (easing !== 'linear') v = applyEasing(v, easing)
  if (gain !== DEFAULT_REACT_GAIN) v *= clampNum(gain, 0, REACT_GAIN_MAX, DEFAULT_REACT_GAIN) / 100
  return clamp01(v)
}

/**
 * Gate factor applied to the audio data: 1 at strength 0, the envelope itself
 * at strength 100.
 * @param {number} env - envelope 0–1
 * @param {number} strength - 0–100
 * @returns {number} factor 0–1
 */
export function reactFactor(env, strength) {
  const s = Math.max(0, Math.min(100, Number.isFinite(strength) ? strength : 0)) / 100
  return 1 - s + s * clamp01(env)
}

/**
 * Ein kompletter Schritt der Signalkette für eine Einstellungs-Quelle (Store
 * oder Layer mit den Feldern reactSource/reactStrength/reactSmoothing/…).
 * @param {number} prevEnv - Hüllkurve des Vorframes (0–1)
 * @param {object} settings - Objekt mit react*-Feldern
 * @param {object|null|undefined} audioData - window.audioAnalysisData
 * @param {number} [dtMs]
 * @param {number} [time=Date.now()]
 * @returns {{env:number, factor:number}} neue Hüllkurve (zu speichern) und Gate-Faktor
 */
export function stepReactGate(prevEnv, settings, audioData, dtMs = REFERENCE_FRAME_MS, time) {
  const source = settings?.reactSource || DEFAULT_REACT_SOURCE
  const drive = shapeReactDrive(reactDrive(source, audioData), audioData, settings, time)
  const env = advanceReactEnvelope(prevEnv, drive, source, dtMs, settings?.reactSmoothing)
  const level = shapeReactLevel(env, settings)
  return { env, factor: reactFactor(level, settings?.reactStrength) }
}

/**
 * Scales audio data by `factor` into `out` (allocated / resized as needed).
 * Frequency data (0–255) scales towards 0; time-domain data (centred at 128)
 * scales around 128 so the waveform shrinks instead of drifting.
 * Returns `src` untouched when no scaling is needed.
 * @param {Uint8Array} src
 * @param {number} factor - 0–1
 * @param {Uint8Array|null} out - scratch buffer (reused when large enough)
 * @param {boolean} [timeDomain=false]
 * @returns {Uint8Array}
 */
export function applyReactFactor(src, factor, out, timeDomain = false) {
  if (!src) return src
  if (!(factor < 0.999)) return src
  const f = clamp01(factor)
  const len = src.length
  let dst = out
  if (!dst || dst.length !== len) dst = new Uint8Array(len)
  if (timeDomain) {
    for (let i = 0; i < len; i++) dst[i] = 128 + (src[i] - 128) * f
  } else {
    for (let i = 0; i < len; i++) dst[i] = src[i] * f
  }
  return dst
}
