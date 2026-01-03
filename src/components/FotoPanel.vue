<template>
  <div class="foto-panel-wrapper">
    <!-- Bild-Vorschau Overlay -->
    <ImagePreviewOverlay
      :previewImage="previewImage"
      @close="closePreview"
      @add-to-canvas="addPreviewToCanvas"
      @set-as-background="setPreviewAsBackground"
    />

    <!-- Farbeinstellungen für Bildabschnitte -->
    <ColorSettings />

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

    <!-- Audio-Reaktiv Sektion -->
    <AudioReactivePanel
      ref="audioReactivePanelRef"
      :hasActiveImage="!!currentActiveImage"
      :hasSavedSettings="hasSavedAudioSettings"
      :activeAudioPreset="activeAudioPreset"
      @audio-reactive-toggle="onAudioReactiveToggle"
      @source-change="onAudioReactiveSourceChange"
      @smoothing-change="onAudioReactiveSmoothingChange"
      @easing-change="onAudioReactiveEasingChange"
      @beat-boost-change="onAudioReactiveBeatBoostChange"
      @phase-change="onAudioReactivePhaseChange"
      @toggle-preset="toggleAudioPreset"
      @effect-toggle="onEffectToggle"
      @effect-intensity-change="onEffectIntensityChange"
      @effect-source-change="onEffectSourceChange"
      @save-settings="saveAudioReactiveSettings"
      @apply-settings="applyAudioReactiveSettings"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { useToastStore } from '../stores/toastStore';

// Sub-Komponenten
import ImagePreviewOverlay from './foto-panel/ImagePreviewOverlay.vue';
import ColorSettings from './foto-panel/ColorSettings.vue';
import StockGallerySection from './foto-panel/StockGallerySection.vue';
import ImageUploadSection from './foto-panel/ImageUploadSection.vue';
import ImageFiltersPanel from './foto-panel/ImageFiltersPanel.vue';
import AudioReactivePanel from './foto-panel/AudioReactivePanel.vue';

// Composables
import { useStockGallery } from '../composables/useStockGallery.js';
import { useImageGallery } from '../composables/useImageGallery.js';

const { t, locale } = useI18n();
const toastStore = useToastStore();

// Injected Refs von App.vue
const fotoManagerRef = inject('fotoManagerRef', ref(null));
const multiImageManagerRef = inject('multiImageManagerRef', ref(null));
const canvasManagerRef = inject('canvasManagerRef', ref(null));

// Panel-Refs
const imageFiltersPanelRef = ref(null);
const audioReactivePanelRef = ref(null);

// Aktuell aktives Bild (für Filter-UI)
const currentActiveImage = ref(null);

// Presets
const presets = ref([]);

// Platzierungs-Einstellungen
const selectedAnimation = ref('none');
const animationDuration = ref(1000);
const imageScale = ref(1);
const imageOffsetX = ref(0);
const imageOffsetY = ref(0);

// Bereichsauswahl-Modus
const isInRangeSelectionMode = ref(false);
const pendingRangeSelectionImage = ref(null);
const pendingRangeSelectionType = ref(null);

// Bild-Vorschau
const previewImage = ref(null);

// Stock-Galerie Composable
const {
  stockCategories,
  stockImages,
  selectedStockCategory,
  selectedStockImage,
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
  loadStockImageObject
} = useStockGallery();

// Image-Galerie Composable
const {
  imageGallery,
  selectedImageIndex,
  selectedImageIndices,
  selectedImage,
  selectedImages,
  selectedImageCount,
  handleImageUpload: handleImageUploadComposable,
  selectImage,
  selectAllImages,
  deselectAllImages,
  deleteImage,
  clearAllImages: clearAllImagesComposable
} = useImageGallery();

// Audio-Reaktiv State
const activeAudioPreset = ref(null);
const savedAudioReactiveSettings = ref(null);
const hasSavedAudioSettings = computed(() => savedAudioReactiveSettings.value !== null);

// ═══════════════════════════════════════════════════════════════════
// EBENEN-STEUERUNG (Z-Index)
// ═══════════════════════════════════════════════════════════════════

const canMoveUp = computed(() => {
  if (!currentActiveImage.value) return false;
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) return false;
  const index = multiImageManager.getImageIndex(currentActiveImage.value);
  const count = multiImageManager.getImageCount();
  return index !== -1 && index < count - 1;
});

const canMoveDown = computed(() => {
  if (!currentActiveImage.value) return false;
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) return false;
  const index = multiImageManager.getImageIndex(currentActiveImage.value);
  return index > 0;
});

const currentLayerInfo = computed(() => {
  if (!currentActiveImage.value) return '';
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) return '';
  const index = multiImageManager.getImageIndex(currentActiveImage.value);
  const count = multiImageManager.getImageCount();
  if (index === -1 || count === 0) return '';
  return `${index + 1} / ${count}`;
});

function onBringToFront() {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager || !currentActiveImage.value) return;
  multiImageManager.bringToFront(currentActiveImage.value);
}

function onSendToBack() {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager || !currentActiveImage.value) return;
  multiImageManager.sendToBack(currentActiveImage.value);
}

function onMoveUp() {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager || !currentActiveImage.value) return;
  multiImageManager.moveUp(currentActiveImage.value);
}

function onMoveDown() {
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager || !currentActiveImage.value) return;
  multiImageManager.moveDown(currentActiveImage.value);
}

// ═══════════════════════════════════════════════════════════════════
// FILTER-HANDLER
// ═══════════════════════════════════════════════════════════════════

function onPresetChange(presetId) {
  if (!currentActiveImage.value) return;
  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;

  if (presetId === '') {
    fotoManager.applyPreset(currentActiveImage.value, 'normal');
  } else {
    fotoManager.applyPreset(currentActiveImage.value, presetId);
  }
  console.log('🎨 Preset angewendet:', presetId || 'normal');
}

function onFilterChange({ property, value }) {
  if (!currentActiveImage.value) return;

  if (!currentActiveImage.value.fotoSettings) {
    currentActiveImage.value.fotoSettings = {};
  }

  currentActiveImage.value.fotoSettings[property] = value;
  console.log(`✏️ Filter aktualisiert: ${property} = ${value}`);
}

function resetFilters() {
  if (!currentActiveImage.value) return;

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
    borderOpacity: 100
  };

  currentActiveImage.value.fotoSettings = { ...defaultSettings };
  console.log('🔄 Filter zurückgesetzt');
}

// ═══════════════════════════════════════════════════════════════════
// AUDIO-REAKTIV FUNKTIONEN
// ═══════════════════════════════════════════════════════════════════

function onAudioReactiveToggle(event) {
  const enabled = event.target.checked;
  updateAudioReactiveSetting('enabled', enabled);
  if (!enabled) activeAudioPreset.value = null;
}

function onAudioReactiveSourceChange(event) {
  updateAudioReactiveSetting('source', event.target.value);
}

function onAudioReactiveSmoothingChange(event) {
  updateAudioReactiveSetting('smoothing', parseInt(event.target.value));
}

function onAudioReactiveEasingChange(event) {
  updateAudioReactiveSetting('easing', event.target.value);
}

function onAudioReactiveBeatBoostChange(event) {
  updateAudioReactiveSetting('beatBoost', parseFloat(event.target.value));
}

function onAudioReactivePhaseChange(event) {
  updateAudioReactiveSetting('phase', parseInt(event.target.value));
}

function updateAudioReactiveSetting(property, value) {
  if (!currentActiveImage.value) return;
  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;
  fotoManager.initializeImageSettings(currentActiveImage.value);
  currentActiveImage.value.fotoSettings.audioReactive[property] = value;
}

function toggleAudioPreset(presetName) {
  if (activeAudioPreset.value === presetName) {
    deactivateAudioPreset();
  } else {
    applyAudioPreset(presetName);
  }
}

function deactivateAudioPreset() {
  if (!currentActiveImage.value) return;
  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;
  fotoManager.initializeImageSettings(currentActiveImage.value);
  const ar = currentActiveImage.value.fotoSettings.audioReactive;
  for (const effectName of Object.keys(ar.effects)) {
    ar.effects[effectName].enabled = false;
  }
  ar.enabled = false;
  activeAudioPreset.value = null;
}

function applyAudioPreset(presetName) {
  if (!currentActiveImage.value) return;
  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;
  fotoManager.initializeImageSettings(currentActiveImage.value);
  const ar = currentActiveImage.value.fotoSettings.audioReactive;

  const presets = {
    pulse: { effects: { scale: { enabled: true, intensity: 70 }, glow: { enabled: true, intensity: 80 } }, source: 'bass', easing: 'easeOut', beatBoost: 1.5, smoothing: 60 },
    dance: { effects: { bounce: { enabled: true, intensity: 60 }, swing: { enabled: true, intensity: 50 }, rotation: { enabled: true, intensity: 30 } }, source: 'mid', easing: 'bounce', beatBoost: 1.3, smoothing: 40 },
    shake: { effects: { shake: { enabled: true, intensity: 80 }, scale: { enabled: true, intensity: 40 } }, source: 'bass', easing: 'punch', beatBoost: 2.0, smoothing: 20 },
    glow: { effects: { glow: { enabled: true, intensity: 90 }, brightness: { enabled: true, intensity: 50 }, hue: { enabled: true, intensity: 30 } }, source: 'volume', easing: 'easeInOut', beatBoost: 1.0, smoothing: 70 },
    strobe: { effects: { strobe: { enabled: true, intensity: 85 }, invert: { enabled: true, intensity: 60 } }, source: 'bass', easing: 'linear', beatBoost: 2.5, smoothing: 10 },
    glitch: { effects: { chromatic: { enabled: true, intensity: 75 }, skew: { enabled: true, intensity: 50 }, shake: { enabled: true, intensity: 40 } }, source: 'bass', easing: 'elastic', beatBoost: 2.0, smoothing: 25 }
  };

  for (const effectName of Object.keys(ar.effects)) {
    ar.effects[effectName].enabled = false;
  }

  const preset = presets[presetName];
  if (!preset) return;

  ar.enabled = true;
  ar.source = preset.source;
  ar.easing = preset.easing;
  ar.beatBoost = preset.beatBoost;
  ar.smoothing = preset.smoothing;

  for (const [effectName, config] of Object.entries(preset.effects)) {
    if (ar.effects[effectName]) {
      ar.effects[effectName].enabled = config.enabled;
      ar.effects[effectName].intensity = config.intensity;
    }
  }

  activeAudioPreset.value = presetName;
}

function onEffectToggle(effectName, enabled) {
  if (!currentActiveImage.value) return;
  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;
  fotoManager.initializeImageSettings(currentActiveImage.value);
  const ar = currentActiveImage.value.fotoSettings.audioReactive;
  if (ar.effects && ar.effects[effectName]) {
    ar.effects[effectName].enabled = enabled;
  }
}

function onEffectIntensityChange(effectName, value) {
  if (!currentActiveImage.value) return;
  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;
  fotoManager.initializeImageSettings(currentActiveImage.value);
  const ar = currentActiveImage.value.fotoSettings.audioReactive;
  if (ar.effects && ar.effects[effectName]) {
    ar.effects[effectName].intensity = parseInt(value);
  }
}

function onEffectSourceChange(effectName, value) {
  if (!currentActiveImage.value) return;
  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;
  fotoManager.initializeImageSettings(currentActiveImage.value);
  const ar = currentActiveImage.value.fotoSettings.audioReactive;
  if (ar.effects && ar.effects[effectName]) {
    ar.effects[effectName].source = value === '' ? null : value;
  }
}

function saveAudioReactiveSettings() {
  if (!currentActiveImage.value) return;
  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;
  fotoManager.initializeImageSettings(currentActiveImage.value);
  const ar = currentActiveImage.value.fotoSettings.audioReactive;
  savedAudioReactiveSettings.value = JSON.parse(JSON.stringify(ar));
  try {
    localStorage.setItem('visualizer_audioReactivePreset', JSON.stringify(ar));
    console.log('💾 Audio-Reaktiv Einstellungen gespeichert');
  } catch (e) {
    console.warn('⚠️ Konnte nicht in localStorage speichern:', e);
  }
}

function applyAudioReactiveSettings() {
  if (!currentActiveImage.value || !savedAudioReactiveSettings.value) return;
  const fotoManager = fotoManagerRef?.value;
  if (!fotoManager) return;
  fotoManager.initializeImageSettings(currentActiveImage.value);
  currentActiveImage.value.fotoSettings.audioReactive = JSON.parse(JSON.stringify(savedAudioReactiveSettings.value));
  console.log('📋 Audio-Reaktiv Einstellungen angewendet');
}

// ═══════════════════════════════════════════════════════════════════
// CANVAS-OPERATIONEN
// ═══════════════════════════════════════════════════════════════════

function handleImageUpload(event) {
  handleImageUploadComposable(event,
    () => toastStore.success(t('toast.imageLoadSuccess')),
    (name) => toastStore.error(`${t('toast.imageLoadError')}: ${name}`)
  );
}

function clearAllImages() {
  if (!confirm(`Alle ${imageGallery.value.length} Bilder aus der Galerie löschen?`)) return;
  clearAllImagesComposable();
}

function addImageToCanvas() {
  const imagesToAdd = selectedImages.value;
  if (imagesToAdd.length === 0) return;
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) return;

  imagesToAdd.forEach((imgData) => {
    multiImageManager.addImage(imgData.img);
  });

  console.log(`✅ ${imagesToAdd.length} Bild(er) auf Canvas platziert`);
  toastStore.success(t('toast.imagesAddedToCanvas').replace('{count}', imagesToAdd.length));
  deselectAllImages();
}

function setAsBackground() {
  if (selectedImageCount.value !== 1) return;
  const imgToSet = selectedImages.value[0];
  if (!imgToSet) return;
  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) return;
  canvasManager.setBackground(imgToSet.img);
  console.log('✅ Bild als Hintergrund gesetzt:', imgToSet.name);
  deselectAllImages();
}

function setAsWorkspaceBackground() {
  if (selectedImageCount.value !== 1) return;
  const imgToSet = selectedImages.value[0];
  if (!imgToSet) return;
  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) return;
  const success = canvasManager.setWorkspaceBackground(imgToSet.img);
  if (success) {
    console.log('✅ Bild als Workspace-Hintergrund gesetzt:', imgToSet.name);
    deselectAllImages();
  } else {
    toastStore.warning(t('toast.selectWorkspaceFirst'));
  }
}

// Stock-Image Canvas-Operationen
async function addStockImageToCanvas() {
  const imagesToAdd = selectedStockImagesList.value;
  if (imagesToAdd.length === 0) return;
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) return;

  try {
    for (const stockImg of imagesToAdd) {
      const img = await loadStockImageObject(stockImg);
      multiImageManager.addImage(img);
    }
    console.log(`✅ ${imagesToAdd.length} Stock-Bild(er) auf Canvas platziert`);
    toastStore.success(t('toast.imagesAddedToCanvas').replace('{count}', imagesToAdd.length));
    deselectAllStockImages();
  } catch (error) {
    console.error('❌ Fehler beim Laden der Stock-Bilder:', error);
    toastStore.error(t('toast.imagesLoadError'));
  }
}

async function setStockAsBackground() {
  if (selectedStockCount.value !== 1) return;
  const stockImg = selectedStockImagesList.value[0];
  if (!stockImg) return;
  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) return;

  try {
    const img = await loadStockImageObject(stockImg);
    canvasManager.setBackground(img);
    console.log('✅ Stock-Bild als Hintergrund gesetzt:', stockImg.name);
    deselectAllStockImages();
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error);
    toastStore.error(t('toast.imageLoadError'));
  }
}

async function setStockAsWorkspaceBackground() {
  if (selectedStockCount.value !== 1) return;
  const stockImg = selectedStockImagesList.value[0];
  if (!stockImg) return;
  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) return;

  try {
    const img = await loadStockImageObject(stockImg);
    const success = canvasManager.setWorkspaceBackground(img);
    if (success) {
      console.log('✅ Stock-Bild als Workspace-Hintergrund gesetzt:', stockImg.name);
      deselectAllStockImages();
    } else {
      toastStore.warning(t('toast.selectWorkspaceFirst'));
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error);
    toastStore.error(t('toast.imageLoadError'));
  }
}

// ═══════════════════════════════════════════════════════════════════
// BEREICHSAUSWAHL MIT ANIMATION
// ═══════════════════════════════════════════════════════════════════

function updatePlacementSettings(settings) {
  selectedAnimation.value = settings.selectedAnimation;
  animationDuration.value = settings.animationDuration;
  imageScale.value = settings.imageScale;
  imageOffsetX.value = settings.imageOffsetX;
  imageOffsetY.value = settings.imageOffsetY;
}

async function startStockImageRangeSelection() {
  if (selectedStockCount.value !== 1) return;
  const stockImg = selectedStockImagesList.value[0];
  if (!stockImg) return;
  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) return;

  try {
    const img = await loadStockImageObject(stockImg);
    pendingRangeSelectionImage.value = img;
    pendingRangeSelectionType.value = 'stock';
    isInRangeSelectionMode.value = true;
    canvasManager.startImageSelectionMode((bounds) => handleRangeSelectionComplete(bounds), selectedAnimation.value);
    console.log('📐 Bereichsauswahl-Modus gestartet für Stock-Bild:', stockImg.name);
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error);
    toastStore.error(t('toast.imageLoadError'));
    isInRangeSelectionMode.value = false;
  }
}

function startUploadedImageRangeSelection() {
  if (selectedImageCount.value !== 1) return;
  const imgData = selectedImages.value[0];
  if (!imgData || !imgData.img) return;
  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) return;

  pendingRangeSelectionImage.value = imgData.img;
  pendingRangeSelectionType.value = 'uploaded';
  isInRangeSelectionMode.value = true;
  canvasManager.startImageSelectionMode((bounds) => handleRangeSelectionComplete(bounds), selectedAnimation.value);
  console.log('📐 Bereichsauswahl-Modus gestartet für hochgeladenes Bild:', imgData.name);
}

function handleRangeSelectionComplete(bounds) {
  if (!bounds || !pendingRangeSelectionImage.value) {
    isInRangeSelectionMode.value = false;
    pendingRangeSelectionImage.value = null;
    pendingRangeSelectionType.value = null;
    return;
  }

  const multiImageManager = multiImageManagerRef?.value;
  const canvasManager = canvasManagerRef?.value;
  if (!multiImageManager || !canvasManager) {
    isInRangeSelectionMode.value = false;
    return;
  }

  const canvas = canvasManager.canvas;
  const scale = imageScale.value;
  const offsetX = imageOffsetX.value / canvas.width;
  const offsetY = imageOffsetY.value / canvas.height;

  const scaledBounds = {
    ...bounds,
    relWidth: bounds.relWidth * scale,
    relHeight: bounds.relHeight * scale,
    relX: bounds.relX + (bounds.relWidth * (1 - scale)) / 2 + offsetX,
    relY: bounds.relY + (bounds.relHeight * (1 - scale)) / 2 + offsetY
  };

  multiImageManager.addImageWithBounds(
    pendingRangeSelectionImage.value,
    scaledBounds,
    bounds.animation || selectedAnimation.value,
    { duration: animationDuration.value }
  );

  if (pendingRangeSelectionType.value === 'stock') {
    deselectAllStockImages();
  } else {
    deselectAllImages();
  }

  isInRangeSelectionMode.value = false;
  pendingRangeSelectionImage.value = null;
  pendingRangeSelectionType.value = null;
}

async function addStockImageDirectly() {
  if (selectedStockCount.value !== 1) return;
  const stockImg = selectedStockImagesList.value[0];
  if (!stockImg) return;
  const multiImageManager = multiImageManagerRef?.value;
  const canvasManager = canvasManagerRef?.value;
  if (!multiImageManager || !canvasManager) return;

  try {
    const img = await loadStockImageObject(stockImg);
    const canvas = canvasManager.canvas;
    const relX = 0.5 + (imageOffsetX.value / canvas.width);
    const relY = 0.5 + (imageOffsetY.value / canvas.height);
    const baseSize = 0.15;
    const relSize = baseSize * imageScale.value;

    const bounds = {
      relX: relX - relSize / 2,
      relY: relY - relSize / 2,
      relWidth: relSize,
      relHeight: relSize
    };

    multiImageManager.addImageWithBounds(img, bounds, selectedAnimation.value, { duration: animationDuration.value });
    console.log('✅ Stock-Bild platziert');
    deselectAllStockImages();
  } catch (error) {
    console.error('❌ Fehler beim Laden des Stock-Bildes:', error);
  }
}

function addUploadedImageDirectly() {
  if (selectedImageCount.value !== 1) return;
  const imgData = selectedImages.value[0];
  if (!imgData || !imgData.img) return;
  const multiImageManager = multiImageManagerRef?.value;
  const canvasManager = canvasManagerRef?.value;
  if (!multiImageManager || !canvasManager) return;

  const canvas = canvasManager.canvas;
  const relX = 0.5 + (imageOffsetX.value / canvas.width);
  const relY = 0.5 + (imageOffsetY.value / canvas.height);
  const baseSize = 0.15;
  const relSize = baseSize * imageScale.value;

  const bounds = {
    relX: relX - relSize / 2,
    relY: relY - relSize / 2,
    relWidth: relSize,
    relHeight: relSize
  };

  multiImageManager.addImageWithBounds(imgData.img, bounds, selectedAnimation.value, { duration: animationDuration.value });
  console.log('✅ Bild platziert');
  deselectAllImages();
}

// ═══════════════════════════════════════════════════════════════════
// BILD-VORSCHAU
// ═══════════════════════════════════════════════════════════════════

async function openStockPreview(img) {
  try {
    const loadedImg = await loadStockImageObject(img);
    previewImage.value = {
      src: loadedImg.src,
      name: img.name,
      type: 'stock',
      data: img
    };
  } catch (error) {
    console.error('❌ Fehler beim Laden der Vorschau:', error);
  }
}

function openUploadedPreview(imgData) {
  previewImage.value = {
    src: imgData.img.src,
    name: imgData.name,
    type: 'uploaded',
    data: imgData
  };
}

function closePreview() {
  previewImage.value = null;
}

async function addPreviewToCanvas() {
  if (!previewImage.value) return;
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) return;

  if (previewImage.value.type === 'stock') {
    const img = await loadStockImageObject(previewImage.value.data);
    multiImageManager.addImage(img);
  } else {
    multiImageManager.addImage(previewImage.value.data.img);
  }
  closePreview();
}

async function setPreviewAsBackground() {
  if (!previewImage.value) return;
  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) return;

  if (previewImage.value.type === 'stock') {
    const img = await loadStockImageObject(previewImage.value.data);
    canvasManager.setBackground(img);
  } else {
    canvasManager.setBackground(previewImage.value.data.img);
  }
  closePreview();
}

// ═══════════════════════════════════════════════════════════════════
// INITIALISIERUNG
// ═══════════════════════════════════════════════════════════════════

onMounted(() => {
  loadStockGallery();

  const initializePanel = () => {
    const fotoManager = fotoManagerRef?.value;
    if (!fotoManager) {
      setTimeout(initializePanel, 100);
      return;
    }

    presets.value = fotoManager.getAvailablePresets();

    // Controls global verfügbar machen
    window.fotoPanelControls = {
      loadImageSettings: (imgData) => {
        if (imageFiltersPanelRef.value) {
          imageFiltersPanelRef.value.loadImageSettings(imgData?.fotoSettings || {});
        }
      },
      currentActiveImage: currentActiveImage
    };

    // Gespeicherte Audio-Reaktiv Einstellungen laden
    try {
      const savedPreset = localStorage.getItem('visualizer_audioReactivePreset');
      if (savedPreset) {
        savedAudioReactiveSettings.value = JSON.parse(savedPreset);
      }
    } catch (e) {
      console.warn('⚠️ Konnte Audio-Reaktiv Preset nicht laden:', e);
    }

    console.log('✅ FotoPanel initialisiert');
  };

  initializePanel();
});

// Watcher für aktives Bild
watch(currentActiveImage, (newImage) => {
  if (newImage && imageFiltersPanelRef.value) {
    imageFiltersPanelRef.value.loadImageSettings(newImage.fotoSettings || {});
  }
}, { immediate: true });
</script>

<style scoped>
.foto-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
