<template>
  <div id="app-container">
    <AppHeader />

    <!-- Mobile Panel Toggle Bar -->
    <div class="mobile-panel-bar" role="tablist">
      <button
        class="mobile-panel-btn"
        :class="{ active: mobilePanel === 'left' }"
        @click="mobilePanel = 'left'"
        role="tab"
        :aria-selected="mobilePanel === 'left'"
      >
        <svg
          class="mobile-panel-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span class="mobile-panel-label">{{ t('app.mobileTabFoto') }}</span>
        <span class="mobile-active-bar" aria-hidden="true"></span>
      </button>
      <button
        class="mobile-panel-btn"
        :class="{ active: mobilePanel === 'canvas' }"
        @click="mobilePanel = 'canvas'"
        role="tab"
        :aria-selected="mobilePanel === 'canvas'"
      >
        <svg
          class="mobile-panel-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          <path d="M8 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="mobile-panel-label">Canvas</span>
        <span class="mobile-active-bar" aria-hidden="true"></span>
      </button>
      <button
        class="mobile-panel-btn"
        :class="{ active: mobilePanel === 'right' }"
        @click="mobilePanel = 'right'"
        role="tab"
        :aria-selected="mobilePanel === 'right'"
      >
        <svg
          class="mobile-panel-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h-2M6 12H4M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 4V2M12 22v-2"
          />
        </svg>
        <span class="mobile-panel-label">{{ t('app.mobileTabControls') }}</span>
        <span class="mobile-active-bar" aria-hidden="true"></span>
      </button>
    </div>

    <div class="layout-grid">
      <aside class="left-toolbar" :class="{ 'mobile-visible': mobilePanel === 'left' }">
        <TextManagerPanel />
        <FotoPanel />
        <VideoPanel />
      </aside>

      <main class="center-column" :class="{ 'mobile-visible': mobilePanel === 'canvas' }">
        <ImageThumbnailBar
          v-if="canvasImages.length > 0"
          :canvas-images="canvasImages"
          :selected-canvas-image-id="selectedCanvasImageId"
          :dragged-image-index="draggedImageIndex"
          :drag-over-index="dragOverIndex"
          :t="t"
          :select-canvas-image="selectCanvasImage"
          :open-image-preview="openImagePreview"
          :delete-canvas-image="deleteCanvasImage"
          :delete-all-canvas-images="deleteAllCanvasImages"
          :handle-drag-start="handleDragStart"
          :handle-drag-end="handleDragEnd"
          :handle-drag-over="handleDragOver"
          :handle-drag-leave="handleDragLeave"
          :handle-drop="handleDrop"
        />

        <ImagePreviewModal
          :show-image-preview="showImagePreview"
          :preview-image-data="previewImageData"
          :preview-image-index="previewImageIndex"
          :canvas-images-count="canvasImages.length"
          :pending-replace-image-src="pendingReplaceImageSrc"
          :t="t"
          :close-image-preview="closeImagePreview"
          :handle-replace-canvas-image="handleReplaceCanvasImage"
          :open-replace-gallery="openReplaceGallery"
          :cancel-pending-replace="cancelPendingReplace"
          :confirm-pending-replace="confirmPendingReplace"
        />

        <ReplaceGalleryModal
          :show-replace-gallery="showReplaceGallery"
          :replace-gallery-categories="replaceGalleryCategories"
          :replace-gallery-images="replaceGalleryImages"
          :selected-replace-category="selectedReplaceCategory"
          :selected-replace-image="selectedReplaceImage"
          :replace-gallery-loading="replaceGalleryLoading"
          :t="t"
          :close-replace-gallery="closeReplaceGallery"
          :select-replace-gallery-category="selectReplaceGalleryCategory"
          :select-replace-gallery-image="selectReplaceGalleryImage"
          :confirm-replace-from-gallery="confirmReplaceFromGallery"
        />

        <div class="canvas-wrapper">
          <canvas ref="canvasRef"></canvas>
        </div>
      </main>

      <aside class="right-panel" :class="{ 'mobile-visible': mobilePanel === 'right' }">
        <div
          v-if="sharedBanner"
          class="shared-banner"
          :class="'shared-banner-' + sharedBanner.type"
        >
          <span>{{ sharedBanner.message }}</span>
        </div>
        <div v-if="handoffPayload" class="handoff-banner">
          <div class="handoff-banner__preview">
            <img :src="handoffPayload.images[0].dataUrl" alt="" />
          </div>
          <div class="handoff-banner__body">
            <strong>{{ t('handoff.title').replace('{source}', handoffPayload.source) }}</strong>
            <span>{{ t('handoff.text') }}</span>
          </div>
          <div class="handoff-banner__actions">
            <button class="handoff-banner__accept" @click="acceptHandoff">
              {{ t('handoff.accept') }}
            </button>
            <button class="handoff-banner__dismiss" @click="rejectHandoff">
              {{ t('handoff.dismiss') }}
            </button>
          </div>
        </div>
        <FileUploadPanel />
        <PlayerPanel />
        <RecorderPanel />
        <ScreenshotPanel />
        <PresetPanel />
        <VisualizerPanel />
        <ControlsPanel />
        <CanvasControlPanel />
      </aside>
    </div>

    <audio ref="audioRef" crossOrigin="anonymous" style="display: none"></audio>

    <QuickStartGuide ref="quickStartGuideRef" />
    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from './lib/i18n.js'
import { getSharedFiles, clearSharedFiles } from './utils/sharedFileRepository.js'
import { usePlayerStore } from './stores/playerStore.js'
import { useRecorderStore } from './stores/recorderStore.js'
import { useTextStore } from './stores/textStore.js'
import { useVisualizerStore } from './stores/visualizerStore.js'
import { useGridStore } from './stores/gridStore.js'
import { useWorkspaceStore } from './stores/workspaceStore.js'
import { useBackgroundTilesStore } from './stores/backgroundTilesStore.js'
import { useAudioSourceStore } from './stores/audioSourceStore.js'
import { useBeatDropStore } from './stores/beatDropStore.js'
import { useAudioFxStore } from './stores/audioFxStore.js'
import { BeatDropRenderer } from './lib/canvasManager/rendering/BeatDropRenderer.js'
import { AudioFxRenderer } from './lib/canvasManager/rendering/AudioFxRenderer.js'
import { useFrameCapture } from './composables/useFrameCapture.js'
import { useCanvasImages } from './composables/useCanvasImages.js'
import { useGlobalAudioData } from './composables/useGlobalAudioData.js'
import { useVisualizerLoop } from './composables/useVisualizerLoop.js'
import { useAudioEngine } from './composables/useAudioEngine.js'
import { useRenderLoop } from './composables/useRenderLoop.js'

import FileUploadPanel from './components/FileUploadPanel.vue'
import PlayerPanel from './components/PlayerPanel.vue'
import RecorderPanel from './components/RecorderPanel.vue'
import ScreenshotPanel from './components/ScreenshotPanel.vue'
import FotoPanel from './components/FotoPanel.vue'
import VideoPanel from './components/VideoPanel.vue'
import TextManagerPanel from './components/TextManagerPanel.vue'
import ControlsPanel from './components/ControlsPanel.vue'
import VisualizerPanel from './components/VisualizerPanel.vue'
import PresetPanel from './components/PresetPanel.vue'
import CanvasControlPanel from './components/CanvasControlPanel.vue'
import QuickStartGuide from './components/QuickStartGuide.vue'
import ToastContainer from './components/ToastContainer.vue'
import AppHeader from './components/AppHeader.vue'
import ImageThumbnailBar from './components/canvas-bar/ImageThumbnailBar.vue'
import ImagePreviewModal from './components/canvas-bar/ImagePreviewModal.vue'
import ReplaceGalleryModal from './components/canvas-bar/ReplaceGalleryModal.vue'

import { TextManager } from './lib/textManager.js'
import { CUSTOM_FONTS } from './lib/fonts.js'
import { FontManager } from './lib/fontManager.js'
import { CanvasManager } from './lib/canvasManager.js'
import { FotoManager } from './lib/fotoManager.js'
import { GridManager } from './lib/gridManager.js'
import { MultiImageManager } from './lib/multiImageManager.js'
import { VideoManager } from './lib/videoManager.js'
import { KeyboardShortcuts } from './lib/keyboardShortcuts.js'
import { checkHandoff, consumeHandoff, dismissHandoff } from './lib/core/handoff.js'
import { useImageGallery } from './composables/useImageGallery.js'

const { t } = useI18n()
const playerStore = usePlayerStore()
const recorderStore = useRecorderStore()
const textStore = useTextStore()
const visualizerStore = useVisualizerStore()
const beatDropStore = useBeatDropStore()
const audioFxStore = useAudioFxStore()
const gridStore = useGridStore()
const workspaceStore = useWorkspaceStore()
const backgroundTilesStore = useBackgroundTilesStore()
const audioSourceStore = useAudioSourceStore()
const route = useRoute()
const router = useRouter()

const { start: startCapture, stop: stopCapture } = useFrameCapture()

const sharedBanner = ref(null)
let sharedFilesHandled = false

// ── Handoff (Bild-Übernahme aus anderen Kodini-Tools, z. B. Bildkonverter) ──────
// Dieselbe (geteilte) Galerie wie im FotoPanel – übernommene Bilder landen dort
// wie normal hochgeladene Bilder.
const { addImagesFromData } = useImageGallery()
const handoffPayload = ref(null)
let handoffHandled = false

const audioRef = ref(null)
const canvasRef = ref(null)
const mobilePanel = ref('canvas')
const quickStartGuideRef = ref(null)

// ── Manager instances ─────────────────────────────────────────────────────────
const canvasManagerInstance = ref(null)
const fotoManagerInstance = ref(null)
const gridManagerInstance = ref(null)
const multiImageManagerInstance = ref(null)
const videoManagerInstance = ref(null)
const fontManagerInstance = ref(null)
const keyboardShortcutsInstance = ref(null)

provide('fontManager', fontManagerInstance)
provide('canvasManager', canvasManagerInstance)
provide('fotoManager', fotoManagerInstance)
provide('multiImageManager', multiImageManagerInstance)
provide('videoManager', videoManagerInstance)

// ── Recording canvas ──────────────────────────────────────────────────────────
let recordingCanvas = document.createElement('canvas')
let recordingCanvasStream = null
let textManagerInstance = null
let canvasInitialized = false

const beatDropRenderer = new BeatDropRenderer()
const audioFxRenderer = new AudioFxRenderer()

// ── Composables ───────────────────────────────────────────────────────────────
const globalAudioData = useGlobalAudioData()

const audioEngine = useAudioEngine({
  audioRef,
  audioSourceStore,
  playerStore,
})

const { startVisualizerLoop, stopVisualizerLoop } = useVisualizerLoop({
  getRecordingCanvasStream: () => recordingCanvasStream,
  setRecordingCanvasStream: (v) => {
    recordingCanvasStream = v
  },
})

const renderLoop = useRenderLoop({
  canvasRef,
  canvasManagerInstance,
  multiImageManagerInstance,
  videoManagerInstance,
  gridManagerInstance,
  getTextManager: () => textManagerInstance,
  getRecordingCanvas: () => recordingCanvas,
  visualizerStore,
  recorderStore,
  playerStore,
  audioSourceStore,
  audioFxStore,
  beatDropStore,
  beatDropRenderer,
  audioFxRenderer,
  getAnalyser: audioEngine.getAnalyser,
  getMicrophoneAnalyser: audioEngine.getMicrophoneAnalyser,
  getMicrophoneAudioContext: audioEngine.getMicrophoneAudioContext,
  updateGlobalAudioData: globalAudioData.updateGlobalAudioData,
})

// ── Canvas images composable ──────────────────────────────────────────────────
const {
  selectedCanvasImageId,
  showImagePreview,
  previewImageData,
  previewImageIndex,
  showReplaceGallery,
  replaceGalleryCategories,
  replaceGalleryImages,
  selectedReplaceCategory,
  selectedReplaceImage,
  replaceGalleryLoading,
  pendingReplaceImageSrc,
  draggedImageIndex,
  dragOverIndex,
  canvasImages,
  selectCanvasImage,
  deleteCanvasImage,
  deleteAllCanvasImages,
  openImagePreview,
  closeImagePreview,
  handleReplaceCanvasImage,
  confirmPendingReplace,
  cancelPendingReplace,
  openReplaceGallery,
  closeReplaceGallery,
  selectReplaceGalleryCategory,
  selectReplaceGalleryImage,
  confirmReplaceFromGallery,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragLeave,
  handleDrop,
} = useCanvasImages({ multiImageManagerInstance, canvasManagerInstance, t })

// ── Canvas initialization ─────────────────────────────────────────────────────
const SOCIAL_MEDIA_PRESETS = {
  tiktok: { width: 1080, height: 1920 },
  'instagram-story': { width: 1080, height: 1920 },
  'instagram-post': { width: 1080, height: 1080 },
  'instagram-reel': { width: 1080, height: 1920 },
  'youtube-short': { width: 1080, height: 1920 },
  'youtube-video': { width: 1920, height: 1080 },
  'facebook-post': { width: 1200, height: 630 },
  'twitter-video': { width: 1280, height: 720 },
  'linkedin-video': { width: 1920, height: 1080 },
}

function initializeCanvas(canvasParam) {
  if (canvasInitialized) return false

  const domCanvas = document.querySelector('.canvas-wrapper canvas')
  const canvas = domCanvas || canvasParam
  if (!canvas) return false

  const presetKey = workspaceStore.selectedPresetKey
  const preset = SOCIAL_MEDIA_PRESETS[presetKey]
  canvas.width = preset?.width ?? 1920
  canvas.height = preset?.height ?? 1080

  recordingCanvas.width = canvas.width
  recordingCanvas.height = canvas.height

  textManagerInstance = new TextManager(textStore)
  gridManagerInstance.value = new GridManager(canvas)
  fotoManagerInstance.value = new FotoManager(() => {})

  multiImageManagerInstance.value = new MultiImageManager(canvas, {
    redrawCallback: () => {},
    onImageSelected: onObjectSelected,
    onImageChanged: () => {},
    fotoManager: fotoManagerInstance.value,
  })

  videoManagerInstance.value = new VideoManager(canvas, {
    redrawCallback: () => {},
    onVideoSelected: onObjectSelected,
    onVideoChanged: () => {},
    fotoManager: fotoManagerInstance.value,
    audioElement: audioRef.value,
  })

  canvasManagerInstance.value = new CanvasManager(canvas, {
    redrawCallback: () => {},
    onObjectSelected,
    onStateChange: () => {},
    onTextDoubleClick: () => {},
    textManager: textManagerInstance,
    fotoManager: fotoManagerInstance.value,
    gridManager: gridManagerInstance.value,
    multiImageManager: multiImageManagerInstance.value,
    videoManager: videoManagerInstance.value,
  })
  canvasManagerInstance.value.setupInteractionHandlers()
  canvasManagerInstance.value.setBackgroundTilesStore(backgroundTilesStore)

  canvasInitialized = true
  return true
}

function onObjectSelected(selectedObject) {
  if (!window.fotoPanelControls) {
    setTimeout(() => onObjectSelected(selectedObject), 100)
    return
  }

  const isImageSelected =
    selectedObject &&
    (selectedObject.type === 'image' ||
      selectedObject.type === 'background' ||
      selectedObject.type === 'workspace-background')

  if (isImageSelected && selectedObject.type === 'image' && selectedObject.id) {
    selectedCanvasImageId.value = selectedObject.id
  } else if (!isImageSelected) {
    selectedCanvasImageId.value = null
  }

  const isBackgroundType =
    selectedObject &&
    (selectedObject.type === 'workspace-background' || selectedObject.type === 'background')

  if (window.fotoPanelControls.currentActiveImage) {
    if (isBackgroundType) {
      window.fotoPanelControls.currentActiveImage.value = null
      setTimeout(() => {
        if (window.fotoPanelControls?.currentActiveImage) {
          window.fotoPanelControls.currentActiveImage.value = selectedObject
        }
      }, 0)
    } else {
      window.fotoPanelControls.currentActiveImage.value = isImageSelected ? selectedObject : null
    }
  }

  if (window.fotoPanelControls.container) {
    window.fotoPanelControls.container.style.display = isImageSelected ? 'block' : 'none'
  }

  if (isImageSelected && window.fotoPanelControls.loadImageSettings) {
    window.fotoPanelControls.loadImageSettings(selectedObject)
  } else if (isImageSelected && fotoManagerInstance.value) {
    fotoManagerInstance.value.updateUIFromSettings(window.fotoPanelControls, selectedObject)
  }
}

// ── Recording canvas helpers ──────────────────────────────────────────────────
function applyRecordingCanvasMonkeyPatch(canvas) {
  const originalCaptureStream = canvas.captureStream.bind(canvas)
  canvas.captureStream = function (frameRate) {
    if (recordingCanvasStream) {
      recordingCanvasStream.getTracks().forEach((track) => {
        if (track.readyState !== 'ended') track.stop()
      })
    }

    const recordingCtx = canvas.getContext('2d')
    if (recordingCtx && canvasManagerInstance.value) {
      renderLoop.renderRecordingScene(recordingCtx, canvas.width, canvas.height, null)
    }

    recordingCanvasStream = originalCaptureStream(frameRate)
    return recordingCanvasStream
  }
}

async function initializeRecorder() {
  const canvas = canvasRef.value
  if (!canvas) return

  recordingCanvas.width = canvas.width || 1920
  recordingCanvas.height = canvas.height || 1080
  applyRecordingCanvasMonkeyPatch(recordingCanvas)

  const audio = audioRef.value
  if (!audio) {
    console.error('[App] Audio Element nicht gefunden!')
    return
  }

  const combinedAudioStream = await audioEngine.createCombinedAudioStream()
  if (!combinedAudioStream) {
    console.error('[App] Audio Stream fehlgeschlagen!')
    return
  }

  const canvasStream = recordingCanvas.captureStream(60)
  const combinedMediaStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...combinedAudioStream.getAudioTracks(),
  ])

  recorderStore.setRecorderRefs(recordingCanvas, audio, combinedMediaStream, null)
}

window.getCanvasStreamForRecorder = function () {
  if (recordingCanvasStream) {
    recordingCanvasStream.getTracks().forEach((t) => t.stop())
  }
  recordingCanvasStream = recordingCanvas.captureStream(0)
  return recordingCanvasStream
}

// ── Shared files ──────────────────────────────────────────────────────────────
async function loadSharedFiles() {
  if (sharedFilesHandled) return
  sharedFilesHandled = true

  try {
    const records = await getSharedFiles()
    if (!records?.length) {
      sharedBanner.value = { type: 'warning', message: t('toast.sharedFilesEmpty') }
      setTimeout(() => {
        sharedBanner.value = null
      }, 5000)
      return
    }

    sharedBanner.value = {
      type: 'info',
      message: t('toast.sharedFilesLoading').replace('{count}', records.length),
    }
    const processed = playerStore.addTracksFromBlobs(records)

    if (processed > 0) {
      sharedBanner.value = {
        type: 'success',
        message: t('toast.sharedFilesLoaded').replace('{count}', processed),
      }
      await clearSharedFiles()
    } else {
      sharedBanner.value = { type: 'warning', message: t('toast.sharedFilesEmpty') }
    }
  } catch (error) {
    console.error('[App] Shared files import error:', error)
    sharedBanner.value = { type: 'error', message: t('toast.sharedFilesError') }
  }

  setTimeout(() => {
    sharedBanner.value = null
  }, 5000)
}

// ── Handoff: eingehendes Bild aus einem anderen Kodini-Tool ─────────────────────
function checkForHandoff() {
  if (handoffHandled) return
  handoffHandled = true
  handoffPayload.value = checkHandoff()
}

async function acceptHandoff() {
  const images = consumeHandoff()
  handoffPayload.value = null
  if (!images || images.length === 0) return

  try {
    // Bild(er) wie normal hochgeladene Bilder in die Galerie übernehmen.
    // Der Nutzer entscheidet danach selbst, wie sie verwendet werden.
    const added = await addImagesFromData(images)
    if (added > 0) {
      // Auf Mobilgeräten das Foto-/Galerie-Panel sichtbar machen.
      mobilePanel.value = 'left'
      sharedBanner.value = { type: 'success', message: t('handoff.success') }
    } else {
      sharedBanner.value = { type: 'error', message: t('handoff.error') }
    }
  } catch (error) {
    console.error('[Handoff] Bild-Import fehlgeschlagen:', error)
    sharedBanner.value = { type: 'error', message: t('handoff.error') }
  }

  setTimeout(() => {
    sharedBanner.value = null
  }, 5000)
}

function rejectHandoff() {
  dismissHandoff()
  handoffPayload.value = null
}

router.isReady().then(() => {
  if (route.query.source === 'audiokonverter') loadSharedFiles()
  checkForHandoff()
})

watch(
  () => route.query.source,
  (s) => {
    if (s === 'audiokonverter') loadSharedFiles()
  },
)

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  // Canvas availability watcher — register before any await
  watch(
    () => canvasRef.value,
    (newCanvas) => {
      if (newCanvas && !canvasInitialized) initializeCanvas(newCanvas)
    },
    { immediate: true },
  )

  // Workers + Audio data
  await globalAudioData.init()

  // Fonts
  fontManagerInstance.value = new FontManager()
  try {
    const result = await fontManagerInstance.value.initialize(CUSTOM_FONTS)
    console.log(`FontManager: ${result.loaded} Fonts geladen`)
  } catch (error) {
    console.error('FontManager Fehler:', error)
  }

  // Audio player events
  playerStore.setAudioRef(audioRef.value)
  if (audioRef.value) {
    audioRef.value.addEventListener('play', () => {
      playerStore.isPlaying = true
      const ctx = audioEngine.getAudioContext()
      if (ctx?.state === 'suspended') ctx.resume()
      audioEngine.enableRecorderAudio()
    })
    audioRef.value.addEventListener('pause', () => {
      playerStore.isPlaying = false
      audioEngine.disableRecorderAudio()
    })
    audioRef.value.addEventListener('ended', () => {
      playerStore.nextTrack()
      audioEngine.disableRecorderAudio()
    })
  }

  audioEngine.setupAudioContext()
  audioEngine.exposeGlobals()

  // Recording redraw listener
  renderLoop.setupRecordingRedrawListener(gridManagerInstance)
  renderLoop.exposeGlobals(canvasManagerInstance)

  // HQ Frame Capture
  window.addEventListener('hq:startCapture', (e) => {
    const { fps, onBatch } = e.detail
    if (!recordingCanvas) return
    startCapture(recordingCanvas, fps, onBatch)
  })
  window.addEventListener('hq:stopCapture', async () => {
    const remaining = await stopCapture()
    window.dispatchEvent(new CustomEvent('hq:captureRemaining', { detail: remaining }))
  })

  // Canvas init fallback
  if (canvasRef.value) initializeCanvas(canvasRef.value)

  // Grid visibility watcher
  watch(
    () => gridStore.isVisible,
    (v) => {
      if (gridManagerInstance.value) gridManagerInstance.value.setVisibility(v)
    },
    { immediate: true },
  )

  // Workspace preset watcher
  watch(
    () => workspaceStore.selectedPresetKey,
    (newKey) => {
      const canvas = canvasRef.value
      if (!canvas || !canvasManagerInstance.value) return

      canvasManagerInstance.value.setWorkspacePreset(newKey)
      const preset = newKey ? SOCIAL_MEDIA_PRESETS[newKey] : null

      canvas.width = preset?.width ?? 1920
      canvas.height = preset?.height ?? 1080
      if (recordingCanvas) {
        recordingCanvas.width = canvas.width
        recordingCanvas.height = canvas.height
      }
    },
    { immediate: true },
  )

  // Keyboard shortcuts
  function initKeyboardShortcuts() {
    if (keyboardShortcutsInstance.value) return
    if (!canvasManagerInstance.value || !multiImageManagerInstance.value) return

    keyboardShortcutsInstance.value = new KeyboardShortcuts(
      { playerStore, recorderStore, gridStore },
      {
        canvasManager: canvasManagerInstance.value,
        multiImageManager: multiImageManagerInstance.value,
      },
    )
    keyboardShortcutsInstance.value.enable()
  }

  initKeyboardShortcuts()
  if (!keyboardShortcutsInstance.value) {
    watch(
      () => [canvasManagerInstance.value, multiImageManagerInstance.value],
      () => {
        if (!keyboardShortcutsInstance.value) initKeyboardShortcuts()
      },
    )
  }

  await initializeRecorder()

  // Sync recording canvas size with display canvas
  watch(
    () => [canvasRef.value?.width, canvasRef.value?.height],
    ([width, height]) => {
      if (width && height) {
        recordingCanvas.width = width
        recordingCanvas.height = height
      }
    },
  )

  // Start render loop
  renderLoop.draw()

  // Recording state watcher
  watch(
    () => recorderStore.isRecording,
    (isRecording) => {
      if (isRecording) {
        setTimeout(() => startVisualizerLoop(), 100)
      } else {
        stopVisualizerLoop()

        audioEngine.disconnectMicFromRecordingChain()
        if (audioSourceStore.isMicrophoneActive) {
          audioEngine.disconnectMicrophoneSource()
          audioSourceStore.setSourceType('player')
        }

        // Recreate recording canvas after recording ends
        if (recordingCanvasStream) {
          recordingCanvasStream.getTracks().forEach((t) => t.stop())
          recordingCanvasStream = null
        }

        const canvas = canvasRef.value
        recordingCanvas = document.createElement('canvas')
        recordingCanvas.width = canvas?.width || 1920
        recordingCanvas.height = canvas?.height || 1080
        applyRecordingCanvasMonkeyPatch(recordingCanvas)

        if (recorderStore.recorder) {
          recorderStore.recorder.updateCanvas(recordingCanvas)
        }
      }
    },
  )
})

onUnmounted(() => {
  stopVisualizerLoop()
  audioEngine.cleanup()
  renderLoop.cleanup()
  globalAudioData.terminate()

  if (recordingCanvasStream) {
    recordingCanvasStream.getTracks().forEach((t) => {
      if (t.readyState !== 'ended') t.stop()
    })
    recordingCanvasStream = null
  }

  if (keyboardShortcutsInstance.value) {
    keyboardShortcutsInstance.value.destroy()
  }
})
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: auto;
  font-family: var(--font-sans, 'Supreme', sans-serif);
}
#app {
  height: 100%;
  background-color: var(--primary-bg, #091428);
  color: var(--text-primary, #e9e9eb);
  font-family: var(--font-sans, 'Supreme', sans-serif);
  font-size: 12px;
}
#app-container {
  min-height: 100%;
  background-color: var(--primary-bg, #091428);
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.layout-grid {
  display: grid;
  grid-template-columns: 340px 1fr 340px;
  grid-template-rows: minmax(0, 1fr);
  gap: 12px;
  flex: 1;
  padding: 12px;
  min-height: 0;
  background-color: var(--primary-bg, #091428);
}
.left-toolbar,
.center-column,
.right-panel {
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.left-toolbar,
.right-panel {
  overflow-y: auto;
  overflow-x: hidden;
}
.center-column {
  min-width: 0;
  overflow: hidden;
  background-color: var(--primary-bg, #091428);
}

.left-toolbar::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  width: 6px;
}
.left-toolbar::-webkit-scrollbar-track,
.right-panel::-webkit-scrollbar-track {
  background: rgba(201, 152, 77, 0.1);
  border-radius: 3px;
}
.left-toolbar::-webkit-scrollbar-thumb,
.right-panel::-webkit-scrollbar-thumb {
  background: rgba(201, 152, 77, 0.4);
  border-radius: 3px;
}
.left-toolbar::-webkit-scrollbar-thumb:hover,
.right-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 152, 77, 0.6);
}

[data-theme='light'] .left-toolbar::-webkit-scrollbar-track,
[data-theme='light'] .right-panel::-webkit-scrollbar-track {
  background: rgba(1, 79, 153, 0.06);
}
[data-theme='light'] .left-toolbar::-webkit-scrollbar-thumb,
[data-theme='light'] .right-panel::-webkit-scrollbar-thumb {
  background: rgba(1, 79, 153, 0.25);
}
[data-theme='light'] .left-toolbar::-webkit-scrollbar-thumb:hover,
[data-theme='light'] .right-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(1, 79, 153, 0.45);
}
</style>

<style scoped>
.left-toolbar,
.right-panel {
  background-color: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  padding: 10px;
  gap: 10px;
}

.right-panel {
  padding-bottom: 80px;
}

.canvas-wrapper {
  flex-grow: 1;
  background-color: var(--card-bg, #142640);
  border-radius: 12px;
  overflow: auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  background-color: transparent;
}

/* ── Shared Files Banner ───────────────────────────────────────────────── */
.shared-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.handoff-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 10px;
  /* Dezenter Akzent-Tint auf Karten-Hintergrund – funktioniert in Hell & Dunkel */
  background: color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg));
  border: 1px solid color-mix(in srgb, var(--accent-primary) 55%, transparent);
  box-shadow: var(--shadow-sm);
  animation: slideIn 0.3s ease-out;
}

.handoff-banner__preview {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
}
.handoff-banner__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.handoff-banner__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.handoff-banner__body strong {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-primary);
}
.handoff-banner__body span {
  font-size: 0.66rem;
  color: var(--text-muted);
}

.handoff-banner__actions {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
}
.handoff-banner__accept,
.handoff-banner__dismiss {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.66rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
/* Primär: Akzentfläche mit garantiert kontrastierendem Akzent-Text
   (dunkel auf Gold im Dark-Mode, hell auf Blau im Light-Mode) */
.handoff-banner__accept {
  background: var(--accent-primary);
  color: var(--accent-text);
}
.handoff-banner__accept:hover {
  filter: brightness(1.06);
}
/* Sekundär: Umriss mit primärer Theme-Textfarbe für hohen Kontrast in beiden Modi */
.handoff-banner__dismiss {
  background: transparent;
  color: var(--text-primary);
  border-color: color-mix(in srgb, var(--text-primary) 35%, transparent);
}
.handoff-banner__dismiss:hover {
  background: var(--btn-hover);
  color: var(--text-primary);
  border-color: color-mix(in srgb, var(--accent-primary) 45%, transparent);
}

.shared-banner-success {
  background-color: rgba(197, 222, 176, 0.15);
  border: 1px solid rgba(197, 222, 176, 0.4);
  color: var(--success, #c5deb0);
}
.shared-banner-error {
  background-color: rgba(255, 100, 100, 0.15);
  border: 1px solid rgba(255, 100, 100, 0.4);
  color: #ff6464;
}
.shared-banner-warning {
  background-color: rgba(255, 200, 50, 0.15);
  border: 1px solid rgba(255, 200, 50, 0.4);
  color: #ffc832;
}
.shared-banner-info {
  background-color: rgba(100, 180, 255, 0.15);
  border: 1px solid rgba(100, 180, 255, 0.4);
  color: #64b4ff;
}

[data-theme='light'] .shared-banner-success {
  background-color: rgba(56, 142, 60, 0.1);
  border-color: rgba(56, 142, 60, 0.3);
  color: #388e3c;
}
[data-theme='light'] .shared-banner-error {
  background-color: rgba(211, 47, 47, 0.1);
  border-color: rgba(211, 47, 47, 0.3);
  color: #d32f2f;
}
[data-theme='light'] .shared-banner-warning {
  background-color: rgba(245, 124, 0, 0.1);
  border-color: rgba(245, 124, 0, 0.3);
  color: #f57c00;
}
[data-theme='light'] .shared-banner-info {
  background-color: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.3);
  color: #014f99;
}

/* ── Mobile Panel Toggle ──────────────────────────────────────────────── */
.mobile-panel-bar {
  display: none;
}

@media (max-width: 1024px) {
  .layout-grid {
    grid-template-columns: 280px 1fr 280px;
    gap: 8px;
    padding: 8px;
  }
}

@media (max-width: 768px) {
  .mobile-panel-bar {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    background: var(--card-bg, #142640);
    border-bottom: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .mobile-panel-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 6px 6px;
    min-height: 52px;
    background: var(--secondary-bg, #0e1c32);
    border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
    border-radius: 8px;
    color: var(--text-muted, #7a8da0);
    font-size: 0.65rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      color 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease;
    position: relative;
    overflow: hidden;
  }

  .mobile-panel-btn.active {
    background: color-mix(
      in srgb,
      var(--accent-primary, #c9984d) 12%,
      var(--secondary-bg, #0e1c32)
    );
    color: var(--accent-primary, #c9984d);
    border-color: var(--accent-primary, #c9984d);
  }

  .mobile-panel-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  /* Bottom indicator bar — slides in on active */
  .mobile-active-bar {
    position: absolute;
    bottom: 0;
    left: 10%;
    right: 10%;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: var(--accent-primary, #c9984d);
    transform: scaleX(0);
    transition: transform 0.2s ease;
  }
  .mobile-panel-btn.active .mobile-active-bar {
    transform: scaleX(1);
  }

  .layout-grid {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr);
    gap: 0;
    padding: 0;
  }

  .left-toolbar,
  .right-panel {
    display: none;
    border-radius: 0;
    border-left: none;
    border-right: none;
    max-height: calc(100vh - 56px);
  }

  .left-toolbar.mobile-visible,
  .right-panel.mobile-visible {
    display: flex;
  }

  .center-column {
    display: none;
    border-radius: 0;
    min-height: calc(100vh - 56px);
  }

  .center-column.mobile-visible {
    display: flex;
  }
  .canvas-wrapper {
    border-radius: 0;
  }

  [data-theme='light'] .mobile-panel-btn {
    background: #fdfbf2;
    color: #5a7b9a;
    border-color: var(--border-color);
  }
  [data-theme='light'] .mobile-panel-btn.active {
    background: rgba(1, 79, 153, 0.08);
    color: #014f99;
    border-color: #014f99;
  }
  [data-theme='light'] .mobile-active-bar {
    background: #014f99;
  }
}

@media (max-width: 480px) {
  .mobile-panel-bar {
    padding: 4px 6px;
  }

  .mobile-panel-btn {
    padding: 6px 4px 4px;
    min-height: 44px;
    gap: 2px;
  }

  .mobile-panel-label {
    display: none;
  }

  .mobile-panel-icon {
    width: 22px;
    height: 22px;
  }

  .left-toolbar,
  .right-panel {
    padding: 6px;
    gap: 6px;
  }
}
</style>
