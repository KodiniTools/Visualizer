import { ref } from 'vue'
import { Visualizers } from '../lib/visualizers/index.js'
import { workerManager } from '../lib/workerManager.js'
import { createPostProcessor, shouldRunPostFx, FrameMonitor } from '../lib/postfx/index.js'
import { onsetForSource, advancePunch, punchScale } from '../lib/visualizers/core/onsetReactive.js'
import { visualizerState } from '../lib/visualizers/core/state.js'
import { REFERENCE_FRAME_MS } from '../lib/visualizers/core/helpers.js'
import {
  reactDrive,
  advanceReactEnvelope,
  reactFactor,
  applyReactFactor,
} from '../lib/visualizers/core/reactSource.js'
import {
  getVisualizerImageSource,
  resolveEffectiveImageId,
} from '../lib/visualizers/imageRegistry.js'
import { useImageGallery } from './useImageGallery.js'

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

  const lastSelectedVisualizerId = ref(null)
  const lastCanvasWidth = ref(0)
  const lastCanvasHeight = ref(0)

  let audioDataArray = null // frequency domain data, read once per frame
  let timeDomainArray = null // time domain data, read lazily per frame
  let timeDomainFresh = false // reset each draw() call
  let visualizerCacheCanvas = null
  let visualizerCacheCtx = null
  let layerCacheCanvases = null
  let multiLayerCompositeCanvas = null
  let multiLayerCompositeCtx = null

  let recordingTempCanvas = null
  let recordingTempCtx = null
  let recordingVizCanvas = null
  let recordingVizCtx = null

  // Snapshot of the fully-composited live frame (content only — background,
  // images, visualizer, videos, text, audio/beat/ticker/marker effects — no
  // editor-only UI chrome), captured once per draw() tick while recording.
  // The recording redraw reuses this via a cheap drawImage crop instead of
  // re-running the entire render pipeline a second time; see
  // setupRecordingRedrawListener() and renderRecordingScene() (kept as a
  // fallback for the first tick, before any live frame has been captured).
  let liveSnapshotCanvas = null
  let liveSnapshotCtx = null
  let liveSnapshotReady = false

  // OffscreenCanvas Worker state
  let vizWorkerActive = false
  let vizWorkerBitmap = null // latest ImageBitmap from worker

  // Reaktionsquelle (per Layer / Single): Hüllkurve + Scratch-Puffer für die
  // gegateten Audiodaten. Läuft auf dem Main-Thread, damit Worker- und
  // Fallback-Pfad identische Daten sehen.
  let singleReactEnv = 0
  let singleReactBuf = null

  // Portrait presets in the worker: the worker holds its own ImageBitmap copy,
  // sent whenever the selected image changes.
  let workerImageKey = undefined
  let workerImageSeq = 0
  const imageGallery = useImageGallery()

  // Image for a portrait preset: the chosen one, else canvas image, else the
  // gallery selection (see resolveEffectiveImageId).
  function effectiveImageId(preferredId) {
    return resolveEffectiveImageId(preferredId, {
      canvasImages: multiImageManagerInstance.value?.getAllImages?.() || [],
      selectedGalleryImage: imageGallery.selectedImage.value,
      galleryImages: imageGallery.imageGallery.value,
    })
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

  function gateAudioData(data, source, strength, envHolder, key, bufHolder, bufKey, timeDomain) {
    const src = source || 'spectrum'
    if (src === 'spectrum' || !(strength > 0)) {
      envHolder[key] = 0
      return data
    }
    const drive = reactDrive(src, window.audioAnalysisData)
    const env = advanceReactEnvelope(envHolder[key] || 0, drive, src, visualizerState._dtMs)
    envHolder[key] = env
    const out = applyReactFactor(data, reactFactor(env, strength), bufHolder[bufKey], timeDomain)
    if (out !== data) bufHolder[bufKey] = out
    return out
  }
  let vizWorkerInitialized = false

  // Beat-Punch: onset-driven global zoom of the whole visualizer layer.
  // Envelope advances once per frame; scale is read at each composite site.
  let beatPunchEnv = 0
  let beatPunchScaleValue = 1

  // Snapshot of the per-band onset (0–1) in the shape onsetFlourish expects.
  // Used both to bridge onto the main-thread visualizerState and to send into
  // the OffscreenCanvas worker (which has no window.audioAnalysisData).
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

  // Advances the beat-punch envelope for this frame and caches the scale.
  // Off (or no audio) → resets to a clean 1.0 so the wrapper is a no-op.
  function updateBeatPunch() {
    if (!visualizerStore.beatPunchEnabled) {
      beatPunchEnv = 0
      beatPunchScaleValue = 1
      return
    }
    const onset = onsetForSource(window.audioAnalysisData, visualizerStore.beatPunchSource)
    beatPunchEnv = advancePunch(beatPunchEnv, onset)
    beatPunchScaleValue = punchScale(beatPunchEnv, visualizerStore.beatPunchStrength)
  }

  // Invokes a visualizer draw callback, applying the current beat-punch zoom
  // around the canvas centre. Identity transform when the punch is ~1.0.
  function drawVisualizerWithPunch(cb, ctx, width, height) {
    if (!cb) return
    const s = beatPunchScaleValue
    if (s <= 1.0001) {
      cb(ctx, width, height)
      return
    }
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.scale(s, s)
    ctx.translate(-width / 2, -height / 2)
    cb(ctx, width, height)
    ctx.restore()
  }

  // Post-processing (Bloom / Trails) — main-thread processor for the fallback
  // path and multi-layer mode. The worker owns its own processor.
  let mainPostProcessor = null
  const frameMonitor = new FrameMonitor()

  // Hot-loop caches (avoid per-frame DOM query + getContext)
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

  function ensureMainPostProcessor(w, h) {
    if (!mainPostProcessor) {
      try {
        mainPostProcessor = createPostProcessor(w, h)
      } catch {
        mainPostProcessor = null
      }
    } else if (mainPostProcessor.width !== w || mainPostProcessor.height !== h) {
      try {
        mainPostProcessor.resize(w, h)
      } catch {}
    }
    return mainPostProcessor
  }

  function currentQuality() {
    return visualizerStore.adaptiveQuality ? frameMonitor.qualityLevel : 1
  }

  function renderScene(ctx, canvasWidth, canvasHeight, drawVisualizerCallback) {
    if (canvasManagerInstance.value) {
      canvasManagerInstance.value.drawScene(ctx)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    }

    if (multiImageManagerInstance.value) {
      multiImageManagerInstance.value.drawImages(ctx, { behindVisualizer: true })
    }

    drawVisualizerWithPunch(drawVisualizerCallback, ctx, canvasWidth, canvasHeight)

    if (multiImageManagerInstance.value) {
      multiImageManagerInstance.value.drawImages(ctx, { behindVisualizer: false })
    }

    if (videoManagerInstance.value) {
      videoManagerInstance.value.drawVideos(ctx)
    }

    const textManager = getTextManager()
    if (textManager) textManager.draw(ctx, canvasWidth, canvasHeight)
  }

  function renderRecordingScene(ctx, canvasWidth, canvasHeight, drawVisualizerCallback) {
    const workspaceBounds = canvasManagerInstance.value?.getWorkspaceBounds()
    const hasWorkspace = workspaceBounds && canvasManagerInstance.value?.workspacePreset

    if (hasWorkspace) {
      const mainCanvas = canvasRef.value
      if (!mainCanvas) return

      if (
        !recordingTempCanvas ||
        recordingTempCanvas.width !== mainCanvas.width ||
        recordingTempCanvas.height !== mainCanvas.height
      ) {
        recordingTempCanvas = document.createElement('canvas')
        recordingTempCanvas.width = mainCanvas.width
        recordingTempCanvas.height = mainCanvas.height
        recordingTempCtx = recordingTempCanvas.getContext('2d')
      }

      const tempCtx = recordingTempCtx
      tempCtx.clearRect(0, 0, recordingTempCanvas.width, recordingTempCanvas.height)

      if (canvasManagerInstance.value) {
        canvasManagerInstance.value.isRecording = true
        canvasManagerInstance.value.drawScene(tempCtx)
        canvasManagerInstance.value.isRecording = false
      } else {
        tempCtx.fillStyle = '#ffffff'
        tempCtx.fillRect(0, 0, recordingTempCanvas.width, recordingTempCanvas.height)
      }

      if (multiImageManagerInstance.value) {
        multiImageManagerInstance.value.drawImages(tempCtx, { behindVisualizer: true })
      }

      if (drawVisualizerCallback) {
        tempCtx.save()
        tempCtx.beginPath()
        tempCtx.rect(
          workspaceBounds.x,
          workspaceBounds.y,
          workspaceBounds.width,
          workspaceBounds.height,
        )
        tempCtx.clip()

        if (
          !recordingVizCanvas ||
          recordingVizCanvas.width !== workspaceBounds.width ||
          recordingVizCanvas.height !== workspaceBounds.height
        ) {
          recordingVizCanvas = document.createElement('canvas')
          recordingVizCanvas.width = workspaceBounds.width
          recordingVizCanvas.height = workspaceBounds.height
          recordingVizCtx = recordingVizCanvas.getContext('2d')
        }

        recordingVizCtx.clearRect(0, 0, recordingVizCanvas.width, recordingVizCanvas.height)
        drawVisualizerWithPunch(
          drawVisualizerCallback,
          recordingVizCtx,
          recordingVizCanvas.width,
          recordingVizCanvas.height,
        )
        tempCtx.drawImage(recordingVizCanvas, workspaceBounds.x, workspaceBounds.y)
        tempCtx.restore()
      }

      if (multiImageManagerInstance.value) {
        multiImageManagerInstance.value.drawImages(tempCtx, { behindVisualizer: false })
      }

      if (videoManagerInstance.value) videoManagerInstance.value.drawVideos(tempCtx)

      const textManager = getTextManager()
      if (textManager)
        textManager.draw(tempCtx, recordingTempCanvas.width, recordingTempCanvas.height)

      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      ctx.drawImage(
        recordingTempCanvas,
        workspaceBounds.x,
        workspaceBounds.y,
        workspaceBounds.width,
        workspaceBounds.height,
        0,
        0,
        canvasWidth,
        canvasHeight,
      )
    } else {
      if (canvasManagerInstance.value) {
        canvasManagerInstance.value.isRecording = true
        canvasManagerInstance.value.drawScene(ctx)
        canvasManagerInstance.value.isRecording = false
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      }

      if (multiImageManagerInstance.value) {
        multiImageManagerInstance.value.drawImages(ctx, { behindVisualizer: true })
      }

      drawVisualizerWithPunch(drawVisualizerCallback, ctx, canvasWidth, canvasHeight)

      if (multiImageManagerInstance.value) {
        multiImageManagerInstance.value.drawImages(ctx, { behindVisualizer: false })
      }

      if (videoManagerInstance.value) videoManagerInstance.value.drawVideos(ctx)

      const textManager = getTextManager()
      if (textManager) textManager.draw(ctx, canvasWidth, canvasHeight)
    }
  }

  function buildVisualizerCallback(canvas) {
    if (!visualizerStore.showVisualizer) return null

    if (visualizerStore.multiLayerMode && multiLayerCompositeCanvas) {
      return (vizCtx, vizWidth, vizHeight) => {
        if (
          vizWidth === multiLayerCompositeCanvas.width &&
          vizHeight === multiLayerCompositeCanvas.height
        ) {
          vizCtx.drawImage(multiLayerCompositeCanvas, 0, 0)
        } else {
          vizCtx.drawImage(multiLayerCompositeCanvas, 0, 0, vizWidth, vizHeight)
        }
      }
    }

    // Off-thread (OffscreenCanvas worker) path: the single-layer visualizer is
    // rendered in a worker and its latest frame lives in vizWorkerBitmap, not in
    // visualizerCacheCanvas. Recording/screenshots go through this callback, so
    // they must draw the worker bitmap too — otherwise the captured video/image
    // contains the static scene without the animated visualizer.
    if (vizWorkerActive && vizWorkerBitmap) {
      const bitmap = vizWorkerBitmap
      return (targetCtx, width, height) => {
        const scale = visualizerStore.visualizerScale
        const posX = visualizerStore.visualizerX
        const posY = visualizerStore.visualizerY
        const scaledWidth = bitmap.width * scale
        const scaledHeight = bitmap.height * scale
        const destX = width * posX - scaledWidth / 2
        const destY = height * posY - scaledHeight / 2

        if (scale !== 1.0 || posX !== 0.5 || posY !== 0.5) {
          targetCtx.drawImage(
            bitmap,
            0,
            0,
            bitmap.width,
            bitmap.height,
            destX,
            destY,
            scaledWidth,
            scaledHeight,
          )
        } else {
          targetCtx.drawImage(bitmap, 0, 0, width, height)
        }
      }
    }

    if (visualizerCacheCanvas) {
      return (targetCtx, width, height) => {
        const scale = visualizerStore.visualizerScale
        const posX = visualizerStore.visualizerX
        const posY = visualizerStore.visualizerY
        const scaledWidth = visualizerCacheCanvas.width * scale
        const scaledHeight = visualizerCacheCanvas.height * scale
        const destX = width * posX - scaledWidth / 2
        const destY = height * posY - scaledHeight / 2

        if (scale !== 1.0 || posX !== 0.5 || posY !== 0.5) {
          targetCtx.drawImage(
            visualizerCacheCanvas,
            0,
            0,
            visualizerCacheCanvas.width,
            visualizerCacheCanvas.height,
            destX,
            destY,
            scaledWidth,
            scaledHeight,
          )
        } else {
          targetCtx.drawImage(visualizerCacheCanvas, 0, 0, width, height)
        }
      }
    }

    return null
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

  function draw() {
    timeDomainFresh = false // reset per-frame cache flag
    if (recorderStore.isRecording && document.hidden) {
      drawTimeoutId = setTimeout(draw, 16)
    } else {
      animationFrameId = requestAnimationFrame(draw)
    }

    const now = performance.now()

    // Frame-Takt an den Player melden (präzise Position für Beat-Drop-Marker).
    // Bewusst vor allen frühen Returns, damit Marker auch ohne Canvas laufen.
    playerStore.notifyFrame?.()

    // Adaptive-quality measurement (cheap; only applied when the toggle is on).
    frameMonitor.tick(now)

    // Elapsed time since the last draw() call. Visualizer smoothing/decay
    // (applySmoothValue, applyDecay) is normalized against this so it
    // converges at the same real-world speed regardless of how often draw()
    // actually runs — without it, anything that slows the render loop down
    // (most notably real-time video encoding while recording) makes the
    // visualizer visibly move in slow motion, since per-call-fixed smoothing
    // factors then take proportionally longer in wall-clock time to converge.
    const dtMs = lastDrawTimestamp !== null ? now - lastDrawTimestamp : REFERENCE_FRAME_MS
    lastDrawTimestamp = now
    // Ignore absurd gaps (tab was backgrounded, debugger paused, first frame
    // after a long stall) so a single huge dt doesn't snap smoothed values
    // straight to their targets.
    visualizerState._dtMs = dtMs > 0 && dtMs < 250 ? dtMs : REFERENCE_FRAME_MS

    const canvas = resolveCanvas()
    if (!canvas) return

    if (canvasManagerInstance.value && canvasManagerInstance.value.canvas !== canvas) {
      canvasManagerInstance.value.updateCanvas(canvas)
    }

    if (canvas.width <= 0 || canvas.height <= 0) return

    const ctx = getContext2D(canvas)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const isMicActive = audioSourceStore.isMicrophoneActive
    const activeAnalyser = isMicActive ? getMicrophoneAnalyser() : getAnalyser()
    const shouldAnalyzeAudio =
      activeAnalyser && (playerStore.isPlaying || recorderStore.isRecording || isMicActive)

    if (isMicActive) {
      const micCtx = getMicrophoneAudioContext()
      if (micCtx?.state === 'suspended') micCtx.resume()
    }

    if (shouldAnalyzeAudio) {
      const bufferLength = activeAnalyser.frequencyBinCount
      if (!audioDataArray || audioDataArray.length !== bufferLength) {
        audioDataArray = new Uint8Array(bufferLength)
      }
      activeAnalyser.getByteFrequencyData(audioDataArray)
      updateGlobalAudioData(audioDataArray, bufferLength)
    }

    // Advance the beat-punch envelope once per frame from the fresh onset data
    // (a no-op that resets to scale 1.0 while the feature is disabled).
    updateBeatPunch()

    // Bridge the spectrum auto-gain setting onto the shared visualizer state so
    // the pure visualizer modules can read it without a store dependency.
    visualizerState._onsetFx = {
      enabled: visualizerStore.onsetFlourishEnabled,
      strength: visualizerStore.onsetFlourishStrength,
    }
    visualizerState._onsetData = onsetDataSnapshot()

    const shouldDrawVisualizer =
      visualizerStore.showVisualizer &&
      (playerStore.isPlaying || recorderStore.isRecording || isMicActive)

    let drawVisualizerCallback = null

    if (activeAnalyser && shouldDrawVisualizer) {
      if (visualizerStore.multiLayerMode && visualizerStore.visibleLayers.length > 0) {
        const bufferLength = activeAnalyser.frequencyBinCount
        if (!audioDataArray || audioDataArray.length !== bufferLength) {
          audioDataArray = new Uint8Array(bufferLength)
        }

        if (!layerCacheCanvases) layerCacheCanvases = new Map()

        if (
          !multiLayerCompositeCanvas ||
          multiLayerCompositeCanvas.width !== canvas.width ||
          multiLayerCompositeCanvas.height !== canvas.height
        ) {
          multiLayerCompositeCanvas = document.createElement('canvas')
          multiLayerCompositeCanvas.width = canvas.width
          multiLayerCompositeCanvas.height = canvas.height
          multiLayerCompositeCtx = multiLayerCompositeCanvas.getContext('2d')
        }

        for (const layer of visualizerStore.visibleLayers) {
          const visualizer = Visualizers[layer.visualizerId]
          if (!visualizer) continue

          let layerCache = layerCacheCanvases.get(layer.id)
          if (
            !layerCache ||
            layerCache.width !== canvas.width ||
            layerCache.height !== canvas.height
          ) {
            const cacheCanvas = document.createElement('canvas')
            cacheCanvas.width = canvas.width
            cacheCanvas.height = canvas.height
            layerCache = {
              canvas: cacheCanvas,
              ctx: cacheCanvas.getContext('2d'),
              lastVisualizerId: null,
            }
            layerCacheCanvases.set(layer.id, layerCache)
          }

          if (layerCache.lastVisualizerId !== layer.visualizerId) {
            if (layerCache.lastVisualizerId && Visualizers[layerCache.lastVisualizerId]) {
              try {
                Visualizers[layerCache.lastVisualizerId].cleanup?.()
              } catch {}
            }
            visualizer.init?.(canvas.width, canvas.height)
            layerCache.lastVisualizerId = layer.visualizerId
          }

          // Use cached frequency data; fetch time-domain data lazily (once per frame)
          const rawLayerAudio = visualizer.needsTimeData
            ? getTimeDomainData(activeAnalyser, bufferLength)
            : audioDataArray
          const layerAudioData = gateAudioData(
            rawLayerAudio,
            layer.reactSource,
            layer.reactStrength,
            layerCache,
            'reactEnv',
            layerCache,
            'reactBuf',
            !!visualizer.needsTimeData,
          )

          visualizerState._imageSource = visualizer.needsImage
            ? getVisualizerImageSource(effectiveImageId(layer.imageId))
            : null
          layerCache.ctx.clearRect(0, 0, canvas.width, canvas.height)
          layerCache.ctx.save()
          layerCache.ctx.globalAlpha = layer.colorOpacity
          try {
            visualizer.draw(
              layerCache.ctx,
              layerAudioData,
              bufferLength,
              canvas.width,
              canvas.height,
              layer.color,
              layer.opacity,
            )
          } catch (error) {
            console.error(`Layer "${layer.id}" Visualizer Fehler:`, error)
          }
          layerCache.ctx.restore()
        }

        multiLayerCompositeCtx.clearRect(0, 0, canvas.width, canvas.height)
        for (const layer of visualizerStore.visibleLayers) {
          const layerCache = layerCacheCanvases.get(layer.id)
          if (!layerCache) continue

          multiLayerCompositeCtx.save()
          multiLayerCompositeCtx.globalCompositeOperation = layer.blendMode || 'source-over'

          const scale = layer.scale
          const posX = layer.x
          const posY = layer.y
          const scaledWidth = canvas.width * scale
          const scaledHeight = canvas.height * scale
          const destX = canvas.width * posX - scaledWidth / 2
          const destY = canvas.height * posY - scaledHeight / 2

          if (scale !== 1.0 || posX !== 0.5 || posY !== 0.5) {
            multiLayerCompositeCtx.drawImage(
              layerCache.canvas,
              0,
              0,
              canvas.width,
              canvas.height,
              destX,
              destY,
              scaledWidth,
              scaledHeight,
            )
          } else {
            multiLayerCompositeCtx.drawImage(layerCache.canvas, 0, 0)
          }
          multiLayerCompositeCtx.restore()
        }

        // Post-processing (Bloom / Trails) über das gesamte Layer-Composite.
        const mlPostFx = visualizerStore.postFxConfig
        if (shouldRunPostFx(mlPostFx, currentQuality())) {
          const proc = ensureMainPostProcessor(canvas.width, canvas.height)
          if (proc) {
            try {
              proc.apply(multiLayerCompositeCanvas, mlPostFx, currentQuality())
            } catch {}
          }
        }

        drawVisualizerCallback = (targetCtx, width, height) => {
          if (width === canvas.width && height === canvas.height) {
            targetCtx.drawImage(multiLayerCompositeCanvas, 0, 0)
          } else {
            targetCtx.drawImage(multiLayerCompositeCanvas, 0, 0, width, height)
          }
        }

        const currentLayerIds = new Set(visualizerStore.visualizerLayers.map((l) => l.id))
        for (const layerId of layerCacheCanvases.keys()) {
          if (!currentLayerIds.has(layerId)) layerCacheCanvases.delete(layerId)
        }
      } else {
        const visualizerId = visualizerStore.selectedVisualizer
        const visualizer = Visualizers[visualizerId]
        if (visualizer) {
          const visualizerChanged = visualizerId !== lastSelectedVisualizerId.value
          const canvasResized =
            canvas.width !== lastCanvasWidth.value || canvas.height !== lastCanvasHeight.value

          // Lazy-init visualizer worker once on first draw
          if (!vizWorkerInitialized) {
            vizWorkerInitialized = true
            workerManager.initVisualizerWorker(canvas.width, canvas.height).then((ok) => {
              vizWorkerActive = ok
              if (ok) {
                workerManager.onVisualizerFrame((bitmap) => {
                  if (vizWorkerBitmap) vizWorkerBitmap.close()
                  vizWorkerBitmap = bitmap
                  visualizerStore.markVisualizerWorking(visualizerStore.selectedVisualizer)
                })
                console.log('[RenderLoop] Visualizer Worker aktiv')
              } else {
                console.log('[RenderLoop] Visualizer Worker nicht verfügbar – Fallback aktiv')
              }
            })
          }

          if (visualizerChanged || canvasResized) {
            workerManager.cleanupVisualizerState()
            if (
              !vizWorkerActive &&
              lastSelectedVisualizerId.value &&
              Visualizers[lastSelectedVisualizerId.value]
            ) {
              try {
                Visualizers[lastSelectedVisualizerId.value].cleanup?.()
              } catch {}
            }
            if (!vizWorkerActive) visualizer.init?.(canvas.width, canvas.height)
            if (canvasResized) workerManager.resizeVisualizerCanvas(canvas.width, canvas.height)
            // Reset trail history so a new visualizer / size doesn't ghost.
            if (mainPostProcessor) {
              try {
                mainPostProcessor.clearHistory()
              } catch {}
            }
            lastSelectedVisualizerId.value = visualizerId
            lastCanvasWidth.value = canvas.width
            lastCanvasHeight.value = canvas.height
          }

          const bufferLength = activeAnalyser.frequencyBinCount

          // audioDataArray already has fresh frequency data from the top of draw().
          // For time-domain visualizers, fetch lazily into a separate buffer (once per frame).
          const rawVizAudio = visualizer.needsTimeData
            ? getTimeDomainData(activeAnalyser, bufferLength)
            : audioDataArray
          const singleHolder = { env: singleReactEnv, buf: singleReactBuf }
          const vizAudioData = gateAudioData(
            rawVizAudio,
            visualizerStore.reactSource,
            visualizerStore.reactStrength,
            singleHolder,
            'env',
            singleHolder,
            'buf',
            !!visualizer.needsTimeData,
          )
          singleReactEnv = singleHolder.env
          singleReactBuf = singleHolder.buf

          if (vizWorkerActive) {
            // Off-thread path: send audio data to worker, use previous frame's bitmap
            if (visualizer.needsImage)
              syncWorkerImage(effectiveImageId(visualizerStore.visualizerImageId))
            workerManager.renderVisualizerFrame({
              visualizerId,
              audioData: vizAudioData,
              bufferLength,
              color: visualizerStore.visualizerColor,
              opacity: visualizerStore.visualizerOpacity,
              colorOpacity: visualizerStore.colorOpacity,
              postFx: visualizerStore.postFxConfig,
              quality: currentQuality(),
              // Onset config + values — the worker has its own visualizerState
              // and no window, so these must travel per frame.
              onsetFx: visualizerState._onsetFx,
              onsetData: visualizerState._onsetData,
              // Elapsed time since the last draw() — see applySmoothValue/
              // applyDecay in core/helpers.js for why this matters.
              dtMs: visualizerState._dtMs,
            })

            if (vizWorkerBitmap) {
              const bitmap = vizWorkerBitmap
              drawVisualizerCallback = (targetCtx, w, h) => {
                const scale = visualizerStore.visualizerScale
                const posX = visualizerStore.visualizerX
                const posY = visualizerStore.visualizerY
                const scaledW = canvas.width * scale
                const scaledH = canvas.height * scale
                const destX = w * posX - scaledW / 2
                const destY = h * posY - scaledH / 2

                if (scale !== 1.0 || posX !== 0.5 || posY !== 0.5) {
                  targetCtx.drawImage(
                    bitmap,
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                    destX,
                    destY,
                    scaledW,
                    scaledH,
                  )
                } else if (w === canvas.width && h === canvas.height) {
                  targetCtx.drawImage(bitmap, 0, 0)
                } else {
                  targetCtx.drawImage(bitmap, 0, 0, w, h)
                }
              }
            }
          } else {
            // Main-thread fallback path
            if (
              !visualizerCacheCanvas ||
              visualizerCacheCanvas.width !== canvas.width ||
              visualizerCacheCanvas.height !== canvas.height
            ) {
              visualizerCacheCanvas = document.createElement('canvas')
              visualizerCacheCanvas.width = canvas.width
              visualizerCacheCanvas.height = canvas.height
              visualizerCacheCtx = visualizerCacheCanvas.getContext('2d')
            }

            visualizerState._imageSource = visualizer.needsImage
              ? getVisualizerImageSource(effectiveImageId(visualizerStore.visualizerImageId))
              : null
            visualizerCacheCtx.clearRect(0, 0, canvas.width, canvas.height)
            visualizerCacheCtx.save()
            visualizerCacheCtx.globalAlpha = visualizerStore.colorOpacity
            try {
              visualizer.draw(
                visualizerCacheCtx,
                vizAudioData,
                bufferLength,
                canvas.width,
                canvas.height,
                visualizerStore.visualizerColor,
                visualizerStore.visualizerOpacity,
              )
              visualizerStore.markVisualizerWorking(visualizerId)
            } catch (error) {
              console.error(`Visualizer "${visualizerId}" Fehler:`, error)
              visualizerCacheCtx.fillStyle = '#000'
              visualizerCacheCtx.fillRect(0, 0, canvas.width, canvas.height)
              visualizerStore.fallbackToLastWorking()
            }
            visualizerCacheCtx.restore()

            // Post-processing (Bloom / Trails) auf den Visualizer-Cache.
            // Mutiert visualizerCacheCanvas in-place → Recording/Screenshot erben es.
            const singlePostFx = visualizerStore.postFxConfig
            if (shouldRunPostFx(singlePostFx, currentQuality())) {
              const proc = ensureMainPostProcessor(canvas.width, canvas.height)
              if (proc) {
                try {
                  proc.apply(visualizerCacheCanvas, singlePostFx, currentQuality())
                } catch {}
              }
            }

            drawVisualizerCallback = (targetCtx, width, height) => {
              const scale = visualizerStore.visualizerScale
              const posX = visualizerStore.visualizerX
              const posY = visualizerStore.visualizerY
              const scaledWidth = canvas.width * scale
              const scaledHeight = canvas.height * scale
              const destX = width * posX - scaledWidth / 2
              const destY = height * posY - scaledHeight / 2

              if (scale !== 1.0 || posX !== 0.5 || posY !== 0.5) {
                targetCtx.drawImage(
                  visualizerCacheCanvas,
                  0,
                  0,
                  canvas.width,
                  canvas.height,
                  destX,
                  destY,
                  scaledWidth,
                  scaledHeight,
                )
              } else if (width === canvas.width && height === canvas.height) {
                targetCtx.drawImage(visualizerCacheCanvas, 0, 0)
              } else {
                targetCtx.drawImage(visualizerCacheCanvas, 0, 0, width, height)
              }
            }
          }
        }
      }
    }

    renderScene(ctx, canvas.width, canvas.height, drawVisualizerCallback)

    audioFxRenderer.render(
      ctx,
      canvas.width,
      canvas.height,
      window.audioAnalysisData,
      audioFxStore.$state,
    )
    beatDropRenderer.render(
      ctx,
      canvas.width,
      canvas.height,
      window.audioAnalysisData,
      beatDropStore.$state,
    )
    if (tickerRenderer && tickerStore) {
      tickerRenderer.render(
        ctx,
        canvas.width,
        canvas.height,
        window.audioAnalysisData,
        tickerStore.$state,
      )
    }

    // Marker-Crossfade ganz oben, über allem Szeneninhalt (Live-Ziel)
    if (markerTransitionRenderer) {
      markerTransitionRenderer.render(ctx, canvas.width, canvas.height, 'live')
    }

    // Content-only snapshot for the recording redraw (see
    // setupRecordingRedrawListener) — taken here, BEFORE the editor-only UI
    // chrome below (selection handles, grid, workspace outline) is drawn, so
    // it never leaks into the exported video.
    if (recorderStore.isRecording) {
      if (
        !liveSnapshotCanvas ||
        liveSnapshotCanvas.width !== canvas.width ||
        liveSnapshotCanvas.height !== canvas.height
      ) {
        liveSnapshotCanvas = document.createElement('canvas')
        liveSnapshotCanvas.width = canvas.width
        liveSnapshotCanvas.height = canvas.height
        liveSnapshotCtx = liveSnapshotCanvas.getContext('2d')
      }
      liveSnapshotCtx.drawImage(canvas, 0, 0)
      liveSnapshotReady = true
    } else if (liveSnapshotReady) {
      liveSnapshotReady = false
    }

    if (canvasManagerInstance.value) {
      canvasManagerInstance.value.drawFadedTextMarkers(ctx)
      canvasManagerInstance.value.drawInteractiveElements(ctx)
      canvasManagerInstance.value.drawWorkspaceOutline(ctx)
      canvasManagerInstance.value.drawTextSelectionRect(ctx)
      canvasManagerInstance.value.drawTextPositionPreview(ctx)
      if (gridManagerInstance?.value) {
        gridManagerInstance.value.drawGrid(ctx)
      }
    }

    if (multiImageManagerInstance.value?.getSelectedImage()) {
      multiImageManagerInstance.value.drawInteractiveElements(ctx)
    }
  }

  function setupRecordingRedrawListener(gridManagerInstance) {
    window.addEventListener('recorder:forceRedraw', () => {
      const recordingCanvas = getRecordingCanvas()
      if (!recorderStore.isRecording || !recordingCanvas) return

      const recordingCtx = recordingCanvas.getContext('2d')
      if (!recordingCtx) return

      // Fast path: reuse the live frame draw() already fully rendered this
      // tick (content only, see the snapshot capture above) via a cheap
      // crop/scale drawImage, instead of re-running the entire scene/effects
      // pipeline (background, images, videos, text, audio/beat/ticker/marker
      // effects) a second time on every recording tick. That duplicate full
      // render — on top of the live requestAnimationFrame loop already doing
      // the same work every frame — is what made the canvas bog down during
      // recording.
      if (liveSnapshotReady && liveSnapshotCanvas) {
        const workspaceBounds = canvasManagerInstance.value?.getWorkspaceBounds()
        const hasWorkspace = workspaceBounds && canvasManagerInstance.value?.workspacePreset

        recordingCtx.clearRect(0, 0, recordingCanvas.width, recordingCanvas.height)
        if (hasWorkspace) {
          recordingCtx.drawImage(
            liveSnapshotCanvas,
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
          recordingCtx.drawImage(
            liveSnapshotCanvas,
            0,
            0,
            recordingCanvas.width,
            recordingCanvas.height,
          )
        }
        return
      }

      // Fallback (only the first tick right after starting a recording,
      // before draw() has captured a live snapshot yet): full independent
      // render, exactly as before.
      const drawVisualizerCallback = buildVisualizerCallback(recordingCanvas)
      renderRecordingScene(
        recordingCtx,
        recordingCanvas.width,
        recordingCanvas.height,
        drawVisualizerCallback,
      )

      audioFxRenderer.render(
        recordingCtx,
        recordingCanvas.width,
        recordingCanvas.height,
        window.audioAnalysisData,
        audioFxStore.$state,
      )
      beatDropRenderer.render(
        recordingCtx,
        recordingCanvas.width,
        recordingCanvas.height,
        window.audioAnalysisData,
        beatDropStore.$state,
      )
      if (tickerRenderer && tickerStore) {
        tickerRenderer.render(
          recordingCtx,
          recordingCanvas.width,
          recordingCanvas.height,
          window.audioAnalysisData,
          tickerStore.$state,
        )
      }

      // Marker-Crossfade auch in der Aufnahme rendern (eigenes Ziel)
      if (markerTransitionRenderer) {
        markerTransitionRenderer.render(
          recordingCtx,
          recordingCanvas.width,
          recordingCanvas.height,
          'rec',
        )
      }
    })
  }

  function exposeGlobals(canvasManagerInst) {
    window.takeCanvasScreenshot = async function (mimeType = 'image/png', quality = 0.9) {
      const canvas = canvasRef.value
      if (!canvas) return null

      const screenshotCanvas = document.createElement('canvas')
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

      screenshotCanvas.width = targetWidth
      screenshotCanvas.height = targetHeight
      const ctx = screenshotCanvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      const drawVisualizerCallback = buildVisualizerCallback(canvas)
      renderRecordingScene(ctx, targetWidth, targetHeight, drawVisualizerCallback)
      audioFxRenderer.render(
        ctx,
        targetWidth,
        targetHeight,
        window.audioAnalysisData,
        audioFxStore.$state,
      )
      beatDropRenderer.render(
        ctx,
        targetWidth,
        targetHeight,
        window.audioAnalysisData,
        beatDropStore.$state,
      )
      if (tickerRenderer && tickerStore) {
        tickerRenderer.render(
          ctx,
          targetWidth,
          targetHeight,
          window.audioAnalysisData,
          tickerStore.$state,
        )
      }

      return new Promise((resolve, reject) => {
        screenshotCanvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create screenshot blob'))),
          mimeType,
          mimeType === 'image/png' ? undefined : quality,
        )
      })
    }
  }

  // Pause the render loop without tearing down GPU/worker resources, so it can
  // be resumed instantly via draw() (used when the app is kept alive but
  // deactivated by keep-alive during route changes).
  function stop() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    if (drawTimeoutId) clearTimeout(drawTimeoutId)
    animationFrameId = null
    drawTimeoutId = null
  }

  function cleanup() {
    stop()
    if (vizWorkerBitmap) {
      vizWorkerBitmap.close()
      vizWorkerBitmap = null
    }
    if (mainPostProcessor) {
      try {
        mainPostProcessor.dispose()
      } catch {}
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
