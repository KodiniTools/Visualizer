import { drawScaledVisualizer } from '../../lib/visualizers/core/edgeFade.js'
import { Visualizers } from '../../lib/visualizers/index.js'
import { visualizerState } from '../../lib/visualizers/core/state.js'
import { getVisualizerImageSource } from '../../lib/visualizers/imageRegistry.js'
import { ensureSizedCanvas } from './canvasCache.js'
import { gateAudioData } from './reactGate.js'
import { createLayerPunch } from './beatPunch.js'
import { ensurePostProcessor, applyPostFx } from './postFx.js'

/**
 * Multi-Layer-Modus: jeder sichtbare Layer wird in ein eigenes Cache-Canvas
 * gezeichnet (eigene Reaktionsquelle, Onset-Effekte, Post-FX, Beat-Punch) und
 * anschließend mit Blend-Modus, Skalierung und Position zu einem Composite
 * gemischt.
 *
 * @param {object} deps
 * @param {object} deps.visualizerStore
 * @param {(analyser: AnalyserNode, len: number) => Uint8Array} deps.getTimeDomainData
 * @param {(preferredId: string|null) => string|null} deps.effectiveImageId
 * @param {() => number} deps.currentQuality
 * @param {(w: number, h: number) => object|null} deps.ensureMainPostProcessor - Post-FX des Composites
 */
export function createMultiLayerRenderer({
  visualizerStore,
  getTimeDomainData,
  effectiveImageId,
  currentQuality,
  ensureMainPostProcessor,
}) {
  // Cache je Layer-ID: { canvas, ctx, lastVisualizerId, react, punchScale }
  const layerCaches = new Map()
  // Post-Processing pro Layer: Trails brauchen je Layer einen eigenen Vorframe-Puffer
  const layerPostProcessors = new Map()
  const layerPunch = createLayerPunch()
  let composite = null

  // BEKANNTER FEHLER – bewusst unverändert übernommen: Der bisherige Code verglich
  // `cache.width` (existiert nicht) statt `cache.canvas.width`. Dadurch wird jeder
  // Layer-Cache in JEDEM Frame neu angelegt: neues Canvas, visualizer.init() pro
  // Frame, Reaktions-Hüllkurve zurückgesetzt, kein cleanup() beim Visualizer-
  // Wechsel. Die Korrektur (false) ändert das Bild im Multi-Layer-Modus und
  // wird separat umgesetzt.
  const RECREATE_LAYER_CACHE_EVERY_FRAME = true

  function layerCacheFor(layer, width, height) {
    let cache = layerCaches.get(layer.id)
    if (
      RECREATE_LAYER_CACHE_EVERY_FRAME ||
      !cache ||
      cache.canvas.width !== width ||
      cache.canvas.height !== height
    ) {
      cache = { ...ensureSizedCanvas(null, width, height), lastVisualizerId: null, react: {} }
      layerCaches.set(layer.id, cache)
    }
    return cache
  }

  function ensureLayerPostProcessor(layerId, width, height) {
    const proc = ensurePostProcessor(layerPostProcessors.get(layerId), width, height)
    layerPostProcessors.set(layerId, proc)
    return proc
  }

  /** Visualizer des Layers wechseln: alten aufräumen, neuen initialisieren. */
  function switchVisualizer(cache, layer, visualizer, width, height) {
    if (cache.lastVisualizerId === layer.visualizerId) return
    if (cache.lastVisualizerId && Visualizers[cache.lastVisualizerId]) {
      try {
        Visualizers[cache.lastVisualizerId].cleanup?.()
      } catch {
        // Aufräumen ist best effort
      }
    }
    visualizer.init?.(width, height)
    cache.lastVisualizerId = layer.visualizerId
  }

  /** Einen Layer in sein Cache-Canvas zeichnen (inkl. Post-FX + Beat-Punch). */
  function renderLayer(layer, visualizer, analyser, audioData, bufferLength, width, height) {
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
  function compositeLayers(width, height) {
    const ctx = composite.ctx
    ctx.clearRect(0, 0, width, height)
    for (const layer of visualizerStore.visibleLayers) {
      const cache = layerCaches.get(layer.id)
      if (!cache) continue

      ctx.save()
      ctx.globalCompositeOperation = layer.blendMode || 'source-over'
      // Layer über drawScaledVisualizer (inkl. Randabblendung); der eigene
      // Beat-Punch des Layers wirkt als zusätzlicher Zoom.
      drawScaledVisualizer(ctx, cache.canvas, width, height, width, height, {
        scale: layer.scale * (cache.punchScale || 1),
        posX: layer.x,
        posY: layer.y,
        edgeFade: Visualizers[layer.visualizerId]?.edgeFade,
      })
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
   * @param {HTMLCanvasElement} canvas - Haupt-Canvas (bestimmt die Größe)
   * @param {AnalyserNode} analyser
   * @param {Uint8Array} audioData - Frequenzdaten dieses Frames
   */
  function render(canvas, analyser, audioData) {
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
    const callback = (targetCtx, w, h) => {
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
