import { describe, it, expect } from 'vitest'
import { FrameMonitor, QUALITY_STEPS } from '../../lib/postfx/FrameMonitor.js'

/** Feed n frames of the given duration. */
function feed(monitor, ms, n) {
  for (let i = 0; i < n; i++) monitor.pushFrameTime(ms)
}

describe('FrameMonitor', () => {
  it('starts at full quality', () => {
    const m = new FrameMonitor()
    expect(m.qualityLevel).toBe(1.0)
    expect(QUALITY_STEPS[0]).toBe(1.0)
  })

  it('does not change quality before a full sample window', () => {
    const m = new FrameMonitor({ sampleSize: 45 })
    feed(m, 100, 44) // way over budget but not enough samples yet
    expect(m.qualityLevel).toBe(1.0)
  })

  it('steps quality down when frames run over budget', () => {
    const m = new FrameMonitor({ sampleSize: 30, downgradeMargin: 1.25 })
    // 33ms/frame @ 60fps budget (16.6ms) is well over budget → downgrade
    feed(m, 33, 30)
    expect(m.qualityLevel).toBeLessThan(1.0)
  })

  it('keeps full quality when comfortably within budget', () => {
    const m = new FrameMonitor({ sampleSize: 30 })
    feed(m, 10, 200) // 100fps → always fine
    expect(m.qualityLevel).toBe(1.0)
  })

  it('recovers quality after a sustained calm period', () => {
    const m = new FrameMonitor({ sampleSize: 30, upgradeCooldown: 60 })
    // Drive it down first.
    feed(m, 40, 60)
    const degraded = m.qualityLevel
    expect(degraded).toBeLessThan(1.0)
    // Then run calm for a long time → should step back up.
    feed(m, 8, 400)
    expect(m.qualityLevel).toBeGreaterThan(degraded)
  })

  it('never drops below the lowest defined step', () => {
    const m = new FrameMonitor({ sampleSize: 20 })
    feed(m, 500, 2000) // catastrophic frame times for a long time
    expect(m.qualityLevel).toBe(QUALITY_STEPS[QUALITY_STEPS.length - 1])
    expect(m.qualityLevel).toBeGreaterThan(0)
  })

  it('exposes a rolling average frame time', () => {
    const m = new FrameMonitor({ sampleSize: 10 })
    feed(m, 20, 10)
    expect(m.averageFrameMs).toBeCloseTo(20, 5)
  })

  it('tick() seeds the clock and ignores the first delta', () => {
    const m = new FrameMonitor({ sampleSize: 5 })
    m.tick(1000) // seed only
    expect(m.averageFrameMs).toBe(0)
    m.tick(1016)
    expect(m.averageFrameMs).toBeCloseTo(16, 5)
  })

  it('tick() ignores absurd deltas (backgrounded tab / debugger pause)', () => {
    const m = new FrameMonitor({ sampleSize: 5 })
    m.tick(0)
    m.tick(5000) // 5s gap → ignored
    expect(m.averageFrameMs).toBe(0)
  })

  it('reset() returns to the initial state', () => {
    const m = new FrameMonitor({ sampleSize: 20 })
    feed(m, 50, 100)
    m.reset()
    expect(m.qualityLevel).toBe(1.0)
    expect(m.averageFrameMs).toBe(0)
  })
})
