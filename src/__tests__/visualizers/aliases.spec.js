import { describe, it, expect } from 'vitest'
import {
  LEGACY_ALIASES,
  LEGACY_VISUALIZER_IDS,
  isLegacyVisualizer,
  resolveVisualizerId,
} from '../../lib/visualizers/aliases.js'
import { Visualizers, glVisualizers } from '../../lib/visualizers/index.js'

describe('visualizer aliases', () => {
  it('covers every classic visualizer exactly once', () => {
    const classicIds = Object.keys(Visualizers).filter((id) => !glVisualizers[id])
    expect([...LEGACY_VISUALIZER_IDS].sort()).toEqual(classicIds.sort())
  })

  it('maps every classic id to an existing GPU preset', () => {
    for (const [from, to] of Object.entries(LEGACY_ALIASES)) {
      expect(Visualizers[from], from).toBeDefined()
      expect(glVisualizers[to], `${from} → ${to}`).toBeDefined()
    }
  })

  it('identifies classic ids', () => {
    expect(isLegacyVisualizer('bars')).toBe(true)
    expect(isLegacyVisualizer('glBars')).toBe(false)
    expect(isLegacyVisualizer('nope')).toBe(false)
  })

  it('keeps an existing id unchanged, even a classic one', () => {
    expect(resolveVisualizerId('bars')).toBe('bars')
    expect(resolveVisualizerId('glBars')).toBe('glBars')
  })

  it('maps a retired classic id to its GPU replacement', () => {
    const withoutClassic = { ...glVisualizers }
    expect(resolveVisualizerId('bars', withoutClassic)).toBe('glBars')
    expect(resolveVisualizerId('spiralGalaxy', withoutClassic)).toBe('glGalaxy')
  })

  it('returns null for unknown or empty ids', () => {
    expect(resolveVisualizerId('doesNotExist')).toBeNull()
    expect(resolveVisualizerId('')).toBeNull()
    expect(resolveVisualizerId(undefined)).toBeNull()
  })
})
