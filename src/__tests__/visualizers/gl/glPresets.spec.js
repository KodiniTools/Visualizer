import { describe, it, expect } from 'vitest'
import { glPresetSpecs, glVisualizers } from '../../../lib/visualizers/gl/index.js'
import { Visualizers } from '../../../lib/visualizers/index.js'
import { buildFragmentSource, FRAG_HEADER } from '../../../lib/visualizers/gl/glsl.js'

describe('gl presets', () => {
  it('every spec is complete and consistent with its registry key', () => {
    for (const [key, spec] of Object.entries(glPresetSpecs)) {
      expect(spec.id).toBe(key)
      expect(typeof spec.name_de).toBe('string')
      expect(typeof spec.name_en).toBe('string')
      expect(spec.frag).toMatch(/void\s+main\s*\(/)
      expect(spec.frag).toMatch(/fragColor/)
      if (spec.needsImage) expect(spec.fallback).toBeUndefined()
      else expect(typeof spec.fallback?.draw).toBe('function')
      if (spec.uniforms) {
        const u = spec.uniforms({
          bands: [0, 0, 0, 0],
          onset: {},
          time: 0,
          dt: 0.016,
          intensity: 1,
        })
        for (const v of Object.values(u))
          expect(typeof v === 'number' || Array.isArray(v) || ArrayBuffer.isView(v)).toBe(true)
      }
    }
  })

  it('marks time-domain presets so they receive waveform data', () => {
    expect(glVisualizers.glWaveform.needsTimeData).toBe(true)
    expect(glVisualizers.glBars.needsTimeData).toBe(false)
  })

  it('is registered in the global Visualizers map', () => {
    for (const key of Object.keys(glVisualizers)) {
      expect(Visualizers[key]).toBe(glVisualizers[key])
      expect(Visualizers[key].kind).toBe('gl')
    }
  })

  it('does not shadow any existing Canvas2D visualizer id', () => {
    const glKeys = new Set(Object.keys(glVisualizers))
    for (const key of Object.keys(Visualizers)) {
      if (glKeys.has(key)) continue
      expect(Visualizers[key].kind).toBeUndefined()
    }
  })

  it('builds a GLSL ES 3.00 fragment source with the standard header', () => {
    const src = buildFragmentSource(glPresetSpecs.glBars.frag)
    expect(src.startsWith('#version 300 es')).toBe(true)
    expect(src.startsWith(FRAG_HEADER)).toBe(true)
    for (const name of ['uResolution', 'uTime', 'uColorHsl', 'uBands', 'uOnset', 'uAudio']) {
      expect(src).toContain(name)
    }
  })
})
