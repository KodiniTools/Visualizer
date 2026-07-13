import { describe, it, expect } from 'vitest'
import { postFxActive } from '../../lib/postfx/index.js'

describe('postFxActive', () => {
  it('is false for empty / missing config', () => {
    expect(postFxActive(null)).toBe(false)
    expect(postFxActive(undefined)).toBe(false)
    expect(postFxActive({})).toBe(false)
  })

  it('is true when bloom is enabled with positive strength', () => {
    expect(postFxActive({ bloom: { enabled: true, strength: 0.5 } })).toBe(true)
  })

  it('is false when bloom is enabled but strength is zero', () => {
    expect(postFxActive({ bloom: { enabled: true, strength: 0 } })).toBe(false)
  })

  it('is false when bloom has strength but is disabled', () => {
    expect(postFxActive({ bloom: { enabled: false, strength: 1 } })).toBe(false)
  })

  it('is true when trails are enabled regardless of bloom', () => {
    expect(postFxActive({ trails: { enabled: true } })).toBe(true)
    expect(postFxActive({ bloom: { enabled: false }, trails: { enabled: true } })).toBe(true)
  })

  it('is false when trails are explicitly disabled and no bloom', () => {
    expect(postFxActive({ trails: { enabled: false } })).toBe(false)
  })
})
