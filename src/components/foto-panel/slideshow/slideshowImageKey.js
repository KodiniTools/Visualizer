/**
 * Schlüssel eines Slideshow-Bildes für die Einstellungen pro Bild
 * (Anzeigedauer, Audio-Reaktiv-Modus). Bevorzugt die ID, sonst den Namen.
 * @param {{ id?: string|number, name?: string }} img
 * @returns {string|number|undefined}
 */
export function slideshowImageKey(img) {
  return img?.id ?? img?.name
}
