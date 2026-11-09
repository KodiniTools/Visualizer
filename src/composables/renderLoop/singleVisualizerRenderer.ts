import { drawScaledVisualizer } from '../../lib/visualizers/core/edgeFade'
import { Visualizers } from '../../lib/visualizers/index'
import { workerManager } from '../../lib/workerManager'
import { visualizerState } from '../../lib/visualizers/core/state'
import { getVisualizerImageSource } from '../../lib/visualizers/imageRegistry'
import { useHistoryStore } from '../../stores/historyStore'
import { getHistoryRecorder } from '../../lib/history/historyRecorder'
import { ensureSizedCanvas } from './canvasCache'
import { gateAudioData } from './reactGate'
import { applyPostFx } from './postFx'
import { shapeRenderSize } from '../../lib/visualizers/core/visualizerShape'
import type { VisualizerDefinition } from '../../lib/visualizers/core/types'
import type { SizedCanvas } from './canvasCache'
import type { ReactGateState } from './reactGate'
import type { RenderPostProcessor } from './postFx'
import type { VisualizerDrawCallback, VisualizerRendererDeps } from './types'

/** Abhängigkeiten des Einzel-Renderers */
export interface SingleVisualizerRendererDeps extends VisualizerRendererDeps {
  /** vorhandener Prozessor (ohne Anlegen) */
  getMainPostProcessor: () => RenderPostProcessor | null | undefined
}

/**
 * Einzel-Visualizer: rendert bevorzugt in einem OffscreenCanvas-Worker (das
 * zuletzt gelieferte ImageBitmap wird eingesetzt), sonst auf dem Main-Thread
 * in ein Cache-Canvas (inkl. Post-FX und automatischem Fallback bei Fehlern).
 */
export function createSingleVisualizerRenderer({
  visualizerStore,
  getTimeDomainData,
  effectiveImageId,
  currentQuality,
  ensureMainPostProcessor,
  getMainPostProcessor,
}: SingleVisualizerRendererDeps) {
  let lastVisualizerId: string | null = null
  let lastWidth = 0
  let lastHeight = 0

  // OffscreenCanvas-Worker
  let workerInitialized = false
  let workerActive = false
  let workerBitmap: ImageBitmap | null = null // letztes ImageBitmap aus dem Worker
  // Portrait-Presets im Worker: der Worker hält eine eigene ImageBitmap-Kopie,
  // die bei jedem Wechsel des gewählten Bildes gesendet wird.
  let workerImageKey: string | null | undefined = undefined
  let workerImageSeq = 0

  // Main-Thread-Fallback
  let cache: SizedCanvas | null = null

  // Reaktionsquelle: Hüllkurve + Scratch-Puffer (Main-Thread, damit Worker-
  // und Fallback-Pfad identische Daten sehen)
  const react: ReactGateState = { env: 0, buf: null }

  /** LED-Text/-Zahlen: Konfiguration des Frames (sonst null). */
  function ledTextConfig(visualizer: VisualizerDefinition | null | undefined) {
    return visualizer?.ledText ? { key: 'single', ...visualizerStore.ledConfig } : null
  }

  function scaledDrawOptions(visualizer: VisualizerDefinition | null | undefined) {
    return {
      scale: visualizerStore.visualizerScale,
      posX: visualizerStore.visualizerX,
      posY: visualizerStore.visualizerY,
      edgeFade: visualizer?.edgeFade,
      shape: visualizerStore.visualizerShape,
    }
  }

  function syncWorkerImage(imageId: string | null) {
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
      .catch((err: unknown) => {
        console.warn('[RenderLoop] Portrait-Bild konnte nicht an den Worker übergeben werden:', err)
      })
  }

  /** Worker einmalig beim ersten Zeichnen starten. */
  function initWorkerOnce(width: number, height: number) {
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
  function handleChange(
    visualizerId: string,
    visualizer: VisualizerDefinition,
    width: number,
    height: number,
  ) {
    const visualizerChanged = visualizerId !== lastVisualizerId
    const canvasResized = width !== lastWidth || height !== lastHeight
    if (!visualizerChanged && !canvasResized) return

    workerManager.cleanupVisualizerState()
    const previous = lastVisualizerId ? Visualizers[lastVisualizerId] : undefined
    if (!workerActive && previous) {
      try {
        previous.cleanup?.()
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
  function renderInWorker(
    visualizerId: string,
    visualizer: VisualizerDefinition,
    audioData: Uint8Array,
    bufferLength: number,
    width: number,
    height: number,
  ): VisualizerDrawCallback | null {
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
      // Bitmap-Maße statt Render-Größe: direkt nach einem Form- oder
      // Größenwechsel kann noch ein Frame in der alten Größe anliegen.
      drawScaledVisualizer(
        targetCtx,
        bitmap,
        bitmap.width || width,
        bitmap.height || height,
        w,
        h,
        scaledDrawOptions(visualizer),
      )
    }
  }

  /** Main-Thread: in das Cache-Canvas zeichnen (Fehler → letzter funktionierender Visualizer). */
  function renderOnMainThread(
    visualizerId: string,
    visualizer: VisualizerDefinition,
    audioData: Uint8Array,
    bufferLength: number,
    width: number,
    height: number,
  ): VisualizerDrawCallback {
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
   * @param audioData - Frequenzdaten dieses Frames
   */
  function render(
    canvas: HTMLCanvasElement,
    analyser: AnalyserNode,
    audioData: Uint8Array,
  ): VisualizerDrawCallback | null {
    const visualizerId = visualizerStore.selectedVisualizer
    const visualizer = Visualizers[visualizerId]
    if (!visualizer) return null
    // Mit Form (1:1, 16:9, 2:3, Kreis) direkt im Format der Form rendern,
    // damit sich der Visualizer daran anpasst statt beschnitten zu werden.
    const { width, height } = shapeRenderSize(
      canvas.width,
      canvas.height,
      visualizerStore.visualizerShape,
    )

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
  function lastFrameCallback(): VisualizerDrawCallback | null {
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
