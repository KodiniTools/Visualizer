/**
 * Stille als Audiodatei: Grundlage für „Ohne Track abspielen“.
 * Der Player braucht eine Zeitachse, damit Visualizer, Beat-Drop-Marker,
 * Spulen und Aufnahme laufen. Ein stiller WAV-Track liefert sie, ohne dass
 * der Player selbst etwas anders machen muss. Ton kommt in diesem Fall über
 * die Marker (Track aus Playlist, Video auf Canvas).
 */

/** Wählbare Längen in Sekunden */
export const SILENT_TRACK_DURATIONS = [30, 60, 120, 180, 300, 600, 900, 1200, 1800, 3600] as const

export const SILENT_TRACK_MIN_SECONDS = 1
export const SILENT_TRACK_MAX_SECONDS = 3600

/**
 * 8 kHz, 8 Bit, mono: reicht für Stille und hält die Datei klein
 * (1 Minute ≈ 470 KB, 60 Minuten ≈ 27 MB).
 */
const SAMPLE_RATE = 8000
/** Nullpegel bei vorzeichenlosem 8-Bit-PCM */
const SILENCE_U8 = 128

/** Länge auf ganze Sekunden im erlaubten Bereich bringen (ungültig → null) */
export function clampSilentSeconds(seconds: unknown): number | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null
  const rounded = Math.round(seconds)
  if (rounded < SILENT_TRACK_MIN_SECONDS) return null
  return Math.min(SILENT_TRACK_MAX_SECONDS, rounded)
}

/** Stille WAV-Datei (RIFF/PCM) mit der angegebenen Länge in Sekunden */
export function createSilentWav(seconds: number): Blob {
  const length = clampSilentSeconds(seconds)
  if (length === null) throw new RangeError(`Ungültige Länge für Stille: ${String(seconds)}`)

  const dataSize = length * SAMPLE_RATE
  const header = new DataView(new ArrayBuffer(44))
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) header.setUint8(offset + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  header.setUint32(4, 36 + dataSize, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  header.setUint32(16, 16, true) // Größe des fmt-Blocks
  header.setUint16(20, 1, true) // PCM
  header.setUint16(22, 1, true) // mono
  header.setUint32(24, SAMPLE_RATE, true)
  header.setUint32(28, SAMPLE_RATE, true) // Bytes pro Sekunde (1 Byte je Sample)
  header.setUint16(32, 1, true) // Block-Ausrichtung
  header.setUint16(34, 8, true) // Bits pro Sample
  ascii(36, 'data')
  header.setUint32(40, dataSize, true)

  const data = new Uint8Array(dataSize).fill(SILENCE_U8)
  return new Blob([header.buffer, data], { type: 'audio/wav' })
}

/** Länge als m:ss bzw. h:mm:ss für den Tracknamen */
export function formatSilentDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/**
 * Vorschlag für die Länge: die kürzeste wählbare Länge, die alle Marker
 * (plus 10 s Auslauf) abdeckt; ohne Marker 2 Minuten.
 */
export function suggestSilentDuration(markerTimes: readonly number[]): number {
  const last = markerTimes.reduce((max, t) => (Number.isFinite(t) && t > max ? t : max), 0)
  if (last <= 0) return 120
  const needed = last + 10
  return SILENT_TRACK_DURATIONS.find((d) => d >= needed) ?? SILENT_TRACK_MAX_SECONDS
}
