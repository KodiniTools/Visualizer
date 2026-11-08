/**
 * Optionen der Slideshow-Auswahlfelder (Übergang, Audio-Modus) für UiSelect.
 * Gemeinsam genutzt von Bild-Einstellungskarte und Reihenfolge-Liste.
 */
import { SLIDESHOW_AUDIO_PRESET_OPTIONS } from '../../../lib/slideshowAudio'
import { SLIDESHOW_TRANSITIONS } from '../../../lib/slideshowTransitions.js'

/** Übergang: „Standard (…)“ plus alle Übergänge mit Symbol. */
export function transitionOptions(t, defaultTransition) {
  return [
    {
      value: 'default',
      label: `${t('slideshow.transitionDefault')} (${t(`slideshow.transitions.${defaultTransition}`)})`,
    },
    ...SLIDESHOW_TRANSITIONS.map((tr) => ({
      value: tr.id,
      label: `${tr.icon} ${t(`slideshow.transitions.${tr.id}`)}`,
    })),
  ]
}

/** Audio-Modus: Standard, Aus, Gespeichert (nur mit Einstellungen) und Presets. */
export function audioModeOptions(t, hasSavedSettings) {
  return [
    { value: 'default', label: t('slideshow.audioModeDefault') },
    { value: 'off', label: t('slideshow.audioModeOff') },
    { value: 'saved', label: t('slideshow.audioModeSaved'), disabled: !hasSavedSettings },
    ...SLIDESHOW_AUDIO_PRESET_OPTIONS.map((p) => ({ value: p.id, label: `${p.icon} ${p.name}` })),
  ]
}
