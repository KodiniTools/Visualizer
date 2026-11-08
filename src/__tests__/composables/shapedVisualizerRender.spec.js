// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Form (1:1, 16:9, 2:3, Kreis): Der Visualizer wird im Format der Form
 * gerendert (angepasst statt beschnitten) – im Single- und im Layer-Modus.
 */

const calls = []

vi.mock('../../lib/visualizers/index.js', () => ({
  Visualizers: {
    beams: {
      init: (w, h) => calls.push(['init', w, h]),
      draw: (ctx, data, len, w, h) => calls.push(['draw', w, h]),
    },
  },
}))
vi.mock('../../lib/workerManager', () => ({
  workerManager: {
    initVisualizerWorker: () => Promise.resolve(false),
    cleanupVisualizerState: () => {},
    resizeVisualizerCanvas: () => {},
  },
}))
vi.mock('../../lib/visualizers/imageRegistry.js', () => ({ getVisualizerImageSource: () => null }))
vi.mock('../../stores/historyStore', () => ({ useHistoryStore: () => ({}) }))
vi.mock('../../lib/history/historyRecorder', () => ({
  getHistoryRecorder: () => ({ absorb: (fn) => fn() }),
}))
vi.mock('../../composables/renderLoop/canvasCache.js', () => ({
  ensureSizedCanvas: (entry, width, height) => {
    if (entry && entry.canvas.width === width && entry.canvas.height === height) return entry
    const ctx = new Proxy({}, { get: (t, p) => (p in t ? t[p] : () => {}), set: () => true })
    return { canvas: { width, height }, ctx }
  },
}))

const { createSingleVisualizerRenderer } = await import(
  '../../composables/renderLoop/singleVisualizerRenderer.js'
)
const { createMultiLayerRenderer } = await import(
  '../../composables/renderLoop/multiLayerRenderer.js'
)

const analyser = { frequencyBinCount: 4 }
const audio = new Uint8Array(4)
const canvas = { width: 1920, height: 1080 }
const deps = (visualizerStore) => ({
  visualizerStore,
  getTimeDomainData: () => audio,
  effectiveImageId: () => null,
  currentQuality: () => 1,
  ensureMainPostProcessor: () => null,
  getMainPostProcessor: () => null,
})

/** Ziel-Context, der nur drawImage protokolliert. */
function target() {
  const drawn = []
  const ctx = new Proxy(
    {},
    {
      get: (t, p) => (p === 'drawImage' ? (...a) => drawn.push(a) : p in t ? t[p] : () => {}),
      set: (t, p, v) => ((t[p] = v), true),
    },
  )
  return { ctx, drawn }
}

describe('Single-Modus: Rendern im Format der Form', () => {
  let store
  beforeEach(() => {
    calls.length = 0
    store = {
      selectedVisualizer: 'beams',
      visualizerShape: 'free',
      visualizerScale: 1,
      visualizerX: 0.5,
      visualizerY: 0.5,
      colorOpacity: 1,
      visualizerColor: '#fff',
      visualizerOpacity: 1,
      postFxConfig: {},
      markVisualizerWorking: () => {},
    }
  })

  it('"free" rendert in Canvas-Größe', () => {
    const r = createSingleVisualizerRenderer(deps(store))
    r.render(canvas, analyser, audio)
    expect(calls).toContainEqual(['draw', 1920, 1080])
  })

  it('1:1 rendert quadratisch und zeichnet das ganze Bitmap mittig', () => {
    store.visualizerShape = '1:1'
    const r = createSingleVisualizerRenderer(deps(store))
    const draw = r.render(canvas, analyser, audio)
    expect(calls).toContainEqual(['init', 1080, 1080])
    expect(calls).toContainEqual(['draw', 1080, 1080])

    const { ctx, drawn } = target()
    draw(ctx, 1920, 1080)
    expect(drawn[0].slice(1)).toEqual([0, 0, 1080, 1080, 420, 0, 1080, 1080])
  })

  it('initialisiert den Visualizer beim Formwechsel neu in der neuen Größe', () => {
    const r = createSingleVisualizerRenderer(deps(store))
    r.render(canvas, analyser, audio)
    store.visualizerShape = '2:3'
    r.render(canvas, analyser, audio)
    expect(calls).toContainEqual(['init', 720, 1080])
    expect(calls.at(-1)).toEqual(['draw', 720, 1080])
  })
})

describe('Layer-Modus: Rendern im Format der Form je Layer', () => {
  it('rendert jeden Layer in der Größe seiner Form', () => {
    calls.length = 0
    const layers = [
      { id: 'a', visualizerId: 'beams', shape: 'free', scale: 1, x: 0.5, y: 0.5 },
      { id: 'b', visualizerId: 'beams', shape: 'circle', scale: 1, x: 0.5, y: 0.5 },
    ]
    const store = {
      visibleLayers: layers,
      visualizerLayers: layers,
      postFxConfig: {},
      layerEffects: () => ({}),
      layerPostFxConfig: () => ({}),
    }
    const r = createMultiLayerRenderer(deps(store))
    r.render(canvas, analyser, audio)
    const draws = calls.filter((c) => c[0] === 'draw')
    expect(draws).toEqual([
      ['draw', 1920, 1080],
      ['draw', 1080, 1080],
    ])
  })
})
