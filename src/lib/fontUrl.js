// Custom-Fonts kommen aus dem gemeinsamen Font-Ordner der Domain
// (/var/www/kodinitools.com/fonts → https://kodinitools.com/fonts/), den alle
// Tools nutzen: ein gemeinsamer Browser-Cache statt einer Kopie pro Tool.
// Lokal (base '/') liefert der Vite-Dev-Server denselben Pfad aus public/fonts.
// Optional überschreibbar per VITE_FONT_BASE_URL (mit abschließendem Slash).
export const FONT_BASE_URL = import.meta.env.VITE_FONT_BASE_URL || '/fonts/'

/** URL einer Font-Datei (z. B. 'Alpino-Black.woff2') im gemeinsamen Font-Ordner. */
export function fontUrl(filename) {
  return `${FONT_BASE_URL}${filename}`
}
