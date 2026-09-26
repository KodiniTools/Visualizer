<template>
  <div class="foto-panel-wrapper">
    <!-- Bild-Vorschau Overlay -->
    <ImagePreviewOverlay
      :previewImage="previewImage"
      @close="closePreview"
      @add-to-canvas="addPreviewToCanvas"
      @set-as-background="setPreviewAsBackground"
    />

    <!-- Upload-Bereich für eigene Bilder -->
    <ImageUploadSection
      :imageGallery="imageGallery"
      :selectedImageIndices="selectedImageIndices"
      :selectedImageCount="selectedImageCount"
      :selectedAnimation="selectedAnimation"
      :animationDuration="animationDuration"
      :imageScale="imageScale"
      :imageOffsetX="imageOffsetX"
      :imageOffsetY="imageOffsetY"
      :isInRangeSelectionMode="isInRangeSelectionMode"
      @upload="handleImageUpload"
      @select-image="selectImage"
      @open-preview="openUploadedPreview"
      @delete-image="deleteImage"
      @clear-all="clearAllImages"
      @select-all="selectAllImages"
      @deselect-all="deselectAllImages"
      @add-to-canvas="addImageToCanvas"
      @set-as-background="setAsBackground"
      @set-as-workspace-background="setAsWorkspaceBackground"
      @start-range-selection="startUploadedImageRangeSelection"
      @add-directly="addUploadedImageDirectly"
      @update:placement-settings="updatePlacementSettings"
      @image-dragstart="onGalleryImageDragStart"
      @image-dragend="onGalleryImageDragEnd"
    />

    <!-- Slideshow-Panel: bleibt hier gemountet (Verdrahtung mit dem Manager),
         wird aber in das Slideshow-Fenster der Sticky-Bar teleportiert -->
    <Teleport :to="slideshowTeleportTarget || 'body'" :disabled="!slideshowTeleportTarget">
      <SlideshowPanel
        :images="slideshowImages"
        :hasSavedSettings="hasSavedAudioSettings"
        :isActive="slideshowIsActive"
        :isPaused="slideshowIsPaused"
        :currentImageIndex="slideshowCurrentIndex"
        :totalImages="slideshowTotalImages"
        :currentPhase="slideshowCurrentPhase"
        :has-workspace="hasWorkspace"
        :adjustments-api="slideshowAdjustmentsApi"
        :external-transform="slideshowExternalTransform"
        :edit-image-request="slideshowEditRequest"
        :bounds-revision="slideshowBoundsRevision"
        @start="startSlideshow"
        @pause="pauseSlideshow"
        @resume="resumeSlideshow"
        @stop="stopSlideshow"
        @order-changed="onSlideshowOrderChanged"
        @render-layer-change="onSlideshowRenderLayerChange"
        @transform-change="onSlideshowTransformChange"
        @background-mode-change="onSlideshowBackgroundModeChange"
        @background-color-change="onSlideshowBackgroundColorChange"
        @workspace-color-change="onSlideshowWorkspaceColorChange"
        @base-gradient-change="onSlideshowBaseGradientChange"
        @base-fill-audio-change="onSlideshowBaseFillAudioChange"
        @base-image-change="onSlideshowBaseImageChange"
        @reset-image-adjustments="onSlideshowResetImageAdjustments"
        @live-update="onSlideshowLiveUpdate"
        @move-mode-change="onSlideshowMoveModeChange"
        @visibility-change="(v) => (slideshowPopover.panelVisible = v)"
      />
    </Teleport>

    <!-- Filter-Bereich -->
    <ImageFiltersPanel
      ref="imageFiltersPanelRef"
      :currentActiveImage="currentActiveImage"
      :presets="presets"
      :canMoveUp="canMoveUp"
      :canMoveDown="canMoveDown"
      :currentLayerInfo="currentLayerInfo"
      :bounds-api="imageBoundsApi"
      @bring-to-front="onBringToFront"
      @move-up="onMoveUp"
      @move-down="onMoveDown"
      @send-to-back="onSendToBack"
      @preset-change="onPresetChange"
      @filter-change="onFilterChange"
      @reset-filters="resetFilters"
    />
  </div>
</template>

<script setup>
/**
 * Foto-Panel: eigene Bilder (Galerie, Platzierung, Vorschau), Filter/Ebenen
 * des aktiven Canvas-Bildes und die Verdrahtung des Slideshow-Panels.
 * Die Logik liegt in den Composables unter `foto-panel/`.
 */
import { ref, watch, onMounted, onBeforeUnmount, inject } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useToastStore } from '../stores/toastStore'

// Sub-Komponenten
import ImagePreviewOverlay from './foto-panel/ImagePreviewOverlay.vue'
import ImageUploadSection from './foto-panel/ImageUploadSection.vue'
import ImageFiltersPanel from './foto-panel/ImageFiltersPanel.vue'
import SlideshowPanel from './foto-panel/SlideshowPanel.vue'

// Composables
import { SLIDESHOW_POPOVER_TARGET_ID } from '../composables/useSlideshowPopover.js'
import { useImageGallery } from '../composables/useImageGallery.js'
import { useImageAudioReactive } from '../composables/useImageAudioReactive.js'
import { useGalleryCanvasDrop } from '../composables/useGalleryCanvasDrop.js'
import { useFotoSlideshow } from './foto-panel/useFotoSlideshow.js'
import { useImagePlacement } from './foto-panel/useImagePlacement.js'
import { useActiveImageEditing } from './foto-panel/useActiveImageEditing.js'

const { t } = useI18n()
const toastStore = useToastStore()

// Injected Refs von App.vue
const fotoManagerRef = inject('fotoManager')
const multiImageManagerRef = inject('multiImageManager')
const canvasManagerRef = inject('canvasManager')

// Panel-Refs
const imageFiltersPanelRef = ref(null)

// Aktuell aktives Bild (für Filter-UI) – geteilter Zustand mit dem
// Audio-Reaktiv-Panel in der Player-Leiste; savedAudioReactiveSettings/
// hasSavedAudioSettings versorgen die Slideshow.
const { currentActiveImage, savedAudioReactiveSettings, hasSavedAudioSettings } =
  useImageAudioReactive()

// Filter-Presets des FotoManagers
const presets = ref([])

// ═══════════════════════════════════════════════════════════════════
// GALERIE & PLATZIERUNG
// ═══════════════════════════════════════════════════════════════════

const gallery = useImageGallery()
const {
  imageGallery,
  selectedImageIndices,
  selectedImages,
  selectedImageCount,
  selectImage,
  selectAllImages,
  deselectAllImages,
  deleteImage,
} = gallery

const {
  selectedAnimation,
  animationDuration,
  imageScale,
  imageOffsetX,
  imageOffsetY,
  isInRangeSelectionMode,
  previewImage,
  handleImageUpload,
  clearAllImages,
  addImageToCanvas,
  setAsBackground,
  setAsWorkspaceBackground,
  updatePlacementSettings,
  startUploadedImageRangeSelection,
  addUploadedImageDirectly,
  openUploadedPreview,
  closePreview,
  addPreviewToCanvas,
  setPreviewAsBackground,
} = useImagePlacement({ multiImageManagerRef, canvasManagerRef, gallery, toastStore, t })

// Drag & Drop: eigenes Galerie-Bild direkt auf den Canvas ziehen (ergänzt
// die Platzierungs-Buttons)
const {
  startDrag: startGalleryDrag,
  endDrag: endGalleryDrag,
  teardown: teardownGalleryDrop,
} = useGalleryCanvasDrop({
  canvasManagerRef,
  multiImageManagerRef,
  placement: { selectedAnimation, animationDuration, imageScale },
  // Eigene Bilder sind bereits als <img> geladen – direkt zurückgeben.
  resolveImage: (payload) => payload?.imgData?.img || null,
  onPlaced: (payload) => {
    console.log('✅ Eigenes Bild per Drag & Drop platziert:', payload?.imgData?.name)
    toastStore.success(t('toast.imageAddedToCanvas'))
  },
  onError: () => toastStore.error(t('toast.imageLoadError')),
})

function onGalleryImageDragStart(payload) {
  startGalleryDrag(payload, payload?.event)
}

function onGalleryImageDragEnd() {
  endGalleryDrag()
}

onBeforeUnmount(() => teardownGalleryDrop())

// ═══════════════════════════════════════════════════════════════════
// AKTIVES BILD: EBENEN & FILTER
// ═══════════════════════════════════════════════════════════════════

const {
  canMoveUp,
  canMoveDown,
  currentLayerInfo,
  onBringToFront,
  onSendToBack,
  onMoveUp,
  onMoveDown,
  onPresetChange,
  onFilterChange,
  resetFilters,
} = useActiveImageEditing({ multiImageManagerRef, fotoManagerRef, currentActiveImage })

// Position & Größe normaler Canvas-Bilder (ImageFiltersPanel → PositionSizeControls)
const imageBoundsApi = {
  getCanvas: () => multiImageManagerRef?.value?.canvas ?? null,
  redraw: () => canvasManagerRef?.value?.redraw?.(),
}

// ═══════════════════════════════════════════════════════════════════
// SLIDESHOW
// ═══════════════════════════════════════════════════════════════════

const {
  slideshowPopover,
  slideshowImages,
  hasWorkspace,
  slideshowIsActive,
  slideshowIsPaused,
  slideshowCurrentIndex,
  slideshowCurrentPhase,
  slideshowTotalImages,
  slideshowExternalTransform,
  slideshowBoundsRevision,
  slideshowEditRequest,
  slideshowAdjustmentsApi,
  startSlideshow,
  pauseSlideshow,
  resumeSlideshow,
  stopSlideshow,
  onSlideshowLiveUpdate,
  onSlideshowOrderChanged,
  onSlideshowMoveModeChange,
  onSlideshowResetImageAdjustments,
  onSlideshowBackgroundModeChange,
  onSlideshowBackgroundColorChange,
  onSlideshowWorkspaceColorChange,
  onSlideshowBaseGradientChange,
  onSlideshowBaseFillAudioChange,
  onSlideshowBaseImageChange,
  onSlideshowRenderLayerChange,
  onSlideshowTransformChange,
} = useFotoSlideshow({
  fotoManagerRef,
  multiImageManagerRef,
  canvasManagerRef,
  selectedImages,
  deselectAllImages,
  savedAudioReactiveSettings,
  toastStore,
  t,
})

// Teleport-Ziel: Slideshow-Fenster der Sticky-Bar (im selben Durchlauf
// gemountet und dauerhaft vorhanden)
const slideshowTeleportTarget = ref(null)
onMounted(() => {
  slideshowTeleportTarget.value = document.getElementById(SLIDESHOW_POPOVER_TARGET_ID)
})

// ═══════════════════════════════════════════════════════════════════
// INITIALISIERUNG
// ═══════════════════════════════════════════════════════════════════

function loadActiveImageSettings(imgData) {
  imageFiltersPanelRef.value?.loadImageSettings(imgData?.fotoSettings || {})
}

onMounted(() => {
  const initializePanel = () => {
    const fotoManager = fotoManagerRef?.value
    if (!fotoManager) {
      setTimeout(initializePanel, 100)
      return
    }

    presets.value = fotoManager.getAvailablePresets()

    // Controls global verfügbar machen. Die Audio-Reaktiv-Einstellungen des
    // aktiven Bildes lädt das Audio-Reaktiv-Panel in der Player-Leiste selbst
    // (über den geteilten currentActiveImage-Zustand).
    window.fotoPanelControls = {
      loadImageSettings: loadActiveImageSettings,
      currentActiveImage: currentActiveImage,
    }

    console.log('✅ FotoPanel initialisiert')
  }

  initializePanel()
})

// Aktives Bild gewechselt → Filter-Einstellungen laden
watch(
  currentActiveImage,
  (newImage) => {
    if (newImage) {
      loadActiveImageSettings(newImage)
      console.log('🖼️ Aktives Bild geändert:', newImage.id || newImage)
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.foto-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 480px) {
  .foto-panel-wrapper {
    gap: 6px;
  }
}
</style>
