import { drawScaledVisualizer } from '../../lib/visualizers/core/edgeFade.js'
import { Visualizers } from '../../lib/visualizers/index.js'
import { workerManager } from '../../lib/workerManager.js'
import { visualizerState } from '../../lib/visualizers/core/state.js'
import { getVisualizerImageSource } from '../../lib/visualizers/imageRegistry.js'
import { useHistoryStore } from '../../stores/historyStore.js'
import { getHistoryRecorder } from '../../lib/history/historyRecorder.js'
import { ensureSizedCanvas } from './canvasCache.js'
import { gateAudioData } from './reactGate.js'
import { applyPostFx } from './postFx.js'

/**
 * Einzel-Visualizer: rendert bevorzugt in einem OffscreenCanvas-Worker (das
 * zuletzt gelieferte ImageBitmap wird eingesetzt), sonst auf dem Main-Thread
 * in ein Cache-Canvas (inkl. Post-FX und automatischem Fallback bei Fehlern).
 *
 * @param {object} deps
 * @param {object} deps.visualizerStore
 * @param {(analyser: AnalyserNode, len: number) => Uint8Array} deps.getTimeDomainData
 * @param {(preferredId: string|null) => string|null} deps.effectiveImageId
 * @param {() => number} deps.currentQuality
 * @param {(w: number, h: number) => object|null} deps.ensureMainPostProcessor
 * @param {() => object|null} deps.getMainPostProcessor - vorhandener Prozessor (ohne Anlegen)
 */
export function createSingleVisualizerRenderer({
  visualizerStore,
  getTimeDomainData,
  effectiveImageId,
  currentQuality,
  ensureMainPostProcessor,
  getMainPostProcessor,
}) {
  let lastVisualizerId = null
  let lastWidth = 0
  let lastHeight = 0

  // OffscreenCanvas-Worker
  let workerInitialized = false
  let workerActive = false
  let workerBitmap = null // letztes ImageBitmap aus dem Worker
  // Portrait-Presets im Worker: der Worker hält eine eigene ImageBitmap-Kopie,
  // die bei jedem Wechsel des gewählten Bildes gesendet wird.
  let workerImageKey = undefined
  let workerImageSeq = 0

  // Main-Thread-Fallback
  let cache = null

  // Reaktionsquelle: Hüllkurve + Scratch-Puffer (Main-Thread, damit Worker-
  // und Fallback-Pfad identische Daten sehen)
  const react = { env: 0, buf: null }

  /** LED-Text/-Zahlen: Konfiguration des Frames (sonst null). */
  function ledTextConfig(visualizer) {
    return visualizer?.ledText ? { key: 'single', ...visualizerStore.ledConfig } : null
  }

  function scaledDrawOptions(visualizer) {
    return {
      scale: visualizerStore.visualizerScale,
      posX: visualizerStore.visualizerX,
      posY: visualizerStore.visualizerY,
      edgeFade: visualizer?.edgeFade,
    }
  }

  function syncWorkerImage(imageId) {
    const key = imageId || null
    if (key === workerImageKey) return
    workerImageKey = key
    const seq = ++workerImageSeq
    const source = getVisualizerImageSource(key)
    if (!source) {
      workerManager.setVisualizerImage(null)
      return
    }
    createImageBitmap(source)
      .then((bitmap) => {
        if (seq !== workerImageSeq) {
          bitmap.close()
          return
        }
        workerManager.setVisualizerImage(bitmap)
      })
      .catch((err) => {
        console.warn('[RenderLoop] Portrait-Bild konnte nicht an den Worker übergeben werden:', err)
      })
  }

  /** Worker einmalig beim ersten Zeichnen starten. */
  function initWorkerOnce(width, height) {
    if (workerInitialized) return
    workerInitialized = true
    workerManager.initVisualizerWorker(width, height).then((ok) => {
      workerActive = ok
      if (ok) {
        workerManager.onVisualizerFrame((bitmap) => {
          if (workerBitmap) workerBitmap.close()
          workerBitmap = bitmap
          visualizerStore.markVisualizerWorking(visualizerStore.selectedVisualizer)
        })
        console.log('[RenderLoop] Visualizer Worker aktiv')
      } else {
        console.log('[RenderLoop] Visualizer Worker nicht verfügbar – Fallback aktiv')
      }
    })
  }

  /** Visualizer- oder Größenwechsel: alten Zustand aufräumen, neu initialisieren. */
  function handleChange(visualizerId, visualizer, width, height) {
    const visualizerChanged = visualizerId !== lastVisualizerId
    const canvasResized = width !== lastWidth || height !== lastHeight
    if (!visualizerChanged && !canvasResized) return

    workerManager.cleanupVisualizerState()
    if (!workerActive && lastVisualizerId && Visualizers[lastVisualizerId]) {
      try {
        Visualizers[lastVisualizerId].cleanup?.()
      } catch {
        // Aufräumen ist best effort
      }
    }
    if (!workerActive) visualizer.init?.(width, height)
    if (canvasResized) workerManager.resizeVisualizerCanvas(width, height)
    // Trail-Verlauf zurücksetzen, damit ein neuer Visualizer / eine neue Größe nicht nachzieht
    const proc = getMainPostProcessor()
    if (proc) {
      try {
        proc.clearHistory()
      } catch {
        // best effort
      }
    }
    lastVisualizerId = visualizerId
    lastWidth = width
    lastHeight = height
  }

  /** Off-thread: Audiodaten an den Worker, das vorige Bitmap einsetzen. */
  function renderInWorker(visualizerId, visualizer, audioData, bufferLength, width, height) {
    if (visualizer.needsImage) syncWorkerImage(effectiveImageId(visualizerStore.visualizerImageId))
    workerManager.renderVisualizerFrame({
      visualizerId,
      audioData,
      bufferLength,
      color: visualizerStore.visualizerColor,
      opacity: visualizerStore.visualizerOpacity,
      colorOpacity: visualizerStore.colorOpacity,
      postFx: visualizerStore.postFxConfig,
      quality: currentQuality(),
      // Onset-Konfiguration + -Werte – der Worker hat einen eigenen
      // visualizerState und kein window, daher pro Frame mitsenden.
      onsetFx: visualizerState._onsetFx,
      onsetData: visualizerState._onsetData,
      // Zeit seit dem letzten draw() – siehe applySmoothValue/applyDecay in core/helpers.js
      dtMs: visualizerState._dtMs,
      // LED-Text/-Zahlen: Text und Modus – nur für diese Visualizer mitsenden
      ...(visualizer.ledText ? { ledText: ledTextConfig(visualizer) } : {}),
    })

    if (!workerBitmap) return null
    const bitmap = workerBitmap
    return (targetCtx, w, h) => {
      drawScaledVisualizer(targetCtx, bitmap, width, height, w, h, scaledDrawOptions(visualizer))
    }
  }

  /** Main-Thread: in das Cache-Canvas zeichnen (Fehler → letzter funktionierender Visualizer). */
  function renderOnMainThread(visualizerId, visualizer, audioData, bufferLength, width, height) {
    cache = ensureSizedCanvas(cache, width, height)
    const ctx = cache.ctx

    visualizerState._imageSource = visualizer.needsImage
      ? getVisualizerImageSource(effectiveImageId(visualizerStore.visualizerImageId))
      : null
    visualizerState._ledText = ledTextConfig(visualizer)
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.globalAlpha = visualizerStore.colorOpacity
    try {
      visualizer.draw(
        ctx,
        audioData,
        bufferLength,
        width,
        height,
        visualizerStore.visualizerColor,
        visualizerStore.visualizerOpacity,
      )
      visualizerStore.markVisualizerWorking(visualizerId)
    } catch (error) {
      console.error(`Visualizer "${visualizerId}" Fehler:`, error)
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)
      // Automatischer Fallback ist keine Nutzer-Bearbeitung → nicht in den Verlauf
      getHistoryRecorder(useHistoryStore()).absorb(() => visualizerStore.fallbackToLastWorking())
    }
    ctx.restore()

    // Post-processing (Bloom / Trails) auf den Visualizer-Cache. Mutiert das
    // Cache-Canvas in-place → Recording/Screenshot erben es.
    applyPostFx(
      () => ensureMainPostProcessor(width, height),
      cache.canvas,
      visualizerStore.postFxConfig,
      currentQuality(),
    )

    const cacheCanvas = cache.canvas
    return (targetCtx, w, h) => {
      drawScaledVisualizer(
        targetCtx,
        cacheCanvas,
        width,
        height,
        w,
        h,
        scaledDrawOptions(visualizer),
      )
    }
  }

  /**
   * Rendert den gewählten Visualizer und liefert den Zeichen-Callback (oder null).
   * @param {HTMLCanvasElement} canvas
   * @param {AnalyserNode} analyser
   * @param {Uint8Array} audioData - Frequenzdaten dieses Frames
   */
  function render(canvas, analyser, audioData) {
    const visualizerId = visualizerStore.selectedVisualizer
    const visualizer = Visualizers[visualizerId]
    if (!visualizer) return null
    const { width, height } = canvas

    initWorkerOnce(width, height)
    handleChange(visualizerId, visualizer, width, height)

    const bufferLength = analyser.frequencyBinCount
    // Frequenzdaten aus dem Frame; Zeitdaten bei Bedarf (einmal pro Frame)
    const rawAudio = visualizer.needsTimeData
      ? getTimeDomainData(analyser, bufferLength)
      : audioData
    const vizAudio = gateAudioData(rawAudio, visualizerStore, react, !!visualizer.needsTimeData)

    return workerActive
      ? renderInWorker(visualizerId, visualizer, vizAudio, bufferLength, width, height)
      : renderOnMainThread(visualizerId, visualizer, vizAudio, bufferLength, width, height)
  }

  /**
   * Callback aus dem zuletzt gerenderten Frame (für Aufnahme/Screenshot):
   * Worker-Bitmap, sonst Cache-Canvas, sonst null.
   */
  function lastFrameCallback() {
    // Randabblendung des aktuell gewählten Visualizers (beim Zeichnen gelesen)
    const currentOptions = () => scaledDrawOptions(Visualizers[visualizerStore.selectedVisualizer])
    // Off-thread: das letzte Frame liegt im Worker-Bitmap, nicht im Cache –
    // Aufnahme/Screenshot müssen es ebenfalls zeichnen.
    if (workerActive && workerBitmap) {
      const bitmap = workerBitmap
      return (targetCtx, width, height) => {
        drawScaledVisualizer(
          targetCtx,
          bitmap,
          bitmap.width,
          bitmap.height,
          width,
          height,
          currentOptions(),
        )
      }
    }
    if (cache) {
      const cacheCanvas = cache.canvas
      return (targetCtx, width, height) => {
        drawScaledVisualizer(
          targetCtx,
          cacheCanvas,
          cacheCanvas.width,
          cacheCanvas.height,
          width,
          height,
          currentOptions(),
        )
      }
    }
    return null
  }

  function dispose() {
    if (workerBitmap) {
      workerBitmap.close()
      workerBitmap = null
    }
  }

  return { render, lastFrameCallback, dispose }
}
