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

const log: string[] = []
const L = (...parts: unknown[]) => log.push(parts.map(fmt).join(' '))

/** Protokollierte Attrappen tragen ein Etikett (__label) oder einen Tag */
type Labeled = { __label?: string; tag?: string }

function fmt(v: unknown): string {
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
    const o = v as Labeled
    if (o.__label) return `<${o.__label}>`
    if (o.tag) return `<${o.tag}>`
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
/** Canvas-Attrappe: protokolliert jede Kontext-Operation */
interface FakeCanvasEl {
  __label: string
  width: number
  height: number
  isConnected: boolean
  getContext?: () => unknown
  toBlob?: (cb: (blob: unknown) => void) => void
}

function makeCanvas(label: string, width = 0, height = 0): HTMLCanvasElement {
  const canvas: FakeCanvasEl = { __label: label, width, height, isConnected: true }
  const state: Record<string | symbol, unknown> = {
    __label: `${label}.ctx`,
    canvas,
    globalAlpha: 1,
  }
  const ctx = new Proxy(state, {
    get(t, p) {
      if (p in t) return t[p]
      if (typeof p !== 'string' || p === 'then') return undefined
      return (...args: unknown[]) => {
        L(`${label}.${p}`, ...args)
        if (p.startsWith('create')) {
          const g = `${label}.${p}#${++canvasSeq}`
          return {
            __label: g,
            addColorStop: (o: unknown, c: unknown) => L(`${g}.addColorStop`, o, c),
          }
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
  return stub(canvas)
}

// ─── Modul-Attrappen ────────────────────────────────────────────────────────

vi.mock('../../lib/visualizers/index', async () => {
  // Globaler Zustand, den Visualizer beim Zeichnen lesen (Bild, Onset-Effekte)
  const { visualizerState } = await import('../../lib/visualizers/core/state')
  const mk = (id: string, extra: Record<string, unknown> = {}) => ({
    init: (w: number, h: number) => L(`viz.${id}.init`, w, h),
    cleanup: () => L(`viz.${id}.cleanup`),
    draw: (
      ctx: unknown,
      data: unknown,
      len: unknown,
      w: unknown,
      h: unknown,
      color: unknown,
      opacity: unknown,
    ) =>
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

const workerState: { available: boolean; frameCb: ((frame: unknown) => void) | null } = {
  available: false,
  frameCb: null,
}
vi.mock('../../lib/workerManager', () => ({
  workerManager: {
    initVisualizerWorker: (w: number, h: number) => {
      L('worker.init', w, h)
      return Promise.resolve(workerState.available)
    },
    onVisualizerFrame: (cb: (frame: unknown) => void) => {
      workerState.frameCb = cb
    },
    cleanupVisualizerState: () => L('worker.cleanupState'),
    resizeVisualizerCanvas: (w: number, h: number) => L('worker.resize', w, h),
    renderVisualizerFrame: (msg: unknown) => L('worker.renderFrame', msg),
    setVisualizerImage: (b: unknown) => L('worker.setImage', b),
  },
}))

let procSeq = 0
vi.mock('../../lib/postfx/index', () => ({
  createPostProcessor: (w: number, h: number) => {
    const id = `proc${++procSeq}`
    L('postfx.create', id, w, h)
    return {
      __label: id,
      width: w,
      height: h,
      apply: (canvas: unknown, cfg: unknown, q: unknown) => L(`${id}.apply`, canvas, cfg, q),
      resize(w2: number, h2: number) {
        this.width = w2
        this.height = h2
        L(`${id}.resize`, w2, h2)
      },
      clearHistory: () => L(`${id}.clearHistory`),
      dispose: () => L(`${id}.dispose`),
    }
  },
  shouldRunPostFx: (cfg: { enabled?: boolean } | null | undefined, q: number) =>
    !!cfg?.enabled && q >= 0.5,
  FrameMonitor: class {
    declare qualityLevel: number
    constructor() {
      this.qualityLevel = 1
    }
    tick() {}
  },
}))

vi.mock('../../lib/visualizers/imageRegistry', () => ({
  getVisualizerImageSource: (id: string | null) => (id ? { tag: `src:${id}` } : null),
  resolveEffectiveImageId: (id: string | null) => id ?? 'auto-img',
}))

import { getCanvasScreenshot } from '../../lib/canvasScreenshotBridge'
import { useRenderLoop } from '../../composables/useRenderLoop'
import { setAudioAnalysisData } from '../helpers/audioStubs'
import { stub } from '../helpers/canvasStubs'

// ─── Test-Umgebung ──────────────────────────────────────────────────────────

let frame = 0
function makeAnalyser(label: string, bins = 8) {
  return {
    frequencyBinCount: bins,
    getByteFrequencyData: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = (i * 17 + frame * 31) % 256
    },
    getByteTimeDomainData: (arr: Uint8Array) => {
      L(`${label}.getTimeDomain`)
      for (let i = 0; i < arr.length; i++) arr[i] = 128 + ((i + frame) % 5)
    },
  }
}

function makeVisualizerStore(overrides: Record<string, unknown> = {}) {
  return {
    showVisualizer: true,
    multiLayerMode: false,
    visibleLayers: [] as object[],
    visualizerLayers: [] as object[],
    selectedVisualizer: 'bars',
    visualizerScale: 0.8,
    visualizerX: 0.5,
    visualizerY: 0.5,
    visualizerColor: '#ff0000',
    visualizerOpacity: 0.9,
    colorOpacity: 0.7,
    visualizerImageId: null as string | null,
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
    layerEffects: (layer: { fx?: object }) => layer.fx || {},
    layerPostFxConfig: (layer: { postFx?: object }) => layer.postFx || { enabled: false },
    markVisualizerWorking: (id: string) => L('store.markWorking', id),
    fallbackToLastWorking: () => L('store.fallback'),
    ...overrides,
  }
}

function setup(
  opts: {
    workspace?: boolean
    selectedImage?: unknown
    visualizer?: Record<string, unknown>
    noAnalyser?: boolean
    videoPlaying?: boolean
  } = {},
) {
  const main = makeCanvas('main', 400, 200)
  const rec = makeCanvas('rec', 200, 100)
  const workspace = opts.workspace
    ? { bounds: { x: 100, y: 50, width: 200, height: 100 }, preset: { width: 300, height: 150 } }
    : null
  const canvasManager = {
    canvas: main,
    workspacePreset: workspace?.preset ?? null,
    set isRecording(v: boolean) {
      L('cm.isRecording=', v)
    },
    get isRecording() {
      return false
    },
    drawScene: (ctx: unknown) => L('cm.drawScene', ctx),
    getWorkspaceBounds: () => workspace?.bounds ?? null,
    updateCanvas: (c: unknown) => L('cm.updateCanvas', c),
    drawFadedTextMarkers: (ctx: unknown) => L('cm.drawFadedTextMarkers', ctx),
    drawInteractiveElements: (ctx: unknown) => L('cm.drawInteractiveElements', ctx),
    drawWorkspaceOutline: (ctx: unknown) => L('cm.drawWorkspaceOutline', ctx),
    drawTextSelectionRect: (ctx: unknown) => L('cm.drawTextSelectionRect', ctx),
    drawTextPositionPreview: (ctx: unknown) => L('cm.drawTextPositionPreview', ctx),
  }
  const multiImageManager = {
    drawImages: (ctx: unknown, o: unknown) => L('mim.drawImages', ctx, o),
    getSelectedImage: () => opts.selectedImage ?? null,
    drawInteractiveElements: (ctx: unknown) => L('mim.drawInteractiveElements', ctx),
    getAllImages: () => [],
  }
  const renderer = (name: string) => ({
    render: (ctx: unknown, w: unknown, h: unknown, data: unknown, state: unknown) =>
      L(`${name}.render`, ctx, w, h, state),
  })
  const stores = {
    visualizerStore: makeVisualizerStore(opts.visualizer),
    recorderStore: { isRecording: false },
    playerStore: { isPlaying: true, notifyFrame: () => L('player.notifyFrame') },
    audioSourceStore: { isMicrophoneActive: false, analysisInput: 'player' },
    audioFxStore: { $state: { fx: 1 } },
    beatDropStore: { $state: { bd: 1 } },
    tickerStore: { $state: { tk: 1 } },
  }
  const analyser = makeAnalyser('analyser')
  const micAnalyser = makeAnalyser('mic')
  const micCtx = { state: 'suspended', resume: () => L('mic.resume') }
  const loop = useRenderLoop(
    stub({
      canvasRef: { value: main },
      canvasManagerInstance: { value: canvasManager },
      multiImageManagerInstance: { value: multiImageManager },
      videoManagerInstance: { value: { drawVideos: (ctx: unknown) => L('video.drawVideos', ctx) } },
      gridManagerInstance: { value: { drawGrid: (ctx: unknown) => L('grid.drawGrid', ctx) } },
      getTextManager: () => ({
        draw: (ctx: unknown, w: unknown, h: unknown) => L('text.draw', ctx, w, h),
      }),
      getRecordingCanvas: () => rec,
      ...stores,
      beatDropRenderer: renderer('beatDrop'),
      audioFxRenderer: renderer('audioFx'),
      tickerRenderer: renderer('ticker'),
      markerTransitionRenderer: {
        render: (ctx: unknown, w: unknown, h: unknown, target: unknown) =>
          L('marker.render', ctx, w, h, target),
      },
      getAnalyser: () => (opts.noAnalyser ? null : analyser),
      getMicrophoneAnalyser: () => micAnalyser,
      isVideoAudioPlaying: () => !!opts.videoPlaying,
      getMicrophoneAudioContext: () => micCtx,
      updateGlobalAudioData: (data: unknown, len: unknown) => L('updateGlobalAudioData', data, len),
    }),
  )
  return { loop, main, rec, canvasManager, ...stores }
}

function runFrames(loop: ReturnType<typeof useRenderLoop>, n: number) {
  for (let i = 0; i < n; i++) {
    frame++
    setAudioAnalysisData({
      onsetBass: (frame % 3) / 2,
      onsetMid: 0.25,
      onsetTreble: 0.1,
      onsetAll: (frame % 2) * 0.8,
      bass: 0.6,
      mid: 0.4,
      treble: 0.2,
    })
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
  vi.stubGlobal('cancelAnimationFrame', (id: unknown) => L('cancelRaf', id))
  const origCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
    tag === 'canvas' ? makeCanvas(`c${++canvasSeq}`) : origCreate(tag),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  setAudioAnalysisData(null)
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

  it('Analyse über Video-Ton: zeichnet auch ohne laufenden Player', () => {
    const analysed = () => log.some((l) => l.startsWith('updateGlobalAudioData'))
    const { loop, playerStore, audioSourceStore } = setup({ videoPlaying: true })
    playerStore.isPlaying = false

    // Analyse nur über den Player: ein laufendes Video reicht nicht
    runFrames(loop, 1)
    expect(analysed()).toBe(false)

    for (const input of ['video', 'mix']) {
      log.length = 0
      audioSourceStore.analysisInput = input
      runFrames(loop, 1)
      expect(analysed()).toBe(true)
    }
  })

  it('Analyse über Video-Ton: ohne laufendes Video kein Visualizer', () => {
    const { loop, playerStore, audioSourceStore } = setup({ videoPlaying: false })
    playerStore.isPlaying = false
    audioSourceStore.analysisInput = 'video'
    runFrames(loop, 1)
    expect(log.some((l) => l.startsWith('updateGlobalAudioData'))).toBe(false)
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
    vi.stubGlobal('createImageBitmap', async (src: Labeled) => ({
      tag: `bmp:${src.tag}`,
      close: () => L('bmp.close'),
    }))
    const { loop, visualizerStore } = setup()
    visualizerStore.onsetFlourishEnabled = true
    runFrames(loop, 1)
    await flushPromises()
    runFrames(loop, 1)
    workerState.frameCb!({
      tag: 'bitmap1',
      width: 400,
      height: 200,
      close: () => L('bitmap1.close'),
    })
    runFrames(loop, 1)
    workerState.frameCb!({
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
    loop.renderRecordingScene(target.getContext('2d')!, 200, 100, cb)
    loop.renderRecordingScene(target.getContext('2d')!, 200, 100, null)
    loop.renderScene(target.getContext('2d')!, 200, 100, cb)
    visualizerStore.showVisualizer = false
    expect(loop.buildVisualizerCallback(target)).toBeNull()
    expect(log).toMatchSnapshot()
  })

  it('Screenshot mit Workspace-Format', async () => {
    const { loop, canvasManager } = setup({ workspace: true })
    runFrames(loop, 1)
    loop.registerScreenshot(stub({ value: canvasManager }))
    expect(
      (window as unknown as { takeCanvasScreenshot?: unknown }).takeCanvasScreenshot,
    ).toBeUndefined()
    const blob = await getCanvasScreenshot()!('image/jpeg', 0.8)
    expect(blob).toEqual({ tag: 'blob' })
    // Zielgröße = Workspace-Preset (300×150), nicht die Canvas-Größe (400×200)
    expect(log).toContain('c4.clearRect 0 0 300 150')
    expect(log).toMatchSnapshot()
    loop.cleanup()
    expect(getCanvasScreenshot()).toBeNull()
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
  function layer(id: string, visualizerId: string, extra: Record<string, unknown> = {}) {
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

  function setupLayers(layers: object[]) {
    const env = setup()
    Object.assign(env.visualizerStore, {
      multiLayerMode: true,
      visibleLayers: layers,
      visualizerLayers: layers,
    })
    return env
  }

  const drawTargets = (id: string) =>
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
      .at(-1)!
      .split(' ')[2]
    // Frisch: gleicher Frame 3, aber neue Instanz ohne Vorgeschichte
    log.length = 0
    frame = 2
    const b = setupLayers([layer('A', 'bars', reactive)])
    runFrames(b.loop, 1)
    const fresh = log
      .filter((l) => l.startsWith('viz.bars.draw'))
      .at(-1)!
      .split(' ')[2]
    expect(continuous).not.toBe(fresh)
  })
})
