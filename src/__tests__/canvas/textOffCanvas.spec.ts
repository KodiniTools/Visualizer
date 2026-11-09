import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TextManager } from '../../lib/textManager'
import { DeletionMethods } from '../../lib/canvasManager/methods/deletionMethods'
import { createTextsSegment } from '../../lib/history/segments/canvasSegments'
import { stub } from '../helpers/canvasStubs'
import type { Mock } from 'vitest'

/** Ausschnitt des CanvasManagers, den die Lösch-Methoden nutzen */
type FakeCanvasManager = {
  textManager: TextManager
  activeObject: unknown
  selectedObjects: unknown[]
  setActiveObject(obj: unknown): void
  clearMultiSelection(): void
  redrawCallback: Mock
  updateUICallback: Mock
  onObjectDeleted: Mock
  deleteActiveObject: OmitThisParameter<DeletionMethods['deleteActiveObject']>
  deleteTexts: OmitThisParameter<DeletionMethods['deleteTexts']>
}
type HistoryManager = ReturnType<Parameters<typeof createTextsSegment>[0]>

/**
 * Vom Canvas gelöschte Texte bleiben mit allen Einstellungen im
 * Text-Verzeichnis (offCanvas), bis sie dort endgültig gelöscht werden.
 */

function fakeCanvasManager(tm: TextManager) {
  const base: Omit<FakeCanvasManager, 'deleteActiveObject' | 'deleteTexts'> = {
    textManager: tm,
    activeObject: null,
    selectedObjects: [],
    setActiveObject(obj: unknown) {
      this.activeObject = obj
    },
    clearMultiSelection() {
      this.selectedObjects = []
    },
    redrawCallback: vi.fn(),
    updateUICallback: vi.fn(),
    onObjectDeleted: vi.fn(),
  }
  const cm = base as FakeCanvasManager
  cm.deleteActiveObject = DeletionMethods.prototype.deleteActiveObject.bind(stub(cm))
  cm.deleteTexts = DeletionMethods.prototype.deleteTexts.bind(stub(cm))
  return cm
}

describe('TextManager – vom Canvas entfernen', () => {
  let tm: TextManager
  beforeEach(() => {
    tm = new TextManager({})
  })

  it('behält den Text mit Einstellungen in der Liste und markiert ihn', () => {
    const a = tm.add('A', { fontSize: 84, color: '#ffc300' })
    expect(tm.removeFromCanvas(a)).toBe(true)
    expect(tm.textObjects).toContain(a)
    expect(a.offCanvas).toBe(true)
    expect(a.fontSize).toBe(84)
    expect(a.color).toBe('#ffc300')
    expect(tm.getCanvasTexts()).toEqual([])
    expect(tm.removeFromCanvas(a)).toBe(false)
  })

  it('holt den Text zurück auf den Canvas', () => {
    const a = tm.add('A')
    tm.removeFromCanvas(a)
    tm.markerRevealedIds.add(a.id)
    expect(tm.returnToCanvas(a)).toBe(true)
    expect(a.offCanvas).toBe(false)
    expect(tm.markerRevealedIds.has(a.id)).toBe(false)
    expect(tm.returnToCanvas(a)).toBe(false)
  })

  it('zeichnet entfernte Texte nur, solange ein Marker sie einblendet', () => {
    const a = tm.add('A')
    const b = tm.add('B')
    tm.removeFromCanvas(a)
    const drawn: unknown[] = []
    tm.drawText = (_ctx, obj) => {
      drawn.push(obj.content)
    }
    tm.draw(stub({}), 100, 100)
    expect(drawn).toEqual(['B'])

    drawn.length = 0
    tm.markerRevealedIds.add(a.id)
    tm.draw(stub({}), 100, 100)
    expect(drawn).toEqual(['A', 'B'])
    expect(b.offCanvas).toBeFalsy()
  })

  it('entfernte Texte sind nicht anklickbar', () => {
    const a = tm.add('A')
    tm.removeFromCanvas(a)
    const canvas = stub<HTMLCanvasElement>({ getContext: () => null })
    // findObjectAt überspringt den Text, bevor Bounds gemessen werden
    expect(tm.findObjectAt(0, 0, canvas)).toBeNull()
  })

  it('delete() entfernt endgültig (auch aus dem Verzeichnis)', () => {
    const a = tm.add('A')
    tm.removeFromCanvas(a)
    tm.markerRevealedIds.add(a.id)
    expect(tm.delete(a)).toBe(true)
    expect(tm.textObjects).toEqual([])
    expect(tm.markerRevealedIds.size).toBe(0)
  })
})

describe('CanvasManager – Text löschen', () => {
  let tm: TextManager
  let cm: FakeCanvasManager
  beforeEach(() => {
    tm = new TextManager({})
    cm = fakeCanvasManager(tm)
  })

  it('deleteActiveObject entfernt einen Text nur vom Canvas; Undo/Redo funktionieren', () => {
    tm.add('A')
    const b = tm.add('B')
    cm.activeObject = b
    cm.deleteActiveObject()

    expect(tm.textObjects).toContain(b)
    expect(b.offCanvas).toBe(true)
    expect(cm.activeObject).toBeNull()

    const { undo, redo } = cm.onObjectDeleted.mock.calls[0]![0]
    undo()
    expect(b.offCanvas).toBe(false)
    expect(tm.textObjects.map((t) => t.content)).toEqual(['A', 'B'])
    redo()
    expect(b.offCanvas).toBe(true)
    expect(tm.textObjects).toHaveLength(2)
  })

  it('deleteTexts entfernt mehrere Texte vom Canvas und behält sie im Verzeichnis', () => {
    const a = tm.add('A')
    const b = tm.add('B')
    cm.deleteTexts([a, b])
    expect(tm.textObjects).toHaveLength(2)
    expect(a.offCanvas && b.offCanvas).toBe(true)

    const { undo } = cm.onObjectDeleted.mock.calls[0]![0]
    undo()
    expect(a.offCanvas || b.offCanvas).toBe(false)
  })

  it('deleteTexts ignoriert bereits vom Canvas entfernte Texte', () => {
    const a = tm.add('A')
    tm.removeFromCanvas(a)
    cm.deleteTexts([a])
    expect(cm.onObjectDeleted).not.toHaveBeenCalled()
  })
})

describe('Verlauf – Texte-Segment', () => {
  it('schreibt offCanvas immer fest, damit Undo das Flag zurücksetzt', () => {
    const tm = new TextManager({})
    const cm = { textManager: tm, activeObject: null }
    const seg = createTextsSegment(() => stub<HistoryManager>(cm))
    const a = tm.add('A')

    const before = seg.capture()
    expect(before![0]!.offCanvas).toBe(false)

    tm.removeFromCanvas(a)
    expect(seg.capture()![0]!.offCanvas).toBe(true)

    seg.apply(before)
    expect(a.offCanvas).toBe(false)
    expect(tm.textObjects).toEqual([a])
  })
})

describe('Verlauf – Auswahl', () => {
  it('hebt die Markierung auf, wenn ein Schritt den Text vom Canvas nimmt', () => {
    const tm = new TextManager({})
    const a = tm.add('A')
    const cm = {
      textManager: tm,
      activeObject: a as unknown,
      selectedObjects: [] as unknown[],
      setActiveObject(o: unknown) {
        this.activeObject = o
      },
    }
    const seg = createTextsSegment(() => stub<HistoryManager>(cm))
    tm.removeFromCanvas(a)
    const removed = seg.capture()
    tm.returnToCanvas(a)
    seg.apply(removed)
    expect(a.offCanvas).toBe(true)
    expect(cm.activeObject).toBeNull()
  })
})
