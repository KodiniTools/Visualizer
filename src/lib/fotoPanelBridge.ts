/**
 * Zentrale Anbindung an das Foto-Panel (FotoPanel.vue). Ersetzt den früheren
 * Hook window.fotoPanelControls.
 *
 * Das Panel registriert sich, sobald sein FotoManager bereit ist. Die
 * Canvas-Auswahl (useCanvasSetup, useCanvasImages) holt es über getFotoPanel()
 * und bekommt null, solange es noch nicht registriert ist.
 */
import type { Ref } from 'vue'

export interface FotoPanelApi {
  /** aktives Bild (geteilter Zustand aus useImageAudioReactive) */
  currentActiveImage: Ref<object | null>
  /** Filter-Einstellungen eines Bildes ins Panel laden */
  loadImageSettings: (imgData: object | null) => void
}

let current: FotoPanelApi | null = null

/**
 * Registriert das Foto-Panel.
 * @returns Abmelden; wirkt nur, wenn `api` noch das aktive Panel ist
 */
export function registerFotoPanel(api: FotoPanelApi): () => void {
  current = api
  return () => {
    if (current === api) current = null
  }
}

export function getFotoPanel(): FotoPanelApi | null {
  return current
}
