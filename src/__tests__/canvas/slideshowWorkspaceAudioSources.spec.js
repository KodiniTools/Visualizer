// @vitest-environment jsdom
/**
 * Audio-Quellen im Workspace-Modus der Slideshow:
 * - Fläche (Farbe, Farbverlauf, Bild) reagiert nur auf die gewählte Quelle,
 *   gezeichnet im Workspace-Bereich
 * - eigene Quelle pro Slideshow-Bild beim Start im Workspace-Modus
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BackgroundRenderer } from '../../lib/canvasManager/rendering/BackgroundRenderer.js'
import { SlideshowManager } from '../../lib/slideshowManager.js'
import { MultiImageManager } from '../../lib/multiImageManager.js'
import { FotoManager } from '../../lib/fotoManager.js'
import { resolveSlideshowAudioReactive } from '../../lib/slideshowAudio.js'

const WS = { x: 20, y: 10, width: 40, height: 80 }
const SILENT = {
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  onsetBass: 0,
  onsetMid: 0,
  onsetTreble: 0,
  onsetAll: 0,
}
// Welche Daten eine Quelle „anschlagen“ lassen
const HIT = {
  bass: { bass: 255 },
  mid: { mid: 255 },
  treble: { treble: 255 },
  volume: { volume: 255 },
  dynamic: { mid: 200, treble: 100 },
  bassOnset: { onsetBass: 1 },
  midOnset: { onsetMid: 1 },
  trebleOnset: { onsetTreble: 1 },
  allOnset: { onsetAll: 1 },
}

afterEach(() => {
  delete window.slideshowManager
  delete window.audioAnalysisData
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Slideshow im Workspace-Modus (ohne Bilder-Rendering) */
function workspaceShow() {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const m = new SlideshowManager({ canvas: { width: 100, height: 100 } }, null)
  m.isActive = true
  m.activeImages = [{}]
  m.setBackgroundMode('workspace')
  return m
}

/** Renderer mit Workspace-Format; zeichnet nur Flächen (fillRect/drawImage) mit */
function renderWorkspace() {
  const fills = []
  const images = []
  const manager = {
    background: '#ffffff',
    workspacePreset: { width: 9, height: 16 },
    workspaceBackground: null,
    getWorkspaceBounds: () => ({ ...WS }),
    backgroundTilesStore: null,
  }
  const r = new BackgroundRenderer(manager)
  r._drawColorBackground = () => fills.push(['canvas-color'])
  r.drawBackgroundTiles = () => {}
  const ctx = {
    canvas: { width: 100, height: 100 },
    filter: 'none',
    save() {},
    restore() {},
    beginPath() {},
    clip() {},
    rect() {},
    fillStyle: '',
    fillRect: (...a) => fills.push([ctx.fillStyle, ...a]),
    drawImage: (img, ...a) => images.push({ filter: ctx.filter, rect: a }),
    createLinearGradient: (...a) => ({ kind: 'linear', a, addColorStop() {} }),
    createRadialGradient: (...a) => ({ kind: 'radial', a, addColorStop() {} }),
  }
  r.drawBackground(ctx)
  return { fills, images }
}

describe('Workspace-Modus – Quelle der Fläche', () => {
  it('Canvas-Farbhintergrund bleibt, Fläche liegt im Workspace-Bereich', () => {
    const show = workspaceShow()
    show.setWorkspaceColor('#102030')
    window.slideshowManager = show
    const { fills } = renderWorkspace()
    expect(fills).toEqual([['canvas-color'], ['#102030', 20, 10, 40, 80]])
  })

  // Nicht passende Quelle zuerst: ihr Hüllkurvenzustand ist noch leer → exakt 0
  it('Farbe: nicht gewählte Quellen lassen die Workspace-Fläche unverändert', () => {
    const show = workspaceShow()
    show.setWorkspaceColor('#000000')
    show.setBaseFillAudio('workspace', { enabled: true, source: 'midOnset', brightness: 100 })
    window.slideshowManager = show
    window.audioAnalysisData = { ...SILENT, bass: 255, onsetAll: 1, onsetBass: 1 }
    expect(renderWorkspace().fills[1]).toEqual(['#000000', 20, 10, 40, 80])
  })

  it.each(Object.keys(HIT).filter((s) => s !== 'midOnset'))(
    'Farbe reagiert im Workspace auf %s',
    (source) => {
      const show = workspaceShow()
      show.setWorkspaceColor('#000000')
      show.setBaseFillAudio('workspace', { enabled: true, source, brightness: 100 })
      // Canvas-Fläche hat eine andere Quelle – darf den Workspace nicht beeinflussen
      show.setBaseFillAudio('canvas', { enabled: true, source: 'bass', brightness: 100 })
      window.slideshowManager = show
      window.audioAnalysisData = { ...SILENT, ...HIT[source] }
      const [color, ...rect] = renderWorkspace().fills[1]
      expect(rect).toEqual([20, 10, 40, 80])
      expect(color).toMatch(/^hsl\(0, 0%, /)
      expect(color).not.toBe('hsl(0, 0%, 0%)')
    },
  )

  it.each(['bassOnset', 'trebleOnset', 'allOnset', 'dynamic'])(
    'Farbverlauf (Puls) reagiert im Workspace auf %s',
    (source) => {
      const show = workspaceShow()
      show.setBaseGradient('workspace', {
        enabled: true,
        type: 'radial',
        audio: { enabled: true, source, pulse: 100, rotation: 0 },
      })
      window.slideshowManager = show
      window.audioAnalysisData = { ...SILENT, ...HIT[source] }
      const fill = renderWorkspace().fills[1][0]
      expect(fill.kind).toBe('radial')
      const half = Math.hypot(WS.width, WS.height) / 2
      expect(fill.a[5]).toBeLessThan(half) // Radius zieht sich zusammen
      expect(fill.a.slice(0, 2)).toEqual([40, 50]) // Mitte des Workspace
    },
  )

  it.each(['midOnset', 'allOnset'])('Flächenbild (Zoom) reagiert im Workspace auf %s', (source) => {
    const show = workspaceShow()
    const img = { width: 10, height: 10 }
    show.setBaseImage(
      'workspace',
      { enabled: true, fit: 'contain', audio: { enabled: true, source, zoom: 100, brightness: 0 } },
      img,
    )
    window.slideshowManager = show
    window.audioAnalysisData = { ...SILENT, ...HIT[source] }
    const { images } = renderWorkspace()
    expect(images).toHaveLength(1)
    // eingepasst wären es 40×40; mit Puls-Zoom größer
    expect(images[0].rect[2]).toBeGreaterThan(40)
  })
})

describe('Workspace-Modus – eigene Quelle pro Slideshow-Bild', () => {
  it('Start im Workspace: Bild erhält die eigene Quelle und reagiert nur darauf', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const mim = new MultiImageManager({ width: 1000, height: 1000 })
    mim.fotoManager = new FotoManager(() => {})
    const m = new SlideshowManager(mim, mim.fotoManager, {
      getWorkspaceBounds: () => ({ x: 100, y: 0, width: 400, height: 1000 }),
    })
    const imageObject = { width: 100, height: 100 }
    const images = ['trebleOnset', null].map((audioSource) => ({
      imageObject,
      audioMode: 'pulse',
      audioSource,
      audioReactiveSettings: resolveSlideshowAudioReactive('pulse', {
        applyGlobal: false,
        savedSettings: null,
        source: audioSource,
      }),
    }))
    m.start(images, { backgroundMode: 'workspace' })

    const first = m.activeImages[0]
    expect(m.isBackground()).toBe(true)
    expect(first.slideshow.clipRect).toEqual({ relX: 0.1, relY: 0, relWidth: 0.4, relHeight: 1 })
    const ar = first.fotoSettings.audioReactive
    expect(ar.source).toBe('trebleOnset')
    expect(Object.values(ar.effects).every((fx) => !fx.source)).toBe(true)

    // nur Bass-Onset → neutral; nur Höhen-Onset (eigene Quelle) → Bild pulsiert
    // (frische Kopien: jede Auswertung startet ohne Hüllkurven-Zustand)
    const valuesFor = (data) => {
      window.audioAnalysisData = { ...SILENT, ...data }
      return mim.getAudioReactiveValues(JSON.parse(JSON.stringify(ar))).effects
    }
    const bassHit = valuesFor({ onsetBass: 1 })
    expect(bassHit.scale.scale).toBe(1)
    expect(bassHit.glow.glowBlur).toBe(0)
    const trebleHit = valuesFor({ onsetTreble: 1 })
    expect(trebleHit.scale.scale).toBeGreaterThan(1)
    expect(trebleHit.glow.glowBlur).toBeGreaterThan(0)

    // Bild ohne eigene Quelle behält die Quelle des Presets
    expect(images[1].audioReactiveSettings.source).not.toBe('trebleOnset')
    m.stop()
  })
})

describe('Workspace-Modus – Quelle aus dem Bild-Editor (pausiert, live)', () => {
  function startedWorkspaceShow() {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const mim = new MultiImageManager({ width: 1000, height: 1000 })
    mim.fotoManager = new FotoManager(() => {})
    const m = new SlideshowManager(mim, mim.fotoManager, {
      getWorkspaceBounds: () => ({ x: 100, y: 0, width: 400, height: 1000 }),
    })
    const imageObject = { width: 100, height: 100 }
    const build = (sources) =>
      sources.map((audioSource) => ({
        imageObject,
        audioMode: 'pulse',
        audioSource,
        audioReactiveSettings: resolveSlideshowAudioReactive('pulse', {
          applyGlobal: false,
          savedSettings: null,
          source: audioSource,
        }),
      }))
    m.start(build([null, null]), { backgroundMode: 'workspace' })
    m.pause()
    return { m, mim, build }
  }

  it('neue Quelle gilt sofort für das angezeigte Bild; Workspace-Modus bleibt', () => {
    const { m, mim, build } = startedWorkspaceShow()
    const shown = m.activeImages[0]
    const presetSource = shown.fotoSettings.audioReactive.source
    expect(presetSource).not.toBe('bassOnset')

    // wie SlideshowPanel.updateEditedImage → live-update (preserveLive)
    expect(
      m.applyLiveUpdate(build(['bassOnset', null]), {
        preserveLive: true,
        backgroundMode: 'workspace',
      }),
    ).toBe(true)
    expect(m.activeImages[0]).toBe(shown) // kein Neustart
    expect(m.isPaused).toBe(true)
    expect(m.config.backgroundMode).toBe('workspace')
    expect(shown.slideshow.clipRect).toEqual({ relX: 0.1, relY: 0, relWidth: 0.4, relHeight: 1 })
    expect(shown.fotoSettings.audioReactive.source).toBe('bassOnset')
    expect(m.config.images[1].audioSource).toBeNull()

    // reagiert jetzt auf Bass-Onset, nicht mehr auf andere Quellen
    const scaleFor = (data) => {
      window.audioAnalysisData = { ...SILENT, ...data }
      return mim.getAudioReactiveValues(
        JSON.parse(JSON.stringify(shown.fotoSettings.audioReactive)),
      ).effects.scale.scale
    }
    expect(scaleFor({ onsetBass: 1 })).toBeGreaterThan(1)
    expect(scaleFor({ onsetTreble: 1, onsetAll: 1 })).toBe(1)

    // „Wie Einstellung“: zurück zur Quelle des Presets
    m.applyLiveUpdate(build([null, null]), { preserveLive: true, backgroundMode: 'workspace' })
    expect(shown.fotoSettings.audioReactive.source).toBe(presetSource)
    m.stop()
  })

  it('beim nächsten Einblenden (nächster Durchlauf) behält das Bild die Quelle', () => {
    const { m, build } = startedWorkspaceShow()
    m.applyLiveUpdate(build(['allOnset', 'midOnset']), {
      preserveLive: true,
      backgroundMode: 'workspace',
    })
    m.resume()
    // Bild 2 wird neu hinzugefügt → erhält seine eigene Quelle
    const second = m._addNextImage()
    expect(second.fotoSettings.audioReactive.source).toBe('midOnset')
    expect(second.slideshow.clipRect).toEqual({ relX: 0.1, relY: 0, relWidth: 0.4, relHeight: 1 })
    m.stop()
  })
})
