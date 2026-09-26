import { describe, it, expect, vi, afterEach } from 'vitest'
import { SlideshowManager } from '../../lib/slideshowManager.js'

function createManager(callbacks = {}, canvas = { width: 1000, height: 1000 }) {
  let nextId = 1
  const multiImageManager = {
    canvas,
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
  return new SlideshowManager(multiImageManager, fotoManager, callbacks)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const img = { width: 100, height: 100 }

describe('SlideshowManager – Anzeigedauer pro Bild', () => {
  it('resolveDisplayDuration nutzt eigenen Wert, sonst Fallback', () => {
    expect(SlideshowManager.resolveDisplayDuration({ displayDuration: 5000 }, 3000)).toBe(5000)
    expect(SlideshowManager.resolveDisplayDuration({}, 3000)).toBe(3000)
    expect(SlideshowManager.resolveDisplayDuration({ displayDuration: 0 }, 3000)).toBe(3000)
    expect(SlideshowManager.resolveDisplayDuration({ displayDuration: NaN }, 3000)).toBe(3000)
    expect(SlideshowManager.resolveDisplayDuration(null, 3000)).toBe(3000)
  })

  it('wendet die Dauer pro Bild an und wechselt nach dieser Dauer', () => {
    vi.useFakeTimers()
    const m = createManager()
    m.start(
      [
        { imageObject: img, displayDuration: 6000 },
        { imageObject: img }, // globaler Wert
      ],
      { fadeInDuration: 1000, displayDuration: 2000, fadeOutDuration: 1000 },
    )
    expect(m.activeImages[0].slideshow.displayDuration).toBe(6000)

    // Nach 1s FadeIn + 5s Anzeige: noch kein Wechsel (globale 2s ignoriert)
    vi.advanceTimersByTime(6000)
    m._updateSlideshowState()
    expect(m.activeImages).toHaveLength(1)

    // Nach 1s FadeIn + 6s Anzeige beginnt FadeOut -> Bild 2 kommt dazu
    vi.advanceTimersByTime(1100)
    m._updateSlideshowState()
    expect(m.activeImages).toHaveLength(2)
    expect(m.activeImages[1].slideshow.displayDuration).toBe(2000)
    m.stop()
    vi.useRealTimers()
  })

  it('übernimmt Audio-Reaktiv-Einstellungen pro Bild', () => {
    const m = createManager()
    const settings = { enabled: true, effects: { scale: { enabled: true } } }
    m.start([{ imageObject: img, audioReactiveSettings: settings }, { imageObject: img }])
    const applied = m.activeImages[0].fotoSettings.audioReactive
    expect(applied).toEqual(settings)
    expect(applied).not.toBe(settings)
    m.stop()
  })
})

describe('SlideshowManager – Pause/Fortsetzen', () => {
  it('setzt nach einer Pause sofort fort – auch für später hinzugefügte Bilder', () => {
    vi.useFakeTimers()
    const m = createManager()
    m.start([{ imageObject: img }, { imageObject: img }, { imageObject: img }], {
      fadeInDuration: 1000,
      displayDuration: 2000,
      fadeOutDuration: 1000,
    })

    // Während Bild 1 angezeigt wird 20 s pausieren
    vi.advanceTimersByTime(1500)
    m._updateSlideshowState()
    m.pause()
    vi.advanceTimersByTime(20000)
    m.resume()

    // Bild 1 macht genau dort weiter, wo es pausiert wurde
    m._updateSlideshowState()
    expect(m.activeImages[0].slideshow.phase).toBe('display')

    // Nach restlichen 1,5 s Anzeige beginnt FadeOut -> Bild 2 kommt dazu
    vi.advanceTimersByTime(1600)
    m._updateSlideshowState()
    expect(m.activeImages).toHaveLength(2)
    const second = m.activeImages[1]

    // Bild 2 blendet sofort ein (nicht erst nach der Pausendauer)
    vi.advanceTimersByTime(500)
    m._updateSlideshowState()
    expect(second.slideshow.opacity).toBeGreaterThan(0.4)

    // Zweite Pause wirkt nur auf die dann aktiven Bilder
    m.pause()
    vi.advanceTimersByTime(30000)
    m.resume()
    vi.advanceTimersByTime(600)
    m._updateSlideshowState()
    expect(second.slideshow.phase).toBe('display')
    m.stop()
    vi.useRealTimers()
  })

  it('Opacity wird im FadeIn nie negativ', () => {
    vi.useFakeTimers()
    const m = createManager()
    m.start([{ imageObject: img }], { fadeInDuration: 1000 })
    m._updateSlideshowState()
    expect(m.activeImages[0].slideshow.opacity).toBeGreaterThanOrEqual(0)
    m.stop()
    vi.useRealTimers()
  })
})

describe('SlideshowManager – An Workspace anpassen', () => {
  // Canvas 1600x900, Workspace 9:16 mittig (450x810, wie getWorkspaceBounds)
  const canvas = { width: 1600, height: 900 }
  const ws = { x: 575, y: 45, width: 450, height: 810 }
  const wide = { width: 1600, height: 900 } // 16:9-Bild
  const close = (a, b) => expect(a).toBeCloseTo(b, 6)

  it('füllt den Workspace (Cover) und beschneidet auf ihn', () => {
    let bounds = ws
    const m = createManager({ getWorkspaceBounds: () => bounds }, canvas)
    m.start([{ imageObject: wide }], { fitToWorkspace: true })
    const imgData = m.activeImages[0]

    const t = m.getTransform()
    close(t.relX, 575 / 1600)
    close(t.relWidth, 450 / 1600)
    close(t.relHeight, 0.9)
    expect(imgData.slideshow.clipRect).toEqual(t)

    // Cover: volle Workspace-Höhe, Breite größer als Workspace, mittig
    close(imgData.relHeight, 0.9)
    close(imgData.relWidth * 1600, 810 * (16 / 9))
    close(imgData.relX + imgData.relWidth / 2, 0.5)
    expect(imgData.relWidth).toBeGreaterThan(t.relWidth)

    // Freies Verschieben/Skalieren ist gesperrt
    m.moveSlideshow(0.1, 0.1)
    m.scaleSlideshow(0.5)
    expect(m.getTransform()).toEqual(t)

    // Formatwechsel während der Slideshow → Bilder folgen
    bounds = { x: 350, y: 45, width: 900, height: 810 }
    m._syncWorkspace()
    close(imgData.slideshow.clipRect.relWidth, 900 / 1600)
    m.stop()
  })

  it('ohne Workspace-Format: normales Verhalten (Transform, kein Clip)', () => {
    const m = createManager({ getWorkspaceBounds: () => null }, canvas)
    m.start([{ imageObject: wide }], { fitToWorkspace: true })
    expect(m.isFittedToWorkspace()).toBe(false)
    expect(m.activeImages[0].slideshow.clipRect).toBeNull()
    expect(m.getTransform()).toEqual(m.transform)
    m.stop()
  })

  it('lässt sich während der Slideshow umschalten', () => {
    const m = createManager({ getWorkspaceBounds: () => ws }, canvas)
    m.start([{ imageObject: wide }])
    const imgData = m.activeImages[0]
    expect(imgData.slideshow.clipRect).toBeNull()
    m.setFitToWorkspace(true)
    expect(imgData.slideshow.clipRect).not.toBeNull()
    m.setFitToWorkspace(false)
    expect(imgData.slideshow.clipRect).toBeNull()
    m.stop()
  })

  it('Contain-Modus bleibt innerhalb des Transform-Bereichs', () => {
    const m = createManager({}, { width: 1000, height: 1000 })
    m.setTransform({ relX: 0.2, relY: 0.1, relWidth: 0.3, relHeight: 0.8 })
    m.start([{ imageObject: { width: 100, height: 100 } }])
    const imgData = m.activeImages[0]
    expect(imgData.relWidth).toBeLessThanOrEqual(0.3 + 1e-9)
    expect(imgData.relHeight).toBeLessThanOrEqual(0.8 + 1e-9)
    close(imgData.relWidth, 0.3)
    m.stop()
  })
})
