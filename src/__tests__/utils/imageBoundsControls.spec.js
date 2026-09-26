import { describe, it, expect } from 'vitest'
import {
  isValidBounds,
  getBoundsCenter,
  positionBounds,
  resizeBounds,
  getDefaultImageSize,
  IMAGE_SIZE_MIN,
  IMAGE_SIZE_MAX,
} from '../../lib/imageBoundsControls.js'

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
    expect(r.relWidth).toBeCloseTo(0.2)
    expect(r.relHeight).toBeCloseTo(0.1)
    expect(getBoundsCenter(r)).toEqual({ x: expect.closeTo(0.3), y: expect.closeTo(0.3) })
    expect(resizeBounds(B, { height: 0.4 }).relWidth).toBeCloseTo(0.8)
    const free = resizeBounds(B, { height: 0.5, keepAspect: false })
    expect([free.relWidth, free.relHeight]).toEqual([0.4, 0.5])
    expect(resizeBounds(B, { width: 10, keepAspect: false }).relWidth).toBe(IMAGE_SIZE_MAX)
    expect(resizeBounds(B, { width: 0, keepAspect: false }).relWidth).toBe(IMAGE_SIZE_MIN)
    expect(resizeBounds(null, { width: 0.2 })).toBeNull()
  })

  it('getDefaultImageSize: 1/3 Breite, natürliches Seitenverhältnis (wie addImage)', () => {
    const s = getDefaultImageSize({ width: 200, height: 100 }, { width: 1000, height: 500 })
    expect(s.width).toBeCloseTo(1 / 3)
    // Pixel: 333×166 → relativ zur Höhe 500 = 0.333
    expect(s.height).toBeCloseTo(1 / 3)
    expect(getDefaultImageSize({ width: 0, height: 0 }, { width: 10, height: 10 })).toBeNull()
    expect(getDefaultImageSize({ width: 10, height: 10 }, null)).toBeNull()
  })
})
