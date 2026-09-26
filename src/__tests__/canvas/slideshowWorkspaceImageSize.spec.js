/**
 * Bildgröße (B×H) und Position bei Workspace-Format:
 * - Modus „Aus“ mit Workspace-Format: frei skalierbar, relativ zur Canvas
 * - Modus „Workspace“: Bild füllt den Workspace, Größenregler gesperrt,
 *   eigene Größe bleibt für den Wechsel zurück erhalten
 * - Modus „Workspace“ ohne Format: wie „Aus“
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { SlideshowManager } from '../../lib/slideshowManager.js'

// TikTok-ähnlich: Canvas 1080×1920, Workspace mit 5 % Rand
const CANVAS = { width: 1080, height: 1920 }
const WS = { x: 54, y: 96, width: 972, height: 1728 }
const WS_REL = {
  relX: WS.x / CANVAS.width,
  relY: WS.y / CANVAS.height,
  relWidth: WS.width / CANVAS.width,
  relHeight: WS.height / CANVAS.height,
}

function createManager(callbacks = {}) {
  let nextId = 1
  const multiImageManager = {
    canvas: { ...CANVAS },
    images: [],
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
  return new SlideshowManager(multiImageManager, fotoManager, {
    getWorkspaceBounds: () => ({ ...WS }),
    ...callbacks,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const imgA = { width: 200, height: 100 } // 2:1
const imgB = { width: 100, height: 100 }
const imgs = () => [{ imageObject: imgA }, { imageObject: imgB }]
const aspectPx = (b) => (b.relWidth * CANVAS.width) / (b.relHeight * CANVAS.height)

describe('Bildgröße – Modus „Aus“ mit Workspace-Format', () => {
  it('frei skalierbar relativ zur Canvas; Seitenverhältnis in Pixeln bleibt 2:1', () => {
    const onImageBoundsChange = vi.fn()
    const m = createManager({ onImageBoundsChange })
    m.start(imgs(), { backgroundMode: 'none' })
    expect(m.isFittedToWorkspace()).toBe(false)
    const a = m.activeImages[0]
    // Einpassung in den Slideshow-Bereich (nicht den Workspace), Pixel-Verhältnis 2:1
    expect(aspectPx(m.getFittedImageBounds(imgA))).toBeCloseTo(2)

    const res = m.setImageSize(imgA, { width: 0.5 })
    expect(res.relWidth).toBeCloseTo(0.5)
    expect(aspectPx(res)).toBeCloseTo(2)
    expect(a.relWidth).toBeCloseTo(0.5)
    expect(a.slideshow.clipRect).toBeNull() // nicht auf den Workspace beschnitten
    expect(onImageBoundsChange).toHaveBeenCalledTimes(1)

    // über den Workspace hinaus erlaubt (bis 200 % der Canvas)
    m.setImageSize(imgA, { width: 1.5 })
    expect(a.relWidth).toBeCloseTo(1.5)
    expect(a.relWidth).toBeGreaterThan(WS_REL.relWidth)
    m.stop()
  })

  it('ohne Seitenverhältnis frei; Position danach behält die Größe', () => {
    const m = createManager()
    m.start(imgs(), { backgroundMode: 'none' })
    m.setImageSize(imgA, { height: 0.3, keepAspect: false })
    m.setImagePosition(imgA, { centerX: 0.5, centerY: 0.5 })
    const b = m.getImageBounds(imgA)
    expect(b.relHeight).toBeCloseTo(0.3)
    expect(b.relY).toBeCloseTo(0.35)
    m.stop()
  })
})

describe('Bildgröße – Modus „Workspace“', () => {
  it('Bild füllt den Workspace (Cover, beschnitten); Größe/Position gesperrt', () => {
    const onImageBoundsChange = vi.fn()
    const m = createManager({ onImageBoundsChange })
    m.start(imgs(), { backgroundMode: 'workspace' })
    expect(m.isFittedToWorkspace()).toBe(true)
    const a = m.activeImages[0]
    expect(a.slideshow.clipRect.relX).toBeCloseTo(WS_REL.relX)
    expect(a.slideshow.clipRect.relWidth).toBeCloseTo(WS_REL.relWidth)
    // Cover: 2:1 im hohen Workspace → Höhe = Workspace-Höhe
    expect(a.relHeight).toBeCloseTo(WS_REL.relHeight)
    expect(a.relWidth).toBeGreaterThan(WS_REL.relWidth)

    const before = { relX: a.relX, relY: a.relY, relWidth: a.relWidth, relHeight: a.relHeight }
    expect(m.setImageSize(imgA, { width: 0.2 })).toBeNull()
    expect(m.setImagePosition(imgA, { centerX: 0.1 })).toBeNull()
    expect({ relX: a.relX, relY: a.relY, relWidth: a.relWidth, relHeight: a.relHeight }).toEqual(
      before,
    )
    expect(m.getImageBounds(imgA)).toBeNull()
    expect(onImageBoundsChange).not.toHaveBeenCalled()
    m.stop()
  })

  it('eigene Größe bleibt beim Wechsel Aus → Workspace → Aus erhalten', () => {
    const m = createManager()
    m.start(imgs(), { backgroundMode: 'none' })
    const a = m.activeImages[0]
    m.setImageSize(imgA, { width: 0.3 })
    m.setImagePosition(imgA, { centerX: 0.25, centerY: 0.75 })
    const own = m.getImageBounds(imgA)

    m.setBackgroundMode('workspace')
    expect(a.relHeight).toBeCloseTo(WS_REL.relHeight) // füllt den Workspace
    expect(m.getEffectiveImageBounds(imgA).relHeight).toBeCloseTo(WS_REL.relHeight)
    expect(m.getImageBounds(imgA)).toEqual(own) // gemerkt, nur nicht angewendet

    m.setBackgroundMode('none')
    expect(a.relWidth).toBeCloseTo(0.3)
    expect(a.relX + a.relWidth / 2).toBeCloseTo(0.25)
    expect(a.relY + a.relHeight / 2).toBeCloseTo(0.75)
    expect(a.slideshow.clipRect).toBeNull()
    m.stop()
  })

  it('ohne Workspace-Format verhält sich „Workspace“ wie „Aus“ (skalierbar)', () => {
    const m = createManager({ getWorkspaceBounds: () => null })
    m.start(imgs(), { backgroundMode: 'workspace' })
    expect(m.isFittedToWorkspace()).toBe(false)
    expect(m.setImageSize(imgA, { width: 0.4 }).relWidth).toBeCloseTo(0.4)
    expect(m.activeImages[0].relWidth).toBeCloseTo(0.4)
    m.stop()
  })
})
