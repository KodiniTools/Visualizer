// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { BackgroundRenderer } from '../../lib/canvasManager/rendering/BackgroundRenderer'
import { stub } from '../helpers/canvasStubs'

function fakeCtx() {
  const calls: unknown[] = []
  const ctx = {
    canvas: { width: 200, height: 100 },
    filter: 'none',
    globalAlpha: 1,
    fillStyle: '',
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    fillRect: (...a: unknown[]) => calls.push(['fillRect', ...a]),
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    transform: () => {},
    strokeRect: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    beginPath: () => {},
    rect: () => {},
    clip: () => {},
    drawImage: () => {},
    calls,
  }
  return stub<CanvasRenderingContext2D & { calls: unknown[] }>(ctx)
}

describe('BackgroundRenderer', () => {
  it('exposes the public drawing API', () => {
    const r = new BackgroundRenderer(stub({}))
    for (const m of ['drawBackground', 'drawBackgroundTiles', 'getTileAtPosition']) {
      expect(typeof r[m as keyof BackgroundRenderer]).toBe('function')
    }
  })

  it('draws a plain color background and the full canvas when no audio effects are active', () => {
    const manager = {
      background: '#123456',
      backgroundColorSettings: null,
      gradientSettings: { enabled: false },
      backgroundTilesStore: null,
      _getAudioReactiveValues: () => null,
      _applyAudioReactiveFilters: () => {},
    }
    const r = new BackgroundRenderer(stub(manager))
    const ctx = fakeCtx()
    r.drawBackground(ctx)
    const fill = ctx.calls.find((c) => Array.isArray(c) && c[0] === 'fillRect')
    expect(fill).toEqual(['fillRect', 0, 0, 200, 100])
    expect(ctx.fillStyle).toBe('#123456')
  })

  it('fills an enlarged area when a geometric audio effect transforms the background', () => {
    const manager = {
      background: '#ffffff',
      backgroundColorSettings: { enabled: true },
      gradientSettings: { enabled: false },
      backgroundTilesStore: null,
      _getAudioReactiveValues: () => ({ hasEffects: true, effects: { scale: { scale: 1.3 } } }),
      _applyAudioReactiveFilters: () => {},
    }
    const r = new BackgroundRenderer(stub(manager))
    const ctx = fakeCtx()
    r.drawBackground(ctx)
    const fill = ctx.calls.find((c) => Array.isArray(c) && c[0] === 'fillRect')
    expect(fill).toEqual(['fillRect', -200, -100, 600, 300])
  })
})
