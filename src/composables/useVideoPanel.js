import { ref, computed, inject, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from '../lib/i18n.js'

export function useVideoPanel() {
  const { locale } = useI18n()

  // Injected dependencies
  const canvasManager = inject('canvasManager')
  const videoManager = inject('videoManager')

  // Refs
  const fileInputRef = ref(null)
  const videoGallery = ref([])
  const selectedVideoIndex = ref(null)

  // Placement settings
  const selectedAnimation = ref('none')
  const animationDuration = ref(500)
  const videoScale = ref(3)
  const videoLoop = ref(true)
  const videoMuted = ref(false)

  // Reactive video time updates
  const videoTimeUpdateKey = ref(0)
  let timeUpdateInterval = null

  // Computed
  const canvasVideos = computed(() => {
    if (!videoManager.value) return []
    return videoManager.value.getAllVideos() || []
  })

  const selectedCanvasVideo = computed(() => {
    const cm = canvasManager.value
    if (!cm || !cm.activeObject) return null
    if (cm.activeObject.type === 'video') {
      return cm.activeObject
    }
    return null
  })

  const selectedVideoCurrentTime = computed(() => {
    videoTimeUpdateKey.value // Trigger reactivity
    const video = selectedCanvasVideo.value
    if (!video || !video.videoElement) return 0
    return video.videoElement.currentTime || 0
  })

  const selectedVideoDuration = computed(() => {
    const video = selectedCanvasVideo.value
    if (!video || !video.videoElement) return 0
    return video.videoElement.duration || 0
  })

  const selectedVideoVolume = computed(() => {
    videoTimeUpdateKey.value // Trigger reactivity
    const video = selectedCanvasVideo.value
    if (!video || !video.videoElement) return 1
    if (video.videoElement.muted) return 0
    return video.videoElement.volume || 1
  })

  const videoBackground = computed(() => {
    const cm = canvasManager.value
    if (!cm) return null
    return cm.videoBackground
  })

  const workspaceVideoBackground = computed(() => {
    const cm = canvasManager.value
    if (!cm) return null
    return cm.workspaceVideoBackground
  })

  const hasVideoBackground = computed(() => {
    return videoBackground.value || workspaceVideoBackground.value
  })

  const isVideoBackgroundPlaying = computed(() => {
    videoTimeUpdateKey.value
    const vbg = videoBackground.value
    if (!vbg || !vbg.videoElement) return false
    return !vbg.videoElement.paused
  })

  const isWsVideoBackgroundPlaying = computed(() => {
    videoTimeUpdateKey.value
    const wsvbg = workspaceVideoBackground.value
    if (!wsvbg || !wsvbg.videoElement) return false
    return !wsvbg.videoElement.paused
  })

  const videoBackgroundTime = computed(() => {
    videoTimeUpdateKey.value
    const vbg = videoBackground.value
    if (!vbg || !vbg.videoElement) return 0
    return vbg.videoElement.currentTime || 0
  })

  const videoBackgroundDuration = computed(() => {
    const vbg = videoBackground.value
    if (!vbg || !vbg.videoElement) return 0
    return vbg.videoElement.duration || 0
  })

  const wsVideoBackgroundTime = computed(() => {
    videoTimeUpdateKey.value
    const wsvbg = workspaceVideoBackground.value
    if (!wsvbg || !wsvbg.videoElement) return 0
    return wsvbg.videoElement.currentTime || 0
  })

  const wsVideoBackgroundDuration = computed(() => {
    const wsvbg = workspaceVideoBackground.value
    if (!wsvbg || !wsvbg.videoElement) return 0
    return wsvbg.videoElement.duration || 0
  })

  const videoBackgroundVolume = computed(() => {
    videoTimeUpdateKey.value // Trigger reactivity
    const vbg = videoBackground.value
    if (!vbg || !vbg.videoElement) return 1
    if (vbg.videoElement.muted) return 0
    return vbg.videoElement.volume || 1
  })

  const wsVideoBackgroundVolume = computed(() => {
    videoTimeUpdateKey.value // Trigger reactivity
    const wsvbg = workspaceVideoBackground.value
    if (!wsvbg || !wsvbg.videoElement) return 1
    if (wsvbg.videoElement.muted) return 0
    return wsvbg.videoElement.volume || 1
  })

  // Methods
  function triggerFileInput() {
    fileInputRef.value?.click()
  }

  function handleDrop(e) {
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      processVideoFile(files[0])
    }
  }

  function handleVideoUpload(e) {
    const file = e.target.files?.[0]
    if (file) {
      processVideoFile(file)
    }
    // Reset input
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }

  function processVideoFile(file) {
    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
    if (!validTypes.includes(file.type)) {
      console.error('Ungültiger Video-Typ:', file.type)
      return
    }

    const url = URL.createObjectURL(file)

    // Create video element to get metadata
    const video = document.createElement('video')
    video.src = url
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      const videoData = {
        id: Date.now() + Math.random(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        src: url,
        file: file,
        videoElement: video,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      }

      videoGallery.value.push(videoData)
      selectedVideoIndex.value = videoGallery.value.length - 1

      console.log(
        '✅ Video geladen:',
        videoData.name,
        `${videoData.width}x${videoData.height}`,
        `${videoData.duration.toFixed(1)}s`,
      )
    }

    video.onerror = () => {
      console.error('❌ Fehler beim Laden des Videos:', file.name)
      URL.revokeObjectURL(url)
    }

    video.load()
  }

  function generateThumbnail(event, index) {
    const video = event.target
    // Seek to first frame for thumbnail
    video.currentTime = 0.1
  }

  function selectVideo(index) {
    selectedVideoIndex.value = index
  }

  function deleteVideo(index) {
    const video = videoGallery.value[index]
    if (video.src) {
      URL.revokeObjectURL(video.src)
    }
    videoGallery.value.splice(index, 1)

    if (selectedVideoIndex.value === index) {
      selectedVideoIndex.value = videoGallery.value.length > 0 ? 0 : null
    } else if (selectedVideoIndex.value > index) {
      selectedVideoIndex.value--
    }
  }

  function clearAllVideos() {
    videoGallery.value.forEach((video) => {
      if (video.src) {
        URL.revokeObjectURL(video.src)
      }
    })
    videoGallery.value = []
    selectedVideoIndex.value = null
  }

  function formatDuration(seconds) {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function addVideoToCanvas() {
    addVideoDirectly()
  }

  function addVideoDirectly() {
    if (selectedVideoIndex.value === null) return

    const videoData = videoGallery.value[selectedVideoIndex.value]
    if (!videoData || !videoData.videoElement) return

    const vm = videoManager.value
    if (!vm) {
      console.error('VideoManager nicht verfügbar')
      return
    }

    // Create a new video element for canvas (don't reuse the gallery one)
    const canvasVideo = document.createElement('video')
    canvasVideo.src = videoData.src
    canvasVideo.crossOrigin = 'anonymous'
    canvasVideo.preload = 'auto'
    canvasVideo.muted = videoMuted.value
    canvasVideo.loop = videoLoop.value

    canvasVideo.onloadeddata = () => {
      // Calculate size based on scale
      const baseWidth = 1 / 3 // 1/3 of canvas width
      const scaledWidth = baseWidth * (videoScale.value / 3)

      const options = {
        relWidth: scaledWidth,
        loop: videoLoop.value,
        muted: videoMuted.value,
        animation: selectedAnimation.value,
        animationDuration: animationDuration.value,
      }

      vm.addVideo(canvasVideo, options)

      // Video NICHT automatisch starten - Nutzer soll über Steuerung kontrollieren

      console.log('✅ Video auf Canvas platziert')
    }

    canvasVideo.onerror = () => {
      console.error('❌ Fehler beim Laden des Videos für Canvas')
    }

    canvasVideo.load()
  }

  function setVideoAsBackground() {
    if (selectedVideoIndex.value === null) return

    const videoData = videoGallery.value[selectedVideoIndex.value]
    if (!videoData) return

    const cm = canvasManager.value
    if (!cm) {
      console.error('CanvasManager nicht verfügbar')
      return
    }

    // Create a new video element for background
    const bgVideo = document.createElement('video')
    bgVideo.src = videoData.src
    bgVideo.crossOrigin = 'anonymous'
    bgVideo.preload = 'auto'
    bgVideo.muted = videoMuted.value
    bgVideo.loop = videoLoop.value
    bgVideo.volume = 1

    bgVideo.onloadeddata = () => {
      cm.setVideoBackground(bgVideo)
      // NEU: Audio mit Recording verbinden
      if (!bgVideo.muted && window.connectVideoToRecording) {
        window.connectVideoToRecording(bgVideo, bgVideo.volume)
      }
      console.log('✅ Video als Hintergrund gesetzt, Muted:', bgVideo.muted)
    }

    bgVideo.onerror = () => {
      console.error('❌ Fehler beim Laden des Video-Hintergrunds')
    }

    bgVideo.load()
  }

  function setVideoAsWorkspaceBackground() {
    if (selectedVideoIndex.value === null) return

    const videoData = videoGallery.value[selectedVideoIndex.value]
    if (!videoData) return

    const cm = canvasManager.value
    if (!cm) {
      console.error('CanvasManager nicht verfügbar')
      return
    }

    if (!cm.workspacePreset) {
      console.warn('Kein Workspace ausgewählt. Bitte wähle zuerst ein Format aus.')
      return
    }

    // Create a new video element for workspace background
    const wsBgVideo = document.createElement('video')
    wsBgVideo.src = videoData.src
    wsBgVideo.crossOrigin = 'anonymous'
    wsBgVideo.preload = 'auto'
    wsBgVideo.muted = videoMuted.value
    wsBgVideo.loop = videoLoop.value
    wsBgVideo.volume = 1

    wsBgVideo.onloadeddata = () => {
      cm.setWorkspaceVideoBackground(wsBgVideo)
      // NEU: Audio mit Recording verbinden
      if (!wsBgVideo.muted && window.connectVideoToRecording) {
        window.connectVideoToRecording(wsBgVideo, wsBgVideo.volume)
      }
      console.log('✅ Video als Workspace-Hintergrund gesetzt, Muted:', wsBgVideo.muted)
    }

    wsBgVideo.onerror = () => {
      console.error('❌ Fehler beim Laden des Workspace-Video-Hintergrunds')
    }

    wsBgVideo.load()
  }

  function isVideoActive(video) {
    const cm = canvasManager.value
    if (!cm) return false
    return cm.activeObject && cm.activeObject.id === video.id
  }

  function selectCanvasVideo(video) {
    const cm = canvasManager.value
    if (cm) {
      cm.setActiveObject(video)
    }
  }

  function togglePlayVideo(video) {
    const vm = videoManager.value
    if (!vm) return

    if (video.isPlaying) {
      vm.pauseVideo(video.id)
    } else {
      // Video-Audio mit Recording verbinden beim Abspielen
      connectVideoAudioForRecording(video)
      vm.playVideo(video.id)
    }
  }

  function removeCanvasVideo(video) {
    // Video-Audio vom Recording trennen
    if (video && video.videoElement && window.disconnectVideoFromRecording) {
      window.disconnectVideoFromRecording(video.videoElement)
    }

    const vm = videoManager.value
    const cm = canvasManager.value

    if (vm) {
      vm.removeVideo(video.id)
    }

    // FIX: Auswahl im CanvasManager zurücksetzen, um Markierung zu entfernen
    if (cm) {
      cm.setActiveObject(null)
    }
  }

  function playAllVideos() {
    const vm = videoManager.value
    if (vm) {
      // Alle Videos mit Recording verbinden
      const videos = vm.getAllVideos() || []
      videos.forEach((video) => connectVideoAudioForRecording(video))
      vm.playAll()
    }
  }

  function pauseAllVideos() {
    const vm = videoManager.value
    if (vm) {
      vm.pauseAll()
    }
  }

  function formatTime(seconds) {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function seekToTime(video, time) {
    if (!video || !video.videoElement) return
    video.videoElement.currentTime = parseFloat(time)
  }

  function seekBackward(video, seconds) {
    if (!video || !video.videoElement) return
    video.videoElement.currentTime = Math.max(0, video.videoElement.currentTime - seconds)
  }

  function seekForward(video, seconds) {
    if (!video || !video.videoElement) return
    const duration = video.videoElement.duration || 0
    video.videoElement.currentTime = Math.min(duration, video.videoElement.currentTime + seconds)
  }

  function updateVideoVolume(value) {
    const video = selectedCanvasVideo.value
    if (!video || !video.videoElement) return

    const volume = parseFloat(value)

    // FIX: Zuerst muted deaktivieren, dann Lautstärke setzen
    if (volume > 0) {
      video.videoElement.muted = false
    }
    video.videoElement.volume = volume
    if (volume === 0) {
      video.videoElement.muted = true
    }

    // Mit Recording-Graph verbinden falls nicht schon verbunden
    if (volume > 0 && window.connectVideoToRecording) {
      window.connectVideoToRecording(video.videoElement, volume)
    }

    // Lautstärke auch im Recording-Graph aktualisieren
    if (window.setVideoVolume) {
      window.setVideoVolume(video.videoElement, volume)
    }

    // Trigger reactivity update
    videoTimeUpdateKey.value++
    console.log('🔊 Canvas-Video Lautstärke:', Math.round(volume * 100) + '%')
  }

  function connectVideoAudioForRecording(video) {
    if (!video || !video.videoElement) return

    // Video-Audio mit Recording verbinden
    if (window.connectVideoToRecording) {
      const volume = video.videoElement.muted ? 0 : video.videoElement.volume
      window.connectVideoToRecording(video.videoElement, volume)
    }
  }

  function toggleVideoBackground() {
    const vbg = videoBackground.value
    if (!vbg || !vbg.videoElement) return

    if (vbg.videoElement.paused) {
      vbg.videoElement.play().catch(() => {})
      console.log('▶️ Video-Hintergrund gestartet')
    } else {
      vbg.videoElement.pause()
      console.log('⏸️ Video-Hintergrund pausiert')
    }
  }

  function toggleWsVideoBackground() {
    const wsvbg = workspaceVideoBackground.value
    if (!wsvbg || !wsvbg.videoElement) return

    if (wsvbg.videoElement.paused) {
      wsvbg.videoElement.play().catch(() => {})
      console.log('▶️ Workspace-Video-Hintergrund gestartet')
    } else {
      wsvbg.videoElement.pause()
      console.log('⏸️ Workspace-Video-Hintergrund pausiert')
    }
  }

  function seekVideoBackground(time) {
    const vbg = videoBackground.value
    if (!vbg || !vbg.videoElement) return
    vbg.videoElement.currentTime = parseFloat(time)
  }

  function seekBackwardBg(seconds) {
    const vbg = videoBackground.value
    if (!vbg || !vbg.videoElement) return
    vbg.videoElement.currentTime = Math.max(0, vbg.videoElement.currentTime - seconds)
  }

  function seekForwardBg(seconds) {
    const vbg = videoBackground.value
    if (!vbg || !vbg.videoElement) return
    const duration = vbg.videoElement.duration || 0
    vbg.videoElement.currentTime = Math.min(duration, vbg.videoElement.currentTime + seconds)
  }

  function updateBgVideoVolume(value) {
    const vbg = videoBackground.value
    if (!vbg || !vbg.videoElement) return

    const volume = parseFloat(value)
    vbg.videoElement.volume = volume
    vbg.videoElement.muted = volume === 0

    // Mit Recording-Graph verbinden falls nicht schon verbunden
    if (volume > 0 && window.connectVideoToRecording) {
      window.connectVideoToRecording(vbg.videoElement, volume)
    }

    // Lautstärke im Recording-Graph aktualisieren
    if (window.setVideoVolume) {
      window.setVideoVolume(vbg.videoElement, volume)
    }

    videoTimeUpdateKey.value++
    console.log('🔊 Hintergrund-Video Lautstärke:', Math.round(volume * 100) + '%')
  }

  function updateWsBgVideoVolume(value) {
    const wsvbg = workspaceVideoBackground.value
    if (!wsvbg || !wsvbg.videoElement) return

    const volume = parseFloat(value)
    wsvbg.videoElement.volume = volume
    wsvbg.videoElement.muted = volume === 0

    // Mit Recording-Graph verbinden falls nicht schon verbunden
    if (volume > 0 && window.connectVideoToRecording) {
      window.connectVideoToRecording(wsvbg.videoElement, volume)
    }

    // Lautstärke im Recording-Graph aktualisieren
    if (window.setVideoVolume) {
      window.setVideoVolume(wsvbg.videoElement, volume)
    }

    videoTimeUpdateKey.value++
    console.log('🔊 Workspace-Hintergrund-Video Lautstärke:', Math.round(volume * 100) + '%')
  }

  function seekWsVideoBackground(time) {
    const wsvbg = workspaceVideoBackground.value
    if (!wsvbg || !wsvbg.videoElement) return
    wsvbg.videoElement.currentTime = parseFloat(time)
  }

  function seekBackwardWsBg(seconds) {
    const wsvbg = workspaceVideoBackground.value
    if (!wsvbg || !wsvbg.videoElement) return
    wsvbg.videoElement.currentTime = Math.max(0, wsvbg.videoElement.currentTime - seconds)
  }

  function seekForwardWsBg(seconds) {
    const wsvbg = workspaceVideoBackground.value
    if (!wsvbg || !wsvbg.videoElement) return
    const duration = wsvbg.videoElement.duration || 0
    wsvbg.videoElement.currentTime = Math.min(duration, wsvbg.videoElement.currentTime + seconds)
  }

  function removeVideoBackground() {
    const cm = canvasManager.value
    if (!cm) return

    if (cm.videoBackground) {
      const video = cm.videoBackground.videoElement
      if (video) {
        video.pause()
        video.src = ''
      }
      cm.videoBackground = null
      cm.redrawCallback?.()
      console.log('🗑️ Video-Hintergrund entfernt')
    }
  }

  function removeWsVideoBackground() {
    const cm = canvasManager.value
    if (!cm) return

    if (cm.workspaceVideoBackground) {
      const video = cm.workspaceVideoBackground.videoElement
      if (video) {
        video.pause()
        video.src = ''
      }
      cm.workspaceVideoBackground = null
      cm.redrawCallback?.()
      console.log('🗑️ Workspace-Video-Hintergrund entfernt')
    }
  }

  onMounted(() => {
    console.log('✅ VideoPanel mounted')

    // Interval für Video-Zeit-Updates starten
    timeUpdateInterval = setInterval(() => {
      videoTimeUpdateKey.value++
    }, 250) // Alle 250ms aktualisieren
  })

  // Watcher für Stumm-Einstellung - wendet Änderungen auf alle Canvas-Videos an
  watch(videoMuted, (newMuted) => {
    const vm = videoManager.value
    const cm = canvasManager.value

    // Canvas-Videos aktualisieren
    if (vm) {
      const videos = vm.getAllVideos() || []
      videos.forEach((video) => {
        if (video.videoElement) {
          video.videoElement.muted = newMuted
          video.muted = newMuted

          // Wenn unmuted, Lautstärke sicherstellen und mit Recording verbinden
          if (!newMuted) {
            // Sicherstellen, dass Lautstärke hörbar ist
            if (video.videoElement.volume === 0) {
              video.videoElement.volume = 1
            }
            if (window.connectVideoToRecording) {
              window.connectVideoToRecording(video.videoElement, video.videoElement.volume)
            }
          }
        }
      })
      console.log(`🔊 Alle Canvas-Videos ${newMuted ? 'stumm geschaltet' : 'Ton aktiviert'}`)
    }

    // Hintergrund-Video aktualisieren
    if (cm && cm.videoBackground && cm.videoBackground.videoElement) {
      const bgVideo = cm.videoBackground.videoElement
      bgVideo.muted = newMuted
      if (!newMuted) {
        if (bgVideo.volume === 0) {
          bgVideo.volume = 1
        }
        if (window.connectVideoToRecording) {
          window.connectVideoToRecording(bgVideo, bgVideo.volume)
        }
      }
      console.log(`🔊 Hintergrund-Video ${newMuted ? 'stumm geschaltet' : 'Ton aktiviert'}`)
    }

    // Workspace-Hintergrund-Video aktualisieren
    if (cm && cm.workspaceVideoBackground && cm.workspaceVideoBackground.videoElement) {
      const wsBgVideo = cm.workspaceVideoBackground.videoElement
      wsBgVideo.muted = newMuted
      if (!newMuted) {
        if (wsBgVideo.volume === 0) {
          wsBgVideo.volume = 1
        }
        if (window.connectVideoToRecording) {
          window.connectVideoToRecording(wsBgVideo, wsBgVideo.volume)
        }
      }
      console.log(
        `🔊 Workspace-Hintergrund-Video ${newMuted ? 'stumm geschaltet' : 'Ton aktiviert'}`,
      )
    }

    // UI reaktivität triggern
    videoTimeUpdateKey.value++
  })

  // Watcher für Wiederholen-Einstellung - wendet Änderungen auf alle Canvas-Videos an
  watch(videoLoop, (newLoop) => {
    const vm = videoManager.value
    const cm = canvasManager.value

    // Canvas-Videos aktualisieren
    if (vm) {
      const videos = vm.getAllVideos() || []
      videos.forEach((video) => {
        if (video.videoElement) {
          video.videoElement.loop = newLoop
          video.loop = newLoop
        }
      })
      console.log(`🔁 Alle Canvas-Videos Wiederholen: ${newLoop ? 'aktiviert' : 'deaktiviert'}`)
    }

    // Hintergrund-Video aktualisieren
    if (cm && cm.videoBackground && cm.videoBackground.videoElement) {
      cm.videoBackground.videoElement.loop = newLoop
      console.log(`🔁 Hintergrund-Video Wiederholen: ${newLoop ? 'aktiviert' : 'deaktiviert'}`)
    }

    // Workspace-Hintergrund-Video aktualisieren
    if (cm && cm.workspaceVideoBackground && cm.workspaceVideoBackground.videoElement) {
      cm.workspaceVideoBackground.videoElement.loop = newLoop
      console.log(
        `🔁 Workspace-Hintergrund-Video Wiederholen: ${newLoop ? 'aktiviert' : 'deaktiviert'}`,
      )
    }
  })

  onUnmounted(() => {
    // Interval aufräumen
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval)
      timeUpdateInterval = null
    }
  })

  return {
    locale,
    fileInputRef,
    videoGallery,
    selectedVideoIndex,
    selectedAnimation,
    animationDuration,
    videoScale,
    videoLoop,
    videoMuted,
    videoTimeUpdateKey,
    canvasVideos,
    selectedCanvasVideo,
    selectedVideoCurrentTime,
    selectedVideoDuration,
    selectedVideoVolume,
    videoBackground,
    workspaceVideoBackground,
    hasVideoBackground,
    isVideoBackgroundPlaying,
    isWsVideoBackgroundPlaying,
    videoBackgroundTime,
    videoBackgroundDuration,
    wsVideoBackgroundTime,
    wsVideoBackgroundDuration,
    videoBackgroundVolume,
    wsVideoBackgroundVolume,
    triggerFileInput,
    handleDrop,
    handleVideoUpload,
    processVideoFile,
    generateThumbnail,
    selectVideo,
    deleteVideo,
    clearAllVideos,
    formatDuration,
    addVideoToCanvas,
    addVideoDirectly,
    setVideoAsBackground,
    setVideoAsWorkspaceBackground,
    isVideoActive,
    selectCanvasVideo,
    togglePlayVideo,
    removeCanvasVideo,
    playAllVideos,
    pauseAllVideos,
    formatTime,
    seekToTime,
    seekBackward,
    seekForward,
    updateVideoVolume,
    connectVideoAudioForRecording,
    toggleVideoBackground,
    toggleWsVideoBackground,
    seekVideoBackground,
    seekBackwardBg,
    seekForwardBg,
    updateBgVideoVolume,
    updateWsBgVideoVolume,
    seekWsVideoBackground,
    seekBackwardWsBg,
    seekForwardWsBg,
    removeVideoBackground,
    removeWsVideoBackground,
  }
}
