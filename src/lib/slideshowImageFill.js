/**
 * Eigenes Bild als Fläche unter der Slideshow (Canvas- bzw. Workspace-Fläche).
 *
 * Einstellung (serialisierbar, für Presets/localStorage):
 *   { enabled, stock|null, upload|null, fit: 'cover'|'contain',
 *     audio: { enabled, source, brightness, hue, zoom } }
 * `stock` = Verweis auf ein Stock-Bild, `upload` = IndexedDB-Schlüssel eines
 * hochgeladenen Bildes (siehe presetImageRepository). Das geladene
 * Image-Objekt wird getrennt gehalten (nicht serialisierbar).
 *
 * Audio-Reaktiv (Pegel/Glättung aus der gemeinsamen Audio-Engine):
 *   brightness – Bild hellt im Takt auf (bis 200 % Helligkeit bei 100 %)
 *   hue        – Farbton verschiebt sich (bis 180°)
 *   zoom       – Bild pulsiert (bis +25 % Größe)
 * Ohne Musik bleibt das Bild wie eingestellt.
 */
import { computeAudioReactiveValues } from './audio/audioReactiveEngine.js'
import { SLIDESHOW_GRADIENT_AUDIO_SOURCES } from './slideshowGradientAudio.js'
import { normalizeStockRef, normalizeUploadRef } from './slideshowImageRefs.js'

export const SLIDESHOW_IMAGE_FITS = Object.freeze(['cover', 'contain'])

export const SLIDESHOW_IMAGE_FILL_AUDIO_DEFAULT = Object.freeze({
  enabled: false,
  source: 'bass',
  brightness: 60, // Stärke 0–100 (0 = aus)
  hue: 0,
  zoom: 60,
})

export const SLIDESHOW_IMAGE_FILL_DEFAULT = Object.freeze({
  enabled: false,
  stock: null,
  upload: null,
  fit: 'cover',
  audio: SLIDESHOW_IMAGE_FILL_AUDIO_DEFAULT,
})

function clampPercent(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : fallback
}

function normalizeAudio(value, fallback) {
  const base = { ...SLIDESHOW_IMAGE_FILL_AUDIO_DEFAULT, ...(fallback || {}) }
  const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : Boolean(base.enabled),
    source: SLIDESHOW_GRADIENT_AUDIO_SOURCES.includes(src.source) ? src.source : base.source,
    brightness: clampPercent(src.brightness, base.brightness),
    hue: clampPercent(src.hue, base.hue),
    zoom: clampPercent(src.zoom, base.zoom),
  }
}

/**
 * Bereinigt eine Flächenbild-Einstellung; fehlende/ungültige Felder aus
 * `fallback`. Verweise: höchstens einer (Stock hat Vorrang), ungültige → null.
 * @param {unknown} value
 * @param {object} [fallback]
 * @returns {{ enabled:boolean, stock:object|null, upload:object|null, fit:string, audio:object }}
 */
export function normalizeSlideshowImageFill(value, fallback = SLIDESHOW_IMAGE_FILL_DEFAULT) {
  const base = { ...SLIDESHOW_IMAGE_FILL_DEFAULT, ...(fallback || {}) }
  const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const hasRef = 'stock' in src || 'upload' in src
  const stock = hasRef ? normalizeStockRef(src.stock) : normalizeStockRef(base.stock)
  const upload = stock
    ? null
    : hasRef
      ? normalizeUploadRef(src.upload)
      : normalizeUploadRef(base.upload)
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : Boolean(base.enabled),
    stock,
    upload,
    fit: SLIDESHOW_IMAGE_FITS.includes(src.fit) ? src.fit : base.fit,
    audio: normalizeAudio(src.audio, base.audio),
  }
}

/** Gleiche Einstellung? */
export function isSameSlideshowImageFill(a, b) {
  return (
    JSON.stringify(normalizeSlideshowImageFill(a)) ===
    JSON.stringify(normalizeSlideshowImageFill(b))
  )
}

/** Hat die Einstellung einen Bild-Verweis? */
export function hasSlideshowImageRef(fill) {
  return Boolean(fill?.stock || fill?.upload)
}

// Stabiler Besitzer je Fläche für den Hüllkurven-Zustand der Engine
const OWNERS = { canvas: {}, workspace: {} }

/**
 * Aktuelle Audio-Veränderung des Bildes.
 * @param {object|null|undefined} audio - normalisierte Audio-Einstellung
 * @param {'canvas'|'workspace'} target
 * @param {object|null|undefined} audioData - window.audioAnalysisData
 * @returns {{ brightness:number, hueShift:number, zoom:number }} brightness in % (100 = neutral)
 */
export function computeSlideshowImageFillAudio(audio, target, audioData) {
  const neutral = { brightness: 100, hueShift: 0, zoom: 1 }
  if (!audio?.enabled || !audioData) return neutral
  const effects = {}
  for (const key of ['brightness', 'hue', 'zoom']) {
    if (audio[key] > 0) effects[key] = { enabled: true, intensity: audio[key] }
  }
  const values = computeAudioReactiveValues(
    OWNERS[target === 'workspace' ? 'workspace' : 'canvas'],
    { enabled: true, source: audio.source, effects },
    audioData,
    (name, level) => ({ level }),
  )
  if (!values) return neutral
  const level = (key) => values.effects[key]?.level ?? 0
  return {
    brightness: 100 + 100 * level('brightness'),
    hueShift: 180 * level('hue'),
    zoom: 1 + 0.25 * level('zoom'),
  }
}

/**
 * Zeichenbereich des Bildes (Füllen = Cover, Einpassen = Contain), zentriert.
 * @returns {{ x:number, y:number, width:number, height:number }|null}
 */
export function computeImageFillRect(area, image, fit = 'cover', zoom = 1) {
  const iw = Number(image?.naturalWidth || image?.width)
  const ih = Number(image?.naturalHeight || image?.height)
  if (!(iw > 0 && ih > 0 && area?.width > 0 && area?.height > 0)) return null
  const scaleX = area.width / iw
  const scaleY = area.height / ih
  const scale = (fit === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)) * zoom
  const width = iw * scale
  const height = ih * scale
  return {
    x: area.x + (area.width - width) / 2,
    y: area.y + (area.height - height) / 2,
    width,
    height,
  }
}

/**
 * Zeichnet das Flächenbild in den Bereich (auf den Bereich beschnitten).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number,width:number,height:number}} area
 * @param {HTMLImageElement} image
 * @param {object} fill - normalisierte Einstellung
 * @param {{ brightness:number, hueShift:number, zoom:number }|null} [change]
 * @returns {boolean} gezeichnet
 */
export function drawSlideshowImageFill(ctx, area, image, fill, change = null) {
  const rect = computeImageFillRect(area, image, fill?.fit, change?.zoom ?? 1)
  if (!rect) return false
  ctx.save()
  ctx.beginPath()
  ctx.rect(area.x, area.y, area.width, area.height)
  ctx.clip()
  const filters = []
  if (change && change.brightness !== 100)
    filters.push(`brightness(${change.brightness.toFixed(1)}%)`)
  if (change && change.hueShift) filters.push(`hue-rotate(${change.hueShift.toFixed(1)}deg)`)
  ctx.filter = filters.length > 0 ? filters.join(' ') : 'none'
  try {
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height)
  } catch (e) {
    console.warn('[SlideshowImageFill] Bild konnte nicht gezeichnet werden:', e)
  }
  ctx.restore()
  return true
}

// ─── Dauerhaft merken (unabhängig von Presets) ──────────────────────────────

const STORAGE_KEYS = Object.freeze({
  canvas: 'visualizer-slideshow-base-image',
  workspace: 'visualizer-slideshow-workspace-image',
})

function storageKey(target) {
  return target === 'workspace' ? STORAGE_KEYS.workspace : STORAGE_KEYS.canvas
}

/** Zuletzt gewählte Einstellung (ohne Bild-Objekt). */
export function loadStoredSlideshowImageFill(target = 'canvas') {
  try {
    const raw = localStorage.getItem(storageKey(target))
    return normalizeSlideshowImageFill(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeSlideshowImageFill(null)
  }
}

/** Merkt die Einstellung dauerhaft; der Standard entfernt den Eintrag. */
export function storeSlideshowImageFill(fill, target = 'canvas') {
  const normalized = normalizeSlideshowImageFill(fill)
  const key = storageKey(target)
  try {
    if (isSameSlideshowImageFill(normalized, SLIDESHOW_IMAGE_FILL_DEFAULT)) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(normalized))
    }
  } catch (e) {
    console.warn('[SlideshowImageFill] Speichern fehlgeschlagen:', e)
  }
}

/**
 * IndexedDB-Schlüssel der dauerhaft gemerkten Flächenbilder – beim Aufräumen
 * der Preset-Bilder zu behalten.
 * @returns {Set<string>}
 */
export function collectStoredImageFillKeys() {
  const keys = new Set()
  for (const target of ['canvas', 'workspace']) {
    const key = loadStoredSlideshowImageFill(target).upload?.key
    if (key) keys.add(key)
  }
  return keys
}
