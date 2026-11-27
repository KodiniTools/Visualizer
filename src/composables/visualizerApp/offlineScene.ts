import { outputSize } from '../../lib/offlineExport/frameTiming'
import { setMainThreadAudioAnalysis } from '../useGlobalAudioData'
import type { Ref } from 'vue'
import type { OfflineScene } from '../../lib/offlineExport/offlineSceneBridge'
import type { CanvasManagerRef } from '../types'

/** Teil des Render-Loops (useRenderLoop), den der Offline-Export nutzt */
export interface OfflineSceneRenderLoop {
  beginOffline: () => void
  renderOfflineFrame: OfflineScene['renderFrame']
  endOffline: () => void
}

export interface OfflineSceneDeps {
  renderLoop: OfflineSceneRenderLoop
  canvasRef: Ref<HTMLCanvasElement | null | undefined>
  canvasManagerInstance: CanvasManagerRef
  /** Videos der Szene (siehe collectSceneVideos) */
  videos?: () => HTMLVideoElement[]
}

interface SceneVideoSources {
  canvasManager?: {
    videoBackground?: { videoElement?: HTMLVideoElement | null } | null
    workspaceVideoBackground?: { videoElement?: HTMLVideoElement | null } | null
  } | null
  videoManager?: { videos: { videoElement?: HTMLVideoElement | null }[] } | null
  tiles?: readonly { video?: HTMLVideoElement | null }[] | null
}

/** Alle gezeichneten Videos: Canvas-Videos, Video-Hintergründe, Kachel-Videos (ohne Doppelte) */
export function collectSceneVideos({
  canvasManager,
  videoManager,
  tiles,
}: SceneVideoSources): HTMLVideoElement[] {
  const found = new Set<HTMLVideoElement>()
  const add = (v: HTMLVideoElement | null | undefined) => {
    if (v) found.add(v)
  }
  add(canvasManager?.videoBackground?.videoElement)
  add(canvasManager?.workspaceVideoBackground?.videoElement)
  for (const video of videoManager?.videos ?? []) add(video.videoElement)
  for (const tile of tiles ?? []) add(tile.video)
  return [...found]
}

/**
 * Szene für den Offline-Export (lib/offlineExport/offlineSceneBridge):
 * Ausgabegröße wie Screenshot/Aufnahme (Workspace-Format, sonst Canvas),
 * Rendern über den Render-Loop, Audio-Analyse synchron im Main-Thread.
 */
export function createOfflineScene({
  renderLoop,
  canvasRef,
  canvasManagerInstance,
  videos,
}: OfflineSceneDeps): OfflineScene {
  return {
    videos: () => videos?.() ?? [],
    outputSize() {
      const preset = canvasManagerInstance.value?.workspacePreset
      const canvas = canvasRef.value
      return outputSize(
        preset?.width || canvas?.width || 1920,
        preset?.height || canvas?.height || 1080,
      )
    },
    begin() {
      setMainThreadAudioAnalysis(true)
      renderLoop.beginOffline()
    },
    renderFrame: (analyser, target, width, height) =>
      renderLoop.renderOfflineFrame(analyser, target, width, height),
    end() {
      renderLoop.endOffline()
      setMainThreadAudioAnalysis(false)
    },
  }
}
