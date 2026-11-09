import { ref, inject, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from '../lib/i18n'
import {
  formatTime,
  createVideoElement,
  applyMuted,
  ensureAudible,
  connectToRecording,
  type VideoElementOptions,
} from './videoPanel/videoElements'
import { useVideoGallery, type GalleryVideo } from './videoPanel/useVideoGallery'
import { useCanvasVideos, type VideoManagerRef } from './videoPanel/useCanvasVideos'
import { useBackgroundVideo } from './videoPanel/useBackgroundVideo'
import type { CanvasManager } from '../lib/canvasManager'
import type { VideoObject } from '../lib/videoManager'
import type { CanvasManagerRef } from './types'
import { isReleasedMedia } from '../lib/mediaElements'

/** Optionen für setBackgroundFromGallery */
interface BackgroundFromGalleryOptions {
  requireWorkspace: boolean
  apply: (cm: CanvasManager, video: HTMLVideoElement) => void
  label: string
  errorLabel: string
}

/**
 * Video-Panel (Fassade): Galerie hochgeladener Videos, Platzieren auf dem
 * Canvas bzw. als (Workspace-)Hintergrund, Steuerung der Canvas- und
 * Hintergrund-Videos sowie Stumm/Wiederholen für alle Videos.
 * Die Teilbereiche liegen in `videoPanel/`; die zurückgegebene API ist stabil
 * (per provide/inject von den Video-Panel-Komponenten genutzt).
 */
export type VideoPanelApi = ReturnType<typeof useVideoPanel>

export function useVideoPanel() {
  const { locale } = useI18n()

  // Werden von der App bereitgestellt (provide)
  const canvasManager = inject('canvasManager') as CanvasManagerRef
  const videoManager = inject('videoManager') as VideoManagerRef

  // Platzierungs-Einstellungen
  const selectedAnimation = ref('none')
  const animationDuration = ref(500)
  const videoScale = ref(3)
  const videoLoop = ref(true)
  const videoMuted = ref(false)

  // Wird alle 250 ms erhöht → Zeit-/Lautstärke-Anzeigen lesen die Videos neu
  const videoTimeUpdateKey = ref(0)
  let timeUpdateInterval: ReturnType<typeof setInterval> | null = null

  const gallery = useVideoGallery()
  const canvasVideos = useCanvasVideos(canvasManager, videoManager, videoTimeUpdateKey)
  const bg = useBackgroundVideo(
    canvasManager,
    'videoBackground',
    videoTimeUpdateKey,
    'Video-Hintergrund',
  )
  const wsBg = useBackgroundVideo(
    canvasManager,
    'workspaceVideoBackground',
    videoTimeUpdateKey,
    'Workspace-Video-Hintergrund',
  )

  const hasVideoBackground = computed(() => bg.entry.value || wsBg.entry.value)

  // ─── Platzieren ─────────────────────────────────────────────────────────

  /** Neues Video-Element aus dem gewählten Galerie-Video (Galerie-Element nie wiederverwenden). */
  function createPlacementVideo(videoData: GalleryVideo, extra: Partial<VideoElementOptions> = {}) {
    return createVideoElement(videoData.src, {
      preload: 'auto',
      muted: videoMuted.value,
      loop: videoLoop.value,
      ...extra,
    })
  }

  /**
   * Legt ein Galerie-Video mit den aktuellen Platzierungs-Einstellungen
   * (Effekt, Dauer, Größe, Wiederholen, Stumm) auf den Canvas. Das Video
   * startet nicht automatisch – der Nutzer bzw. ein Beat-Marker steuert die
   * Wiedergabe.
   * @param videoData - Galerie-Video
   * @param options.select - false = das neue Video nicht auswählen
   * @returns das neue Canvas-Video (null ohne VideoManager oder bei Ladefehler)
   */
  function placeVideoOnCanvas(
    videoData: GalleryVideo | null | undefined,
    { select = true }: { select?: boolean } = {},
  ): Promise<VideoObject | null> {
    if (!videoData || !videoData.videoElement) return Promise.resolve(null)

    const vm = videoManager.value
    if (!vm) {
      console.error('VideoManager nicht verfügbar')
      return Promise.resolve(null)
    }

    const canvasVideo = createPlacementVideo(videoData)

    return new Promise((resolve) => {
      canvasVideo.onloadeddata = () => {
        // Breite: 1/3 der Canvas-Breite bei Skalierung 3
        const baseWidth = 1 / 3
        const scaledWidth = baseWidth * (videoScale.value / 3)

        Promise.resolve(
          vm.addVideo(canvasVideo, {
            relWidth: scaledWidth,
            loop: videoLoop.value,
            muted: videoMuted.value,
            animation: selectedAnimation.value,
            animationDuration: animationDuration.value,
            name: videoData.name,
            select,
          }),
        ).then(resolve, () => resolve(null))
        console.log('✅ Video auf Canvas platziert')
      }

      canvasVideo.onerror = () => {
        if (isReleasedMedia(canvasVideo)) return
        console.error('❌ Fehler beim Laden des Videos für Canvas')
        resolve(null)
      }

      canvasVideo.load()
    })
  }

  function addVideoDirectly() {
    // Nicht automatisch starten – der Nutzer steuert die Wiedergabe
    void placeVideoOnCanvas(gallery.selectedVideo())
  }

  function addVideoToCanvas() {
    addVideoDirectly()
  }

  /**
   * Gewähltes Galerie-Video als (Workspace-)Hintergrund setzen; ist der Ton an,
   * wird das Video mit der Aufnahme verbunden.
   */
  function setBackgroundFromGallery({
    requireWorkspace,
    apply,
    label,
    errorLabel,
  }: BackgroundFromGalleryOptions) {
    const videoData = gallery.selectedVideo()
    if (!videoData) return

    const cm = canvasManager.value
    if (!cm) {
      console.error('CanvasManager nicht verfügbar')
      return
    }

    if (requireWorkspace && !cm.workspacePreset) {
      console.warn('Kein Workspace ausgewählt. Bitte wähle zuerst ein Format aus.')
      return
    }

    const video = createPlacementVideo(videoData, { volume: 1 })

    video.onloadeddata = () => {
      apply(cm, video)
      if (!video.muted) connectToRecording(video, video.volume)
      console.log(`✅ Video als ${label} gesetzt, Muted:`, video.muted)
    }

    video.onerror = () => {
      if (isReleasedMedia(video)) return
      console.error(`❌ Fehler beim Laden des ${errorLabel}`)
    }

    video.load()
  }

  function setVideoAsBackground() {
    setBackgroundFromGallery({
      requireWorkspace: false,
      apply: (cm, video) => cm.setVideoBackground(video),
      label: 'Hintergrund',
      errorLabel: 'Video-Hintergrunds',
    })
  }

  function setVideoAsWorkspaceBackground() {
    setBackgroundFromGallery({
      requireWorkspace: true,
      apply: (cm, video) => cm.setWorkspaceVideoBackground(video),
      label: 'Workspace-Hintergrund',
      errorLabel: 'Workspace-Video-Hintergrunds',
    })
  }

  // ─── Stumm / Wiederholen für alle Videos ────────────────────────────────

  /** Video-Elemente der Hintergründe (Haupt- und Workspace), die gesetzt sind. */
  function backgroundElements(): [HTMLVideoElement, string][] {
    const cm = canvasManager.value
    if (!cm) return []
    const entries: [HTMLVideoElement | undefined, string][] = [
      [cm.videoBackground?.videoElement, 'Hintergrund-Video'],
      [cm.workspaceVideoBackground?.videoElement, 'Workspace-Hintergrund-Video'],
    ]
    return entries.filter((e): e is [HTMLVideoElement, string] => !!e[0])
  }

  // Stumm-Einstellung auf alle Canvas- und Hintergrund-Videos übertragen
  watch(videoMuted, (newMuted) => {
    const vm = videoManager.value
    if (vm) {
      for (const video of vm.getAllVideos() || []) {
        if (!video.videoElement) continue
        video.videoElement.muted = newMuted
        video.muted = newMuted
        if (!newMuted) ensureAudible(video.videoElement)
      }
      console.log(`🔊 Alle Canvas-Videos ${newMuted ? 'stumm geschaltet' : 'Ton aktiviert'}`)
    }

    for (const [el, label] of backgroundElements()) {
      applyMuted(el, newMuted)
      console.log(`🔊 ${label} ${newMuted ? 'stumm geschaltet' : 'Ton aktiviert'}`)
    }

    videoTimeUpdateKey.value++
  })

  // Wiederholen-Einstellung auf alle Canvas- und Hintergrund-Videos übertragen
  watch(videoLoop, (newLoop) => {
    const vm = videoManager.value
    if (vm) {
      for (const video of vm.getAllVideos() || []) {
        if (!video.videoElement) continue
        video.videoElement.loop = newLoop
        video.loop = newLoop
      }
      console.log(`🔁 Alle Canvas-Videos Wiederholen: ${newLoop ? 'aktiviert' : 'deaktiviert'}`)
    }

    for (const [el, label] of backgroundElements()) {
      el.loop = newLoop
      console.log(`🔁 ${label} Wiederholen: ${newLoop ? 'aktiviert' : 'deaktiviert'}`)
    }
  })

  // ─── Lebenszyklus ───────────────────────────────────────────────────────

  onMounted(() => {
    console.log('✅ VideoPanel mounted')
    timeUpdateInterval = setInterval(() => {
      videoTimeUpdateKey.value++
    }, 250)
  })

  onUnmounted(() => {
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval)
      timeUpdateInterval = null
    }
  })

  return {
    locale,
    fileInputRef: gallery.fileInputRef,
    videoGallery: gallery.videoGallery,
    selectedVideoIndex: gallery.selectedVideoIndex,
    selectedAnimation,
    animationDuration,
    videoScale,
    videoLoop,
    videoMuted,
    videoTimeUpdateKey,
    canvasVideos: canvasVideos.canvasVideos,
    selectedCanvasVideo: canvasVideos.selectedCanvasVideo,
    selectedVideoCurrentTime: canvasVideos.selectedVideoCurrentTime,
    selectedVideoDuration: canvasVideos.selectedVideoDuration,
    selectedVideoVolume: canvasVideos.selectedVideoVolume,
    videoBackground: bg.entry,
    workspaceVideoBackground: wsBg.entry,
    hasVideoBackground,
    isVideoBackgroundPlaying: bg.isPlaying,
    isWsVideoBackgroundPlaying: wsBg.isPlaying,
    videoBackgroundTime: bg.time,
    videoBackgroundDuration: bg.duration,
    wsVideoBackgroundTime: wsBg.time,
    wsVideoBackgroundDuration: wsBg.duration,
    videoBackgroundVolume: bg.volume,
    wsVideoBackgroundVolume: wsBg.volume,
    triggerFileInput: gallery.triggerFileInput,
    handleDrop: gallery.handleDrop,
    handleVideoUpload: gallery.handleVideoUpload,
    processVideoFile: gallery.processVideoFile,
    generateThumbnail: gallery.generateThumbnail,
    selectVideo: gallery.selectVideo,
    deleteVideo: gallery.deleteVideo,
    clearAllVideos: gallery.clearAllVideos,
    formatDuration: formatTime,
    addVideoToCanvas,
    addVideoDirectly,
    placeVideoOnCanvas,
    setVideoAsBackground,
    setVideoAsWorkspaceBackground,
    isVideoActive: canvasVideos.isVideoActive,
    selectCanvasVideo: canvasVideos.selectCanvasVideo,
    togglePlayVideo: canvasVideos.togglePlayVideo,
    removeCanvasVideo: canvasVideos.removeCanvasVideo,
    playAllVideos: canvasVideos.playAllVideos,
    pauseAllVideos: canvasVideos.pauseAllVideos,
    formatTime,
    seekToTime: canvasVideos.seekToTime,
    seekBackward: canvasVideos.seekBackward,
    seekForward: canvasVideos.seekForward,
    updateVideoVolume: canvasVideos.updateVideoVolume,
    connectVideoAudioForRecording: canvasVideos.connectVideoAudioForRecording,
    toggleVideoBackground: bg.toggle,
    toggleWsVideoBackground: wsBg.toggle,
    seekVideoBackground: bg.seek,
    seekBackwardBg: bg.seekBackward,
    seekForwardBg: bg.seekForward,
    updateBgVideoVolume: bg.updateVolume,
    updateWsBgVideoVolume: wsBg.updateVolume,
    seekWsVideoBackground: wsBg.seek,
    seekBackwardWsBg: wsBg.seekBackward,
    seekForwardWsBg: wsBg.seekForward,
    removeVideoBackground: bg.remove,
    removeWsVideoBackground: wsBg.remove,
  }
}
