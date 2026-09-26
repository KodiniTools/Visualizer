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

describe('SlideshowManager – Farbe der Fläche', () => {
  it('Standard Schwarz, gültige Farbe übernehmen, ungültige ignorieren; start/live', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const mim = new MultiImageManager({ width: 1000, height: 1000 })
    mim.fotoManager = new FotoManager(() => {})
    const m = new SlideshowManager(mim, mim.fotoManager)
    expect(m.getBackgroundColor()).toBe('#000000')
    m.setBackgroundColor('#ABCDEF')
    expect(m.getBackgroundColor()).toBe('#abcdef')
    m.setBackgroundColor('url(javascript:x)')
    expect(m.getBackgroundColor()).toBe('#abcdef')
    const imgs = [{ imageObject: { width: 10, height: 10 } }]
    m.start(imgs, { backgroundColor: '#112233' })
    expect(m.getBackgroundColor()).toBe('#112233')
    m.applyLiveUpdate(imgs, { backgroundColor: '#445566' })
    expect(m.getBackgroundColor()).toBe('#445566')
    // Workspace-Fläche getrennt
    expect(m.getWorkspaceColor()).toBe('#000000')
    m.applyLiveUpdate(imgs, { workspaceColor: '#778899' })
    expect(m.getWorkspaceColor()).toBe('#778899')
    expect(m.getBaseColor('workspace')).toBe('#778899')
    expect(m.getBaseColor('canvas')).toBe('#445566')
    m.setWorkspaceColor('nope')
    expect(m.getWorkspaceColor()).toBe('#778899')
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
    m.config = { backgroundMode: mode, backgroundColor: '#000000', workspaceColor: '#000000' }
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

  it('Fläche nimmt die eingestellte Farbe an (Canvas ganz, Workspace im Bereich)', () => {
    const canvasShow = slideshowWith('canvas')
    canvasShow.setBackgroundColor('#336699')
    window.slideshowManager = canvasShow
    let setup = rendererSetup()
    setup.r.drawBackground(setup.ctx)
    expect(setup.fills).toEqual([['#336699', 0, 0, 10, 10]])

    // Workspace: eigene Farbe, unabhängig von der Canvas-Farbe
    const wsShow = slideshowWith('workspace')
    wsShow.setBackgroundColor('#ff0000')
    wsShow.setWorkspaceColor('#00aa00')
    window.slideshowManager = wsShow
    setup = rendererSetup()
    setup.manager.getWorkspaceBounds = () => ({ x: 2, y: 1, width: 4, height: 8 })
    setup.r.drawBackground(setup.ctx)
    expect(setup.drawn).toEqual(['image', 'video'])
    expect(setup.fills).toEqual([['#00aa00', 2, 1, 4, 8]])
  })

  it('Workspace-Fläche auch ohne Workspace-Hintergrundbild', () => {
    const wsShow = slideshowWith('workspace')
    wsShow.setWorkspaceColor('#abcdef')
    window.slideshowManager = wsShow
    const { r, ctx, drawn, fills, manager } = rendererSetup()
    manager.workspaceBackground = null
    manager.workspaceVideoBackground = null
    manager.getWorkspaceBounds = () => ({ x: 1, y: 1, width: 3, height: 3 })
    r.drawBackground(ctx)
    expect(drawn).toEqual(['image', 'video'])
    expect(fills).toEqual([['#abcdef', 1, 1, 3, 3]])

    // ohne Workspace-Format: keine Fläche
    manager.workspacePreset = null
    fills.length = 0
    r.drawBackground(ctx)
    expect(fills).toEqual([])
  })

  it('Canvas-Modus mit Farbhintergrund + Video: Video wird durch die Fläche ersetzt', () => {
    const show = slideshowWith('canvas')
    show.setBackgroundColor('#00ff00')
    window.slideshowManager = show
    const { r, ctx, drawn, fills, manager } = rendererSetup()
    manager.background = '#123456'
    r._drawColorBackground = vi.fn()
    r.drawBackground(ctx)
    expect(r._drawColorBackground).toHaveBeenCalled()
    expect(drawn).not.toContain('video')
    expect(fills).toEqual([['#00ff00', 0, 0, 10, 10]])
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
