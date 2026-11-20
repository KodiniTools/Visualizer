/**
 * Stille als Audiodatei: Grundlage für „Ohne Track abspielen“.
 * Der Player braucht eine Zeitachse, damit Visualizer, Beat-Drop-Marker,
 * Spulen und Aufnahme laufen. Ein stiller WAV-Track liefert sie, ohne dass
 * der Player selbst etwas anders machen muss. Ton kommt in diesem Fall über
 * die Marker (Track aus Playlist, Video auf Canvas).
 */

/** Runde Längen in Sekunden (Vorschläge; die Länge ist frei wählbar) */
export const SILENT_TRACK_DURATIONS = [30, 60, 120, 180, 300, 600, 900, 1200, 1800, 3600] as const

export const SILENT_TRACK_MIN_SECONDS = 1
/** 3 Stunden ≈ 86 MB WAV im Speicher */
export const SILENT_TRACK_MAX_SECONDS = 3 * 3600

/**
 * 8 kHz, 8 Bit, mono: reicht für Stille und hält die Datei klein
 * (1 Minute ≈ 470 KB, 60 Minuten ≈ 27 MB, 3 Stunden ≈ 82 MB).
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

  // Ein Block Stille wird wiederverwendet, statt ein Array über die ganze
  // Länge anzulegen (bei 3 Stunden sonst 86 MB zusätzlich im JS-Heap).
  const chunkSeconds = Math.min(length, 60)
  const chunk = new Uint8Array(chunkSeconds * SAMPLE_RATE).fill(SILENCE_U8)
  const parts: BlobPart[] = [header.buffer]
  for (let rest = length; rest > 0; rest -= chunkSeconds) {
    parts.push(rest >= chunkSeconds ? chunk : chunk.subarray(0, rest * SAMPLE_RATE))
  }
  return new Blob(parts, { type: 'audio/wav' })
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
 * Freie Eingabe der Länge lesen. Erlaubt:
 * - `h:mm:ss` (1:15:00), `m:ss` (4:30, auch 90:00), Sekunden-/Minutenteil < 60
 * - nur Zahl = Minuten (5 → 5:00, 1,5 bzw. 1.5 → 1:30)
 * Ergebnis in ganzen Sekunden; null bei unlesbarer Eingabe.
 * Ob die Länge im erlaubten Bereich liegt, prüft {@link clampSilentSeconds}.
 */
export function parseSilentDuration(text: unknown): number | null {
  if (typeof text !== 'string') return null
  const value = text.trim()
  if (value === '') return null

  if (/^\d+(?:[.,]\d+)?$/.test(value)) {
    return Math.round(Number(value.replace(',', '.')) * 60)
  }

  const parts = value.split(':')
  if (parts.length < 2 || parts.length > 3) return null
  if (!parts.every((p) => /^\d+$/.test(p))) return null
  const nums = parts.map(Number)
  // Alles hinter dem ersten Teil muss < 60 sein (sonst Tippfehler)
  if (nums.slice(1).some((n) => n >= 60)) return null
  return nums.reduce((total, n) => total * 60 + n, 0)
}

/**
 * Vorschlag für die Länge: die kürzeste runde Länge, die alle Marker
 * (plus 10 s Auslauf) abdeckt, darüber auf volle Minuten aufgerundet;
 * ohne Marker 2 Minuten.
 */
export function suggestSilentDuration(markerTimes: readonly number[]): number {
  const last = markerTimes.reduce((max, t) => (Number.isFinite(t) && t > max ? t : max), 0)
  if (last <= 0) return 120
  const needed = last + 10
  const preset = SILENT_TRACK_DURATIONS.find((d) => d >= needed)
  if (preset !== undefined) return preset
  return Math.min(SILENT_TRACK_MAX_SECONDS, Math.ceil(needed / 60) * 60)
}
