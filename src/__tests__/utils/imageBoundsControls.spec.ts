import { describe, it, expect } from 'vitest'
import {
  isValidBounds,
  getBoundsCenter,
  positionBounds,
  resizeBounds,
  getDefaultImageSize,
  IMAGE_SIZE_MIN,
  IMAGE_SIZE_MAX,
  fitBoundsToArea,
} from '../../lib/imageBoundsControls'

const B = { relX: 0.1, relY: 0.2, relWidth: 0.4, relHeight: 0.2 } // Mitte 0.3/0.3

describe('imageBoundsControls', () => {
  it('isValidBounds / getBoundsCenter', () => {
    expect(isValidBounds(B)).toBe(true)
    expect(isValidBounds({ ...B, relWidth: 0 })).toBe(false)
    expect(isValidBounds({ ...B, relX: NaN })).toBe(false)
    expect(isValidBounds(null)).toBe(false)
    expect(getBoundsCenter(B)).toEqual({ x: expect.closeTo(0.3), y: expect.closeTo(0.3) })
    expect(getBoundsCenter({})).toBeNull()
  })

  it('positionBounds: Mittelpunkt setzen, Größe bleibt, Achse einzeln, begrenzt 0–1', () => {
    const p = positionBounds(B, { centerX: 0.5, centerY: 0.5 })
    expect(p).toEqual({
      relX: expect.closeTo(0.3),
      relY: expect.closeTo(0.4),
      relWidth: 0.4,
      relHeight: 0.2,
    })
    expect(getBoundsCenter(positionBounds(B, { centerX: 0.8 }))).toEqual({
      x: expect.closeTo(0.8),
      y: expect.closeTo(0.3),
    })
    expect(getBoundsCenter(positionBounds(B, { centerX: 3, centerY: -1 }))).toEqual({
      x: expect.closeTo(1),
      y: expect.closeTo(0),
    })
    expect(positionBounds(null, { centerX: 0.5 })).toBeNull()
    expect(B).toEqual({ relX: 0.1, relY: 0.2, relWidth: 0.4, relHeight: 0.2 }) // unverändert
  })

  it('resizeBounds: um den Mittelpunkt, mit/ohne Seitenverhältnis, begrenzt', () => {
    const r = resizeBounds(B, { width: 0.2 })
    expect(r!.relWidth).toBeCloseTo(0.2)
    expect(r!.relHeight).toBeCloseTo(0.1)
    expect(getBoundsCenter(r)).toEqual({ x: expect.closeTo(0.3), y: expect.closeTo(0.3) })
    expect(resizeBounds(B, { height: 0.4 })!.relWidth).toBeCloseTo(0.8)
    const free = resizeBounds(B, { height: 0.5, keepAspect: false })
    expect([free!.relWidth, free!.relHeight]).toEqual([0.4, 0.5])
    expect(resizeBounds(B, { width: 10, keepAspect: false })!.relWidth).toBe(IMAGE_SIZE_MAX)
    expect(resizeBounds(B, { width: 0, keepAspect: false })!.relWidth).toBe(IMAGE_SIZE_MIN)
    expect(resizeBounds(null, { width: 0.2 })).toBeNull()
  })

  it('getDefaultImageSize: 1/3 Breite, natürliches Seitenverhältnis (wie addImage)', () => {
    const s = getDefaultImageSize({ width: 200, height: 100 }, { width: 1000, height: 500 })
    expect(s!.width).toBeCloseTo(1 / 3)
    // Pixel: 333×166 → relativ zur Höhe 500 = 0.333
    expect(s!.height).toBeCloseTo(1 / 3)
    expect(getDefaultImageSize({ width: 0, height: 0 }, { width: 10, height: 10 })).toBeNull()
    expect(getDefaultImageSize({ width: 10, height: 10 }, null)).toBeNull()
  })
})

describe('fitBoundsToArea', () => {
  const canvas = { width: 1000, height: 500 } // 2:1
  const wide = { width: 400, height: 100 } // 4:1 (breiter als Canvas)
  const tall = { width: 100, height: 200 } // 1:2 (höher als Canvas)

  it('cover: füllt die Canvas komplett, Seitenverhältnis bleibt, zentriert', () => {
    const b = fitBoundsToArea(tall, canvas, 'cover')!
    // Breite = Canvas, Höhe 2000 px = 400 %
    expect(b.relWidth).toBeCloseTo(1)
    expect(b.relHeight).toBeCloseTo(4)
    expect(b.relX).toBeCloseTo(0)
    expect(b.relY).toBeCloseTo(-1.5)
    const w = fitBoundsToArea(wide, canvas, 'cover')!
    expect(w.relHeight).toBeCloseTo(1)
    expect(w.relWidth).toBeCloseTo(2)
    expect(w.relX).toBeCloseTo(-0.5)
    expect(w.relY).toBeCloseTo(0)
  })

  it('cover deckt jede Kante ab (kein Spalt)', () => {
    for (const img of [wide, tall, { width: 1000, height: 500 }]) {
      const b = fitBoundsToArea(img, canvas, 'cover')!
      expect(b.relX).toBeLessThanOrEqual(1e-9)
      expect(b.relY).toBeLessThanOrEqual(1e-9)
      expect(b.relX + b.relWidth).toBeGreaterThanOrEqual(1 - 1e-9)
      expect(b.relY + b.relHeight).toBeGreaterThanOrEqual(1 - 1e-9)
    }
  })

  it('contain: ganzes Bild sichtbar, zentriert', () => {
    const b = fitBoundsToArea(tall, canvas, 'contain')!
    expect(b.relHeight).toBeCloseTo(1)
    expect(b.relWidth).toBeCloseTo(0.25) // 250 px
    expect(b.relX).toBeCloseTo(0.375)
    expect(b.relY).toBeCloseTo(0)
  })

  it('stretch: exakt die Canvas, unabhängig vom Bild', () => {
    expect(fitBoundsToArea(tall, canvas, 'stretch')).toEqual({
      relX: 0,
      relY: 0,
      relWidth: 1,
      relHeight: 1,
    })
    // auch ohne bekannte Bildgröße
    expect(fitBoundsToArea(null, canvas, 'stretch')).toEqual({
      relX: 0,
      relY: 0,
      relWidth: 1,
      relHeight: 1,
    })
  })

  it('Zielfläche (Workspace) in Canvas-Pixeln', () => {
    const area = { x: 250, y: 50, width: 500, height: 400 }
    const s = fitBoundsToArea(tall, canvas, 'stretch', area)!
    expect(s.relX).toBeCloseTo(0.25)
    expect(s.relY).toBeCloseTo(0.1)
    expect(s.relWidth).toBeCloseTo(0.5)
    expect(s.relHeight).toBeCloseTo(0.8)
    const c = fitBoundsToArea(tall, canvas, 'cover', area)!
    // 500 px breit → 1000 px hoch, vertikal um den Workspace zentriert
    expect(c.relWidth).toBeCloseTo(0.5)
    expect(c.relHeight).toBeCloseTo(2)
    expect(c.relY).toBeCloseTo((250 - 500) / 500)
  })

  it('bevorzugt naturalWidth/Height, ungültige Eingaben → null', () => {
    const img = { width: 10, height: 10, naturalWidth: 100, naturalHeight: 200 }
    expect(fitBoundsToArea(img, canvas, 'contain')!.relWidth).toBeCloseTo(0.25)
    expect(fitBoundsToArea(tall, null, 'cover')).toBeNull()
    expect(fitBoundsToArea(tall, { width: 0, height: 500 }, 'cover')).toBeNull()
    expect(fitBoundsToArea({ width: 0, height: 0 }, canvas, 'cover')).toBeNull()
    expect(fitBoundsToArea(tall, canvas, 'bogus' as 'cover')).toBeNull()
    // leere Zielfläche → ganze Canvas
    expect(
      fitBoundsToArea(tall, canvas, 'stretch', { x: 0, y: 0, width: 0, height: 0 })!.relWidth,
    ).toBe(1)
  })
})
