import { FrameMonitor } from '../lib/postfx/index.js'
import { visualizerState } from '../lib/visualizers/core/state.js'
import { REFERENCE_FRAME_MS } from '../lib/visualizers/core/helpers.js'
import { resolveEffectiveImageId } from '../lib/visualizers/imageRegistry.js'
import { useImageGallery } from './useImageGallery.js'
import { ensureSizedCanvas } from './renderLoop/canvasCache.js'
import { ensurePostProcessor } from './renderLoop/postFx.js'
import { createBeatPunch } from './renderLoop/beatPunch.js'
import { createMultiLayerRenderer } from './renderLoop/multiLayerRenderer.js'
import { createSingleVisualizerRenderer } from './renderLoop/singleVisualizerRenderer.js'
import { createSceneRenderer } from './renderLoop/sceneRenderer.js'

/**
 * Render-Schleife des Canvas: pro Frame Audio analysieren, Visualizer rendern
 * (Einzel- oder Multi-Layer-Modus), Szene + Effekte zeichnen, für die Aufnahme
 * einen Snapshot ablegen und zuletzt die Editor-Elemente darüberlegen.
 *
 * Die Einzelteile liegen in `renderLoop/`.
 */
export function useRenderLoop({
  canvasRef,
  canvasManagerInstance,
  multiImageManagerInstance,
  videoManagerInstance,
  gridManagerInstance,
  getTextManager,
  getRecordingCanvas,
  visualizerStore,
  recorderStore,
  playerStore,
  audioSourceStore,
  audioFxStore,
  beatDropStore,
  beatDropRenderer,
  audioFxRenderer,
  tickerStore,
  tickerRenderer,
  markerTransitionRenderer,
  getAnalyser,
  getMicrophoneAnalyser,
  getMicrophoneAudioContext,
  updateGlobalAudioData,
}) {
  let animationFrameId = null
  let drawTimeoutId = null
  let lastDrawTimestamp = null

  let audioDataArray = null // Frequenzdaten, einmal pro Frame gelesen
  let timeDomainArray = null // Zeitdaten, bei Bedarf einmal pro Frame gelesen
  let timeDomainFresh = false // wird in jedem draw() zurückgesetzt

  // Snapshot des fertig zusammengesetzten Live-Frames (nur Inhalt: Hintergrund,
  // Bilder, Visualizer, Videos, Text, Audio-/Beat-/Lauftext-/Marker-Effekte –
  // ohne Editor-Elemente), einmal pro draw() während der Aufnahme erfasst.
  // Der Aufnahme-Redraw nutzt ihn per günstigem drawImage-Ausschnitt, statt die
  // komplette Render-Pipeline ein zweites Mal auszuführen; siehe
  // setupRecordingRedrawListener() und renderRecordingScene() (Fallback für den
  // ersten Tick, bevor ein Live-Frame erfasst wurde).
  let liveSnapshot = null
  let liveSnapshotReady = false

  const imageGallery = useImageGallery()

  // Bild für ein Portrait-Preset: das gewählte, sonst ein Canvas-Bild, sonst die
  // Galerie-Auswahl (siehe resolveEffectiveImageId).
  function effectiveImageId(preferredId) {
    return resolveEffectiveImageId(preferredId, {
      canvasImages: multiImageManagerInstance.value?.getAllImages?.() || [],
      selectedGalleryImage: imageGallery.selectedImage.value,
      galleryImages: imageGallery.imageGallery.value,
    })
  }

  // Beat-Punch: onset-gesteuerter Zoom der gesamten Visualizer-Ebene
  const beatPunch = createBeatPunch(visualizerStore)

  // Momentaufnahme der Onsets pro Band (0–1) in der Form, die onsetFlourish
  // erwartet. Für den visualizerState des Main-Threads und für den Worker
  // (der kein window.audioAnalysisData hat).
  function onsetDataSnapshot() {
    const ad = window.audioAnalysisData
    if (!ad) return null
    return {
      bass: ad.onsetBass ?? 0,
      mid: ad.onsetMid ?? 0,
      treble: ad.onsetTreble ?? 0,
      all: ad.onsetAll ?? 0,
    }
  }

  // Post-Processing (Bloom / Trails) – Main-Thread-Prozessor für den Fallback-
  // Pfad und den Multi-Layer-Modus. Der Worker hat einen eigenen Prozessor.
  let mainPostProcessor = null
  const frameMonitor = new FrameMonitor()

  function ensureMainPostProcessor(w, h) {
    mainPostProcessor = ensurePostProcessor(mainPostProcessor, w, h)
    return mainPostProcessor
  }

  function currentQuality() {
    return visualizerStore.adaptiveQuality ? frameMonitor.qualityLevel : 1
  }

  function getTimeDomainData(analyser, bufferLength) {
    if (!timeDomainArray || timeDomainArray.length !== bufferLength) {
      timeDomainArray = new Uint8Array(bufferLength)
    }
    if (!timeDomainFresh) {
      analyser.getByteTimeDomainData(timeDomainArray)
      timeDomainFresh = true
    }
    return timeDomainArray
  }

  function ensureAudioBuffer(bufferLength) {
    if (!audioDataArray || audioDataArray.length !== bufferLength) {
      audioDataArray = new Uint8Array(bufferLength)
    }
    return audioDataArray
  }

  const rendererDeps = {
    visualizerStore,
    getTimeDomainData,
    effectiveImageId,
    currentQuality,
    ensureMainPostProcessor,
  }
  const multiLayer = createMultiLayerRenderer(rendererDeps)
  const single = createSingleVisualizerRenderer({
    ...rendererDeps,
    getMainPostProcessor: () => mainPostProcessor,
  })

  const scene = createSceneRenderer({
    canvasRef,
    canvasManagerInstance,
    multiImageManagerInstance,
    videoManagerInstance,
    getTextManager,
    drawWithPunch: beatPunch.drawWithPunch,
    effects: {
      audioFxRenderer,
      audioFxStore,
      beatDropRenderer,
      beatDropStore,
      tickerRenderer,
      tickerStore,
    },
  })
  const { renderScene, renderRecordingScene, renderEffects } = scene

  // Hot-Loop-Caches (kein DOM-Query + getContext pro Frame)
  let cachedDomCanvas = null
  let cachedCanvasEl = null
  let cachedCtx = null

  function resolveCanvas() {
    if (!cachedDomCanvas || !cachedDomCanvas.isConnected) {
      cachedDomCanvas = document.querySelector('.canvas-wrapper canvas')
    }
    return cachedDomCanvas || canvasRef.value
  }

  function getContext2D(canvas) {
    if (cachedCanvasEl !== canvas) {
      cachedCanvasEl = canvas
      cachedCtx = canvas.getContext('2d', { desynchronized: true }) || canvas.getContext('2d')
    }
    return cachedCtx
  }

  /** Zeichen-Callback aus dem zuletzt gerenderten Frame (Aufnahme/Screenshot). */
  function buildVisualizerCallback(canvas) {
    if (!visualizerStore.showVisualizer) return null

    const composite = multiLayer.compositeCanvas
    if (visualizerStore.multiLayerMode && composite) {
      return (vizCtx, vizWidth, vizHeight) => {
        if (vizWidth === composite.width && vizHeight === composite.height) {
          vizCtx.drawImage(composite, 0, 0)
        } else {
          vizCtx.drawImage(composite, 0, 0, vizWidth, vizHeight)
        }
      }
    }
    return single.lastFrameCallback()
  }

  // ─── draw(): Schritte eines Frames ──────────────────────────────────────

  function scheduleNextFrame() {
    if (recorderStore.isRecording && document.hidden) {
      drawTimeoutId = setTimeout(draw, 16)
    } else {
      animationFrameId = requestAnimationFrame(draw)
    }
  }

  // Zeit seit dem letzten draw(). Glättung/Abklingen der Visualizer
  // (applySmoothValue, applyDecay) wird darauf normiert, damit sie unabhängig
  // von der tatsächlichen Frame-Rate gleich schnell konvergieren – sonst
  // liefe der Visualizer z. B. beim Echtzeit-Encoding der Aufnahme sichtbar
  // in Zeitlupe.
  function updateFrameDelta(now) {
    const dtMs = lastDrawTimestamp !== null ? now - lastDrawTimestamp : REFERENCE_FRAME_MS
    lastDrawTimestamp = now
    // Absurde Lücken (Tab im Hintergrund, Debugger, erster Frame nach langem
    // Stillstand) ignorieren, damit ein einzelnes großes dt geglättete Werte
    // nicht sofort ans Ziel springen lässt.
    visualizerState._dtMs = dtMs > 0 && dtMs < 250 ? dtMs : REFERENCE_FRAME_MS
  }

  /** Aktiven Analyser bestimmen und (falls Audio läuft) Frequenzdaten lesen. */
  function analyzeAudio() {
    const isMicActive = audioSourceStore.isMicrophoneActive
    const analyser = isMicActive ? getMicrophoneAnalyser() : getAnalyser()
    const audioRunning = playerStore.isPlaying || recorderStore.isRecording || isMicActive

    if (isMicActive) {
      const micCtx = getMicrophoneAudioContext()
      if (micCtx?.state === 'suspended') micCtx.resume()
    }

    if (analyser && audioRunning) {
      const bufferLength = analyser.frequencyBinCount
      analyser.getByteFrequencyData(ensureAudioBuffer(bufferLength))
      updateGlobalAudioData(audioDataArray, bufferLength)
    }
    return { analyser, audioRunning }
  }

  /** Onset-Einstellungen + -Werte auf den geteilten visualizerState legen. */
  function bridgeOnsetState() {
    visualizerState._onsetFx = {
      enabled: visualizerStore.onsetFlourishEnabled,
      strength: visualizerStore.onsetFlourishStrength,
    }
    visualizerState._onsetData = onsetDataSnapshot()
  }

  /** Visualizer dieses Frames rendern; liefert den Zeichen-Callback oder null. */
  function renderVisualizer(canvas, { analyser, audioRunning }) {
    if (!analyser || !visualizerStore.showVisualizer || !audioRunning) return null
    if (visualizerStore.multiLayerMode && visualizerStore.visibleLayers.length > 0) {
      return multiLayer.render(canvas, analyser, ensureAudioBuffer(analyser.frequencyBinCount))
    }
    return single.render(canvas, analyser, audioDataArray)
  }

  /**
   * Nur-Inhalt-Snapshot für den Aufnahme-Redraw – VOR den Editor-Elementen
   * (Auswahl-Handles, Raster, Workspace-Rahmen), damit diese nie im Video landen.
   */
  function captureLiveSnapshot(canvas) {
    if (recorderStore.isRecording) {
      liveSnapshot = ensureSizedCanvas(liveSnapshot, canvas.width, canvas.height)
      liveSnapshot.ctx.drawImage(canvas, 0, 0)
      liveSnapshotReady = true
    } else if (liveSnapshotReady) {
      liveSnapshotReady = false
    }
  }

  /** Editor-Elemente über dem Inhalt (nicht in Aufnahme/Screenshot). */
  function drawEditorOverlay(ctx) {
    const cm = canvasManagerInstance.value
    if (cm) {
      cm.drawFadedTextMarkers(ctx)
      cm.drawInteractiveElements(ctx)
      cm.drawWorkspaceOutline(ctx)
      cm.drawTextSelectionRect(ctx)
      cm.drawTextPositionPreview(ctx)
      if (gridManagerInstance?.value) {
        gridManagerInstance.value.drawGrid(ctx)
      }
    }

    if (multiImageManagerInstance.value?.getSelectedImage()) {
      multiImageManagerInstance.value.drawInteractiveElements(ctx)
    }
  }

  function draw() {
    timeDomainFresh = false
    scheduleNextFrame()

    const now = performance.now()

    // Frame-Takt an den Player melden (präzise Position für Beat-Drop-Marker).
    // Bewusst vor allen frühen Returns, damit Marker auch ohne Canvas laufen.
    playerStore.notifyFrame?.()

    // Messung für adaptive Qualität (günstig; wirkt nur mit aktivem Schalter)
    frameMonitor.tick(now)
    updateFrameDelta(now)

    const canvas = resolveCanvas()
    if (!canvas) return

    if (canvasManagerInstance.value && canvasManagerInstance.value.canvas !== canvas) {
      canvasManagerInstance.value.updateCanvas(canvas)
    }

    if (canvas.width <= 0 || canvas.height <= 0) return

    const ctx = getContext2D(canvas)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const audio = analyzeAudio()
    // Beat-Punch-Hüllkurve einmal pro Frame aus den frischen Onsets fortschreiben
    beatPunch.update()
    bridgeOnsetState()

    const drawVisualizerCallback = renderVisualizer(canvas, audio)

    renderScene(ctx, canvas.width, canvas.height, drawVisualizerCallback)
    renderEffects(ctx, canvas.width, canvas.height)
    // Marker-Crossfade ganz oben, über allem Szeneninhalt (Live-Ziel)
    markerTransitionRenderer?.render(ctx, canvas.width, canvas.height, 'live')

    captureLiveSnapshot(canvas)
    drawEditorOverlay(ctx)
  }

  // ─── Aufnahme ───────────────────────────────────────────────────────────

  /** Live-Snapshot (ggf. Workspace-Ausschnitt) auf das Aufnahme-Canvas skalieren. */
  function drawSnapshotToRecording(recordingCtx, recordingCanvas) {
    const workspaceBounds = canvasManagerInstance.value?.getWorkspaceBounds()
    const hasWorkspace = workspaceBounds && canvasManagerInstance.value?.workspacePreset
    const source = liveSnapshot.canvas

    recordingCtx.clearRect(0, 0, recordingCanvas.width, recordingCanvas.height)
    if (hasWorkspace) {
      recordingCtx.drawImage(
        source,
        workspaceBounds.x,
        workspaceBounds.y,
        workspaceBounds.width,
        workspaceBounds.height,
        0,
        0,
        recordingCanvas.width,
        recordingCanvas.height,
      )
    } else {
      recordingCtx.drawImage(source, 0, 0, recordingCanvas.width, recordingCanvas.height)
    }
  }

  function setupRecordingRedrawListener() {
    window.addEventListener('recorder:forceRedraw', () => {
      const recordingCanvas = getRecordingCanvas()
      if (!recorderStore.isRecording || !recordingCanvas) return

      const recordingCtx = recordingCanvas.getContext('2d')
      if (!recordingCtx) return

      // Schneller Pfad: das Live-Frame, das draw() in diesem Tick bereits
      // komplett gerendert hat, per günstigem Ausschnitt übernehmen – statt die
      // gesamte Szene samt Effekten bei jedem Aufnahme-Tick ein zweites Mal zu
      // rendern (das hat den Canvas während der Aufnahme ausgebremst).
      if (liveSnapshotReady && liveSnapshot) {
        drawSnapshotToRecording(recordingCtx, recordingCanvas)
        return
      }

      // Fallback (nur der erste Tick nach Aufnahmestart, bevor draw() einen
      // Live-Snapshot erfasst hat): vollständiges eigenständiges Rendern.
      const { width, height } = recordingCanvas
      renderRecordingScene(recordingCtx, width, height, buildVisualizerCallback(recordingCanvas))
      renderEffects(recordingCtx, width, height)
      // Marker-Crossfade auch in der Aufnahme rendern (eigenes Ziel)
      markerTransitionRenderer?.render(recordingCtx, width, height, 'rec')
    })
  }

  // ─── Screenshot ─────────────────────────────────────────────────────────

  function exposeGlobals(canvasManagerInst) {
    window.takeCanvasScreenshot = async function (mimeType = 'image/png', quality = 0.9) {
      const canvas = canvasRef.value
      if (!canvas) return null

      // Zielgröße: Workspace-Format, sonst Canvas-Größe
      let targetWidth = canvas.width
      let targetHeight = canvas.height
      if (canvasManagerInst.value?.workspacePreset) {
        const preset =
          canvasManagerInst.value.socialMediaPresets?.[canvasManagerInst.value.workspacePreset]
        if (preset) {
          targetWidth = preset.width
          targetHeight = preset.height
        }
      }

      const { canvas: screenshotCanvas, ctx } = ensureSizedCanvas(null, targetWidth, targetHeight)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      renderRecordingScene(ctx, targetWidth, targetHeight, buildVisualizerCallback(canvas))
      renderEffects(ctx, targetWidth, targetHeight)

      return new Promise((resolve, reject) => {
        screenshotCanvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create screenshot blob'))),
          mimeType,
          mimeType === 'image/png' ? undefined : quality,
        )
      })
    }
  }

  // ─── Lebenszyklus ───────────────────────────────────────────────────────

  // Render-Schleife pausieren, ohne GPU-/Worker-Ressourcen freizugeben – sie
  // kann per draw() sofort fortgesetzt werden (Keep-Alive bei Routenwechsel).
  function stop() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    if (drawTimeoutId) clearTimeout(drawTimeoutId)
    animationFrameId = null
    drawTimeoutId = null
  }

  function cleanup() {
    stop()
    single.dispose()
    if (mainPostProcessor) {
      try {
        mainPostProcessor.dispose()
      } catch {
        // best effort
      }
      mainPostProcessor = null
    }
  }

  return {
    draw,
    stop,
    renderScene,
    renderRecordingScene,
    buildVisualizerCallback,
    setupRecordingRedrawListener,
    exposeGlobals,
    cleanup,
  }
}
