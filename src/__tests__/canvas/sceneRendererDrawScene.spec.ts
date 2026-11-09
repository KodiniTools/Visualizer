// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { SceneRenderer } from '../../lib/canvasManager/rendering/SceneRenderer'
import { stub, type Call } from '../helpers/canvasStubs'

// Texte zeichnet die Render-Schleife (renderLoop/sceneRenderer) mit Canvas-
// Maßen. drawScene() darf sie nicht zusätzlich zeichnen: Früher geschah das
// ohne Maße (Positionen NaN, nichts sichtbar), die Audio-Hüllkurve lief aber
// pro Frame doppelt.
function setup() {
  const calls: Call[] = []
  const ctx = stub<CanvasRenderingContext2D>({
    canvas: { width: 400, height: 200 },
    clearRect: (...a: unknown[]) => calls.push(['clearRect', ...a]),
  })
  const manager = {
    ctx: {},
    backgroundRenderer: {
      drawBackground: (c: unknown) => calls.push(['drawBackground', c === ctx]),
    },
    uiRenderer: {
      drawInteractiveElements: () => {},
      drawTextSelectionRect: () => {},
      drawImageSelectionRect: () => {},
    },
    textManager: { textObjects: [], draw: vi.fn() },
    getWorkspaceBounds: () => null,
  }
  return { renderer: new SceneRenderer(stub(manager)), manager, ctx, calls }
}

describe('SceneRenderer.drawScene', () => {
  it('leert das Canvas und zeichnet den Hintergrund', () => {
    const { renderer, ctx, calls } = setup()
    renderer.drawScene(ctx)
    expect(calls).toEqual([
      ['clearRect', 0, 0, 400, 200],
      ['drawBackground', true],
    ])
  })

  it('zeichnet keine Texte (macht die Render-Schleife mit Canvas-Maßen)', () => {
    const { renderer, manager, ctx } = setup()
    renderer.drawScene(ctx)
    renderer.draw(ctx)
    expect(manager.textManager.draw).not.toHaveBeenCalled()
  })
})
