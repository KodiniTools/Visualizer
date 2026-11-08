// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  VISUALIZER_SHAPES,
  normalizeVisualizerShape,
  shapeCropRect,
  shapeRenderSize,
  visualizerShapeOptions,
} from '../../lib/visualizers/core/visualizerShape.js'
import {
  drawScaledVisualizer,
  setEdgeFadeCanvasFactory,
} from '../../lib/visualizers/core/edgeFade.js'
import { useVisualizerStore } from '../../stores/visualizerStore'
import { sanitizeVisualizerSettings } from '../../lib/visualizerPersistence'

/** Context-Stub, der alle Aufrufe protokolliert (jsdom hat keinen 2D-Context). */
function recordingCtx(calls = []) {
  return new Proxy(
    { calls },
    {
      get: (t, prop) => (prop in t ? t[prop] : (...a) => calls.push([prop, ...a])),
      set: (t, prop, v) => ((t[prop] = v), true),
    },
  )
}

const SOURCE = { width: 800, height: 450 }
const drawCall = (ctx) => ctx.calls.find((c) => c[0] === 'drawImage')

describe('shapeCropRect', () => {
  it('liefert bei "free" und unbekannten Formen null (ganze Fläche)', () => {
    expect(shapeCropRect(800, 450, 'free')).toBeNull()
    expect(shapeCropRect(800, 450, 'foo')).toBeNull()
  })

  it('schneidet das größte mittige Rechteck im Seitenverhältnis aus', () => {
    expect(shapeCropRect(800, 450, '1:1')).toEqual({ x: 175, y: 0, w: 450, h: 450 })
    expect(shapeCropRect(800, 450, '16:9')).toEqual({ x: 0, y: 0, w: 800, h: 450 })
    expect(shapeCropRect(800, 450, '2:3')).toEqual({ x: 250, y: 0, w: 300, h: 450 })
    expect(shapeCropRect(800, 450, 'circle')).toEqual({ x: 175, y: 0, w: 450, h: 450 })
    // Hochformat-Canvas: Breite begrenzt
    expect(shapeCropRect(450, 800, '16:9')).toEqual({ x: 0, y: 273.4375, w: 450, h: 253.125 })
  })

  it('ist bei leerer Fläche null', () => {
    expect(shapeCropRect(0, 450, '1:1')).toBeNull()
  })
})

describe('shapeRenderSize', () => {
  it('liefert bei "free" die Canvas-Größe', () => {
    expect(shapeRenderSize(1920, 1080, 'free')).toEqual({ width: 1920, height: 1080 })
  })

  it('liefert die ganzzahlige Größe des Form-Rechtecks', () => {
    expect(shapeRenderSize(1920, 1080, '1:1')).toEqual({ width: 1080, height: 1080 })
    expect(shapeRenderSize(1920, 1080, 'circle')).toEqual({ width: 1080, height: 1080 })
    expect(shapeRenderSize(1920, 1080, '2:3')).toEqual({ width: 720, height: 1080 })
    expect(shapeRenderSize(1920, 1080, '16:9')).toEqual({ width: 1920, height: 1080 })
    // Hochformat: Breite begrenzt, Höhe gerundet (253.125 → 253)
    expect(shapeRenderSize(450, 800, '16:9')).toEqual({ width: 450, height: 253 })
  })

  it('bleibt bei leerer Fläche bei der Canvas-Größe', () => {
    expect(shapeRenderSize(0, 450, '1:1')).toEqual({ width: 0, height: 450 })
  })
})

describe('normalizeVisualizerShape / visualizerShapeOptions', () => {
  it('fällt bei unbekannten oder fehlenden Werten auf "free" zurück', () => {
    expect(normalizeVisualizerShape(undefined)).toBe('free')
    expect(normalizeVisualizerShape('3:4')).toBe('free')
    expect(normalizeVisualizerShape('circle')).toBe('circle')
  })

  it('liefert eine Option je Form mit i18n-Schlüssel', () => {
    const options = visualizerShapeOptions((k) => k)
    expect(options.map((o) => o.value)).toEqual([...VISUALIZER_SHAPES])
    expect(options.map((o) => o.label)).toEqual([
      'visualizer.shape.free',
      'visualizer.shape.r1x1',
      'visualizer.shape.r16x9',
      'visualizer.shape.r2x3',
      'visualizer.shape.circle',
    ])
  })
})

describe('drawScaledVisualizer mit Form', () => {
  beforeEach(() => setEdgeFadeCanvasFactory(() => ({ getContext: () => recordingCtx() })))
  afterEach(() => setEdgeFadeCanvasFactory(null))

  it('"free" zeichnet unverändert die ganze Fläche', () => {
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, SOURCE, 800, 450, 800, 450, {
      scale: 1,
      posX: 0.5,
      posY: 0.5,
      shape: 'free',
    })
    expect(ctx.calls).toEqual([['drawImage', SOURCE, 0, 0]])
  })

  it('1:1 zeichnet nur den mittigen quadratischen Ausschnitt, ohne Clip', () => {
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, SOURCE, 800, 450, 800, 450, {
      scale: 1,
      posX: 0.5,
      posY: 0.5,
      shape: '1:1',
    })
    expect(drawCall(ctx)).toEqual(['drawImage', SOURCE, 175, 0, 450, 450, 175, 0, 450, 450])
    expect(ctx.calls.some((c) => c[0] === 'clip')).toBe(false)
  })

  it('Kreis clippt rund auf den Ausschnitt und folgt Position & Größe', () => {
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, SOURCE, 800, 450, 800, 450, {
      scale: 0.5,
      posX: 0.25,
      posY: 0.5,
      shape: 'circle',
      edgeFade: 'radial',
    })
    // Volles Ziel: x=200-200=0, y=112.5, 400×225 → Ausschnitt 225×225 ab x=87.5
    const ellipse = ctx.calls.find((c) => c[0] === 'ellipse')
    expect(ellipse.slice(1, 5)).toEqual([200, 225, 112.5, 112.5])
    expect(ctx.calls.some((c) => c[0] === 'clip')).toBe(true)
    expect(drawCall(ctx)).toEqual(['drawImage', SOURCE, 175, 0, 450, 450, 87.5, 112.5, 225, 225])
    // Kontext wird wiederhergestellt
    expect(ctx.calls.at(-1)[0]).toBe('restore')
  })

  it('zeichnet eine im Format gerenderte Quelle vollständig – angepasst statt beschnitten', () => {
    const square = { width: 450, height: 450 }
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, square, 450, 450, 800, 450, {
      scale: 1,
      posX: 0.5,
      posY: 0.5,
      shape: '1:1',
    })
    expect(drawCall(ctx)).toEqual(['drawImage', square, 0, 0, 450, 450, 175, 0, 450, 450])
  })

  it('setzt eine Hochformat-Quelle (2:3) mittig und folgt Position & Größe', () => {
    const portrait = { width: 300, height: 450 }
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, portrait, 300, 450, 800, 450, {
      scale: 0.5,
      posX: 0.75,
      posY: 0.5,
      shape: '2:3',
    })
    // Skaliertes Ziel: 400×225 ab x=400, y=112.5 → 2:3-Rechteck 150×225 ab x=525
    expect(drawCall(ctx)).toEqual(['drawImage', portrait, 0, 0, 300, 450, 525, 112.5, 150, 225])
  })

  it('skaliert den Ausschnitt mit, wenn Ziel- und Render-Größe abweichen', () => {
    const ctx = recordingCtx()
    drawScaledVisualizer(ctx, SOURCE, 800, 450, 1600, 900, {
      scale: 1,
      posX: 0.5,
      posY: 0.5,
      shape: '2:3',
    })
    expect(drawCall(ctx)).toEqual(['drawImage', SOURCE, 250, 0, 300, 450, 500, 0, 600, 900])
  })
})

describe('visualizerStore: Form', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    store = useVisualizerStore()
  })

  it('startet mit "free" und übernimmt nur gültige Formen', () => {
    expect(store.visualizerShape).toBe('free')
    store.setVisualizerShape('16:9')
    expect(store.visualizerShape).toBe('16:9')
    store.setVisualizerShape('quatsch')
    expect(store.visualizerShape).toBe('free')
  })

  it('gilt pro Layer und wird zwischen Single-Modus und Layer synchronisiert', () => {
    store.setVisualizerShape('circle')
    store.setMultiLayerMode(true)
    const first = store.visualizerLayers[0]
    expect(first.shape).toBe('circle')

    const second = store.addLayer('bars')
    expect(second.shape).toBe('free')
    expect(store.updateLayerProperty(second.id, 'shape', '2:3')).toBe(true)
    expect(second.shape).toBe('2:3')
    store.updateLayerProperty(second.id, 'shape', 'oval')
    expect(second.shape).toBe('free')

    store.updateLayerProperty(second.id, 'shape', '1:1')
    store.syncSingleModeFromLayer()
    expect(store.visualizerShape).toBe('1:1')
  })

  it('Layer ohne Feld (ältere Daten) werden als "free" übernommen', () => {
    store.addLayer('bars')
    delete store.visualizerLayers[0].shape
    store.syncSingleModeFromLayer()
    expect(store.visualizerShape).toBe('free')
  })
})

describe('Persistenz: Form', () => {
  it('verwirft unbekannte Formen beim Laden', () => {
    const current = { visualizerShape: 'free', visualizerLayers: [] }
    expect(sanitizeVisualizerSettings({ visualizerShape: '2:3' }, current).visualizerShape).toBe(
      '2:3',
    )
    expect(sanitizeVisualizerSettings({ visualizerShape: 'x' }, current).visualizerShape).toBe(
      'free',
    )
  })
})
