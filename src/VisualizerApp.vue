<template>
  <div id="app-container">
    <AppHeader />

    <MobilePanelBar v-model="mobilePanel" :t="t" />

    <div class="layout-grid">
      <aside class="left-toolbar" :class="{ 'mobile-visible': mobilePanel === 'left' }">
        <!-- Text-Manager liegt in einem eigenen Popover der Player-Leiste -->
        <TickerPanel />
        <FotoPanel />
        <!-- Video liegt in einem eigenen Popover der Player-Leiste -->
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
          :replace-gallery-open="showReplaceGallery"
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
        <!-- Canvas-Steuerung liegt in einem eigenen Popover der Player-Leiste -->
      </aside>
    </div>

    <audio ref="audioRef" crossOrigin="anonymous" style="display: none"></audio>

    <StickyPlayerBar />

    <QuickStartGuide ref="quickStartGuideRef" />
    <ToastContainer />
  </div>
</template>

<script lang="ts">
// Explicit name so <keep-alive include="['VisualizerApp']"> in App.vue matches
// this component and preserves its state across route changes.
export default { name: 'VisualizerApp' }
</script>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  onActivated,
  onDeactivated,
  provide,
  watch,
  type Ref,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from './lib/i18n'
import { usePlayerStore } from './stores/playerStore'
import { useRecorderStore } from './stores/recorderStore'
import { useTextStore } from './stores/textStore'
import { useVisualizerStore } from './stores/visualizerStore'
import { useGridStore } from './stores/gridStore'
import { useWorkspaceStore } from './stores/workspaceStore'
import { useBackgroundTilesStore } from './stores/backgroundTilesStore'
import { useAudioSourceStore } from './stores/audioSourceStore'
import { useBeatDropStore } from './stores/beatDropStore'
import { useMarkerTransitionStore } from './stores/markerTransitionStore'
import { useAudioFxStore } from './stores/audioFxStore'
import { useTickerStore } from './stores/tickerStore'
import { useToastStore } from './stores/toastStore'
import { useHistoryStore } from './stores/historyStore'
import { useBeatMarkerStore } from './stores/beatMarkerStore'
import { BeatDropRenderer } from './lib/canvasManager/rendering/BeatDropRenderer'
import { AudioFxRenderer } from './lib/canvasManager/rendering/AudioFxRenderer'
import { TickerRenderer } from './lib/canvasManager/rendering/TickerRenderer'
import { MarkerTransitionRenderer } from './lib/canvasManager/rendering/MarkerTransitionRenderer'
import { useFrameCapture } from './composables/useFrameCapture'
import { useCanvasImages } from './composables/useCanvasImages'
import { useGlobalAudioData } from './composables/useGlobalAudioData'
import { useVisualizerLoop } from './composables/useVisualizerLoop'
import { useAudioEngine } from './composables/useAudioEngine'
import { useRenderLoop } from './composables/useRenderLoop'
import { useImageGallery } from './composables/useImageGallery'
import { useCanvasSetup } from './composables/useCanvasSetup'
import { useRecorderSetup } from './composables/useRecorderSetup'
import { useStatusBanner } from './composables/useStatusBanner'
import { useSharedFiles } from './composables/useSharedFiles'
import { useHandoff } from './composables/useHandoff'
import { useHistorySetup } from './composables/useHistorySetup'
import { useShapeLayer } from './composables/useShapeLayer'
import { useShapeStore } from './stores/shapeStore'
import { setupVisualizerPersistence } from './lib/visualizerPersistence'
import { setupAudioSettingsPersistence } from './lib/audioSettingsPersistence'

import FileUploadPanel from './components/FileUploadPanel.vue'
import StickyPlayerBar from './components/StickyPlayerBar.vue'
import FotoPanel from './components/FotoPanel.vue'
import TickerPanel from './components/TickerPanel.vue'
import QuickStartGuide from './components/QuickStartGuide.vue'
import ToastContainer from './components/ToastContainer.vue'
import AppHeader from './components/AppHeader.vue'
import MobilePanelBar from './components/MobilePanelBar.vue'
import StatusBanner from './components/StatusBanner.vue'
import HandoffBanner from './components/HandoffBanner.vue'
import ImageThumbnailBar from './components/canvas-bar/ImageThumbnailBar.vue'
import ImagePreviewModal from './components/canvas-bar/ImagePreviewModal.vue'
import ReplaceGalleryModal from './components/canvas-bar/ReplaceGalleryModal.vue'

import { CUSTOM_FONTS } from './lib/fonts'
import { FontManager } from './lib/fontManager'
import { startLazyFontLoading } from './composables/visualizerApp/lazyFonts'
import { bindAudioElementEvents } from './composables/visualizerApp/audioElementEvents'
import {
  watchGridSettings,
  watchWorkspacePreset,
  watchRecordingCanvasSize,
} from './composables/visualizerApp/canvasSync'
import { setupKeyboardShortcuts } from './composables/visualizerApp/keyboardShortcutsSetup'
import { bindHqCaptureEvents } from './composables/visualizerApp/hqCaptureEvents'

import type { CanvasManager } from './lib/canvasManager'
import type { FotoManager } from './lib/fotoManager'
import type { GridManager } from './lib/gridManager'
import type { MultiImageManager } from './lib/multiImageManager'
import type { VideoManager } from './lib/videoManager'
import type { KeyboardShortcuts } from './lib/keyboardShortcuts'

import './styles/visualizer-app.css'

type ShortcutsDeps = Parameters<typeof setupKeyboardShortcuts>[0]

const { t } = useI18n()
const playerStore = usePlayerStore()
const recorderStore = useRecorderStore()
const textStore = useTextStore()
const visualizerStore = useVisualizerStore()
const beatDropStore = useBeatDropStore()
const audioFxStore = useAudioFxStore()
const tickerStore = useTickerStore()
const markerTransitionStore = useMarkerTransitionStore()
markerTransitionStore.load()
const gridStore = useGridStore()
const workspaceStore = useWorkspaceStore()
const backgroundTilesStore = useBackgroundTilesStore()
const audioSourceStore = useAudioSourceStore()
const toastStore = useToastStore()
const historyStore = useHistoryStore()
const beatMarkerStore = useBeatMarkerStore()
const shapeStore = useShapeStore()
const route = useRoute()
const router = useRouter()

const { start: startCapture, stop: stopCapture } = useFrameCapture()

const audioRef = ref<HTMLAudioElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const mobilePanel = ref('canvas')
const quickStartGuideRef = ref<InstanceType<typeof QuickStartGuide> | null>(null)

// ── Manager instances ─────────────────────────────────────────────────────────
// Klasseninstanzen: wie bisher als ref() (tiefe Reaktivität unverändert)
const canvasManagerInstance = ref<CanvasManager | null>(null) as Ref<CanvasManager | null>
const fotoManagerInstance = ref<FotoManager | null>(null) as Ref<FotoManager | null>
const gridManagerInstance = ref<GridManager | null>(null) as Ref<GridManager | null>
const multiImageManagerInstance = ref<MultiImageManager | null>(
  null,
) as Ref<MultiImageManager | null>
const videoManagerInstance = ref<VideoManager | null>(null) as Ref<VideoManager | null>
const fontManagerInstance = ref<FontManager | null>(null) as Ref<FontManager | null>
const keyboardShortcutsInstance = ref<KeyboardShortcuts | null>(
  null,
) as Ref<KeyboardShortcuts | null>

provide('fontManager', fontManagerInstance)
provide('canvasManager', canvasManagerInstance)
provide('fotoManager', fotoManagerInstance)
provide('multiImageManager', multiImageManagerInstance)
provide('videoManager', videoManagerInstance)

// ── Shared recording infrastructure (used by render loop + recorder setup) ──────
let recordingCanvas = document.createElement('canvas')
let recordingCanvasStream: MediaStream | null = null
const getRecordingCanvas = () => recordingCanvas
const setRecordingCanvas = (c: HTMLCanvasElement) => {
  recordingCanvas = c
}
const getRecordingCanvasStream = () => recordingCanvasStream
const setRecordingCanvasStream = (s: MediaStream | null) => {
  recordingCanvasStream = s
}

const beatDropRenderer = new BeatDropRenderer()
const audioFxRenderer = new AudioFxRenderer()
const tickerRenderer = new TickerRenderer()
const markerTransitionRenderer = new MarkerTransitionRenderer(markerTransitionStore)

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

// ── Globaler Undo/Redo-Verlauf (alle Panels) ────────────────────────────────────
// Visualizer-Einstellungen dauerhaft speichern – vor dem Undo-Verlauf laden,
// damit das Wiederherstellen keinen Verlaufsschritt erzeugt
const visualizerPersistence = setupVisualizerPersistence(visualizerStore)
onUnmounted(() => visualizerPersistence.stop())
const audioSettingsPersistence = setupAudioSettingsPersistence({
  playerStore,
  audioSourceStore,
  audioFxStore,
  beatDropStore,
})
onUnmounted(() => audioSettingsPersistence.stop())

useHistorySetup({
  historyStore,
  canvasManagerInstance,
  stores: {
    workspaceStore,
    backgroundTilesStore,
    gridStore,
    visualizerStore,
    audioFxStore,
    beatDropStore,
    tickerStore,
    beatMarkerStore,
    markerTransitionStore,
    shapeStore,
  },
})

// ── Formen & Symbole (Zeichnen, Auswahl, Interaktion) ───────────────────────────
const shapeLayer = useShapeLayer({ canvasRef, canvasManagerInstance, shapeStore, historyStore })

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
  shapeLayer,
  getRecordingCanvas,
  visualizerStore,
  recorderStore,
  playerStore,
  audioSourceStore,
  audioFxStore,
  beatDropStore,
  beatDropRenderer,
  audioFxRenderer,
  tickerStore,
  tickerRenderer,
  markerTransitionRenderer,
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

  // Fonts – erst bei der ersten Interaktion laden (siehe lazyFonts.js)
  fontManagerInstance.value = new FontManager()
  startLazyFontLoading(fontManagerInstance.value, CUSTOM_FONTS)

  // Audio player events
  playerStore.setAudioRef(audioRef.value)
  bindAudioElementEvents(audioRef.value, { playerStore, audioEngine })

  audioEngine.setupAudioContext()
  audioEngine.registerEngine()

  // Recording redraw listener
  renderLoop.setupRecordingRedrawListener()
  renderLoop.registerScreenshot(canvasManagerInstance)

  // HQ Frame Capture
  bindHqCaptureEvents({ getRecordingCanvas, startCapture, stopCapture })

  // Canvas init fallback
  if (canvasRef.value) initializeCanvas(canvasRef.value)

  watchGridSettings({ gridManagerInstance, gridStore })
  watchWorkspacePreset({
    workspaceStore,
    canvasRef,
    canvasManagerInstance,
    presets: SOCIAL_MEDIA_PRESETS,
    getRecordingCanvas,
  })

  // Keyboard shortcuts (warten ggf. auf Canvas- und MultiImageManager)
  setupKeyboardShortcuts({
    instanceRef: keyboardShortcutsInstance,
    // Die Shortcut-Typen beschreiben nur den genutzten Ausschnitt (z. B. hat
    // VideoObject.imageObject keinen width/height-Typ), daher der Cast
    canvasManagerInstance:
      canvasManagerInstance as unknown as ShortcutsDeps['canvasManagerInstance'],
    multiImageManagerInstance:
      multiImageManagerInstance as unknown as ShortcutsDeps['multiImageManagerInstance'],
    stores: { playerStore, recorderStore, gridStore, historyStore },
  })

  await recorderSetup.initializeRecorder()

  // Sync recording canvas size with display canvas
  watchRecordingCanvasSize({ canvasRef, getRecordingCanvas })

  // Start render loop
  renderLoop.draw()

  // Recording state watcher
  watch(
    () => recorderStore.isRecording,
    (isRecording) => recorderSetup.handleRecordingStateChange(isRecording),
  )
})

// With keep-alive the component is deactivated (not unmounted) when leaving the
// /app route. Pause the render loop to free the CPU/GPU while the user is on the
// landing page, then resume it on return — all state stays intact.
// On the very first mount Vue fires onActivated right after onMounted, which
// already starts the loop; skip that first activation so we don't run two loops.
let renderLoopStartedByMount = false
onDeactivated(() => {
  renderLoop.stop()
})

onActivated(() => {
  if (!renderLoopStartedByMount) {
    renderLoopStartedByMount = true
    return
  }
  renderLoop.draw()
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
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  padding: 10px;
  gap: 10px;
}

.right-panel {
  padding-bottom: 80px;
}

.canvas-wrapper {
  flex-grow: 1;
  background-color: var(--card-bg);
  border-radius: var(--ds-radius-lg);
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
