import { describe, it, expect, beforeEach } from 'vitest'
import { AudioFxRenderer } from '../../lib/canvasManager/rendering/AudioFxRenderer.js'

/**
 * Tests for the four beat/BPM/frequency-driven global Audio-FX effects:
 * Zoom-Punch, Vignette-Puls, BPM-Lock-Puls and Frequenz-Split.
 */

// Minimal canvas-2d stub that records the calls we assert on.
function makeCtx(w = 100, h = 100) {
  const calls = []
  const ctx = {
    canvas: { width: w, height: h },
    filter: 'none',
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    fillStyle: '',
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    translate: (x, y) => calls.push(['translate', x, y]),
    scale: (x, y) => calls.push(['scale', x, y]),
    drawImage: (...a) => calls.push(['drawImage', ...a]),
    fillRect: (...a) => calls.push(['fillRect', ...a]),
    createRadialGradient: (...a) => {
      calls.push(['createRadialGradient', ...a])
      return { addColorStop: (...s) => calls.push(['addColorStop', ...s]) }
    },
  }
  return { ctx, calls }
}

const scaleCalls = (calls) => calls.filter((c) => c[0] === 'scale')
const has = (calls, name) => calls.some((c) => c[0] === name)

describe('AudioFxRenderer – rhythm & frequency effects', () => {
  let r
  beforeEach(() => {
    r = new AudioFxRenderer()
  })

  it('does nothing when the master switch is off', () => {
    const { ctx, calls } = makeCtx()
    r.render(ctx, 100, 100, { isBeat: true, beatIntensity: 1 }, { enabled: false })
    expect(calls.length).toBe(0)
  })

  it('Zoom-Punch scales up on a detected beat', () => {
    const { ctx, calls } = makeCtx()
    r.render(
      ctx,
      100,
      100,
      { isBeat: true, beatIntensity: 1 },
      { enabled: true, zoomPunchEnabled: true, zoomPunchStrength: 100 },
    )
    const s = scaleCalls(calls)
    expect(s.length).toBe(1)
    // 1 + 1 * (100/100) * 0.18
    expect(s[0][1]).toBeCloseTo(1.18, 3)
  })

  it('Zoom-Punch stays at rest (no scale pass) without a beat', () => {
    const { ctx, calls } = makeCtx()
    r.render(
      ctx,
      100,
      100,
      { isBeat: false, beatIntensity: 0 },
      { enabled: true, zoomPunchEnabled: true, zoomPunchStrength: 100 },
    )
    expect(scaleCalls(calls).length).toBe(0)
  })

  it('Vignette-Puls draws a radial gradient on a beat', () => {
    const { ctx, calls } = makeCtx()
    r.render(
      ctx,
      100,
      100,
      { isBeat: true, beatIntensity: 1 },
      { enabled: true, vignettePulseEnabled: true, vignettePulseIntensity: 100 },
    )
    expect(has(calls, 'createRadialGradient')).toBe(true)
    expect(has(calls, 'fillRect')).toBe(true)
  })

  it('Frequenz-Split zooms on bass and shifts hue on treble', () => {
    const { ctx, calls } = makeCtx()
    r.render(
      ctx,
      100,
      100,
      { smoothBass: 255, smoothTreble: 255 },
      { enabled: true, freqSplitEnabled: true, freqSplitStrength: 100 },
    )
    const s = scaleCalls(calls)
    expect(s.length).toBe(1)
    expect(s[0][1]).toBeCloseTo(1.12, 3) // 1 + 1 * 1 * 0.12
    // Treble drives a hue-rotate copy pass (a drawImage of the canvas)
    expect(has(calls, 'drawImage')).toBe(true)
  })

  it('BPM-Lock pulse peaks on the beat and dips between beats', () => {
    // Downbeat: phase resets to 0 → envelope at maximum.
    const onBeat = r._updateBpmPulse({ bpm: 120, isBeat: true }, 0)
    expect(onBeat).toBeCloseTo(1, 5)
    // Half a beat later (120 BPM → 500 ms/beat, so +250 ms), no beat → trough.
    const offBeat = r._updateBpmPulse({ bpm: 120, isBeat: false }, 250)
    expect(offBeat).toBeCloseTo(0, 5)
  })

  it('beat envelope decays between beats', () => {
    const first = r._updateBeatEnv({ isBeat: true, beatIntensity: 1 }, 0)
    expect(first).toBeCloseTo(1, 5)
    const later = r._updateBeatEnv({ isBeat: false }, 150) // one time-constant
    expect(later).toBeLessThan(0.5)
    expect(later).toBeGreaterThan(0)
  })
})
