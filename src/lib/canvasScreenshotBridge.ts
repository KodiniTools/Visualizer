/**
 * Zentrale Anbindung an die Screenshot-Funktion der Render-Schleife
 * (useRenderLoop). Ersetzt den früheren Hook window.takeCanvasScreenshot.
 *
 * Die Render-Schleife registriert sich beim Mount der App; Aufrufer holen die
 * Funktion über getCanvasScreenshot() und bekommen null, solange keine aktiv
 * ist (z.B. in Tests oder vor dem Mount).
 */

export type CanvasScreenshotFn = (mimeType?: string, quality?: number) => Promise<Blob | null>

let current: CanvasScreenshotFn | null = null

/**
 * Registriert die aktive Screenshot-Funktion.
 * @returns Abmelden; wirkt nur, wenn `fn` noch die aktive Funktion ist
 */
export function registerCanvasScreenshot(fn: CanvasScreenshotFn): () => void {
  current = fn
  return () => {
    if (current === fn) current = null
  }
}

export function getCanvasScreenshot(): CanvasScreenshotFn | null {
  return current
}
