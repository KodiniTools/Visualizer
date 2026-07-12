<template>
  <div class="gallery-panel-wrapper">
    <!-- Bild-Vorschau Overlay -->
    <ImagePreviewOverlay
      :previewImage="previewImage"
      @close="closePreview"
      @add-to-canvas="addPreviewToCanvas"
      @set-as-background="setPreviewAsBackground"
    />

    <!-- Stock-Galerie Sektion -->
    <StockGallerySection
      :stockCategories="stockCategories"
      :filteredStockImages="filteredStockImages"
      :selectedStockCategory="selectedStockCategory"
      :selectedStockImages="selectedStockImages"
      :selectedStockCount="selectedStockCount"
      :stockImagesLoading="stockImagesLoading"
      :categoryLoading="categoryLoading"
      :selectedAnimation="selectedAnimation"
      :animationDuration="animationDuration"
      :imageScale="imageScale"
      :imageOffsetX="imageOffsetX"
      :imageOffsetY="imageOffsetY"
      :isInRangeSelectionMode="isInRangeSelectionMode"
      @select-category="selectStockCategory"
      @select-image="selectStockImage"
      @open-preview="openStockPreview"
      @select-all="selectAllStockImages"
      @deselect-all="deselectAllStockImages"
      @add-to-canvas="addStockImageToCanvas"
      @set-as-background="setStockAsBackground"
      @set-as-workspace-background="setStockAsWorkspaceBackground"
      @start-range-selection="startStockImageRangeSelection"
      @add-directly="addStockImageDirectly"
      @retry-load="loadStockGallery"
      @update:placement-settings="updatePlacementSettings"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useToastStore } from '../stores/toastStore'
import ImagePreviewOverlay from './foto-panel/ImagePreviewOverlay.vue'
import StockGallerySection from './foto-panel/StockGallerySection.vue'
import { useStockGallery } from '../composables/useStockGallery.js'

const { t } = useI18n()
const toastStore = useToastStore()

// Injected Refs von App.vue
const multiImageManagerRef = inject('multiImageManager')
const canvasManagerRef = inject('canvasManager')

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

// Stock-Galerie Composable
const {
  stockCategories,
  selectedStockCategory,
  selectedStockImages,
  stockImagesLoading,
  categoryLoading,
  filteredStockImages,
  selectedStockImagesList,
  selectedStockCount,
  loadStockGallery,
  selectStockCategory,
  selectStockImage,
  selectAllStockImages,
  deselectAllStockImages,
  loadStockImageObject,
} = useStockGallery()

// ═══════════════════════════════════════════════════════════════════
// STOCK-IMAGE CANVAS-OPERATIONEN
// ═══════════════════════════════════════════════════════════════════

async function addStockImageToCanvas() {
  const imagesToAdd = selectedStockImagesList.value
  if (imagesToAdd.length === 0) return
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager) return

  try {
    for (const stockImg of imagesToAdd) {
      const img = await loadStockImageObject(stockImg)
      multiImageManager.addImage(img)
    }
    console.log(`✅ ${imagesToAdd.length} Stock-Bild(er) auf Canvas platziert`)
    toastStore.success(t('toast.imagesAddedToCanvas').replace('{count}', imagesToAdd.length))
    deselectAllStockImages()
  } catch (error) {
    console.error('❌ Fehler beim Laden der Stock-Bilder:', error)
    toastStore.error(t('toast.imagesLoadError'))
  }
}

async function setStockAsBackground() {
  if (selectedStockCount.value !== 1) return
  const stockImg = selectedStockImagesList.value[0]
  if (!stockImg) return
  const canvasManager = canvasManagerRef?.value
  if (!canvasManager) return

  try {
    const img = await loadStockImageObject(stockImg)
    canvasManager.setBackground(img)
    console.log('✅ Stock-Bild als Hintergrund gesetzt:', stockImg.name)
    deselectAllStockImages()
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error)
    toastStore.error(t('toast.imageLoadError'))
  }
}

async function setStockAsWorkspaceBackground() {
  if (selectedStockCount.value !== 1) return
  const stockImg = selectedStockImagesList.value[0]
  if (!stockImg) return
  const canvasManager = canvasManagerRef?.value
  if (!canvasManager) return

  try {
    const img = await loadStockImageObject(stockImg)
    const success = canvasManager.setWorkspaceBackground(img)
    if (success) {
      console.log('✅ Stock-Bild als Workspace-Hintergrund gesetzt:', stockImg.name)
      deselectAllStockImages()
    } else {
      toastStore.warning(t('toast.selectWorkspaceFirst'))
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error)
    toastStore.error(t('toast.imageLoadError'))
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

async function startStockImageRangeSelection() {
  if (selectedStockCount.value !== 1) return
  const stockImg = selectedStockImagesList.value[0]
  if (!stockImg) return
  const canvasManager = canvasManagerRef?.value
  if (!canvasManager) return

  try {
    const img = await loadStockImageObject(stockImg)
    pendingRangeSelectionImage.value = img
    isInRangeSelectionMode.value = true
    canvasManager.startImageSelectionMode(
      (bounds) => handleRangeSelectionComplete(bounds),
      selectedAnimation.value,
    )
    console.log('📐 Bereichsauswahl-Modus gestartet für Stock-Bild:', stockImg.name)
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error)
    toastStore.error(t('toast.imageLoadError'))
    isInRangeSelectionMode.value = false
  }
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

  deselectAllStockImages()

  isInRangeSelectionMode.value = false
  pendingRangeSelectionImage.value = null
}

async function addStockImageDirectly() {
  if (selectedStockCount.value !== 1) return
  const stockImg = selectedStockImagesList.value[0]
  if (!stockImg) return
  const multiImageManager = multiImageManagerRef?.value
  const canvasManager = canvasManagerRef?.value
  if (!multiImageManager || !canvasManager) return

  try {
    const img = await loadStockImageObject(stockImg)
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

    multiImageManager.addImageWithBounds(img, bounds, selectedAnimation.value, {
      duration: animationDuration.value,
    })
    console.log('✅ Stock-Bild platziert')
    deselectAllStockImages()
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error)
  }
}

// ═══════════════════════════════════════════════════════════════════
// BILD-VORSCHAU
// ═══════════════════════════════════════════════════════════════════

async function openStockPreview(img) {
  try {
    const loadedImg = await loadStockImageObject(img)
    previewImage.value = {
      src: loadedImg.src,
      name: img.name,
      type: 'stock',
      data: img,
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden der Vorschau:', error)
  }
}

function closePreview() {
  previewImage.value = null
}

async function addPreviewToCanvas() {
  if (!previewImage.value) return
  const multiImageManager = multiImageManagerRef?.value
  if (!multiImageManager) return

  const img = await loadStockImageObject(previewImage.value.data)
  multiImageManager.addImage(img)
  closePreview()
}

async function setPreviewAsBackground() {
  if (!previewImage.value) return
  const canvasManager = canvasManagerRef?.value
  if (!canvasManager) return

  const img = await loadStockImageObject(previewImage.value.data)
  canvasManager.setBackground(img)
  closePreview()
}

// ═══════════════════════════════════════════════════════════════════
// INITIALISIERUNG
// ═══════════════════════════════════════════════════════════════════

onMounted(() => {
  loadStockGallery()
})
</script>

<style scoped>
.gallery-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
