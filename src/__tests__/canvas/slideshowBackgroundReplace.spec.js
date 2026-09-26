// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  BackgroundRenderer,
  createSlideshowBaseFill,
} from '../../lib/canvasManager/rendering/BackgroundRenderer.js'
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
    // Farbverläufe: Start/Live übernehmen, getrennt pro Fläche
    expect(m.getBaseGradient('canvas').enabled).toBe(false)
    m.applyLiveUpdate(imgs, { workspaceGradient: { enabled: true, color2: '#abcdef' } })
    expect(m.getBaseGradient('workspace')).toMatchObject({ enabled: true, color2: '#abcdef' })
    expect(m.getBaseGradient('canvas').enabled).toBe(false)
    // Flächenbild: Objekt kommt mit Start/Live, Einstellung getrennt je Fläche
    const bg = { width: 5, height: 5 }
    m.applyLiveUpdate(imgs, {
      backgroundImageFill: { enabled: true, fit: 'contain' },
      backgroundImageObject: bg,
    })
    expect(m.getBaseImage('canvas')).toMatchObject({ image: bg, fill: { fit: 'contain' } })
    m.applyLiveUpdate(imgs, { backgroundImageFill: { fit: 'cover' } })
    expect(m.getBaseImage('canvas').image).toBe(bg) // Objekt bleibt
    expect(m.getBaseImage('workspace')).toBeNull()
    // Audio-reaktive Flächenfarbe: Start/Live, getrennt pro Fläche
    m.applyLiveUpdate(imgs, { backgroundFillAudio: { enabled: true, hue: 50 } })
    expect(m.getBaseFillAudio('canvas')).toMatchObject({ enabled: true, hue: 50, brightness: 80 })
    expect(m.getBaseFillAudio('workspace').enabled).toBe(false)
    const copy = m.getBaseGradient('workspace')
    copy.enabled = false
    expect(m.getBaseGradient('workspace').enabled).toBe(true)
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
    m.config = {
      backgroundMode: mode,
      backgroundColor: '#000000',
      workspaceColor: '#000000',
      backgroundGradient: { enabled: false, color2: '#333333', type: 'linear', angle: 90 },
      workspaceGradient: { enabled: false, color2: '#333333', type: 'linear', angle: 90 },
      backgroundFillAudio: { enabled: false, source: 'bass', brightness: 80, hue: 0 },
      workspaceFillAudio: { enabled: false, source: 'bass', brightness: 80, hue: 0 },
      backgroundImageFill: { enabled: false, stock: null, upload: null, fit: 'cover', audio: {} },
      workspaceImageFill: { enabled: false, stock: null, upload: null, fit: 'cover', audio: {} },
    }
    m._baseImages = { canvas: null, workspace: null }
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

  it('Canvas-Modus mit Farbhintergrund + Video: beides wird durch die Fläche ersetzt', () => {
    const show = slideshowWith('canvas')
    show.setBackgroundColor('#00ff00')
    window.slideshowManager = show
    const { r, ctx, drawn, fills, manager } = rendererSetup()
    manager.background = '#123456'
    r._drawColorBackground = vi.fn()
    r.drawBackground(ctx)
    expect(r._drawColorBackground).not.toHaveBeenCalled()
    expect(drawn).not.toContain('video')
    expect(fills).toEqual([['#00ff00', 0, 0, 10, 10]])
  })

  it('Farbverlauf: linear/radial über den Bereich, getrennt pro Fläche', () => {
    const stops = []
    const ctx = {
      createLinearGradient: vi.fn((...a) => ({
        kind: 'linear',
        a,
        addColorStop: (...s) => stops.push(s),
      })),
      createRadialGradient: vi.fn((...a) => ({
        kind: 'radial',
        a,
        addColorStop: (...s) => stops.push(s),
      })),
    }
    const area = { x: 0, y: 0, width: 6, height: 8 } // Diagonale 10 → halbe 5
    expect(createSlideshowBaseFill(ctx, area, '#000000', null)).toBe('#000000')
    const lin = createSlideshowBaseFill(ctx, area, '#000000', {
      enabled: true,
      color2: '#ffffff',
      type: 'linear',
      angle: 0,
    })
    expect(lin.kind).toBe('linear')
    expect(lin.a).toEqual([-2, 4, 8, 4]) // links → rechts durch die Mitte
    expect(stops).toEqual([
      [0, '#000000'],
      [1, '#ffffff'],
    ])
    const rad = createSlideshowBaseFill(ctx, area, '#000000', {
      enabled: true,
      color2: '#ffffff',
      type: 'radial',
      angle: 0,
    })
    expect(rad.a).toEqual([3, 4, 0, 3, 4, 5])

    // Renderer nutzt den Verlauf der jeweiligen Fläche
    const show = slideshowWith('workspace')
    show.setWorkspaceColor('#112233')
    show.setBaseGradient('workspace', { enabled: true, color2: '#445566', type: 'radial' })
    show.setBaseGradient('canvas', { enabled: true, color2: '#999999' })
    expect(show.getBaseGradient('canvas').color2).toBe('#999999')
    window.slideshowManager = show
    const setup = rendererSetup()
    const fills = []
    setup.ctx.createLinearGradient = () => ({ addColorStop() {} })
    setup.ctx.createRadialGradient = (...a) => ({
      a,
      stops: [],
      addColorStop(o, c) {
        this.stops.push([o, c])
      },
    })
    setup.ctx.fillRect = (...a) => fills.push([setup.ctx.fillStyle, ...a])
    setup.manager.getWorkspaceBounds = () => ({ x: 0, y: 0, width: 6, height: 8 })
    setup.r.drawBackground(setup.ctx)
    expect(fills).toHaveLength(1)
    expect(fills[0][0].stops).toEqual([
      [0, '#112233'],
      [1, '#445566'],
    ])
  })

  it('Audio-reaktive Flächenfarbe: einfarbig aufgehellt, ohne Musik unverändert', () => {
    const show = slideshowWith('canvas')
    show.setBackgroundColor('#000000')
    show.setBaseFillAudio('canvas', { enabled: true, brightness: 100, hue: 0 })
    expect(show.getBaseFillAudio('workspace').enabled).toBe(false)
    window.slideshowManager = show
    window.audioAnalysisData = { bass: 0, mid: 0, treble: 0, volume: 0 }
    let setup = rendererSetup()
    setup.r.drawBackground(setup.ctx)
    expect(setup.fills[0][0]).toBe('#000000')

    window.audioAnalysisData = { bass: 255, mid: 0, treble: 0, volume: 0 }
    setup = rendererSetup()
    setup.r.drawBackground(setup.ctx)
    expect(setup.fills[0][0]).toMatch(/^hsl\(0, 0%, (?!0%)/)
    delete window.audioAnalysisData
  })

  it('Eigenes Flächenbild wird über der Farbe gezeichnet (auf den Bereich beschnitten)', () => {
    const show = slideshowWith('workspace')
    const img = { width: 10, height: 10 }
    // ohne Einschalten kein Bild
    show.setBaseImage('workspace', { fit: 'contain' }, img)
    expect(show.getBaseImage('workspace')).toBeNull()
    show.setBaseImage('workspace', { enabled: true })
    expect(show.getBaseImage('workspace').image).toBe(img)
    expect(show.getBaseImage('canvas')).toBeNull()
    window.slideshowManager = show

    const setup = rendererSetup()
    const order = []
    Object.assign(setup.ctx, {
      beginPath() {},
      clip: () => order.push('clip'),
      rect: (...a) => order.push(['rect', ...a]),
      drawImage: (i, ...a) => order.push(['drawImage', i, ...a]),
      filter: 'none',
    })
    setup.ctx.fillRect = (...a) => order.push(['fillRect', ...a])
    setup.manager.getWorkspaceBounds = () => ({ x: 0, y: 0, width: 40, height: 20 })
    setup.r.drawBackground(setup.ctx)
    expect(order).toEqual([
      ['fillRect', 0, 0, 40, 20],
      ['rect', 0, 0, 40, 20],
      'clip',
      ['drawImage', img, 10, 0, 20, 20], // eingepasst, zentriert
    ])

    // Bild entfernen → nur noch Farbe
    show.setBaseImage('workspace', undefined, null)
    expect(show.getBaseImage('workspace')).toBeNull()
  })

  it('Canvas-Modus: Flächenbild liegt über der Flächenfarbe (auch bei Farbhintergrund)', () => {
    const show = slideshowWith('canvas')
    const img = { width: 10, height: 10 }
    show.setBaseImage('canvas', { enabled: true }, img)
    window.slideshowManager = show
    const { r, ctx, manager } = rendererSetup()
    manager.background = '#123456'
    manager.videoBackground = null
    r._drawColorBackground = vi.fn()
    const drawn = []
    Object.assign(ctx, {
      beginPath() {},
      clip() {},
      rect() {},
      filter: 'none',
      drawImage: (i) => drawn.push(i),
    })
    r.drawBackground(ctx)
    expect(r._drawColorBackground).not.toHaveBeenCalled()
    expect(drawn).toEqual([img])

    // ohne Flächenbild bleibt nur die Flächenfarbe
    show.setBaseImage('canvas', { enabled: false })
    drawn.length = 0
    r.drawBackground(ctx)
    expect(drawn).toEqual([])
  })

  it('Canvas-Modus: gewählte Farbe ersetzt auch einen Farbhintergrund', () => {
    const show = slideshowWith('canvas')
    show.setBackgroundColor('#ff0000')
    window.slideshowManager = show
    const { r, ctx, fills, manager } = rendererSetup()
    manager.background = '#ffffff'
    manager.videoBackground = null
    r._drawColorBackground = vi.fn()
    r.drawBackground(ctx)
    expect(r._drawColorBackground).not.toHaveBeenCalled()
    expect(fills).toEqual([['#ff0000', 0, 0, 10, 10]])

    // ohne Slideshow als Hintergrund: normaler Farbhintergrund
    window.slideshowManager = slideshowWith('none')
    r.drawBackground(ctx)
    expect(r._drawColorBackground).toHaveBeenCalledTimes(1)
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
