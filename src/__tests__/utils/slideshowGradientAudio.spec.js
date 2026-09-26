import { describe, it, expect, vi } from 'vitest'
import {
  computeSlideshowGradientAudio,
  normalizeSlideshowGradientAudio,
} from '../../lib/slideshowGradientAudio.js'
import { createSlideshowBaseFill } from '../../lib/canvasManager/rendering/BackgroundRenderer.js'

const loud = { bass: 255, mid: 0, treble: 0, volume: 0 }
const silent = { bass: 0, mid: 0, treble: 0, volume: 0 }
const audioOn = (over = {}) =>
  normalizeSlideshowGradientAudio({
    enabled: true,
    source: 'bass',
    pulse: 100,
    rotation: 100,
    ...over,
  })

describe('slideshowGradientAudio', () => {
  it('aus, ohne Audiodaten oder Stille: Verlauf unverändert', () => {
    const neutral = { extent: 1, angleOffset: 0, centerShift: 0, shiftAngle: 0 }
    expect(computeSlideshowGradientAudio(null, 'canvas', loud)).toEqual(neutral)
    expect(computeSlideshowGradientAudio(audioOn({ enabled: false }), 'canvas', loud)).toEqual(
      neutral,
    )
    expect(computeSlideshowGradientAudio(audioOn(), 'canvas', null)).toEqual(neutral)
    const quiet = computeSlideshowGradientAudio(audioOn(), 'workspace', silent, 1000)
    expect(quiet.extent).toBe(1)
    expect(quiet.centerShift).toBe(0)
  })

  it('volle Lautstärke: Verlauf zieht sich zusammen und dreht', () => {
    // erster Aufruf für 'canvas' → Hüllkurve übernimmt den Pegel direkt
    const now = Math.PI / 2 / 0.002 // sin = 1 → maximaler Ausschlag
    const r = computeSlideshowGradientAudio(audioOn(), 'canvas', loud, now)
    expect(r.extent).toBeLessThan(1)
    expect(r.extent).toBeGreaterThanOrEqual(0.4)
    expect(r.angleOffset).toBeGreaterThan(0)
    expect(r.centerShift).toBeGreaterThan(0)
  })

  it('Stärke 0 schaltet einen Effekt ab', () => {
    const r = computeSlideshowGradientAudio(audioOn({ rotation: 0 }), 'canvas', loud, 1234)
    expect(r.angleOffset).toBe(0)
    expect(r.centerShift).toBe(0)
  })

  it('createSlideshowBaseFill wendet Ausdehnung, Winkel und Kreisen an', () => {
    const ctx = {
      createLinearGradient: vi.fn((...a) => ({ a, addColorStop() {} })),
      createRadialGradient: vi.fn((...a) => ({ a, addColorStop() {} })),
    }
    const area = { x: 0, y: 0, width: 6, height: 8 } // halbe Diagonale 5
    const g = { enabled: true, color2: '#fff', type: 'linear', angle: 0 }
    // Ausdehnung 0,5 → halbe Länge 2,5; +90° → senkrecht
    const lin = createSlideshowBaseFill(ctx, area, '#000', g, { extent: 0.5, angleOffset: 90 })
    expect(lin.a.map((v) => Math.round(v * 100) / 100)).toEqual([3, 1.5, 3, 6.5])
    const rad = createSlideshowBaseFill(
      ctx,
      area,
      '#000',
      { ...g, type: 'radial' },
      { extent: 1, centerShift: 0.2, shiftAngle: 0 },
    )
    expect(rad.a).toEqual([4, 4, 0, 4, 4, 5]) // Mittelpunkt um 0,2 × 5 nach rechts
  })
})
