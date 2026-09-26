import { describe, it, expect, vi, afterEach } from 'vitest'
import { SlideshowManager } from '../../lib/slideshowManager.js'

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
