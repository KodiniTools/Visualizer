import { describe, it, expect } from 'vitest'
import { shouldRunPostFx, MIN_QUALITY_FOR_POSTFX } from '../../lib/postfx/index.js'

const bloomConfig = { bloom: { enabled: true, strength: 0.5 } }

describe('shouldRunPostFx', () => {
  it('is false when the config requests no effect, regardless of quality', () => {
    expect(shouldRunPostFx({}, 1)).toBe(false)
    expect(shouldRunPostFx(null, 1)).toBe(false)
  })

  it('is true at full quality when an effect is requested', () => {
    expect(shouldRunPostFx(bloomConfig, 1)).toBe(true)
  })

  it('is true above the worst adaptive-quality step', () => {
    expect(shouldRunPostFx(bloomConfig, 0.85)).toBe(true)
    expect(shouldRunPostFx(bloomConfig, 0.7)).toBe(true)
  })

  it('is false once quality has dropped to the worst adaptive-quality step', () => {
    expect(shouldRunPostFx(bloomConfig, 0.55)).toBe(false)
    expect(shouldRunPostFx(bloomConfig, 0.1)).toBe(false)
  })

  it('defaults quality to 1 (post-processing runs) when omitted', () => {
    expect(shouldRunPostFx(bloomConfig)).toBe(true)
  })

  it('MIN_QUALITY_FOR_POSTFX sits just above the lowest QUALITY_STEPS entry', () => {
    expect(MIN_QUALITY_FOR_POSTFX).toBeGreaterThan(0.55)
    expect(MIN_QUALITY_FOR_POSTFX).toBeLessThan(0.7)
  })
})
