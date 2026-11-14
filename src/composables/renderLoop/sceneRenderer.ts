import type { Ref } from 'vue'
import { ensureSizedCanvas, type SizedCanvas } from './canvasCache'
import { getAudioAnalysisData } from '../../lib/audio/audioAnalysisData'
import { drawMediaStack } from '../../lib/canvasObjects/mediaStack'
import type { MultiImageManager } from '../../lib/multiImageManager'
import type { VideoManager } from '../../lib/videoManager'
import type { TextManager } from '../../lib/textManager'
import type { Rect } from '../../lib/canvasObjects/geometry'
import type { AudioFxRenderer } from '../../lib/canvasManager/rendering/AudioFxRenderer'
import type { BeatDropRenderer } from '../../lib/canvasManager/rendering/BeatDropRenderer'
import type { TickerRenderer } from '../../lib/canvasManager/rendering/TickerRenderer'
import type { useAudioFxStore } from '../../stores/audioFxStore'
import type { useBeatDropStore } from '../../stores/beatDropStore'
import type { useTickerStore } from '../../stores/tickerStore'
import type { PunchDrawFn } from './beatPunch'
import type { CanvasManagerRef } from '../types'

/** Effekt-Ebenen über der Szene */
export interface SceneEffects {
  audioFxRenderer: AudioFxRenderer
  audioFxStore: ReturnType<typeof useAudioFxStore>
  beatDropRenderer: BeatDropRenderer
  beatDropStore: ReturnType<typeof useBeatDropStore>
  tickerRenderer?: TickerRenderer | null
  tickerStore?: ReturnType<typeof useTickerStore> | null
}

/** Abhängigkeiten von createSceneRenderer */
export interface SceneRendererDeps {
  canvasRef: Ref<HTMLCanvasElement | null | undefined>
  canvasManagerInstance: CanvasManagerRef
  multiImageManagerInstance: Ref<MultiImageManager | null | undefined>
  videoManagerInstance: Ref<VideoManager | null | undefined>
  getTextManager: () => TextManager | null | undefined
  /** Formen-Ebene (unter den Texten) */
  drawShapes?: ((ctx: CanvasRenderingContext2D) => void) | null
  drawWithPunch: (
    cb: PunchDrawFn | null | undefined,
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ) => void
  effects: SceneEffects
}

/**
 * Szenenaufbau für Live-Bild, Aufnahme und Screenshot:
 * Hintergrund → Bilder hinter dem Visualizer → Visualizer → Bilder davor →
 * Videos → Formen & Symbole → Texte, danach die Effekt-Ebenen (Audio-FX, Beat-Drop, Lauftext).
 */
export function createSceneRenderer({
  canvasRef,
  canvasManagerInstance,
  multiImageManagerInstance,
  videoManagerInstance,
  getTextManager,
  drawShapes = null,
  drawWithPunch,
  effects,
}: SceneRendererDeps) {
  let recordingTemp: SizedCanvas | null = null
  let recordingViz: SizedCanvas | null = null

  /**
   * Bilder und Videos einer Ebene in ihrer gemeinsamen Reihenfolge (ein Bild
   * kann über einem Video liegen, siehe canvasObjects/mediaStack). Manager
   * ohne Einzel-Zeichnen (ältere Stubs) zeichnen wie bisher erst Bilder,
   * dann Videos.
   */
  function drawMedia(ctx: CanvasRenderingContext2D, behindVisualizer: boolean) {
    const mim = multiImageManagerInstance.value
    const vm = videoManagerInstance.value
    if (typeof mim?.drawImage === 'function' && typeof vm?.drawVideo === 'function') {
      drawMediaStack(ctx, mim, vm, behindVisualizer)
      return
    }
    mim?.drawImages(ctx, { behindVisualizer })
    vm?.drawVideos(ctx, { behindVisualizer })
  }

  /**
   * Szene in Ebenen zeichnen; `drawVisualizer` setzt den Visualizer zwischen
   * die Bild-Ebenen. `recording` markiert den CanvasManager als aufnehmend
   * (blendet Editor-Hilfen im Hintergrund aus).
   */
  function drawLayers(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    drawVisualizer: () => void,
    { recording = false } = {},
  ) {
    const cm = canvasManagerInstance.value
    if (cm) {
      if (recording) cm.isRecording = true
      cm.drawScene(ctx)
      if (recording) cm.isRecording = false
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }

    drawMedia(ctx, true)
    drawVisualizer()
    drawMedia(ctx, false)
    drawShapes?.(ctx)

    const textManager = getTextManager()
    if (textManager) textManager.draw(ctx, width, height)
  }

  /** Live-Szene auf das Haupt-Canvas. */
  function renderScene(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    drawVisualizerCallback: PunchDrawFn | null | undefined,
  ) {
    drawLayers(ctx, canvasWidth, canvasHeight, () =>
      drawWithPunch(drawVisualizerCallback, ctx, canvasWidth, canvasHeight),
    )
  }

  /**
   * Szene für Aufnahme/Screenshot. Mit Workspace-Format wird die volle Szene
   * auf ein Hilfs-Canvas gezeichnet (Visualizer auf den Workspace beschnitten)
   * und der Workspace-Ausschnitt auf das Ziel skaliert.
   */
  function renderRecordingScene(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    drawVisualizerCallback: PunchDrawFn | null | undefined,
  ) {
    const workspaceBounds = canvasManagerInstance.value?.getWorkspaceBounds()
    const hasWorkspace = workspaceBounds && canvasManagerInstance.value?.workspacePreset

    if (!hasWorkspace || !workspaceBounds) {
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
  function drawWorkspaceVisualizer(
    ctx: CanvasRenderingContext2D,
    bounds: Rect,
    drawVisualizerCallback: PunchDrawFn | null | undefined,
  ) {
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
  function renderEffects(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const {
      audioFxRenderer,
      audioFxStore,
      beatDropRenderer,
      beatDropStore,
      tickerRenderer,
      tickerStore,
    } = effects
    const audioData = getAudioAnalysisData()
    audioFxRenderer.render(ctx, width, height, audioData, audioFxStore.$state)
    beatDropRenderer.render(ctx, width, height, audioData, beatDropStore.$state)
    if (tickerRenderer && tickerStore) {
      tickerRenderer.render(ctx, width, height, audioData, tickerStore.$state)
    }
  }

  return { renderScene, renderRecordingScene, renderEffects }
}
