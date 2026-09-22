import { describe, it, expect } from 'vitest'
import {
  SMILE_VARIANTS,
  makeLaserSmilePreset,
  glLaserSmileHappy,
  glLaserSmileWink,
  glLaserSmileLaugh,
  glLaserSmileCool,
  glLaserSmileSurprised,
} from '../../../lib/visualizers/gl/presets/glLaserSmiles.js'
import { glPresetSpecs } from '../../../lib/visualizers/gl/index.js'

const PRESETS = [
  glLaserSmileHappy,
  glLaserSmileWink,
  glLaserSmileLaugh,
  glLaserSmileCool,
  glLaserSmileSurprised,
]

describe('gl/presets/glLaserSmiles', () => {
  it('bietet fünf Gesichter mit eigenem Rumpf, Namen und Fallback', () => {
    expect(Object.keys(SMILE_VARIANTS)).toEqual(['happy', 'wink', 'laugh', 'cool', 'surprised'])
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(5)
    for (const p of PRESETS) {
      expect(p.id).toMatch(/^glLaserSmile[A-Z]/)
      expect(p.name_de).toMatch(/^Laser-Smiley .* \(GPU\)$/)
      expect(p.name_en).toMatch(/^Laser Smiley .* \(GPU\)$/)
      expect(p.frag).toContain('float face(')
      expect(p.frag).toContain('laserGlow(')
      expect(typeof p.fallback.draw).toBe('function')
      expect(p.uniforms()).toEqual({ uGhost: 0.5 })
    }
    // Jedes Gesicht hat Kopf (Kreisring), Augen (Teil 1) und Mund (Teil 2).
    for (const v of Object.values(SMILE_VARIANTS)) {
      expect(v.body).toMatch(/abs\(length\(q\) - R\)/)
      expect(v.body).toMatch(/, 1\.0\)/)
      expect(v.body).toMatch(/, 2\.0\)/)
    }
    expect(new Set(PRESETS.map((p) => p.frag)).size).toBe(5)
  })

  it('ist in der Preset-Registry eingetragen und gehört zu den Laser-Presets', () => {
    for (const p of PRESETS) {
      expect(glPresetSpecs[p.id]).toBe(p)
      expect(p.id.startsWith('glLaser')).toBe(true)
    }
  })

  it('lehnt unbekannte Varianten ab', () => {
    expect(() => makeLaserSmilePreset('angry')).toThrow(/Variante/)
  })
})
