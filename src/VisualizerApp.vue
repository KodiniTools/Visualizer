<template>
  <div id="app-container">
    <AppHeader />

    <MobilePanelBar v-model="mobilePanel" :t="t" />

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
        <StatusBanner :banner="banner" />
        <HandoffBanner
          :payload="handoffPayload"
          :t="t"
          @accept="acceptHandoff"
          @reject="rejectHandoff"
        />
        <FileUploadPanel />
        <PresetPanel />
        <VisualizerPanel />
        <CanvasControlPanel />
      </aside>
    </div>

    <audio ref="audioRef" crossOrigin="anonymous" style="display: none"></audio>

    <StickyPlayerBar />

    <QuickStartGuide ref="quickStartGuideRef" />
    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from './lib/i18n.js'
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
import { useToastStore } from './stores/toastStore.js'
import { useHistoryStore } from './stores/historyStore.js'
import { BeatDropRenderer } from './lib/canvasManager/rendering/BeatDropRenderer.js'
import { AudioFxRenderer } from './lib/canvasManager/rendering/AudioFxRenderer.js'
import { useFrameCapture } from './composables/useFrameCapture.js'
import { useCanvasImages } from './composables/useCanvasImages.js'
import { useGlobalAudioData } from './composables/useGlobalAudioData.js'
import { useVisualizerLoop } from './composables/useVisualizerLoop.js'
import { useAudioEngine } from './composables/useAudioEngine.js'
import { useRenderLoop } from './composables/useRenderLoop.js'
import { useImageGallery } from './composables/useImageGallery.js'
import { useCanvasSetup } from './composables/useCanvasSetup.js'
import { useRecorderSetup } from './composables/useRecorderSetup.js'
import { useStatusBanner } from './composables/useStatusBanner.js'
import { useSharedFiles } from './composables/useSharedFiles.js'
import { useHandoff } from './composables/useHandoff.js'

import FileUploadPanel from './components/FileUploadPanel.vue'
import StickyPlayerBar from './components/StickyPlayerBar.vue'
import FotoPanel from './components/FotoPanel.vue'
import VideoPanel from './components/VideoPanel.vue'
import TextManagerPanel from './components/TextManagerPanel.vue'
import VisualizerPanel from './components/VisualizerPanel.vue'
import PresetPanel from './components/PresetPanel.vue'
import CanvasControlPanel from './components/CanvasControlPanel.vue'
import QuickStartGuide from './components/QuickStartGuide.vue'
import ToastContainer from './components/ToastContainer.vue'
import AppHeader from './components/AppHeader.vue'
import MobilePanelBar from './components/MobilePanelBar.vue'
import StatusBanner from './components/StatusBanner.vue'
import HandoffBanner from './components/HandoffBanner.vue'
import ImageThumbnailBar from './components/canvas-bar/ImageThumbnailBar.vue'
import ImagePreviewModal from './components/canvas-bar/ImagePreviewModal.vue'
import ReplaceGalleryModal from './components/canvas-bar/ReplaceGalleryModal.vue'

import { CUSTOM_FONTS } from './lib/fonts.js'
import { FontManager } from './lib/fontManager.js'
import { KeyboardShortcuts } from './lib/keyboardShortcuts.js'

import './styles/visualizer-app.css'

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
const toastStore = useToastStore()
const historyStore = useHistoryStore()
const route = useRoute()
const router = useRouter()

const { start: startCapture, stop: stopCapture } = useFrameCapture()

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

// ── Shared recording infrastructure (used by render loop + recorder setup) ──────
let recordingCanvas = document.createElement('canvas')
let recordingCanvasStream = null
const getRecordingCanvas = () => recordingCanvas
const setRecordingCanvas = (c) => {
  recordingCanvas = c
}
const getRecordingCanvasStream = () => recordingCanvasStream
const setRecordingCanvasStream = (s) => {
  recordingCanvasStream = s
}

const beatDropRenderer = new BeatDropRenderer()
const audioFxRenderer = new AudioFxRenderer()

// ── Composables ───────────────────────────────────────────────────────────────
const globalAudioData = useGlobalAudioData()

const audioEngine = useAudioEngine({
  audioRef,
  audioSourceStore,
  playerStore,
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

// ── Canvas + manager construction ───────────────────────────────────────────────
const { SOCIAL_MEDIA_PRESETS, initializeCanvas, getTextManager } = useCanvasSetup({
  audioRef,
  managers: {
    canvasManagerInstance,
    fotoManagerInstance,
    gridManagerInstance,
    multiImageManagerInstance,
    videoManagerInstance,
  },
  stores: { workspaceStore, textStore, backgroundTilesStore, historyStore, toastStore },
  t,
  getRecordingCanvas,
  selectedCanvasImageId,
})

const { startVisualizerLoop, stopVisualizerLoop } = useVisualizerLoop({
  getRecordingCanvasStream,
  setRecordingCanvasStream,
})

const renderLoop = useRenderLoop({
  canvasRef,
  canvasManagerInstance,
  multiImageManagerInstance,
  videoManagerInstance,
  gridManagerInstance,
  getTextManager,
  getRecordingCanvas,
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

const recorderSetup = useRecorderSetup({
  canvasRef,
  audioRef,
  audioEngine,
  recorderStore,
  audioSourceStore,
  canvasManagerInstance,
  renderLoop,
  startVisualizerLoop,
  stopVisualizerLoop,
  getRecordingCanvas,
  setRecordingCanvas,
  getRecordingCanvasStream,
  setRecordingCanvasStream,
})
recorderSetup.exposeRecorderGlobals()

// ── Status banner + shared-file import + handoff ────────────────────────────────
const { banner, showBanner } = useStatusBanner()
const { addImagesFromData } = useImageGallery()

const { loadSharedFiles } = useSharedFiles({ t, playerStore, showBanner })
const { handoffPayload, checkForHandoff, acceptHandoff, rejectHandoff } = useHandoff({
  t,
  showBanner,
  addImagesFromData,
  mobilePanel,
})

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
  // Canvas availability watcher — register before any await. initializeCanvas
  // is idempotent, so calling it whenever the canvas appears is safe.
  watch(
    () => canvasRef.value,
    (newCanvas) => {
      if (newCanvas) initializeCanvas(newCanvas)
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
      const rec = getRecordingCanvas()
      if (rec) {
        rec.width = canvas.width
        rec.height = canvas.height
      }
    },
    { immediate: true },
  )

  // Keyboard shortcuts
  function initKeyboardShortcuts() {
    if (keyboardShortcutsInstance.value) return
    if (!canvasManagerInstance.value || !multiImageManagerInstance.value) return

    keyboardShortcutsInstance.value = new KeyboardShortcuts(
      { playerStore, recorderStore, gridStore, historyStore },
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

  await recorderSetup.initializeRecorder()

  // Sync recording canvas size with display canvas
  watch(
    () => [canvasRef.value?.width, canvasRef.value?.height],
    ([width, height]) => {
      if (width && height) {
        const rec = getRecordingCanvas()
        rec.width = width
        rec.height = height
      }
    },
  )

  // Start render loop
  renderLoop.draw()

  // Recording state watcher
  watch(
    () => recorderStore.isRecording,
    (isRecording) => recorderSetup.handleRecordingStateChange(isRecording),
  )
})

onUnmounted(() => {
  stopVisualizerLoop()
  audioEngine.cleanup()
  renderLoop.cleanup()
  globalAudioData.terminate()

  const stream = getRecordingCanvasStream()
  if (stream) {
    stream.getTracks().forEach((track) => {
      if (track.readyState !== 'ended') track.stop()
    })
    setRecordingCanvasStream(null)
  }

  if (keyboardShortcutsInstance.value) {
    keyboardShortcutsInstance.value.destroy()
  }
})
</script>

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

/* ── Responsive layout ────────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .layout-grid {
    grid-template-columns: 280px 1fr 280px;
    gap: 8px;
    padding: 8px;
  }
}

@media (max-width: 768px) {
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
}

@media (max-width: 480px) {
  .left-toolbar,
  .right-panel {
    padding: 6px;
    gap: 6px;
  }
}
</style>
