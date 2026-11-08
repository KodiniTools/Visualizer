/**
 * Audio-Reaktiver Farbverlauf der Slideshow-Fläche.
 *
 * Zwei Effekte (wie die Gradient-Effekte des Farb-Hintergrunds):
 *   pulse    – der Verlauf zieht sich im Takt zusammen (Ausdehnung 1 → 0,4)
 *   rotation – linear: Winkel schwingt um bis zu ±180°;
 *              radial: der Mittelpunkt kreist um bis zu 25 % der halben Diagonale
 * Ohne Audio (Pegel 0) sieht der Verlauf genau wie eingestellt aus.
 * Pegel/Glättung kommen aus der gemeinsamen Audio-Engine.
 */
import { computeAudioReactiveValues } from './audio/audioReactiveEngine'

/** Audio-Quellen wie beim Bild-Audio-Reaktiv (inkl. Onset, siehe AudioLevelCalculator). */
// 'dynamic' = Auto-Blend aus Bass/Mitten/Höhen (AudioLevelCalculator.calculateDynamicLevel)
export const SLIDESHOW_AUDIO_SOURCE_BANDS = Object.freeze([
  'bass',
  'mid',
  'treble',
  'volume',
  'dynamic',
])
export const SLIDESHOW_AUDIO_SOURCE_ONSETS = Object.freeze([
  'bassOnset',
  'midOnset',
  'trebleOnset',
  'allOnset',
])
export const SLIDESHOW_GRADIENT_AUDIO_SOURCES = Object.freeze([
  ...SLIDESHOW_AUDIO_SOURCE_BANDS,
  ...SLIDESHOW_AUDIO_SOURCE_ONSETS,
])

export const SLIDESHOW_GRADIENT_AUDIO_DEFAULT = Object.freeze({
  enabled: false,
  source: 'bass',
  pulse: 80, // Stärke 0–100 (0 = aus)
  rotation: 80,
})

export interface SlideshowGradientAudio {
  enabled: boolean
  source: string
  pulse: number
  rotation: number
}

export interface SlideshowGradientAudioDeform {
  extent: number
  angleOffset: number
  centerShift: number
  shiftAngle: number
}

export type SlideshowSurfaceTarget = 'canvas' | 'workspace'

const NEUTRAL: Readonly<SlideshowGradientAudioDeform> = Object.freeze({
  extent: 1,
  angleOffset: 0,
  centerShift: 0,
  shiftAngle: 0,
})

function clampPercent(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : fallback
}

/**
 * @param {unknown} value
 * @param {typeof SLIDESHOW_GRADIENT_AUDIO_DEFAULT} [fallback]
 * @returns {{ enabled:boolean, source:string, pulse:number, rotation:number }} (Kopie)
 */
export function normalizeSlideshowGradientAudio(
  value: unknown,
  fallback: Partial<SlideshowGradientAudio> | null = SLIDESHOW_GRADIENT_AUDIO_DEFAULT,
): SlideshowGradientAudio {
  const base = { ...SLIDESHOW_GRADIENT_AUDIO_DEFAULT, ...(fallback || {}) }
  const src: Record<string, unknown> =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : Boolean(base.enabled),
    source:
      typeof src.source === 'string' && SLIDESHOW_GRADIENT_AUDIO_SOURCES.includes(src.source)
        ? src.source
        : base.source,
    pulse: clampPercent(src.pulse, base.pulse),
    rotation: clampPercent(src.rotation, base.rotation),
  }
}

// Stabiler Besitzer je Fläche für den Hüllkurven-Zustand der Engine
const OWNERS: Record<SlideshowSurfaceTarget, object> = { canvas: {}, workspace: {} }

/**
 * Aktuelle Audio-Verformung des Verlaufs.
 * @param {object|null|undefined} audio - normalisierte Audio-Einstellung
 * @param {'canvas'|'workspace'} target
 * @param {object|null|undefined} audioData - getAudioAnalysisData()
 * @param {number} [now] - Zeit in ms (für die Rotation)
 * @returns {{ extent:number, angleOffset:number, centerShift:number, shiftAngle:number }}
 */
export function computeSlideshowGradientAudio(
  audio: SlideshowGradientAudio | null | undefined,
  target: SlideshowSurfaceTarget | string,
  audioData: object | null | undefined,
  now = Date.now(),
): SlideshowGradientAudioDeform {
  if (!audio?.enabled || !audioData) return { ...NEUTRAL }
  const effects: Record<string, { enabled: boolean; intensity: number }> = {}
  if (audio.pulse > 0) effects.pulse = { enabled: true, intensity: audio.pulse }
  if (audio.rotation > 0) effects.rotation = { enabled: true, intensity: audio.rotation }
  const values = computeAudioReactiveValues(
    OWNERS[target === 'workspace' ? 'workspace' : 'canvas'],
    { enabled: true, source: audio.source, effects },
    audioData,
    (_name, level) => ({ level }),
  )
  if (!values) return { ...NEUTRAL }
  const levels: Record<string, { level: number } | undefined> = values.effects
  const pulse = levels.pulse?.level ?? 0
  const rotation = levels.rotation?.level ?? 0
  const wave = Math.sin(now * 0.002)
  return {
    extent: 1 - 0.6 * pulse,
    angleOffset: wave * rotation * 180,
    centerShift: rotation * 0.25,
    shiftAngle: now * 0.002,
  }
}
