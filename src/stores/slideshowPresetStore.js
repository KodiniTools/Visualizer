import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SLIDESHOW_AUDIO_DEFAULT, isValidSlideshowAudioMode } from '../lib/slideshowAudio.js'

const STORAGE_KEY = 'visualizer-slideshow-presets'
const PRESET_VERSION = 1

/** Standardwerte der Slideshow-Einstellungen (identisch zu SlideshowPanel). */
export const SLIDESHOW_DEFAULT_SETTINGS = Object.freeze({
  fadeInDuration: 1000,
  displayDuration: 3000,
  fadeOutDuration: 1000,
  applyAudioReactive: true,
  loop: false,
  renderBehindVisualizer: false,
  fitToWorkspace: false,
  transform: Object.freeze({ x: 10, y: 10, width: 80, height: 80 }),
})

function clampNumber(value, min, max, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

/**
 * Normalisiert ein (evtl. altes/manipuliertes) Preset aus dem localStorage.
 * Fehlende oder ungültige Werte werden durch Standardwerte ersetzt.
 * @param {object} raw
 * @returns {object|null} null, wenn das Preset unbrauchbar ist
 */
export function normalizeSlideshowPreset(raw) {
  if (!raw || typeof raw !== 'object') return null
  const d = SLIDESHOW_DEFAULT_SETTINGS
  const s = raw.settings && typeof raw.settings === 'object' ? raw.settings : {}
  const t = s.transform && typeof s.transform === 'object' ? s.transform : {}
  const slots = Array.isArray(raw.slots) ? raw.slots : []

  return {
    id: String(raw.id ?? `slideshow-${Date.now()}`),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Slideshow',
    version: PRESET_VERSION,
    settings: {
      fadeInDuration: clampNumber(s.fadeInDuration, 100, 5000, d.fadeInDuration),
      displayDuration: clampNumber(s.displayDuration, 500, 30000, d.displayDuration),
      fadeOutDuration: clampNumber(s.fadeOutDuration, 100, 5000, d.fadeOutDuration),
      applyAudioReactive:
        typeof s.applyAudioReactive === 'boolean' ? s.applyAudioReactive : d.applyAudioReactive,
      loop: typeof s.loop === 'boolean' ? s.loop : d.loop,
      renderBehindVisualizer:
        typeof s.renderBehindVisualizer === 'boolean'
          ? s.renderBehindVisualizer
          : d.renderBehindVisualizer,
      fitToWorkspace: typeof s.fitToWorkspace === 'boolean' ? s.fitToWorkspace : d.fitToWorkspace,
      transform: {
        x: clampNumber(t.x, 0, 100, d.transform.x),
        y: clampNumber(t.y, 0, 100, d.transform.y),
        width: clampNumber(t.width, 10, 100, d.transform.width),
        height: clampNumber(t.height, 10, 100, d.transform.height),
      },
    },
    // Pro Position (1. Bild, 2. Bild, …) – Bilder selbst werden nicht gespeichert
    slots: slots.map((slot) => {
      const ms = Number(slot?.displayDuration)
      return {
        displayDuration: Number.isFinite(ms) && ms > 0 ? Math.min(ms, 60000) : null,
        audioMode: isValidSlideshowAudioMode(slot?.audioMode)
          ? slot.audioMode
          : SLIDESHOW_AUDIO_DEFAULT,
      }
    }),
  }
}

/**
 * Slideshow-Presets: speichern Timing, Audio-Reaktiv-Option, Loop, Layer,
 * Position/Größe sowie pro Bild-Position die Anzeigedauer und den
 * Audio-Reaktiv-Modus. Bilder werden nicht gespeichert (wie bei Kachel-Presets).
 */
export const useSlideshowPresetStore = defineStore('slideshowPresets', () => {
  const presets = ref([])
  let loaded = false

  function loadPresets() {
    if (loaded) return
    loaded = true
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : []
      presets.value = Array.isArray(parsed)
        ? parsed.map(normalizeSlideshowPreset).filter(Boolean)
        : []
    } catch (e) {
      console.warn('[SlideshowPresets] Laden fehlgeschlagen:', e)
      presets.value = []
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value))
      return true
    } catch (e) {
      console.warn('[SlideshowPresets] Speichern fehlgeschlagen:', e)
      return false
    }
  }

  /**
   * @param {string} name
   * @param {{ settings: object, slots: Array<{displayDuration:number|null, audioMode:string}> }} snapshot
   * @returns {object|null} gespeichertes Preset oder null bei Speicherfehler
   */
  function savePreset(name, snapshot) {
    loadPresets()
    const preset = normalizeSlideshowPreset({
      id: `slideshow-${Date.now()}`,
      name: name || `Slideshow ${presets.value.length + 1}`,
      ...snapshot,
    })
    presets.value = [preset, ...presets.value]
    if (!persist()) {
      presets.value = presets.value.slice(1)
      return null
    }
    return preset
  }

  function deletePreset(id) {
    loadPresets()
    presets.value = presets.value.filter((p) => p.id !== id)
    persist()
  }

  return { presets, loadPresets, savePreset, deletePreset }
})
