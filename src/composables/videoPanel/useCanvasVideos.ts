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
  playsSource,
} from './videoElements'
import {
  canMoveInStack,
  moveInStack,
  stackPosition,
  type StackAction,
  type StackObject,
} from '../../lib/canvasObjects/mediaStack'

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

  /**
   * Wiedergabe-Position und Gesamtdauer eines Canvas-Videos in Sekunden
   * (Anzeige in der Liste „Videos auf Canvas“). Unbekannte Werte sind 0.
   * Liest `tick`, damit die Anzeige während der Wiedergabe mitläuft.
   */
  function videoPlaybackTime(video: VideoObject | null | undefined): {
    current: number
    duration: number
  } {
    void tick.value
    const el = video?.videoElement
    if (!el) return { current: 0, duration: 0 }
    const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0
    return { current: el.currentTime || 0, duration }
  }

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

  /** Ebene eines Canvas-Videos setzen (legt fehlende fotoSettings an). */
  function applyBehindVisualizer(video: VideoObject, value: boolean): boolean {
    if (!video.fotoSettings) videoManager.value?.initializeVideoSettings?.(video)
    if (!video.fotoSettings) return false
    video.fotoSettings.renderBehindVisualizer = value
    return true
  }

  /** Ausgewähltes Canvas-Video hinter (true) oder vor (false) den Visualizer legen. */
  function setVideoBehindVisualizer(value: boolean) {
    const video = selectedCanvasVideo.value
    if (!video) return
    if (applyBehindVisualizer(video, value)) tick.value++
  }

  /**
   * Alle Canvas-Videos hinter (true) oder vor (false) den Visualizer legen –
   * auch einem Beat-Marker zugewiesene, gerade ausgeblendete oder laufende.
   */
  function setAllVideosBehindVisualizer(value: boolean) {
    for (const video of videoManager.value?.getAllVideos() ?? []) {
      applyBehindVisualizer(video, value)
    }
    tick.value++
  }

  /**
   * Gemeinsame Ebene aller Canvas-Videos: true/false, wenn alle gleich
   * liegen; null ohne Videos oder bei gemischten Ebenen.
   */
  function commonBehindVisualizer(): boolean | null {
    const videos = videoManager.value?.getAllVideos() ?? []
    if (videos.length === 0) return null
    const first = !!videos[0]!.fotoSettings?.renderBehindVisualizer
    return videos.every((v) => !!v.fotoSettings?.renderBehindVisualizer === first) ? first : null
  }

  /**
   * Bilder und Videos im gemeinsamen Ebenen-Stapel (canvasObjects/mediaStack)
   * – wie die Ebenen-Steuerung der Bilder im Foto-Panel.
   */
  function stackLists(): { images: StackObject[]; videos: StackObject[] } | null {
    const vm = videoManager.value
    if (!vm) return null
    return {
      images: (canvasManager.value?.multiImageManager?.images ?? []) as StackObject[],
      videos: vm.videos as StackObject[],
    }
  }

  /** „N / M“ des ausgewählten Videos im gemeinsamen Stapel ('' ohne Auswahl) */
  const selectedVideoLayerInfo = computed(() => {
    void tick.value
    const lists = stackLists()
    const video = selectedCanvasVideo.value
    if (!lists || !video) return ''
    const { index, count } = stackPosition(lists.images, lists.videos, video)
    return index === -1 ? '' : `${index + 1} / ${count}`
  })

  /** Kann das ausgewählte Video per `action` verschoben werden? */
  function canMoveSelectedVideo(action: StackAction): boolean {
    void tick.value
    const lists = stackLists()
    const video = selectedCanvasVideo.value
    if (!lists || !video) return false
    return canMoveInStack(lists.images, lists.videos, video, action)
  }

  /** Verschiebt das ausgewählte Video im gemeinsamen Stapel (auch über Bilder). */
  function moveSelectedVideo(action: StackAction): void {
    const vm = videoManager.value
    const video = selectedCanvasVideo.value
    if (!vm || !video) return
    const mim = canvasManager.value?.multiImageManager
    if (!moveInStack(mim?.images ?? [], vm.videos, video, action)) return
    mim?.redrawCallback?.()
    // Verlauf und Thumbnail-Leisten beider Listen aktualisieren
    mim?.onImageChanged?.()
    vm.onVideoChanged?.()
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

  /**
   * Entfernt alle Canvas-Videos, die die Quelle `src` abspielen (z. B. ein
   * aus der Galerie gelöschtes Video): Audio von der Aufnahme trennen,
   * Element freigeben, Auswahl nur aufheben, wenn sie ein entferntes Video war.
   * @returns Anzahl entfernter Videos
   */
  function removeCanvasVideosWithSource(src: string): number {
    const vm = videoManager.value
    if (!vm || !src) return 0
    const matches = (vm.getAllVideos() || []).filter((v) => playsSource(v.videoElement, src))
    for (const video of matches) {
      if (video.videoElement) {
        getAudioEngine()?.disconnectVideoFromRecording(video.videoElement)
      }
      vm.removeVideo(video.id)
      const cm = canvasManager.value
      if (cm?.activeObject && cm.activeObject.id === video.id) cm.setActiveObject(null)
    }
    return matches.length
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
    videoPlaybackTime,
    setVideoBehindVisualizer,
    setAllVideosBehindVisualizer,
    selectedVideoLayerInfo,
    canMoveSelectedVideo,
    moveSelectedVideo,
    commonBehindVisualizer,
    isVideoActive,
    selectCanvasVideo,
    togglePlayVideo,
    removeCanvasVideo,
    removeCanvasVideosWithSource,
    playAllVideos,
    pauseAllVideos,
    seekToTime,
    seekBackward,
    seekForward,
    updateVideoVolume,
    connectVideoAudioForRecording,
  }
}
