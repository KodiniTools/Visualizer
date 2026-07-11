import { ref } from 'vue'
import { Visualizers } from '../lib/visualizers/index.js'
import { workerManager } from '../lib/workerManager.js'

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
  getAnalyser,
  getMicrophoneAnalyser,
  getMicrophoneAudioContext,
  updateGlobalAudioData,
}) {
  let animationFrameId = null
  let drawTimeoutId = null

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

  // OffscreenCanvas Worker state
  let vizWorkerActive = false
  let vizWorkerBitmap = null // latest ImageBitmap from worker
  let vizWorkerInitialized = false

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

    if (drawVisualizerCallback) drawVisualizerCallback(ctx, canvasWidth, canvasHeight)

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
        drawVisualizerCallback(recordingVizCtx, recordingVizCanvas.width, recordingVizCanvas.height)
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

      if (drawVisualizerCallback) drawVisualizerCallback(ctx, canvasWidth, canvasHeight)

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

    const domCanvas = document.querySelector('.canvas-wrapper canvas')
    const canvas = domCanvas || canvasRef.value
    if (!canvas) return

    if (canvasManagerInstance.value && canvasManagerInstance.value.canvas !== canvas) {
      canvasManagerInstance.value.updateCanvas(canvas)
    }

    if (canvas.width <= 0 || canvas.height <= 0) return

    const ctx = canvas.getContext('2d')
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
          const layerAudioData = visualizer.needsTimeData
            ? getTimeDomainData(activeAnalyser, bufferLength)
            : audioDataArray

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
            lastSelectedVisualizerId.value = visualizerId
            lastCanvasWidth.value = canvas.width
            lastCanvasHeight.value = canvas.height
          }

          const bufferLength = activeAnalyser.frequencyBinCount

          // audioDataArray already has fresh frequency data from the top of draw().
          // For time-domain visualizers, fetch lazily into a separate buffer (once per frame).
          const vizAudioData = visualizer.needsTimeData
            ? getTimeDomainData(activeAnalyser, bufferLength)
            : audioDataArray

          if (vizWorkerActive) {
            // Off-thread path: send audio data to worker, use previous frame's bitmap
            workerManager.renderVisualizerFrame({
              visualizerId,
              audioData: vizAudioData,
              bufferLength,
              color: visualizerStore.visualizerColor,
              opacity: visualizerStore.visualizerOpacity,
              colorOpacity: visualizerStore.colorOpacity,
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

      return new Promise((resolve, reject) => {
        screenshotCanvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create screenshot blob'))),
          mimeType,
          mimeType === 'image/png' ? undefined : quality,
        )
      })
    }
  }

  function cleanup() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    if (drawTimeoutId) clearTimeout(drawTimeoutId)
    if (vizWorkerBitmap) {
      vizWorkerBitmap.close()
      vizWorkerBitmap = null
    }
  }

  return {
    draw,
    renderScene,
    renderRecordingScene,
    buildVisualizerCallback,
    setupRecordingRedrawListener,
    exposeGlobals,
    cleanup,
  }
}
