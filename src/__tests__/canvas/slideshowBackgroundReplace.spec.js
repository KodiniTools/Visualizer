// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BackgroundRenderer } from '../../lib/canvasManager/rendering/BackgroundRenderer.js'
import { SelectionManager } from '../../lib/canvasManager/interaction/SelectionManager.js'
import { MultiImageManager } from '../../lib/multiImageManager.js'
import { FotoManager } from '../../lib/fotoManager.js'
import { SlideshowManager } from '../../lib/slideshowManager.js'

afterEach(() => {
  delete window.slideshowManager
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Kontext, der globalAlpha zum Zeitpunkt jedes drawImage() festhält */
function alphaCtx() {
  const alphas = []
  const target = { canvas: { width: 1000, height: 1000 }, globalAlpha: 1, filter: 'none' }
  const ctx = new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k]
      if (k === 'drawImage') return () => alphas.push(t.globalAlpha)
      return () => ({ addColorStop: () => {} })
    },
    set(t, k, v) {
      t[k] = v
      return true
    },
  })
  return { ctx, alphas }
}

function slideshowImage(fotoManager, opacity) {
  const img = {
    id: 1,
    type: 'image',
    imageObject: { width: 100, height: 100 },
    relX: 0.1,
    relY: 0.1,
    relWidth: 0.2,
    relHeight: 0.2,
    slideshow: { active: true, opacity, transitionState: null },
  }
  fotoManager.initializeImageSettings(img)
  return img
}

describe('Slideshow-Deckkraft beim Zeichnen', () => {
  it('Bild-Filter überschreiben die Übergangs-Deckkraft nicht mehr', () => {
    const mgr = new MultiImageManager({ width: 1000, height: 1000 })
    mgr.fotoManager = new FotoManager(() => {})
    const img = slideshowImage(mgr.fotoManager, 0.3)
    img.fotoSettings.opacity = 50
    mgr.images.push(img)
    const { ctx, alphas } = alphaCtx()
    mgr.drawImages(ctx)
    expect(alphas).toHaveLength(1)
    expect(alphas[0]).toBeCloseTo(0.15) // 50 % Bild × 30 % Übergang
  })

  it('Deckkraft 0 (Start des Einblendens) zeichnet unsichtbar', () => {
    const mgr = new MultiImageManager({ width: 1000, height: 1000 })
    mgr.fotoManager = new FotoManager(() => {})
    mgr.images.push(slideshowImage(mgr.fotoManager, 0))
    const { ctx, alphas } = alphaCtx()
    mgr.drawImages(ctx)
    expect(alphas[0]).toBe(0)
  })
})

describe('Neues Slideshow-Bild ohne Aufblitzen', () => {
  function realManager() {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const alphasAtAdd = []
    const mim = new MultiImageManager({ width: 1000, height: 1000 })
    mim.fotoManager = new FotoManager(() => {})
    // Jeder Redraw während des Hinzufügens wird mitgezeichnet
    mim.redrawCallback = () => {
      const { ctx, alphas } = alphaCtx()
      mim.drawImages(ctx)
      alphasAtAdd.push(...alphas)
    }
    return { m: new SlideshowManager(mim, mim.fotoManager), alphasAtAdd }
  }

  it.each(['fade', 'zoomIn', 'blur'])(
    '%s: schon der erste Redraw zeigt das Bild unsichtbar',
    (transition) => {
      const { m, alphasAtAdd } = realManager()
      m.start(
        [
          { imageObject: { width: 100, height: 100 } },
          { imageObject: { width: 100, height: 100 } },
        ],
        {
          transition,
        },
      )
      expect(alphasAtAdd.length).toBeGreaterThan(0)
      expect(alphasAtAdd.every((a) => a === 0)).toBe(true)
      m.stop()
    },
  )

  it('Schieben: Startzustand liegt vor dem ersten Frame fest (außerhalb)', () => {
    const { m } = realManager()
    m.start([{ imageObject: { width: 100, height: 100 } }], { transition: 'slideLeft' })
    const ss = m.activeImages[0].slideshow
    expect(ss.transitionState.translateX).toBe(1)
    m.stop()
  })
})

describe('Slideshow ersetzt den Hintergrund', () => {
  function rendererSetup() {
    const drawn = []
    const manager = {
      background: { type: 'background', imageObject: {} },
      videoBackground: { videoElement: {} },
      workspaceBackground: { type: 'workspaceBackground' },
      workspaceVideoBackground: { videoElement: {} },
      workspacePreset: { id: 'x' },
      backgroundTilesStore: null,
    }
    const r = new BackgroundRenderer(manager)
    r._drawImageBackground = () => drawn.push('image')
    r._drawVideoBackground = () => drawn.push('video')
    r._drawWorkspaceImageBackground = () => drawn.push('workspaceImage')
    r._drawWorkspaceVideoBackground = () => drawn.push('workspaceVideo')
    r.drawBackgroundTiles = () => {}
    const fills = []
    const ctx = {
      canvas: { width: 10, height: 10 },
      save() {},
      restore() {},
      fillRect: (...a) => fills.push([ctx.fillStyle, ...a]),
      fillStyle: '',
    }
    return { r, ctx, drawn, fills, manager }
  }

  function slideshowWith(mode, { active = true, images = 1 } = {}) {
    const m = Object.create(SlideshowManager.prototype)
    m.isActive = active
    m.activeImages = new Array(images).fill({})
    m.config = { backgroundMode: mode }
    return m
  }

  it('ohne Slideshow: alle Hintergründe werden gezeichnet', () => {
    const { r, ctx, drawn } = rendererSetup()
    r.drawBackground(ctx)
    expect(drawn).toEqual(['image', 'video', 'workspaceImage', 'workspaceVideo'])
  })

  it('Canvas-Modus: Hintergrundbild/-video werden ersetzt, Workspace bleibt', () => {
    window.slideshowManager = slideshowWith('canvas')
    const { r, ctx, drawn, fills } = rendererSetup()
    r.drawBackground(ctx)
    expect(drawn).toEqual(['workspaceImage', 'workspaceVideo'])
    expect(fills[0]).toEqual(['#000000', 0, 0, 10, 10])
  })

  it('Workspace-Modus: nur Workspace-Hintergrund wird ersetzt', () => {
    window.slideshowManager = slideshowWith('workspace')
    const { r, ctx, drawn } = rendererSetup()
    r.drawBackground(ctx)
    expect(drawn).toEqual(['image', 'video'])
  })

  it('Modus „keiner“, gestoppt oder ohne Bilder: normaler Hintergrund', () => {
    for (const s of [
      slideshowWith('none'),
      slideshowWith('canvas', { active: false }),
      slideshowWith('workspace', { images: 0 }),
    ]) {
      window.slideshowManager = s
      const { r, ctx, drawn } = rendererSetup()
      r.drawBackground(ctx)
      expect(drawn).toEqual(['image', 'video', 'workspaceImage', 'workspaceVideo'])
    }
  })

  it('Farbhintergrund bleibt auch im Canvas-Modus erhalten', () => {
    window.slideshowManager = slideshowWith('canvas')
    const { r, ctx, manager } = rendererSetup()
    manager.background = '#123456'
    r._drawColorBackground = vi.fn()
    r.drawBackground(ctx)
    expect(r._drawColorBackground).toHaveBeenCalled()
  })

  it('ersetzter Hintergrund ist per Klick nicht auswählbar', () => {
    const background = { type: 'background' }
    const workspaceBackground = { type: 'workspaceBackground' }
    const sel = new SelectionManager({
      background,
      workspaceBackground,
      workspacePreset: { id: 'x' },
      getWorkspaceBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    })
    expect(sel.getObjectAtPos(5, 5)).toBe(workspaceBackground)
    window.slideshowManager = slideshowWith('workspace')
    expect(sel.getObjectAtPos(5, 5)).toBe(background)
    window.slideshowManager = slideshowWith('canvas')
    expect(sel.getObjectAtPos(5, 5)).toBe(workspaceBackground)
  })
})
