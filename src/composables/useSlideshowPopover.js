import { reactive } from 'vue'

/**
 * Geteilter Zustand zwischen FotoPanel (besitzt das Slideshow-Panel samt
 * Slideshow-Manager-Verdrahtung) und dem Slideshow-Fenster der Sticky-Bar.
 * Das Panel bleibt im FotoPanel gemountet und wird per <Teleport> in das
 * Fenster verschoben – so bleiben Zustand und Handler beim Schließen erhalten.
 */
export const SLIDESHOW_POPOVER_TARGET_ID = 'spb-slideshow-target'

const state = reactive({
  // Slideshow-Panel zeigt Inhalt (≥ 2 Bilder, läuft, Presets mit Bildern)
  panelVisible: false,
  // Bilder in der Slideshow-Auswahl (Badge am Button)
  imageCount: 0,
  // Slideshow läuft (auch pausiert)
  active: false,
})

export function useSlideshowPopover() {
  return state
}
