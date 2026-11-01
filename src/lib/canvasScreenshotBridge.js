/**
 * Zentrale Anbindung an die Screenshot-Funktion der Render-Schleife
 * (useRenderLoop). Ersetzt den früheren Hook window.takeCanvasScreenshot.
 *
 * Die Render-Schleife registriert sich beim Mount der App; Aufrufer holen die
 * Funktion über getCanvasScreenshot() und bekommen null, solange keine aktiv
 * ist (z.B. in Tests oder vor dem Mount).
 *
 * @typedef {(mimeType?: string, quality?: number) => Promise<Blob|null>} CanvasScreenshotFn
 */

/** @type {CanvasScreenshotFn|null} */
let current = null

/**
 * Registriert die aktive Screenshot-Funktion.
 * @param {CanvasScreenshotFn} fn
 * @returns {() => void} Abmelden; wirkt nur, wenn `fn` noch die aktive Funktion ist
 */
export function registerCanvasScreenshot(fn) {
  current = fn
  return () => {
    if (current === fn) current = null
  }
}

/** @returns {CanvasScreenshotFn|null} */
export function getCanvasScreenshot() {
  return current
}
