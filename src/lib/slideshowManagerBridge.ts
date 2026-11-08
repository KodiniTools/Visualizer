/**
 * Zentrale Anbindung an den aktiven SlideshowManager. Ersetzt den früheren
 * Hook window.slideshowManager.
 *
 * Das Slideshow-Panel (useFotoSlideshow) setzt den Manager beim Anlegen/Start
 * und null beim Stoppen. Canvas-Rendering, Auswahl, Drag & Drop und der
 * MultiImageManager lesen ihn über getSlideshowManager() und bekommen null,
 * solange keine Slideshow aktiv ist.
 */
import type { SlideshowManager } from './slideshowManager.js'

let current: SlideshowManager | null = null

/** Setzt den aktiven SlideshowManager (null = keine Slideshow). */
export function setSlideshowManager(manager: SlideshowManager | null | undefined) {
  current = manager ?? null
}

/** @returns der aktive SlideshowManager oder null */
export function getSlideshowManager(): SlideshowManager | null {
  return current
}
