import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  SLIDESHOW_TRANSITIONS,
  computeTransitionState,
  isValidTransition,
  resolveTransition,
} from '../../lib/slideshowTransitions.js'
import { SlideshowManager } from '../../lib/slideshowManager.js'
import { MultiImageManager } from '../../lib/multiImageManager.js'

describe('slideshowTransitions', () => {
  it('Liste, Gültigkeit und Auflösung', () => {
    expect(SLIDESHOW_TRANSITIONS.map((t) => t.id)).toContain('wipe')
    expect(isValidTransition('zoomIn')).toBe(true)
    expect(isValidTransition('toString')).toBe(false)
    expect(resolveTransition({ transition: 'blur' }, 'fade')).toBe('blur')
    expect(resolveTransition({ transition: 'kaputt' }, 'flip')).toBe('flip')
    expect(resolveTransition(null, undefined)).toBe('fade')
  })

  it('jeder Übergang endet im Normalzustand (rein=1, raus=0)', () => {
    for (const { id } of SLIDESHOW_TRANSITIONS) {
      const end = computeTransitionState(id, 'in', 1)
      expect(end.opacity, id).toBeCloseTo(1)
      expect(end.translateX, id).toBeCloseTo(0)
      expect(end.translateY, id).toBeCloseTo(0)
      expect(end.scale, id).toBeCloseTo(1)
      expect(end.scaleX, id).toBeCloseTo(1)
      expect(end.rotation, id).toBeCloseTo(0)
      expect(end.blur, id).toBeCloseTo(0)
      if (end.wipe) expect(end.wipe, id).toEqual({ start: 0, end: 1 })
      const outStart = computeTransitionState(id, 'out', 0)
      expect(outStart.opacity, id).toBeCloseTo(1)
      expect(outStart.translateX, id).toBeCloseTo(0)
    }
  })

  it('typische Start-/Endzustände', () => {
    expect(computeTransitionState('fade', 'in', 0.25).opacity).toBeCloseTo(0.25) // linear
    expect(computeTransitionState('slideLeft', 'in', 0).translateX).toBeCloseTo(1)
    expect(computeTransitionState('slideLeft', 'out', 1).translateX).toBeCloseTo(-1)
    expect(computeTransitionState('slideDown', 'in', 0).translateY).toBeCloseTo(-1)
    expect(computeTransitionState('zoomIn', 'in', 0).scale).toBeCloseTo(0.5)
    expect(computeTransitionState('zoomOut', 'out', 1).scale).toBeCloseTo(0.5)
    expect(computeTransitionState('blur', 'in', 0).blur).toBeCloseTo(20)
    expect(computeTransitionState('rotate', 'in', 0).rotation).toBeCloseTo(-90)
    expect(computeTransitionState('flip', 'out', 1).scaleX).toBeGreaterThan(0)
    expect(computeTransitionState('wipe', 'in', 0).wipe).toEqual({ start: 0, end: 0 })
    expect(computeTransitionState('wipe', 'out', 1).wipe).toEqual({ start: 1, end: 1 })
    // Harter Schnitt: sofort sichtbar, verschwindet erst am Ende
    expect(computeTransitionState('none', 'in', 0).opacity).toBe(1)
    expect(computeTransitionState('none', 'out', 0.9).opacity).toBe(1)
    expect(computeTransitionState('none', 'out', 1).opacity).toBe(0)
    // Anzeige = neutral
    expect(computeTransitionState('slideLeft', 'display', 0.5).translateX).toBe(0)
  })
})

function createManager() {
  let nextId = 1
  const multiImageManager = {
    canvas: { width: 1000, height: 1000 },
    addImageWithBounds: vi.fn((imageObject, bounds) => ({ id: nextId++, imageObject, ...bounds })),
    removeImage: vi.fn(),
  }
  const fotoManager = {
    initializeImageSettings: (img) => {
      img.fotoSettings ??= { audioReactive: null }
    },
  }
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  return new SlideshowManager(multiImageManager, fotoManager)
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SlideshowManager – Übergänge', () => {
  const img = { width: 100, height: 100 }

  it('globaler Übergang, pro Bild überschreibbar; Zustand wird berechnet', () => {
    vi.useFakeTimers()
    const m = createManager()
    m.start([{ imageObject: img, transition: 'zoomIn' }, { imageObject: img }], {
      transition: 'slideLeft',
      fadeInDuration: 1000,
      displayDuration: 1000,
      fadeOutDuration: 1000,
    })
    const first = m.activeImages[0]
    expect(first.slideshow.transition).toBe('zoomIn')
    vi.advanceTimersByTime(500)
    m._updateSlideshowState()
    expect(first.slideshow.transitionState.scale).toBeGreaterThan(0.5)
    expect(first.slideshow.transitionState.scale).toBeLessThan(1)
    expect(first.slideshow.opacity).toBe(first.slideshow.transitionState.opacity)

    vi.advanceTimersByTime(1600) // Bild 1 blendet aus → Bild 2 kommt
    m._updateSlideshowState()
    const second = m.activeImages.find((i) => i.slideshow.imageIndex === 1)
    expect(second.slideshow.transition).toBe('slideLeft')
    m.stop()
  })

  it('übersprungene Anzeige-/Ausblendphase startet trotzdem das nächste Bild', () => {
    vi.useFakeTimers()
    const m = createManager()
    m.start([{ imageObject: img }, { imageObject: img }], {
      fadeInDuration: 100,
      displayDuration: 100,
      fadeOutDuration: 100,
    })
    // Ein einziger Frame nach langer Pause (z. B. Tab im Hintergrund)
    vi.advanceTimersByTime(250)
    m._updateSlideshowState()
    expect(m.activeImages.some((i) => i.slideshow.imageIndex === 1)).toBe(true)

    m.stop()
  })

  it('komplett übersprungenes Bild (Einblenden → fertig) startet das nächste', () => {
    vi.useFakeTimers()
    const m = createManager()
    m.start([{ imageObject: img }, { imageObject: img }], {
      fadeInDuration: 100,
      displayDuration: 100,
      fadeOutDuration: 100,
    })
    vi.advanceTimersByTime(1000)
    m._updateSlideshowState()
    expect(m.activeImages.map((i) => i.slideshow.imageIndex)).toEqual([1])
    m.stop()
  })

  it('applyLiveUpdate übernimmt Übergang für angezeigte und folgende Bilder', () => {
    const m = createManager()
    const imgs = [{ imageObject: img }, { imageObject: { width: 100, height: 100 } }]
    m.start(imgs)
    m.applyLiveUpdate(imgs, { transition: 'wipe' })
    expect(m.activeImages[0].slideshow.transition).toBe('wipe')
    expect(m.config.transition).toBe('wipe')
    m.stop()
  })
})

describe('MultiImageManager – Übergänge beim Zeichnen', () => {
  function makeCtx() {
    const calls = []
    const ctx = {
      canvas: { width: 1000, height: 1000 },
      globalAlpha: 1,
      filter: 'none',
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn((...a) => calls.push(['rect', ...a])),
      clip: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn((...a) => calls.push(['scale', ...a])),
      drawImage: vi.fn((...a) => calls.push(['drawImage', ...a])),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
    }
    return { ctx, calls }
  }

  function managerWith(transitionState) {
    const mgr = new MultiImageManager({ width: 1000, height: 1000 })
    mgr.images.push({
      id: 1,
      type: 'image',
      imageObject: { width: 100, height: 100 },
      relX: 0.1,
      relY: 0.1,
      relWidth: 0.2,
      relHeight: 0.2,
      slideshow: { active: true, opacity: transitionState.opacity ?? 1, transitionState },
    })
    return mgr
  }

  const neutral = {
    opacity: 1,
    translateX: 0,
    translateY: 0,
    scale: 1,
    scaleX: 1,
    rotation: 0,
    blur: 0,
    wipe: null,
  }

  it('Schieben verschiebt das Bild um den Anteil seiner Breite', () => {
    const { ctx, calls } = makeCtx()
    managerWith({ ...neutral, translateX: 0.5 }).drawImages(ctx)
    const draw = calls.find((c) => c[0] === 'drawImage')
    expect(draw[2]).toBeCloseTo(100 + 0.5 * 200) // x = 100 + halbe Bildbreite
  })

  it('Wischen beschneidet auf den aufgedeckten Teil', () => {
    const { ctx, calls } = makeCtx()
    managerWith({ ...neutral, wipe: { start: 0, end: 0.25 } }).drawImages(ctx)
    const rect = calls.find((c) => c[0] === 'rect')
    expect(rect.slice(1)).toEqual([100, 100, 50, 200])
  })

  it('Weichzeichnen und Kippen', () => {
    const { ctx, calls } = makeCtx()
    managerWith({ ...neutral, blur: 8, scaleX: 0.5 }).drawImages(ctx)
    expect(ctx.filter).toContain('blur(8.00px)')
    expect(calls.some((c) => c[0] === 'scale' && c[1] === 0.5 && c[2] === 1)).toBe(true)
  })
})

describe('SlideshowManager – Live-Bearbeitung (pausiert)', () => {
  it('preserveLive: aktuelle Anpassungen bleiben, neue Anzeigedauer gilt sofort', () => {
    const img = { width: 100, height: 100 }
    const m = createManager()
    const imgs = [{ imageObject: img }, { imageObject: { width: 100, height: 100 } }]
    m.start(imgs, { displayDuration: 3000 })
    const shown = m.activeImages[0]
    shown.fotoSettings.brightness = 160 // gerade eben geändert, noch nicht gemerkt
    m.applyLiveUpdate([{ ...imgs[0], displayDuration: 8000, transition: 'wipe' }, imgs[1]], {
      preserveLive: true,
    })
    expect(shown.fotoSettings.brightness).toBe(160)
    expect(shown.slideshow.displayDuration).toBe(8000)
    expect(shown.slideshow.transition).toBe('wipe')
    m.stop()
  })
})
