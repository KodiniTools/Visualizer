// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  SILENT_TRACK_DURATIONS,
  clampSilentSeconds,
  createSilentWav,
  SILENT_TRACK_MAX_SECONDS,
  formatSilentDuration,
  parseSilentDuration,
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
  it('rundet und begrenzt auf 1–10800 s (3 Stunden)', () => {
    expect(SILENT_TRACK_MAX_SECONDS).toBe(10800)
    expect(clampSilentSeconds(2.4)).toBe(2)
    expect(clampSilentSeconds(5400)).toBe(5400)
    expect(clampSilentSeconds(99999)).toBe(10800)
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
  })

  it('bis 1 Stunde runde Längen, darüber volle Minuten, höchstens 3 Stunden', () => {
    for (const t of [0, 1, 50, 299, 1000, 3000]) {
      expect(SILENT_TRACK_DURATIONS).toContain(suggestSilentDuration([t]))
    }
    expect(suggestSilentDuration([4000])).toBe(4020)
    expect(suggestSilentDuration([20000])).toBe(10800)
  })
})

describe('parseSilentDuration', () => {
  it('liest m:ss und h:mm:ss', () => {
    expect(parseSilentDuration('0:30')).toBe(30)
    expect(parseSilentDuration('4:37')).toBe(277)
    expect(parseSilentDuration(' 12:05 ')).toBe(725)
    expect(parseSilentDuration('90:00')).toBe(5400)
    expect(parseSilentDuration('1:15:00')).toBe(4500)
    expect(parseSilentDuration('0:00')).toBe(0)
  })

  it('nur Zahl = Minuten, auch mit Komma oder Punkt', () => {
    expect(parseSilentDuration('5')).toBe(300)
    expect(parseSilentDuration('1,5')).toBe(90)
    expect(parseSilentDuration('0.25')).toBe(15)
  })

  it('unlesbare Eingaben → null', () => {
    for (const bad of [
      '',
      '  ',
      'abc',
      '1:60',
      '1:2:60',
      '1::2',
      ':30',
      '1:30:',
      '1:2:3:4',
      '-1',
      '5m',
      '1:3a',
    ]) {
      expect(parseSilentDuration(bad)).toBeNull()
    }
    expect(parseSilentDuration(30)).toBeNull()
    expect(parseSilentDuration(undefined)).toBeNull()
  })
})

describe('createSilentWav (lang)', () => {
  it('setzt längere Stille aus Blöcken zusammen (Länge und Inhalt stimmen)', async () => {
    const blob = createSilentWav(125)
    expect(blob.size).toBe(44 + 125 * 8000)
    const h = await readHeader(blob)
    expect(h.getUint32(40, true)).toBe(125 * 8000)
    expect(h.getUint32(4, true)).toBe(36 + 125 * 8000)
    const tail = new Uint8Array(await blob.slice(44 + 119 * 8000).arrayBuffer())
    expect(tail.length).toBe(6 * 8000)
    expect(tail.every((b) => b === 128)).toBe(true)
  })
})
