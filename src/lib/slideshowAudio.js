import {
  AUDIO_REACTIVE_PRESETS,
  AUDIO_REACTIVE_PRESET_LIST,
  applyAudioReactivePreset,
  createAudioReactiveConfig,
} from './audio/audioReactiveConfig.js'
import { SLIDESHOW_GRADIENT_AUDIO_SOURCES } from './slideshowGradientAudio.js'

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

/** @param {unknown} mode @returns {boolean} */
export function isValidSlideshowAudioMode(mode) {
  return (
    mode === SLIDESHOW_AUDIO_DEFAULT ||
    mode === SLIDESHOW_AUDIO_OFF ||
    mode === SLIDESHOW_AUDIO_SAVED ||
    (typeof mode === 'string' && Object.hasOwn(AUDIO_REACTIVE_PRESETS, mode))
  )
}

/** Preset-Optionen für die UI (Reihenfolge wie im Audio-Reaktiv-Panel). */
export const SLIDESHOW_AUDIO_PRESET_OPTIONS = AUDIO_REACTIVE_PRESET_LIST

/**
 * Eigene Audio-Quelle pro Slideshow-Bild (null = wie Einstellung/Preset).
 * Gleiche Quellen wie beim Bild-Audio-Reaktiv, inkl. Dynamisch und Onset.
 * @param {unknown} source @returns {boolean}
 */
export function isValidSlideshowAudioSource(source) {
  return typeof source === 'string' && SLIDESHOW_GRADIENT_AUDIO_SOURCES.includes(source)
}

/**
 * Setzt die Quelle einer Audio-Reaktiv-Konfiguration für das ganze Bild:
 * Master-Quelle + alle Effekte folgen ihr (eigene Effekt-Quellen → global).
 * @param {object|null} ar - Konfiguration (wird verändert)
 * @param {string|null|undefined} source
 * @returns {object|null} dieselbe Konfiguration
 */
export function applySlideshowAudioSource(ar, source) {
  if (!ar || typeof ar !== 'object' || !isValidSlideshowAudioSource(source)) return ar
  ar.source = source
  for (const fx of Object.values(ar.effects || {})) {
    if (fx && typeof fx === 'object' && fx.source) fx.source = ''
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
export function resolveSlideshowAudioReactive(mode, ctx) {
  return applySlideshowAudioSource(resolveMode(mode, ctx), ctx?.source)
}

function resolveMode(mode, { applyGlobal, savedSettings }) {
  const saved = savedSettings ? JSON.parse(JSON.stringify(savedSettings)) : null

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
