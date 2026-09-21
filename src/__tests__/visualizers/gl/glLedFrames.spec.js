import { describe, it, expect } from 'vitest'
import {
  FRAME_LAMPS,
  FRAME_VARIANTS,
  makeLedFramePreset,
  glLedFrameChase,
  glLedFrameSpectrum,
  glLedFrameVu,
  glLedFramePulse,
  glLedFrameRainbow,
} from '../../../lib/visualizers/gl/presets/glLedFrames.js'
import { glPresetSpecs } from '../../../lib/visualizers/gl/index.js'

const PRESETS = [
  glLedFrameChase,
  glLedFrameSpectrum,
  glLedFrameVu,
  glLedFramePulse,
  glLedFrameRainbow,
]

describe('gl/presets/glLedFrames', () => {
  it('bietet fünf Varianten mit eigener Regel, Namen und Fallback', () => {
    expect(Object.keys(FRAME_VARIANTS)).toEqual(['chase', 'spectrum', 'vu', 'pulse', 'rainbow'])
    const ids = PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(5)
    for (const p of PRESETS) {
      expect(p.id).toMatch(/^glLedFrame[A-Z]/)
      expect(p.name_de).toMatch(/^LED-Rahmen .* \(GPU\)$/)
      expect(p.name_en).toMatch(/^LED Frame .* \(GPU\)$/)
      expect(p.frag).toContain('ledLamp(')
      expect(p.frag).toContain('roundedBox(')
      expect(typeof p.fallback.draw).toBe('function')
      expect(p.uniforms()).toEqual({ uLamps: FRAME_LAMPS, uLensSize: 0.38 })
    }
    // Jede Regel setzt Helligkeit und Farbton der Lampe.
    for (const v of Object.values(FRAME_VARIANTS)) {
      expect(v.rule).toMatch(/lit = /)
      expect(v.rule).toMatch(/hue = /)
    }
    // Die Shader unterscheiden sich genau in der Regel.
    const frags = new Set(PRESETS.map((p) => p.frag))
    expect(frags.size).toBe(5)
  })

  it('ist in der Preset-Registry eingetragen', () => {
    for (const p of PRESETS) expect(glPresetSpecs[p.id]).toBe(p)
  })

  it('lehnt unbekannte Varianten ab', () => {
    expect(() => makeLedFramePreset('disco')).toThrow(/Variante/)
  })

  it('zeichnet den Fallback ohne Fehler auf einen 2D-Context', () => {
    const calls = []
    const ctx = new Proxy(
      { globalAlpha: 1, fillStyle: '' },
      {
        get: (t, p) => (p in t ? t[p] : (...a) => calls.push([p, ...a])),
        set: (t, p, v) => ((t[p] = v), true),
      },
    )
    const data = new Uint8Array(64).fill(160)
    expect(() => glLedFrameVu.fallback.draw(ctx, data, 64, 800, 450, '#6ea8fe', 1)).not.toThrow()
    // 16:9 bei 12 Lampen Hoehe: 21 x 12 Raster, Ring = 2*21 + 2*12 - 4 = 62 Lampen + Gehaeuse
    expect(calls.filter((c) => c[0] === 'arc').length).toBeGreaterThanOrEqual(62)
    expect(calls.some((c) => c[0] === 'fill' && c[1] === 'evenodd')).toBe(true)
  })
})
