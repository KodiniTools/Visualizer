<template>
  <div id="app-container">

    <!-- Mobile Panel Toggle Bar -->
    <div class="mobile-panel-bar">
      <button
        class="mobile-panel-btn"
        :class="{ active: mobilePanel === 'left' }"
        @click="mobilePanel = mobilePanel === 'left' ? 'canvas' : 'left'"
      >
        <span class="mobile-panel-icon">🎨</span>
        <span class="mobile-panel-label">Foto</span>
      </button>
      <button
        class="mobile-panel-btn"
        :class="{ active: mobilePanel === 'canvas' }"
        @click="mobilePanel = 'canvas'"
      >
        <span class="mobile-panel-icon">🖼️</span>
        <span class="mobile-panel-label">Canvas</span>
      </button>
      <button
        class="mobile-panel-btn"
        :class="{ active: mobilePanel === 'right' }"
        @click="mobilePanel = mobilePanel === 'right' ? 'canvas' : 'right'"
      >
        <span class="mobile-panel-icon">⚙️</span>
        <span class="mobile-panel-label">Controls</span>
      </button>
    </div>

    <div class="layout-grid">

      <aside class="left-toolbar" :class="{ 'mobile-visible': mobilePanel === 'left' }">
        <TextManagerPanel />
        <FotoPanel />
        <VideoPanel />
      </aside>

      <main class="center-column" :class="{ 'mobile-visible': mobilePanel === 'canvas' }">
        <!-- Canvas-Bilder Leiste (horizontal scrollbar) -->
        <div v-if="canvasImages.length > 0" class="canvas-images-bar">
          <span class="canvas-images-label">{{ t('app.imagesOnCanvas') }}:</span>
          <div class="canvas-images-scroll">
            <div
              v-for="(imgData, index) in canvasImages"
              :key="imgData.id"
              class="canvas-thumb"
              :class="{
                'selected': selectedCanvasImageId === imgData.id,
                'dragging': draggedImageIndex === index,
                'drag-over': dragOverIndex === index && draggedImageIndex !== index
              }"
              draggable="true"
              @click="selectCanvasImage(imgData)"
              @dblclick="openImagePreview(imgData, index)"
              @dragstart="handleDragStart($event, index)"
              @dragend="handleDragEnd"
              @dragover.prevent="handleDragOver($event, index)"
              @dragleave="handleDragLeave"
              @drop.prevent="handleDrop($event, index)"
              :title="`${t('common.layer')} ${index + 1} - ${t('app.dragToReorder')}`"
            >
              <img :src="imgData.imageObject.src" alt="Canvas Bild" draggable="false">
              <span class="canvas-thumb-layer">{{ index + 1 }}</span>
              <button
                class="canvas-thumb-delete"
                @click.stop="deleteCanvasImage(imgData.id)"
                :title="t('app.deleteImage')"
              >×</button>
            </div>
          </div>
          <button
            class="canvas-images-clear-all"
            @click="deleteAllCanvasImages"
            :title="t('app.confirmDeleteAll')"
          >
            <span class="clear-all-icon">🗑</span>
            <span class="clear-all-text">{{ t('app.deleteAllImages') }}</span>
          </button>
        </div>

        <!-- Image Preview Modal -->
        <Teleport to="body">
          <div v-if="showImagePreview" class="image-preview-modal-overlay" @click="closeImagePreview">
            <div class="image-preview-modal" @click.stop>
              <button class="preview-modal-close" @click="closeImagePreview">×</button>
              <div class="preview-modal-content">
                <div class="preview-modal-image-container">
                  <img v-if="previewImageData" :src="previewImageData.imageObject.src" alt="Preview">
                </div>
                <div class="preview-modal-info">
                  <h3>{{ t('app.imageMetadata') }}</h3>
                  <div class="preview-info-grid" v-if="previewImageData">
                    <div class="preview-info-item">
                      <span class="preview-info-label">{{ t('app.layer') }}:</span>
                      <span class="preview-info-value">{{ previewImageIndex + 1 }} / {{ canvasImages.length }}</span>
                    </div>
                    <div class="preview-info-item">
                      <span class="preview-info-label">{{ t('app.dimensions') }}:</span>
                      <span class="preview-info-value">{{ previewImageData.imageObject.naturalWidth }} × {{ previewImageData.imageObject.naturalHeight }} px</span>
                    </div>
                    <div class="preview-info-item">
                      <span class="preview-info-label">{{ t('app.position') }}:</span>
                      <span class="preview-info-value">X: {{ Math.round(previewImageData.relX * 100) }}%, Y: {{ Math.round(previewImageData.relY * 100) }}%</span>
                    </div>
                    <div class="preview-info-item">
                      <span class="preview-info-label">{{ t('common.size') || 'Größe' }}:</span>
                      <span class="preview-info-value">{{ Math.round(previewImageData.relWidth * 100) }}% × {{ Math.round(previewImageData.relHeight * 100) }}%</span>
                    </div>
                  </div>
                  <!-- Ersetzen-Buttons -->
                  <div class="preview-modal-actions">
                    <span class="replace-with-label">{{ t('app.replaceWith') }}:</span>
                    <div class="replace-buttons-row">
                      <input
                        type="file"
                        accept="image/*"
                        @change="handleReplaceCanvasImage"
                        ref="replaceCanvasImageInput"
                        style="display: none"
                      />
                      <button class="btn-replace-canvas-image" @click="replaceCanvasImageInput?.click()">
                        📁 {{ t('app.uploadImage') }}
                      </button>
                      <button class="btn-replace-canvas-image btn-gallery" @click="openReplaceGallery">
                        🖼️ {{ t('app.fromGallery') }}
                      </button>
                    </div>
                  </div>

                  <!-- Vorschau für neues Bild -->
                  <div v-if="pendingReplaceImageSrc" class="pending-replace-preview">
                    <div class="pending-replace-header">
                      <span class="pending-replace-label">{{ t('app.newImagePreview') }}:</span>
                    </div>
                    <div class="pending-replace-image-container">
                      <img :src="pendingReplaceImageSrc" alt="Preview" class="pending-replace-image" />
                    </div>
                    <div class="pending-replace-actions">
                      <button class="btn-cancel-replace" @click="cancelPendingReplace">
                        ✕ {{ t('common.cancel') }}
                      </button>
                      <button class="btn-confirm-replace" @click="confirmPendingReplace">
                        ✓ {{ t('app.confirmReplace') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- Replace Gallery Modal -->
        <Teleport to="body">
          <div v-if="showReplaceGallery" class="replace-gallery-modal-overlay" @click="closeReplaceGallery">
            <div class="replace-gallery-modal" @click.stop>
              <div class="replace-gallery-header">
                <h3>🖼️ {{ t('app.selectFromGallery') }}</h3>
                <button class="replace-gallery-close" @click="closeReplaceGallery">×</button>
              </div>

              <!-- Kategorie-Tabs -->
              <div class="replace-gallery-categories">
                <button
                  v-for="category in replaceGalleryCategories"
                  :key="category.id"
                  class="replace-category-tab"
                  :class="{ active: selectedReplaceCategory === category.id }"
                  @click="selectReplaceGalleryCategory(category.id)"
                >
                  <span class="category-icon">{{ category.icon }}</span>
                  <span class="category-name">{{ category.name }}</span>
                </button>
              </div>

              <!-- Bilder-Grid -->
              <div class="replace-gallery-content">
                <div v-if="replaceGalleryLoading" class="replace-gallery-loading">
                  ⏳ {{ t('common.loading') }}
                </div>
                <div v-else-if="replaceGalleryImages.length === 0" class="replace-gallery-empty">
                  {{ t('common.noResults') }}
                </div>
                <div v-else class="replace-gallery-grid">
                  <div
                    v-for="image in replaceGalleryImages"
                    :key="image.file"
                    class="replace-gallery-item"
                    :class="{ selected: selectedReplaceImage === image }"
                    @click="selectReplaceGalleryImage(image)"
                  >
                    <img :src="image.thumb || image.file" :alt="image.name || 'Gallery image'" loading="lazy" />
                    <span v-if="image.name" class="replace-gallery-item-name">{{ image.name }}</span>
                  </div>
                </div>
              </div>

              <!-- Footer mit Buttons -->
              <div class="replace-gallery-footer">
                <button class="btn-cancel" @click="closeReplaceGallery">
                  {{ t('common.cancel') }}
                </button>
                <button
                  class="btn-confirm"
                  :disabled="!selectedReplaceImage"
                  @click="confirmReplaceFromGallery"
                >
                  ✓ {{ t('app.replaceImage') }}
                </button>
              </div>
            </div>
          </div>
        </Teleport>

        <div class="canvas-wrapper">
          <canvas ref="canvasRef"></canvas>
        </div>
      </main>

      <aside class="right-panel" :class="{ 'mobile-visible': mobilePanel === 'right' }">
        <!-- Shared Files Banner -->
        <div v-if="sharedBanner" class="shared-banner" :class="'shared-banner-' + sharedBanner.type">
          <span>{{ sharedBanner.message }}</span>
        </div>
        <FileUploadPanel />
        <PlayerPanel />
        <RecorderPanel />
        <ScreenshotPanel />
        <VisualizerPanel />
        <ControlsPanel />
        <CanvasControlPanel />
      </aside>

    </div>

    <audio ref="audioRef" crossOrigin="anonymous" style="display: none;"></audio>

    <!-- Help System -->
    <QuickStartGuide ref="quickStartGuideRef" />

    <!-- Toast Notifications -->
    <ToastContainer />

  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, provide, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from './lib/i18n.js';
import { getSharedFiles, clearSharedFiles } from './utils/sharedFileRepository.js';
import { usePlayerStore } from './stores/playerStore.js';
import { useRecorderStore } from './stores/recorderStore.js';
import { useTextStore } from './stores/textStore.js';
import { useVisualizerStore } from './stores/visualizerStore.js';
import { useGridStore } from './stores/gridStore.js';
import { useWorkspaceStore } from './stores/workspaceStore.js';
import { useBackgroundTilesStore } from './stores/backgroundTilesStore.js';
import { useAudioSourceStore } from './stores/audioSourceStore.js';
import FileUploadPanel from './components/FileUploadPanel.vue';
import PlayerPanel from './components/PlayerPanel.vue';
import RecorderPanel from './components/RecorderPanel.vue';
import ScreenshotPanel from './components/ScreenshotPanel.vue';
import FotoPanel from './components/FotoPanel.vue';
import VideoPanel from './components/VideoPanel.vue'; // ✨ NEU: Video-Panel
import TextManagerPanel from './components/TextManagerPanel.vue';
import ControlsPanel from './components/ControlsPanel.vue';
import VisualizerPanel from './components/VisualizerPanel.vue';
import CanvasControlPanel from './components/CanvasControlPanel.vue';
import QuickStartGuide from './components/QuickStartGuide.vue';
import ToastContainer from './components/ToastContainer.vue';
import { Visualizers } from './lib/visualizers/index.js';
import { TextManager } from './lib/textManager.js';
import { CUSTOM_FONTS } from './lib/fonts.js';
import { FontManager } from './lib/fontManager.js';
import { CanvasManager } from './lib/canvasManager.js';
import { FotoManager } from './lib/fotoManager.js';
import { GridManager } from './lib/gridManager.js';
import { MultiImageManager } from './lib/multiImageManager.js';
import { VideoManager } from './lib/videoManager.js'; // ✨ NEU: Video-Support
import { KeyboardShortcuts } from './lib/keyboardShortcuts.js';
import { workerManager } from './lib/workerManager.js';

// Worker-Status
let useAudioWorker = false;

// i18n
const { t, locale } = useI18n();

const playerStore = usePlayerStore();
const recorderStore = useRecorderStore();
const textStore = useTextStore();
const visualizerStore = useVisualizerStore();
const gridStore = useGridStore();
const workspaceStore = useWorkspaceStore();
const backgroundTilesStore = useBackgroundTilesStore();
const audioSourceStore = useAudioSourceStore();
const route = useRoute();
const router = useRouter();

// Shared files receiver state
const sharedBanner = ref(null);
let sharedFilesHandled = false;

const audioRef = ref(null);
const canvasRef = ref(null);
const mobilePanel = ref('canvas'); // 'left' | 'canvas' | 'right'

// Recording Canvas - wird für den Recorder verwendet
let recordingCanvas = document.createElement('canvas');
let recordingCanvasStream = null;

// Helper-Funktion um Monkey Patch auf Recording Canvas anzuwenden
function applyRecordingCanvasMonkeyPatch(canvas) {
  const originalCaptureStream = canvas.captureStream.bind(canvas);
  canvas.captureStream = function(frameRate) {
    console.log(`[App] captureStream() aufgerufen mit frameRate: ${frameRate}`);

    // Cleanup alter Stream falls vorhanden
    if (recordingCanvasStream) {
      recordingCanvasStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      });
      console.log('[App] Alter Canvas-Stream gestoppt');
    }

    // Rendere Canvas BEVOR Stream erstellt wird!
    const recordingCtx = canvas.getContext('2d');
    if (recordingCtx && canvasManagerInstance.value) {
      renderRecordingScene(
        recordingCtx,
        canvas.width,
        canvas.height,
        null // Kein Visualizer beim Warmup
      );
      console.log('[App] Recording Canvas pre-rendered für Stream');
    }

    // Use the frameRate requested by the recorder (0 = manual mode for requestFrame)
    recordingCanvasStream = originalCaptureStream(frameRate);
    console.log(`[App] Canvas-Stream mit ${frameRate} FPS erstellt (via Monkey Patch)`);

    return recordingCanvasStream;
  };
  console.log('[App] Monkey Patch auf Recording Canvas angewendet');
}

let audioContext, analyser, sourceNode, outputGain, recordingDest, recordingGain;
let bassFilter, trebleFilter; // EQ-Filter für Bass und Treble
let microphoneSourceNode = null; // Separate source node for microphone
let microphoneAudioContext = null; // Separate AudioContext for microphone
let microphoneAnalyser = null; // Separate Analyser for microphone

// ✨ NEU: Mic-Zuschalten während Recording
let micRecordingGain = null; // Gain node for mic → recordingDest
let micRecordingSourceNode = null; // MediaStreamSource for mic in main context
let micRecordingStream = null; // ✨ SEPARATE Mic stream für Recording
// ✨ NEU: Direkter Recording-Ansatz - alle Audio geht durch einen einzigen Pfad
let recordingMixer = null; // Zentraler Mixer-Knoten für alle Recording-Quellen

// ✨ NEU: Video-Audio für Recording
let videoRecordingGain = null; // Gain node for video → recordingMixer
const videoSourceNodes = new Map(); // Map von videoElement → { sourceNode, gainNode }

let animationFrameId;
let drawTimeoutId = null; // ✅ FIX: Fallback timer for recording when tab is hidden
let textManagerInstance = null;
const lastSelectedVisualizerId = ref(null);
let audioDataArray = null;
const lastCanvasWidth = ref(0);
const lastCanvasHeight = ref(0);
let visualizerCacheCanvas = null;
let visualizerCacheCtx = null;
let layerCacheCanvases = null; // Map<layerId, {canvas, ctx, lastVisualizerId}> für Multi-Layer-Modus
let multiLayerCompositeCanvas = null; // ✨ Performance: Vor-composited Multi-Layer Output
let multiLayerCompositeCtx = null;

// ✅ FIX: Reusable canvases for renderRecordingScene to avoid GC stuttering
let recordingTempCanvas = null;
let recordingTempCtx = null;
let recordingVizCanvas = null;
let recordingVizCtx = null;

const canvasManagerInstance = ref(null);
const fotoManagerInstance = ref(null);
const gridManagerInstance = ref(null);
const multiImageManagerInstance = ref(null);
const videoManagerInstance = ref(null); // ✨ NEU: VideoManager
const fontManagerInstance = ref(null);
const keyboardShortcutsInstance = ref(null);
const quickStartGuideRef = ref(null);

// ✅ FIX: Flag um zu tracken, ob die Canvas-Initialisierung bereits erfolgt ist
let canvasInitialized = false;

provide('fontManager', fontManagerInstance);
provide('canvasManager', canvasManagerInstance);
provide('fotoManager', fotoManagerInstance);
provide('multiImageManager', multiImageManagerInstance);
provide('videoManager', videoManagerInstance); // ✨ NEU: VideoManager

// AUDIO-ANALYSE FÜR AUDIO-REAKTIVE BILDER

// Globale Audio-Daten für audio-reaktive Elemente
window.audioAnalysisData = {
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  smoothBass: 0,
  smoothMid: 0,
  smoothTreble: 0,
  smoothVolume: 0
};

/**
 * Analysiert Audio-Daten und macht sie global verfügbar
 */
function updateGlobalAudioData(audioDataArray, bufferLength) {
  if (!audioDataArray || bufferLength === 0) return;

  if (useAudioWorker) {
    workerManager.analyzeAudio(audioDataArray, bufferLength);
    return;
  }

  updateGlobalAudioDataFallback(audioDataArray, bufferLength);
}

/**
 * Fallback Audio-Analyse im Main Thread
 */
function updateGlobalAudioDataFallback(audioDataArray, bufferLength) {
  const usableLength = Math.floor(bufferLength * 0.5);
  const bassEnd = Math.floor(usableLength * 0.15);
  const midEnd = Math.floor(usableLength * 0.35);

  let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0;
  let bassCount = 0, midCount = 0, trebleCount = 0;
  let treblePeak = 0;

  for (let i = 0; i < usableLength; i++) {
    const value = audioDataArray[i];
    totalSum += value;

    if (i < bassEnd) {
      bassSum += value;
      bassCount++;
    } else if (i < midEnd) {
      midSum += value;
      midCount++;
    } else {
      trebleSum += value;
      trebleCount++;
      if (value > treblePeak) treblePeak = value;
    }
  }

  const bass = bassCount > 0 ? Math.min(255, Math.floor((bassSum / bassCount) * 1.5)) : 0;
  const mid = midCount > 0 ? Math.min(255, Math.floor((midSum / midCount) * 2.0)) : 0;

  const trebleAvg = trebleCount > 0 ? (trebleSum / trebleCount) : 0;
  const trebleCombined = (trebleAvg * 0.6) + (treblePeak * 0.4);
  const treble = Math.min(255, Math.floor(trebleCombined * 8.0));

  const volume = usableLength > 0 ? Math.min(255, Math.floor((totalSum / usableLength) * 1.5)) : 0;

  applyAudioData({ bass, mid, treble, volume });
}

/**
 * Wendet Audio-Daten auf globales Objekt an
 */
function applyAudioData(data) {
  window.audioAnalysisData.bass = data.bass;
  window.audioAnalysisData.mid = data.mid;
  window.audioAnalysisData.treble = data.treble;
  window.audioAnalysisData.volume = data.volume;

  if (data.smoothBass !== undefined) {
    window.audioAnalysisData.smoothBass = data.smoothBass;
    window.audioAnalysisData.smoothMid = data.smoothMid;
    window.audioAnalysisData.smoothTreble = data.smoothTreble;
    window.audioAnalysisData.smoothVolume = data.smoothVolume;
  } else {
    const smoothFactor = 0.4;
    const trebleSmoothFactor = 0.5;

    window.audioAnalysisData.smoothBass = Math.floor(
      window.audioAnalysisData.smoothBass * (1 - smoothFactor) + data.bass * smoothFactor
    );
    window.audioAnalysisData.smoothMid = Math.floor(
      window.audioAnalysisData.smoothMid * (1 - smoothFactor) + data.mid * smoothFactor
    );
    window.audioAnalysisData.smoothTreble = Math.floor(
      window.audioAnalysisData.smoothTreble * (1 - trebleSmoothFactor) + data.treble * trebleSmoothFactor
    );
    window.audioAnalysisData.smoothVolume = Math.floor(
      window.audioAnalysisData.smoothVolume * (1 - smoothFactor) + data.volume * smoothFactor
    );
  }
}

// CANVAS-BILDER LEISTE

const selectedCanvasImageId = ref(null);
const showImagePreview = ref(false);
const previewImageData = ref(null);
const previewImageIndex = ref(0);
const replaceCanvasImageInput = ref(null);

// Galerie-State für Bild-Ersetzen
const showReplaceGallery = ref(false);
const replaceGalleryCategories = ref([]);
const replaceGalleryImages = ref([]);
const selectedReplaceCategory = ref(null);
const selectedReplaceImage = ref(null);
const replaceGalleryLoading = ref(false);
const replaceGalleryCategoryCache = ref(new Map());

// Vorschau-Zustand für Bild-Ersetzen
const pendingReplaceImage = ref(null);
const pendingReplaceImageSrc = ref(null);

// Drag & Drop State
const draggedImageIndex = ref(null);
const dragOverIndex = ref(null);

const canvasImages = computed(() => {
  const manager = multiImageManagerInstance.value;
  if (!manager) return [];
  return manager.getAllImages() || [];
});

function selectCanvasImage(imgData) {
  const manager = multiImageManagerInstance.value;
  const canvasManager = canvasManagerInstance.value;
  if (!manager || !imgData) return;

  if (canvasManager) {
    canvasManager.setActiveObject(imgData);
  } else {
    manager.setSelectedImage(imgData);
  }
  selectedCanvasImageId.value = imgData.id;

  if (window.fotoPanelControls?.currentActiveImage) {
    window.fotoPanelControls.currentActiveImage.value = imgData;
  }
}

function deleteCanvasImage(imageId) {
  const manager = multiImageManagerInstance.value;
  if (!manager) return;

  manager.removeImage(imageId);

  // Deselect if the deleted image was selected
  if (selectedCanvasImageId.value === imageId) {
    selectedCanvasImageId.value = null;
  }

  console.log('🗑️ Bild aus Preview-Leiste gelöscht:', imageId);
}

function deleteAllCanvasImages() {
  const manager = multiImageManagerInstance.value;
  if (!manager) return;

  // Clear all images
  manager.clear();
  selectedCanvasImageId.value = null;

  console.log('🗑️ Alle Bilder vom Canvas gelöscht');
}

function openImagePreview(imgData, index) {
  previewImageData.value = imgData;
  previewImageIndex.value = index;
  showImagePreview.value = true;
}

function closeImagePreview() {
  showImagePreview.value = false;
  previewImageData.value = null;
  previewImageIndex.value = 0;
  // Vorschau-Zustand zurücksetzen
  pendingReplaceImage.value = null;
  pendingReplaceImageSrc.value = null;
}

// Ersetzen eines Canvas-Bildes - Vorschau laden
function handleReplaceCanvasImage(event) {
  const file = event.target.files?.[0];
  if (!file || !previewImageData.value) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Speichere in Vorschau-Zustand statt direktem Ersetzen
      pendingReplaceImage.value = img;
      pendingReplaceImageSrc.value = e.target.result;
      console.log('🔍 Neues Bild in Vorschau geladen:', img.naturalWidth, 'x', img.naturalHeight);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);

  // Input zurücksetzen für erneute Auswahl derselben Datei
  event.target.value = '';
}

// Vorschau bestätigen und Bild tatsächlich ersetzen
function confirmPendingReplace() {
  if (!pendingReplaceImage.value || !previewImageData.value) return;

  const manager = multiImageManagerInstance.value;
  if (!manager) return;

  const result = manager.replaceImage(previewImageData.value.id, pendingReplaceImage.value);
  if (result) {
    previewImageData.value = result;
    console.log('✅ Canvas-Bild erfolgreich ersetzt');
  }

  // Vorschau-Zustand zurücksetzen
  pendingReplaceImage.value = null;
  pendingReplaceImageSrc.value = null;
}

// Vorschau abbrechen
function cancelPendingReplace() {
  pendingReplaceImage.value = null;
  pendingReplaceImageSrc.value = null;
  console.log('❌ Bild-Ersetzen abgebrochen');
}

// ═══════════════════════════════════════════════════════════════
// GALERIE FÜR BILD-ERSETZEN
// ═══════════════════════════════════════════════════════════════

async function openReplaceGallery() {
  showReplaceGallery.value = true;
  selectedReplaceImage.value = null;

  // Galerie-Index laden wenn noch nicht geladen
  if (replaceGalleryCategories.value.length === 0) {
    await loadReplaceGalleryIndex();
  }
}

function closeReplaceGallery() {
  showReplaceGallery.value = false;
  selectedReplaceImage.value = null;
}

async function loadReplaceGalleryIndex() {
  replaceGalleryLoading.value = true;
  try {
    const paths = ['gallery/gallery.json', './gallery/gallery.json'];
    let response = null;

    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) break;
      } catch (e) {
        // Try next path
      }
    }

    if (!response || !response.ok) {
      throw new Error('Galerie konnte nicht geladen werden');
    }

    const data = await response.json();

    if (data._version === '2.0' && data.categories) {
      replaceGalleryCategories.value = data.categories;

      // Erste Kategorie auswählen und laden
      if (replaceGalleryCategories.value.length > 0) {
        await selectReplaceGalleryCategory(replaceGalleryCategories.value[0].id);
      }
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden der Galerie:', error);
  } finally {
    replaceGalleryLoading.value = false;
  }
}

async function selectReplaceGalleryCategory(categoryId) {
  if (selectedReplaceCategory.value === categoryId) return;

  selectedReplaceCategory.value = categoryId;
  selectedReplaceImage.value = null;

  // Prüfen ob bereits im Cache
  if (replaceGalleryCategoryCache.value.has(categoryId)) {
    replaceGalleryImages.value = replaceGalleryCategoryCache.value.get(categoryId);
    return;
  }

  replaceGalleryLoading.value = true;
  try {
    const categoryInfo = replaceGalleryCategories.value.find(c => c.id === categoryId);
    if (!categoryInfo || !categoryInfo.jsonFile) {
      replaceGalleryImages.value = [];
      return;
    }

    const response = await fetch(categoryInfo.jsonFile);
    if (!response.ok) {
      throw new Error(`Kategorie ${categoryId} konnte nicht geladen werden`);
    }

    const data = await response.json();
    const images = data.images || [];

    // Im Cache speichern
    replaceGalleryCategoryCache.value.set(categoryId, images);
    replaceGalleryImages.value = images;
  } catch (error) {
    console.error('❌ Fehler beim Laden der Kategorie:', error);
    replaceGalleryImages.value = [];
  } finally {
    replaceGalleryLoading.value = false;
  }
}

function selectReplaceGalleryImage(image) {
  selectedReplaceImage.value = image;
}

async function confirmReplaceFromGallery() {
  if (!selectedReplaceImage.value || !previewImageData.value) {
    closeReplaceGallery();
    return;
  }

  const imagePath = selectedReplaceImage.value.file;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imagePath;
    });

    // Speichere in Vorschau-Zustand statt direktem Ersetzen
    pendingReplaceImage.value = img;
    pendingReplaceImageSrc.value = imagePath;
    console.log('🔍 Galeriebild in Vorschau geladen:', imagePath);

    closeReplaceGallery();
  } catch (error) {
    console.error('❌ Fehler beim Laden des Galeriebildes:', error);
  }
}

// Drag & Drop Handler für Ebenenreihenfolge
function handleDragStart(event, index) {
  draggedImageIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', index.toString());

  // Etwas Verzögerung für visuelles Feedback
  setTimeout(() => {
    event.target.classList.add('dragging');
  }, 0);
}

function handleDragEnd() {
  draggedImageIndex.value = null;
  dragOverIndex.value = null;
}

function handleDragOver(event, index) {
  if (draggedImageIndex.value === null) return;
  if (draggedImageIndex.value === index) return;

  dragOverIndex.value = index;
  event.dataTransfer.dropEffect = 'move';
}

function handleDragLeave() {
  // Nur zurücksetzen wenn wir die Scroll-Area verlassen
  // dragOverIndex.value = null;
}

function handleDrop(event, toIndex) {
  const fromIndex = draggedImageIndex.value;

  if (fromIndex === null || fromIndex === toIndex) {
    handleDragEnd();
    return;
  }

  const manager = multiImageManagerInstance.value;
  if (manager) {
    manager.reorderImage(fromIndex, toIndex);
  }

  handleDragEnd();
}

// SEPARATE VISUALIZER RENDER-LOOP

let visualizerAnimationId = null;
let isVisualizerActive = false;
let loopStartCount = 0;

const startVisualizerLoop = () => {
  loopStartCount++;
  console.log(`[App] startVisualizerLoop (#${loopStartCount}, aktiv: ${isVisualizerActive})`);

  if (isVisualizerActive || visualizerAnimationId) {
    console.warn('[App] Loop läuft bereits - erzwinge Neustart');
    stopVisualizerLoop();

    setTimeout(() => {
      startVisualizerLoopInternal();
    }, 50);
    return;
  }

  startVisualizerLoopInternal();
};

const startVisualizerLoopInternal = () => {
  isVisualizerActive = true;
  console.log(`[App] Visualizer-Loop GESTARTET (#${loopStartCount})`);

  const renderFrame = () => {
    if (!isVisualizerActive) {
      console.log('[App] Visualizer-Loop gestoppt (Flag=false)');
      visualizerAnimationId = null;
      return;
    }

    try {
      if (recorderStore.isRecording && recordingCanvas) {
        const recordingCtx = recordingCanvas.getContext('2d');
        if (recordingCtx && canvasRef.value) {
          // draw() macht bereits alles
        }
      }

    } catch (error) {
      console.error('[App] Visualizer-Render Error:', error);
      isVisualizerActive = false;
      visualizerAnimationId = null;
      return;
    }

    if (isVisualizerActive) {
      visualizerAnimationId = requestAnimationFrame(renderFrame);
    }
  };

  renderFrame();
};

const stopVisualizerLoop = () => {
  console.log(`[App] stopVisualizerLoop (aktiv: ${isVisualizerActive}, ID: ${visualizerAnimationId})`);

  isVisualizerActive = false;

  if (visualizerAnimationId) {
    cancelAnimationFrame(visualizerAnimationId);
    visualizerAnimationId = null;
    console.log('[App] Animation Frame cancelled');
  }

  if (recordingCanvasStream) {
    try {
      recordingCanvasStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log(`[App] Track gestoppt: ${track.kind}`);
        }
      });
      recordingCanvasStream = null;
      console.log('[App] Canvas-Stream vollständig bereinigt');
    } catch (error) {
      console.error('[App] Fehler beim Cleanup des Canvas-Streams:', error);
    }
  }

  console.log('[App] Visualizer-Loop GESTOPPT & bereinigt');
};

// ✅ KRITISCHER FIX: Canvas-Initialisierungsfunktion
// Diese Funktion initialisiert den Canvas und alle Manager-Instanzen.
// Sie wird aufgerufen, sobald der Canvas verfügbar ist.
function initializeCanvas(canvasParam) {
  if (canvasInitialized) {
    return false;
  }

  // ✅ KRITISCHER FIX: Verwende IMMER das Canvas aus dem DOM
  // Bei einem direkten Refresh kann die Ref auf ein anderes Element zeigen
  const domCanvas = document.querySelector('.canvas-wrapper canvas');
  const canvas = domCanvas || canvasParam;

  if (!canvas) {
    console.warn('[App] ⚠️ Kein Canvas gefunden - weder im DOM noch als Parameter');
    return false;
  }

  // Prüfe ob DOM-Canvas und Parameter-Canvas unterschiedlich sind
  if (domCanvas && canvasParam && domCanvas !== canvasParam) {
    console.warn('[App] ⚠️ DOM-Canvas und Ref-Canvas sind unterschiedlich! Verwende DOM-Canvas.');
  }

  console.log('[App] ✅ Canvas-Initialisierung wird durchgeführt...');

  const presetKey = workspaceStore.selectedPresetKey;
  let canvasWidth = 1920;
  let canvasHeight = 1080;

  if (presetKey) {
    const socialMediaPresets = {
      'tiktok': { width: 1080, height: 1920 },
      'instagram-story': { width: 1080, height: 1920 },
      'instagram-post': { width: 1080, height: 1080 },
      'instagram-reel': { width: 1080, height: 1920 },
      'youtube-short': { width: 1080, height: 1920 },
      'youtube-video': { width: 1920, height: 1080 },
      'facebook-post': { width: 1200, height: 630 },
      'twitter-video': { width: 1280, height: 720 },
      'linkedin-video': { width: 1920, height: 1080 }
    };

    if (socialMediaPresets[presetKey]) {
      canvasWidth = socialMediaPresets[presetKey].width;
      canvasHeight = socialMediaPresets[presetKey].height;
    }
  }

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  console.log(`[App] Canvas Dimensionen gesetzt: ${canvasWidth}x${canvasHeight}`);

  // Recording Canvas synchronisieren
  recordingCanvas.width = canvasWidth;
  recordingCanvas.height = canvasHeight;

  textManagerInstance = new TextManager(textStore);
  gridManagerInstance.value = new GridManager(canvas);
  fotoManagerInstance.value = new FotoManager(() => {});

  multiImageManagerInstance.value = new MultiImageManager(canvas, {
    redrawCallback: () => {},
    onImageSelected: onObjectSelected,
    onImageChanged: () => {},
    fotoManager: fotoManagerInstance.value
  });

  videoManagerInstance.value = new VideoManager(canvas, {
    redrawCallback: () => {},
    onVideoSelected: onObjectSelected,
    onVideoChanged: () => {},
    fotoManager: fotoManagerInstance.value,
    audioElement: audioRef.value
  });

  canvasManagerInstance.value = new CanvasManager(canvas, {
    redrawCallback: () => {},
    onObjectSelected: onObjectSelected,
    onStateChange: () => {},
    onTextDoubleClick: () => {},
    textManager: textManagerInstance,
    fotoManager: fotoManagerInstance.value,
    gridManager: gridManagerInstance.value,
    multiImageManager: multiImageManagerInstance.value,
    videoManager: videoManagerInstance.value
  });
  canvasManagerInstance.value.setupInteractionHandlers();

  canvasManagerInstance.value.setBackgroundTilesStore(backgroundTilesStore);

  canvasInitialized = true;
  console.log('[App] ✅ Canvas-Initialisierung ABGESCHLOSSEN');
  console.log('[App] Manager-Status:', {
    canvasManager: !!canvasManagerInstance.value,
    multiImageManager: !!multiImageManagerInstance.value,
    videoManager: !!videoManagerInstance.value,
    fotoManager: !!fotoManagerInstance.value
  });

  return true;
}


function setupAudioContext() {
  if (audioContext || !audioRef.value) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  sourceNode = audioContext.createMediaElementSource(audioRef.value);
  outputGain = audioContext.createGain();

  bassFilter = audioContext.createBiquadFilter();
  bassFilter.type = 'lowshelf';
  bassFilter.frequency.value = 200;
  bassFilter.gain.value = 0;

  trebleFilter = audioContext.createBiquadFilter();
  trebleFilter.type = 'highshelf';
  trebleFilter.frequency.value = 3000;
  trebleFilter.gain.value = 0;

  recordingGain = audioContext.createGain();
  recordingGain.gain.value = 0;

  // ✨ NEU: Mic Recording Gain (für Live-Umschaltung während Aufnahme)
  micRecordingGain = audioContext.createGain();
  micRecordingGain.gain.value = 0; // Startet stumm - wird bei Umschaltung aktiviert

  // ✨ NEU: Zentraler Mixer - ALLE Audio-Quellen gehen hier durch
  // Dieser Knoten ist IMMER mit recordingDest verbunden
  recordingMixer = audioContext.createGain();
  recordingMixer.gain.value = 1; // Immer voll an

  recordingDest = audioContext.createMediaStreamDestination();

  sourceNode.connect(bassFilter);
  bassFilter.connect(trebleFilter);
  trebleFilter.connect(outputGain);
  outputGain.connect(audioContext.destination);

  sourceNode.connect(analyser);

  // ✨ NEU: Beide Quellen → Mixer → recordingDest
  // Player Audio → recordingGain → recordingMixer
  trebleFilter.connect(recordingGain);
  recordingGain.connect(recordingMixer);

  // Mic Audio → micRecordingGain → recordingMixer
  micRecordingGain.connect(recordingMixer);

  // Mixer → recordingDest (EINZIGER Pfad zum Recorder!)
  recordingMixer.connect(recordingDest);

  console.log('[App] Audio Context mit zentralem Recording-Mixer eingerichtet');
  console.log('[App] Audio-Graph: [Player|Mic] → Gains → Mixer → recordingDest');
  console.log('[App] ✅ Live Audio-Umschaltung für Recording vorbereitet');
}

function setBassGain(gain) {
  if (bassFilter) {
    bassFilter.gain.value = gain;
    console.log('[App] Bass gain:', gain, 'dB');
  }
}

function setTrebleGain(gain) {
  if (trebleFilter) {
    trebleFilter.gain.value = gain;
    console.log('[App] Treble gain:', gain, 'dB');
  }
}

// ✅ KRITISCH: Globale Konstanten für Audio-Gain
const SILENT_GAIN = 0.0001; // Unhörbar aber technisch aktiv - MediaRecorder braucht das!
const ACTIVE_GAIN = 1;

function enableRecorderAudio() {
  if (recordingGain) {
    recordingGain.gain.value = ACTIVE_GAIN;
    console.log('[App] Recorder Audio ENABLED');
  }
}

function disableRecorderAudio() {
  if (recordingGain) {
    // ✅ WICHTIG: Nie 0 verwenden! MediaRecorder braucht aktive Audio-Quellen
    recordingGain.gain.value = SILENT_GAIN;
    console.log('[App] Recorder Audio DISABLED (silent but active)');
  }
}

// ========== MICROPHONE AUDIO SOURCE ==========

/**
 * Initialize AudioContext if not already created (for microphone use)
 */
function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    console.log('[App] AudioContext created for microphone');
  }
  return audioContext;
}

/**
 * Setup microphone as audio source with SEPARATE AudioContext
 * This avoids conflicts with the player AudioContext
 */
async function setupMicrophoneSource() {
  try {
    // Get microphone stream first
    const stream = await audioSourceStore.startMicrophone(
      audioSourceStore.selectedDeviceId !== 'default' ? audioSourceStore.selectedDeviceId : null
    );

    if (!stream) {
      console.error('[App] Failed to get microphone stream');
      return false;
    }

    // Close existing microphone AudioContext if any
    if (microphoneAudioContext) {
      try {
        if (microphoneSourceNode) {
          microphoneSourceNode.disconnect();
        }
        await microphoneAudioContext.close();
        console.log('[App] Previous microphone AudioContext closed');
      } catch (e) {
        console.warn('[App] Error closing previous microphone context:', e);
      }
    }

    // Get the microphone's actual sample rate from the track settings
    const audioTrack = stream.getAudioTracks()[0];
    const trackSettings = audioTrack?.getSettings();
    const micSampleRate = trackSettings?.sampleRate;
    console.log('[App] Microphone track settings:', trackSettings);

    // Create AudioContext with a standard sample rate (48000 Hz)
    // Using a fixed rate avoids sample rate mismatch issues
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      microphoneAudioContext = new AudioContextClass({ sampleRate: 48000 });
    } catch (e) {
      console.warn('[App] Could not create AudioContext with 48000Hz, using default');
      microphoneAudioContext = new AudioContextClass();
    }
    console.log('[App] Created AudioContext for microphone, sample rate:', microphoneAudioContext.sampleRate);

    // Resume if suspended (MUST be done before creating nodes in some browsers)
    if (microphoneAudioContext.state === 'suspended') {
      await microphoneAudioContext.resume();
      console.log('[App] Microphone AudioContext resumed');
    }

    // Create analyser for microphone
    microphoneAnalyser = microphoneAudioContext.createAnalyser();
    microphoneAnalyser.fftSize = 2048;
    microphoneAnalyser.smoothingTimeConstant = 0.8;

    // Create MediaStreamSource from microphone
    microphoneSourceNode = microphoneAudioContext.createMediaStreamSource(stream);

    // IMPORTANT: Connect through a GainNode to ensure audio flows
    // Some browsers have issues with direct MediaStreamSource -> Analyser connections
    const micGain = microphoneAudioContext.createGain();
    micGain.gain.value = 1.0;

    microphoneSourceNode.connect(micGain);
    micGain.connect(microphoneAnalyser);

    // Also connect to a silent destination to keep the audio graph active
    // This is a workaround for a Chrome bug where MediaStreamSource
    // doesn't process audio unless connected to destination
    const silentGain = microphoneAudioContext.createGain();
    silentGain.gain.value = 0; // Silent - no audio output
    micGain.connect(silentGain);
    silentGain.connect(microphoneAudioContext.destination);

    console.log('[App] Microphone audio graph: source -> gain -> analyser');
    console.log('[App] Microphone audio graph: source -> gain -> silent -> destination (for Chrome bug)');
    console.log('[App] Microphone AudioContext state:', microphoneAudioContext.state);
    console.log('[App] Microphone Analyser fftSize:', microphoneAnalyser.fftSize, 'frequencyBinCount:', microphoneAnalyser.frequencyBinCount);

    // Verify stream is active
    const tracks = stream.getAudioTracks();
    console.log('[App] Audio tracks:', tracks.length, 'enabled:', tracks[0]?.enabled, 'muted:', tracks[0]?.muted);

    return true;

  } catch (error) {
    console.error('[App] Error setting up microphone source:', error);
    audioSourceStore.errorMessage = error.message;
    return false;
  }
}

/**
 * Disconnect microphone source and close its AudioContext
 */
function disconnectMicrophoneSource() {
  if (microphoneSourceNode) {
    try {
      microphoneSourceNode.disconnect();
      console.log('[App] Microphone source disconnected');
    } catch (e) {
      // Ignore disconnect errors
    }
    microphoneSourceNode = null;
  }

  if (microphoneAudioContext) {
    try {
      microphoneAudioContext.close();
      console.log('[App] Microphone AudioContext closed');
    } catch (e) {
      // Ignore close errors
    }
    microphoneAudioContext = null;
    microphoneAnalyser = null;
  }

  audioSourceStore.stopMicrophone();
}

/**
 * Switch audio source (called from PlayerPanel)
 */
async function switchAudioSource(sourceType) {
  console.log('[App] Switching audio source to:', sourceType);

  if (sourceType === 'microphone') {
    // Setup microphone
    const success = await setupMicrophoneSource();
    if (success) {
      audioSourceStore.setSourceType('microphone');
    }
    return success;
  } else {
    // Switch back to player
    disconnectMicrophoneSource();
    audioSourceStore.setSourceType('player');
    return true;
  }
}

// Expose switch function globally for PlayerPanel
window.switchAudioSource = switchAudioSource;

function onObjectSelected(selectedObject) {
  if (!window.fotoPanelControls) {
    setTimeout(() => onObjectSelected(selectedObject), 100);
    return;
  }

  const isImageSelected = selectedObject &&
    (selectedObject.type === 'image' ||
      selectedObject.type === 'background' ||
      selectedObject.type === 'workspace-background');

  if (isImageSelected && selectedObject.type === 'image' && selectedObject.id) {
    selectedCanvasImageId.value = selectedObject.id;
  } else if (!isImageSelected) {
    selectedCanvasImageId.value = null;
  }

  // ✨ FIX: Für Hintergründe das Ref auf null setzen und dann neu setzen,
  // um den Watch in FotoPanel.vue auszulösen (Vue erkennt sonst keine Änderung)
  const isBackgroundType = selectedObject && (
    selectedObject.type === 'workspace-background' ||
    selectedObject.type === 'background'
  );

  if (window.fotoPanelControls.currentActiveImage) {
    if (isBackgroundType) {
      // Kurz auf null setzen, damit Vue die Änderung erkennt
      window.fotoPanelControls.currentActiveImage.value = null;
      // Im nächsten Tick den Wert setzen
      setTimeout(() => {
        if (window.fotoPanelControls.currentActiveImage) {
          window.fotoPanelControls.currentActiveImage.value = selectedObject;
        }
      }, 0);
    } else {
      window.fotoPanelControls.currentActiveImage.value = isImageSelected ? selectedObject : null;
    }
  }

  if (window.fotoPanelControls.container) {
    window.fotoPanelControls.container.style.display = isImageSelected ? 'block' : 'none';
  }

  // ✨ FIX: loadImageSettings für ALLE Bild-Typen aufrufen (nicht nur 'image')
  if (isImageSelected && window.fotoPanelControls.loadImageSettings) {
    window.fotoPanelControls.loadImageSettings(selectedObject);
  }
  else if (isImageSelected && fotoManagerInstance.value) {
    fotoManagerInstance.value.updateUIFromSettings(
      window.fotoPanelControls,
      selectedObject
    );
  }
}

function renderScene(ctx, canvasWidth, canvasHeight, drawVisualizerCallback) {
  if (canvasManagerInstance.value) {
    canvasManagerInstance.value.drawScene(ctx);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // ✨ NEU: Bilder die HINTER dem Visualizer gerendert werden sollen
  if (multiImageManagerInstance.value) {
    multiImageManagerInstance.value.drawImages(ctx, { behindVisualizer: true });
  }

  if (drawVisualizerCallback) {
    drawVisualizerCallback(ctx, canvasWidth, canvasHeight);
  }

  // ✨ NEU: Bilder die VOR dem Visualizer gerendert werden (Standard)
  if (multiImageManagerInstance.value) {
    multiImageManagerInstance.value.drawImages(ctx, { behindVisualizer: false });
  }

  // ✨ NEU: Videos zeichnen (über Bildern, aber unter Text)
  if (videoManagerInstance.value) {
    videoManagerInstance.value.drawVideos(ctx);
  }

  if (textManagerInstance) {
    textManagerInstance.draw(ctx, canvasWidth, canvasHeight);
  }
}

function renderRecordingScene(ctx, canvasWidth, canvasHeight, drawVisualizerCallback) {
  // ✅ FIX: Workspace-Bereich korrekt extrahieren für Recording/Screenshot
  const workspaceBounds = canvasManagerInstance.value?.getWorkspaceBounds();
  const hasWorkspace = workspaceBounds && canvasManagerInstance.value?.workspacePreset;

  if (hasWorkspace) {
    // Workspace aktiv: Zeichne auf temporäres Canvas und extrahiere Workspace-Bereich
    const mainCanvas = canvasRef.value;
    if (!mainCanvas) return;

    // ✅ FIX: Reuse temp canvas instead of creating new one every frame (prevents GC stuttering)
    if (!recordingTempCanvas || recordingTempCanvas.width !== mainCanvas.width || recordingTempCanvas.height !== mainCanvas.height) {
      recordingTempCanvas = document.createElement('canvas');
      recordingTempCanvas.width = mainCanvas.width;
      recordingTempCanvas.height = mainCanvas.height;
      recordingTempCtx = recordingTempCanvas.getContext('2d');
    }
    const tempCtx = recordingTempCtx;

    // Clear the reused canvas
    tempCtx.clearRect(0, 0, recordingTempCanvas.width, recordingTempCanvas.height);

    // Komplette Szene auf temporäres Canvas zeichnen
    if (canvasManagerInstance.value) {
      canvasManagerInstance.value.isRecording = true;
      canvasManagerInstance.value.drawScene(tempCtx);
      canvasManagerInstance.value.isRecording = false;
    } else {
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, recordingTempCanvas.width, recordingTempCanvas.height);
    }

    // ✨ NEU: Bilder die HINTER dem Visualizer gerendert werden sollen
    if (multiImageManagerInstance.value) {
      multiImageManagerInstance.value.drawImages(tempCtx, { behindVisualizer: true });
    }

    // Visualizer im Workspace-Bereich zeichnen
    if (drawVisualizerCallback) {
      tempCtx.save();
      tempCtx.beginPath();
      tempCtx.rect(workspaceBounds.x, workspaceBounds.y, workspaceBounds.width, workspaceBounds.height);
      tempCtx.clip();

      // ✅ FIX: Reuse viz canvas instead of creating new one every frame (prevents GC stuttering)
      if (!recordingVizCanvas || recordingVizCanvas.width !== workspaceBounds.width || recordingVizCanvas.height !== workspaceBounds.height) {
        recordingVizCanvas = document.createElement('canvas');
        recordingVizCanvas.width = workspaceBounds.width;
        recordingVizCanvas.height = workspaceBounds.height;
        recordingVizCtx = recordingVizCanvas.getContext('2d');
      }
      const vizCtx = recordingVizCtx;
      vizCtx.clearRect(0, 0, recordingVizCanvas.width, recordingVizCanvas.height);

      drawVisualizerCallback(vizCtx, recordingVizCanvas.width, recordingVizCanvas.height);
      tempCtx.drawImage(recordingVizCanvas, workspaceBounds.x, workspaceBounds.y);

      tempCtx.restore();
    }

    // ✨ NEU: Bilder die VOR dem Visualizer gerendert werden (Standard)
    if (multiImageManagerInstance.value) {
      multiImageManagerInstance.value.drawImages(tempCtx, { behindVisualizer: false });
    }

    // Videos zeichnen
    if (videoManagerInstance.value) {
      videoManagerInstance.value.drawVideos(tempCtx);
    }

    // Text zeichnen
    if (textManagerInstance) {
      textManagerInstance.draw(tempCtx, recordingTempCanvas.width, recordingTempCanvas.height);
    }

    // ✅ KRITISCH: Nur den Workspace-Bereich extrahieren und auf Ziel-Canvas skalieren
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(
      recordingTempCanvas,
      workspaceBounds.x,
      workspaceBounds.y,
      workspaceBounds.width,
      workspaceBounds.height,
      0,
      0,
      canvasWidth,
      canvasHeight
    );
  } else {
    // Kein Workspace: Direkt zeichnen wie bisher
    if (canvasManagerInstance.value) {
      canvasManagerInstance.value.isRecording = true;
      canvasManagerInstance.value.drawScene(ctx);
      canvasManagerInstance.value.isRecording = false;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // ✨ NEU: Bilder die HINTER dem Visualizer gerendert werden sollen
    if (multiImageManagerInstance.value) {
      multiImageManagerInstance.value.drawImages(ctx, { behindVisualizer: true });
    }

    if (drawVisualizerCallback) {
      drawVisualizerCallback(ctx, canvasWidth, canvasHeight);
    }

    // ✨ NEU: Bilder die VOR dem Visualizer gerendert werden (Standard)
    if (multiImageManagerInstance.value) {
      multiImageManagerInstance.value.drawImages(ctx, { behindVisualizer: false });
    }

    // ✨ NEU: Videos zeichnen beim Recording
    if (videoManagerInstance.value) {
      videoManagerInstance.value.drawVideos(ctx);
    }

    if (textManagerInstance) {
      textManagerInstance.draw(ctx, canvasWidth, canvasHeight);
    }
  }
}

function draw() {
  // ✅ FIX: Hybrid scheduling for reliable recording
  // Use setTimeout fallback when recording AND tab is hidden
  // rAF is throttled to ~1 FPS when tab is hidden, breaking video recording
  if (recorderStore.isRecording && document.hidden) {
    drawTimeoutId = setTimeout(draw, 16); // ~60 FPS fallback
  } else {
    animationFrameId = requestAnimationFrame(draw);
  }

  // ✅ KRITISCHER FIX: Hole Canvas DIREKT aus dem DOM
  // Bei einem direkten Refresh kann canvasRef.value auf ein anderes Element zeigen
  // als das tatsächlich sichtbare Canvas im DOM.
  const domCanvas = document.querySelector('.canvas-wrapper canvas');
  const refCanvas = canvasRef.value;

  // Verwende das DOM-Canvas, falls verfügbar, sonst das Ref-Canvas
  const canvas = domCanvas || refCanvas;
  if (!canvas) return;


  // ✅ KRITISCHER FIX: Wenn die Manager ein veraltetes Canvas haben, aktualisiere sie
  // Dies behebt das Problem nach einem direkten Page-Refresh
  if (canvasManagerInstance.value && canvasManagerInstance.value.canvas !== canvas) {
    console.warn('[Draw] ⚠️ Manager-Canvas veraltet! Aktualisiere alle Manager...');
    canvasManagerInstance.value.updateCanvas(canvas);
  }

  if (canvas.width > 0 && canvas.height > 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let drawVisualizerCallback = null;

    // Check if we should analyze audio (player playing, recording, or microphone active)
    const isMicActive = audioSourceStore.isMicrophoneActive;

    // Select the correct analyser based on audio source
    // Use microphone analyser when mic is active, otherwise use player analyser
    const activeAnalyser = isMicActive ? microphoneAnalyser : analyser;
    const activeContext = isMicActive ? microphoneAudioContext : audioContext;

    const shouldAnalyzeAudio = activeAnalyser && (
      playerStore.isPlaying ||
      recorderStore.isRecording ||
      isMicActive
    );

    // Auto-resume AudioContext if suspended while microphone is active
    if (isMicActive && microphoneAudioContext && microphoneAudioContext.state === 'suspended') {
      microphoneAudioContext.resume();
    }

    if (shouldAnalyzeAudio) {
      const bufferLength = activeAnalyser.frequencyBinCount;
      if (!audioDataArray || audioDataArray.length !== bufferLength) {
        audioDataArray = new Uint8Array(bufferLength);
      }
      activeAnalyser.getByteFrequencyData(audioDataArray);
      updateGlobalAudioData(audioDataArray, bufferLength);
    }

    const shouldDrawVisualizer = visualizerStore.showVisualizer &&
      (playerStore.isPlaying || recorderStore.isRecording || isMicActive);

    if (activeAnalyser && shouldDrawVisualizer) {
      // ═══════════════════════════════════════════════════════════════════════
      // 🎨 MULTI-VISUALIZER RENDERING
      // ═══════════════════════════════════════════════════════════════════════

      if (visualizerStore.multiLayerMode && visualizerStore.visibleLayers.length > 0) {
        // MULTI-LAYER MODE: Render multiple visualizers with individual settings
        const bufferLength = activeAnalyser.frequencyBinCount;
        if (!audioDataArray || audioDataArray.length !== bufferLength) {
          audioDataArray = new Uint8Array(bufferLength);
        }

        // Ensure layer cache canvases exist
        if (!layerCacheCanvases) {
          layerCacheCanvases = new Map();
        }

        // ✨ PERFORMANCE: Ensure composite canvas exists for pre-compositing
        if (!multiLayerCompositeCanvas || multiLayerCompositeCanvas.width !== canvas.width || multiLayerCompositeCanvas.height !== canvas.height) {
          multiLayerCompositeCanvas = document.createElement('canvas');
          multiLayerCompositeCanvas.width = canvas.width;
          multiLayerCompositeCanvas.height = canvas.height;
          multiLayerCompositeCtx = multiLayerCompositeCanvas.getContext('2d');
        }

        // Render each visible layer to its cache
        for (const layer of visualizerStore.visibleLayers) {
          const visualizer = Visualizers[layer.visualizerId];
          if (!visualizer) continue;

          // Get or create cache canvas for this layer
          let layerCache = layerCacheCanvases.get(layer.id);
          if (!layerCache || layerCache.width !== canvas.width || layerCache.height !== canvas.height) {
            const cacheCanvas = document.createElement('canvas');
            cacheCanvas.width = canvas.width;
            cacheCanvas.height = canvas.height;
            layerCache = {
              canvas: cacheCanvas,
              ctx: cacheCanvas.getContext('2d'),
              lastVisualizerId: null
            };
            layerCacheCanvases.set(layer.id, layerCache);
          }

          // Handle visualizer init/cleanup for this layer
          if (layerCache.lastVisualizerId !== layer.visualizerId) {
            if (layerCache.lastVisualizerId && Visualizers[layerCache.lastVisualizerId]) {
              const oldViz = Visualizers[layerCache.lastVisualizerId];
              if (typeof oldViz.cleanup === 'function') {
                try { oldViz.cleanup(); } catch (e) { /* ignore */ }
              }
            }
            if (typeof visualizer.init === 'function') {
              visualizer.init(canvas.width, canvas.height);
            }
            layerCache.lastVisualizerId = layer.visualizerId;
          }

          // Get audio data for this visualizer
          if (visualizer.needsTimeData) {
            activeAnalyser.getByteTimeDomainData(audioDataArray);
          } else {
            activeAnalyser.getByteFrequencyData(audioDataArray);
          }

          // Render to layer cache
          layerCache.ctx.clearRect(0, 0, canvas.width, canvas.height);
          layerCache.ctx.save();
          layerCache.ctx.globalAlpha = layer.colorOpacity;
          try {
            visualizer.draw(layerCache.ctx, audioDataArray, bufferLength, canvas.width, canvas.height, layer.color, layer.opacity);
          } catch (error) {
            console.error(`Layer "${layer.id}" Visualizer "${layer.visualizerId}" Fehler:`, error);
          }
          layerCache.ctx.restore();
        }

        // ✨ PERFORMANCE: Pre-composite all layers ONCE per frame
        // This is done only once, then reused for both main canvas and recording
        multiLayerCompositeCtx.clearRect(0, 0, canvas.width, canvas.height);
        for (const layer of visualizerStore.visibleLayers) {
          const layerCache = layerCacheCanvases.get(layer.id);
          if (!layerCache) continue;

          multiLayerCompositeCtx.save();
          multiLayerCompositeCtx.globalCompositeOperation = layer.blendMode || 'source-over';

          const scale = layer.scale;
          const posX = layer.x;
          const posY = layer.y;

          const scaledWidth = canvas.width * scale;
          const scaledHeight = canvas.height * scale;
          const destX = canvas.width * posX - scaledWidth / 2;
          const destY = canvas.height * posY - scaledHeight / 2;

          if (scale !== 1.0 || posX !== 0.5 || posY !== 0.5) {
            multiLayerCompositeCtx.drawImage(
              layerCache.canvas,
              0, 0, canvas.width, canvas.height,
              destX, destY, scaledWidth, scaledHeight
            );
          } else {
            multiLayerCompositeCtx.drawImage(layerCache.canvas, 0, 0);
          }

          multiLayerCompositeCtx.restore();
        }

        // ✨ PERFORMANCE: Simple callback that just draws the pre-composited result
        // No more per-layer iteration - just a single drawImage call
        drawVisualizerCallback = (targetCtx, width, height, useTransform = true) => {
          if (width === canvas.width && height === canvas.height) {
            targetCtx.drawImage(multiLayerCompositeCanvas, 0, 0);
          } else {
            targetCtx.drawImage(multiLayerCompositeCanvas, 0, 0, width, height);
          }
        };

        // Cleanup old layer caches that are no longer in use
        const currentLayerIds = new Set(visualizerStore.visualizerLayers.map(l => l.id));
        for (const layerId of layerCacheCanvases.keys()) {
          if (!currentLayerIds.has(layerId)) {
            layerCacheCanvases.delete(layerId);
          }
        }

      } else {
        // SINGLE MODE: Original single-visualizer rendering (backward compatible)
        const visualizer = Visualizers[visualizerStore.selectedVisualizer];
        if (visualizer) {
          const visualizerChanged = visualizerStore.selectedVisualizer !== lastSelectedVisualizerId.value;
          const canvasResized = canvas.width !== lastCanvasWidth.value || canvas.height !== lastCanvasHeight.value;

          if (visualizerChanged || canvasResized) {
            if (lastSelectedVisualizerId.value && Visualizers[lastSelectedVisualizerId.value]) {
              const oldVisualizer = Visualizers[lastSelectedVisualizerId.value];
              if (typeof oldVisualizer.cleanup === 'function') {
                try {
                  oldVisualizer.cleanup();
                  console.log(`[App] Visualizer "${lastSelectedVisualizerId.value}" bereinigt`);
                } catch (e) {
                  console.warn(`[App] Cleanup-Fehler bei "${lastSelectedVisualizerId.value}":`, e);
                }
              }
            }

            if (typeof visualizer.init === 'function') {
              visualizer.init(canvas.width, canvas.height);
            }
            lastSelectedVisualizerId.value = visualizerStore.selectedVisualizer;
            lastCanvasWidth.value = canvas.width;
            lastCanvasHeight.value = canvas.height;
          }

          const bufferLength = activeAnalyser.frequencyBinCount;
          if (!audioDataArray || audioDataArray.length !== bufferLength) {
            audioDataArray = new Uint8Array(bufferLength);
          }
          if (visualizer.needsTimeData) {
            activeAnalyser.getByteTimeDomainData(audioDataArray);
          } else {
            activeAnalyser.getByteFrequencyData(audioDataArray);
          }

          if (!visualizerCacheCanvas || visualizerCacheCanvas.width !== canvas.width || visualizerCacheCanvas.height !== canvas.height) {
            visualizerCacheCanvas = document.createElement('canvas');
            visualizerCacheCanvas.width = canvas.width;
            visualizerCacheCanvas.height = canvas.height;
            visualizerCacheCtx = visualizerCacheCanvas.getContext('2d');
          }

          visualizerCacheCtx.clearRect(0, 0, canvas.width, canvas.height);
          visualizerCacheCtx.save();
          visualizerCacheCtx.globalAlpha = visualizerStore.colorOpacity;
          try {
            visualizer.draw(visualizerCacheCtx, audioDataArray, bufferLength, canvas.width, canvas.height, visualizerStore.visualizerColor, visualizerStore.visualizerOpacity);
            visualizerStore.markVisualizerWorking(visualizerStore.selectedVisualizer);
          } catch (error) {
            console.error(`Visualizer "${visualizerStore.selectedVisualizer}" Fehler:`, error);
            visualizerCacheCtx.fillStyle = '#000';
            visualizerCacheCtx.fillRect(0, 0, canvas.width, canvas.height);
            visualizerStore.fallbackToLastWorking();
          }
          visualizerCacheCtx.restore();

          drawVisualizerCallback = (targetCtx, width, height, useTransform = true) => {
            const scale = visualizerStore.visualizerScale;
            const posX = visualizerStore.visualizerX;
            const posY = visualizerStore.visualizerY;

            const scaledWidth = canvas.width * scale;
            const scaledHeight = canvas.height * scale;

            const destX = width * posX - scaledWidth / 2;
            const destY = height * posY - scaledHeight / 2;

            if (useTransform && (scale !== 1.0 || posX !== 0.5 || posY !== 0.5)) {
              targetCtx.drawImage(
                visualizerCacheCanvas,
                0, 0, canvas.width, canvas.height,
                destX, destY, scaledWidth, scaledHeight
              );
            } else {
              if (width === canvas.width && height === canvas.height) {
                targetCtx.drawImage(visualizerCacheCanvas, 0, 0);
              } else {
                targetCtx.drawImage(visualizerCacheCanvas, 0, 0, width, height);
              }
            }
          };
        }
      }
    }

    renderScene(ctx, canvas.width, canvas.height, drawVisualizerCallback);

    // ✅ FIX: Recording canvas is now EXCLUSIVELY updated by recorder:forceRedraw event
    // This prevents race conditions between requestAnimationFrame and recorder's setInterval
    // The recorder's frame requester handles rendering + requestFrame() synchronously

    if (canvasManagerInstance.value) {
      // ✨ Ghost-Markierungen für ausgeblendete Texte zeichnen
      canvasManagerInstance.value.drawFadedTextMarkers(ctx);
      canvasManagerInstance.value.drawInteractiveElements(ctx);
      canvasManagerInstance.value.drawWorkspaceOutline(ctx);
      canvasManagerInstance.value.drawTextSelectionRect(ctx);
      canvasManagerInstance.value.drawTextPositionPreview(ctx);
      if (gridManagerInstance.value) {
        gridManagerInstance.value.drawGrid(ctx);
      }
      if (multiImageManagerInstance.value && multiImageManagerInstance.value.getSelectedImage()) {
        multiImageManagerInstance.value.drawInteractiveElements(ctx);
      }
    }
  }
}

/**
 * ✨ NEU: Verbindet Mikrofon mit dem Recording-Kanal für Live-Umschaltung
 * WICHTIG: Wir holen einen SEPARATEN Mic-Stream für Recording,
 * da der Visualizer-Stream bereits vom microphoneAudioContext benutzt wird!
 */
async function connectMicToRecordingChain() {
  if (!audioContext || !micRecordingGain) {
    console.error('[App] AudioContext oder micRecordingGain nicht verfügbar');
    return false;
  }

  // Alte Mic-Source und Stream trennen/stoppen
  if (micRecordingSourceNode) {
    try {
      micRecordingSourceNode.disconnect();
    } catch (e) {
      // Ignore
    }
    micRecordingSourceNode = null;
  }

  // Alten Recording-Stream stoppen
  if (micRecordingStream) {
    micRecordingStream.getTracks().forEach(track => track.stop());
    micRecordingStream = null;
    console.log('[App] Alter Recording-Mic-Stream gestoppt');
  }

  try {
    // ✅ KRITISCHER FIX: NICHT blockieren wenn AudioContext suspended ist
    // Der AudioContext wird automatisch resumed sobald der User interagiert
    if (audioContext.state === 'suspended') {
      console.log('[App] AudioContext ist suspended - triggere resume (nicht blockierend)...');
      audioContext.resume().catch(() => {}); // Ignoriere Fehler, da es später funktioniert
    }

    // ✨ WICHTIG: NEUEN Mic-Stream für Recording holen!
    // Der Visualizer-Stream wird vom microphoneAudioContext benutzt
    // und kann nicht gleichzeitig im Haupt-AudioContext verwendet werden
    console.log('[App] Hole separaten Mic-Stream für Recording...');

    const deviceId = audioSourceStore.selectedDeviceId;
    const constraints = {
      audio: {
        deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    micRecordingStream = await navigator.mediaDevices.getUserMedia(constraints);

    // Prüfe ob der Mic-Stream aktiv ist
    const audioTracks = micRecordingStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error('[App] Recording-Mic-Stream hat keine Audio-Tracks!');
      return false;
    }

    const track = audioTracks[0];
    console.log('[App] Recording Mic Track:', track.label);
    console.log('[App] Recording Mic Track Status:', track.readyState, 'enabled:', track.enabled);

    if (track.readyState !== 'live') {
      console.error('[App] Recording Mic Track ist nicht live!');
      return false;
    }

    // Erstelle MediaStreamSource im HAUPT-AudioContext
    micRecordingSourceNode = audioContext.createMediaStreamSource(micRecordingStream);

    // Verbinde mit Recording-Gain
    micRecordingSourceNode.connect(micRecordingGain);

    console.log('[App] ✅ SEPARATER Mikrofon-Stream mit Recording-Kanal verbunden');
    console.log('[App] AudioContext Sample Rate:', audioContext.sampleRate);
    console.log('[App] AudioContext State:', audioContext.state);

    return true;
  } catch (error) {
    console.error('[App] Fehler beim Verbinden des Mikrofons:', error);
    return false;
  }
}

/**
 * ✨ NEU: Trennt Mikrofon vom Recording-Kanal
 */
function disconnectMicFromRecordingChain() {
  if (micRecordingSourceNode) {
    try {
      micRecordingSourceNode.disconnect();
    } catch (e) {
      // Ignore
    }
    micRecordingSourceNode = null;
    console.log('[App] Mikrofon vom Recording-Kanal getrennt');
  }

  // ✨ NEU: Recording-Stream stoppen
  if (micRecordingStream) {
    micRecordingStream.getTracks().forEach(track => track.stop());
    micRecordingStream = null;
    console.log('[App] Recording-Mic-Stream gestoppt');
  }
}

/**
 * ✨ NEU: Schaltet Mikrofon ZU (additiv zum Player)
 * Player läuft IMMER, Mikrofon wird dazugemischt
 * @param {boolean} enable - true = Mic zuschalten, false = Mic abschalten
 */
async function toggleRecordingMicrophone(enable) {
  if (!recordingGain || !micRecordingGain) {
    console.error('[App] Recording Gains nicht verfügbar');
    return false;
  }

  console.log(`[App] Mikrofon ${enable ? 'ZUSCHALTEN' : 'ABSCHALTEN'}`);

  if (enable) {
    // ✨ 1. Visualizer-Mic aktivieren (für UI-Feedback)
    if (!audioSourceStore.isMicrophoneActive) {
      console.log('[App] Aktiviere Visualizer-Mikrofon...');
      const visSuccess = await setupMicrophoneSource();
      if (visSuccess) {
        audioSourceStore.setSourceType('microphone');
      }
    }

    // ✨ 2. Recording-Mic verbinden falls noch nicht geschehen
    if (!micRecordingSourceNode) {
      console.log('[App] Recording-Mic nicht verbunden - verbinde jetzt...');
      const connected = await connectMicToRecordingChain();
      if (!connected) {
        console.error('[App] Konnte Recording-Mic-Stream nicht verbinden');
        return false;
      }
    }

    // ✅ BEIDE aktiv: Player UND Mic!
    recordingGain.gain.value = ACTIVE_GAIN;
    micRecordingGain.gain.value = ACTIVE_GAIN;

    console.log('[App] ✅ Mikrofon ZUGESCHALTET (Player + Mic)');
    console.log('[App] Gain-Werte: Player:', recordingGain.gain.value, 'Mic:', micRecordingGain.gain.value);

  } else {
    // ✅ Nur Player aktiv, Mic stumm
    recordingGain.gain.value = ACTIVE_GAIN;
    micRecordingGain.gain.value = SILENT_GAIN;

    // ✅ FIX: Visualizer-Mikrofon deaktivieren und zurück zu Player wechseln
    disconnectMicrophoneSource();
    audioSourceStore.setSourceType('player');

    console.log('[App] ✅ Mikrofon ABGESCHALTET (nur Player)');
    console.log('[App] Gain-Werte: Player:', recordingGain.gain.value, 'Mic:', micRecordingGain.gain.value);
  }

  return true;
}

// Expose für RecorderPanel
window.toggleRecordingMicrophone = toggleRecordingMicrophone;

// ========== VIDEO AUDIO FOR RECORDING ==========

/**
 * ✨ NEU: Verbindet ein Video-Element mit dem Recording-Graph
 * Das Video-Audio wird in den recordingMixer geleitet
 * @param {HTMLVideoElement} videoElement - Das Video-Element
 * @param {number} volume - Initiale Lautstärke (0-1)
 * @returns {boolean} Erfolg
 */
function connectVideoToRecording(videoElement, volume = 1) {
  // Prüfen ob bereits verbunden
  if (videoSourceNodes.has(videoElement)) {
    console.log('[App] Video bereits mit Recording verbunden');
    return true;
  }

  // ✅ FIX: AudioContext initialisieren falls noch nicht vorhanden
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('[App] AudioContext für Video erstellt');
  }

  // ✅ KRITISCHER FIX: AudioContext MUSS resumed sein für Video-Audio!
  // Sobald ein MediaElementSource erstellt wird, läuft das Audio NUR über den AudioContext.
  // Bei suspended AudioContext gibt es keinen Ton.
  if (audioContext.state === 'suspended') {
    console.log('[App] AudioContext für Video resumed...');
    audioContext.resume().catch(e => {
      console.warn('[App] AudioContext resume für Video fehlgeschlagen:', e.message);
    });
  }

  // ✅ FIX: recordingMixer initialisieren falls noch nicht vorhanden
  if (!recordingMixer) {
    recordingMixer = audioContext.createGain();
    recordingMixer.gain.value = 1;

    if (!recordingDest) {
      recordingDest = audioContext.createMediaStreamDestination();
    }
    recordingMixer.connect(recordingDest);
    console.log('[App] recordingMixer für Video erstellt');
  }

  try {
    // VideoRecordingGain erstellen falls nicht vorhanden
    if (!videoRecordingGain) {
      videoRecordingGain = audioContext.createGain();
      videoRecordingGain.gain.value = ACTIVE_GAIN;
      videoRecordingGain.connect(recordingMixer);
      console.log('[App] ✅ Video-Recording-Gain erstellt');
    }

    // MediaElementSource für das Video erstellen
    const sourceNode = audioContext.createMediaElementSource(videoElement);
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;

    // Verbinden: Video → GainNode → Split
    sourceNode.connect(gainNode);

    // → Zum Lautsprecher (direkt zum destination, nicht über outputGain)
    gainNode.connect(audioContext.destination);

    // → Zum Recording-Mixer
    gainNode.connect(videoRecordingGain);

    // Speichern für späteres Disconnect
    videoSourceNodes.set(videoElement, { sourceNode, gainNode });

    console.log('[App] ✅ Video-Audio mit Recording verbunden, Volume:', volume);
    return true;

  } catch (error) {
    console.error('[App] Fehler beim Verbinden des Video-Audios:', error);
    return false;
  }
}

/**
 * Trennt ein Video-Element vom Recording-Graph
 * @param {HTMLVideoElement} videoElement
 */
function disconnectVideoFromRecording(videoElement) {
  const nodes = videoSourceNodes.get(videoElement);
  if (!nodes) return;

  try {
    nodes.gainNode.disconnect();
    // sourceNode kann nicht getrennt werden - wird vom Browser verwaltet
    videoSourceNodes.delete(videoElement);
    console.log('[App] Video-Audio vom Recording getrennt');
  } catch (error) {
    console.warn('[App] Fehler beim Trennen des Video-Audios:', error);
  }
}

/**
 * Setzt die Lautstärke eines verbundenen Videos
 * @param {HTMLVideoElement} videoElement
 * @param {number} volume - Lautstärke (0-1)
 */
function setVideoVolume(videoElement, volume) {
  const nodes = videoSourceNodes.get(videoElement);
  if (nodes && nodes.gainNode) {
    nodes.gainNode.gain.value = volume;
    console.log('[App] Video-Lautstärke gesetzt:', volume);
  }
}

// Expose für VideoPanel
window.connectVideoToRecording = connectVideoToRecording;
window.disconnectVideoFromRecording = disconnectVideoFromRecording;
window.setVideoVolume = setVideoVolume;

/**
 * ✅ NEW: Smooth fade-out for recording audio (prevents click/pop on pause)
 * Uses exponential ramp for natural-sounding fade
 * @param {number} duration - Fade duration in milliseconds (default: 50ms)
 * @returns {Promise} - Resolves when fade is complete
 */
async function fadeOutRecordingAudio(duration = 50) {
  if (!recordingMixer || !audioContext) {
    console.warn('[App] Cannot fade - recordingMixer not available');
    return;
  }

  const now = audioContext.currentTime;
  const fadeTime = duration / 1000; // Convert to seconds

  // Cancel any scheduled changes
  recordingMixer.gain.cancelScheduledValues(now);

  // Set current value explicitly (required before ramp)
  recordingMixer.gain.setValueAtTime(recordingMixer.gain.value, now);

  // Exponential ramp to near-zero (can't ramp to exactly 0)
  recordingMixer.gain.exponentialRampToValueAtTime(0.001, now + fadeTime);

  // Wait for fade to complete
  await new Promise(resolve => setTimeout(resolve, duration));

  // Set to exactly 0 after fade
  recordingMixer.gain.setValueAtTime(0, audioContext.currentTime);

  console.log('[App] 🔇 Recording audio faded out');
}

/**
 * ✅ NEW: Smooth fade-in for recording audio (prevents click/pop on resume)
 * Uses exponential ramp for natural-sounding fade
 * @param {number} duration - Fade duration in milliseconds (default: 50ms)
 * @returns {Promise} - Resolves when fade is complete
 */
async function fadeInRecordingAudio(duration = 50) {
  if (!recordingMixer || !audioContext) {
    console.warn('[App] Cannot fade - recordingMixer not available');
    return;
  }

  const now = audioContext.currentTime;
  const fadeTime = duration / 1000; // Convert to seconds

  // Cancel any scheduled changes
  recordingMixer.gain.cancelScheduledValues(now);

  // Start from near-zero (required for exponential ramp)
  recordingMixer.gain.setValueAtTime(0.001, now);

  // Exponential ramp back to full volume
  recordingMixer.gain.exponentialRampToValueAtTime(1, now + fadeTime);

  // Wait for fade to complete
  await new Promise(resolve => setTimeout(resolve, duration));

  console.log('[App] 🔊 Recording audio faded in');
}

// Expose fade functions for Recorder
window.fadeOutRecordingAudio = fadeOutRecordingAudio;
window.fadeInRecordingAudio = fadeInRecordingAudio;

async function createCombinedAudioStream() {
  // ✨ GEÄNDERT: Immer recordingDest.stream zurückgeben für Live-Umschaltung
  if (!recordingDest) {
    console.error('[App] Recording Destination nicht verfügbar!');
    return null;
  }

  // ✅ KRITISCHER FIX: NICHT auf resume() warten!
  // AudioContext.resume() blockiert UNENDLICH wenn kein User-Gesture vorhanden ist.
  // Stattdessen nur triggern - der AudioContext wird automatisch resumed
  // sobald der User interagiert.
  if (audioContext.state === 'suspended') {
    console.log('[App] AudioContext suspended - triggere resume (nicht blockierend)...');
    audioContext.resume().catch(e => {
      console.warn('[App] AudioContext resume fehlgeschlagen:', e.message);
    });
    // NICHT warten! Weiter mit der Initialisierung.
  }

  // ✨ WICHTIG: IMMER Mic-Recording-Stream VOR dem MediaRecorder-Start einrichten!
  // Der MediaRecorder erkennt neue Audio-Quellen nicht, die NACH dem Start verbunden werden.
  // Deshalb verbinden wir den Mic IMMER, aber mit minimalem Gain wenn Player aktiv ist.
  console.log('[App] Bereite Mic-Recording-Pfad vor (für Live-Umschaltung)...');
  const micConnected = await connectMicToRecordingChain();

  if (!micConnected) {
    console.warn('[App] Mic-Recording-Stream konnte nicht verbunden werden - Live-Umschaltung auf Mic nicht möglich');
  } else {
    console.log('[App] ✅ Mic-Recording-Pfad vorbereitet');
  }

  // ✅ NEUER ANSATZ: Player ist IMMER aktiv, Mic kann zugeschaltet werden
  // Das umgeht das Problem, dass der MediaRecorder Quellwechsel nicht erkennt
  console.log('[App] ⏳ Warmup: Beide Audio-Quellen aktivieren...');
  recordingGain.gain.value = ACTIVE_GAIN;
  micRecordingGain.gain.value = ACTIVE_GAIN;

  // ✨ Kurz warten, damit beide Quellen Audio-Samples liefern
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('[App] ✅ Warmup abgeschlossen');

  // ✅ Standard: Player aktiv, Mic stumm (kann während Aufnahme zugeschaltet werden)
  recordingGain.gain.value = ACTIVE_GAIN;
  micRecordingGain.gain.value = SILENT_GAIN;
  console.log('[App] ✅ Standard-Setup: Player aktiv, Mic bereit zum Zuschalten');

  const stream = recordingDest.stream;
  const tracks = stream.getAudioTracks();

  console.log('[App] Recording-Stream bereit:', tracks.length, 'Audio-Tracks');
  tracks.forEach((track, i) => {
    console.log(`[App] Recording Track ${i}: ${track.label}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
  });
  console.log('[App] recordingGain.gain.value:', recordingGain.gain.value);
  console.log('[App] micRecordingGain.gain.value:', micRecordingGain.gain.value);
  console.log('[App] ✅ Player-Audio aktiv, Mikrofon kann zugeschaltet werden');

  return stream;
}

// ✅ NEU: Debug-Funktion um Recording-Audio-Flow zu prüfen
window.debugRecordingAudio = function() {
  console.log('=== RECORDING AUDIO DEBUG ===');
  console.log('AudioContext State:', audioContext?.state);
  console.log('AudioContext Sample Rate:', audioContext?.sampleRate);
  console.log('recordingGain.gain.value:', recordingGain?.gain.value, '(Player)');
  console.log('micRecordingGain.gain.value:', micRecordingGain?.gain.value, '(Mic)');
  console.log('recordingMixer.gain.value:', recordingMixer?.gain.value);
  console.log('micRecordingSourceNode:', micRecordingSourceNode ? 'connected' : 'null');
  console.log('Audio-Graph: [Player→recordingGain] + [Mic→micRecordingGain] → recordingMixer → recordingDest');
  console.log('💡 Player ist IMMER aktiv, Mic kann zugeschaltet werden');

  if (recordingDest) {
    const tracks = recordingDest.stream.getAudioTracks();
    console.log('recordingDest tracks:', tracks.length);
    tracks.forEach((t, i) => {
      console.log(`  Track ${i}: ${t.label}, enabled: ${t.enabled}, readyState: ${t.readyState}`);
    });
  }

  // ✨ NEU: Separater Recording-Mic-Stream
  if (micRecordingStream) {
    const recMicTracks = micRecordingStream.getAudioTracks();
    console.log('Recording Mic stream (SEPARATE):', recMicTracks.length, 'tracks');
    recMicTracks.forEach((t, i) => {
      console.log(`  Rec Mic Track ${i}: ${t.label}, enabled: ${t.enabled}, readyState: ${t.readyState}`);
    });
  } else {
    console.log('Recording Mic stream: null (nicht aktiv)');
  }

  // Visualizer Mic stream (separat)
  if (audioSourceStore.microphoneStream) {
    const visMicTracks = audioSourceStore.microphoneStream.getAudioTracks();
    console.log('Visualizer Mic stream:', visMicTracks.length, 'tracks');
    visMicTracks.forEach((t, i) => {
      console.log(`  Vis Mic Track ${i}: ${t.label}, enabled: ${t.enabled}, readyState: ${t.readyState}`);
    });
  }

  console.log('=== END DEBUG ===');
};

window.getAudioStreamForRecorder = createCombinedAudioStream;

/**
 * ✨ NEU: Screenshot-Funktion für reinen Canvas-Inhalt (ohne UI-Elemente)
 * Rendert die Szene wie beim Recording - ohne Workspace-Rahmen, Labels etc.
 * ✅ FIX: Respektiert Workspace-Bereich korrekt
 * @param {string} mimeType - 'image/png', 'image/jpeg', oder 'image/webp'
 * @param {number} quality - Qualität für JPEG/WebP (0-1)
 * @returns {Promise<Blob>} - Screenshot als Blob
 */
window.takeCanvasScreenshot = async function(mimeType = 'image/png', quality = 0.9) {
  console.log('[App] takeCanvasScreenshot aufgerufen:', mimeType, quality);

  const canvas = canvasRef.value;
  if (!canvas) {
    console.error('[App] Canvas nicht verfügbar');
    return null;
  }

  // Screenshot-Canvas erstellen
  const screenshotCanvas = document.createElement('canvas');

  // Wenn ein Workspace-Preset aktiv ist, verwende dessen Dimensionen
  let targetWidth = canvas.width;
  let targetHeight = canvas.height;

  if (canvasManagerInstance.value?.workspacePreset) {
    const preset = canvasManagerInstance.value.socialMediaPresets[canvasManagerInstance.value.workspacePreset];
    if (preset) {
      targetWidth = preset.width;
      targetHeight = preset.height;
    }
  }

  screenshotCanvas.width = targetWidth;
  screenshotCanvas.height = targetHeight;

  const ctx = screenshotCanvas.getContext('2d');

  // ✅ Höchste Bildqualität
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Visualizer-Callback für Screenshot erstellen
  // ✅ FIX: Multi-Layer-Modus unterstützen
  let drawVisualizerCallback = null;

  if (visualizerStore.showVisualizer) {
    if (visualizerStore.multiLayerMode && multiLayerCompositeCanvas) {
      // ✅ MULTI-LAYER MODE: Verwende das vorkombinierte Multi-Layer-Canvas
      drawVisualizerCallback = (vizCtx, vizWidth, vizHeight) => {
        // Multi-Layer-Canvas hat bereits alle Layer mit ihren individuellen
        // Positionen, Skalierungen und Blend-Modi kombiniert
        if (vizWidth === multiLayerCompositeCanvas.width && vizHeight === multiLayerCompositeCanvas.height) {
          vizCtx.drawImage(multiLayerCompositeCanvas, 0, 0);
        } else {
          vizCtx.drawImage(multiLayerCompositeCanvas, 0, 0, vizWidth, vizHeight);
        }
      };
    } else if (visualizerCacheCanvas) {
      // SINGLE MODE: Verwende das Single-Visualizer-Cache-Canvas
      drawVisualizerCallback = (vizCtx, vizWidth, vizHeight) => {
        const scale = visualizerStore.visualizerScale;
        const posX = visualizerStore.visualizerX;
        const posY = visualizerStore.visualizerY;

        const scaledWidth = vizWidth * scale;
        const scaledHeight = vizHeight * scale;
        const destX = vizWidth * posX - scaledWidth / 2;
        const destY = vizHeight * posY - scaledHeight / 2;

        if (scale !== 1.0 || posX !== 0.5 || posY !== 0.5) {
          vizCtx.drawImage(
            visualizerCacheCanvas,
            0, 0, visualizerCacheCanvas.width, visualizerCacheCanvas.height,
            destX, destY, scaledWidth, scaledHeight
          );
        } else {
          vizCtx.drawImage(visualizerCacheCanvas, 0, 0, vizWidth, vizHeight);
        }
      };
    }
  }

  // ✅ FIX: renderRecordingScene nutzen - respektiert Workspace-Bereich korrekt
  renderRecordingScene(ctx, targetWidth, targetHeight, drawVisualizerCallback);

  // Als Blob exportieren
  return new Promise((resolve, reject) => {
    screenshotCanvas.toBlob(
      (blob) => {
        if (blob) {
          console.log('[App] Screenshot erstellt:', blob.size, 'bytes');
          resolve(blob);
        } else {
          reject(new Error('Failed to create screenshot blob'));
        }
      },
      mimeType,
      mimeType === 'image/png' ? undefined : quality
    );
  });
};

window.getCanvasStreamForRecorder = function() {
  console.log('[App] getCanvasStreamForRecorder() aufgerufen');

  if (recordingCanvasStream) {
    recordingCanvasStream.getTracks().forEach(track => track.stop());
    console.log('[App] Alter Canvas-Stream gestoppt');
  }

  // Use 0 FPS (manual mode) - frames are captured via requestFrame()
  recordingCanvasStream = recordingCanvas.captureStream(0);
  console.log('[App] Neuer Canvas-Stream erstellt (manual mode, 0 FPS)');

  return recordingCanvasStream;
};

async function initializeRecorder() {
  console.log('[App] Initialisiere Recorder...');

  const canvas = canvasRef.value;
  if (!canvas) {
    console.warn('[App] Canvas nicht verfügbar - Recorder-Initialisierung abgebrochen');
    return;
  }
  recordingCanvas.width = canvas.width || 1920;
  recordingCanvas.height = canvas.height || 1080;

  applyRecordingCanvasMonkeyPatch(recordingCanvas);

  const canvasStream = recordingCanvas.captureStream(60);
  console.log('[App] Canvas-Stream erstellt (60 FPS)');

  const audio = audioRef.value;
  if (!audio) {
    console.error('[App] Audio Element nicht gefunden!');
    return;
  }

  const combinedAudioStream = await createCombinedAudioStream();
  if (!combinedAudioStream) {
    console.error('[App] Kombinierter Stream konnte nicht erstellt werden!');
    return;
  }

  const videoTracks = canvasStream.getVideoTracks();
  const audioTracks = combinedAudioStream.getAudioTracks();
  const combinedMediaStream = new MediaStream([...videoTracks, ...audioTracks]);

  console.log('[App] Kombinierter MediaStream erstellt:',
    videoTracks.length, 'Video,', audioTracks.length, 'Audio');

  console.log('[App] Setze Recorder-Refs im Store...');
  const success = recorderStore.setRecorderRefs(
    recordingCanvas,
    audio,
    combinedMediaStream,
    null
  );

  if (success) {
    console.log('[App] Recorder erfolgreich initialisiert');
  } else {
    console.error('[App] Recorder-Initialisierung fehlgeschlagen!');
  }
}

// ========== SHARED FILES RECEIVER ==========
async function loadSharedFiles() {
  if (sharedFilesHandled) return;
  sharedFilesHandled = true;

  try {
    const records = await getSharedFiles();

    if (!records?.length) {
      sharedBanner.value = { type: 'warning', message: t('toast.sharedFilesEmpty') };
      setTimeout(() => { sharedBanner.value = null }, 5000);
      return;
    }

    sharedBanner.value = {
      type: 'info',
      message: t('toast.sharedFilesLoading').replace('{count}', records.length)
    };

    const processed = playerStore.addTracksFromBlobs(records);

    if (processed > 0) {
      sharedBanner.value = {
        type: 'success',
        message: t('toast.sharedFilesLoaded').replace('{count}', processed)
      };
      await clearSharedFiles();
    } else {
      sharedBanner.value = { type: 'warning', message: t('toast.sharedFilesEmpty') };
    }
  } catch (error) {
    console.error('[App] Shared files import error:', error);
    sharedBanner.value = { type: 'error', message: t('toast.sharedFilesError') };
  }

  setTimeout(() => { sharedBanner.value = null }, 5000);
}

// Primary: after router is ready
router.isReady().then(() => {
  if (route.query.source === 'audiokonverter') loadSharedFiles();
});

// Fallback: route watcher
watch(() => route.query.source, (s) => {
  if (s === 'audiokonverter') loadSharedFiles();
});

onMounted(async () => {
  console.log('[App] onMounted - Starte Initialisierung...');

  // ✅ KRITISCHER FIX: Watcher für Canvas-Verfügbarkeit SOFORT registrieren
  // Muss VOR allen await-Aufrufen passieren, damit wir keine Änderungen verpassen!
  watch(
    () => canvasRef.value,
    (newCanvas) => {
      if (newCanvas && !canvasInitialized) {
        console.log('[App] ✅ Canvas jetzt verfügbar (via Watcher) - starte Initialisierung');
        initializeCanvas(newCanvas);
      }
    },
    { immediate: true }
  );

  console.log('[App] Initialisiere Web Workers...');
  try {
    const workerStatus = await workerManager.initAll();
    useAudioWorker = workerStatus.audio;

    if (useAudioWorker) {
      workerManager.onAudioData(applyAudioData);
      console.log('[App] Audio Worker aktiviert - Main Thread entlastet');
    } else {
      console.log('[App] Audio Worker nicht verfügbar - Fallback aktiv');
    }

    console.log('[App] Worker Status:', workerStatus);
  } catch (error) {
    console.warn('[App] Worker-Initialisierung fehlgeschlagen:', error);
    useAudioWorker = false;
  }

  console.log('Initialisiere FontManager...');
  fontManagerInstance.value = new FontManager();
  try {
    const result = await fontManagerInstance.value.initialize(CUSTOM_FONTS);
    console.log(`FontManager: ${result.loaded} Fonts geladen`);
  } catch (error) {
    console.error('FontManager Fehler:', error);
  }

  playerStore.setAudioRef(audioRef.value);
  if (audioRef.value) {
    audioRef.value.addEventListener('play', () => {
      playerStore.isPlaying = true;
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      enableRecorderAudio();
    });
    audioRef.value.addEventListener('pause', () => {
      playerStore.isPlaying = false;
      disableRecorderAudio();
    });
    audioRef.value.addEventListener('ended', () => {
      playerStore.nextTrack();
      disableRecorderAudio();
    });
  }

  console.log('Initialisiere Audio-Context für Recorder...');
  setupAudioContext();
  console.log('Audio-Context bereit - recordingDest verfügbar');

  // ✅ KRITISCHER FIX: Event-Listener für recorder:forceRedraw
  // Der Recorder ruft onForceRedraw() auf, was dieses Event dispatcht.
  // Wir müssen den Recording-Canvas SYNCHRON aktualisieren BEVOR requestFrame() aufgerufen wird.
  window.addEventListener('recorder:forceRedraw', () => {
    if (!recorderStore.isRecording || !recordingCanvas) return;

    const recordingCtx = recordingCanvas.getContext('2d');
    if (!recordingCtx) return;

    // ✅ FIX: Support both multi-layer and single mode (like screenshot function)
    let drawVisualizerCallback = null;

    if (visualizerStore.showVisualizer) {
      if (visualizerStore.multiLayerMode && multiLayerCompositeCanvas) {
        // ✅ MULTI-LAYER MODE: Use the pre-composited multi-layer canvas
        drawVisualizerCallback = (vizCtx, vizWidth, vizHeight) => {
          if (vizWidth === multiLayerCompositeCanvas.width && vizHeight === multiLayerCompositeCanvas.height) {
            vizCtx.drawImage(multiLayerCompositeCanvas, 0, 0);
          } else {
            vizCtx.drawImage(multiLayerCompositeCanvas, 0, 0, vizWidth, vizHeight);
          }
        };
      } else if (visualizerCacheCanvas) {
        // SINGLE MODE: Use the single-visualizer cache canvas with scale/position
        drawVisualizerCallback = (targetCtx, width, height) => {
          const scale = visualizerStore.visualizerScale;
          const posX = visualizerStore.visualizerX;
          const posY = visualizerStore.visualizerY;

          const scaledWidth = visualizerCacheCanvas.width * scale;
          const scaledHeight = visualizerCacheCanvas.height * scale;

          const destX = width * posX - scaledWidth / 2;
          const destY = height * posY - scaledHeight / 2;

          if (scale !== 1.0 || posX !== 0.5 || posY !== 0.5) {
            targetCtx.drawImage(
              visualizerCacheCanvas,
              0, 0, visualizerCacheCanvas.width, visualizerCacheCanvas.height,
              destX, destY, scaledWidth, scaledHeight
            );
          } else {
            targetCtx.drawImage(visualizerCacheCanvas, 0, 0, width, height);
          }
        };
      }
    }

    // Rendere die Szene auf den Recording-Canvas
    renderRecordingScene(recordingCtx, recordingCanvas.width, recordingCanvas.height, drawVisualizerCallback);
  });
  console.log('[App] recorder:forceRedraw Event-Listener registriert');

  window.setBassGain = setBassGain;
  window.setTrebleGain = setTrebleGain;

  // ✅ KRITISCHER FIX: Canvas-Initialisierung mit Fallback
  // Versuche die Initialisierung sofort
  const canvas = canvasRef.value;
  if (canvas) {
    initializeCanvas(canvas);
  } else {
    console.warn('[App] ⚠️ Canvas noch nicht verfügbar - warte auf Verfügbarkeit...');
  }

  // ✅ Grid-Watcher (AUSSERHALB des if-Blocks, damit er immer registriert wird)
  watch(() => gridStore.isVisible, (newValue) => {
    if (gridManagerInstance.value) {
      gridManagerInstance.value.setVisibility(newValue);
    }
  }, { immediate: true });

  // ✅ Workspace-Preset-Watcher (AUSSERHALB des if-Blocks)
  watch(() => workspaceStore.selectedPresetKey, (newKey) => {
    const canvas = canvasRef.value;
    if (!canvas || !canvasManagerInstance.value) return;

    canvasManagerInstance.value.setWorkspacePreset(newKey);

    if (newKey) {
      const socialMediaPresets = {
        'tiktok': { width: 1080, height: 1920 },
        'instagram-story': { width: 1080, height: 1920 },
        'instagram-post': { width: 1080, height: 1080 },
        'instagram-reel': { width: 1080, height: 1920 },
        'youtube-short': { width: 1080, height: 1920 },
        'youtube-video': { width: 1920, height: 1080 },
        'facebook-post': { width: 1200, height: 630 },
        'twitter-video': { width: 1280, height: 720 },
        'linkedin-video': { width: 1920, height: 1080 }
      };

      if (socialMediaPresets[newKey]) {
        canvas.width = socialMediaPresets[newKey].width;
        canvas.height = socialMediaPresets[newKey].height;

        if (recordingCanvas) {
          recordingCanvas.width = canvas.width;
          recordingCanvas.height = canvas.height;
        }

        console.log(`Canvas-Größe geändert zu: ${canvas.width}x${canvas.height}`);

        const visualizer = Visualizers[visualizerStore.selectedVisualizer];
        if (visualizer?.init) {
          visualizer.init(canvas.width, canvas.height);
          console.log(`Visualizer "${visualizerStore.selectedVisualizer}" re-initialisiert`);
        }
      }
    } else {
      canvas.width = 1920;
      canvas.height = 1080;

      if (recordingCanvas) {
        recordingCanvas.width = 1920;
        recordingCanvas.height = 1080;
      }

      const visualizer = Visualizers[visualizerStore.selectedVisualizer];
      if (visualizer?.init) {
        visualizer.init(canvas.width, canvas.height);
        console.log(`Visualizer "${visualizerStore.selectedVisualizer}" re-initialisiert`);
      }

      console.log(`Canvas zurück zu Standard: 1920x1080`);
    }
  }, { immediate: true });

  console.log('[App] Versuche KeyboardShortcuts zu initialisieren...');
  console.log('[App] canvasManagerInstance.value:', !!canvasManagerInstance.value);
  console.log('[App] multiImageManagerInstance.value:', !!multiImageManagerInstance.value);

  // ✅ FIX: Keyboard-Shortcuts Initialisierungsfunktion
  function initKeyboardShortcuts() {
    if (keyboardShortcutsInstance.value) return; // Bereits initialisiert
    if (!canvasManagerInstance.value || !multiImageManagerInstance.value) return;

    keyboardShortcutsInstance.value = new KeyboardShortcuts(
      { playerStore, recorderStore, gridStore },
      {
        canvasManager: canvasManagerInstance.value,
        multiImageManager: multiImageManagerInstance.value
      }
    );
    keyboardShortcutsInstance.value.enable();
    console.log('[App] ✅ Keyboard Shortcuts aktiviert');
  }

  // Versuche sofortige Initialisierung
  initKeyboardShortcuts();

  // ✅ FIX: Falls Manager noch nicht bereit, warte auf sie
  if (!keyboardShortcutsInstance.value) {
    console.log('[App] Keyboard Shortcuts warten auf Manager-Initialisierung...');
    watch(
      () => [canvasManagerInstance.value, multiImageManagerInstance.value],
      () => {
        if (!keyboardShortcutsInstance.value) {
          initKeyboardShortcuts();
        }
      }
    );
  }

  await initializeRecorder();

  watch(() => [canvasRef.value?.width, canvasRef.value?.height], ([width, height]) => {
    if (width && height) {
      recordingCanvas.width = width;
      recordingCanvas.height = height;
      console.log('[App] Recording Canvas Dimensionen aktualisiert:', width, 'x', height);
    }
  });

  draw();

  watch(() => recorderStore.isRecording, (isRecording) => {
    if (isRecording) {
      console.log('[App] Recording gestartet');
      setTimeout(() => {
        startVisualizerLoop();
      }, 100);
    } else {
      console.log('[App] Recording gestoppt');
      stopVisualizerLoop();

      // ✅ FIX: Mic-Gain zurücksetzen BEVOR Stream getrennt wird
      if (micRecordingGain) {
        micRecordingGain.gain.value = SILENT_GAIN;
        console.log('[App] Mic-Gain zurückgesetzt auf SILENT');
      }

      // ✨ Recording Mic Stream stoppen
      disconnectMicFromRecordingChain();
      console.log('[App] Recording Mic Stream bereinigt');

      // ✅ FIX: Visualizer-Mikrofon deaktivieren wenn aktiv
      if (audioSourceStore.isMicrophoneActive) {
        disconnectMicrophoneSource();
        audioSourceStore.setSourceType('player');
        console.log('[App] Visualizer-Mikrofon nach Recording-Ende zurückgesetzt');
      }

      console.log('[App] Erstelle Recording Canvas neu...');

      if (recordingCanvasStream) {
        recordingCanvasStream.getTracks().forEach(track => track.stop());
        recordingCanvasStream = null;
      }

      const canvas = canvasRef.value;
      recordingCanvas = document.createElement('canvas');
      recordingCanvas.width = canvas?.width || 1920;
      recordingCanvas.height = canvas?.height || 1080;

      console.log('[App] Frischer Recording Canvas erstellt:', recordingCanvas.width, 'x', recordingCanvas.height);

      applyRecordingCanvasMonkeyPatch(recordingCanvas);

      if (recorderStore.recorder) {
        const updated = recorderStore.recorder.updateCanvas(recordingCanvas);
        if (updated) {
          console.log('[App] Recorder mit neuem Canvas aktualisiert');
        } else {
          console.warn('[App] Recorder konnte nicht aktualisiert werden');
        }
      }

      // ✅ Bilder und Texte bleiben nach Recording erhalten
      // Löschung nur über expliziten "Alle löschen" Button oder Canvas zurücksetzen
      console.log('[App] Recording beendet - Bilder/Texte bleiben erhalten');
    }
  });

  console.log('[App] Initialisierung abgeschlossen');
});

onUnmounted(() => {
  console.log('[App] Component wird unmounted - Cleanup...');

  stopVisualizerLoop();

  // Cleanup recording microphone stream
  disconnectMicFromRecordingChain();
  console.log('[App] Recording Mic cleanup completed');

  // Cleanup visualization microphone
  disconnectMicrophoneSource();
  console.log('[App] Microphone cleanup completed');

  if (recordingCanvasStream) {
    recordingCanvasStream.getTracks().forEach(track => {
      if (track.readyState !== 'ended') {
        track.stop();
      }
    });
    recordingCanvasStream = null;
    console.log('[App] Canvas-Stream gestoppt und entfernt');
  }

  if (keyboardShortcutsInstance.value) {
    keyboardShortcutsInstance.value.destroy();
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // ✅ FIX: Also clear the fallback timeout
  if (drawTimeoutId) {
    clearTimeout(drawTimeoutId);
  }

  workerManager.terminate();
  console.log('[App] Web Workers beendet');

  if (audioContext) {
    audioContext.close();
  }
});
</script>

<style>
/* Dieser globale Style-Block ist korrekt. */
*, *::before, *::after {
  box-sizing: border-box;
}
html, body {
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
  color: var(--text-primary, #E9E9EB);
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
  background-color: var(--primary-bg, #091428); /* Dunkler Hintergrund für das gesamte Layout */
}
.left-toolbar, .center-column, .right-panel {
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.left-toolbar, .right-panel {
  overflow-y: auto;
  overflow-x: hidden;
}
.center-column {
  min-width: 0;
  overflow: hidden;
  background-color: var(--primary-bg, #091428); /* Dunkler Hintergrund für den Mittelbereich */
}

/* Scrollbar Styling für die Side-Panels */
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

/* ═══ Light Theme Overrides (Global) ═══ */
[data-theme='light'] .canvas-images-scroll::-webkit-scrollbar-track {
  background: rgba(201, 152, 77, 0.08);
}
[data-theme='light'] .canvas-images-scroll::-webkit-scrollbar-thumb {
  background: #c9984d;
}
[data-theme='light'] .canvas-images-scroll::-webkit-scrollbar-thumb:hover {
  background: #014f99;
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
/* Panel Styles */
.left-toolbar, .right-panel {
  background-color: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  padding: 10px;
  gap: 10px;
}

/* ZUSÄTZLICHER PLATZ am Ende für Dropdown-Inhalte */
.right-panel {
  padding-bottom: 80px;
}

.canvas-wrapper {
  flex-grow: 1;
  background-color: var(--card-bg, #142640); /* Dunkler Hintergrund passend zu den Sidebars */
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
  background-color: transparent; /* Transparent, damit der Canvas-Hintergrund sichtbar ist */
}

/* CANVAS-BILDER LEISTE (horizontal scrollbar) */

.canvas-images-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(201, 152, 77, 0.08) 100%);
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 6px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid var(--accent-primary, #c9984d);
}

.canvas-images-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent-primary, #c9984d);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.canvas-images-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 0;
  flex-grow: 1;
}

/* Horizontale Scrollbar */
.canvas-images-scroll::-webkit-scrollbar {
  height: 6px;
}

.canvas-images-scroll::-webkit-scrollbar-track {
  background: var(--secondary-bg, #0E1C32);
  border-radius: 3px;
}

.canvas-images-scroll::-webkit-scrollbar-thumb {
  background: var(--text-muted, #7A8DA0);
  border-radius: 3px;
}

.canvas-images-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--accent-primary, #c9984d);
}

.canvas-thumb {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 5px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--border-color, rgba(201, 152, 77, 0.3));
  transition: all 0.2s ease;
  background-color: var(--secondary-bg, #0E1C32);
  flex-shrink: 0;
}

.canvas-thumb:hover {
  border-color: var(--accent-primary, #c9984d);
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(201, 152, 77, 0.4);
}

.canvas-thumb.selected {
  border-color: var(--accent-primary, #c9984d);
  box-shadow: 0 0 0 2px rgba(201, 152, 77, 0.5), 0 4px 12px rgba(201, 152, 77, 0.4);
}

/* Drag & Drop States */
.canvas-thumb[draggable="true"] {
  cursor: grab;
}

.canvas-thumb[draggable="true"]:active {
  cursor: grabbing;
}

.canvas-thumb.dragging {
  opacity: 0.5;
  transform: scale(0.95);
  border-color: var(--accent-primary, #c9984d);
  box-shadow: 0 0 0 2px rgba(201, 152, 77, 0.3);
}

.canvas-thumb.drag-over {
  border-color: #4ade80;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.5), 0 4px 16px rgba(74, 222, 128, 0.4);
  transform: scale(1.1);
}

.canvas-thumb.drag-over::before {
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border: 2px dashed #4ade80;
  border-radius: 7px;
  pointer-events: none;
  animation: dragPulse 0.8s ease-in-out infinite;
}

@keyframes dragPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.canvas-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.canvas-thumb-layer {
  position: absolute;
  bottom: 2px;
  left: 2px;
  background: rgba(201, 152, 77, 0.95);
  color: #E9E9EB;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  min-width: 12px;
  text-align: center;
}

/* Thumbnail Delete Button */
.canvas-thumb-delete {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 69, 58, 0.95);
  border: 2px solid var(--card-bg, #142640);
  color: white;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 10;
}

.canvas-thumb:hover .canvas-thumb-delete {
  opacity: 1;
  transform: scale(1);
}

.canvas-thumb-delete:hover {
  background: #ff453a;
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(255, 69, 58, 0.5);
}

/* Clear All Button */
.canvas-images-clear-all {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 69, 58, 0.15);
  border: 1px solid rgba(255, 69, 58, 0.4);
  border-radius: 5px;
  color: #ff6b6b;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  white-space: nowrap;
}

.canvas-images-clear-all:hover {
  background: rgba(255, 69, 58, 0.25);
  border-color: rgba(255, 69, 58, 0.6);
  color: #ff453a;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(255, 69, 58, 0.3);
}

.canvas-images-clear-all .clear-all-icon {
  font-size: 0.7rem;
}

.canvas-images-clear-all .clear-all-text {
  display: inline;
}

/* Image Preview Modal */
.image-preview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.image-preview-modal {
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(20, 38, 64, 0.98) 100%);
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(201, 152, 77, 0.2);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
  animation: modalSlideIn 0.25s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.preview-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.preview-modal-close:hover {
  background: rgba(255, 69, 58, 0.8);
  border-color: rgba(255, 69, 58, 0.9);
  transform: rotate(90deg);
}

.preview-modal-content {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.preview-modal-image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 300px;
  max-height: 60vh;
  background: rgba(0, 0, 0, 0.3);
}

.preview-modal-image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.preview-modal-info {
  padding: 20px 24px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.preview-modal-info h3 {
  margin: 0 0 16px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-primary, #c9984d);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.preview-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-info-label {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--text-muted, #7A8DA0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.preview-info-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: #E9E9EB;
  font-family: 'SF Mono', 'Monaco', monospace;
}

/* Preview Modal Actions */
.preview-modal-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
  display: flex;
  justify-content: center;
}

.btn-replace-canvas-image {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-replace-canvas-image:hover {
  background: rgba(74, 222, 128, 0.2);
  border-color: rgba(74, 222, 128, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.2);
}

.btn-replace-canvas-image.btn-gallery {
  color: #c4b5fd;
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(139, 92, 246, 0.3);
}

.btn-replace-canvas-image.btn-gallery:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

.replace-with-label {
  display: block;
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.replace-buttons-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ═══════════════════════════════════════════════════════════════
   PENDING REPLACE PREVIEW
   ═══════════════════════════════════════════════════════════════ */

.pending-replace-preview {
  margin-top: 20px;
  padding: 15px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px dashed rgba(34, 197, 94, 0.4);
  border-radius: 12px;
}

.pending-replace-header {
  margin-bottom: 12px;
}

.pending-replace-label {
  font-size: 0.75rem;
  color: #22c55e;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pending-replace-image-container {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
}

.pending-replace-image {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
  border-radius: 8px;
  border: 2px solid rgba(34, 197, 94, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.pending-replace-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-cancel-replace {
  padding: 8px 16px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel-replace:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.btn-confirm-replace {
  padding: 8px 20px;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.btn-confirm-replace:hover {
  background: linear-gradient(135deg, #16a34a, #15803d);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  transform: translateY(-1px);
}

/* ═══════════════════════════════════════════════════════════════
   REPLACE GALLERY MODAL
   ═══════════════════════════════════════════════════════════════ */

.replace-gallery-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  animation: fadeIn 0.2s ease;
}

.replace-gallery-modal {
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(20, 38, 64, 0.98) 100%);
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  width: 90vw;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: modalSlideIn 0.25s ease;
}

.replace-gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.replace-gallery-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-primary, #c9984d);
}

.replace-gallery-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.replace-gallery-close:hover {
  background: rgba(255, 69, 58, 0.3);
  border-color: rgba(255, 69, 58, 0.5);
}

.replace-gallery-categories {
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
  overflow-x: auto;
  scrollbar-width: thin;
}

.replace-category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid rgba(201, 152, 77, 0.2);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.replace-category-tab:hover {
  background: rgba(201, 152, 77, 0.15);
  color: var(--text-secondary);
}

.replace-category-tab.active {
  background: rgba(201, 152, 77, 0.25);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-primary, #c9984d);
}

.category-icon {
  font-size: 1rem;
}

.category-name {
  font-size: 0.75rem;
}

.replace-gallery-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 200px;
}

.replace-gallery-loading,
.replace-gallery-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.replace-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.replace-gallery-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  position: relative;
}

.replace-gallery-item:hover {
  border-color: rgba(201, 152, 77, 0.5);
  transform: scale(1.03);
}

.replace-gallery-item.selected {
  border-color: #4ade80;
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.3);
}

.replace-gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.replace-gallery-item-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 0.65rem;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.replace-gallery-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.replace-gallery-footer .btn-cancel {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.replace-gallery-footer .btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.replace-gallery-footer .btn-confirm {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid rgba(74, 222, 128, 0.4);
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.replace-gallery-footer .btn-confirm:hover:not(:disabled) {
  background: rgba(74, 222, 128, 0.25);
  transform: translateY(-1px);
}

.replace-gallery-footer .btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive adjustments for preview modal */
@media (max-width: 600px) {
  .preview-info-grid {
    grid-template-columns: 1fr;
  }

  .canvas-images-clear-all .clear-all-text {
    display: none;
  }
}

/* ═══════════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES
   ═══════════════════════════════════════════════════════════════ */

/* Canvas images bar */
[data-theme='light'] .canvas-images-bar {
  background: linear-gradient(180deg, #FFFFFF 0%, rgba(1, 79, 153, 0.04) 100%);
  border-color: rgba(201, 152, 77, 0.25);
  border-left-color: #014f99;
}
[data-theme='light'] .canvas-images-label {
  color: #014f99;
}

/* Thumbnails */
[data-theme='light'] .canvas-thumb {
  background-color: #f9f2d5;
  border-color: rgba(201, 152, 77, 0.3);
}
[data-theme='light'] .canvas-thumb:hover {
  border-color: #014f99;
  box-shadow: 0 4px 12px rgba(1, 79, 153, 0.25);
}
[data-theme='light'] .canvas-thumb.selected {
  border-color: #014f99;
  box-shadow: 0 0 0 2px rgba(1, 79, 153, 0.35), 0 4px 12px rgba(1, 79, 153, 0.2);
}
[data-theme='light'] .canvas-thumb.dragging {
  border-color: #014f99;
  box-shadow: 0 0 0 2px rgba(1, 79, 153, 0.25);
}
[data-theme='light'] .canvas-thumb-layer {
  background: rgba(1, 79, 153, 0.9);
  color: #F5F4D6;
}
[data-theme='light'] .canvas-thumb-delete {
  border-color: #FFFFFF;
}

/* Image Preview Modal */
[data-theme='light'] .image-preview-modal {
  background: linear-gradient(180deg, #FFFFFF 0%, rgba(249, 242, 213, 0.98) 100%);
  border-color: rgba(201, 152, 77, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(201, 152, 77, 0.15);
}
[data-theme='light'] .preview-modal-close {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.15);
  color: #003971;
}
[data-theme='light'] .preview-modal-close:hover {
  background: rgba(255, 69, 58, 0.8);
  color: #fff;
}
[data-theme='light'] .preview-modal-image-container {
  background: rgba(0, 0, 0, 0.03);
}
[data-theme='light'] .preview-info-value {
  color: #003971;
}

/* Replace Gallery Modal */
[data-theme='light'] .replace-gallery-modal {
  background: linear-gradient(180deg, #FFFFFF 0%, rgba(249, 242, 213, 0.98) 100%);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
}
[data-theme='light'] .replace-gallery-close {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.15);
  color: #003971;
}
[data-theme='light'] .replace-gallery-close:hover {
  background: rgba(255, 69, 58, 0.15);
  color: #ef4444;
}
[data-theme='light'] .replace-category-tab {
  border-color: rgba(201, 152, 77, 0.25);
  background: rgba(249, 242, 213, 0.5);
  color: #4d6d8e;
}
[data-theme='light'] .replace-category-tab:hover {
  background: rgba(1, 79, 153, 0.06);
  color: #003971;
}
[data-theme='light'] .replace-category-tab.active {
  background: rgba(1, 79, 153, 0.1);
  border-color: #014f99;
  color: #014f99;
}
[data-theme='light'] .replace-gallery-item {
  background: rgba(0, 0, 0, 0.03);
}
[data-theme='light'] .replace-gallery-item:hover {
  border-color: rgba(1, 79, 153, 0.5);
}
[data-theme='light'] .replace-gallery-loading,
[data-theme='light'] .replace-gallery-empty {
  color: #4d6d8e;
}
[data-theme='light'] .replace-gallery-footer .btn-cancel {
  border-color: rgba(0, 57, 113, 0.2);
  background: rgba(0, 57, 113, 0.04);
  color: #4d6d8e;
}
[data-theme='light'] .replace-gallery-footer .btn-cancel:hover {
  background: rgba(0, 57, 113, 0.08);
  color: #003971;
}
[data-theme='light'] .replace-with-label {
  color: #4d6d8e;
}

/* ═══════════════════════════════════════════════════════════════
   MOBILE PANEL TOGGLE BAR
   ═══════════════════════════════════════════════════════════════ */
.mobile-panel-bar {
  display: none;
}

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE BREAKPOINTS
   ═══════════════════════════════════════════════════════════════ */

/* Tablet Portrait (< 1024px): Schmalere Sidebars */
@media (max-width: 1024px) {
  .layout-grid {
    grid-template-columns: 280px 1fr 280px;
    gap: 8px;
    padding: 8px;
  }
}

/* Small Tablet / Large Phone Landscape (< 768px): Single column + Toggle */
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
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    min-height: 44px;
    background: var(--secondary-bg, #0E1C32);
    border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
    border-radius: 8px;
    color: var(--text-muted, #7A8DA0);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mobile-panel-btn.active {
    background: var(--accent-primary, #c9984d);
    color: var(--accent-text, #091428);
    border-color: var(--accent-primary, #c9984d);
  }

  .mobile-panel-icon {
    font-size: 1rem;
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

  /* Light Theme Mobile Overrides */
  [data-theme='light'] .mobile-panel-btn {
    background: #FDFBF2;
    color: #4d6d8e;
    border-color: var(--border-color);
  }

  [data-theme='light'] .mobile-panel-btn.active {
    background: #014f99;
    color: #F5F4D6;
    border-color: #014f99;
  }
}

/* Phone (< 480px): Tighter spacing */
@media (max-width: 480px) {
  .mobile-panel-bar {
    padding: 4px 6px;
  }

  .mobile-panel-btn {
    padding: 8px 4px;
    font-size: 0.65rem;
    gap: 4px;
  }

  .mobile-panel-label {
    display: none;
  }

  .mobile-panel-icon {
    font-size: 1.2rem;
  }

  .left-toolbar,
  .right-panel {
    padding: 6px;
    gap: 6px;
  }

  .canvas-images-bar {
    padding: 4px 6px;
    gap: 6px;
  }

  .canvas-images-label {
    font-size: 0.55rem;
  }

  .canvas-thumb {
    width: 36px;
    height: 36px;
  }

  .image-preview-modal {
    max-width: 95vw;
    max-height: 95vh;
    border-radius: 8px;
  }

  .preview-modal-image-container {
    padding: 10px;
    min-height: 200px;
  }

  .preview-modal-info {
    padding: 12px;
  }
}

/* ========== SHARED FILES BANNER ========== */
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
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.shared-banner-success {
  background-color: rgba(197, 222, 176, 0.15);
  border: 1px solid rgba(197, 222, 176, 0.4);
  color: var(--success, #C5DEB0);
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

/* Light theme overrides */
[data-theme='light'] .shared-banner-success {
  background-color: rgba(56, 142, 60, 0.1);
  border-color: rgba(56, 142, 60, 0.3);
  color: #388E3C;
}

[data-theme='light'] .shared-banner-error {
  background-color: rgba(211, 47, 47, 0.1);
  border-color: rgba(211, 47, 47, 0.3);
  color: #D32F2F;
}

[data-theme='light'] .shared-banner-warning {
  background-color: rgba(245, 124, 0, 0.1);
  border-color: rgba(245, 124, 0, 0.3);
  color: #F57C00;
}

[data-theme='light'] .shared-banner-info {
  background-color: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.3);
  color: #014f99;
}
</style>
