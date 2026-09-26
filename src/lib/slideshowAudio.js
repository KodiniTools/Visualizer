import {
  AUDIO_REACTIVE_PRESETS,
  AUDIO_REACTIVE_PRESET_LIST,
  applyAudioReactivePreset,
  createAudioReactiveConfig,
} from './audio/audioReactiveConfig.js'

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
 * Liefert die Audio-Reaktiv-Konfiguration für ein Slideshow-Bild.
 * @param {string|undefined} mode - Modus des Bildes
 * @param {{ applyGlobal: boolean, savedSettings: object|null }} ctx
 * @returns {object|null} Konfiguration (Kopie) oder null = keine eigene Einstellung
 */
export function resolveSlideshowAudioReactive(mode, { applyGlobal, savedSettings }) {
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
