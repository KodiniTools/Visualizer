import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isValidTransition } from '../lib/slideshowTransitions.js'

const STORAGE_KEY = 'visualizer-slideshow-image-transitions'
// Obergrenze, damit der Speicher nicht unbegrenzt wächst (älteste zuerst raus)
const MAX_ENTRIES = 500

/**
 * Dauerhaft gemerkte Übergangsanimation pro Bild (localStorage), unabhängig
 * von Presets. Schlüssel: slideshowStableKey() (Stock-ID bzw. Name + Maße).
 */
export const useSlideshowImageSettingsStore = defineStore('slideshowImageSettings', () => {
  // { [stableKey]: transitionId } – Einfügereihenfolge = Alter
  const transitions = ref({})
  let loaded = false

  function load() {
    if (loaded) return
    loaded = true
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      const clean = {}
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof key === 'string' && key.length <= 300 && isValidTransition(value)) {
            clean[key] = value
          }
        }
      }
      transitions.value = clean
    } catch (e) {
      console.warn('[SlideshowImageSettings] Laden fehlgeschlagen:', e)
      transitions.value = {}
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transitions.value))
    } catch (e) {
      console.warn('[SlideshowImageSettings] Speichern fehlgeschlagen:', e)
    }
  }

  /** @param {string|null} key @returns {string|null} */
  function getTransition(key) {
    load()
    return key ? (transitions.value[key] ?? null) : null
  }

  /**
   * Setzt (gültige ID) oder entfernt (null/ungültig) den Übergang eines Bildes.
   * @param {string|null} key
   * @param {string|null} transition
   */
  function setTransition(key, transition) {
    load()
    if (!key) return
    const next = { ...transitions.value }
    const had = key in next
    delete next[key] // neu einfügen → gilt als jüngster Eintrag
    if (isValidTransition(transition)) next[key] = transition
    else if (!had) return
    const keys = Object.keys(next)
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) delete next[old]
    transitions.value = next
    persist()
  }

  return { transitions, load, getTransition, setTransition }
})
