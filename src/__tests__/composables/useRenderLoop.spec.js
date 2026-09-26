// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

/**
 * Charakterisierungstest für useRenderLoop: protokolliert über mehrere Frames
 * jede Canvas-Operation (alle Canvases, Methodenaufrufe + Property-Zuweisungen)
 * sowie alle Aufrufe an Manager, Renderer, Worker und Post-Processing in
 * exakter Reihenfolge. Die Snapshots sichern Refactorings der Render-Pipeline ab.
 */

const log = []
const L = (...parts) => log.push(parts.map(fmt).join(' '))

function fmt(v) {
  if (v === null) return 'null'
  if (v === undefined) return 'undef'
  if (typeof v === 'number') return String(Math.round(v * 1e4) / 1e4)
  if (typeof v === 'function') return 'fn'
  if (v instanceof Uint8Array) {
    let sum = 0
    for (const x of v) sum += x
    return `u8[${v.length}:${sum}]`
  }
  if (typeof v === 'object') {
    if (v.__label) return `<${v.__label}>`
    if (v.tag) return `<${v.tag}>`
    return JSON.stringify(v, (k, x) =>
      x instanceof Uint8Array
        ? fmt(x)
        : x && typeof x === 'object' && x.__label
          ? `<${x.__label}>`
          : x,
    )
  }
  return String(v)
}

let canvasSeq = 0
function makeCanvas(label, width = 0, height = 0) {
  const canvas = { __label: label, width, height, isConnected: true }
  const state = { __label: `${label}.ctx`, canvas, globalAlpha: 1 }
  const ctx = new Proxy(state, {
    get(t, p) {
      if (p in t) return t[p]
      if (typeof p !== 'string' || p === 'then') return undefined
      return (...args) => {
        L(`${label}.${p}`, ...args)
        if (p.startsWith('create')) {
          const g = `${label}.${p}#${++canvasSeq}`
          return { __label: g, addColorStop: (o, c) => L(`${g}.addColorStop`, o, c) }
        }
        return undefined
      }
    },
    set(t, p, v) {
      t[p] = v
      L(`${label}.${String(p)}=`, v)
      return true
    },
  })
  canvas.getContext = () => ctx
  canvas.toBlob = (cb) => cb({ tag: 'blob' })
  return canvas
}

// ─── Modul-Attrappen ────────────────────────────────────────────────────────

vi.mock('../../lib/visualizers/index.js', async () => {
  // Globaler Zustand, den Visualizer beim Zeichnen lesen (Bild, Onset-Effekte)
  const { visualizerState } = await import('../../lib/visualizers/core/state.js')
  const mk = (id, extra = {}) => ({
    init: (w, h) => L(`viz.${id}.init`, w, h),
    cleanup: () => L(`viz.${id}.cleanup`),
    draw: (ctx, data, len, w, h, color, opacity) =>
      L(
        `viz.${id}.draw`,
        ctx,
        data,
        len,
        w,
        h,
        color,
        opacity,
        visualizerState._imageSource,
        visualizerState._onsetFlourish,
        visualizerState._onsetFx,
        visualizerState._dtMs,
      ),
    ...extra,
  })
  return {
    Visualizers: {
      bars: mk('bars', { edgeFade: 0.1 }),
      wave: mk('wave', { needsTimeData: true }),
      portrait: mk('portrait', { needsImage: true }),
      broken: mk('broken', {
        draw: () => {
          throw new Error('kaputt')
        },
      }),
    },
  }
})

const workerState = { available: false, frameCb: null }
vi.mock('../../lib/workerManager.js', () => ({
  workerManager: {
    initVisualizerWorker: (w, h) => {
      L('worker.init', w, h)
      return Promise.resolve(workerState.available)
    },
    onVisualizerFrame: (cb) => {
      workerState.frameCb = cb
    },
    cleanupVisualizerState: () => L('worker.cleanupState'),
    resizeVisualizerCanvas: (w, h) => L('worker.resize', w, h),
    renderVisualizerFrame: (msg) => L('worker.renderFrame', msg),
    setVisualizerImage: (b) => L('worker.setImage', b),
  },
}))

let procSeq = 0
vi.mock('../../lib/postfx/index.js', () => ({
  createPostProcessor: (w, h) => {
    const id = `proc${++procSeq}`
    L('postfx.create', id, w, h)
    return {
      __label: id,
      width: w,
      height: h,
      apply: (canvas, cfg, q) => L(`${id}.apply`, canvas, cfg, q),
      resize(w2, h2) {
        this.width = w2
        this.height = h2
        L(`${id}.resize`, w2, h2)
      },
      clearHistory: () => L(`${id}.clearHistory`),
      dispose: () => L(`${id}.dispose`),
    }
  },
  shouldRunPostFx: (cfg, q) => !!cfg?.enabled && q >= 0.5,
  FrameMonitor: class {
    constructor() {
      this.qualityLevel = 1
    }
    tick() {}
  },
}))

vi.mock('../../lib/visualizers/imageRegistry.js', () => ({
  getVisualizerImageSource: (id) => (id ? { tag: `src:${id}` } : null),
  resolveEffectiveImageId: (id) => id ?? 'auto-img',
}))

import { useRenderLoop } from '../../composables/useRenderLoop.js'

// ─── Test-Umgebung ──────────────────────────────────────────────────────────

let frame = 0
function makeAnalyser(label, bins = 8) {
  return {
    frequencyBinCount: bins,
    getByteFrequencyData: (arr) => {
      for (let i = 0; i < arr.length; i++) arr[i] = (i * 17 + frame * 31) % 256
    },
    getByteTimeDomainData: (arr) => {
      L(`${label}.getTimeDomain`)
      for (let i = 0; i < arr.length; i++) arr[i] = 128 + ((i + frame) % 5)
    },
  }
}

function makeVisualizerStore(overrides = {}) {
  return {
    showVisualizer: true,
    multiLayerMode: false,
    visibleLayers: [],
    visualizerLayers: [],
    selectedVisualizer: 'bars',
    visualizerScale: 0.8,
    visualizerX: 0.5,
    visualizerY: 0.5,
    visualizerColor: '#ff0000',
    visualizerOpacity: 0.9,
    colorOpacity: 0.7,
    visualizerImageId: null,
    postFxConfig: { enabled: false },
    adaptiveQuality: false,
    beatPunchEnabled: false,
    beatPunchSource: 'bass',
    beatPunchStrength: 50,
    beatPunchVariation: 0,
    onsetFlourishEnabled: false,
    onsetFlourishStrength: 50,
    reactSource: 'spectrum',
    reactStrength: 0,
    layerEffects: (layer) => layer.fx || {},
    layerPostFxConfig: (layer) => layer.postFx || { enabled: false },
    markVisualizerWorking: (id) => L('store.markWorking', id),
    fallbackToLastWorking: () => L('store.fallback'),
    ...overrides,
  }
}

function setup(opts = {}) {
  const main = makeCanvas('main', 400, 200)
  const rec = makeCanvas('rec', 200, 100)
  const workspace = opts.workspace
    ? { bounds: { x: 100, y: 50, width: 200, height: 100 }, preset: 'ig' }
    : null
  const canvasManager = {
    canvas: main,
    workspacePreset: workspace?.preset ?? null,
    socialMediaPresets: { ig: { width: 300, height: 150 } },
    set isRecording(v) {
      L('cm.isRecording=', v)
    },
    get isRecording() {
      return false
    },
    drawScene: (ctx) => L('cm.drawScene', ctx),
    getWorkspaceBounds: () => workspace?.bounds ?? null,
    updateCanvas: (c) => L('cm.updateCanvas', c),
    drawFadedTextMarkers: (ctx) => L('cm.drawFadedTextMarkers', ctx),
    drawInteractiveElements: (ctx) => L('cm.drawInteractiveElements', ctx),
    drawWorkspaceOutline: (ctx) => L('cm.drawWorkspaceOutline', ctx),
    drawTextSelectionRect: (ctx) => L('cm.drawTextSelectionRect', ctx),
    drawTextPositionPreview: (ctx) => L('cm.drawTextPositionPreview', ctx),
  }
  const multiImageManager = {
    drawImages: (ctx, o) => L('mim.drawImages', ctx, o),
    getSelectedImage: () => opts.selectedImage ?? null,
    drawInteractiveElements: (ctx) => L('mim.drawInteractiveElements', ctx),
    getAllImages: () => [],
  }
  const renderer = (name) => ({
    render: (ctx, w, h, data, state) => L(`${name}.render`, ctx, w, h, state),
  })
  const stores = {
    visualizerStore: makeVisualizerStore(opts.visualizer),
    recorderStore: { isRecording: false },
    playerStore: { isPlaying: true, notifyFrame: () => L('player.notifyFrame') },
    audioSourceStore: { isMicrophoneActive: false },
    audioFxStore: { $state: { fx: 1 } },
    beatDropStore: { $state: { bd: 1 } },
    tickerStore: { $state: { tk: 1 } },
  }
  const analyser = makeAnalyser('analyser')
  const micAnalyser = makeAnalyser('mic')
  const micCtx = { state: 'suspended', resume: () => L('mic.resume') }
  const loop = useRenderLoop({
    canvasRef: { value: main },
    canvasManagerInstance: { value: canvasManager },
    multiImageManagerInstance: { value: multiImageManager },
    videoManagerInstance: { value: { drawVideos: (ctx) => L('video.drawVideos', ctx) } },
    gridManagerInstance: { value: { drawGrid: (ctx) => L('grid.drawGrid', ctx) } },
    getTextManager: () => ({ draw: (ctx, w, h) => L('text.draw', ctx, w, h) }),
    getRecordingCanvas: () => rec,
    ...stores,
    beatDropRenderer: renderer('beatDrop'),
    audioFxRenderer: renderer('audioFx'),
    tickerRenderer: renderer('ticker'),
    markerTransitionRenderer: {
      render: (ctx, w, h, target) => L('marker.render', ctx, w, h, target),
    },
    getAnalyser: () => (opts.noAnalyser ? null : analyser),
    getMicrophoneAnalyser: () => micAnalyser,
    getMicrophoneAudioContext: () => micCtx,
    updateGlobalAudioData: (data, len) => L('updateGlobalAudioData', data, len),
  })
  return { loop, main, rec, canvasManager, ...stores }
}

function runFrames(loop, n) {
  for (let i = 0; i < n; i++) {
    frame++
    window.audioAnalysisData = {
      onsetBass: (frame % 3) / 2,
      onsetMid: 0.25,
      onsetTreble: 0.1,
      onsetAll: (frame % 2) * 0.8,
      bass: 0.6,
      mid: 0.4,
      treble: 0.2,
      beat: frame % 2 === 0,
    }
    L(`--- frame ${frame}`)
    loop.draw()
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  log.length = 0
  frame = 0
  canvasSeq = 0
  procSeq = 0
  workerState.available = false
  workerState.frameCb = null
  let t = 1000
  vi.spyOn(performance, 'now').mockImplementation(() => (t += 16))
  vi.spyOn(Date, 'now').mockReturnValue(5000)
  // Deterministischer Zufall (Beat-Punch-Variation)
  let seed = 42
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  })
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.stubGlobal('requestAnimationFrame', () => {
    L('raf')
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', (id) => L('cancelRaf', id))
  const origCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag) =>
    tag === 'canvas' ? makeCanvas(`c${++canvasSeq}`) : origCreate(tag),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete window.audioAnalysisData
  delete window.takeCanvasScreenshot
})

describe('useRenderLoop – Charakterisierung', () => {
  it('ohne Wiedergabe: nur Szene, Effekte und Editor-Elemente', () => {
    const { loop, playerStore } = setup({ selectedImage: { id: 1 } })
    playerStore.isPlaying = false
    runFrames(loop, 1)
    expect(log).toMatchSnapshot()
  })

  it('ohne Analyser zeichnet keinen Visualizer', () => {
    const { loop } = setup({ noAnalyser: true })
    runFrames(loop, 1)
    expect(log).toMatchSnapshot()
  })

  it('Einzel-Visualizer (Main-Thread): Init, Beat-Punch, Post-FX, Reaktionsquelle', async () => {
    const { loop, visualizerStore } = setup()
    Object.assign(visualizerStore, {
      beatPunchEnabled: true,
      beatPunchStrength: 80,
      postFxConfig: { enabled: true, bloom: 0.5 },
      reactSource: 'bass',
      reactStrength: 0.8,
    })
    runFrames(loop, 3)
    await flushPromises()
    expect(log).toMatchSnapshot()
  })

  it('Beat-Punch-Variation je Spalte', () => {
    const { loop, visualizerStore } = setup()
    Object.assign(visualizerStore, {
      beatPunchEnabled: true,
      beatPunchStrength: 100,
      beatPunchVariation: 80,
    })
    runFrames(loop, 3)
    expect(log).toMatchSnapshot()
  })

  it('Visualizer-Wechsel, Größenänderung, Zeitdaten, Portrait-Bild', () => {
    const { loop, visualizerStore, main } = setup()
    visualizerStore.postFxConfig = { enabled: true }
    runFrames(loop, 1)
    visualizerStore.selectedVisualizer = 'wave'
    runFrames(loop, 1)
    main.width = 500
    runFrames(loop, 1)
    visualizerStore.selectedVisualizer = 'portrait'
    visualizerStore.visualizerImageId = 'img7'
    runFrames(loop, 1)
    expect(log).toMatchSnapshot()
  })

  it('Fehler im Visualizer → Fallback', () => {
    const { loop, visualizerStore } = setup()
    visualizerStore.selectedVisualizer = 'broken'
    runFrames(loop, 1)
    expect(log).toMatchSnapshot()
  })

  it('Mikrofon: eigener Analyser, AudioContext wird fortgesetzt', () => {
    const { loop, playerStore, audioSourceStore } = setup()
    playerStore.isPlaying = false
    audioSourceStore.isMicrophoneActive = true
    runFrames(loop, 1)
    expect(log).toMatchSnapshot()
  })

  it('Multi-Layer: Caches, Layer-Effekte, Blend-Modi, Aufräumen', () => {
    const { loop, visualizerStore } = setup()
    const layers = [
      {
        id: 'L1',
        visualizerId: 'bars',
        color: '#111',
        opacity: 0.5,
        colorOpacity: 0.6,
        scale: 1,
        x: 0.4,
        y: 0.6,
        blendMode: 'screen',
        fx: { beatPunchEnabled: true, beatPunchSource: 'all', beatPunchStrength: 70 },
        postFx: { enabled: true, trails: 0.3 },
        reactSource: 'mid',
        reactStrength: 1,
      },
      {
        id: 'L2',
        visualizerId: 'wave',
        color: '#222',
        opacity: 1,
        colorOpacity: 1,
        scale: 0.5,
        x: 0.5,
        y: 0.5,
        fx: { onsetFlourishEnabled: true, onsetFlourishStrength: 90 },
      },
      { id: 'L3', visualizerId: 'gibtsNicht', scale: 1, x: 0, y: 0 },
    ]
    Object.assign(visualizerStore, {
      multiLayerMode: true,
      visibleLayers: layers,
      visualizerLayers: layers,
      postFxConfig: { enabled: true },
    })
    runFrames(loop, 2)
    // Layer 1 wechselt den Visualizer, Layer 2 wird entfernt
    const l1 = { ...layers[0], visualizerId: 'wave', fx: {} }
    visualizerStore.visibleLayers = [l1]
    visualizerStore.visualizerLayers = [l1]
    runFrames(loop, 1)
    expect(log).toMatchSnapshot()
  })

  it('Worker-Pfad: Frame-Nachricht, Bitmap, Portrait-Bild', async () => {
    workerState.available = true
    vi.stubGlobal('createImageBitmap', async (src) => ({
      tag: `bmp:${src.tag}`,
      close: () => L('bmp.close'),
    }))
    const { loop, visualizerStore } = setup()
    visualizerStore.onsetFlourishEnabled = true
    runFrames(loop, 1)
    await flushPromises()
    runFrames(loop, 1)
    workerState.frameCb({
      tag: 'bitmap1',
      width: 400,
      height: 200,
      close: () => L('bitmap1.close'),
    })
    runFrames(loop, 1)
    workerState.frameCb({
      tag: 'bitmap2',
      width: 400,
      height: 200,
      close: () => L('bitmap2.close'),
    })
    visualizerStore.selectedVisualizer = 'portrait'
    visualizerStore.visualizerImageId = 'p1'
    runFrames(loop, 1)
    await flushPromises()
    runFrames(loop, 1)
    loop.cleanup()
    expect(log).toMatchSnapshot()
  })

  it('Aufnahme: Live-Snapshot, Redraw (schnell + Fallback), verstecktes Dokument', () => {
    const { loop, recorderStore } = setup({ workspace: true })
    loop.setupRecordingRedrawListener()
    recorderStore.isRecording = true
    // Fallback: noch kein Live-Snapshot
    window.dispatchEvent(new Event('recorder:forceRedraw'))
    runFrames(loop, 1)
    window.dispatchEvent(new Event('recorder:forceRedraw'))
    // Verstecktes Dokument → setTimeout statt rAF
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    vi.useFakeTimers()
    runFrames(loop, 1)
    hidden.mockRestore()
    loop.stop()
    vi.useRealTimers()
    recorderStore.isRecording = false
    runFrames(loop, 1)
    window.dispatchEvent(new Event('recorder:forceRedraw'))
    expect(log).toMatchSnapshot()
  })

  it('Aufnahme ohne Workspace', () => {
    const { loop, recorderStore } = setup()
    loop.setupRecordingRedrawListener()
    recorderStore.isRecording = true
    window.dispatchEvent(new Event('recorder:forceRedraw'))
    runFrames(loop, 1)
    window.dispatchEvent(new Event('recorder:forceRedraw'))
    expect(log).toMatchSnapshot()
  })

  it('renderRecordingScene / renderScene / buildVisualizerCallback direkt', () => {
    const { loop, visualizerStore } = setup({ workspace: true })
    runFrames(loop, 1)
    const target = makeCanvas('target', 200, 100)
    const cb = loop.buildVisualizerCallback(target)
    loop.renderRecordingScene(target.getContext('2d'), 200, 100, cb)
    loop.renderRecordingScene(target.getContext('2d'), 200, 100, null)
    loop.renderScene(target.getContext('2d'), 200, 100, cb)
    visualizerStore.showVisualizer = false
    expect(loop.buildVisualizerCallback(target)).toBeNull()
    expect(log).toMatchSnapshot()
  })

  it('Screenshot mit Workspace-Format', async () => {
    const { loop, canvasManager } = setup({ workspace: true })
    runFrames(loop, 1)
    loop.exposeGlobals({ value: canvasManager })
    const blob = await window.takeCanvasScreenshot('image/jpeg', 0.8)
    expect(blob).toEqual({ tag: 'blob' })
    expect(log).toMatchSnapshot()
  })

  it('stop und cleanup', () => {
    const { loop, visualizerStore } = setup()
    visualizerStore.postFxConfig = { enabled: true }
    runFrames(loop, 1)
    loop.stop()
    loop.cleanup()
    expect(log).toMatchSnapshot()
  })
})

describe('useRenderLoop – Multi-Layer-Caches', () => {
  function layer(id, visualizerId, extra = {}) {
    return {
      id,
      visualizerId,
      color: '#123',
      opacity: 1,
      colorOpacity: 1,
      scale: 1,
      x: 0.5,
      y: 0.5,
      ...extra,
    }
  }

  function setupLayers(layers) {
    const env = setup()
    Object.assign(env.visualizerStore, {
      multiLayerMode: true,
      visibleLayers: layers,
      visualizerLayers: layers,
    })
    return env
  }

  const drawTargets = (id) =>
    log.filter((l) => l.startsWith(`viz.${id}.draw`)).map((l) => l.split(' ')[1])

  it('bleiben über Frames erhalten: ein Canvas, init() nur einmal', () => {
    const { loop } = setupLayers([layer('A', 'bars'), layer('B', 'wave')])
    runFrames(loop, 4)
    expect(log.filter((l) => l === 'viz.bars.init 400 200')).toHaveLength(1)
    expect(log.filter((l) => l === 'viz.wave.init 400 200')).toHaveLength(1)
    expect(new Set(drawTargets('bars')).size).toBe(1)
    expect(new Set(drawTargets('wave')).size).toBe(1)
    expect(drawTargets('bars')[0]).not.toBe(drawTargets('wave')[0])
  })

  it('Visualizer-Wechsel eines Layers: cleanup() des alten, init() des neuen', () => {
    const env = setupLayers([layer('A', 'bars')])
    runFrames(env.loop, 2)
    log.length = 0
    const switched = [layer('A', 'portrait')]
    env.visualizerStore.visibleLayers = switched
    env.visualizerStore.visualizerLayers = switched
    runFrames(env.loop, 2)
    const lifecycle = log.filter((l) => /\.(init|cleanup)/.test(l))
    expect(lifecycle).toEqual(['viz.bars.cleanup', 'viz.portrait.init 400 200'])
  })

  it('Größenänderung legt den Cache neu an (neues Canvas, erneutes init)', () => {
    const env = setupLayers([layer('A', 'bars')])
    runFrames(env.loop, 1)
    const before = drawTargets('bars')[0]
    env.main.width = 600
    runFrames(env.loop, 2)
    const targets = drawTargets('bars')
    expect(targets[1]).not.toBe(before)
    expect(targets[2]).toBe(targets[1])
    expect(log.filter((l) => l.startsWith('viz.bars.init'))).toEqual([
      'viz.bars.init 400 200',
      'viz.bars.init 600 200',
    ])
  })

  it('Reaktions-Hüllkurve läuft über Frames weiter (kein Reset pro Frame)', () => {
    const reactive = { reactSource: 'bass', reactStrength: 1, reactSmoothing: 90 }
    // Durchgehend: Frames 1–3 mit einer Instanz
    const a = setupLayers([layer('A', 'bars', reactive)])
    runFrames(a.loop, 3)
    const continuous = log
      .filter((l) => l.startsWith('viz.bars.draw'))
      .at(-1)
      .split(' ')[2]
    // Frisch: gleicher Frame 3, aber neue Instanz ohne Vorgeschichte
    log.length = 0
    frame = 2
    const b = setupLayers([layer('A', 'bars', reactive)])
    runFrames(b.loop, 1)
    const fresh = log
      .filter((l) => l.startsWith('viz.bars.draw'))
      .at(-1)
      .split(' ')[2]
    expect(continuous).not.toBe(fresh)
  })
})
