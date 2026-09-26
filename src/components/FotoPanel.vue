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

    <!-- Slideshow-Panel (wenn 2+ Bilder ausgewählt oder aktiv) -->
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
    />

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
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useToastStore } from '../stores/toastStore'
import { useWorkspaceStore } from '../stores/workspaceStore.js'

// Sub-Komponenten
import ImagePreviewOverlay from './foto-panel/ImagePreviewOverlay.vue'
import ImageUploadSection from './foto-panel/ImageUploadSection.vue'
import ImageFiltersPanel from './foto-panel/ImageFiltersPanel.vue'
import SlideshowPanel from './foto-panel/SlideshowPanel.vue'

// Lib
import { SlideshowManager } from '../lib/slideshowManager.js'
import { resolveSlideshowAudioReactive } from '../lib/slideshowAudio.js'
import { SLIDESHOW_EDIT_EVENT } from '../lib/slideshowEditRequest.js'
import { slideshowStableKey } from './foto-panel/slideshow/slideshowImageKey.js'
import { useSlideshowImageAdjustmentsStore } from '../stores/slideshowImageAdjustmentsStore.js'
import { useSlideshowImageSettingsStore } from '../stores/slideshowImageSettingsStore.js'
import {
  diffAdjustments,
  restorePersistedAdjustments as restorePersistedAdjustmentsInto,
  restorePersistedBounds as restorePersistedBoundsInto,
} from '../lib/slideshowAdjustmentsPersistence.js'
import {
  buildSlideshowSourceImages,
  ensureSlideshowImagesLoaded,
  resolveSlideshowImageObject,
} from '../lib/slideshowSources.js'
import { useStockGallery } from '../composables/useStockGallery.js'

// Composables
import { useImageGallery } from '../composables/useImageGallery.js'
import { useImageAudioReactive } from '../composables/useImageAudioReactive.js'
import { useGalleryCanvasDrop } from '../composables/useGalleryCanvasDrop.js'

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

// ═══════════════════════════════════════════════════════════════════
// DRAG & DROP: Eigenes Galerie-Bild direkt auf den Canvas ziehen
// ═══════════════════════════════════════════════════════════════════
// Ergänzt die bestehenden Platzierungs-Buttons, ohne sie zu verändern.
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
// Geteilte Stock-Galerie (Popover „Galerie“) – ausgewählte Stock-Bilder für die Slideshow
const {
  selectedStockImagesAll,
  getLoadedStockImage,
  loadStockImageObject,
  deselectAllStockImages,
} = useStockGallery()
// Per Maus verschobener gemeinsamer Bereich (für die Regler im Slideshow-Panel)
const slideshowExternalTransform = ref(null)
// Zähler für geänderte Bild-Bounds (Maus/Positionsregler) → Anzeige im Bild-Editor
const slideshowBoundsRevision = ref(0)
// Dauerhaft gemerkte Bild-Anpassungen pro Slideshow-Bild
const adjustmentsStore = useSlideshowImageAdjustmentsStore()
// Dauerhaft gemerkte Einstellungen pro Bild (u. a. eigene Größe/Position)
const imageSettingsStore = useSlideshowImageSettingsStore()

// Klick auf ein Slideshow-Bild in der Leiste (pausiert) → dessen Einstellungen öffnen
const slideshowEditRequest = ref(null)
function onSlideshowEditImage(event) {
  const index = event?.detail?.index
  if (!Number.isInteger(index)) return
  slideshowEditRequest.value = { index, nonce: Date.now() }
}
onMounted(() => window.addEventListener(SLIDESHOW_EDIT_EVENT, onSlideshowEditImage))
onBeforeUnmount(() => window.removeEventListener(SLIDESHOW_EDIT_EVENT, onSlideshowEditImage))
// Workspace-Format gewählt? (Voraussetzung für „An Workspace anpassen“)
const workspaceStore = useWorkspaceStore()
const hasWorkspace = computed(() => workspaceStore.selectedPresetKey != null)

// Kombinierte ausgewählte Bilder für Slideshow (hochgeladene + Stock)
const slideshowImages = computed(() =>
  // Hochgeladene + Stock-Bilder; gleiches Motiv in beiden Galerien nur einmal
  buildSlideshowSourceImages(
    selectedImages.value,
    selectedStockImagesAll.value,
    getLoadedStockImage,
  ),
)

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

  // Nur die Filter zurücksetzen – Audio-Reaktiv-Einstellungen und Ebenen-
  // Optionen (renderBehindVisualizer) bleiben erhalten.
  Object.assign(currentActiveImage.value.fotoSettings, defaultSettings)
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
    onTransformChange: (transform) => {
      slideshowExternalTransform.value = transform
    },
    // Bild-Anpassungen dauerhaft merken (Filter, Schatten, Rotation …)
    // Eigene Größe/Position dauerhaft merken (gebündelt)
    onImageBoundsChange: ({ imageConfig, imageObject, bounds }) => {
      slideshowBoundsRevision.value++
      queueBoundsPersist(slideshowStableKey({ ...imageConfig, imageObject }), bounds)
    },
    // Nur Abweichungen vom Standard speichern (unveränderte Bilder → kein Eintrag)
    onImageAdjustmentsChange: ({ imageConfig, imageObject, adjustments, audioMode }) => {
      adjustmentsStore.setAdjustments(
        slideshowStableKey({ ...imageConfig, imageObject }),
        diffAdjustments(
          adjustments,
          fotoManager?.defaultSettings,
          imageConfig?.audioReactiveSettings ?? null,
        ),
        audioMode,
      )
    },
    // Lazy, damit ein späteres Workspace-Format berücksichtigt wird
    getWorkspaceBounds: () => canvasManagerRef?.value?.getWorkspaceBounds?.() ?? null,
    onImageTransition: (index, total, phase) => {
      slideshowCurrentIndex.value = index
      slideshowCurrentPhase.value = phase
    },
  })

  // ✨ NEU: Global verfügbar machen für Maus-Interaktion
  window.slideshowManager = slideshowManagerRef.value

  console.log('[Slideshow] SlideshowManager initialisiert')
}

async function startSlideshow(config) {
  if (!slideshowManagerRef.value) {
    initSlideshowManager()
  }

  if (!slideshowManagerRef.value) {
    toastStore.error('Slideshow Manager nicht bereit')
    return
  }

  // Stock-Bilder ggf. nachladen; nicht ladbare Bilder auslassen
  const { images: loaded, failed } = await ensureSlideshowImagesLoaded(
    config.images,
    loadStockImageObject,
    getLoadedStockImage,
  )
  if (failed.length > 0) {
    toastStore.warning(t('slideshow.imagesNotLoaded') + ': ' + failed.join(', '))
  }
  if (loaded.length === 0) return

  // Dauerhaft gemerkte Anpassungen für Bilder ohne Anpassungen in dieser Sitzung
  restorePersistedAdjustments(loaded)
  restorePersistedBounds(loaded)

  const { images, options } = buildSlideshowRun({ ...config, images: loaded })
  const success = slideshowManagerRef.value.start(images, options)

  if (success) {
    slideshowIsActive.value = true
    slideshowIsPaused.value = false
    slideshowTotalImages.value = images.length
    // ✨ Global verfügbar machen für Maus-Interaktion
    window.slideshowManager = slideshowManagerRef.value
    toastStore.success(t('slideshow.title') + ' gestartet')
    // Auswahl in beiden Galerien aufheben nach dem Start
    deselectAllImages()
    deselectAllStockImages()
  }
}

/**
 * Baut Bilder + Optionen für den SlideshowManager aus der Panel-Konfiguration
 * (für start() und applyLiveUpdate()).
 */
function buildSlideshowRun(config) {
  // Bilder aus der Konfiguration extrahieren
  const images = config.images.map((img) => ({
    imageObject: resolveSlideshowImageObject(img, getLoadedStockImage),
    name: img.name,
    // für den dauerhaften Schlüssel (slideshowStableKey)
    id: img.id,
    source: img.source,
    stockImage: img.stockImage,
    displayDuration: img.displayDuration,
    audioMode: img.audioMode,
    audioSource: img.audioSource,
    transition: img.transition,
    fadeInDuration: img.fadeInDuration,
    fadeOutDuration: img.fadeOutDuration,
    // Pro Bild: Standard (globale Option), Aus, Gespeichert oder Preset
    audioReactiveSettings: resolveSlideshowAudioReactive(img.audioMode, {
      applyGlobal: config.applyAudioReactive,
      savedSettings: savedAudioReactiveSettings.value,
      // Eigene Audio-Quelle des Bildes (z. B. Bass-Onset)
      source: img.audioSource,
    }),
  }))

  const options = {
    fadeInDuration: config.fadeInDuration,
    displayDuration: config.displayDuration,
    fadeOutDuration: config.fadeOutDuration,
    loop: config.loop,
    // Immer anwenden: die Auflösung pro Bild entscheidet (null = unverändert)
    autoApplyAudioReactive: true,
    audioReactiveSettings: null,
    renderBehindVisualizer: config.renderBehindVisualizer,
    backgroundMode: config.backgroundMode,
    backgroundColor: config.backgroundColor,
    workspaceColor: config.workspaceColor,
    backgroundGradient: config.backgroundGradient,
    workspaceGradient: config.workspaceGradient,
    backgroundFillAudio: config.backgroundFillAudio,
    workspaceFillAudio: config.workspaceFillAudio,
    backgroundImageFill: config.backgroundImageFill,
    workspaceImageFill: config.workspaceImageFill,
    backgroundImageObject: config.backgroundImageObject,
    workspaceImageObject: config.workspaceImageObject,
    fitToWorkspace: config.fitToWorkspace,
    moveWholeSlideshow: config.moveWholeSlideshow,
    transition: config.transition,
    transform: config.transform,
    // Live-Bearbeitung eines Bildes: aktuelle Anpassungen vorher übernehmen
    preserveLive: config.preserveLive === true,
  }
  return { images, options }
}

// Preset während laufender Slideshow geladen → in die laufende Slideshow übernehmen
function onSlideshowLiveUpdate(config) {
  const manager = slideshowManagerRef.value
  if (!manager?.isActive) return
  const { images, options } = buildSlideshowRun(config)
  manager.applyLiveUpdate(images, options)
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

// Position & Größe normaler Canvas-Bilder (ImageFiltersPanel → PositionSizeControls)
const imageBoundsApi = {
  getCanvas: () => multiImageManagerRef?.value?.canvas ?? null,
  redraw: () => canvasManagerRef?.value?.redraw?.(),
}

// Zugriff auf gemerkte Bild-Anpassungen für Slideshow-Presets (Speichern/Laden)
const slideshowAdjustmentsApi = {
  get(img) {
    // Sitzungsspeicher der Slideshow, sonst dauerhaft gemerkte Anpassungen
    const live = getSlideshowManager()?.getImageAdjustments(slideshowImageObject(img))
    return live ?? adjustmentsStore.getAdjustments(slideshowStableKey(img))?.adjustments ?? null
  },
  set(img, settings, audioMode) {
    withSlideshowImageObject(img, (obj) => {
      getSlideshowManager()?.setImageAdjustments(obj, settings, audioMode)
      // Aus einem Preset übernommene Anpassungen ebenfalls dauerhaft merken
      adjustmentsStore.setAdjustments(
        slideshowStableKey({ ...img, imageObject: obj }),
        diffAdjustments(settings, fotoManagerRef?.value?.defaultSettings),
        audioMode,
      )
    })
  },
  getBounds(img) {
    // Sitzungsspeicher der Slideshow, sonst dauerhaft gemerkte Größe/Position
    const live = getSlideshowManager()?.getImageBounds(slideshowImageObject(img))
    return live ?? imageSettingsStore.getImageSettings(slideshowStableKey(img))?.bounds ?? null
  },
  // Mittelpunkt (relativ 0–1) des Bildes auf der Canvas; null = nicht frei
  // positionierbar (Slideshow nicht aktiv oder Canvas-/Workspace-Hintergrund)
  getPosition(img) {
    const manager = getSlideshowManager()
    const obj = slideshowImageObject(img)
    if (!manager?.isActive || !obj || manager.isFittedToWorkspace()) return null
    const b = manager.getEffectiveImageBounds(obj)
    return b ? { x: b.relX + b.relWidth / 2, y: b.relY + b.relHeight / 2 } : null
  },
  setPosition(img, { x, y } = {}) {
    const obj = slideshowImageObject(img)
    if (!obj) return
    getSlideshowManager()?.setImagePosition(obj, { centerX: x, centerY: y })
  },
  // Größe (relativ 0–1) des Bildes + automatische Einpassung als Standard;
  // null = nicht frei skalierbar (wie getPosition)
  getSize(img) {
    const manager = getSlideshowManager()
    const obj = slideshowImageObject(img)
    if (!manager?.isActive || !obj || manager.isFittedToWorkspace()) return null
    const b = manager.getEffectiveImageBounds(obj)
    const fit = manager.getFittedImageBounds(obj)
    if (!b || !fit) return null
    return {
      width: b.relWidth,
      height: b.relHeight,
      defaultWidth: fit.relWidth,
      defaultHeight: fit.relHeight,
    }
  },
  setSize(img, { width, height, keepAspect } = {}) {
    const obj = slideshowImageObject(img)
    if (!obj) return
    getSlideshowManager()?.setImageSize(obj, { width, height, keepAspect })
  },
  setBounds(img, bounds) {
    withSlideshowImageObject(img, (obj) => {
      getSlideshowManager()?.setImageBounds(obj, bounds)
      // Aus einem Preset übernommene Größe/Position ebenfalls dauerhaft merken
      imageSettingsStore.updateImageSettings(slideshowStableKey({ ...img, imageObject: obj }), {
        bounds: bounds ?? null,
      })
    })
  },
}

// ─── Größe/Position pro Bild dauerhaft merken ──────────────────────────────
// Beim Ziehen ändert sie sich bei jeder Mausbewegung → Schreiben bündeln
const pendingBounds = new Map()
let boundsFlushTimer = null

function queueBoundsPersist(key, bounds) {
  if (!key) return
  pendingBounds.set(key, bounds)
  clearTimeout(boundsFlushTimer)
  boundsFlushTimer = setTimeout(flushPendingBounds, 300)
}

function flushPendingBounds() {
  clearTimeout(boundsFlushTimer)
  boundsFlushTimer = null
  for (const [key, bounds] of pendingBounds) {
    imageSettingsStore.updateImageSettings(key, { bounds: bounds ?? null })
  }
  pendingBounds.clear()
}

onMounted(() => window.addEventListener('pagehide', flushPendingBounds))
onBeforeUnmount(() => {
  window.removeEventListener('pagehide', flushPendingBounds)
  flushPendingBounds()
})

function slideshowImageObject(img) {
  return resolveSlideshowImageObject(img, getLoadedStockImage)
}

// Führt fn mit dem Image-Objekt aus – noch nicht geladene Stock-Bilder werden
// zuerst geladen (gleiches Objekt wie beim Start, siehe loadStockImageObject)
function withSlideshowImageObject(img, fn) {
  const obj = slideshowImageObject(img)
  if (obj) return fn(obj)
  if (img?.stockImage) {
    loadStockImageObject(img.stockImage)
      .then(fn)
      .catch((e) => console.warn('[Slideshow] Stock-Bild nicht geladen:', e))
  }
}

function getSlideshowManager() {
  if (!slideshowManagerRef.value) initSlideshowManager()
  return slideshowManagerRef.value
}

// Maus: ganze Slideshow oder einzelnes Bild verschieben
function onSlideshowMoveModeChange(value) {
  getSlideshowManager()?.setMoveWholeSlideshow(value)
}

// Gemerkte Bild-Anpassungen (Filter/Audio) der Slideshow verwerfen
function onSlideshowResetImageAdjustments() {
  slideshowManagerRef.value?.clearImageMemory()
  adjustmentsStore.clearAll()
  pendingBounds.clear()
  imageSettingsStore.clearField('bounds')
}

// Dauerhaft gemerkte Größe/Position für Bilder ohne eigene Bounds in dieser Sitzung
function restorePersistedBounds(images) {
  restorePersistedBoundsInto(slideshowManagerRef.value, images, {
    resolveImageObject: slideshowImageObject,
    getBounds: (key) => imageSettingsStore.getImageSettings(key)?.bounds ?? null,
  })
}

// Dauerhaft gemerkte Anpassungen in den Sitzungsspeicher der Slideshow übernehmen
function restorePersistedAdjustments(images) {
  restorePersistedAdjustmentsInto(slideshowManagerRef.value, images, {
    resolveImageObject: slideshowImageObject,
    getAdjustments: (key) => adjustmentsStore.getAdjustments(key),
  })
}

// Slideshow „An Workspace anpassen“ geändert (auch während laufender Slideshow)
function onSlideshowBackgroundModeChange(mode) {
  slideshowManagerRef.value?.setBackgroundMode(mode)
}

// Farbe der Fläche unter der Slideshow geändert (sofort sichtbar)
function onSlideshowBackgroundColorChange(color) {
  slideshowManagerRef.value?.setBackgroundColor(color)
}

// Farbe der Workspace-Fläche geändert (sofort sichtbar)
function onSlideshowWorkspaceColorChange(color) {
  slideshowManagerRef.value?.setWorkspaceColor(color)
}

// Farbverlauf einer Fläche geändert (target: 'canvas' | 'workspace')
function onSlideshowBaseGradientChange(target, gradient) {
  slideshowManagerRef.value?.setBaseGradient(target, gradient)
}

// Audio-Reaktive Flächenfarbe geändert (target: 'canvas' | 'workspace')
function onSlideshowBaseFillAudioChange(target, audio) {
  slideshowManagerRef.value?.setBaseFillAudio(target, audio)
}

// Eigenes Flächenbild geändert (Einstellung + geladenes Bild, null = keines)
function onSlideshowBaseImageChange(target, fill, imageObject) {
  slideshowManagerRef.value?.setBaseImage(target, fill, imageObject)
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
