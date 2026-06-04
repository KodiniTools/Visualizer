<template>
  <div class="video-panel-wrapper">
    <!-- Upload-Bereich -->
    <div class="upload-section">
      <h4>{{ locale === 'de' ? 'Videos' : 'Videos' }}</h4>

      <div
        class="upload-area"
        @click="triggerFileInput"
        @drop.prevent="handleDrop"
        @dragover.prevent
      >
        <input
          type="file"
          ref="fileInputRef"
          @change="handleVideoUpload"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          style="display: none"
        />
        <div class="upload-placeholder">
          <div class="upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <p>{{ locale === 'de' ? 'MP4-Video hochladen' : 'Upload MP4 video' }}</p>
          <small>{{ locale === 'de' ? 'MP4, WebM, MOV' : 'MP4, WebM, MOV' }}</small>
        </div>
      </div>

      <!-- Video-Galerie -->
      <div v-if="videoGallery.length > 0" class="gallery-container">
        <div class="gallery-header">
          <span class="gallery-title">{{
            locale === 'de'
              ? 'Videos (' + videoGallery.length + ')'
              : 'Videos (' + videoGallery.length + ')'
          }}</span>
          <button @click="clearAllVideos" class="btn-clear-all">
            {{ locale === 'de' ? 'Alle löschen' : 'Delete all' }}
          </button>
        </div>

        <div class="gallery-scroll">
          <div class="gallery-grid">
            <div
              v-for="(videoData, index) in videoGallery"
              :key="videoData.id"
              class="thumbnail-item video-thumbnail"
              :class="{ selected: selectedVideoIndex === index }"
              @click="selectVideo(index)"
            >
              <!-- Video-Thumbnail -->
              <video
                :src="videoData.src"
                muted
                preload="metadata"
                class="video-thumb"
                @loadedmetadata="generateThumbnail($event, index)"
              />
              <!-- Play-Icon Overlay -->
              <div class="video-play-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div class="thumbnail-overlay">
                <button @click.stop="deleteVideo(index)" class="btn-delete-thumb">✕</button>
              </div>
              <div class="thumbnail-info">
                <span class="thumbnail-name">{{ videoData.name }}</span>
                <span class="thumbnail-duration">{{ formatDuration(videoData.duration) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action-Buttons -->
      <div v-if="selectedVideoIndex !== null" class="action-buttons">
        <button @click="addVideoToCanvas" class="btn-primary">
          {{ locale === 'de' ? 'Auf Canvas platzieren' : 'Place on Canvas' }}
        </button>
        <button @click="setVideoAsBackground" class="btn-secondary">
          {{ locale === 'de' ? 'Als Hintergrund' : 'As Background' }}
        </button>
        <button @click="setVideoAsWorkspaceBackground" class="btn-workspace">
          {{ locale === 'de' ? 'Workspace-Hintergrund' : 'Workspace Background' }}
        </button>
      </div>

      <!-- Platzierung mit Animation -->
      <div v-if="selectedVideoIndex !== null" class="placement-section">
        <div class="placement-header">
          <span>{{ locale === 'de' ? 'Platzierung' : 'Placement' }}</span>
        </div>

        <!-- Kompakte Einstellungen Grid -->
        <div class="placement-grid">
          <!-- Animation -->
          <div class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Effekt' : 'Effect' }}</span>
            <select v-model="selectedAnimation" class="placement-select">
              <option value="none">–</option>
              <option value="fade">Fade</option>
              <option value="slideLeft">← Slide</option>
              <option value="slideRight">→ Slide</option>
              <option value="slideUp">↑ Slide</option>
              <option value="slideDown">↓ Slide</option>
              <option value="zoom">Zoom</option>
              <option value="bounce">Bounce</option>
              <option value="spin">Spin</option>
              <option value="elastic">Elastic</option>
            </select>
          </div>

          <!-- Dauer (nur wenn Animation) -->
          <div v-if="selectedAnimation !== 'none'" class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Dauer' : 'Duration' }}</span>
            <div class="placement-slider-wrap">
              <input
                type="range"
                v-model.number="animationDuration"
                min="100"
                max="5000"
                step="100"
                class="placement-slider"
              />
              <span class="placement-value">{{ (animationDuration / 1000).toFixed(1) }}s</span>
            </div>
          </div>

          <!-- Größe -->
          <div class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Größe' : 'Size' }}</span>
            <div class="placement-slider-wrap">
              <input
                type="range"
                v-model.number="videoScale"
                min="1"
                max="8"
                step="1"
                class="placement-slider"
              />
              <span class="placement-value">{{ videoScale }}x</span>
            </div>
          </div>

          <!-- Loop & Muted -->
          <div class="placement-row placement-checkboxes">
            <label class="checkbox-label">
              <input type="checkbox" v-model="videoLoop" />
              <span>{{ locale === 'de' ? 'Wiederholen' : 'Loop' }}</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="videoMuted" />
              <span>{{ locale === 'de' ? 'Stumm' : 'Muted' }}</span>
            </label>
          </div>
        </div>

        <!-- Buttons -->
        <div class="placement-buttons">
          <button @click="addVideoDirectly" class="btn-placement btn-place">
            {{ locale === 'de' ? 'Platzieren' : 'Place' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Canvas-Videos Liste -->
    <div v-if="canvasVideos.length > 0" class="canvas-videos-section">
      <h4>{{ locale === 'de' ? 'Videos auf Canvas' : 'Videos on Canvas' }}</h4>
      <div class="canvas-videos-list">
        <div
          v-for="(video, index) in canvasVideos"
          :key="video.id"
          class="canvas-video-item"
          :class="{ active: isVideoActive(video) }"
          @click="selectCanvasVideo(video)"
        >
          <div class="video-info">
            <span class="video-index">{{ index + 1 }}</span>
            <span class="video-name">Video {{ index + 1 }}</span>
            <span class="video-status" :class="{ playing: video.isPlaying }">
              {{ video.isPlaying ? '▶' : '⏸' }}
            </span>
          </div>
          <div class="video-controls">
            <button
              @click.stop="togglePlayVideo(video)"
              class="btn-control"
              :title="video.isPlaying ? 'Pause' : 'Play'"
            >
              {{ video.isPlaying ? '⏸' : '▶' }}
            </button>
            <button
              @click.stop="removeCanvasVideo(video)"
              class="btn-control btn-delete"
              title="Entfernen"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Globale Video-Steuerung -->
      <div class="global-video-controls">
        <button @click="playAllVideos" class="btn-global">
          {{ locale === 'de' ? 'Alle abspielen' : 'Play all' }}
        </button>
        <button @click="pauseAllVideos" class="btn-global">
          {{ locale === 'de' ? 'Alle pausieren' : 'Pause all' }}
        </button>
      </div>

      <!-- ✨ NEU: Globale Video-Einstellungen für alle Canvas-Videos -->
      <div class="global-video-settings">
        <div class="settings-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="videoLoop" />
            <span>{{ locale === 'de' ? 'Wiederholen' : 'Loop' }}</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="videoMuted" />
            <span>{{ locale === 'de' ? 'Stumm' : 'Muted' }}</span>
          </label>
        </div>
      </div>

      <!-- Seek-Steuerung für ausgewähltes Video -->
      <div v-if="selectedCanvasVideo" class="video-seek-section">
        <div class="seek-header">
          <span>{{ locale === 'de' ? 'Video-Steuerung' : 'Video Control' }}</span>
          <span class="seek-time"
            >{{ formatTime(selectedVideoCurrentTime) }} /
            {{ formatTime(selectedVideoDuration) }}</span
          >
        </div>
        <div class="seek-controls">
          <button @click="seekBackward(selectedCanvasVideo, 5)" class="btn-seek" title="-5s">
            ⏪
          </button>
          <input
            type="range"
            :value="selectedVideoCurrentTime"
            @input="seekToTime(selectedCanvasVideo, $event.target.value)"
            :max="selectedVideoDuration"
            min="0"
            step="0.1"
            class="seek-slider"
          />
          <button @click="seekForward(selectedCanvasVideo, 5)" class="btn-seek" title="+5s">
            ⏩
          </button>
        </div>

        <!-- ✨ NEU: Lautstärke-Slider für Video -->
        <div class="video-volume-section">
          <div class="volume-header">
            <svg class="volume-icon" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path
                v-if="selectedVideoVolume > 0"
                d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
            <span
              >{{ locale === 'de' ? 'Lautstärke' : 'Volume' }}:
              {{ Math.round(selectedVideoVolume * 100) }}%</span
            >
          </div>
          <input
            type="range"
            :value="selectedVideoVolume"
            @input="updateVideoVolume($event.target.value)"
            min="0"
            max="1"
            step="0.01"
            class="volume-slider"
          />
          <p class="volume-hint">
            {{
              locale === 'de'
                ? '💡 Video-Ton wird mit aufgenommen'
                : '💡 Video audio will be recorded'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Hintergrund-Video-Steuerung -->
    <div v-if="hasVideoBackground" class="background-video-section">
      <h4>{{ locale === 'de' ? 'Video-Hintergrund' : 'Video Background' }}</h4>

      <!-- Globaler Video-Hintergrund -->
      <div v-if="videoBackground" class="bg-video-item">
        <div class="bg-video-header">
          <span class="bg-video-label">{{ locale === 'de' ? 'Hintergrund' : 'Background' }}</span>
          <span class="bg-video-status" :class="{ playing: isVideoBackgroundPlaying }">
            {{ isVideoBackgroundPlaying ? '▶' : '⏸' }}
          </span>
        </div>

        <div class="bg-video-controls">
          <button
            @click="toggleVideoBackground"
            class="btn-control-lg"
            :title="isVideoBackgroundPlaying ? 'Pause' : 'Play'"
          >
            {{ isVideoBackgroundPlaying ? '⏸' : '▶' }}
          </button>
          <button @click="seekBackwardBg(5)" class="btn-control" title="-5s">⏪</button>
          <button @click="seekForwardBg(5)" class="btn-control" title="+5s">⏩</button>
          <button @click="removeVideoBackground" class="btn-control btn-delete" title="Entfernen">
            ✕
          </button>
        </div>

        <div class="bg-video-seek">
          <span class="seek-time-small">{{ formatTime(videoBackgroundTime) }}</span>
          <input
            type="range"
            :value="videoBackgroundTime"
            @input="seekVideoBackground($event.target.value)"
            :max="videoBackgroundDuration"
            min="0"
            step="0.1"
            class="seek-slider"
          />
          <span class="seek-time-small">{{ formatTime(videoBackgroundDuration) }}</span>
        </div>

        <!-- ✨ NEU: Lautstärke für Hintergrund-Video -->
        <div class="bg-video-volume">
          <div class="volume-header-small">
            <svg class="volume-icon-small" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path
                v-if="videoBackgroundVolume > 0"
                d="M15.54 8.46a5 5 0 0 1 0 7.07"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
            <span>{{ Math.round(videoBackgroundVolume * 100) }}%</span>
          </div>
          <input
            type="range"
            :value="videoBackgroundVolume"
            @input="updateBgVideoVolume($event.target.value)"
            min="0"
            max="1"
            step="0.01"
            class="volume-slider-small"
          />
        </div>
      </div>

      <!-- Workspace Video-Hintergrund -->
      <div v-if="workspaceVideoBackground" class="bg-video-item workspace">
        <div class="bg-video-header">
          <span class="bg-video-label">{{
            locale === 'de' ? 'Workspace-Hintergrund' : 'Workspace Background'
          }}</span>
          <span class="bg-video-status" :class="{ playing: isWsVideoBackgroundPlaying }">
            {{ isWsVideoBackgroundPlaying ? '▶' : '⏸' }}
          </span>
        </div>

        <div class="bg-video-controls">
          <button
            @click="toggleWsVideoBackground"
            class="btn-control-lg"
            :title="isWsVideoBackgroundPlaying ? 'Pause' : 'Play'"
          >
            {{ isWsVideoBackgroundPlaying ? '⏸' : '▶' }}
          </button>
          <button @click="seekBackwardWsBg(5)" class="btn-control" title="-5s">⏪</button>
          <button @click="seekForwardWsBg(5)" class="btn-control" title="+5s">⏩</button>
          <button @click="removeWsVideoBackground" class="btn-control btn-delete" title="Entfernen">
            ✕
          </button>
        </div>

        <div class="bg-video-seek">
          <span class="seek-time-small">{{ formatTime(wsVideoBackgroundTime) }}</span>
          <input
            type="range"
            :value="wsVideoBackgroundTime"
            @input="seekWsVideoBackground($event.target.value)"
            :max="wsVideoBackgroundDuration"
            min="0"
            step="0.1"
            class="seek-slider"
          />
          <span class="seek-time-small">{{ formatTime(wsVideoBackgroundDuration) }}</span>
        </div>

        <!-- ✨ NEU: Lautstärke für Workspace-Video-Hintergrund -->
        <div class="bg-video-volume">
          <div class="volume-header-small">
            <svg class="volume-icon-small" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path
                v-if="wsVideoBackgroundVolume > 0"
                d="M15.54 8.46a5 5 0 0 1 0 7.07"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
            <span>{{ Math.round(wsVideoBackgroundVolume * 100) }}%</span>
          </div>
          <input
            type="range"
            :value="wsVideoBackgroundVolume"
            @input="updateWsBgVideoVolume($event.target.value)"
            min="0"
            max="1"
            step="0.01"
            class="volume-slider-small"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from '../lib/i18n.js'

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
const videoMuted = ref(false) // ✅ FIX: Standard ist jetzt mit Ton

// ✨ NEU: Reaktive Video-Zeit-Updates
const videoTimeUpdateKey = ref(0)
let timeUpdateInterval = null

// Computed
const canvasVideos = computed(() => {
  if (!videoManager.value) return []
  return videoManager.value.getAllVideos() || []
})

// ✨ NEU: Ausgewähltes Canvas-Video
const selectedCanvasVideo = computed(() => {
  const cm = canvasManager.value
  if (!cm || !cm.activeObject) return null
  if (cm.activeObject.type === 'video') {
    return cm.activeObject
  }
  return null
})

// ✨ NEU: Zeit-Werte für ausgewähltes Video
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

// ✨ NEU: Video-Lautstärke (reaktiv mit timeUpdateKey)
const selectedVideoVolume = computed(() => {
  videoTimeUpdateKey.value // Trigger reactivity
  const video = selectedCanvasVideo.value
  if (!video || !video.videoElement) return 1
  if (video.videoElement.muted) return 0
  return video.videoElement.volume || 1
})

// ✨ NEU: Hintergrund-Video Computed Properties
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

// ✨ NEU: Lautstärke für Hintergrund-Videos
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
  bgVideo.muted = videoMuted.value // ✅ FIX: Nutze Einstellung statt immer muted
  bgVideo.loop = videoLoop.value // ✅ FIX: Nutze Einstellung statt immer true
  bgVideo.volume = 1

  bgVideo.onloadeddata = () => {
    cm.setVideoBackground(bgVideo)
    // ✅ NEU: Audio mit Recording verbinden
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
  wsBgVideo.muted = videoMuted.value // ✅ FIX: Nutze Einstellung statt immer muted
  wsBgVideo.loop = videoLoop.value // ✅ FIX: Nutze Einstellung statt immer true
  wsBgVideo.volume = 1

  wsBgVideo.onloadeddata = () => {
    cm.setWorkspaceVideoBackground(wsBgVideo)
    // ✅ NEU: Audio mit Recording verbinden
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
    // ✨ NEU: Video-Audio mit Recording verbinden beim Abspielen
    connectVideoAudioForRecording(video)
    vm.playVideo(video.id)
  }
}

function removeCanvasVideo(video) {
  // ✨ NEU: Video-Audio vom Recording trennen
  if (video && video.videoElement && window.disconnectVideoFromRecording) {
    window.disconnectVideoFromRecording(video.videoElement)
  }

  const vm = videoManager.value
  const cm = canvasManager.value

  if (vm) {
    vm.removeVideo(video.id)
  }

  // ✅ FIX: Auswahl im CanvasManager zurücksetzen, um Markierung zu entfernen
  if (cm) {
    cm.setActiveObject(null)
  }
}

function playAllVideos() {
  const vm = videoManager.value
  if (vm) {
    // ✨ NEU: Alle Videos mit Recording verbinden
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

// ✨ NEU: Zeit-Formatierung
function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ✨ NEU: Seek-Funktionen für Canvas-Videos
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

// ✨ NEU: Video-Lautstärke aktualisieren
function updateVideoVolume(value) {
  const video = selectedCanvasVideo.value
  if (!video || !video.videoElement) return

  const volume = parseFloat(value)

  // ✅ FIX: Zuerst muted deaktivieren, dann Lautstärke setzen
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

// ✨ NEU: Video mit Recording verbinden wenn abgespielt
function connectVideoAudioForRecording(video) {
  if (!video || !video.videoElement) return

  // Video-Audio mit Recording verbinden
  if (window.connectVideoToRecording) {
    const volume = video.videoElement.muted ? 0 : video.videoElement.volume
    window.connectVideoToRecording(video.videoElement, volume)
  }
}

// ✨ NEU: Hintergrund-Video Play/Pause
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

// ✨ NEU: Hintergrund-Video Seek
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

// ✨ NEU: Hintergrund-Video Lautstärke
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

// ✨ NEU: Workspace-Video-Hintergrund Seek
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

// ✨ NEU: Hintergrund-Video entfernen
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

  // ✨ NEU: Interval für Video-Zeit-Updates starten
  timeUpdateInterval = setInterval(() => {
    videoTimeUpdateKey.value++
  }, 250) // Alle 250ms aktualisieren
})

// ✨ NEU: Watcher für Stumm-Einstellung - wendet Änderungen auf alle Canvas-Videos an
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
    console.log(`🔊 Workspace-Hintergrund-Video ${newMuted ? 'stumm geschaltet' : 'Ton aktiviert'}`)
  }

  // UI reaktivität triggern
  videoTimeUpdateKey.value++
})

// ✨ NEU: Watcher für Wiederholen-Einstellung - wendet Änderungen auf alle Canvas-Videos an
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
  // ✨ NEU: Interval aufräumen
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
    timeUpdateInterval = null
  }
})
</script>

<style scoped>
.video-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
}

.upload-section h4,
.canvas-videos-section h4 {
  margin: 0 0 8px 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-primary, #e9e9eb);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.upload-section h4::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Cpolygon points='23 7 16 12 23 17 23 7'/%3E%3Crect x='1' y='5' width='15' height='14' rx='2' ry='2'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.8));
}

.upload-area {
  border: 1px dashed var(--border-color, rgba(201, 152, 77, 0.4));
  border-radius: 6px;
  padding: 14px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--secondary-bg, #0e1c32);
}

.upload-area:hover {
  border-color: var(--accent-primary, #c9984d);
  background: var(--btn-hover, #1a2a42);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.upload-icon {
  width: 32px;
  height: 32px;
  color: var(--accent-primary, #c9984d);
}

.upload-icon svg {
  width: 100%;
  height: 100%;
}

.upload-placeholder p {
  margin: 0;
  font-size: 0.6rem;
  color: var(--text-primary, #e9e9eb);
}

.upload-placeholder small {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
}

/* Gallery */
.gallery-container {
  margin-top: 8px;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.gallery-title {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-clear-all {
  font-size: 0.5rem;
  color: #f44336;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
}

.btn-clear-all:hover {
  text-decoration: underline;
}

.gallery-scroll {
  max-height: 200px;
  overflow-y: auto;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.thumbnail-item {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.thumbnail-item:hover {
  border-color: rgba(139, 92, 246, 0.5);
}

.thumbnail-item.selected {
  border-color: rgba(139, 92, 246, 0.9);
}

.video-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  pointer-events: none;
}

.video-play-icon svg {
  width: 12px;
  height: 12px;
  margin-left: 2px;
}

.thumbnail-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.thumbnail-item:hover .thumbnail-overlay {
  opacity: 1;
}

.btn-delete-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 69, 58, 0.9);
  border: none;
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.thumbnail-name {
  font-size: 10px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumbnail-duration {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.7);
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.btn-primary {
  flex: 1;
  min-width: 100%;
  padding: 6px 10px;
  background: rgba(201, 152, 77, 0.2);
  border: 1px solid rgba(201, 152, 77, 0.3);
  border-radius: 5px;
  color: var(--accent-tertiary, #f8e1a9);
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-primary:hover {
  transform: translateY(-1px);
  background: rgba(201, 152, 77, 0.3);
}

.btn-secondary {
  flex: 1;
  padding: 5px 8px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.btn-secondary:hover {
  background: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
}

.btn-workspace {
  flex: 1;
  padding: 5px 8px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 5px;
  color: #ffc107;
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.btn-workspace:hover {
  background: rgba(255, 193, 7, 0.2);
  border-color: rgba(255, 193, 7, 0.5);
}

/* Placement Section */
.placement-section {
  margin-top: 8px;
  padding: 8px;
  background: var(--secondary-bg, #0e1c32);
  border-radius: 6px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.placement-header {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-primary, #e9e9eb);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.placement-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.placement-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.placement-label {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  min-width: 40px;
  text-transform: uppercase;
}

.placement-select {
  flex: 1;
  padding: 4px 6px;
  background: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.55rem;
}

.placement-slider-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.placement-slider {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(
    90deg,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  border-radius: 2px;
  outline: none;
}

.placement-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  background: var(--accent-tertiary, #f8e1a9);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
}

.placement-value {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  min-width: 28px;
  text-align: right;
}

.placement-checkboxes {
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.55rem;
  color: var(--text-primary, #e9e9eb);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  accent-color: var(--accent-primary, #c9984d);
  width: 12px;
  height: 12px;
}

.placement-buttons {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.btn-placement {
  flex: 1;
  padding: 5px 8px;
  border: none;
  border-radius: 5px;
  font-size: 0.55rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.btn-place {
  background: rgba(201, 152, 77, 0.2);
  border: 1px solid rgba(201, 152, 77, 0.3);
  color: var(--accent-tertiary, #f8e1a9);
}

.btn-place:hover {
  transform: translateY(-1px);
  background: rgba(201, 152, 77, 0.3);
}

/* Canvas Videos Section */
.canvas-videos-section {
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.canvas-videos-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.canvas-video-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.canvas-video-item:hover {
  background: rgba(139, 92, 246, 0.15);
}

.canvas-video-item.active {
  border-color: rgba(139, 92, 246, 0.6);
  background: rgba(139, 92, 246, 0.2);
}

.video-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-index {
  width: 20px;
  height: 20px;
  background: rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
}

.video-name {
  font-size: 12px;
  color: var(--text-primary, #e9e9eb);
}

.video-status {
  font-size: 10px;
  color: var(--text-secondary, #f8e1a9);
}

.video-status.playing {
  color: #4ade80;
}

.video-controls {
  display: flex;
  gap: 4px;
}

.btn-control {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e9e9eb);
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-control:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-control.btn-delete:hover {
  background: rgba(255, 69, 58, 0.3);
  color: #ff6b6b;
}

.global-video-controls {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-global {
  flex: 1;
  padding: 8px 12px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-global:hover {
  background: rgba(139, 92, 246, 0.3);
}

/* ✨ NEU: Globale Video-Einstellungen */
.global-video-settings {
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
}

.global-video-settings .settings-row {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* ✨ NEU: Video Seek Section */
.video-seek-section {
  margin-top: 12px;
  padding: 10px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.seek-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--text-secondary, #f8e1a9);
}

.seek-time {
  font-family: monospace;
  color: var(--text-primary, #e9e9eb);
}

.seek-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-seek {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: rgba(139, 92, 246, 0.3);
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-seek:hover {
  background: rgba(139, 92, 246, 0.5);
}

.seek-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(139, 92, 246, 0.3);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.seek-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #8b5cf6;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

.seek-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

/* ✨ NEU: Video Volume Section */
.video-volume-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.volume-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--text-secondary, #f8e1a9);
}

.volume-header .volume-icon {
  width: 16px;
  height: 16px;
  color: #8b5cf6;
}

.volume-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(139, 92, 246, 0.3);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #8b5cf6;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #8b5cf6;
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.volume-hint {
  margin: 8px 0 0 0;
  font-size: 10px;
  color: rgba(255, 193, 7, 0.9);
  background: rgba(255, 193, 7, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  text-align: center;
}

/* ✨ NEU: Hintergrund-Video Section */
.background-video-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.background-video-section h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #6ea8fe;
}

.bg-video-item {
  padding: 12px;
  background: rgba(110, 168, 254, 0.1);
  border: 1px solid rgba(110, 168, 254, 0.3);
  border-radius: 8px;
  margin-bottom: 10px;
}

.bg-video-item.workspace {
  background: rgba(255, 215, 0, 0.08);
  border-color: rgba(255, 215, 0, 0.3);
}

.bg-video-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.bg-video-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #e9e9eb);
}

.bg-video-status {
  font-size: 12px;
  color: var(--text-secondary, #f8e1a9);
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.bg-video-status.playing {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
}

.bg-video-controls {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.btn-control-lg {
  width: 36px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: rgba(110, 168, 254, 0.3);
  color: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-control-lg:hover {
  background: rgba(110, 168, 254, 0.5);
}

.bg-video-seek {
  display: flex;
  align-items: center;
  gap: 8px;
}

.seek-time-small {
  font-size: 10px;
  font-family: monospace;
  color: var(--text-secondary, #f8e1a9);
  min-width: 35px;
}

/* ✨ NEU: Hintergrund-Video Lautstärke */
.bg-video-volume {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(110, 168, 254, 0.2);
}

.volume-header-small {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 10px;
  color: var(--text-secondary, #f8e1a9);
}

.volume-icon-small {
  width: 14px;
  height: 14px;
  color: #6ea8fe;
}

.volume-slider-small {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(110, 168, 254, 0.3);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider-small::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #6ea8fe;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider-small::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #6ea8fe;
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.bg-video-item.workspace .bg-video-volume {
  border-top-color: rgba(255, 215, 0, 0.2);
}

.bg-video-item.workspace .volume-icon-small {
  color: #ffd700;
}

.bg-video-item.workspace .volume-slider-small {
  background: rgba(255, 215, 0, 0.3);
}

.bg-video-item.workspace .volume-slider-small::-webkit-slider-thumb {
  background: #ffd700;
}

.bg-video-item.workspace .volume-slider-small::-moz-range-thumb {
  background: #ffd700;
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .upload-section h4,
[data-theme='light'] .canvas-videos-section h4 {
  color: #003971;
}

[data-theme='light'] .upload-section h4::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23003971' stroke-width='1.5'%3E%3Cpolygon points='23 7 16 12 23 17 23 7'/%3E%3Crect x='1' y='5' width='15' height='14' rx='2' ry='2'/%3E%3C/svg%3E");
  filter: none;
}

[data-theme='light'] .upload-area {
  border-color: rgba(1, 79, 153, 0.4);
  background: #ffffff;
}

[data-theme='light'] .upload-area:hover {
  border-color: #014f99;
  background: #f9f2d5;
}

[data-theme='light'] .upload-icon {
  color: #014f99;
}

[data-theme='light'] .upload-placeholder p {
  color: #003971;
}

[data-theme='light'] .upload-placeholder small {
  color: #4d6d8e;
}

[data-theme='light'] .gallery-title {
  color: #4d6d8e;
}

[data-theme='light'] .thumbnail-info {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
}

[data-theme='light'] .btn-primary {
  background: rgba(1, 79, 153, 0.15);
  border: 1px solid rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-primary:hover {
  background: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .btn-secondary {
  background: #ffffff;
  border-color: rgba(1, 79, 153, 0.3);
  color: #003971;
}

[data-theme='light'] .btn-secondary:hover {
  background: #f9f2d5;
  border-color: #014f99;
}

[data-theme='light'] .btn-workspace {
  background: rgba(201, 152, 77, 0.1);
  border-color: rgba(201, 152, 77, 0.3);
  color: #c9984d;
}

[data-theme='light'] .btn-workspace:hover {
  background: rgba(201, 152, 77, 0.2);
  border-color: rgba(201, 152, 77, 0.5);
}

[data-theme='light'] .placement-section {
  background: #ffffff;
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .placement-header {
  color: #003971;
}

[data-theme='light'] .placement-label {
  color: #4d6d8e;
}

[data-theme='light'] .placement-select {
  background: #f9f2d5;
  border-color: rgba(1, 79, 153, 0.3);
  color: #003971;
}

[data-theme='light'] .placement-slider {
  background: linear-gradient(90deg, #4d6d8e 0%, #014f99 100%);
}

[data-theme='light'] .placement-slider::-webkit-slider-thumb {
  background: #c9984d;
  border-color: #ffffff;
}

[data-theme='light'] .placement-value {
  color: #4d6d8e;
}

[data-theme='light'] .checkbox-label {
  color: #003971;
}

[data-theme='light'] .checkbox-label input[type='checkbox'] {
  accent-color: #014f99;
}

[data-theme='light'] .btn-place {
  background: rgba(1, 79, 153, 0.15);
  border: 1px solid rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-place:hover {
  background: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .canvas-videos-section {
  border-top-color: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .canvas-video-item {
  background: rgba(1, 79, 153, 0.06);
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .canvas-video-item:hover {
  background: rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .canvas-video-item.active {
  border-color: rgba(1, 79, 153, 0.5);
  background: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .video-index {
  background: rgba(1, 79, 153, 0.2);
  color: #014f99;
}

[data-theme='light'] .video-name {
  color: #003971;
}

[data-theme='light'] .video-status {
  color: #014f99;
}

[data-theme='light'] .btn-control {
  background: rgba(0, 0, 0, 0.08);
  color: #003971;
}

[data-theme='light'] .btn-control:hover {
  background: rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .btn-global {
  background: rgba(1, 79, 153, 0.12);
  border-color: rgba(1, 79, 153, 0.25);
  color: #003971;
}

[data-theme='light'] .btn-global:hover {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .global-video-settings {
  background: rgba(1, 79, 153, 0.06);
  border-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .video-seek-section {
  background: rgba(1, 79, 153, 0.06);
  border-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .seek-header {
  color: #014f99;
}

[data-theme='light'] .seek-time {
  color: #003971;
}

[data-theme='light'] .btn-seek {
  background: rgba(1, 79, 153, 0.25);
  color: #f5f4d6;
}

[data-theme='light'] .btn-seek:hover {
  background: rgba(1, 79, 153, 0.4);
}

[data-theme='light'] .seek-slider {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .seek-slider::-webkit-slider-thumb {
  background: #014f99;
}

[data-theme='light'] .video-volume-section {
  border-top-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .volume-header {
  color: #014f99;
}

[data-theme='light'] .volume-header .volume-icon {
  color: #014f99;
}

[data-theme='light'] .volume-slider {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .volume-slider::-webkit-slider-thumb {
  background: #014f99;
}

[data-theme='light'] .volume-slider::-moz-range-thumb {
  background: #014f99;
}

[data-theme='light'] .volume-hint {
  color: #c9984d;
  background: rgba(201, 152, 77, 0.1);
}

[data-theme='light'] .background-video-section {
  border-top-color: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .background-video-section h4 {
  color: #014f99;
}

[data-theme='light'] .bg-video-item {
  background: rgba(1, 79, 153, 0.06);
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .bg-video-item.workspace {
  background: rgba(201, 152, 77, 0.08);
  border-color: rgba(201, 152, 77, 0.25);
}

[data-theme='light'] .bg-video-label {
  color: #003971;
}

[data-theme='light'] .bg-video-status {
  color: #014f99;
  background: rgba(0, 0, 0, 0.06);
}

[data-theme='light'] .btn-control-lg {
  background: rgba(1, 79, 153, 0.25);
  color: #f5f4d6;
}

[data-theme='light'] .btn-control-lg:hover {
  background: rgba(1, 79, 153, 0.4);
}

[data-theme='light'] .seek-time-small {
  color: #014f99;
}

[data-theme='light'] .bg-video-volume {
  border-top-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .volume-header-small {
  color: #014f99;
}

[data-theme='light'] .volume-icon-small {
  color: #014f99;
}

[data-theme='light'] .volume-slider-small {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .volume-slider-small::-webkit-slider-thumb {
  background: #014f99;
}

[data-theme='light'] .volume-slider-small::-moz-range-thumb {
  background: #014f99;
}

[data-theme='light'] .bg-video-item.workspace .bg-video-volume {
  border-top-color: rgba(201, 152, 77, 0.2);
}

[data-theme='light'] .bg-video-item.workspace .volume-icon-small {
  color: #c9984d;
}

[data-theme='light'] .bg-video-item.workspace .volume-slider-small {
  background: rgba(201, 152, 77, 0.25);
}

[data-theme='light'] .bg-video-item.workspace .volume-slider-small::-webkit-slider-thumb {
  background: #c9984d;
}

[data-theme='light'] .bg-video-item.workspace .volume-slider-small::-moz-range-thumb {
  background: #c9984d;
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .video-gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    gap: 6px;
  }

  .gallery-scroll {
    max-height: 250px;
  }

  .video-play-icon {
    width: 32px;
    height: 32px;
  }

  .btn-delete-thumb {
    width: 24px;
    height: 24px;
  }

  .upload-icon {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 480px) {
  .video-gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  }

  .video-play-icon {
    width: 36px;
    height: 36px;
  }

  .btn-delete-thumb {
    width: 28px;
    height: 28px;
  }
}
</style>
