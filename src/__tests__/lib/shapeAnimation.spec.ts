import { describe, it, expect, vi } from 'vitest'
import {
  SHAPE_ANIMATION_TYPES,
  createShapeAnimation,
  drawShapeAnimated,
  getShapeAnimationFx,
  isNeutralAnimationFx,
  normalizeShapeAnimation,
  supportsShapeAnimation,
} from '../../lib/shapes/shapeAnimation'
import type { Shape } from '../../lib/shapes/shapes'
import { stub } from '../helpers/canvasStubs'

const size = { width: 100, height: 200 }
const fxAt = (anim: unknown, ms: number) => getShapeAnimationFx(anim, ms, size)

describe('shapeAnimation – Konfiguration', () => {
  it('none/ungültig ergibt keine Animation', () => {
    expect(createShapeAnimation('none')).toBeNull()
    expect(normalizeShapeAnimation(null)).toBeNull()
    expect(normalizeShapeAnimation({ type: 'explode' })).toBeNull()
    expect(fxAt({ type: 'none' }, 500)).toBeNull()
  })

  it('jeder Typ außer none liefert Startwerte', () => {
    for (const type of SHAPE_ANIMATION_TYPES.filter((t) => t !== 'none')) {
      const a = createShapeAnimation(type)
      expect(a).toMatchObject({ type, delay: 0 })
      expect(a!.duration).toBeGreaterThan(0)
    }
  })

  it('begrenzt Werte und ergänzt fehlende', () => {
    expect(
      normalizeShapeAnimation({ type: 'pulse', duration: 99, intensity: -5, delay: 'x' }),
    ).toEqual({
      type: 'pulse',
      duration: 10,
      intensity: 0,
      delay: 0,
    })
    expect(normalizeShapeAnimation({ type: 'fade' })).toMatchObject({ duration: 2, intensity: 100 })
  })

  it('Effekt-Bereiche werden nicht animiert', () => {
    expect(supportsShapeAnimation({ type: 'rect' })).toBe(true)
    expect(supportsShapeAnimation({ type: 'censor' })).toBe(false)
    expect(supportsShapeAnimation(null)).toBe(false)
  })
})

describe('shapeAnimation – Schleifen', () => {
  it('Pulsieren: neutral am Start, Maximum zur Hälfte, wiederholt sich', () => {
    const a = { type: 'pulse', duration: 1, intensity: 100 }
    expect(fxAt(a, 0)!.scale).toBeCloseTo(1)
    expect(fxAt(a, 500)!.scale).toBeCloseTo(1.5)
    expect(fxAt(a, 1500)!.scale).toBeCloseTo(1.5)
    expect(fxAt(a, 1000)!.scale).toBeCloseTo(1)
  })

  it('Ein-/Ausblenden: Deckkraft sinkt um die Stärke', () => {
    const a = { type: 'fade', duration: 2, intensity: 50 }
    expect(fxAt(a, 0)!.opacity).toBeCloseTo(1)
    expect(fxAt(a, 1000)!.opacity).toBeCloseTo(0.5)
  })

  it('Blinken schaltet zur Hälfte des Durchlaufs', () => {
    const a = { type: 'blink', duration: 1, intensity: 100 }
    expect(fxAt(a, 200)!.opacity).toBe(1)
    expect(fxAt(a, 700)!.opacity).toBe(0)
  })

  it('Drehen, Pendeln, Hüpfen, Schweben, Wackeln', () => {
    expect(fxAt({ type: 'rotate', duration: 4 }, 1000)!.rotation).toBeCloseTo(90)
    expect(fxAt({ type: 'swing', duration: 2, intensity: 100 }, 500)!.rotation).toBeCloseTo(45)
    expect(fxAt({ type: 'bounce', duration: 1, intensity: 100 }, 500)!.dy).toBeCloseTo(-100)
    expect(fxAt({ type: 'float', duration: 4, intensity: 100 }, 1000)!.dy).toBeCloseTo(40)
    expect(fxAt({ type: 'shake', duration: 1, intensity: 100 }, 1000 / 12)!.dx).toBeCloseTo(8)
  })
})

describe('shapeAnimation – einmalig', () => {
  it('Einblenden wartet die Verzögerung ab und bleibt dann sichtbar', () => {
    const a = { type: 'fadeIn', duration: 1, delay: 2 }
    expect(fxAt(a, 1000)!.opacity).toBe(0)
    expect(fxAt(a, 2500)!.opacity).toBeGreaterThan(0)
    expect(fxAt(a, 2500)!.opacity).toBeLessThan(1)
    expect(fxAt(a, 60000)!.opacity).toBe(1)
  })

  it('Ausblenden endet unsichtbar, Hereinzoomen bei voller Größe', () => {
    expect(fxAt({ type: 'fadeOut', duration: 1 }, 0)!.opacity).toBe(1)
    expect(fxAt({ type: 'fadeOut', duration: 1 }, 5000)!.opacity).toBe(0)
    expect(fxAt({ type: 'zoomIn', duration: 1 }, 0)!.scale).toBe(0)
    expect(fxAt({ type: 'zoomIn', duration: 1 }, 5000)!.scale).toBe(1)
  })
})

describe('drawShapeAnimated', () => {
  const shape = stub<Shape>({
    id: 's',
    type: 'rect',
    x: 50,
    y: 60,
    width: 10,
    height: 10,
    rotation: 10,
    opacity: 80,
  })
  const ctx = () => ({
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
  })

  it('ohne Wirkung wird die Form unverändert gezeichnet', () => {
    const draw = vi.fn()
    const c = ctx()
    drawShapeAnimated(stub(c), shape, { scale: 1, opacity: 1, rotation: 0, dx: 0, dy: 0 }, draw)
    expect(draw).toHaveBeenCalledWith(c, shape)
    expect(c.save).not.toHaveBeenCalled()
    expect(isNeutralAnimationFx(null)).toBe(true)
  })

  it('Deckkraft und Drehung wirken auf eine Kopie der Form', () => {
    const draw = vi.fn()
    drawShapeAnimated(
      stub(ctx()),
      shape,
      { scale: 1, opacity: 0.5, rotation: 20, dx: 0, dy: 0 },
      draw,
    )
    expect(draw.mock.calls[0]![1]).toMatchObject({ opacity: 40, rotation: 30 })
    expect(shape).toMatchObject({ opacity: 80, rotation: 10 })
  })

  it('Skalierung und Versatz um den Mittelpunkt', () => {
    const draw = vi.fn()
    const c = ctx()
    drawShapeAnimated(stub(c), shape, { scale: 2, opacity: 1, rotation: 0, dx: 5, dy: -3 }, draw)
    expect(c.translate.mock.calls).toEqual([
      [55, 57],
      [-50, -60],
    ])
    expect(c.scale).toHaveBeenCalledWith(2, 2)
    expect(c.restore).toHaveBeenCalled()
    expect(draw).toHaveBeenCalledTimes(1)
  })

  it('unsichtbar (Deckkraft 0 oder Größe 0) wird nicht gezeichnet', () => {
    const draw = vi.fn()
    drawShapeAnimated(stub(ctx()), shape, { scale: 1, opacity: 0, rotation: 0, dx: 0, dy: 0 }, draw)
    drawShapeAnimated(stub(ctx()), shape, { scale: 0, opacity: 1, rotation: 0, dx: 0, dy: 0 }, draw)
    expect(draw).not.toHaveBeenCalled()
  })
})
