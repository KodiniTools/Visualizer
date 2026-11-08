import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isValidTransition } from '../lib/slideshowTransitions.js'
import {
  isValidSlideshowAudioMode,
  isValidSlideshowAudioSource,
  SLIDESHOW_AUDIO_DEFAULT,
} from '../lib/slideshowAudio.js'
import { normalizeImageBounds, type ImageBounds } from './slideshowPresetStore'

const STORAGE_KEY = 'visualizer-slideshow-image-transitions'
// Obergrenze, damit der Speicher nicht unbegrenzt wächst (älteste zuerst raus)
const MAX_ENTRIES = 500
// Grenzen der Übergangsdauer (ms), identisch zur Eingabe im Panel
const FADE_MIN = 100
const FADE_MAX = 5000
// Grenzen der Anzeigedauer (ms)
const DISPLAY_MIN = 500
const DISPLAY_MAX = 60000

/** Gemerkte Einstellungen eines Slideshow-Bildes (fehlende Felder = Standard). */
export interface SlideshowImageSettings {
  transition?: string
  fadeIn?: number
  fadeOut?: number
  displayDuration?: number
  audioMode?: string
  audioSource?: string
  bounds?: ImageBounds
}

/** Eingabe für set/update: null bzw. leere Werte entfernen ein Feld. */
export type SlideshowImageSettingsInput = {
  [K in keyof SlideshowImageSettings]?: SlideshowImageSettings[K] | null | unknown
}

function normalizeMs(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(Math.min(max, Math.max(min, n))) : null
}

function normalizeFade(value: unknown): number | null {
  return normalizeMs(value, FADE_MIN, FADE_MAX)
}

/**
 * Bereinigt einen gespeicherten Eintrag. Ältere Einträge waren nur die
 * Übergangs-ID (String) und werden übernommen.
 */
function normalizeEntry(raw: unknown): SlideshowImageSettings | null {
  const value = typeof raw === 'string' ? { transition: raw } : raw
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const src = value as Record<string, unknown>
  const entry: SlideshowImageSettings = {}
  if (isValidTransition(src.transition as string)) entry.transition = src.transition as string
  const fadeIn = normalizeFade(src.fadeIn)
  const fadeOut = normalizeFade(src.fadeOut)
  if (fadeIn !== null) entry.fadeIn = fadeIn
  if (fadeOut !== null) entry.fadeOut = fadeOut
  const displayDuration = normalizeMs(src.displayDuration, DISPLAY_MIN, DISPLAY_MAX)
  if (displayDuration !== null) entry.displayDuration = displayDuration
  // „Standard“ wird nicht gespeichert
  if (isValidSlideshowAudioMode(src.audioMode) && src.audioMode !== SLIDESHOW_AUDIO_DEFAULT) {
    entry.audioMode = src.audioMode as string
  }
  // Eigene Audio-Quelle (inkl. Onset/Dynamisch); fehlt = wie Einstellung
  if (isValidSlideshowAudioSource(src.audioSource)) entry.audioSource = src.audioSource as string
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
  const entries = ref<Record<string, SlideshowImageSettings>>({})
  let loaded = false

  function load() {
    if (loaded) return
    loaded = true
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      const clean: Record<string, SlideshowImageSettings> = {}
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

  /** Kopie der Einstellungen oder null */
  function getImageSettings(key: string | null | undefined): SlideshowImageSettings | null {
    load()
    const entry = key ? entries.value[key] : null
    return entry ? { ...entry } : null
  }

  /**
   * Setzt die Einstellungen eines Bildes vollständig; leere Werte werden
   * nicht gespeichert (= Standard). Ohne Werte wird der Eintrag entfernt.
   */
  function setImageSettings(
    key: string | null | undefined,
    settings: SlideshowImageSettingsInput | null | undefined,
  ) {
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
   */
  function updateImageSettings(
    key: string | null | undefined,
    partial: SlideshowImageSettingsInput,
  ) {
    if (!key) return
    setImageSettings(key, { ...(getImageSettings(key) || {}), ...partial })
  }

  /** Entfernt ein Feld (z. B. 'bounds') bei allen Bildern. */
  function clearField(field: string) {
    load()
    let changed = false
    const next: Record<string, SlideshowImageSettings> = {}
    for (const [key, entry] of Object.entries(entries.value)) {
      if (field in entry) {
        changed = true
        const rest = { ...entry }
        delete rest[field as keyof SlideshowImageSettings]
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
  function getTransition(key: string | null | undefined): string | null {
    return getImageSettings(key)?.transition ?? null
  }
  function setTransition(key: string | null | undefined, transition: string | null) {
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
