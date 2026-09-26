/**
 * Farbe der Fläche unter einer Slideshow, die als Canvas-/Workspace-Hintergrund
 * das Hintergrundbild ersetzt (sichtbar während der Übergänge und neben Bildern
 * mit abweichendem Seitenverhältnis).
 */
export const SLIDESHOW_BASE_COLOR_DEFAULT = '#000000'

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
