import { cloneImageAnimation, type ImageTimedAnimation } from './canvasObjects/imageAnimation'

/**
 * Bild-Einstellungen dauerhaft speichern (localStorage):
 * - Platzierung neuer Bilder: Einblend-Animation, Dauer, Größe, Versatz
 *   (eigene Bilder und Stock-Galerie getrennt – zwei eigene Bereiche)
 * - „Seitenverhältnis beibehalten“ der Positions-/Größenregler
 * - Animationen wie bei Texten für neu hinzugefügte eigene Bilder
 * Beim Laden wird jeder Wert geprüft; ungültig/beschädigt → Standard.
 */
export const PLACEMENT_KEYS = Object.freeze({
  uploads: 'visualizer-image-placement',
  stock: 'visualizer-stock-placement',
})
export const KEEP_ASPECT_KEY = 'visualizer-image-keep-aspect'
export const IMAGE_ANIMATION_KEY = 'visualizer-image-animation'

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

export type PlacementArea = keyof typeof PLACEMENT_KEYS

export interface PlacementSettings {
  selectedAnimation: string
  animationDuration: number
  imageScale: number
  imageOffsetX: number
  imageOffsetY: number
}

export const PLACEMENT_DEFAULTS: Readonly<PlacementSettings> = Object.freeze({
  selectedAnimation: 'none',
  animationDuration: 1000,
  imageScale: 1,
  imageOffsetX: 0,
  imageOffsetY: 0,
})

const isFiniteNumber = (v: unknown): v is number => Number.isFinite(v)
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Prüft/begrenzt Platzierungs-Einstellungen (Bereiche wie in PlacementSettings.vue). */
export function sanitizePlacement(input: unknown): PlacementSettings {
  const out: PlacementSettings = { ...PLACEMENT_DEFAULTS }
  if (!input || typeof input !== 'object') return out
  const raw = input as Record<string, unknown>
  if (
    typeof raw.selectedAnimation === 'string' &&
    PLACEMENT_ANIMATIONS.includes(raw.selectedAnimation)
  ) {
    out.selectedAnimation = raw.selectedAnimation
  }
  if (isFiniteNumber(raw.animationDuration)) {
    out.animationDuration = clamp(raw.animationDuration, 100, 5000)
  }
  if (isFiniteNumber(raw.imageScale)) out.imageScale = clamp(raw.imageScale, 1, 8)
  if (isFiniteNumber(raw.imageOffsetX)) out.imageOffsetX = clamp(raw.imageOffsetX, -500, 500)
  if (isFiniteNumber(raw.imageOffsetY)) out.imageOffsetY = clamp(raw.imageOffsetY, -500, 500)
  return out
}

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false // Speicher nicht verfügbar – gilt nur für diese Sitzung
  }
}

/** @param {'uploads'|'stock'} area */
export function loadPlacementSettings(area: PlacementArea): PlacementSettings {
  return sanitizePlacement(read(PLACEMENT_KEYS[area]))
}

/** @param {'uploads'|'stock'} area */
export function savePlacementSettings(
  area: PlacementArea,
  settings: Partial<Record<keyof PlacementSettings, unknown>>,
): boolean {
  const raw: Record<string, unknown> = { ...settings }
  // Zahlenfelder kommen aus Eingaben teils als Text
  for (const k of ['animationDuration', 'imageScale', 'imageOffsetX', 'imageOffsetY']) {
    raw[k] = Number(raw[k])
  }
  return write(PLACEMENT_KEYS[area], sanitizePlacement(raw))
}

export function loadKeepAspect(): boolean {
  const v = read(KEEP_ASPECT_KEY)
  return typeof v === 'boolean' ? v : true
}

export function saveKeepAspect(value: unknown): boolean {
  return write(KEEP_ASPECT_KEY, !!value)
}

/** Animationen für neue eigene Bilder (fehlende/ungültige Daten → alle aus). */
export function loadImageAnimation(): ImageTimedAnimation {
  return cloneImageAnimation(read(IMAGE_ANIMATION_KEY))
}

export function saveImageAnimation(value: unknown): boolean {
  return write(IMAGE_ANIMATION_KEY, cloneImageAnimation(value))
}
