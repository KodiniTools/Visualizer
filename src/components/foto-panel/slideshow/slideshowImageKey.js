/**
 * Schlüssel eines Slideshow-Bildes für die Einstellungen pro Bild
 * (Anzeigedauer, Audio-Reaktiv-Modus). Bevorzugt die ID, sonst den Namen.
 * @param {{ id?: string|number, name?: string }} img
 * @returns {string|number|undefined}
 */
export function slideshowImageKey(img) {
  return img?.id ?? img?.name
}

/**
 * Seitenübergreifend stabiler Schlüssel eines Slideshow-Bildes (für dauerhaft
 * gemerkte Einstellungen pro Bild). Stock-Bilder über ihre Galerie-ID,
 * hochgeladene Bilder über Dateiname + Maße (die Galerie-ID ändert sich bei
 * jedem Laden).
 * @param {object} img - Slideshow-Eintrag
 * @returns {string|null}
 */
export function slideshowStableKey(img) {
  if (!img) return null
  const stockId =
    img.stockImage?.id ??
    (String(img.id ?? '').startsWith('stock:') ? String(img.id).slice(6) : null)
  if (img.source === 'stock' || stockId) return stockId ? `stock:${stockId}` : null
  const obj = img.imageObject || img.img
  const w = obj?.naturalWidth || obj?.width
  const h = obj?.naturalHeight || obj?.height
  if (!img.name || !w || !h) return null
  return `upload:${img.name}|${w}x${h}`
}
