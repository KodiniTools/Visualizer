/**
 * Zentrale Anbindung an das Foto-Panel (FotoPanel.vue). Ersetzt den früheren
 * Hook window.fotoPanelControls.
 *
 * Das Panel registriert sich, sobald sein FotoManager bereit ist. Die
 * Canvas-Auswahl (useCanvasSetup, useCanvasImages) holt es über getFotoPanel()
 * und bekommt null, solange es noch nicht registriert ist.
 *
 * @typedef {object} FotoPanelApi
 * @property {import('vue').Ref<object|null>} currentActiveImage - aktives Bild (geteilter Zustand aus useImageAudioReactive)
 * @property {(imgData: object|null) => void} loadImageSettings - Filter-Einstellungen eines Bildes ins Panel laden
 */

/** @type {FotoPanelApi|null} */
let current = null

/**
 * Registriert das Foto-Panel.
 * @param {FotoPanelApi} api
 * @returns {() => void} Abmelden; wirkt nur, wenn `api` noch das aktive Panel ist
 */
export function registerFotoPanel(api) {
  current = api
  return () => {
    if (current === api) current = null
  }
}

/** @returns {FotoPanelApi|null} */
export function getFotoPanel() {
  return current
}
