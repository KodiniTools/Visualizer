// @vitest-environment jsdom
/**
 * Auswahl-Markierung liegt auf dem sichtbaren Bild – auch mitten in einem
 * (pausierten) Übergang wie „Nach oben schieben“, Zoom oder Kippen.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { CanvasManager } from '../../lib/canvasManager.js'
import { MultiImageManager } from '../../lib/multiImageManager.js'
import { FotoManager } from '../../lib/fotoManager.js'
import { SlideshowManager } from '../../lib/slideshowManager.js'
import {
  applyTransitionToBounds,
  computeTransitionState,
  SLIDESHOW_TRANSITIONS,
} from '../../lib/slideshowTransitions.js'

afterEach(() => {
  delete window.slideshowManager
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const B = { relX: 0.5, relY: 0.3, relWidth: 0.4, relHeight: 0.3 }

describe('applyTransitionToBounds', () => {
  it('ohne Zustand/neutral: unverändert (Kopie)', () => {
    const out = applyTransitionToBounds(B, null)
    expect(out).toEqual(B)
    expect(out).not.toBe(B)
    expect(applyTransitionToBounds(B, computeTransitionState('slideUp', 'display', 1))).toEqual(B)
  })

  it('Schieben: Verschiebung als Anteil der Bildgröße', () => {
    const r = applyTransitionToBounds(B, { translateX: 0.5, translateY: -1, scale: 1, scaleX: 1 })
    expect(r.relX).toBeCloseTo(0.7)
    expect(r.relY).toBeCloseTo(0)
    expect(r.relWidth).toBeCloseTo(0.4)
  })

  it('Zoom und Kippen um die Mitte', () => {
    const z = applyTransitionToBounds(B, { scale: 0.5 })
    expect([z.relX, z.relY, z.relWidth, z.relHeight].map((v) => +v.toFixed(4))).toEqual([
      0.6, 0.375, 0.2, 0.15,
    ])
    const f = applyTransitionToBounds(B, { scaleX: 0.25 })
    expect([f.relX, f.relWidth, f.relY, f.relHeight].map((v) => +v.toFixed(4))).toEqual([
      0.65, 0.1, 0.3, 0.3,
    ])
  })
})

function setup() {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  const canvas = { width: 1000, height: 800, getContext: () => ({}), style: {} }
  const fotoManager = new FotoManager(() => {})
  const mim = new MultiImageManager(canvas, { fotoManager })
  mim.fotoManager = fotoManager
  const cm = new CanvasManager(canvas, {
    redrawCallback: () => {},
    onObjectSelected: () => {},
    fotoManager,
    multiImageManager: mim,
  })
  const slideshow = new SlideshowManager(mim, fotoManager)
  window.slideshowManager = slideshow
  return { cm, mim, slideshow, canvas }
}

/** Rechteck, in das drawImages() das Bild tatsächlich zeichnet */
function drawnRect(mim, canvas) {
  let rect = null
  const noop = () => {}
  const ctx = new Proxy(
    { canvas, globalAlpha: 1, filter: 'none' },
    {
      get(t, k) {
        if (k in t) return t[k]
        if (k === 'drawImage') return (img, x, y, w, h) => (rect = { x, y, width: w, height: h })
        return noop
      },
      set(t, k, v) {
        t[k] = v
        return true
      },
    },
  )
  mim.drawImages(ctx)
  return rect
}

const MOVING = SLIDESHOW_TRANSITIONS.map((t) => t.id).filter((id) =>
  ['slideLeft', 'slideRight', 'slideUp', 'slideDown', 'zoomIn', 'zoomOut', 'rotate'].includes(id),
)

describe('Markierung = gezeichnetes Bild (pausiert mitten im Einblenden)', () => {
  it.each(MOVING)('%s', (transition) => {
    vi.useFakeTimers()
    const { cm, mim, slideshow, canvas } = setup()
    const img = { width: 400, height: 300 }
    slideshow.start([{ imageObject: img }, { imageObject: img }], {
      transition,
      fadeInDuration: 4600,
    })
    vi.advanceTimersByTime(1500) // wie auf dem Foto: noch im Einblenden
    slideshow._updateSlideshowState()
    slideshow.pause()
    const shown = slideshow.activeImages[0]
    expect(shown.slideshow.phase).toBe('fadeIn')

    const drawn = drawnRect(mim, canvas)
    const marker = cm.getObjectBounds(shown)
    for (const k of ['x', 'y', 'width', 'height']) expect(marker[k]).toBeCloseTo(drawn[k], 6)

    // Klick-Erkennung trifft das sichtbare Bild, nicht die Endposition
    const cx = drawn.x + drawn.width / 2
    const cy = drawn.y + drawn.height / 2
    expect(cm.getObjectAtPos(cx, cy)).toBe(shown)
    slideshow.stop()
  })

  it('„Nach oben schieben“: Markierung liegt unten beim Bild, nicht an der Endposition', () => {
    vi.useFakeTimers()
    const { cm, slideshow } = setup()
    slideshow.start([{ imageObject: { width: 400, height: 300 } }, { imageObject: {} }], {
      transition: 'slideUp',
      fadeInDuration: 4600,
    })
    vi.advanceTimersByTime(1500)
    slideshow._updateSlideshowState()
    slideshow.pause()
    const shown = slideshow.activeImages[0]
    const end = slideshow.getSelectionBounds(shown)
    const marker = cm.getObjectBounds(shown)
    expect(marker.y).toBeGreaterThan(end.relY * 800 + 1) // noch unterhalb
    expect(marker.height).toBeCloseTo(end.relHeight * 800)
    slideshow.stop()
  })

  it('Anzeigephase: Markierung = eigene Bounds; Hintergrund-Modus: fester Bereich', () => {
    vi.useFakeTimers()
    const { slideshow } = setup()
    slideshow.start([{ imageObject: { width: 400, height: 300 } }, { imageObject: {} }], {
      transition: 'slideUp',
      fadeInDuration: 500,
    })
    vi.advanceTimersByTime(700)
    slideshow._updateSlideshowState()
    const shown = slideshow.activeImages[0]
    expect(shown.slideshow.phase).toBe('display')
    expect(slideshow.getDisplayBounds(shown)).toEqual(slideshow.getSelectionBounds(shown))

    slideshow.setBackgroundMode('canvas')
    shown.slideshow.transitionState = computeTransitionState('slideUp', 'in', 0.3)
    expect(slideshow.getDisplayBounds(shown)).toEqual({
      relX: 0,
      relY: 0,
      relWidth: 1,
      relHeight: 1,
    })
    slideshow.stop()
  })
})
