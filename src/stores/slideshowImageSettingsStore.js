import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isValidTransition } from '../lib/slideshowTransitions.js'

const STORAGE_KEY = 'visualizer-slideshow-image-transitions'
// Obergrenze, damit der Speicher nicht unbegrenzt wächst (älteste zuerst raus)
const MAX_ENTRIES = 500
// Grenzen der Übergangsdauer (ms), identisch zur Eingabe im Panel
const FADE_MIN = 100
const FADE_MAX = 5000

function normalizeFade(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(Math.min(FADE_MAX, Math.max(FADE_MIN, n))) : null
}

/**
 * Bereinigt einen gespeicherten Eintrag. Ältere Einträge waren nur die
 * Übergangs-ID (String) und werden übernommen.
 * @returns {{ transition?:string, fadeIn?:number, fadeOut?:number }|null}
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
  return Object.keys(entry).length > 0 ? entry : null
}

/**
 * Dauerhaft gemerkte Übergangs-Einstellungen pro Bild (localStorage),
 * unabhängig von Presets: Übergang sowie Ein-/Ausblenddauer.
 * Schlüssel: slideshowStableKey() (Stock-ID bzw. Name + Maße).
 */
export const useSlideshowImageSettingsStore = defineStore('slideshowImageSettings', () => {
  // { [stableKey]: { transition?, fadeIn?, fadeOut? } } – Einfügereihenfolge = Alter
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
   * @param {{ transition?:string|null, fadeIn?:number|null, fadeOut?:number|null }} settings
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

  // Kurzformen für den Übergang allein
  function getTransition(key) {
    return getImageSettings(key)?.transition ?? null
  }
  function setTransition(key, transition) {
    const current = getImageSettings(key) || {}
    setImageSettings(key, { ...current, transition })
  }

  return { entries, load, getImageSettings, setImageSettings, getTransition, setTransition }
})
