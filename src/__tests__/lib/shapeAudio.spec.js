import { describe, it, expect, vi } from 'vitest'
import {
  SHAPE_EFFECT_NAMES,
  SHAPE_UNSUPPORTED_EFFECTS,
  createShapeAudioReactive,
  drawShapeWithAudio,
  ensureShapeAudioReactive,
  getShapeAudioFx,
  supportsShapeAudio,
} from '../../lib/shapes/shapeAudio.js'
import { EFFECT_NAMES } from '../../lib/audio/AudioReactiveEffects.js'
import { createShape } from '../../lib/shapes/shapes.js'

function fakeCtx() {
  const calls = []
  const rec =
    (name) =>
    (...args) =>
      calls.push([name, ...args])
  return {
    calls,
    filter: 'none',
    globalAlpha: 1,
    save: rec('save'),
    restore: rec('restore'),
    translate: rec('translate'),
    rotate: rec('rotate'),
    scale: rec('scale'),
    transform: rec('transform'),
  }
}

const audioData = { bass: 255, mid: 255, treble: 255, volume: 255, smoothBass: 255 }

describe('shapeAudio', () => {
  it('bietet alle Bild-Effekte außer Rahmen, Chromatik und Vignette an', () => {
    expect(SHAPE_EFFECT_NAMES).toEqual(
      EFFECT_NAMES.filter((n) => !SHAPE_UNSUPPORTED_EFFECTS.includes(n)),
    )
    expect(SHAPE_EFFECT_NAMES).toContain('beatPulse')
    expect(SHAPE_EFFECT_NAMES).not.toContain('border')
    const cfg = createShapeAudioReactive()
    expect(cfg.enabled).toBe(false)
    expect(Object.keys(cfg.effects)).toEqual([...SHAPE_EFFECT_NAMES])
  })

  it('vervollständigt alte Konfigurationen in-place', () => {
    const ar = { enabled: true, effects: { scale: { enabled: true, intensity: 50 } } }
    expect(ensureShapeAudioReactive(ar)).toBe(ar)
    expect(ar.effects.scale.intensity).toBe(50)
    expect(ar.effects.hue).toBeTruthy()
    expect(ar.source).toBe('bass')
  })

  it('Effekt-Bereiche (Weichzeichnen/Verpixeln) unterstützen kein Audio-Reaktiv', () => {
    expect(supportsShapeAudio(createShape('star', 800, 600))).toBe(true)
    expect(supportsShapeAudio(createShape('blur', 800, 600))).toBe(false)
    expect(supportsShapeAudio(null)).toBe(false)
  })

  it('liefert keine Effekte ohne Freigabe oder Audiodaten', () => {
    const ar = createShapeAudioReactive()
    ar.effects.scale.enabled = true
    expect(getShapeAudioFx(ar, audioData)).toBeNull()
    ar.enabled = true
    expect(getShapeAudioFx(ar, null)).toBeNull()
    expect(getShapeAudioFx(null, audioData)).toBeNull()
  })

  it('berechnet Effektwerte für aktivierte Effekte', () => {
    const ar = createShapeAudioReactive()
    ar.enabled = true
    ar.effects.hue.enabled = true
    const fx = getShapeAudioFx(ar, audioData)
    expect(Object.keys(fx)).toEqual(['hue'])
    expect(typeof fx.hue.hueRotate).toBe('number')
  })

  it('zeichnet ohne Effekte unverändert', () => {
    const ctx = fakeCtx()
    const shape = createShape('star', 800, 600)
    const draw = vi.fn()
    drawShapeWithAudio(ctx, shape, null, draw)
    expect(draw).toHaveBeenCalledWith(ctx, shape)
    expect(ctx.calls).toEqual([])
  })

  it('pulsiert und bewegt die Form um ihren Mittelpunkt', () => {
    const ctx = fakeCtx()
    const shape = createShape('star', 800, 600)
    const draw = vi.fn()
    drawShapeWithAudio(ctx, shape, { scale: { scale: 2 }, bounce: { bounceY: 10 } }, draw)
    expect(ctx.calls[0][0]).toBe('save')
    expect(ctx.calls).toContainEqual(['translate', 0, 10])
    expect(ctx.calls).toContainEqual(['scale', 2, 2])
    expect(ctx.calls.at(-1)[0]).toBe('restore')
    expect(draw).toHaveBeenCalledWith(ctx, shape)
  })

  it('setzt Filter und rechnet Strobe in die Deckkraft der Form ein', () => {
    const ctx = fakeCtx()
    const shape = { ...createShape('star', 800, 600), opacity: 80 }
    const draw = vi.fn()
    drawShapeWithAudio(
      ctx,
      shape,
      { hue: { hueRotate: 30 }, strobe: { strobeOpacity: 0.5, strobeBrightness: 100 } },
      draw,
    )
    expect(ctx.filter).toContain('hue-rotate(30deg)')
    const drawn = draw.mock.calls[0][1]
    expect(drawn.opacity).toBe(40)
    expect(shape.opacity).toBe(80)
  })

  it('Effekt-Bereiche werden auch mit Effekten unverändert gezeichnet', () => {
    const ctx = fakeCtx()
    const shape = createShape('blur', 800, 600)
    const draw = vi.fn()
    drawShapeWithAudio(ctx, shape, { scale: { scale: 2 } }, draw)
    expect(ctx.calls).toEqual([])
    expect(draw).toHaveBeenCalledWith(ctx, shape)
  })
})
