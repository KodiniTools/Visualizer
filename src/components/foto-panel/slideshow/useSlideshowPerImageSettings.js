import { ref, watch } from 'vue'
import { slideshowImageKey, slideshowStableKey } from './slideshowImageKey.js'
import { useSlideshowImageSettingsStore } from '../../../stores/slideshowImageSettingsStore.js'
import { SLIDESHOW_AUDIO_DEFAULT } from '../../../lib/slideshowAudio.js'

/**
 * Optionale Einstellungen pro Slideshow-Bild (Schlüssel: slideshowImageKey).
 * Fehlt ein Eintrag, gilt die globale Einstellung des Panels. Werte werden pro
 * Bild dauerhaft gemerkt (slideshowImageSettingsStore) und beim Wieder-
 * auswählen übernommen.
 *
 * WICHTIG: nach dem Befüllen von `orderedImages` aufrufen – der Watcher, der
 * gemerkte Werte übernimmt, läuft sofort.
 * @param {import('vue').Ref<object[]>} orderedImages
 */
export function useSlideshowPerImageSettings(orderedImages) {
  // Anzeigedauer ({ [key]: ms }); fehlt = displayDuration
  const imageDurations = ref({})
  // Audio-Reaktiv-Modus ({ [key]: mode }); fehlt = 'default'
  const imageAudioModes = ref({})
  // Übergangsanimation ({ [key]: transitionId }); fehlt = globaler Übergang
  const imageTransitions = ref({})
  // Ein-/Ausblenddauer ({ [key]: ms }); fehlt = Standard (Timing)
  const imageFadeIns = ref({})
  const imageFadeOuts = ref({})
  // Eigene Audio-Quelle (key → Quelle; fehlt = wie Einstellung)
  const imageAudioSources = ref({})

  // Feldname im Editor → Map
  const EDITOR_FIELDS = {
    transition: imageTransitions,
    duration: imageDurations,
    fadeIn: imageFadeIns,
    fadeOut: imageFadeOuts,
    audioMode: imageAudioModes,
    audioSource: imageAudioSources,
  }

  const imageSettingsStore = useSlideshowImageSettingsStore()

  // Dauerhaft gemerkte Einstellungen pro Bild übernehmen (Übergang, Ein-/Ausblend-
  // dauer, Anzeigedauer, Audio-Modus) – nur für Bilder ohne eigenen Wert
  const PERSISTED_MAPS = [
    ['transition', imageTransitions],
    ['fadeIn', imageFadeIns],
    ['fadeOut', imageFadeOuts],
    ['displayDuration', imageDurations],
    ['audioMode', imageAudioModes],
    ['audioSource', imageAudioSources],
  ]
  watch(
    orderedImages,
    (list) => {
      const next = {}
      for (const img of list) {
        const key = slideshowImageKey(img)
        if (key === undefined) continue
        const stored = imageSettingsStore.getImageSettings(slideshowStableKey(img))
        if (!stored) continue
        for (const [field, mapRef] of PERSISTED_MAPS) {
          if (stored[field] === undefined || mapRef.value[key] !== undefined) continue
          ;(next[field] ??= { ...mapRef.value })[key] = stored[field]
        }
      }
      for (const [field, mapRef] of PERSISTED_MAPS) {
        if (next[field]) mapRef.value = next[field]
      }
    },
    { immediate: true },
  )

  // Änderungen dauerhaft merken (Standard = nicht gespeichert)
  watch(
    [
      imageTransitions,
      imageFadeIns,
      imageFadeOuts,
      imageDurations,
      imageAudioModes,
      imageAudioSources,
    ],
    ([tr, fin, fout, dur, audio, audioSrc]) => {
      for (const img of orderedImages.value) {
        const key = slideshowImageKey(img)
        // nur diese Felder ändern – eigene Größe/Position bleibt erhalten
        imageSettingsStore.updateImageSettings(slideshowStableKey(img), {
          transition: tr[key] ?? null,
          fadeIn: fin[key] ?? null,
          fadeOut: fout[key] ?? null,
          displayDuration: dur[key] ?? null,
          audioMode: audio[key] ?? null,
          audioSource: audioSrc[key] ?? null,
        })
      }
    },
  )

  /**
   * Setzt einen Wert für ein Bild (null/undefined entfernt ihn).
   * @param {'transition'|'duration'|'fadeIn'|'fadeOut'|'audioMode'|'audioSource'} field
   */
  function setForImage(img, field, value) {
    const mapRef = EDITOR_FIELDS[field]
    const key = slideshowImageKey(img)
    const next = { ...mapRef.value }
    if (value === null || value === undefined) delete next[key]
    else next[key] = value
    mapRef.value = next
  }

  /** Bild-Eintrag für die Start-/Live-Update-Konfiguration. */
  function payloadFor(img) {
    const key = slideshowImageKey(img)
    const own = imageDurations.value[key]
    return {
      ...img,
      displayDuration: Number.isFinite(own) ? own : undefined,
      audioMode: imageAudioModes.value[key] ?? SLIDESHOW_AUDIO_DEFAULT,
      audioSource: imageAudioSources.value[key] ?? null,
      transition: imageTransitions.value[key],
      fadeInDuration: imageFadeIns.value[key],
      fadeOutDuration: imageFadeOuts.value[key],
    }
  }

  /** Werte eines Bildes für einen Preset-Slot. */
  function slotFor(img) {
    const key = slideshowImageKey(img)
    return {
      displayDuration: imageDurations.value[key] ?? null,
      audioMode: imageAudioModes.value[key] ?? SLIDESHOW_AUDIO_DEFAULT,
      audioSource: imageAudioSources.value[key] ?? null,
      transition: imageTransitions.value[key] ?? null,
      fadeIn: imageFadeIns.value[key] ?? null,
      fadeOut: imageFadeOuts.value[key] ?? null,
    }
  }

  /**
   * Preset-Slots auf Bilder übertragen; Bilder ohne passenden Slot erhalten
   * die Standardwerte (alle Maps werden ersetzt).
   * @param {{ img: object, slot?: object }[]} pairs
   */
  function applySlots(pairs) {
    const durations = {}
    const modes = {}
    const ownTransitions = {}
    const ownFadeIns = {}
    const ownFadeOuts = {}
    const ownSources = {}
    pairs.forEach(({ img, slot }) => {
      const key = slideshowImageKey(img)
      if (!slot || key === undefined) return
      if (Number.isFinite(slot.displayDuration)) durations[key] = slot.displayDuration
      if (slot.audioMode !== SLIDESHOW_AUDIO_DEFAULT) modes[key] = slot.audioMode
      if (slot.transition) ownTransitions[key] = slot.transition
      if (Number.isFinite(slot.fadeIn)) ownFadeIns[key] = slot.fadeIn
      if (Number.isFinite(slot.fadeOut)) ownFadeOuts[key] = slot.fadeOut
      if (slot.audioSource) ownSources[key] = slot.audioSource
    })
    imageDurations.value = durations
    imageAudioModes.value = modes
    imageTransitions.value = ownTransitions
    imageFadeIns.value = ownFadeIns
    imageFadeOuts.value = ownFadeOuts
    imageAudioSources.value = ownSources
  }

  return {
    imageDurations,
    imageAudioModes,
    imageTransitions,
    imageFadeIns,
    imageFadeOuts,
    imageAudioSources,
    setForImage,
    payloadFor,
    slotFor,
    applySlots,
  }
}
