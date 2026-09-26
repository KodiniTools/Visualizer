import { describe, it, expect, afterEach } from 'vitest'
import { DragDropHandler } from '../../lib/canvasManager/interaction/DragDropHandler.js'

function setup({ fitted = false } = {}) {
  const committed = []
  window.slideshowManager = {
    isFittedToWorkspace: () => fitted,
    commitImageBounds: (obj) => committed.push({ ...obj }),
  }
  const manager = {
    canvas: { width: 1000, height: 1000 },
    currentAction: 'resize-br',
    selectionManager: { HANDLE_SIZE: 10 },
  }
  const obj = {
    type: 'image',
    isSlideshowImage: true,
    imageObject: { width: 200, height: 100 },
    relX: 0.1,
    relY: 0.1,
    relWidth: 0.4,
    relHeight: 0.2,
  }
  return { handler: new DragDropHandler(manager), manager, obj, committed }
}

afterEach(() => {
  delete window.slideshowManager
})

describe('DragDropHandler – Slideshow-Bilder', () => {
  it('Ecke unten-rechts folgt der Maus (Seitenverhältnis bleibt), oben-links fix', () => {
    const { handler, obj, committed } = setup()
    handler.resizeImage(obj, 100, 10) // +100 px nach rechts
    expect(obj.relWidth).toBeCloseTo(0.5)
    expect(obj.relHeight).toBeCloseTo(0.25)
    expect(obj.relX).toBeCloseTo(0.1)
    expect(obj.relY).toBeCloseTo(0.1)
    expect(committed).toHaveLength(1)
  })

  it('Ecke oben-links: gegenüberliegende Ecke bleibt fix', () => {
    const { handler, manager, obj } = setup()
    manager.currentAction = 'resize-tl'
    handler.resizeImage(obj, -100, 0) // nach links → größer
    expect(obj.relWidth).toBeCloseTo(0.5)
    expect(obj.relX + obj.relWidth).toBeCloseTo(0.5)
    expect(obj.relY + obj.relHeight).toBeCloseTo(0.3)
  })

  it('Verschieben bewegt nur dieses Bild und merkt es', () => {
    const { handler, obj, committed } = setup()
    handler.moveObject(obj, 50, 100)
    expect(obj.relX).toBeCloseTo(0.15)
    expect(obj.relY).toBeCloseTo(0.2)
    expect(committed.at(-1).relX).toBeCloseTo(0.15)
  })

  it('im Workspace-Modus gesperrt', () => {
    const { handler, obj, committed } = setup({ fitted: true })
    handler.resizeImage(obj, 100, 0)
    handler.moveObject(obj, 50, 50)
    expect(obj.relWidth).toBe(0.4)
    expect(obj.relX).toBe(0.1)
    expect(committed).toHaveLength(0)
  })
})
