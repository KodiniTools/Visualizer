/**
 * Audio-Reaktive Farbe der Slideshow-Fläche (einfarbig und Farbverlauf).
 *
 * Effekte auf die Flächenfarbe(n):
 *   brightness – Fläche hellt im Takt auf (bis +50 % Helligkeit bei 100 %)
 *   hue        – Farbton verschiebt sich im Takt (bis 180° bei 100 %)
 * Ohne Musik (Pegel 0) bleibt die Farbe wie eingestellt.
 * Pegel/Glättung kommen aus der gemeinsamen Audio-Engine.
 */
import { computeAudioReactiveValues } from './audio/audioReactiveEngine.js'
import {
  SLIDESHOW_GRADIENT_AUDIO_SOURCES,
  type SlideshowSurfaceTarget,
} from './slideshowGradientAudio'

export interface SlideshowFillAudio {
  enabled: boolean
  source: string
  brightness: number
  hue: number
}

export interface SlideshowFillAudioChange {
  lighten: number
  hueShift: number
}

export const SLIDESHOW_FILL_AUDIO_DEFAULT = Object.freeze({
  enabled: false,
  source: 'bass',
  brightness: 80, // Stärke 0–100 (0 = aus)
  hue: 0,
})

const NEUTRAL: Readonly<SlideshowFillAudioChange> = Object.freeze({ lighten: 0, hueShift: 0 })

function clampPercent(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : fallback
}

/**
 * @param {unknown} value
 * @param {typeof SLIDESHOW_FILL_AUDIO_DEFAULT} [fallback]
 * @returns {{ enabled:boolean, source:string, brightness:number, hue:number }} (Kopie)
 */
export function normalizeSlideshowFillAudio(
  value: unknown,
  fallback: Partial<SlideshowFillAudio> | null = SLIDESHOW_FILL_AUDIO_DEFAULT,
): SlideshowFillAudio {
  const base = { ...SLIDESHOW_FILL_AUDIO_DEFAULT, ...(fallback || {}) }
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
    brightness: clampPercent(src.brightness, base.brightness),
    hue: clampPercent(src.hue, base.hue),
  }
}

/** Gleiche Einstellung? */
export function isSameSlideshowFillAudio(a: unknown, b: unknown): boolean {
  return (
    JSON.stringify(normalizeSlideshowFillAudio(a)) ===
    JSON.stringify(normalizeSlideshowFillAudio(b))
  )
}

// Stabiler Besitzer je Fläche für den Hüllkurven-Zustand der Engine
const OWNERS: Record<SlideshowSurfaceTarget, object> = { canvas: {}, workspace: {} }

/**
 * Aktuelle Farbveränderung durch Audio.
 * @param {object|null|undefined} audio - normalisierte Einstellung
 * @param {'canvas'|'workspace'} target
 * @param {object|null|undefined} audioData - getAudioAnalysisData()
 * @returns {{ lighten:number, hueShift:number }} lighten 0–0,5; hueShift in Grad
 */
export function computeSlideshowFillAudio(
  audio: SlideshowFillAudio | null | undefined,
  target: SlideshowSurfaceTarget | string,
  audioData: object | null | undefined,
): SlideshowFillAudioChange {
  if (!audio?.enabled || !audioData) return { ...NEUTRAL }
  const effects: Record<string, { enabled: boolean; intensity: number }> = {}
  if (audio.brightness > 0) effects.brightness = { enabled: true, intensity: audio.brightness }
  if (audio.hue > 0) effects.hue = { enabled: true, intensity: audio.hue }
  const values = computeAudioReactiveValues(
    OWNERS[target === 'workspace' ? 'workspace' : 'canvas'],
    { enabled: true, source: audio.source, effects },
    audioData,
    // audioReactiveEngine.js ist noch JS; die Parameter-Inferenz für
    // `calculate` ist dort fehlerhaft → Callback-Typ explizit angleichen
    ((_name: string, level: number) => ({ level })) as unknown as Parameters<
      typeof computeAudioReactiveValues
    >[3],
  )
  if (!values) return { ...NEUTRAL }
  // calculate liefert { level } je Effekt (siehe oben)
  const levels = values.effects as Record<string, { level?: number } | undefined>
  return {
    lighten: 0.5 * (levels.brightness?.level ?? 0),
    hueShift: 180 * (levels.hue?.level ?? 0),
  }
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: h * 60, s, l }
}

/**
 * Wendet die Audio-Veränderung auf eine #rrggbb-Farbe an.
 * @param {string} hex
 * @param {{ lighten:number, hueShift:number }|null} change
 * @returns {string} unverändertes hex oder hsl(...)
 */
export function applySlideshowFillAudio(
  hex: string,
  change: Partial<SlideshowFillAudioChange> | null | undefined,
): string {
  if (!change || (!change.lighten && !change.hueShift)) return hex
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return hex
  const { h, s, l } = hexToHsl(hex)
  const hue = (((h + (change.hueShift || 0)) % 360) + 360) % 360
  // Aufhellen Richtung Weiß: Anteil der verbleibenden Helligkeit
  const light = Math.min(1, l + (1 - l) * (change.lighten || 0))
  const r = (v: number) => Math.round(v * 1000) / 10
  return `hsl(${Math.round(hue * 10) / 10}, ${r(s)}%, ${r(light)}%)`
}

const STORAGE_KEYS = Object.freeze({
  canvas: 'visualizer-slideshow-base-fill-audio',
  workspace: 'visualizer-slideshow-workspace-fill-audio',
})

function storageKey(target: SlideshowSurfaceTarget | string) {
  return target === 'workspace' ? STORAGE_KEYS.workspace : STORAGE_KEYS.canvas
}

/** Zuletzt gewählte Einstellung (dauerhaft, unabhängig von Presets). */
export function loadStoredSlideshowFillAudio(
  target: SlideshowSurfaceTarget | string = 'canvas',
): SlideshowFillAudio {
  try {
    const raw = localStorage.getItem(storageKey(target))
    return normalizeSlideshowFillAudio(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeSlideshowFillAudio(null)
  }
}

/** Merkt die Einstellung dauerhaft; der Standard entfernt den Eintrag. */
export function storeSlideshowFillAudio(
  audio: unknown,
  target: SlideshowSurfaceTarget | string = 'canvas',
): void {
  const normalized = normalizeSlideshowFillAudio(audio)
  const key = storageKey(target)
  try {
    if (isSameSlideshowFillAudio(normalized, SLIDESHOW_FILL_AUDIO_DEFAULT)) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(normalized))
    }
  } catch (e) {
    console.warn('[SlideshowFillAudio] Speichern fehlgeschlagen:', e)
  }
}
