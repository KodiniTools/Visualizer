// @vitest-environment jsdom
/**
 * Keine verwaisten Auswahl-Markierungen beim Slideshow-Wechsel:
 * - eingeblendete Slideshow-Bilder werden nicht automatisch ausgewählt
 * - Auswahl (aktiv/Hover/Mehrfach) auf entfernte Bilder wird aufgeräumt
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { reactive } from 'vue'
import { CanvasManager } from '../../lib/canvasManager.js'
import { MultiImageManager } from '../../lib/multiImageManager.js'
import { FotoManager } from '../../lib/fotoManager.js'
import { SlideshowManager } from '../../lib/slideshowManager.js'

afterEach(() => {
  delete window.slideshowManager
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function markerCtx() {
  const strokes = []
  const noop = () => {}
  const ctx = {
    canvas: { width: 1000, height: 1000 },
    save: noop,
    restore: noop,
    setLineDash: noop,
    strokeRect: (...a) => strokes.push(a),
    fillRect: noop,
    beginPath: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    moveTo: noop,
    lineTo: noop,
  }
  return { ctx, strokes }
}

function setup() {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  const canvas = { width: 1000, height: 1000, getContext: () => ({}), style: {} }
  const fotoManager = new FotoManager(() => {})
  const onImageSelected = vi.fn()
  const mim = new MultiImageManager(canvas, { onImageSelected, fotoManager })
  mim.fotoManager = fotoManager
  const cm = new CanvasManager(canvas, {
    redrawCallback: () => {},
    onObjectSelected: () => {},
    fotoManager,
    multiImageManager: mim,
  })
  const slideshow = new SlideshowManager(mim, fotoManager)
  window.slideshowManager = slideshow
  return { cm, mim, slideshow, onImageSelected }
}

describe('Slideshow – keine verwaisten Markierungen', () => {
  it('addImageWithBounds: select:false wählt nicht aus, Standard weiterhin schon', () => {
    const { mim } = setup()
    const bounds = { relX: 0, relY: 0, relWidth: 0.5, relHeight: 0.5 }
    const a = mim.addImageWithBounds({ width: 10, height: 10 }, bounds)
    expect(mim.getSelectedImage()).toBe(a)
    mim.addImageWithBounds({ width: 10, height: 10 }, bounds, 'none', { select: false })
    expect(mim.getSelectedImage()).toBe(a)
  })

  it('eingeblendete Slideshow-Bilder werden nicht ausgewählt', () => {
    const { mim, slideshow, onImageSelected } = setup()
    const img = { width: 10, height: 10 }
    slideshow.start([{ imageObject: img }, { imageObject: img }])
    expect(slideshow.activeImages).toHaveLength(1)
    expect(mim.getSelectedImage()).toBeNull()
    expect(onImageSelected).not.toHaveBeenCalled()
    slideshow.stop()
  })

  it('Szenario vom Foto: angeklicktes Bild wird ausgeblendet → keine Markierung übrig', () => {
    vi.useFakeTimers()
    const { cm, mim, slideshow } = setup()
    const img = { width: 10, height: 10 }
    slideshow.start([{ imageObject: img }, { imageObject: img }, { imageObject: img }], {
      fadeInDuration: 100,
      displayDuration: 100,
      fadeOutDuration: 100,
    })
    const first = slideshow.activeImages[0]
    cm.setActiveObject(first) // Benutzer klickt Bild 1 an
    cm.hoveredObject = first
    expect(mim.getSelectedImage()).toBe(first)

    // Bild 1 blendet aus, Bild 2 kommt – darf die Auswahl nicht übernehmen
    vi.advanceTimersByTime(250)
    slideshow._updateSlideshowState()
    const second = slideshow.activeImages.find((i) => i !== first)
    expect(second).toBeTruthy()
    expect(mim.getSelectedImage()).toBe(first)

    // Bild 1 wird entfernt
    vi.advanceTimersByTime(200)
    slideshow._updateSlideshowState()
    expect(mim.images).not.toContain(first)
    expect(mim.getSelectedImage()).toBeNull()

    // nächster Frame: keine Markierung, Auswahl aufgeräumt
    const { ctx, strokes } = markerCtx()
    cm.drawInteractiveElements(ctx)
    if (mim.getSelectedImage()) mim.drawInteractiveElements(ctx)
    expect(strokes).toEqual([])
    expect(cm.activeObject).toBeNull()
    expect(cm.hoveredObject).toBeNull()
    slideshow.stop()
  })

  it('pruneRemovedObjects: aktiv, Hover und Mehrfachauswahl; Vergleich per ID; Texte bleiben', () => {
    const { cm, mim } = setup()
    const bounds = { relX: 0, relY: 0, relWidth: 0.2, relHeight: 0.2 }
    const kept = mim.addImageWithBounds({ width: 10, height: 10 }, bounds)
    const gone = mim.addImageWithBounds({ width: 10, height: 10 }, bounds)
    mim.removeImage(gone.id)
    const text = { type: 'text', id: 't1' }

    // reaktiver Proxy desselben Bildes zählt als vorhanden
    cm.activeObject = reactive(kept)
    cm.hoveredObject = gone
    cm.selectedObjects = [text, gone, kept]
    expect(cm.selectionManager.pruneRemovedObjects()).toBe(true)
    expect(cm.activeObject.id).toBe(kept.id)
    expect(cm.hoveredObject).toBeNull()
    expect(cm.selectedObjects).toEqual([text, kept])
    expect(cm.selectionManager.pruneRemovedObjects()).toBe(false)

    cm.activeObject = gone
    cm.selectionManager.pruneRemovedObjects()
    expect(cm.activeObject).toBeNull()
    cm.activeObject = text // Text ist kein Bild → unberührt
    cm.selectionManager.pruneRemovedObjects()
    expect(cm.activeObject).toBe(text)
  })

  it('vorhandenes, angeklicktes Bild behält seine Markierung', () => {
    const { cm, mim } = setup()
    const a = mim.addImageWithBounds(
      { width: 10, height: 10 },
      { relX: 0.1, relY: 0.1, relWidth: 0.2, relHeight: 0.2 },
    )
    cm.setActiveObject(a)
    const { ctx, strokes } = markerCtx()
    cm.drawInteractiveElements(ctx)
    expect(strokes.length).toBeGreaterThan(0)
    expect(cm.activeObject).toBe(a)
  })
})
