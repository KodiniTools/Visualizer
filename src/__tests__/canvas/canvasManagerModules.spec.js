// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { CanvasManager } from '../../lib/canvasManager.js'
import { applyMethods } from '../../lib/canvasManager/methods/index.js'

// Öffentliche + interne Methoden, die Module/Komponenten am CanvasManager nutzen.
// Stand vor der Aufteilung in canvasManager/methods/ – darf nicht verloren gehen.
const METHODS = [
  '_applyAudioReactiveFilters',
  '_calculateEffectValue',
  '_cleanupCanvasPool',
  '_endDrag',
  '_getAudioReactiveValues',
  '_initCanvasPool',
  '_notifySelectionListeners',
  '_startDragListeners',
  '_stopDragListeners',
  '_updateResizeCursor',
  'addImage',
  'addText',
  'calculateTextBounds',
  'cancelImageSelectionMode',
  'cancelTextSelectionMode',
  'cleanupAfterRecording',
  'clearMultiSelection',
  'clearTextPositionPreview',
  'deleteActiveObject',
  'deleteTexts',
  'destroy',
  'draw',
  'drawBackgroundTiles',
  'drawDeleteButton',
  'drawFadedTextMarkers',
  'drawForRecording',
  'drawImageSelectionRect',
  'drawInteractiveElements',
  'drawResizeHandles',
  'drawScene',
  'drawTextPositionPreview',
  'drawTextSelectionRect',
  'drawWorkspaceOutline',
  'getActiveImage',
  'getBackgroundColorAudioReactive',
  'getCanvasState',
  'getDeleteButtonBounds',
  'getGradientSettings',
  'getHandleAtPos',
  'getImageAnimation',
  'getImageSelectionBounds',
  'getMousePos',
  'getObjectAtPos',
  'getObjectBounds',
  'getRelativePositionFromEvent',
  'getResizeHandles',
  'getTextAtPos',
  'getTextSelectionBounds',
  'getTileAtPosition',
  'getVideoBackground',
  'getWorkspaceBounds',
  'getWorkspaceVideoBackground',
  'isCanvasEmpty',
  'isInMultiSelection',
  'isPointInRect',
  'moveObject',
  'onDoubleClick',
  'onMouseDown',
  'onMouseLeave',
  'onMouseMove',
  'onMouseUp',
  'onSelectionChanged',
  'onWindowMouseMove',
  'onWindowMouseUp',
  'prepareForRecording',
  'removeImageBySource',
  'replaceBackground',
  'replaceWorkspaceBackground',
  'reset',
  'resizeImage',
  'resizeText',
  'selectAllTexts',
  'setActiveObject',
  'setBackground',
  'setBackgroundColorAudioReactive',
  'setBackgroundTilesStore',
  'setEditing',
  'setGradientSettings',
  'setImageAnimation',
  'setTextPositionPreview',
  'setVideoBackground',
  'setWorkspaceBackground',
  'setWorkspacePreset',
  'setWorkspaceVideoBackground',
  'setupInteractionHandlers',
  'startImageSelectionMode',
  'startTextSelectionMode',
  'toggleMultiSelect',
  'toggleWorkspaceOutline',
  'updateActiveFotoProperty',
  'updateActiveObjectProperty',
  'updateBackgroundFlip',
  'updateCanvas',
  'updateWorkspaceBackgroundFlip',
]
const GETTERS = ['HANDLE_SIZE', '_canvasPool']

describe('CanvasManager – Aufteilung in Methoden-Module', () => {
  it('alle Methoden und Getter sind am Prototyp (wie vor der Aufteilung)', () => {
    const d = Object.getOwnPropertyDescriptors(CanvasManager.prototype)
    const missing = METHODS.filter((n) => typeof d[n]?.value !== 'function')
    expect(missing).toEqual([])
    for (const n of GETTERS) expect(typeof d[n]?.get).toBe('function')
    // gleiche Eigenschaften wie Klassen-Methoden: nicht aufzählbar, überschreibbar
    expect(d.draw.enumerable).toBe(false)
    expect(d.draw.writable).toBe(true)
    expect(Object.keys(CanvasManager.prototype)).toEqual([])
    expect(Object.getOwnPropertyNames(CanvasManager.prototype).length).toBe(
      METHODS.length + GETTERS.length + 1, // + constructor
    )
  })

  it('Methoden laufen mit der Instanz als this (Beispiel Workspace/Auswahl)', () => {
    const canvas = { width: 1000, height: 500, getContext: () => ({}) }
    const redraws = []
    const cm = new CanvasManager(canvas, { redrawCallback: () => redraws.push(1) })
    cm.setWorkspacePreset('instagram-post')
    expect(cm.getWorkspaceBounds()).toEqual({ x: 275, y: 25, width: 450, height: 450 })
    expect(redraws.length).toBe(1)
    const seen = []
    cm.onSelectionChanged((obj) => seen.push(obj))
    cm._notifySelectionListeners('x')
    expect(seen).toEqual(['x'])
    expect(cm.HANDLE_SIZE).toBe(cm.selectionManager.HANDLE_SIZE)
    expect(cm.isCanvasEmpty()).toBe(true)
  })

  it('applyMethods überträgt Getter und verhindert doppelte Namen', () => {
    class Target {}
    class A {
      foo() {
        return this.v
      }
      get bar() {
        return 2
      }
    }
    class B {
      foo() {}
    }
    applyMethods(Target, A)
    const t = new Target()
    t.v = 1
    expect(t.foo()).toBe(1)
    expect(t.bar).toBe(2)
    expect(() => applyMethods(Target, B)).toThrow(/foo/)
  })
})
