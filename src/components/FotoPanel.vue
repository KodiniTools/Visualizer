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
    />

    <!-- Slideshow-Panel (wenn 2+ Bilder ausgewählt oder aktiv) -->
    <SlideshowPanel
      :images="slideshowImages"
      :hasSavedSettings="hasSavedAudioSettings"
      :isActive="slideshowIsActive"
      :isPaused="slideshowIsPaused"
      :currentImageIndex="slideshowCurrentIndex"
      :totalImages="slideshowTotalImages"
      :currentPhase="slideshowCurrentPhase"
      @start="startSlideshow"
      @pause="pauseSlideshow"
      @resume="resumeSlideshow"
      @stop="stopSlideshow"
      @order-changed="onSlideshowOrderChanged"
      @render-layer-change="onSlideshowRenderLayerChange"
      @transform-change="onSlideshowTransformChange"
    />

    <!-- Filter-Bereich -->
    <ImageFiltersPanel
      ref="imageFiltersPanelRef"
      :currentActiveImage="currentActiveImage"
      :presets="presets"
      :canMoveUp="canMoveUp"
      :canMoveDown="canMoveDown"
      :currentLayerInfo="currentLayerInfo"
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
import { ref, computed, watch, onMounted, inject } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useToastStore } from '../stores/toastStore'

// Sub-Komponenten
import ImagePreviewOverlay from './foto-panel/ImagePreviewOverlay.vue'
import ImageUploadSection from './foto-panel/ImageUploadSection.vue'
import ImageFiltersPanel from './foto-panel/ImageFiltersPanel.vue'
import SlideshowPanel from './foto-panel/SlideshowPanel.vue'

// Lib
import { SlideshowManager } from '../lib/slideshowManager.js'

// Composables
import { useImageGallery } from '../composables/useImageGallery.js'
import { useImageAudioReactive } from '../composables/useImageAudioReactive.js'

const { t } = useI18n()
const toastStore = useToastStore()

// Injected Refs von App.vue
const fotoManagerRef = inject('fotoManager')
const multiImageManagerRef = inject('multiImageManager')
const canvasManagerRef = inject('canvasManager')

// Panel-Refs
const imageFiltersPanelRef = ref(null)

// Aktuell aktives Bild (für Filter-UI) – geteilter Zustand mit dem
// Audio-Reaktiv-Panel in der Player-Leiste.
const { currentActiveImage } = useImageAudioReactive()

// Presets
const presets = ref([])

// Platzierungs-Einstellungen
const selectedAnimation = ref('none')
const animationDuration = ref(1000)
const imageScale = ref(1)
const imageOffsetX = ref(0)
const imageOffsetY = ref(0)

// Bereichsauswahl-Modus
const isInRangeSelectionMode = ref(false)
const pendingRangeSelectionImage = ref(null)

// Bild-Vorschau
const previewImage = ref(null)

// Image-Galerie Composable
const {
  imageGallery,
  selectedImageIndices,
  selectedImages,
  selectedImageCount,
  handleImageUpload: handleImageUploadComposable,
  selectImage,
  selectAllImages,
  deselectAllImages,
  deleteImage,
  clearAllImages: clearAllImagesComposable,
} = useImageGallery()

// Audio-Reaktiv State (der aktive-Bild-Zustand wird mit dem Audio-Reaktiv-Panel
// in der Player-Leiste geteilt; savedAudioReactiveSettings/hasSavedAudioSettings
// versorgen die Slideshow).
const { savedAudioReactiveSettings, hasSavedAudioSettings } = useImageAudioReactive()

// ═══════════════════════════════════════════════════════════════════
// SLIDESHOW STATE
// ═══════════════════════════════════════════════════════════════════

const slideshowManagerRef = ref(null)
const slideshowIsActive = ref(false)
const slideshowIsPaused = ref(false)
const slideshowCurrentIndex = ref(0)
const slideshowCurrentPhase = ref('fadeIn')
const slideshowTotalImages = ref(0)

// Kombinierte ausgewählte Bilder für Slideshow (hochgeladene + Stock)
const slideshowImages = computed(() => {
  const images = []
  // Hochgeladene Bilder
  for (const imgData of selectedImages.value) {
    images.push({
      imageObject: imgData.img,
      name: imgData.name,
      id: imgData.id,
    })
  }
  return images
})

// ═══════════════════════════════════════════════════════════════════
// EBENEN-STEUERUNG (Z-Index)
// ═══════════════════════════════════════════════════════════════════

const canMoveUp = computed(() => {
  if (!currentActiveImage.value) return false
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager) return false
  const index = multiImageManager.getImageIndex(currentActiveImage.value)
  const count = multiImageManager.getImageCount()
  return index !== -1 && index < count - 1
})

const canMoveDown = computed(() => {
  if (!currentActiveImage.value) return false
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager) return false
  const index = multiImageManager.getImageIndex(currentActiveImage.value)
  return index > 0
})

const currentLayerInfo = computed(() => {
  if (!currentActiveImage.value) return ''
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager) return ''
  const index = multiImageManager.getImageIndex(currentActiveImage.value)
  const count = multiImageManager.getImageCount()
  if (index === -1 || count === 0) return ''
  return `${index + 1} / ${count}`
})

function onBringToFront() {
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager || !currentActiveImage.value) return
  multiImageManager.bringToFront(currentActiveImage.value)
}

function onSendToBack() {
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager || !currentActiveImage.value) return
  multiImageManager.sendToBack(currentActiveImage.value)
}

function onMoveUp() {
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager || !currentActiveImage.value) return
  multiImageManager.moveUp(currentActiveImage.value)
}

function onMoveDown() {
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager || !currentActiveImage.value) return
  multiImageManager.moveDown(currentActiveImage.value)
}

// ═══════════════════════════════════════════════════════════════════
// FILTER-HANDLER
// ═══════════════════════════════════════════════════════════════════

function onPresetChange(presetId) {
  if (!currentActiveImage.value) return
  const fotoManager = fotoManagerRef?.value
  if (!fotoManager) return

  if (presetId === '') {
    fotoManager.applyPreset(currentActiveImage.value, 'normal')
  } else {
    fotoManager.applyPreset(currentActiveImage.value, presetId)
  }
  console.log('🎨 Preset angewendet:', presetId || 'normal')
}

function onFilterChange({ property, value }) {
  if (!currentActiveImage.value) return

  if (!currentActiveImage.value.fotoSettings) {
    currentActiveImage.value.fotoSettings = {}
  }

  currentActiveImage.value.fotoSettings[property] = value
  console.log(`✏️ Filter aktualisiert: ${property} = ${value}`)
}

function resetFilters() {
  if (!currentActiveImage.value) return

  const defaultSettings = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    opacity: 100,
    blur: 0,
    hueRotate: 0,
    shadowColor: '#000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
    borderColor: '#ffffff',
    borderWidth: 0,
    borderOpacity: 100,
  }

  currentActiveImage.value.fotoSettings = { ...defaultSettings }
  console.log('🔄 Filter zurückgesetzt')
}

// ═══════════════════════════════════════════════════════════════════
// SLIDESHOW FUNKTIONEN
// ═══════════════════════════════════════════════════════════════════

function initSlideshowManager() {
  const multiImageManager = multiImageManagerRef?.value
  const fotoManager = fotoManagerRef?.value
  const canvasManager = canvasManagerRef?.value

  if (!multiImageManager || !fotoManager) {
    console.warn('[Slideshow] Manager nicht verfügbar, versuche später erneut')
    setTimeout(initSlideshowManager, 500)
    return
  }

  slideshowManagerRef.value = new SlideshowManager(multiImageManager, fotoManager, {
    redrawCallback: () => {
      if (canvasManager && canvasManager.redraw) {
        canvasManager.redraw()
      }
    },
    onSlideshowComplete: () => {
      slideshowIsActive.value = false
      slideshowIsPaused.value = false
      slideshowCurrentIndex.value = 0
      slideshowTotalImages.value = 0
      toastStore.success(t('slideshow.title') + ' beendet')
      console.log('[Slideshow] Beendet')
      // ✨ Global entfernen wenn gestoppt
      window.slideshowManager = null
    },
    onImageTransition: (index, total, phase) => {
      slideshowCurrentIndex.value = index
      slideshowCurrentPhase.value = phase
    },
  })

  // ✨ NEU: Global verfügbar machen für Maus-Interaktion
  window.slideshowManager = slideshowManagerRef.value

  console.log('[Slideshow] SlideshowManager initialisiert')
}

function startSlideshow(config) {
  if (!slideshowManagerRef.value) {
    initSlideshowManager()
  }

  if (!slideshowManagerRef.value) {
    toastStore.error('Slideshow Manager nicht bereit')
    return
  }

  // Bilder aus der Konfiguration extrahieren
  const images = config.images.map((img) => ({
    imageObject: img.imageObject || img.img,
    name: img.name,
    audioReactiveSettings:
      config.applyAudioReactive && savedAudioReactiveSettings.value
        ? savedAudioReactiveSettings.value
        : null,
  }))

  const success = slideshowManagerRef.value.start(images, {
    fadeInDuration: config.fadeInDuration,
    displayDuration: config.displayDuration,
    fadeOutDuration: config.fadeOutDuration,
    loop: config.loop,
    autoApplyAudioReactive: config.applyAudioReactive,
    audioReactiveSettings: config.applyAudioReactive ? savedAudioReactiveSettings.value : null,
    renderBehindVisualizer: config.renderBehindVisualizer,
    transform: config.transform,
  })

  if (success) {
    slideshowIsActive.value = true
    slideshowIsPaused.value = false
    slideshowTotalImages.value = images.length
    // ✨ Global verfügbar machen für Maus-Interaktion
    window.slideshowManager = slideshowManagerRef.value
    toastStore.success(t('slideshow.title') + ' gestartet')
    // Auswahl aufheben nach dem Start
    deselectAllImages()
  }
}

function pauseSlideshow() {
  if (slideshowManagerRef.value) {
    slideshowManagerRef.value.pause()
    slideshowIsPaused.value = true
  }
}

function resumeSlideshow() {
  if (slideshowManagerRef.value) {
    slideshowManagerRef.value.resume()
    slideshowIsPaused.value = false
  }
}

function stopSlideshow() {
  if (slideshowManagerRef.value) {
    slideshowManagerRef.value.stop()
    slideshowIsActive.value = false
    slideshowIsPaused.value = false
    slideshowCurrentIndex.value = 0
    slideshowTotalImages.value = 0
    // ✨ Global entfernen wenn gestoppt
    window.slideshowManager = null
  }
}

// ✨ NEU: Slideshow Bild-Reihenfolge geändert
function onSlideshowOrderChanged(orderedImages) {
  console.log('[Slideshow] Reihenfolge geändert:', orderedImages.length, 'Bilder')
}

// ✨ NEU: Slideshow Render-Layer geändert
function onSlideshowRenderLayerChange(renderBehindVisualizer) {
  if (slideshowManagerRef.value) {
    slideshowManagerRef.value.setRenderBehindVisualizer(renderBehindVisualizer)
    console.log(
      '[Slideshow] Render-Layer geändert:',
      renderBehindVisualizer ? 'hinter Visualizer' : 'vor Visualizer',
    )
  }
}

// ✨ NEU: Slideshow Transform geändert
function onSlideshowTransformChange(transform) {
  if (slideshowManagerRef.value) {
    slideshowManagerRef.value.setTransform(transform)
    console.log('[Slideshow] Transform geändert:', transform)
  }
}

// ═══════════════════════════════════════════════════════════════════
// CANVAS-OPERATIONEN
// ═══════════════════════════════════════════════════════════════════

function handleImageUpload(event) {
  handleImageUploadComposable(
    event,
    () => toastStore.success(t('toast.imageLoadSuccess')),
    (name) => toastStore.error(`${t('toast.imageLoadError')}: ${name}`),
  )
}

function clearAllImages() {
  if (!confirm(`Alle ${imageGallery.value.length} Bilder aus der Galerie löschen?`)) return
  clearAllImagesComposable()
}

function addImageToCanvas() {
  const imagesToAdd = selectedImages.value
  if (imagesToAdd.length === 0) return
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager) return

  imagesToAdd.forEach((imgData) => {
    multiImageManager.addImage(imgData.img)
  })

  console.log(`✅ ${imagesToAdd.length} Bild(er) auf Canvas platziert`)
  toastStore.success(t('toast.imagesAddedToCanvas').replace('{count}', imagesToAdd.length))
  deselectAllImages()
}

function setAsBackground() {
  if (selectedImageCount.value !== 1) return
  const imgToSet = selectedImages.value[0]
  if (!imgToSet) return
  const canvasManager = canvasManagerRef?.value
  if (!canvasManager) return
  canvasManager.setBackground(imgToSet.img)
  console.log('✅ Bild als Hintergrund gesetzt:', imgToSet.name)
  deselectAllImages()
}

function setAsWorkspaceBackground() {
  if (selectedImageCount.value !== 1) return
  const imgToSet = selectedImages.value[0]
  if (!imgToSet) return
  const canvasManager = canvasManagerRef?.value
  if (!canvasManager) return
  const success = canvasManager.setWorkspaceBackground(imgToSet.img)
  if (success) {
    console.log('✅ Bild als Workspace-Hintergrund gesetzt:', imgToSet.name)
    deselectAllImages()
  } else {
    toastStore.warning(t('toast.selectWorkspaceFirst'))
  }
}

// ═══════════════════════════════════════════════════════════════════
// BEREICHSAUSWAHL MIT ANIMATION
// ═══════════════════════════════════════════════════════════════════

function updatePlacementSettings(settings) {
  selectedAnimation.value = settings.selectedAnimation
  animationDuration.value = settings.animationDuration
  imageScale.value = settings.imageScale
  imageOffsetX.value = settings.imageOffsetX
  imageOffsetY.value = settings.imageOffsetY
}

function startUploadedImageRangeSelection() {
  if (selectedImageCount.value !== 1) return
  const imgData = selectedImages.value[0]
  if (!imgData || !imgData.img) return
  const canvasManager = canvasManagerRef?.value
  if (!canvasManager) return

  pendingRangeSelectionImage.value = imgData.img
  isInRangeSelectionMode.value = true
  canvasManager.startImageSelectionMode(
    (bounds) => handleRangeSelectionComplete(bounds),
    selectedAnimation.value,
  )
  console.log('📐 Bereichsauswahl-Modus gestartet für hochgeladenes Bild:', imgData.name)
}

function handleRangeSelectionComplete(bounds) {
  if (!bounds || !pendingRangeSelectionImage.value) {
    isInRangeSelectionMode.value = false
    pendingRangeSelectionImage.value = null
    return
  }

  const multiImageManager = multiImageManagerRef?.value
  const canvasManager = canvasManagerRef?.value
  if (!multiImageManager || !canvasManager) {
    isInRangeSelectionMode.value = false
    return
  }

  const canvas = canvasManager.canvas
  const scale = imageScale.value
  const offsetX = imageOffsetX.value / canvas.width
  const offsetY = imageOffsetY.value / canvas.height

  const scaledBounds = {
    ...bounds,
    relWidth: bounds.relWidth * scale,
    relHeight: bounds.relHeight * scale,
    relX: bounds.relX + (bounds.relWidth * (1 - scale)) / 2 + offsetX,
    relY: bounds.relY + (bounds.relHeight * (1 - scale)) / 2 + offsetY,
  }

  multiImageManager.addImageWithBounds(
    pendingRangeSelectionImage.value,
    scaledBounds,
    bounds.animation || selectedAnimation.value,
    { duration: animationDuration.value },
  )

  deselectAllImages()

  isInRangeSelectionMode.value = false
  pendingRangeSelectionImage.value = null
}

function addUploadedImageDirectly() {
  if (selectedImageCount.value !== 1) return
  const imgData = selectedImages.value[0]
  if (!imgData || !imgData.img) return
  const multiImageManager = multiImageManagerRef?.value
  const canvasManager = canvasManagerRef?.value
  if (!multiImageManager || !canvasManager) return

  const canvas = canvasManager.canvas
  const relX = 0.5 + imageOffsetX.value / canvas.width
  const relY = 0.5 + imageOffsetY.value / canvas.height
  const baseSize = 0.15
  const relSize = baseSize * imageScale.value

  const bounds = {
    relX: relX - relSize / 2,
    relY: relY - relSize / 2,
    relWidth: relSize,
    relHeight: relSize,
  }

  multiImageManager.addImageWithBounds(imgData.img, bounds, selectedAnimation.value, {
    duration: animationDuration.value,
  })
  console.log('✅ Bild platziert')
  deselectAllImages()
}

// ═══════════════════════════════════════════════════════════════════
// BILD-VORSCHAU
// ═══════════════════════════════════════════════════════════════════

function openUploadedPreview(imgData) {
  previewImage.value = {
    src: imgData.img.src,
    name: imgData.name,
    type: 'uploaded',
    data: imgData,
  }
}

function closePreview() {
  previewImage.value = null
}

function addPreviewToCanvas() {
  if (!previewImage.value) return
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager) return

  multiImageManager.addImage(previewImage.value.data.img)
  closePreview()
}

function setPreviewAsBackground() {
  if (!previewImage.value) return
  const canvasManager = canvasManagerRef?.value
  if (!canvasManager) return

  canvasManager.setBackground(previewImage.value.data.img)
  closePreview()
}

// ═══════════════════════════════════════════════════════════════════
// INITIALISIERUNG
// ═══════════════════════════════════════════════════════════════════

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
      loadImageSettings: (imgData) => {
        if (imageFiltersPanelRef.value) {
          imageFiltersPanelRef.value.loadImageSettings(imgData?.fotoSettings || {})
        }
      },
      currentActiveImage: currentActiveImage,
    }

    console.log('✅ FotoPanel initialisiert')
  }

  initializePanel()

  // Slideshow Manager initialisieren
  setTimeout(() => {
    initSlideshowManager()
  }, 1000)
})

// Watcher für aktives Bild
watch(
  currentActiveImage,
  (newImage) => {
    if (newImage) {
      // Filter-Einstellungen laden
      if (imageFiltersPanelRef.value) {
        imageFiltersPanelRef.value.loadImageSettings(newImage.fotoSettings || {})
      }
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
