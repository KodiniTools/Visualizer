import { defineStore } from 'pinia'
import { ref, markRaw } from 'vue'
import {
  SLIDESHOW_AUDIO_DEFAULT,
  isValidSlideshowAudioMode,
  isValidSlideshowAudioSource,
} from '../lib/slideshowAudio.js'
import { ensureAudioReactiveConfig } from '../lib/audio/audioReactiveConfig.js'
import { SLIDESHOW_TRANSITION_DEFAULT, isValidTransition } from '../lib/slideshowTransitions.js'
import {
  SLIDESHOW_BASE_COLOR_DEFAULT,
  SLIDESHOW_GRADIENT_DEFAULT,
  normalizeSlideshowBaseColor,
  normalizeSlideshowGradient,
} from '../lib/slideshowBaseColor.js'
import { normalizeStockRef, normalizeUploadRef } from '../lib/slideshowImageRefs.js'
import {
  SLIDESHOW_IMAGE_FILL_DEFAULT,
  collectStoredImageFillKeys,
  normalizeSlideshowImageFill,
} from '../lib/slideshowImageFill.js'
import {
  SLIDESHOW_FILL_AUDIO_DEFAULT,
  normalizeSlideshowFillAudio,
} from '../lib/slideshowFillAudio.js'
import {
  pruneImages,
  getImageStorageStats,
  getStorageEstimate,
} from '../utils/presetImageRepository.js'

const STORAGE_KEY = 'visualizer-slideshow-presets'
// Frisch gespeicherte Bilder beim Aufräumen schonen (laufendes Speichern,
// auch in einem anderen Tab, darf nicht betroffen sein)
export const IMAGE_CLEANUP_GRACE_MS = 5 * 60 * 1000
// „Jetzt aufräumen“: nur ein gerade laufendes Speichern (Sekunden) schonen
export const MANUAL_CLEANUP_GRACE_MS = 60 * 1000
const AUTO_CLEANUP_DELAY_MS = 3000
let autoCleanupScheduled = false

/** Nur für Tests: automatisches Aufräumen wieder erlauben. */
export function _resetAutoCleanup() {
  autoCleanupScheduled = false
}
const PRESET_VERSION = 1

/** Gespeicherte, evtl. alte oder manipulierte Daten: Felder erst prüfen, dann nutzen. */
type Loose = Record<string, unknown>
const asLoose = (v: unknown): Loose => (v && typeof v === 'object' ? (v as Loose) : {})

export type SlideshowBackgroundMode = 'none' | 'canvas' | 'workspace'

/** Eigene Bild-Bounds, relativ zum Canvas */
export interface ImageBounds {
  relX: number
  relY: number
  relWidth: number
  relHeight: number
}

/** Bereinigte Bild-Anpassungen (fotoSettings-Auszug) */
export type ImageAdjustments = Record<string, unknown>

/** Standardwerte der Slideshow-Einstellungen (identisch zu SlideshowPanel). */
export const SLIDESHOW_DEFAULT_SETTINGS = Object.freeze({
  fadeInDuration: 1000,
  displayDuration: 3000,
  fadeOutDuration: 1000,
  applyAudioReactive: true,
  loop: false,
  renderBehindVisualizer: false,
  fitToWorkspace: false,
  backgroundMode: 'none',
  // Fläche unter der Slideshow, wenn sie ein Hintergrundbild ersetzt
  backgroundColor: SLIDESHOW_BASE_COLOR_DEFAULT,
  // Eigene Farbe der Workspace-Fläche
  workspaceColor: SLIDESHOW_BASE_COLOR_DEFAULT,
  // Farbverläufe der Flächen (aus = einfarbig)
  backgroundGradient: SLIDESHOW_GRADIENT_DEFAULT,
  workspaceGradient: SLIDESHOW_GRADIENT_DEFAULT,
  // Audio-Reaktive Flächenfarbe (aus)
  backgroundFillAudio: SLIDESHOW_FILL_AUDIO_DEFAULT,
  workspaceFillAudio: SLIDESHOW_FILL_AUDIO_DEFAULT,
  // Eigenes Bild als Fläche (aus)
  backgroundImageFill: SLIDESHOW_IMAGE_FILL_DEFAULT,
  workspaceImageFill: SLIDESHOW_IMAGE_FILL_DEFAULT,
  moveWholeSlideshow: false,
  transition: SLIDESHOW_TRANSITION_DEFAULT,
  transform: Object.freeze({ x: 10, y: 10, width: 80, height: 80 }),
})

// Erlaubte Bild-Anpassungen (fotoSettings) im Preset: [min, max] für Zahlen
const ADJUSTMENT_NUMBERS: Readonly<Record<string, readonly [number, number]>> = Object.freeze({
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
 */
export function normalizeImageAdjustments(input: unknown): ImageAdjustments | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const raw = input as Loose
  const out: ImageAdjustments = {}
  for (const [key, [min, max]] of Object.entries(ADJUSTMENT_NUMBERS)) {
    const n = Number(raw[key])
    if (raw[key] !== undefined && Number.isFinite(n)) out[key] = Math.min(max, Math.max(min, n))
  }
  for (const key of ADJUSTMENT_BOOLEANS) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key]
  }
  for (const key of ADJUSTMENT_COLORS) {
    const value = raw[key]
    if (typeof value === 'string' && COLOR_RE.test(value.trim())) out[key] = value.trim()
  }
  if (typeof raw.preset === 'string' && raw.preset.length <= 40) out.preset = raw.preset
  if (raw.audioReactive && typeof raw.audioReactive === 'object') {
    out.audioReactive = ensureAudioReactiveConfig(
      JSON.parse(JSON.stringify(raw.audioReactive)) as object,
    )
  }
  return Object.keys(out).length > 0 ? out : null
}

// Weiterhin hier exportiert (bestehende Aufrufer/Tests)
export { normalizeStockRef, normalizeUploadRef }

/** Alle von Presets verwendeten Bild-Schlüssel. */
interface UploadKeySource {
  slots?: Array<{ upload?: { key?: string } | null } | null>
  settings?: {
    backgroundImageFill?: { upload?: { key?: string } | null } | null
    workspaceImageFill?: { upload?: { key?: string } | null } | null
  }
}

export function collectUploadKeys(
  presetList: ReadonlyArray<UploadKeySource | null | undefined> | null | undefined,
): Set<string> {
  const keys = new Set<string>()
  for (const preset of presetList || []) {
    for (const slot of preset?.slots || []) {
      if (slot?.upload?.key) keys.add(slot.upload.key)
    }
    // Flächenbilder (Canvas/Workspace) des Presets
    for (const fill of [
      preset?.settings?.backgroundImageFill,
      preset?.settings?.workspaceImageFill,
    ]) {
      if (fill?.upload?.key) keys.add(fill.upload.key)
    }
  }
  return keys
}

/**
 * Bereinigt eigene Bild-Bounds (relativ 0–1, Mindestgröße 1 %).
 */
export function normalizeImageBounds(raw: unknown): ImageBounds | null {
  if (!raw || typeof raw !== 'object') return null
  const src = raw as Loose
  const vals = ['relX', 'relY', 'relWidth', 'relHeight'].map((k) => Number(src[k]))
  if (!vals.every(Number.isFinite)) return null
  const [relX, relY, relWidth, relHeight] = vals as [number, number, number, number]
  if (relWidth < 0.01 || relHeight < 0.01 || relWidth > 5 || relHeight > 5) return null
  // Position so begrenzen, dass das Bild zumindest teilweise sichtbar bleibt
  return {
    relX: Math.min(1, Math.max(-relWidth + 0.01, relX)),
    relY: Math.min(1, Math.max(-relHeight + 0.01, relY)),
    relWidth,
    relHeight,
  }
}

function normalizeFade(value: unknown): number | null {
  const n = Number(value)
  return value !== null && value !== undefined && Number.isFinite(n) && n > 0
    ? Math.round(Math.min(5000, Math.max(100, n)))
    : null
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

/**
 * Normalisiert ein (evtl. altes/manipuliertes) Preset aus dem localStorage.
 * Fehlende oder ungültige Werte werden durch Standardwerte ersetzt.
 * @returns null, wenn das Preset unbrauchbar ist
 */
export function normalizeSlideshowPreset(input: unknown) {
  if (!input || typeof input !== 'object') return null
  const raw = input as Loose
  const d = SLIDESHOW_DEFAULT_SETTINGS
  const s = asLoose(raw.settings)
  const t = asLoose(s.transform)
  const slots: unknown[] = Array.isArray(raw.slots) ? raw.slots : []

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
      // Slideshow als Hintergrund; ältere Presets: fitToWorkspace → 'workspace'
      backgroundMode: (['none', 'canvas', 'workspace'].includes(s.backgroundMode as string)
        ? s.backgroundMode
        : s.fitToWorkspace === true
          ? 'workspace'
          : d.backgroundMode) as SlideshowBackgroundMode,
      // Farbe der Fläche unter der Slideshow (ältere Presets: Schwarz)
      backgroundColor: normalizeSlideshowBaseColor(s.backgroundColor, d.backgroundColor),
      workspaceColor: normalizeSlideshowBaseColor(s.workspaceColor, d.workspaceColor),
      // Farbverläufe (ältere Presets: aus)
      backgroundGradient: normalizeSlideshowGradient(s.backgroundGradient),
      workspaceGradient: normalizeSlideshowGradient(s.workspaceGradient),
      // Audio-Reaktive Flächenfarbe (ältere Presets: aus)
      backgroundFillAudio: normalizeSlideshowFillAudio(s.backgroundFillAudio),
      workspaceFillAudio: normalizeSlideshowFillAudio(s.workspaceFillAudio),
      // Eigenes Bild als Fläche (ältere Presets: aus)
      backgroundImageFill: normalizeSlideshowImageFill(s.backgroundImageFill),
      workspaceImageFill: normalizeSlideshowImageFill(s.workspaceImageFill),
      // Maus verschiebt ganze Slideshow (ältere Presets: aus)
      moveWholeSlideshow:
        typeof s.moveWholeSlideshow === 'boolean' ? s.moveWholeSlideshow : d.moveWholeSlideshow,
      // Übergangsanimation (ältere Presets: Überblenden)
      transition: (isValidTransition(s.transition) ? s.transition : d.transition) as string,
      transform: {
        x: clampNumber(t.x, 0, 100, d.transform.x),
        y: clampNumber(t.y, 0, 100, d.transform.y),
        width: clampNumber(t.width, 10, 100, d.transform.width),
        height: clampNumber(t.height, 10, 100, d.transform.height),
      },
    },
    // Pro Position (1. Bild, 2. Bild, …) – Bilder selbst werden nicht gespeichert
    slots: slots.map((rawSlot) => {
      const slot = asLoose(rawSlot)
      const ms = Number(slot.displayDuration)
      return {
        displayDuration: Number.isFinite(ms) && ms > 0 ? Math.min(ms, 60000) : null,
        audioMode: (isValidSlideshowAudioMode(slot.audioMode)
          ? slot.audioMode
          : SLIDESHOW_AUDIO_DEFAULT) as string,
        // Eigene Audio-Quelle (null = wie Einstellung/Preset)
        audioSource: isValidSlideshowAudioSource(slot.audioSource)
          ? (slot.audioSource as string)
          : null,
        // Eigene Übergangsanimation des Bildes (null = globaler Übergang)
        transition: isValidTransition(slot.transition) ? (slot.transition as string) : null,
        // Eigene Ein-/Ausblenddauer (ms, null = Standard)
        fadeIn: normalizeFade(slot.fadeIn),
        fadeOut: normalizeFade(slot.fadeOut),
        // Während der Slideshow vorgenommene Bild-Anpassungen (Filter, Audio …)
        adjustments: normalizeImageAdjustments(slot.adjustments),
        // Eigene Position/Größe des Bildes (relativ zum Canvas) oder null
        bounds: normalizeImageBounds(slot.bounds),
        // Stock-Bild an dieser Position (dauerhaft; hochgeladene Bilder nur per Sitzung)
        stock: normalizeStockRef(slot.stock),
        // Hochgeladenes Bild an dieser Position (dauerhaft in IndexedDB)
        upload: normalizeUploadRef(slot.upload),
      }
    }),
  }
}

export type SlideshowPreset = NonNullable<ReturnType<typeof normalizeSlideshowPreset>>
export type SlideshowPresetSlot = SlideshowPreset['slots'][number]

/** Bildeintrag der laufenden Sitzung ({ id, name, imageObject | stockImage, … }) */
export type SlideshowSessionImage = Record<string, unknown>

export interface SlideshowImageStats {
  available: boolean
  count: number
  bytes: number
  usage: number | null
  quota: number | null
}

/**
 * Slideshow-Presets: speichern Timing, Audio-Reaktiv-Option, Loop, Layer,
 * Position/Größe sowie pro Bild-Position die Anzeigedauer und den
 * Audio-Reaktiv-Modus. Die Bilder selbst werden nur für die laufende Sitzung
 * im Speicher gehalten (sessionImages), nicht im localStorage.
 */
export const useSlideshowPresetStore = defineStore('slideshowPresets', () => {
  const presets = ref<SlideshowPreset[]>([])
  let loaded = false
  // Bilder pro Preset – nur für die laufende Sitzung (nicht im localStorage):
  // presetId → Array von Slideshow-Bildeinträgen ({ id, name, imageObject | stockImage, … })
  const sessionImages = ref<Record<string, SlideshowSessionImage[]>>({})
  // Speicherbelegung der Preset-Bilder (IndexedDB) + Browser-Kontingent
  // available=false: IndexedDB nicht nutzbar (Anzeige ausblenden)
  const imageStats = ref<SlideshowImageStats>({
    available: false,
    count: 0,
    bytes: 0,
    usage: null,
    quota: null,
  })

  async function refreshImageStats() {
    try {
      const [stats, estimate] = await Promise.all([getImageStorageStats(), getStorageEstimate()])
      imageStats.value = {
        available: true,
        count: stats?.count ?? 0,
        bytes: stats?.bytes ?? 0,
        usage: estimate?.usage ?? null,
        quota: estimate?.quota ?? null,
      }
    } catch (e) {
      console.warn('[SlideshowPresets] Speicherbelegung nicht ermittelbar:', e)
      imageStats.value = { available: false, count: 0, bytes: 0, usage: null, quota: null }
    }
    return imageStats.value
  }

  function loadPresets() {
    if (loaded) return
    loaded = true
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : []
      presets.value = Array.isArray(parsed)
        ? parsed
            .map(normalizeSlideshowPreset)
            .filter((p: SlideshowPreset | null): p is SlideshowPreset => Boolean(p))
        : []
    } catch (e) {
      console.warn('[SlideshowPresets] Laden fehlgeschlagen:', e)
      presets.value = []
      return // bei unlesbarem Speicher nicht automatisch aufräumen
    }
    refreshImageStats()
    scheduleAutoCleanup()
  }

  // Einmal pro Seitenaufruf, verzögert (blockiert den Start nicht)
  function scheduleAutoCleanup() {
    if (autoCleanupScheduled) return
    autoCleanupScheduled = true
    setTimeout(() => cleanupImages(), AUTO_CLEANUP_DELAY_MS)
  }

  /**
   * Entfernt nicht mehr verwendete Bilddateien aus IndexedDB. Berücksichtigt
   * auch Presets, die ein anderer Tab inzwischen im localStorage gespeichert hat.
   * @param {{ minAgeMs?: number }} [options]
   * @returns {Promise<number>} Anzahl entfernter Bilder (0 bei Fehler)
   */
  async function cleanupImages({ minAgeMs = IMAGE_CLEANUP_GRACE_MS } = {}) {
    const keep = collectUploadKeys(presets.value)
    // Auch ohne Preset dauerhaft gemerkte Flächenbilder behalten
    for (const key of collectStoredImageFillKeys()) keep.add(key)
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(stored)) {
        for (const key of collectUploadKeys(stored.map(normalizeSlideshowPreset))) {
          keep.add(key)
        }
      }
    } catch (e) {
      // Unlesbarer Preset-Speicher: lieber nichts löschen als Bilder verlieren
      console.warn('[SlideshowPresets] Aufräumen übersprungen (Presets unlesbar):', e)
      return 0
    }
    try {
      const removed = await pruneImages(keep, { minAgeMs })
      if (removed > 0) console.log(`[SlideshowPresets] ${removed} ungenutzte Bilder entfernt`)
      refreshImageStats()
      return removed
    } catch (e) {
      console.warn('[SlideshowPresets] Aufräumen der Bilder fehlgeschlagen:', e)
      return 0
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
   * @param snapshot - { settings, slots: [{ displayDuration, audioMode, adjustments?, bounds?, stock?, upload? }] }
   * @returns gespeichertes Preset oder null bei Speicherfehler
   */
  function savePreset(
    name: string | null | undefined,
    snapshot: { settings?: unknown; slots?: unknown[] } & Record<string, unknown>,
    images: SlideshowSessionImage[] | null = null,
  ): SlideshowPreset | null {
    loadPresets()
    // Eingabe ist immer ein Objekt → normalizeSlideshowPreset liefert ein Preset
    const preset = normalizeSlideshowPreset({
      id: `slideshow-${Date.now()}`,
      name: name || `Slideshow ${presets.value.length + 1}`,
      ...snapshot,
    }) as SlideshowPreset
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
    // Bilder wurden ggf. gerade in IndexedDB gespeichert
    refreshImageStats()
    return preset
  }

  function deletePreset(id: string) {
    loadPresets()
    presets.value = presets.value.filter((p) => p.id !== id)
    persist()
    if (sessionImages.value[id]) {
      const next = { ...sessionImages.value }
      delete next[id]
      sessionImages.value = next
    }
    // Nicht mehr verwendete Bilddateien aus IndexedDB entfernen
    cleanupImages()
  }

  /** In dieser Sitzung zum Preset gespeicherte Bilder (Kopie der Liste) oder null. */
  function getSessionImages(id: string): SlideshowSessionImage[] | null {
    const list = sessionImages.value[id]
    return list ? [...list] : null
  }

  return {
    presets,
    sessionImages,
    loadPresets,
    savePreset,
    deletePreset,
    getSessionImages,
    cleanupImages,
    imageStats,
    refreshImageStats,
  }
})
