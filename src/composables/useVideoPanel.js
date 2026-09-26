import { ref, inject, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from '../lib/i18n.js'
import {
  formatTime,
  createVideoElement,
  applyMuted,
  ensureAudible,
  connectToRecording,
} from './videoPanel/videoElements.js'
import { useVideoGallery } from './videoPanel/useVideoGallery.js'
import { useCanvasVideos } from './videoPanel/useCanvasVideos.js'
import { useBackgroundVideo } from './videoPanel/useBackgroundVideo.js'

/**
 * Video-Panel (Fassade): Galerie hochgeladener Videos, Platzieren auf dem
 * Canvas bzw. als (Workspace-)Hintergrund, Steuerung der Canvas- und
 * Hintergrund-Videos sowie Stumm/Wiederholen für alle Videos.
 * Die Teilbereiche liegen in `videoPanel/`; die zurückgegebene API ist stabil
 * (per provide/inject von den Video-Panel-Komponenten genutzt).
 */
export function useVideoPanel() {
  const { locale } = useI18n()

  const canvasManager = inject('canvasManager')
  const videoManager = inject('videoManager')

  // Platzierungs-Einstellungen
  const selectedAnimation = ref('none')
  const animationDuration = ref(500)
  const videoScale = ref(3)
  const videoLoop = ref(true)
  const videoMuted = ref(false)

  // Wird alle 250 ms erhöht → Zeit-/Lautstärke-Anzeigen lesen die Videos neu
  const videoTimeUpdateKey = ref(0)
  let timeUpdateInterval = null

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
  function createPlacementVideo(videoData, extra = {}) {
    return createVideoElement(videoData.src, {
      preload: 'auto',
      muted: videoMuted.value,
      loop: videoLoop.value,
      ...extra,
    })
  }

  function addVideoDirectly() {
    const videoData = gallery.selectedVideo()
    if (!videoData || !videoData.videoElement) return

    const vm = videoManager.value
    if (!vm) {
      console.error('VideoManager nicht verfügbar')
      return
    }

    const canvasVideo = createPlacementVideo(videoData)

    canvasVideo.onloadeddata = () => {
      // Breite: 1/3 der Canvas-Breite bei Skalierung 3
      const baseWidth = 1 / 3
      const scaledWidth = baseWidth * (videoScale.value / 3)

      vm.addVideo(canvasVideo, {
        relWidth: scaledWidth,
        loop: videoLoop.value,
        muted: videoMuted.value,
        animation: selectedAnimation.value,
        animationDuration: animationDuration.value,
      })
      // Nicht automatisch starten – der Nutzer steuert die Wiedergabe
      console.log('✅ Video auf Canvas platziert')
    }

    canvasVideo.onerror = () => {
      console.error('❌ Fehler beim Laden des Videos für Canvas')
    }

    canvasVideo.load()
  }

  function addVideoToCanvas() {
    addVideoDirectly()
  }

  /**
   * Gewähltes Galerie-Video als (Workspace-)Hintergrund setzen; ist der Ton an,
   * wird das Video mit der Aufnahme verbunden.
   */
  function setBackgroundFromGallery({ requireWorkspace, apply, label, errorLabel }) {
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
  function backgroundElements() {
    const cm = canvasManager.value
    if (!cm) return []
    return [
      [cm.videoBackground?.videoElement, 'Hintergrund-Video'],
      [cm.workspaceVideoBackground?.videoElement, 'Workspace-Hintergrund-Video'],
    ].filter(([el]) => el)
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
