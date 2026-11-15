// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  SILENT_TRACK_DURATIONS,
  clampSilentSeconds,
  createSilentWav,
  formatSilentDuration,
  suggestSilentDuration,
} from '../../../lib/audio/silentTrack'

const readHeader = async (blob: Blob) => new DataView(await blob.slice(0, 44).arrayBuffer())
const ascii = (view: DataView, offset: number, length: number) =>
  String.fromCharCode(...Array.from({ length }, (_, i) => view.getUint8(offset + i)))

describe('createSilentWav', () => {
  it('erzeugt eine gültige PCM-WAV-Datei mit der gewünschten Länge', async () => {
    const blob = createSilentWav(3)
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(44 + 3 * 8000)
    const h = await readHeader(blob)
    expect(ascii(h, 0, 4)).toBe('RIFF')
    expect(ascii(h, 8, 4)).toBe('WAVE')
    expect(h.getUint16(20, true)).toBe(1) // PCM
    expect(h.getUint16(22, true)).toBe(1) // mono
    expect(h.getUint32(24, true)).toBe(8000)
    expect(h.getUint16(34, true)).toBe(8)
    expect(ascii(h, 36, 4)).toBe('data')
    expect(h.getUint32(40, true)).toBe(3 * 8000)
    // Länge aus dem Header = data / byteRate
    expect(h.getUint32(40, true) / h.getUint32(28, true)).toBe(3)
  })

  it('enthält nur Nullpegel (128 bei 8 Bit)', async () => {
    const bytes = new Uint8Array(await createSilentWav(1).slice(44).arrayBuffer())
    expect(bytes.length).toBe(8000)
    expect(bytes.every((b) => b === 128)).toBe(true)
  })

  it('lehnt ungültige Längen ab', () => {
    expect(() => createSilentWav(0)).toThrow(RangeError)
    expect(() => createSilentWav(NaN)).toThrow(RangeError)
  })
})

describe('clampSilentSeconds', () => {
  it('rundet und begrenzt auf 1–3600 s', () => {
    expect(clampSilentSeconds(2.4)).toBe(2)
    expect(clampSilentSeconds(99999)).toBe(3600)
    expect(clampSilentSeconds(0.2)).toBeNull()
    expect(clampSilentSeconds(-5)).toBeNull()
    expect(clampSilentSeconds('60')).toBeNull()
    expect(clampSilentSeconds(Infinity)).toBeNull()
  })
})

describe('formatSilentDuration', () => {
  it('m:ss bzw. h:mm:ss', () => {
    expect(formatSilentDuration(30)).toBe('0:30')
    expect(formatSilentDuration(120)).toBe('2:00')
    expect(formatSilentDuration(3600)).toBe('1:00:00')
  })
})

describe('suggestSilentDuration', () => {
  it('ohne Marker 2 Minuten', () => {
    expect(suggestSilentDuration([])).toBe(120)
  })

  it('kürzeste Länge, die alle Marker plus 10 s abdeckt', () => {
    expect(suggestSilentDuration([5, 15])).toBe(30)
    expect(suggestSilentDuration([25])).toBe(60)
    expect(suggestSilentDuration([170])).toBe(180)
    expect(suggestSilentDuration([4000])).toBe(3600)
  })

  it('alle Vorschläge sind wählbare Längen', () => {
    for (const t of [0, 1, 50, 299, 1000, 3000]) {
      expect(SILENT_TRACK_DURATIONS).toContain(suggestSilentDuration([t]))
    }
  })
})
