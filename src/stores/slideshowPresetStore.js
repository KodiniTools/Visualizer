import { defineStore } from 'pinia'
import { ref, markRaw } from 'vue'
import { SLIDESHOW_AUDIO_DEFAULT, isValidSlideshowAudioMode } from '../lib/slideshowAudio.js'
import { ensureAudioReactiveConfig } from '../lib/audio/audioReactiveConfig.js'

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
  moveWholeSlideshow: false,
  transform: Object.freeze({ x: 10, y: 10, width: 80, height: 80 }),
})

// Erlaubte Bild-Anpassungen (fotoSettings) im Preset: [min, max] für Zahlen
const ADJUSTMENT_NUMBERS = Object.freeze({
  brightness: [0, 200],
  contrast: [0, 200],
  saturation: [0, 200],
  opacity: [0, 100],
  blur: [0, 20],
  hueRotate: [0, 360],
  grayscale: [0, 100],
  sepia: [0, 100],
  invert: [0, 100],
  shadowBlur: [0, 50],
  shadowOffsetX: [-50, 50],
  shadowOffsetY: [-50, 50],
  rotation: [-360, 360],
  borderWidth: [0, 50],
  borderOpacity: [0, 100],
})
const ADJUSTMENT_BOOLEANS = Object.freeze(['flipH', 'flipV'])
const ADJUSTMENT_COLORS = Object.freeze(['shadowColor', 'borderColor'])
const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i

/**
 * Bereinigt gespeicherte Bild-Anpassungen: nur bekannte Felder mit gültigen
 * Werten; Audio-Reaktiv wird vervollständigt.
 * @param {unknown} raw
 * @returns {object|null}
 */
export function normalizeImageAdjustments(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out = {}
  for (const [key, [min, max]] of Object.entries(ADJUSTMENT_NUMBERS)) {
    const n = Number(raw[key])
    if (raw[key] !== undefined && Number.isFinite(n)) out[key] = Math.min(max, Math.max(min, n))
  }
  for (const key of ADJUSTMENT_BOOLEANS) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key]
  }
  for (const key of ADJUSTMENT_COLORS) {
    if (typeof raw[key] === 'string' && COLOR_RE.test(raw[key].trim())) out[key] = raw[key].trim()
  }
  if (typeof raw.preset === 'string' && raw.preset.length <= 40) out.preset = raw.preset
  if (raw.audioReactive && typeof raw.audioReactive === 'object') {
    out.audioReactive = ensureAudioReactiveConfig(JSON.parse(JSON.stringify(raw.audioReactive)))
  }
  return Object.keys(out).length > 0 ? out : null
}

/**
 * Bereinigt eigene Bild-Bounds (relativ 0–1, Mindestgröße 1 %).
 * @param {unknown} raw
 * @returns {{relX:number, relY:number, relWidth:number, relHeight:number}|null}
 */
export function normalizeImageBounds(raw) {
  if (!raw || typeof raw !== 'object') return null
  const vals = ['relX', 'relY', 'relWidth', 'relHeight'].map((k) => Number(raw[k]))
  if (!vals.every(Number.isFinite)) return null
  const [relX, relY, relWidth, relHeight] = vals
  if (relWidth < 0.01 || relHeight < 0.01 || relWidth > 5 || relHeight > 5) return null
  // Position so begrenzen, dass das Bild zumindest teilweise sichtbar bleibt
  return {
    relX: Math.min(1, Math.max(-relWidth + 0.01, relX)),
    relY: Math.min(1, Math.max(-relHeight + 0.01, relY)),
    relWidth,
    relHeight,
  }
}

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
      // Maus verschiebt ganze Slideshow (ältere Presets: aus)
      moveWholeSlideshow:
        typeof s.moveWholeSlideshow === 'boolean' ? s.moveWholeSlideshow : d.moveWholeSlideshow,
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
        // Während der Slideshow vorgenommene Bild-Anpassungen (Filter, Audio …)
        adjustments: normalizeImageAdjustments(slot?.adjustments),
        // Eigene Position/Größe des Bildes (relativ zum Canvas) oder null
        bounds: normalizeImageBounds(slot?.bounds),
      }
    }),
  }
}

/**
 * Slideshow-Presets: speichern Timing, Audio-Reaktiv-Option, Loop, Layer,
 * Position/Größe sowie pro Bild-Position die Anzeigedauer und den
 * Audio-Reaktiv-Modus. Die Bilder selbst werden nur für die laufende Sitzung
 * im Speicher gehalten (sessionImages), nicht im localStorage.
 */
export const useSlideshowPresetStore = defineStore('slideshowPresets', () => {
  const presets = ref([])
  let loaded = false
  // Bilder pro Preset – nur für die laufende Sitzung (nicht im localStorage):
  // presetId → Array von Slideshow-Bildeinträgen ({ id, name, imageObject | stockImage, … })
  const sessionImages = ref({})

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
   * @param {{ settings: object, slots: Array<{displayDuration:number|null, audioMode:string, adjustments?:object|null, bounds?:object|null}> }} snapshot
   * @returns {object|null} gespeichertes Preset oder null bei Speicherfehler
   */
  function savePreset(name, snapshot, images = null) {
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
    if (Array.isArray(images) && images.length > 0) {
      // markRaw: Bildobjekte (HTMLImageElement) nicht reaktiv machen
      sessionImages.value = {
        ...sessionImages.value,
        [preset.id]: images.map((img) => markRaw({ ...img })),
      }
    }
    return preset
  }

  function deletePreset(id) {
    loadPresets()
    presets.value = presets.value.filter((p) => p.id !== id)
    persist()
    if (sessionImages.value[id]) {
      const next = { ...sessionImages.value }
      delete next[id]
      sessionImages.value = next
    }
  }

  /** In dieser Sitzung zum Preset gespeicherte Bilder (Kopie der Liste) oder null. */
  function getSessionImages(id) {
    const list = sessionImages.value[id]
    return list ? [...list] : null
  }

  return { presets, sessionImages, loadPresets, savePreset, deletePreset, getSessionImages }
})
