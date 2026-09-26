/**
 * Farbe der Fläche unter einer Slideshow, die als Canvas-/Workspace-Hintergrund
 * das Hintergrundbild ersetzt (sichtbar während der Übergänge und neben Bildern
 * mit abweichendem Seitenverhältnis).
 */
export const SLIDESHOW_BASE_COLOR_DEFAULT = '#000000'

import { normalizeSlideshowGradientAudio } from './slideshowGradientAudio.js'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

/**
 * @param {unknown} value - Farbe als #rrggbb
 * @param {string} [fallback]
 * @returns {string} normalisiert (Kleinbuchstaben)
 */
export function normalizeSlideshowBaseColor(value, fallback = SLIDESHOW_BASE_COLOR_DEFAULT) {
  if (typeof value === 'string' && HEX_COLOR.test(value.trim())) return value.trim().toLowerCase()
  return fallback
}

// Canvas- und Workspace-Fläche werden getrennt gemerkt
const STORAGE_KEYS = Object.freeze({
  canvas: 'visualizer-slideshow-base-color',
  workspace: 'visualizer-slideshow-workspace-color',
})

function storageKey(target) {
  return target === 'workspace' ? STORAGE_KEYS.workspace : STORAGE_KEYS.canvas
}

/**
 * Zuletzt gewählte Farbe (dauerhaft, unabhängig von Presets).
 * @param {'canvas'|'workspace'} [target]
 * @returns {string} gespeicherte Farbe oder Standard
 */
export function loadStoredSlideshowBaseColor(target = 'canvas') {
  try {
    return normalizeSlideshowBaseColor(localStorage.getItem(storageKey(target)))
  } catch {
    return SLIDESHOW_BASE_COLOR_DEFAULT
  }
}

/**
 * Merkt die Farbe dauerhaft; die Standardfarbe entfernt den Eintrag.
 * @param {string} color
 * @param {'canvas'|'workspace'} [target]
 */
export function storeSlideshowBaseColor(color, target = 'canvas') {
  const normalized = normalizeSlideshowBaseColor(color, null)
  if (!normalized) return
  const key = storageKey(target)
  try {
    if (normalized === SLIDESHOW_BASE_COLOR_DEFAULT) localStorage.removeItem(key)
    else localStorage.setItem(key, normalized)
  } catch (e) {
    console.warn('[SlideshowBaseColor] Speichern fehlgeschlagen:', e)
  }
}

// ─── Farbverlauf der Fläche ─────────────────────────────────────────────────
// Verlauf von der Flächenfarbe (Farbe 1) zu color2; linear mit Winkel oder
// radial vom Mittelpunkt des Bereichs.
export const SLIDESHOW_GRADIENT_TYPES = Object.freeze(['linear', 'radial'])

export const SLIDESHOW_GRADIENT_DEFAULT = Object.freeze({
  enabled: false,
  color2: '#333333',
  type: 'linear',
  angle: 90,
  // Audio-Reaktiv (siehe slideshowGradientAudio.js)
  audio: Object.freeze({ enabled: false, source: 'bass', pulse: 80, rotation: 80 }),
})

/**
 * Bereinigt einen Farbverlauf; fehlende/ungültige Felder aus `fallback`.
 * @param {unknown} value
 * @param {typeof SLIDESHOW_GRADIENT_DEFAULT} [fallback]
 * @returns {{ enabled:boolean, color2:string, type:'linear'|'radial', angle:number, audio:object }} (Kopie)
 */
export function normalizeSlideshowGradient(value, fallback = SLIDESHOW_GRADIENT_DEFAULT) {
  const base = { ...SLIDESHOW_GRADIENT_DEFAULT, ...(fallback || {}) }
  const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const angle = Number(src.angle)
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : Boolean(base.enabled),
    color2: normalizeSlideshowBaseColor(src.color2, base.color2),
    type: SLIDESHOW_GRADIENT_TYPES.includes(src.type) ? src.type : base.type,
    angle: Number.isFinite(angle) ? Math.round(((angle % 360) + 360) % 360) : base.angle,
    audio: normalizeSlideshowGradientAudio(src.audio, base.audio),
  }
}

/** Gleicher Verlauf? (für „Zurücksetzen“-Anzeige und Änderungserkennung) */
export function isSameSlideshowGradient(a, b) {
  const x = normalizeSlideshowGradient(a)
  const y = normalizeSlideshowGradient(b)
  return (
    x.enabled === y.enabled &&
    x.color2 === y.color2 &&
    x.type === y.type &&
    x.angle === y.angle &&
    JSON.stringify(x.audio) === JSON.stringify(y.audio)
  )
}

const GRADIENT_STORAGE_KEYS = Object.freeze({
  canvas: 'visualizer-slideshow-base-gradient',
  workspace: 'visualizer-slideshow-workspace-gradient',
})

function gradientKey(target) {
  return target === 'workspace' ? GRADIENT_STORAGE_KEYS.workspace : GRADIENT_STORAGE_KEYS.canvas
}

/**
 * Zuletzt gewählter Farbverlauf (dauerhaft, unabhängig von Presets).
 * @param {'canvas'|'workspace'} [target]
 */
export function loadStoredSlideshowGradient(target = 'canvas') {
  try {
    const raw = localStorage.getItem(gradientKey(target))
    return normalizeSlideshowGradient(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeSlideshowGradient(null)
  }
}

/**
 * Merkt den Farbverlauf dauerhaft; der Standard entfernt den Eintrag.
 * @param {object} gradient
 * @param {'canvas'|'workspace'} [target]
 */
export function storeSlideshowGradient(gradient, target = 'canvas') {
  const normalized = normalizeSlideshowGradient(gradient)
  const key = gradientKey(target)
  try {
    if (isSameSlideshowGradient(normalized, SLIDESHOW_GRADIENT_DEFAULT))
      localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(normalized))
  } catch (e) {
    console.warn('[SlideshowBaseColor] Speichern fehlgeschlagen:', e)
  }
}
