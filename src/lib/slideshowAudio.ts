import {
  AUDIO_REACTIVE_PRESETS,
  AUDIO_REACTIVE_PRESET_LIST,
  applyAudioReactivePreset,
  createAudioReactiveConfig,
  type AudioReactiveConfig,
} from './audio/audioReactiveConfig'
import { SLIDESHOW_GRADIENT_AUDIO_SOURCES } from './slideshowGradientAudio'

/**
 * Audio-Reaktiv-Modus pro Slideshow-Bild.
 * - 'default': globale Einstellung (Checkbox + gespeicherte Einstellungen)
 * - 'off':     keine Audio-Reaktion für dieses Bild
 * - 'saved':   gespeicherte Audio-Reaktiv-Einstellungen (unabhängig von der Checkbox)
 * - Preset-ID: eingebautes Preset (pulse, dance, …)
 */
export const SLIDESHOW_AUDIO_DEFAULT = 'default'
export const SLIDESHOW_AUDIO_OFF = 'off'
export const SLIDESHOW_AUDIO_SAVED = 'saved'

/** Audio-Reaktiv-Konfiguration (Struktur siehe audio/audioReactiveConfig.js) */
export type SlideshowAudioReactive = Partial<AudioReactiveConfig>

export interface SlideshowAudioContext {
  applyGlobal: boolean
  savedSettings: object | null
  /** eigene Audio-Quelle des Bildes (null = unverändert) */
  source?: string | null
}

/** @param {unknown} mode @returns {boolean} */
export function isValidSlideshowAudioMode(mode: unknown): mode is string {
  return (
    mode === SLIDESHOW_AUDIO_DEFAULT ||
    mode === SLIDESHOW_AUDIO_OFF ||
    mode === SLIDESHOW_AUDIO_SAVED ||
    (typeof mode === 'string' && Object.prototype.hasOwnProperty.call(AUDIO_REACTIVE_PRESETS, mode))
  )
}

/** Preset-Optionen für die UI (Reihenfolge wie im Audio-Reaktiv-Panel). */
export const SLIDESHOW_AUDIO_PRESET_OPTIONS = AUDIO_REACTIVE_PRESET_LIST

/**
 * Eigene Audio-Quelle pro Slideshow-Bild (null = wie Einstellung/Preset).
 * Gleiche Quellen wie beim Bild-Audio-Reaktiv, inkl. Dynamisch und Onset.
 * @param {unknown} source @returns {boolean}
 */
export function isValidSlideshowAudioSource(source: unknown): source is string {
  return typeof source === 'string' && SLIDESHOW_GRADIENT_AUDIO_SOURCES.includes(source)
}

/**
 * Setzt die Quelle einer Audio-Reaktiv-Konfiguration für das ganze Bild:
 * Master-Quelle + alle Effekte folgen ihr (eigene Effekt-Quellen → global).
 * @param {object|null} ar - Konfiguration (wird verändert)
 * @param {string|null|undefined} source
 * @returns {object|null} dieselbe Konfiguration
 */
export function applySlideshowAudioSource<T extends SlideshowAudioReactive | null | undefined>(
  ar: T,
  source: unknown,
): T {
  if (!ar || typeof ar !== 'object' || !isValidSlideshowAudioSource(source)) return ar
  ar.source = source
  for (const fx of Object.values(ar.effects || {})) {
    const effect = fx as { source?: unknown } | null
    if (effect && typeof effect === 'object' && effect.source) effect.source = ''
  }
  return ar
}

/**
 * Liefert die Audio-Reaktiv-Konfiguration für ein Slideshow-Bild.
 * @param {string|undefined} mode - Modus des Bildes
 * @param {{ applyGlobal: boolean, savedSettings: object|null, source?: string|null }} ctx
 *   `source`: eigene Audio-Quelle des Bildes (null = unverändert)
 * @returns {object|null} Konfiguration (Kopie) oder null = keine eigene Einstellung
 */
export function resolveSlideshowAudioReactive(
  mode: unknown,
  ctx: SlideshowAudioContext,
): SlideshowAudioReactive | null {
  return applySlideshowAudioSource(resolveMode(mode, ctx), ctx?.source)
}

function resolveMode(
  mode: unknown,
  { applyGlobal, savedSettings }: SlideshowAudioContext,
): SlideshowAudioReactive | null {
  const saved: SlideshowAudioReactive | null = savedSettings
    ? JSON.parse(JSON.stringify(savedSettings))
    : null

  if (!isValidSlideshowAudioMode(mode) || mode === SLIDESHOW_AUDIO_DEFAULT) {
    return applyGlobal ? saved : null
  }
  if (mode === SLIDESHOW_AUDIO_OFF) {
    // Explizit deaktivierte Konfiguration, damit kein globaler Fallback greift
    return createAudioReactiveConfig()
  }
  if (mode === SLIDESHOW_AUDIO_SAVED) {
    return saved
  }
  const ar = createAudioReactiveConfig()
  applyAudioReactivePreset(ar, mode)
  return ar
}
