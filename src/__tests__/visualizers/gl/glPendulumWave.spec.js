import { describe, it, expect } from 'vitest'
import {
  createPendulumClock,
  glPendulumWave,
  PENDULUM_CYCLE,
} from '../../../lib/visualizers/gl/presets/glPendulumWave.js'

const LOUD = [0.5, 0.5, 0.5, 0.5]
const SILENT = [0, 0, 0, 0]

describe('glPendulumWave clock', () => {
  it('advances the phase with the frame time', () => {
    const clock = createPendulumClock()
    clock({ dt: 0.05, bands: LOUD, onset: {} })
    const u = clock({ dt: 0.025, bands: LOUD, onset: {} })
    expect(u.uPhaseT).toBeCloseTo(0.075, 6)
  })

  it('wraps the phase to one cycle so float precision never degrades', () => {
    const clock = createPendulumClock()
    let u
    for (let i = 0; i < Math.ceil((PENDULUM_CYCLE + 1) / 0.1); i++) {
      u = clock({ dt: 0.1, bands: LOUD, onset: {} })
    }
    expect(u.uPhaseT).toBeGreaterThanOrEqual(0)
    expect(u.uPhaseT).toBeLessThan(PENDULUM_CYCLE)
  })

  it('caps long frames and falls back to 60 fps for invalid dt', () => {
    const clock = createPendulumClock()
    expect(clock({ dt: 5, bands: LOUD, onset: {} }).uPhaseT).toBeCloseTo(0.1, 6)
    const other = createPendulumClock()
    expect(other({ dt: NaN }).uPhaseT).toBeCloseTo(1 / 60, 6)
    expect(other({ dt: -1 }).uPhaseT).toBeCloseTo(2 / 60, 6)
  })

  it('puts the row back in step on a strong hit after a quiet passage', () => {
    const clock = createPendulumClock({ quietTime: 1 })
    for (let i = 0; i < 12; i++) clock({ dt: 0.1, bands: SILENT, onset: {} })
    const u = clock({ dt: 0.1, bands: LOUD, onset: { all: 0.9 } })
    expect(u.uPhaseT).toBe(0)
  })

  it('does not resync on hits while the music keeps playing', () => {
    const clock = createPendulumClock({ quietTime: 1 })
    for (let i = 0; i < 12; i++) clock({ dt: 0.1, bands: LOUD, onset: {} })
    const u = clock({ dt: 0.1, bands: LOUD, onset: { all: 0.9 } })
    expect(u.uPhaseT).toBeCloseTo(1.3, 6)
  })

  it('kicks on bass onsets and decays afterwards', () => {
    const clock = createPendulumClock()
    const hit = clock({ dt: 0.016, bands: LOUD, onset: { bass: 0.8 } })
    expect(hit.uKick).toBeCloseTo(0.8, 6)
    let u = hit
    for (let i = 0; i < 60; i++) u = clock({ dt: 0.016, bands: LOUD, onset: {} })
    expect(u.uKick).toBeLessThan(0.1)
    expect(u.uKick).toBeGreaterThan(0)
  })

  it('tolerates a missing context', () => {
    const clock = createPendulumClock()
    const u = clock()
    for (const v of Object.values(u)) expect(Number.isFinite(v)).toBe(true)
  })

  it('is wired into the preset as its uniforms hook', () => {
    expect(typeof glPendulumWave.uniforms).toBe('function')
    const u = glPendulumWave.uniforms({ bands: LOUD, onset: {}, time: 0, dt: 0.016, intensity: 1 })
    expect(u.uCycle).toBe(PENDULUM_CYCLE)
    expect(u.uPendulums).toBeGreaterThanOrEqual(4)
  })
})
