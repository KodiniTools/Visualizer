import { drawScaledVisualizer } from '../../lib/visualizers/core/edgeFade'
import { Visualizers } from '../../lib/visualizers/index'
import { visualizerState } from '../../lib/visualizers/core/state'
import { getVisualizerImageSource } from '../../lib/visualizers/imageRegistry'
import { ensureSizedCanvas } from './canvasCache'
import { gateAudioData } from './reactGate'
import { createLayerPunch } from './beatPunch'
import { ensurePostProcessor, applyPostFx } from './postFx'
import { normalizeLedConfig } from '../../lib/visualizers/gl/ledTextSettings'
import { shapeRenderSize } from '../../lib/visualizers/core/visualizerShape'
import type { VisualizerDefinition } from '../../lib/visualizers/core/types'
import type { VisualizerLayer } from '../../stores/visualizer/useVisualizerLayers'
import type { SizedCanvas } from './canvasCache'
import type { ReactGateState } from './reactGate'
import type { RenderPostProcessor } from './postFx'
import type { VisualizerDrawCallback, VisualizerRendererDeps } from './types'

/** Cache eines Layers */
interface LayerCache extends SizedCanvas {
  lastVisualizerId: string | null
  react: ReactGateState
  punchScale?: number
}

/**
 * Multi-Layer-Modus: jeder sichtbare Layer wird in ein eigenes Cache-Canvas
 * gezeichnet (eigene Reaktionsquelle, Onset-Effekte, Post-FX, Beat-Punch) und
 * anschließend mit Blend-Modus, Skalierung und Position zu einem Composite
 * gemischt.
 *
 * `ensureMainPostProcessor` liefert hier das Post-FX des Composites.
 */
export function createMultiLayerRenderer({
  visualizerStore,
  getTimeDomainData,
  effectiveImageId,
  currentQuality,
  ensureMainPostProcessor,
}: VisualizerRendererDeps) {
  // Cache je Layer-ID: { canvas, ctx, lastVisualizerId, react, punchScale }
  const layerCaches = new Map<string, LayerCache>()
  // Post-Processing pro Layer: Trails brauchen je Layer einen eigenen Vorframe-Puffer
  const layerPostProcessors = new Map<string, RenderPostProcessor | null>()
  const layerPunch = createLayerPunch()
  let composite: SizedCanvas | null = null

  /**
   * Cache des Layers; neu nur beim ersten Zeichnen oder bei geänderter Größe.
   * Bleibt über Frames erhalten → visualizer.init() nur bei Wechsel, die
   * Reaktions-Hüllkurve läuft stetig weiter.
   */
  function layerCacheFor(layer: VisualizerLayer, width: number, height: number): LayerCache {
    let cache = layerCaches.get(layer.id)
    if (!cache || cache.canvas.width !== width || cache.canvas.height !== height) {
      cache = { ...ensureSizedCanvas(null, width, height), lastVisualizerId: null, react: {} }
      layerCaches.set(layer.id, cache)
    }
    return cache
  }

  function ensureLayerPostProcessor(layerId: string, width: number, height: number) {
    const proc = ensurePostProcessor(layerPostProcessors.get(layerId), width, height)
    layerPostProcessors.set(layerId, proc)
    return proc
  }

  /** Visualizer des Layers wechseln: alten aufräumen, neuen initialisieren. */
  function switchVisualizer(
    cache: LayerCache,
    layer: VisualizerLayer,
    visualizer: VisualizerDefinition,
    width: number,
    height: number,
  ) {
    if (cache.lastVisualizerId === layer.visualizerId) return
    const previous = cache.lastVisualizerId ? Visualizers[cache.lastVisualizerId] : undefined
    if (previous) {
      try {
        previous.cleanup?.()
      } catch {
        // Aufräumen ist best effort
      }
    }
    visualizer.init?.(width, height)
    cache.lastVisualizerId = layer.visualizerId
  }

  /** Einen Layer in sein Cache-Canvas zeichnen (inkl. Post-FX + Beat-Punch). */
  function renderLayer(
    layer: VisualizerLayer,
    visualizer: VisualizerDefinition,
    analyser: AnalyserNode,
    audioData: Uint8Array,
    bufferLength: number,
    canvasW: number,
    canvasH: number,
  ) {
    // Mit Form im Format der Form rendern (angepasst statt beschnitten)
    const { width, height } = shapeRenderSize(canvasW, canvasH, layer.shape)
    const cache = layerCacheFor(layer, width, height)
    switchVisualizer(cache, layer, visualizer, width, height)

    // Frequenzdaten aus dem Frame; Zeitdaten werden bei Bedarf einmal pro Frame geholt
    const rawAudio = visualizer.needsTimeData
      ? getTimeDomainData(analyser, bufferLength)
      : audioData
    const layerAudio = gateAudioData(rawAudio, layer, cache.react, !!visualizer.needsTimeData)

    visualizerState._imageSource = visualizer.needsImage
      ? getVisualizerImageSource(effectiveImageId(layer.imageId))
      : null
    // LED-Text/-Zahlen: Text und Modus dieses Layers (eigene Glättung je Layer)
    visualizerState._ledText = visualizer.ledText
      ? { ...normalizeLedConfig(layer), key: layer.id }
      : null

    // Onset-Flourishes je Layer: Der eigene Schalter wirkt zusätzlich zum
    // globalen. Nach dem Zeichnen wird der globale Zustand wiederhergestellt,
    // damit die übrigen Layer und der Single-Modus unberührt bleiben.
    const layerFx = visualizerStore.layerEffects(layer)
    const globalFlourish = visualizerState._onsetFlourish
    if (layerFx.onsetFlourishEnabled) {
      visualizerState._onsetFlourish = {
        enabled: true,
        strength: layerFx.onsetFlourishStrength,
      }
    }

    cache.ctx.clearRect(0, 0, width, height)
    cache.ctx.save()
    cache.ctx.globalAlpha = layer.colorOpacity
    try {
      visualizer.draw(
        cache.ctx,
        layerAudio,
        bufferLength,
        width,
        height,
        layer.color,
        layer.opacity,
      )
    } catch (error) {
      console.error(`Layer "${layer.id}" Visualizer Fehler:`, error)
    }
    cache.ctx.restore()
    visualizerState._onsetFlourish = globalFlourish

    // Bloom/Bewegungsspuren dieses Layers auf sein eigenes Canvas anwenden,
    // bevor er in die Gesamtszene gemischt wird.
    applyPostFx(
      () => ensureLayerPostProcessor(layer.id, width, height),
      cache.canvas,
      visualizerStore.layerPostFxConfig(layer),
      currentQuality(),
    )

    // Beat-Punch dieses Layers: Hüllkurve pro Layer fortschreiben.
    cache.punchScale = layerPunch.update(layer.id, layerFx)
  }

  /** Alle Layer-Caches mit Blend-Modus, Skalierung und Position mischen. */
  function compositeLayers(width: number, height: number) {
    const ctx = (composite as SizedCanvas).ctx
    ctx.clearRect(0, 0, width, height)
    for (const layer of visualizerStore.visibleLayers) {
      const cache = layerCaches.get(layer.id)
      if (!cache) continue

      ctx.save()
      ctx.globalCompositeOperation = (layer.blendMode || 'source-over') as GlobalCompositeOperation
      // Layer über drawScaledVisualizer (inkl. Randabblendung); der eigene
      // Beat-Punch des Layers wirkt als zusätzlicher Zoom.
      drawScaledVisualizer(
        ctx,
        cache.canvas,
        cache.canvas.width,
        cache.canvas.height,
        width,
        height,
        {
          scale: layer.scale * (cache.punchScale || 1),
          posX: layer.x,
          posY: layer.y,
          edgeFade: Visualizers[layer.visualizerId]?.edgeFade,
          shape: layer.shape,
        },
      )
      ctx.restore()
    }
  }

  /** Caches, Post-Prozessoren und Hüllkurven entfernter Layer freigeben. */
  function pruneRemovedLayers() {
    const currentLayerIds = new Set(visualizerStore.visualizerLayers.map((l) => l.id))
    for (const layerId of layerCaches.keys()) {
      if (!currentLayerIds.has(layerId)) layerCaches.delete(layerId)
    }
    for (const layerId of layerPostProcessors.keys()) {
      if (currentLayerIds.has(layerId)) continue
      try {
        layerPostProcessors.get(layerId)?.dispose?.()
      } catch {
        // Aufräumen ist best effort
      }
      layerPostProcessors.delete(layerId)
    }
    layerPunch.prune(currentLayerIds)
  }

  /**
   * Rendert alle sichtbaren Layer und liefert den Zeichen-Callback für die Szene.
   * @param canvas - Haupt-Canvas (bestimmt die Größe)
   * @param audioData - Frequenzdaten dieses Frames
   */
  function render(
    canvas: HTMLCanvasElement,
    analyser: AnalyserNode,
    audioData: Uint8Array,
  ): VisualizerDrawCallback {
    const { width, height } = canvas
    const bufferLength = analyser.frequencyBinCount
    composite = ensureSizedCanvas(composite, width, height)

    for (const layer of visualizerStore.visibleLayers) {
      const visualizer = Visualizers[layer.visualizerId]
      if (!visualizer) continue
      renderLayer(layer, visualizer, analyser, audioData, bufferLength, width, height)
    }

    compositeLayers(width, height)

    // Post-processing (Bloom / Trails) über das gesamte Layer-Composite.
    applyPostFx(
      () => ensureMainPostProcessor(width, height),
      composite.canvas,
      visualizerStore.postFxConfig,
      currentQuality(),
    )

    const compositeCanvas = composite.canvas
    const callback: VisualizerDrawCallback = (targetCtx, w, h) => {
      if (w === width && h === height) {
        targetCtx.drawImage(compositeCanvas, 0, 0)
      } else {
        targetCtx.drawImage(compositeCanvas, 0, 0, w, h)
      }
    }

    pruneRemovedLayers()
    return callback
  }

  return {
    render,
    /** Zuletzt gerendertes Composite (für Aufnahme/Screenshot), sonst null. */
    get compositeCanvas() {
      return composite?.canvas ?? null
    },
  }
}
