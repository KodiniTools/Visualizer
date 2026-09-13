import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createGlVisualizer,
  getSharedEngine,
  resetSharedEngine,
} from '../../../lib/visualizers/gl/createGlVisualizer.js'
import { hexToRgb01 } from '../../../lib/visualizers/gl/GLVisualizerEngine.js'

// Node test environment: no OffscreenCanvas, no document → WebGL2 unavailable.
// This is exactly the situation the adapter must survive via the fallback.

function fakeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
  }
}

describe('gl/createGlVisualizer (no WebGL2 available)', () => {
  let infoSpy
  beforeEach(() => {
    resetSharedEngine()
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    resetSharedEngine()
    infoSpy.mockRestore()
  })

  it('rejects specs without id or shader', () => {
    expect(() => createGlVisualizer({})).toThrow()
    expect(() => createGlVisualizer({ id: 'x' })).toThrow()
  })

  it('exposes the registry contract', () => {
    const viz = createGlVisualizer({
      id: 'demo',
      name_de: 'Demo',
      name_en: 'Demo',
      frag: 'void main(){ fragColor = vec4(0.0); }',
    })
    expect(viz.kind).toBe('gl')
    expect(viz.name_de).toBe('Demo')
    expect(typeof viz.draw).toBe('function')
    expect(typeof viz.init).toBe('function')
    expect(typeof viz.cleanup).toBe('function')
  })

  it('returns null from getSharedEngine and remembers the failure', () => {
    expect(getSharedEngine()).toBeNull()
    expect(getSharedEngine()).toBeNull()
    expect(infoSpy).toHaveBeenCalledTimes(1)
  })

  it('draws the Canvas2D fallback when WebGL2 is unavailable', () => {
    const fallback = { init: vi.fn(), cleanup: vi.fn(), draw: vi.fn() }
    const viz = createGlVisualizer({
      id: 'demo',
      name_de: 'Demo',
      name_en: 'Demo',
      frag: 'void main(){ fragColor = vec4(0.0); }',
      fallback,
    })
    const ctx = fakeCtx()
    const data = new Uint8Array(1024)
    viz.init(640, 360)
    viz.draw(ctx, data, 1024, 640, 360, '#ff8800', 0.7)
    viz.draw(ctx, data, 1024, 640, 360, '#ff8800', 0.7)

    expect(fallback.init).toHaveBeenCalledTimes(1)
    expect(fallback.init).toHaveBeenCalledWith(640, 360)
    expect(fallback.draw).toHaveBeenCalledTimes(2)
    expect(fallback.draw).toHaveBeenLastCalledWith(ctx, data, 1024, 640, 360, '#ff8800', 0.7)
    // Nothing was blitted, because no engine canvas exists.
    expect(ctx.drawImage).not.toHaveBeenCalled()

    viz.cleanup()
    expect(fallback.cleanup).toHaveBeenCalledTimes(1)
  })

  it('forwards needsTimeData so the render loop hands over waveform data', () => {
    const spectrumViz = createGlVisualizer({
      id: 'a',
      name_de: 'A',
      name_en: 'A',
      frag: 'void main(){}',
    })
    const timeViz = createGlVisualizer({
      id: 'b',
      name_de: 'B',
      name_en: 'B',
      frag: 'void main(){}',
      needsTimeData: true,
    })
    expect(spectrumViz.needsTimeData).toBe(false)
    expect(timeViz.needsTimeData).toBe(true)
  })

  it('does not throw without a fallback', () => {
    const viz = createGlVisualizer({
      id: 'demo',
      name_de: 'Demo',
      name_en: 'Demo',
      frag: 'void main(){ fragColor = vec4(0.0); }',
    })
    expect(() => viz.draw(fakeCtx(), new Uint8Array(8), 8, 10, 10, '#fff', 1)).not.toThrow()
  })
})

describe('gl/hexToRgb01', () => {
  it('parses #rgb and #rrggbb', () => {
    expect(hexToRgb01('#fff')).toEqual([1, 1, 1])
    expect(hexToRgb01('#000000')).toEqual([0, 0, 0])
    const [r, g, b] = hexToRgb01('#ff8000')
    expect(r).toBe(1)
    expect(g).toBeCloseTo(128 / 255, 5)
    expect(b).toBe(0)
  })

  it('falls back to a visible default for invalid input', () => {
    expect(hexToRgb01('nope')).toEqual([0.43, 0.66, 1.0])
    expect(hexToRgb01(undefined)).toEqual([0.43, 0.66, 1.0])
    expect(hexToRgb01('#zzzzzz')).toEqual([0.43, 0.66, 1.0])
  })
})
