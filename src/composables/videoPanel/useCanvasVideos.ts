import { computed, type Ref } from 'vue'
import type { VideoManager, VideoObject } from '../../lib/videoManager'
import type { CanvasManagerRef } from '../types'
import { getAudioEngine } from '../../lib/audioEngineBridge'
import {
  seekTo,
  seekBackwardBy,
  seekForwardBy,
  displayVolume,
  connectToRecording,
  setCanvasVideoVolume,
} from './videoElements'

/** Ref auf den VideoManager (null, solange er nicht bereit ist) */
export type VideoManagerRef = Ref<VideoManager | null | undefined>

/**
 * Videos auf dem Canvas (VideoManager): Liste, Auswahl, Wiedergabe,
 * Zeitsprünge, Lautstärke und Entfernen.
 *
 * @param tick - wird regelmäßig erhöht (Zeit-/Lautstärke-Anzeige)
 */
export function useCanvasVideos(
  canvasManager: CanvasManagerRef,
  videoManager: VideoManagerRef,
  tick: Ref<number>,
) {
  const canvasVideos = computed<VideoObject[]>(() => {
    if (!videoManager.value) return []
    return videoManager.value.getAllVideos() || []
  })

  const selectedCanvasVideo = computed<VideoObject | null>(() => {
    const cm = canvasManager.value
    if (!cm || !cm.activeObject) return null
    return cm.activeObject.type === 'video' ? cm.activeObject : null
  })

  const selectedVideoCurrentTime = computed(() => {
    void tick.value
    return selectedCanvasVideo.value?.videoElement?.currentTime || 0
  })

  const selectedVideoDuration = computed(
    () => selectedCanvasVideo.value?.videoElement?.duration || 0,
  )

  const selectedVideoVolume = computed(() => {
    void tick.value
    const el = selectedCanvasVideo.value?.videoElement
    return el ? displayVolume(el) : 1
  })

  /** Wird das ausgewählte Canvas-Video hinter dem Visualizer gezeichnet? */
  const selectedVideoBehindVisualizer = computed(() => {
    void tick.value
    return !!selectedCanvasVideo.value?.fotoSettings?.renderBehindVisualizer
  })

  /** Ausgewähltes Canvas-Video hinter (true) oder vor (false) den Visualizer legen. */
  function setVideoBehindVisualizer(value: boolean) {
    const video = selectedCanvasVideo.value
    if (!video) return
    if (!video.fotoSettings) videoManager.value?.initializeVideoSettings(video)
    if (!video.fotoSettings) return
    video.fotoSettings.renderBehindVisualizer = value
    tick.value++
  }

  function isVideoActive(video: VideoObject) {
    const cm = canvasManager.value
    if (!cm) return false
    return cm.activeObject && cm.activeObject.id === video.id
  }

  function selectCanvasVideo(video: VideoObject) {
    canvasManager.value?.setActiveObject(video)
  }

  /** Video-Audio mit der Aufnahme verbinden (aktuelle Lautstärke, 0 wenn stumm). */
  function connectVideoAudioForRecording(video: VideoObject | null | undefined) {
    if (!video || !video.videoElement) return
    const el = video.videoElement
    connectToRecording(el, el.muted ? 0 : el.volume)
  }

  function togglePlayVideo(video: VideoObject) {
    const vm = videoManager.value
    if (!vm) return

    if (video.isPlaying) {
      vm.pauseVideo(video.id)
    } else {
      connectVideoAudioForRecording(video)
      vm.playVideo(video.id)
    }
  }

  function removeCanvasVideo(video: VideoObject) {
    // Video-Audio vom Recording trennen
    if (video && video.videoElement) {
      getAudioEngine()?.disconnectVideoFromRecording(video.videoElement)
    }
    videoManager.value?.removeVideo(video.id)
    // Auswahl im CanvasManager zurücksetzen, um die Markierung zu entfernen
    canvasManager.value?.setActiveObject(null)
  }

  function playAllVideos() {
    const vm = videoManager.value
    if (!vm) return
    const videos = vm.getAllVideos() || []
    videos.forEach((video) => connectVideoAudioForRecording(video))
    vm.playAll()
  }

  function pauseAllVideos() {
    videoManager.value?.pauseAll()
  }

  /** Führt fn mit dem Video-Element aus (ohne Element: nichts). */
  const withElement =
    <A extends unknown[]>(fn: (el: HTMLVideoElement, ...args: A) => void) =>
    (video: VideoObject | null | undefined, ...args: A) => {
      if (video?.videoElement) fn(video.videoElement, ...args)
    }

  const seekToTime = withElement(seekTo)
  const seekBackward = withElement(seekBackwardBy)
  const seekForward = withElement(seekForwardBy)

  /** Lautstärke des ausgewählten Canvas-Videos (Regler). */
  function updateVideoVolume(value: string | number) {
    const el = selectedCanvasVideo.value?.videoElement
    if (!el) return
    const volume = setCanvasVideoVolume(el, value)
    tick.value++
    console.log('🔊 Canvas-Video Lautstärke:', Math.round(volume * 100) + '%')
  }

  return {
    canvasVideos,
    selectedCanvasVideo,
    selectedVideoCurrentTime,
    selectedVideoDuration,
    selectedVideoVolume,
    selectedVideoBehindVisualizer,
    setVideoBehindVisualizer,
    isVideoActive,
    selectCanvasVideo,
    togglePlayVideo,
    removeCanvasVideo,
    playAllVideos,
    pauseAllVideos,
    seekToTime,
    seekBackward,
    seekForward,
    updateVideoVolume,
    connectVideoAudioForRecording,
  }
}
