/**
 * Bild-Einstellungen dauerhaft speichern (localStorage):
 * - Platzierung neuer Bilder: Einblend-Animation, Dauer, Größe, Versatz
 *   (eigene Bilder und Stock-Galerie getrennt – zwei eigene Bereiche)
 * - „Seitenverhältnis beibehalten“ der Positions-/Größenregler
 * Beim Laden wird jeder Wert geprüft; ungültig/beschädigt → Standard.
 */
export const PLACEMENT_KEYS = Object.freeze({
  uploads: 'visualizer-image-placement',
  stock: 'visualizer-stock-placement',
})
export const KEEP_ASPECT_KEY = 'visualizer-image-keep-aspect'

export const PLACEMENT_ANIMATIONS = Object.freeze([
  'none',
  'fade',
  'slideLeft',
  'slideRight',
  'slideUp',
  'slideDown',
  'zoom',
  'bounce',
  'spin',
  'elastic',
])

export const PLACEMENT_DEFAULTS = Object.freeze({
  selectedAnimation: 'none',
  animationDuration: 1000,
  imageScale: 1,
  imageOffsetX: 0,
  imageOffsetY: 0,
})

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Prüft/begrenzt Platzierungs-Einstellungen (Bereiche wie in PlacementSettings.vue). */
export function sanitizePlacement(raw) {
  const out = { ...PLACEMENT_DEFAULTS }
  if (!raw || typeof raw !== 'object') return out
  if (PLACEMENT_ANIMATIONS.includes(raw.selectedAnimation)) {
    out.selectedAnimation = raw.selectedAnimation
  }
  if (Number.isFinite(raw.animationDuration)) {
    out.animationDuration = clamp(raw.animationDuration, 100, 5000)
  }
  if (Number.isFinite(raw.imageScale)) out.imageScale = clamp(raw.imageScale, 1, 8)
  if (Number.isFinite(raw.imageOffsetX)) out.imageOffsetX = clamp(raw.imageOffsetX, -500, 500)
  if (Number.isFinite(raw.imageOffsetY)) out.imageOffsetY = clamp(raw.imageOffsetY, -500, 500)
  return out
}

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false // Speicher nicht verfügbar – gilt nur für diese Sitzung
  }
}

/** @param {'uploads'|'stock'} area */
export function loadPlacementSettings(area) {
  return sanitizePlacement(read(PLACEMENT_KEYS[area]))
}

/** @param {'uploads'|'stock'} area */
export function savePlacementSettings(area, settings) {
  const raw = { ...settings }
  // Zahlenfelder kommen aus Eingaben teils als Text
  for (const k of ['animationDuration', 'imageScale', 'imageOffsetX', 'imageOffsetY']) {
    raw[k] = Number(raw[k])
  }
  return write(PLACEMENT_KEYS[area], sanitizePlacement(raw))
}

export function loadKeepAspect() {
  const v = read(KEEP_ASPECT_KEY)
  return typeof v === 'boolean' ? v : true
}

export function saveKeepAspect(value) {
  return write(KEEP_ASPECT_KEY, !!value)
}
