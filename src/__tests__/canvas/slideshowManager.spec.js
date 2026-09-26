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

describe('SlideshowManager – Endlos wiederholen', () => {
  it('behält auch Filter, Schatten, Rotation & Spiegeln – Render-Layer bleibt Slideshow-Sache', () => {
    vi.useFakeTimers()
    const m = createManager()
    m.start([{ imageObject: img }, { imageObject: img }], {
      fadeInDuration: 100,
      displayDuration: 1000,
      fadeOutDuration: 100,
      loop: true,
      renderBehindVisualizer: true,
    })
    const first = m.activeImages[0]
    Object.assign(first.fotoSettings, {
      brightness: 140,
      sepia: 60,
      shadowBlur: 12,
      rotation: 45,
      flipH: true,
      renderBehindVisualizer: false, // darf nicht übernommen werden
      _cachedFilterString: 'x',
    })
    for (let t = 0; t < 2600; t += 50) {
      vi.advanceTimersByTime(50)
      m._updateSlideshowState()
    }
    const again = m.activeImages.find((i) => i.slideshow.imageIndex === 0 && i !== first)
    expect(again.fotoSettings).toMatchObject({
      brightness: 140,
      sepia: 60,
      shadowBlur: 12,
      rotation: 45,
      flipH: true,
      renderBehindVisualizer: true,
    })
    expect(again.fotoSettings._cachedFilterString).toBeUndefined()
    m.stop()
    vi.useRealTimers()
  })

  it('behält während der Slideshow geänderte Audio-Reaktiv-Einstellungen im nächsten Durchlauf', () => {
    vi.useFakeTimers()
    const m = createManager()
    const initial = { enabled: true, source: 'bass', effects: { scale: { enabled: true } } }
    m.start(
      [
        { imageObject: img, audioReactiveSettings: initial },
        { imageObject: img, audioReactiveSettings: initial },
      ],
      { fadeInDuration: 100, displayDuration: 1000, fadeOutDuration: 100, loop: true },
    )

    // Nutzer ändert die Einstellungen am laufenden Bild 1
    const first = m.activeImages[0]
    first.fotoSettings.audioReactive.source = 'treble'
    first.fotoSettings.audioReactive.effects.glow = { enabled: true, intensity: 90 }

    const tick = (ms) => {
      for (let t = 0; t < ms; t += 50) {
        vi.advanceTimersByTime(50)
        m._updateSlideshowState()
      }
    }
    // Bild 1 aus, Bild 2 durch, Bild 1 kommt erneut
    tick(2600)
    const again = m.activeImages.find((i) => i.slideshow.imageIndex === 0 && i !== first)
    expect(again).toBeDefined()
    expect(again.fotoSettings.audioReactive.source).toBe('treble')
    expect(again.fotoSettings.audioReactive.effects.glow.enabled).toBe(true)
    // Kopie, keine geteilte Referenz
    expect(again.fotoSettings.audioReactive).not.toBe(first.fotoSettings.audioReactive)
    // Bild 2 unverändert
    const second = m.activeImages.find((i) => i.slideshow.imageIndex === 1)
    expect(second?.fotoSettings.audioReactive.source ?? 'bass').toBe('bass')
    // Ursprüngliches Objekt aus dem Panel nicht mutiert
    expect(initial.source).toBe('bass')
    m.stop()
    vi.useRealTimers()
  })
})

describe('SlideshowManager – Anpassungen über Stoppen/Neustart', () => {
  const imgA = { width: 100, height: 100 }
  const imgB = { width: 100, height: 100 }
  const panelAr = { enabled: true, source: 'bass', effects: {} }
  const images = (ar = panelAr) => [
    { imageObject: imgA, audioReactiveSettings: ar },
    { imageObject: imgB, audioReactiveSettings: ar },
  ]

  it('behält Filter + Audio nach Stoppen und Neustart', () => {
    const m = createManager()
    m.start(images())
    const a = m.activeImages[0]
    a.fotoSettings.brightness = 150
    a.fotoSettings.audioReactive.source = 'treble'
    m.stop()

    m.start(images())
    const again = m.activeImages[0]
    expect(again).not.toBe(a)
    expect(again.fotoSettings.brightness).toBe(150)
    expect(again.fotoSettings.audioReactive.source).toBe('treble')
    m.stop()
  })

  it('neue Audio-Vorgabe im Panel hat Vorrang, Filter bleiben', () => {
    const m = createManager()
    m.start(images())
    const a = m.activeImages[0]
    a.fotoSettings.brightness = 150
    a.fotoSettings.audioReactive.source = 'treble'
    m.stop()

    m.start(images({ enabled: true, source: 'mid', effects: {} }))
    const again = m.activeImages[0]
    expect(again.fotoSettings.brightness).toBe(150)
    expect(again.fotoSettings.audioReactive.source).toBe('mid')
    m.stop()
  })

  it('clearImageMemory verwirft die gemerkten Anpassungen', () => {
    const m = createManager()
    m.start(images())
    m.activeImages[0].fotoSettings.brightness = 150
    m.stop()
    m.clearImageMemory()
    m.start(images())
    expect(m.activeImages[0].fotoSettings.brightness).toBeUndefined()
    m.stop()
  })
})
