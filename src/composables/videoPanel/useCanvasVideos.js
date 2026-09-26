import { computed } from 'vue'
import {
  seekTo,
  seekBackwardBy,
  seekForwardBy,
  displayVolume,
  connectToRecording,
  setCanvasVideoVolume,
} from './videoElements.js'

/**
 * Videos auf dem Canvas (VideoManager): Liste, Auswahl, Wiedergabe,
 * Zeitsprünge, Lautstärke und Entfernen.
 *
 * @param {import('vue').Ref<object|null>} canvasManager
 * @param {import('vue').Ref<object|null>} videoManager
 * @param {import('vue').Ref<number>} tick - wird regelmäßig erhöht (Zeit-/Lautstärke-Anzeige)
 */
export function useCanvasVideos(canvasManager, videoManager, tick) {
  const canvasVideos = computed(() => {
    if (!videoManager.value) return []
    return videoManager.value.getAllVideos() || []
  })

  const selectedCanvasVideo = computed(() => {
    const cm = canvasManager.value
    if (!cm || !cm.activeObject) return null
    return cm.activeObject.type === 'video' ? cm.activeObject : null
  })

  const selectedVideoCurrentTime = computed(() => {
    tick.value
    return selectedCanvasVideo.value?.videoElement?.currentTime || 0
  })

  const selectedVideoDuration = computed(
    () => selectedCanvasVideo.value?.videoElement?.duration || 0,
  )

  const selectedVideoVolume = computed(() => {
    tick.value
    const el = selectedCanvasVideo.value?.videoElement
    return el ? displayVolume(el) : 1
  })

  function isVideoActive(video) {
    const cm = canvasManager.value
    if (!cm) return false
    return cm.activeObject && cm.activeObject.id === video.id
  }

  function selectCanvasVideo(video) {
    canvasManager.value?.setActiveObject(video)
  }

  /** Video-Audio mit der Aufnahme verbinden (aktuelle Lautstärke, 0 wenn stumm). */
  function connectVideoAudioForRecording(video) {
    if (!video || !video.videoElement) return
    const el = video.videoElement
    connectToRecording(el, el.muted ? 0 : el.volume)
  }

  function togglePlayVideo(video) {
    const vm = videoManager.value
    if (!vm) return

    if (video.isPlaying) {
      vm.pauseVideo(video.id)
    } else {
      connectVideoAudioForRecording(video)
      vm.playVideo(video.id)
    }
  }

  function removeCanvasVideo(video) {
    // Video-Audio vom Recording trennen
    if (video && video.videoElement && window.disconnectVideoFromRecording) {
      window.disconnectVideoFromRecording(video.videoElement)
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
    (fn) =>
    (video, ...args) => {
      if (video?.videoElement) fn(video.videoElement, ...args)
    }

  const seekToTime = withElement(seekTo)
  const seekBackward = withElement(seekBackwardBy)
  const seekForward = withElement(seekForwardBy)

  /** Lautstärke des ausgewählten Canvas-Videos (Regler). */
  function updateVideoVolume(value) {
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
