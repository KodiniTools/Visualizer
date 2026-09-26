import { ensureSizedCanvas } from './canvasCache.js'

/**
 * Szenenaufbau für Live-Bild, Aufnahme und Screenshot:
 * Hintergrund → Bilder hinter dem Visualizer → Visualizer → Bilder davor →
 * Videos → Texte, danach die Effekt-Ebenen (Audio-FX, Beat-Drop, Lauftext).
 *
 * @param {object} deps
 * @param {import('vue').Ref<HTMLCanvasElement|null>} deps.canvasRef
 * @param {import('vue').Ref} deps.canvasManagerInstance
 * @param {import('vue').Ref} deps.multiImageManagerInstance
 * @param {import('vue').Ref} deps.videoManagerInstance
 * @param {() => object|null} deps.getTextManager
 * @param {(cb: Function|null, ctx: CanvasRenderingContext2D, w: number, h: number) => void} deps.drawWithPunch
 * @param {object} deps.effects - { audioFxRenderer, audioFxStore, beatDropRenderer, beatDropStore, tickerRenderer, tickerStore }
 */
export function createSceneRenderer({
  canvasRef,
  canvasManagerInstance,
  multiImageManagerInstance,
  videoManagerInstance,
  getTextManager,
  drawWithPunch,
  effects,
}) {
  let recordingTemp = null
  let recordingViz = null

  /**
   * Szene in Ebenen zeichnen; `drawVisualizer` setzt den Visualizer zwischen
   * die Bild-Ebenen. `recording` markiert den CanvasManager als aufnehmend
   * (blendet Editor-Hilfen im Hintergrund aus).
   */
  function drawLayers(ctx, width, height, drawVisualizer, { recording = false } = {}) {
    const cm = canvasManagerInstance.value
    if (cm) {
      if (recording) cm.isRecording = true
      cm.drawScene(ctx)
      if (recording) cm.isRecording = false
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }

    multiImageManagerInstance.value?.drawImages(ctx, { behindVisualizer: true })
    drawVisualizer()
    multiImageManagerInstance.value?.drawImages(ctx, { behindVisualizer: false })
    videoManagerInstance.value?.drawVideos(ctx)

    const textManager = getTextManager()
    if (textManager) textManager.draw(ctx, width, height)
  }

  /** Live-Szene auf das Haupt-Canvas. */
  function renderScene(ctx, canvasWidth, canvasHeight, drawVisualizerCallback) {
    drawLayers(ctx, canvasWidth, canvasHeight, () =>
      drawWithPunch(drawVisualizerCallback, ctx, canvasWidth, canvasHeight),
    )
  }

  /**
   * Szene für Aufnahme/Screenshot. Mit Workspace-Format wird die volle Szene
   * auf ein Hilfs-Canvas gezeichnet (Visualizer auf den Workspace beschnitten)
   * und der Workspace-Ausschnitt auf das Ziel skaliert.
   */
  function renderRecordingScene(ctx, canvasWidth, canvasHeight, drawVisualizerCallback) {
    const workspaceBounds = canvasManagerInstance.value?.getWorkspaceBounds()
    const hasWorkspace = workspaceBounds && canvasManagerInstance.value?.workspacePreset

    if (!hasWorkspace) {
      drawLayers(
        ctx,
        canvasWidth,
        canvasHeight,
        () => drawWithPunch(drawVisualizerCallback, ctx, canvasWidth, canvasHeight),
        { recording: true },
      )
      return
    }

    const mainCanvas = canvasRef.value
    if (!mainCanvas) return

    recordingTemp = ensureSizedCanvas(recordingTemp, mainCanvas.width, mainCanvas.height)
    const { canvas: tempCanvas, ctx: tempCtx } = recordingTemp
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)

    drawLayers(
      tempCtx,
      tempCanvas.width,
      tempCanvas.height,
      () => drawWorkspaceVisualizer(tempCtx, workspaceBounds, drawVisualizerCallback),
      { recording: true },
    )

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.drawImage(
      tempCanvas,
      workspaceBounds.x,
      workspaceBounds.y,
      workspaceBounds.width,
      workspaceBounds.height,
      0,
      0,
      canvasWidth,
      canvasHeight,
    )
  }

  /** Visualizer in Workspace-Größe rendern und auf den Workspace beschnitten einsetzen. */
  function drawWorkspaceVisualizer(ctx, bounds, drawVisualizerCallback) {
    if (!drawVisualizerCallback) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height)
    ctx.clip()

    recordingViz = ensureSizedCanvas(recordingViz, bounds.width, bounds.height)
    const { canvas: vizCanvas, ctx: vizCtx } = recordingViz
    vizCtx.clearRect(0, 0, vizCanvas.width, vizCanvas.height)
    drawWithPunch(drawVisualizerCallback, vizCtx, vizCanvas.width, vizCanvas.height)
    ctx.drawImage(vizCanvas, bounds.x, bounds.y)
    ctx.restore()
  }

  /** Effekt-Ebenen über der Szene: Audio-FX, Beat-Drop, Lauftext. */
  function renderEffects(ctx, width, height) {
    const {
      audioFxRenderer,
      audioFxStore,
      beatDropRenderer,
      beatDropStore,
      tickerRenderer,
      tickerStore,
    } = effects
    const audioData = window.audioAnalysisData
    audioFxRenderer.render(ctx, width, height, audioData, audioFxStore.$state)
    beatDropRenderer.render(ctx, width, height, audioData, beatDropStore.$state)
    if (tickerRenderer && tickerStore) {
      tickerRenderer.render(ctx, width, height, audioData, tickerStore.$state)
    }
  }

  return { renderScene, renderRecordingScene, renderEffects }
}
