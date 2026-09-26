import { defineStore } from 'pinia'
import { ref } from 'vue'
import { normalizeImageAdjustments } from './slideshowPresetStore.js'
import { isValidSlideshowAudioMode, SLIDESHOW_AUDIO_DEFAULT } from '../lib/slideshowAudio.js'

const STORAGE_KEY = 'visualizer-slideshow-image-adjustments'
// Anpassungen sind größer als die übrigen Einstellungen pro Bild → eigene,
// kleinere Obergrenze (älteste zuerst raus)
const MAX_ENTRIES = 200

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const adjustments = normalizeImageAdjustments(raw.adjustments)
  if (!adjustments) return null
  const audioMode = isValidSlideshowAudioMode(raw.audioMode)
    ? raw.audioMode
    : SLIDESHOW_AUDIO_DEFAULT
  return { adjustments, audioMode }
}

/**
 * Dauerhaft gemerkte Bild-Anpassungen pro Slideshow-Bild (localStorage):
 * Filter, Schatten, Rotation, Spiegeln, Kontur und Audio-Feinwerte, wie sie
 * während der Slideshow am Bild eingestellt wurden. `audioMode` ist der
 * Audio-Modus des Panels, zu dem die gespeicherte Audio-Einstellung gehört.
 * Schlüssel: slideshowStableKey() (Stock-ID bzw. Name + Maße).
 */
export const useSlideshowImageAdjustmentsStore = defineStore('slideshowImageAdjustments', () => {
  // { [stableKey]: { adjustments, audioMode } } – Einfügereihenfolge = Alter
  const entries = ref({})
  let loaded = false

  function load() {
    if (loaded) return
    loaded = true
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      const clean = {}
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed)) {
          const entry = key && key.length <= 300 ? normalizeEntry(value) : null
          if (entry) clean[key] = entry
        }
      }
      entries.value = clean
    } catch (e) {
      console.warn('[SlideshowImageAdjustments] Laden fehlgeschlagen:', e)
      entries.value = {}
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value))
    } catch (e) {
      console.warn('[SlideshowImageAdjustments] Speichern fehlgeschlagen:', e)
    }
  }

  /** @returns {{ adjustments: object, audioMode: string }|null} (Kopie) */
  function getAdjustments(key) {
    load()
    const entry = key ? entries.value[key] : null
    return entry ? JSON.parse(JSON.stringify(entry)) : null
  }

  /**
   * Merkt die Anpassungen eines Bildes (nur bei Änderung wird gespeichert);
   * null entfernt den Eintrag.
   * @param {string|null} key
   * @param {object|null} adjustments - fotoSettings-Kopie
   * @param {string} [audioMode]
   */
  function setAdjustments(key, adjustments, audioMode) {
    load()
    if (!key) return
    const entry = adjustments ? normalizeEntry({ adjustments, audioMode }) : null
    const current = entries.value[key]
    if (JSON.stringify(current ?? null) === JSON.stringify(entry)) return
    const next = { ...entries.value }
    delete next[key] // neu einfügen → gilt als jüngster Eintrag
    if (entry) next[key] = entry
    const keys = Object.keys(next)
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) delete next[old]
    entries.value = next
    persist()
  }

  /** Alle gemerkten Anpassungen verwerfen („Bild-Anpassungen zurücksetzen“). */
  function clearAll() {
    load()
    entries.value = {}
    persist()
  }

  return { entries, load, getAdjustments, setAdjustments, clearAll }
})
