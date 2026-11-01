/**
 * Pausierte Slideshow: Einstellungen eines Slideshow-Bildes im Slideshow-Panel
 * öffnen (Klick auf das Bild in der Leiste „Bilder auf Canvas“ oder im Canvas).
 * FotoPanel lauscht auf das Event und reicht den Index an das SlideshowPanel.
 */

import { getSlideshowManager } from './slideshowManagerBridge.js'

export const SLIDESHOW_EDIT_EVENT = 'slideshow:edit-image'

/**
 * @param {object} imgData - angeklicktes Objekt
 * @returns {boolean} true, wenn die Einstellungen angefordert wurden
 */
export function requestSlideshowImageEdit(imgData) {
  const index = imgData?.slideshow?.imageIndex
  if (!imgData?.isSlideshowImage || !Number.isInteger(index)) return false
  if (typeof window === 'undefined' || !getSlideshowManager()?.isPaused) return false
  window.dispatchEvent(new CustomEvent(SLIDESHOW_EDIT_EVENT, { detail: { index } }))
  return true
}
