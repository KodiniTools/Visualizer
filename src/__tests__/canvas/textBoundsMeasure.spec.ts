import { describe, it, expect, vi } from 'vitest'
import { TextManager } from '../../lib/textManager'
import { measureTextBlock } from '../../lib/textManager/geometry/textBounds'
import { ContentMethods } from '../../lib/canvasManager/methods/contentMethods'
import { DragDropHandler } from '../../lib/canvasManager/interaction/DragDropHandler'
import type { CanvasManager } from '../../lib/canvasManager'
import { stub } from '../helpers/canvasStubs'

type FakeCanvas = HTMLCanvasElement & { _ctx: CanvasRenderingContext2D }
type FakeManager = CanvasManager & { canvas: FakeCanvas }

/**
 * Größe neuer Texte (relWidth/relHeight) wird aus `content` gemessen –
 * nicht mehr aus dem Altfeld `text` (das immer undefined war und dadurch
 * das Wort "undefined" vermaß). Grundlage für das Skalieren über die Griffe.
 */

/** Canvas-Stub: measureText liefert 10px pro Zeichen (deterministisch). */
function makeCanvas(width = 800, height = 600) {
  const ctx = {
    font: '',
    letterSpacing: '0px',
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn((text: unknown) => ({ width: String(text).length * 10 })),
  }
  return stub<FakeCanvas>({ width, height, getContext: () => ctx, _ctx: ctx })
}

function makeManager(canvas = makeCanvas()) {
  const manager: FakeManager = stub({
    canvas,
    textManager: new TextManager({}),
    activeObject: null,
    setActiveObject: vi.fn((obj: CanvasManager['activeObject']) => {
      manager.activeObject = obj
    }),
    redrawCallback: vi.fn(),
    calculateTextBounds: ContentMethods.prototype.calculateTextBounds,
  })
  return manager
}

const addText = (manager: FakeManager, text: string, options: object) =>
  ContentMethods.prototype.addText.call(manager, text, options)

describe('calculateTextBounds beim Anlegen', () => {
  it('misst den Inhalt statt "undefined"', () => {
    const m = makeManager()
    const obj = addText(m, 'Hi', { fontSize: 48 })

    expect(m.canvas._ctx.measureText).toHaveBeenCalledWith('Hi')
    expect(m.canvas._ctx.measureText).not.toHaveBeenCalledWith(undefined)
    expect(obj!.relWidth).toBeCloseTo(20 / 800)
    expect(obj!.relHeight).toBeCloseTo((48 * 1.2) / 600)
  })

  it('nimmt bei mehrzeiligem Text die breiteste Zeile und alle Zeilen für die Höhe', () => {
    const m = makeManager()
    const obj = addText(m, 'abc\nabcdef\nab', { fontSize: 40 })

    expect(obj!.relWidth).toBeCloseTo(60 / 800)
    expect(obj!.relHeight).toBeCloseTo((3 * 40 * 1.2) / 600)
  })

  it('berücksichtigt letterSpacing und lineHeightMultiplier', () => {
    const m = makeManager()
    const obj = addText(m, 'abcd', {
      fontSize: 50,
      letterSpacing: 5,
      lineHeightMultiplier: 150,
    })

    // 4 Zeichen × 10px + 3 Zwischenräume × 5px
    expect(obj!.relWidth).toBeCloseTo(55 / 800)
    expect(obj!.relHeight).toBeCloseTo(75 / 600)
  })

  it('rechnet Schriftgrößen ≤ 1 relativ zur Canvas-Höhe', () => {
    const m = makeManager()
    const obj = m.textManager!.add('x', {})
    obj.fontSize = 0.1
    m.calculateTextBounds(obj)

    expect(m.canvas._ctx.font).toContain('60px')
    expect(stub<{ relHeight: number }>(obj).relHeight).toBeCloseTo((60 * 1.2) / 600)
  })

  it('misst neu, wenn sich Inhalt oder letterSpacing über das Panel ändern', () => {
    const m = makeManager()
    const obj = addText(m, 'ab', { fontSize: 48 })
    const update = (prop: string, value: unknown) =>
      ContentMethods.prototype.updateActiveObjectProperty.call(m, prop, value)

    update('content', 'abcdefgh')
    expect(obj!.relWidth).toBeCloseTo(80 / 800)

    update('letterSpacing', 2)
    expect(obj!.relWidth).toBeCloseTo((80 + 7 * 2) / 800)
  })
})

describe('measureTextBlock', () => {
  it('setzt ctx.letterSpacing für die Messung auf 0 (kein Doppelzählen)', () => {
    const ctx = makeCanvas()._ctx
    ctx.letterSpacing = '9px'
    measureTextBlock(ctx, stub({ content: 'ab', letterSpacing: 4 }), 20)
    expect(ctx.letterSpacing).toBe('0px')
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('liefert für leeren Inhalt Breite 0 und eine Zeilenhöhe', () => {
    const ctx = makeCanvas()._ctx
    expect(measureTextBlock(ctx, stub({ content: '' }), 20)).toEqual({ width: 0, height: 24 })
  })
})

describe('resizeText mit gemessener Größe', () => {
  function makeResizeManager(action: string) {
    return stub<ConstructorParameters<typeof DragDropHandler>[0]>({
      canvas: { width: 800, height: 600 },
      currentAction: action,
      selectionManager: { HANDLE_SIZE: 10 },
    })
  }

  it('skaliert die Schriftgröße im Verhältnis zur echten Textbreite', () => {
    const m = makeManager()
    const obj = addText(m, 'Hallo', { fontSize: 40 }) // 50px breit
    const handler = new DragDropHandler(makeResizeManager('resize-r'))

    handler.resizeText(stub(obj!), 50, 0) // Griff 50px nach rechts → doppelte Breite

    expect(obj!.fontSize).toBeCloseTo(80)
    expect(obj!.relWidth).toBeCloseTo(100 / 800)
  })

  it('bricht bei Breite 0 ab, statt NaN zu schreiben', () => {
    const obj = { type: 'text', relX: 0.5, relY: 0.5, relWidth: 0, relHeight: 0.1, fontSize: 40 }
    const handler = new DragDropHandler(makeResizeManager('resize-r'))

    handler.resizeText(stub(obj), 30, 0)

    expect(obj.fontSize).toBe(40)
    expect(obj.relWidth).toBe(0)
  })
})
