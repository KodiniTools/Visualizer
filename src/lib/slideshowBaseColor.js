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

const STORAGE_KEY = 'visualizer-slideshow-base-color'

/**
 * Zuletzt gewählte Farbe (dauerhaft, unabhängig von Presets).
 * @returns {string} gespeicherte Farbe oder Standard
 */
export function loadStoredSlideshowBaseColor() {
  try {
    return normalizeSlideshowBaseColor(localStorage.getItem(STORAGE_KEY))
  } catch {
    return SLIDESHOW_BASE_COLOR_DEFAULT
  }
}

/**
 * Merkt die Farbe dauerhaft; die Standardfarbe entfernt den Eintrag.
 * @param {string} color
 */
export function storeSlideshowBaseColor(color) {
  const normalized = normalizeSlideshowBaseColor(color, null)
  if (!normalized) return
  try {
    if (normalized === SLIDESHOW_BASE_COLOR_DEFAULT) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, normalized)
  } catch (e) {
    console.warn('[SlideshowBaseColor] Speichern fehlgeschlagen:', e)
  }
}
