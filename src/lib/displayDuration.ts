/**
 * Gemeinsame Grenzen der „Anzeigedauer“ von Elementen (Texte, Bilder,
 * Slideshow-Bilder, Text-Liste). Eine Quelle, damit Regler, Zahlenfeld und
 * Validierung beim Laden dieselbe Obergrenze verwenden.
 */
export const DISPLAY_DURATION_MIN_MS = 500
export const DISPLAY_DURATION_MAX_MS = 120_000
/** Dieselbe Obergrenze in Sekunden (z. B. Verzögerung vor dem Ausblenden einer Form) */
export const DISPLAY_DURATION_MAX_S = DISPLAY_DURATION_MAX_MS / 1000

/** Begrenzt eine Anzeigedauer (ms) auf den erlaubten Bereich. */
export function clampDisplayDuration(ms: number): number {
  return Math.min(DISPLAY_DURATION_MAX_MS, Math.max(DISPLAY_DURATION_MIN_MS, ms))
}
