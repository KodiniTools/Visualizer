/**
 * Anbindung des Offline-Exports an die Render-Pipeline der App.
 *
 * Die Render-Schleife lebt in VisualizerApp, der Export-Knopf im
 * RecorderPanel. VisualizerApp meldet hier beim Mount die Szene an; der
 * Export holt sie über getOfflineScene() (null, solange keine App läuft).
 */

export interface OfflineScene {
  /** Ausgabegröße: Workspace-Format, sonst Canvas-Größe (px) */
  outputSize: () => { width: number; height: number }
  /**
   * Offline-Modus an: Live-Schleife anhalten, Visualizer und Audio-Analyse
   * synchron im Main-Thread (kein Worker-Versatz zwischen den Frames).
   */
  begin: () => void
  /**
   * Einen Frame der Szene mit dem Spektrum von `analyser` rendern und den
   * Inhalt (ohne Editor-Elemente, Workspace-Ausschnitt) nach `target` skalieren.
   */
  renderFrame: (
    analyser: AnalyserNode,
    target: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void
  /** Offline-Modus aus, Live-Schleife wieder starten */
  end: () => void
}

let current: OfflineScene | null = null

/** @returns Abmelden; wirkt nur, wenn `scene` noch angemeldet ist */
export function registerOfflineScene(scene: OfflineScene): () => void {
  current = scene
  return () => {
    if (current === scene) current = null
  }
}

export const getOfflineScene = (): OfflineScene | null => current
