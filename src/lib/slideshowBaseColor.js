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
