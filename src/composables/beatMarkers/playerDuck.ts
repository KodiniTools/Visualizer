/**
 * Mischt die Ducking-Wünsche mehrerer Quellen (Marker-Tracks, Marker-Videos):
 * Der Haupt-Song folgt dem niedrigsten Wert. `apply` läuft nur, wenn sich der
 * gemeinsame Wert ändert.
 *
 * @param apply - setzt die Song-Lautstärke (0–1, 1 = normal)
 */
export function createPlayerDuck(apply: (level: number) => void) {
  const levels = new Map<string, number>()
  let applied = 1

  /** Wunsch einer Quelle setzen (1 = kein Ducking). */
  const set = (source: string, level: number) => {
    levels.set(source, level)
    const lowest = Math.min(1, ...levels.values())
    if (lowest === applied) return
    applied = lowest
    apply(lowest)
  }

  return { set }
}
