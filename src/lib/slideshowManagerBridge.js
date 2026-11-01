/**
 * Zentrale Anbindung an den aktiven SlideshowManager. Ersetzt den früheren
 * Hook window.slideshowManager.
 *
 * Das Slideshow-Panel (useFotoSlideshow) setzt den Manager beim Anlegen/Start
 * und null beim Stoppen. Canvas-Rendering, Auswahl, Drag & Drop und der
 * MultiImageManager lesen ihn über getSlideshowManager() und bekommen null,
 * solange keine Slideshow aktiv ist.
 */

/** @type {import('./slideshowManager.js').SlideshowManager|null} */
let current = null

/**
 * Setzt den aktiven SlideshowManager (null = keine Slideshow).
 * @param {object|null|undefined} manager
 */
export function setSlideshowManager(manager) {
  current = manager ?? null
}

/** @returns {object|null} der aktive SlideshowManager oder null */
export function getSlideshowManager() {
  return current
}
