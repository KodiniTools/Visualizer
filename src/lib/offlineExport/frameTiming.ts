/**
 * Zeit- und Größenregeln des Offline-Exports (reine Funktionen).
 */

/**
 * Längster Track, den der Export annimmt (s). Die fertige MP4 entsteht im
 * Arbeitsspeicher; 10 Minuten bei hoher Qualität sind einige hundert MB.
 */
export const MAX_OFFLINE_SECONDS = 10 * 60

/** Abtastrate des Offline-Audios (Hz) */
export const OFFLINE_SAMPLE_RATE = 48000

/** Erlaubte Bildraten (wie die Aufnahme) */
export const OFFLINE_FRAME_RATES = [30, 60] as const

/** Bildrate auf einen erlaubten Wert bringen (Standard 30). */
export function normalizeFps(fps: unknown): number {
  return OFFLINE_FRAME_RATES.includes(fps as 30 | 60) ? (fps as number) : 30
}

/** Anzahl Frames für eine Dauer (mindestens 1). */
export function frameCount(durationSec: number, fps: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 1
  return Math.max(1, Math.ceil(durationSec * fps - 1e-6))
}

/** Zeitpunkt (s) von Frame `index`. */
export const frameTime = (index: number, fps: number) => index / fps

/**
 * Video-Encoder (H.264 4:2:0) brauchen gerade Kantenlängen; abrunden,
 * mindestens 2 px.
 */
export function evenDimension(value: number): number {
  const v = Math.floor(Number.isFinite(value) ? value : 0)
  return Math.max(2, v - (v % 2))
}

/** Ausgabegröße mit geraden Kantenlängen. */
export function outputSize(width: number, height: number) {
  return { width: evenDimension(width), height: evenDimension(height) }
}
