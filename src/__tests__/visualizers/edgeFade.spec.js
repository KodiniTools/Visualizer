// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  EDGE_FADE,
  drawScaledVisualizer,
  edgeFadeStrength,
  scaledDestRect,
  setEdgeFadeCanvasFactory,
} from '../../lib/visualizers/core/edgeFade.js'

/** Context-Stub, der alle Aufrufe protokolliert (jsdom hat keinen 2D-Context). */
function recordingCtx(calls = []) {
  const gradient = { addColorStop: (...a) => calls.push(['addColorStop', ...a]) }
  return new Proxy(
    { calls, globalCompositeOperation: 'source-over', fillStyle: null },
    {
      get: (t, prop) => {
        if (prop in t) return t[prop]
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient')
          return (...a) => (calls.push([prop, ...a]), gradient)
        return (...a) => calls.push([prop, ...a])
      },
      set: (t, prop, v) => ((t[prop] = v), calls.push(['set:' + String(prop), v]), true),
    },
  )
}

/** Canvas-Fabrik für Tests: liefert einen Stub mit protokollierendem Context. */
function fakeCanvasFactory() {
  const created = []
  const factory = (width, height) => {
    const ctx = recordingCtx()
    const canvas = { width, height, getContext: () => ctx, ctx }
    created.push(canvas)
    return canvas
  }
  factory.created = created
  return factory
}

const SOURCE = { width: 800, height: 450, tag: 'source' }

describe('edgeFadeStrength', () => {
  it('ist bei 100 % und mittiger Position 0 – unverändertes Verhalten', () => {
    expect(edgeFadeStrength(1, 0.5, 0.5)).toBe(0)
    expect(edgeFadeStrength(1.5, 0.5, 0.5)).toBe(0) // vergrößert: Rand liegt außerhalb
  })

  it('wächst beim Verkleinern bis 85 % auf 1', () => {
    expect(edgeFadeStrength(0.925, 0.5, 0.5)).toBeCloseTo(0.5, 10)
    expect(edgeFadeStrength(0.85, 0.5, 0.5)).toBe(1)
    expect(edgeFadeStrength(0.44, 0.5, 0.5)).toBe(1)
  })

  it('wächst beim Verschieben auch bei 100 %', () => {
    expect(edgeFadeStrength(1, 0.5375, 0.5)).toBeCloseTo(0.5, 10)
    expect(edgeFadeStrength(1, 0.5, 0.425)).toBe(1)
  })

  it('nimmt das Maximum aus Größe und Versatz', () => {
    expect(edgeFadeStrength(0.925, 0.575, 0.5)).toBeCloseTo(1, 10)
  })
})

describe('scaledDestRect', () => {
  it('zentriert das skalierte Bitmap an der Position', () => {
    expect(scaledDestRect(800, 450, 800, 450, { scale: 0.5, posX: 0.5, posY: 0.5 })).toEqual({
      x: 200,
      y: 112.5,
      w: 400,
      h: 225,
    })
    expect(scaledDestRect(800, 450, 800, 450, { scale: 1, posX: 0.25, posY: 0.5 })).toEqual({
      x: -200,
      y: 0,
      w: 800,
      h: 450,
    })
  })
})

describe('drawScaledVisualizer', () => {
  let factory
  beforeEach(() => {
    factory = fakeCanvasFactory()
    setEdgeFadeCanvasFactory(factory)
  })
  afterEach(() => setEdgeFadeCanvasFactory(null))

  it('zeichnet bei 100 % mittig direkt und ohne Maske (schneller Pfad)', () => {
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, SOURCE, 800, 450, 800, 450, { scale: 1, posX: 0.5, posY: 0.5 })
    expect(ctx.calls).toEqual([['drawImage', SOURCE, 0, 0]])
    expect(factory.created).toHaveLength(0)

    const ctx2 = recordingCtx()
    drawScaledVisualizer(ctx2, SOURCE, 800, 450, 1600, 900, { scale: 1, posX: 0.5, posY: 0.5 })
    expect(ctx2.calls).toEqual([['drawImage', SOURCE, 0, 0, 1600, 900]])
  })

  it('skaliert ohne Maske, wenn edgeFade "none" oder nicht gesetzt ist', () => {
    for (const edgeFade of [undefined, EDGE_FADE.NONE]) {
      const ctx = recordingCtx()
      drawScaledVisualizer(ctx, SOURCE, 800, 450, 800, 450, {
        scale: 0.5,
        posX: 0.5,
        posY: 0.5,
        edgeFade,
      })
      expect(ctx.calls).toEqual([['drawImage', SOURCE, 0, 0, 800, 450, 200, 112.5, 400, 225]])
    }
    expect(factory.created).toHaveLength(0)
  })

  it('zieht bei "radial" eine Ellipsenmaske über einen Zwischen-Canvas', () => {
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, SOURCE, 800, 450, 800, 450, {
      scale: 0.5,
      posX: 0.5,
      posY: 0.5,
      edgeFade: EDGE_FADE.RADIAL,
    })

    expect(factory.created).toHaveLength(1)
    const mask = factory.created[0]
    expect([mask.width, mask.height]).toEqual([800, 450])
    const namen = mask.ctx.calls.map((c) => c[0])
    expect(namen).toContain('drawImage')
    expect(namen).toContain('createRadialGradient')
    expect(mask.ctx.calls).toContainEqual(['set:globalCompositeOperation', 'destination-in'])

    // Auf das Ziel kommt der maskierte Canvas, nicht die Quelle
    const ziel = ctx.calls.find((c) => c[0] === 'drawImage')
    expect(ziel[1]).toBe(mask)
    expect(ziel.slice(2)).toEqual([0, 0, 800, 450, 200, 112.5, 400, 225])
  })

  it('zieht bei "rect" zwei lineare Verläufe (horizontal und vertikal)', () => {
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, SOURCE, 800, 450, 800, 450, {
      scale: 0.65,
      posX: 0.5,
      posY: 0.5,
      edgeFade: EDGE_FADE.RECT,
    })

    const mask = factory.created[0]
    const gradients = mask.ctx.calls.filter((c) => c[0] === 'createLinearGradient')
    expect(gradients).toEqual([
      ['createLinearGradient', 0, 0, 800, 0],
      ['createLinearGradient', 0, 0, 0, 450],
    ])
  })

  it('lässt die Maske weg, solange 100 % und mittig – auch mit edgeFade', () => {
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, SOURCE, 800, 450, 800, 450, {
      scale: 1,
      posX: 0.5,
      posY: 0.5,
      edgeFade: EDGE_FADE.RADIAL,
    })
    expect(factory.created).toHaveLength(0)
    expect(ctx.calls).toEqual([['drawImage', SOURCE, 0, 0]])
  })

  it('maskiert bei Versatz auch ohne Verkleinerung', () => {
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, SOURCE, 800, 450, 800, 450, {
      scale: 1,
      posX: 0.3,
      posY: 0.5,
      edgeFade: EDGE_FADE.RECT,
    })
    expect(factory.created).toHaveLength(1)
  })

  it('verwendet den Zwischen-Canvas bei gleicher Größe wieder', () => {
    const view = { scale: 0.5, posX: 0.5, posY: 0.5, edgeFade: EDGE_FADE.RADIAL }
    drawScaledVisualizer(recordingCtx(), SOURCE, 800, 450, 800, 450, view)
    drawScaledVisualizer(recordingCtx(), SOURCE, 800, 450, 800, 450, view)
    expect(factory.created).toHaveLength(1)
    drawScaledVisualizer(recordingCtx(), SOURCE, 400, 225, 800, 450, view)
    expect(factory.created).toHaveLength(2)
  })

  it('zeichnet ohne 2D-Context (z. B. jsdom) die Quelle direkt statt zu werfen', () => {
    setEdgeFadeCanvasFactory((w, h) => ({ width: w, height: h, getContext: () => null }))
    const ctx = recordingCtx()
    expect(() =>
      drawScaledVisualizer(ctx, SOURCE, 800, 450, 800, 450, {
        scale: 0.5,
        posX: 0.5,
        posY: 0.5,
        edgeFade: EDGE_FADE.RADIAL,
      }),
    ).not.toThrow()
    expect(ctx.calls[0][1]).toBe(SOURCE)
  })
})
