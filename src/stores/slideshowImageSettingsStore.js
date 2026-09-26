import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isValidTransition } from '../lib/slideshowTransitions.js'
import { isValidSlideshowAudioMode, SLIDESHOW_AUDIO_DEFAULT } from '../lib/slideshowAudio.js'
import { normalizeImageBounds } from './slideshowPresetStore.js'

const STORAGE_KEY = 'visualizer-slideshow-image-transitions'
// Obergrenze, damit der Speicher nicht unbegrenzt wächst (älteste zuerst raus)
const MAX_ENTRIES = 500
// Grenzen der Übergangsdauer (ms), identisch zur Eingabe im Panel
const FADE_MIN = 100
const FADE_MAX = 5000
// Grenzen der Anzeigedauer (ms)
const DISPLAY_MIN = 500
const DISPLAY_MAX = 60000

function normalizeMs(value, min, max) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(Math.min(max, Math.max(min, n))) : null
}

function normalizeFade(value) {
  return normalizeMs(value, FADE_MIN, FADE_MAX)
}

/**
 * Bereinigt einen gespeicherten Eintrag. Ältere Einträge waren nur die
 * Übergangs-ID (String) und werden übernommen.
 * @returns {{ transition?:string, fadeIn?:number, fadeOut?:number, displayDuration?:number, audioMode?:string }|null}
 */
function normalizeEntry(raw) {
  const src = typeof raw === 'string' ? { transition: raw } : raw
  if (!src || typeof src !== 'object' || Array.isArray(src)) return null
  const entry = {}
  if (isValidTransition(src.transition)) entry.transition = src.transition
  const fadeIn = normalizeFade(src.fadeIn)
  const fadeOut = normalizeFade(src.fadeOut)
  if (fadeIn !== null) entry.fadeIn = fadeIn
  if (fadeOut !== null) entry.fadeOut = fadeOut
  const displayDuration = normalizeMs(src.displayDuration, DISPLAY_MIN, DISPLAY_MAX)
  if (displayDuration !== null) entry.displayDuration = displayDuration
  // „Standard“ wird nicht gespeichert
  if (isValidSlideshowAudioMode(src.audioMode) && src.audioMode !== SLIDESHOW_AUDIO_DEFAULT) {
    entry.audioMode = src.audioMode
  }
  // Eigene Größe/Position (relativ zum Canvas)
  const bounds = normalizeImageBounds(src.bounds)
  if (bounds) entry.bounds = bounds
  return Object.keys(entry).length > 0 ? entry : null
}

/**
 * Dauerhaft gemerkte Einstellungen pro Bild (localStorage), unabhängig von
 * Presets: Übergang, Ein-/Ausblenddauer, Anzeigedauer, Audio-Modus und eigene
 * Größe/Position.
 * Schlüssel: slideshowStableKey() (Stock-ID bzw. Name + Maße).
 */
export const useSlideshowImageSettingsStore = defineStore('slideshowImageSettings', () => {
  // { [stableKey]: { transition?, fadeIn?, fadeOut?, displayDuration?, audioMode? } }
  // – Einfügereihenfolge = Alter
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
      console.warn('[SlideshowImageSettings] Laden fehlgeschlagen:', e)
      entries.value = {}
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value))
    } catch (e) {
      console.warn('[SlideshowImageSettings] Speichern fehlgeschlagen:', e)
    }
  }

  /** @param {string|null} key @returns {{ transition?:string, fadeIn?:number, fadeOut?:number }|null} */
  function getImageSettings(key) {
    load()
    const entry = key ? entries.value[key] : null
    return entry ? { ...entry } : null
  }

  /**
   * Setzt die Einstellungen eines Bildes vollständig; leere Werte werden
   * nicht gespeichert (= Standard). Ohne Werte wird der Eintrag entfernt.
   * @param {string|null} key
   * @param {{ transition?:string|null, fadeIn?:number|null, fadeOut?:number|null, displayDuration?:number|null, audioMode?:string|null }} settings
   */
  function setImageSettings(key, settings) {
    load()
    if (!key) return
    const entry = normalizeEntry(settings || {})
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

  /**
   * Ändert nur die angegebenen Felder eines Bildes (null entfernt ein Feld),
   * die übrigen bleiben erhalten.
   * @param {string|null} key
   * @param {object} partial
   */
  function updateImageSettings(key, partial) {
    if (!key) return
    setImageSettings(key, { ...(getImageSettings(key) || {}), ...partial })
  }

  /** Entfernt ein Feld (z. B. 'bounds') bei allen Bildern. */
  function clearField(field) {
    load()
    let changed = false
    const next = {}
    for (const [key, entry] of Object.entries(entries.value)) {
      if (field in entry) {
        changed = true
        const rest = { ...entry }
        delete rest[field]
        if (Object.keys(rest).length > 0) next[key] = rest
      } else {
        next[key] = entry
      }
    }
    if (!changed) return
    entries.value = next
    persist()
  }

  // Kurzformen für den Übergang allein
  function getTransition(key) {
    return getImageSettings(key)?.transition ?? null
  }
  function setTransition(key, transition) {
    updateImageSettings(key, { transition })
  }

  return {
    entries,
    load,
    getImageSettings,
    setImageSettings,
    updateImageSettings,
    clearField,
    getTransition,
    setTransition,
  }
})
