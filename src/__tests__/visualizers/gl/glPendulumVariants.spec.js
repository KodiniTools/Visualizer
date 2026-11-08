import { describe, it, expect } from 'vitest'
import {
  createPendulumClock,
  glPendulumWave,
  PENDULUM_BASE_SWINGS,
  PENDULUM_CYCLE,
} from '../../../lib/visualizers/gl/presets/glPendulumWave.js'
import { glPendulumSnake } from '../../../lib/visualizers/gl/presets/glPendulumSnake.js'
import { glPendulumCircle } from '../../../lib/visualizers/gl/presets/glPendulumCircle.js'
import { glPendulumField } from '../../../lib/visualizers/gl/presets/glPendulumField.js'
import { glPresetSpecs } from '../../../lib/visualizers/gl/index.js'
import { VISUALIZER_CATEGORIES } from '../../../stores/visualizer/catalog'

const CTX = { bands: [0.5, 0.5, 0.5, 0.5], onset: {}, time: 0, dt: 0.016, intensity: 1 }
const VARIANTS = [glPendulumSnake, glPendulumCircle, glPendulumField]

describe('createPendulumClock options', () => {
  it('keeps the original defaults for Pendelwelle', () => {
    const u = createPendulumClock()(CTX)
    expect(u.uCycle).toBe(PENDULUM_CYCLE)
    expect(u.uBaseSwings).toBe(PENDULUM_BASE_SWINGS)
    expect(u.uPendulums).toBe(28)
  })

  it('uses the given count, cycle and base swings', () => {
    const u = createPendulumClock({ pendulums: 12, cycle: 30, baseSwings: 10 })(CTX)
    expect(u).toMatchObject({ uPendulums: 12, uCycle: 30, uBaseSwings: 10 })
  })

  it('wraps the phase to the custom cycle', () => {
    const clock = createPendulumClock({ cycle: 2 })
    let u
    for (let i = 0; i < 25; i++) u = clock({ ...CTX, dt: 0.1 })
    expect(u.uPhaseT).toBeGreaterThanOrEqual(0)
    expect(u.uPhaseT).toBeLessThan(2)
    expect(u.uPhaseT).toBeCloseTo(0.5, 6)
  })

  it('falls back to the default cycle for invalid values', () => {
    for (const cycle of [0, -5, NaN]) {
      expect(createPendulumClock({ cycle })(CTX).uCycle).toBe(PENDULUM_CYCLE)
    }
  })
})

describe('pendulum variants', () => {
  it('are registered and listed in the GPU catalog', () => {
    const gpu = Object.values(VISUALIZER_CATEGORIES).flat()
    for (const spec of VARIANTS) {
      expect(glPresetSpecs[spec.id]).toBe(spec)
      expect(gpu).toContain(spec.id)
    }
  })

  it('have distinct ids and German/English names', () => {
    const all = [glPendulumWave, ...VARIANTS]
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length)
    expect(new Set(all.map((s) => s.name_de)).size).toBe(all.length)
    expect(new Set(all.map((s) => s.name_en)).size).toBe(all.length)
  })

  it('each get their own clock, so one preset never advances another', () => {
    glPendulumSnake.uniforms({ ...CTX, dt: 0.1 })
    glPendulumSnake.uniforms({ ...CTX, dt: 0.1 })
    const snake = glPendulumSnake.uniforms({ ...CTX, dt: 0.1 }).uPhaseT
    const field = glPendulumField.uniforms({ ...CTX, dt: 0.1 }).uPhaseT
    expect(snake).toBeGreaterThan(field)
  })

  it('declare every uniform their clock provides and stay within the shader limits', () => {
    const limits = { glPendulumSnake: 48, glPendulumCircle: 48, glPendulumField: 32 }
    for (const spec of VARIANTS) {
      const u = spec.uniforms(CTX)
      for (const name of Object.keys(u)) expect(spec.frag, `${spec.id}: ${name}`).toContain(name)
      expect(u.uPendulums).toBeLessThanOrEqual(limits[spec.id])
      // ganzzahlige Schwingungszahlen → alle Pendel treffen sich am Zyklusende
      expect(Number.isInteger(u.uBaseSwings)).toBe(true)
    }
  })
})
