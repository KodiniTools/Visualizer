/**
 * Ducking durch Marker-Videos im Offline-Export.
 *
 * Live senkt useMarkerCanvasVideos den Song über die Audio-Engine ab, sobald
 * ein Marker-Video hörbar läuft. Während des Exports meldet es denselben
 * Wert zusätzlich hier; der Export plant ihn zur aktuellen Frame-Zeit im
 * Offline-Mix ein (setVideoDuck).
 */

type DuckListener = (level: number) => void

let listener: DuckListener | null = null

/** @returns Abmelden; wirkt nur, wenn `fn` noch angemeldet ist */
export function setOfflineVideoDuckListener(fn: DuckListener): () => void {
  listener = fn
  return () => {
    if (listener === fn) listener = null
  }
}

/** Song-Lautstärke durch Marker-Videos (0–1) melden; ohne laufenden Export wirkungslos */
export function reportVideoDuck(level: number): void {
  listener?.(level)
}
