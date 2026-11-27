import { describe, it, expect } from 'vitest'
import {
  evenDimension,
  frameCount,
  frameTime,
  normalizeFps,
  outputSize,
} from '../../../lib/offlineExport/frameTiming'

describe('frameTiming', () => {
  it('zählt Frames über die ganze Dauer (aufgerundet, mindestens 1)', () => {
    expect(frameCount(3, 30)).toBe(90)
    expect(frameCount(3.01, 30)).toBe(91)
    expect(frameCount(2.5, 60)).toBe(150)
    expect(frameCount(0, 30)).toBe(1)
    expect(frameCount(Number.NaN, 30)).toBe(1)
    // Rundungsrauschen erzeugt keinen Extra-Frame
    expect(frameCount(0.1 * 3, 30)).toBe(9)
  })

  it('liefert Frame-Zeitpunkte', () => {
    expect(frameTime(0, 30)).toBe(0)
    expect(frameTime(45, 30)).toBe(1.5)
  })

  it('erlaubt nur 30 und 60 fps', () => {
    expect(normalizeFps(60)).toBe(60)
    expect(normalizeFps(30)).toBe(30)
    expect(normalizeFps(25)).toBe(30)
    expect(normalizeFps(undefined)).toBe(30)
  })

  it('macht Kantenlängen gerade (H.264 4:2:0)', () => {
    expect(evenDimension(1081)).toBe(1080)
    expect(evenDimension(1920.7)).toBe(1920)
    expect(evenDimension(1)).toBe(2)
    expect(evenDimension(Number.NaN)).toBe(2)
    expect(outputSize(1081, 1919)).toEqual({ width: 1080, height: 1918 })
  })
})
