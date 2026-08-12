import { describe, it, expect, beforeEach } from 'vitest'
import { OnsetDetector, DEFAULT_CONFIG } from '../../lib/audio/OnsetDetector.js'

/** Runs `frames` of a constant band value and returns the last onset object. */
function run(detector, band, value, frames) {
  let out
  for (let i = 0; i < frames; i++) {
    out = detector.detect({ [band]: value })
  }
  return out
}

describe('OnsetDetector', () => {
  let det
  beforeEach(() => {
    det = new OnsetDetector()
  })

  it('fires on a fresh transient (reacts to change)', () => {
    // Prime with silence, then a single loud bass frame.
    run(det, 'bass', 0, 30)
    const { bass } = det.detect({ bass: 255 })
    expect(bass).toBeGreaterThan(0.6)
  })

  it('stops reacting to sustained loudness (no freeze on a wall of sound)', () => {
    // The very first loud frame is an onset; after the slow baseline catches
    // up, a constant level produces (near) zero onset instead of pinning high.
    const first = det.detect({ bass: 255 })
    expect(first.bass).toBeGreaterThan(0.6)

    const settled = run(det, 'bass', 255, 400)
    expect(settled.bass).toBeLessThan(0.15)
  })

  it('is self-normalizing: quiet and loud hits pulse to a similar range', () => {
    const quiet = new OnsetDetector()
    const loud = new OnsetDetector()

    // Establish each track's own baseline, then hit above it.
    run(quiet, 'bass', 25, 60) // ~10% baseline
    run(loud, 'bass', 120, 60) // ~47% baseline

    const quietHit = quiet.detect({ bass: 70 }).bass // +45 over 25
    const loudHit = loud.detect({ bass: 210 }).bass // +90 over 120

    // Both produce a strong pulse despite very different absolute loudness,
    // and neither dwarfs the other (auto-gain equalizes them).
    expect(quietHit).toBeGreaterThan(0.4)
    expect(loudHit).toBeGreaterThan(0.4)
    expect(Math.abs(quietHit - loudHit)).toBeLessThan(0.4)
  })

  it('gates out near-silence (no phantom motion)', () => {
    // Value below the absolute noise floor → onset forced to 0.
    const belowFloor = Math.floor(DEFAULT_CONFIG.noiseFloor * 255 * 0.5)
    const out = run(det, 'bass', belowFloor, 50)
    expect(out.bass).toBe(0)
  })

  it('computes the "all" band from volume', () => {
    run(det, 'volume', 0, 30)
    const { all } = det.detect({ volume: 255 })
    expect(all).toBeGreaterThan(0.6)
  })

  it('keeps bands independent', () => {
    run(det, 'bass', 0, 30)
    const out = det.detect({ bass: 255, mid: 0, treble: 0, volume: 0 })
    expect(out.bass).toBeGreaterThan(0.6)
    expect(out.mid).toBe(0)
    expect(out.treble).toBe(0)
  })

  it('reset() clears state so a later steady level is not treated as a hit', () => {
    run(det, 'bass', 255, 10)
    det.reset()
    // After reset the first frame seeds envelopes from 0, but a mid-level
    // steady tone quickly settles; onset should not stay pinned.
    const settled = run(det, 'bass', 128, 400)
    expect(settled.bass).toBeLessThan(0.15)
  })

  it('clamps output to 0–1', () => {
    for (let i = 0; i < 200; i++) {
      const out = det.detect({ bass: i % 2 ? 255 : 0 })
      expect(out.bass).toBeGreaterThanOrEqual(0)
      expect(out.bass).toBeLessThanOrEqual(1)
    }
  })
})
