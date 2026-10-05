<template>
  <div v-if="isVisible" class="slideshow-panel">
    <div class="panel-header">
      <h4>{{ t('slideshow.title') }}</h4>
      <SlideshowStatusBadge :is-active="isActive" :is-paused="isPaused" />
    </div>

    <!-- Reihenfolge der Bilder (nur wenn nicht aktiv) -->
    <SlideshowOrderList
      v-if="!isActive && orderedImages.length >= 2"
      v-model="orderedImages"
      v-model:durations="imageDurations"
      v-model:audio-modes="imageAudioModes"
      v-model:audio-sources="imageAudioSources"
      v-model:transitions="imageTransitions"
      v-model:fade-ins="imageFadeIns"
      v-model:fade-outs="imageFadeOuts"
      :default-duration="displayDuration"
      :default-fade-in="fadeInDuration"
      :default-fade-out="fadeOutDuration"
      :default-transition="transition"
      :has-saved-settings="hasSavedSettings"
      @order-changed="(list) => emit('order-changed', list)"
    />

    <!-- Timing, Audio-Reaktiv, Loop (nur wenn nicht aktiv) -->
    <SlideshowTimingSettings
      v-if="!isActive"
      v-model:fade-in-duration="fadeInDuration"
      v-model:display-duration="displayDuration"
      v-model:fade-out-duration="fadeOutDuration"
      v-model:apply-audio-reactive="applyAudioReactive"
      v-model:loop-slideshow="loopSlideshow"
      v-model:transition="transition"
      :has-saved-settings="hasSavedSettings"
    />

    <!-- Render Behind Visualizer Option (auch während laufender Slideshow) -->
    <div class="layer-section">
      <label class="checkbox-label">
        <input v-model="renderBehindVisualizer" type="checkbox" @change="onRenderLayerChange" />
        <span>{{ t('slideshow.renderBehind') }}</span>
      </label>
      <!-- Slideshow als Hintergrund: Aus / Canvas / Workspace -->
      <div class="background-mode" role="radiogroup" :aria-label="t('slideshow.backgroundMode')">
        <span class="background-mode-label">{{ t('slideshow.backgroundMode') }}</span>
        <label class="radio-label">
          <input
            v-model="backgroundMode"
            class="bg-mode-none"
            type="radio"
            value="none"
            @change="onBackgroundModeChange"
          />
          <span>{{ t('slideshow.backgroundModeNone') }}</span>
        </label>
        <label class="radio-label">
          <input
            v-model="backgroundMode"
            class="bg-mode-canvas"
            type="radio"
            value="canvas"
            @change="onBackgroundModeChange"
          />
          <span>{{ t('slideshow.backgroundModeCanvas') }}</span>
        </label>
        <label class="radio-label" :class="{ disabled: !hasWorkspace }">
          <input
            v-model="backgroundMode"
            class="bg-mode-workspace"
            type="radio"
            value="workspace"
            :disabled="!hasWorkspace"
            @change="onBackgroundModeChange"
          />
          <span>{{ t('slideshow.backgroundModeWorkspace') }}</span>
        </label>
      </div>
      <!-- Farbe der Fläche unter der Slideshow (ersetzt das Hintergrundbild) -->
      <label v-if="backgroundMode === 'canvas'" class="base-color-label">
        <span>{{ t('slideshow.baseColor') }}</span>
        <input
          v-model="backgroundColor"
          class="slideshow-base-color"
          type="color"
          @input="emit('background-color-change', backgroundColor)"
        />
        <button
          v-if="
            backgroundColor !== D.backgroundColor ||
            !isDefaultGradient(backgroundGradient) ||
            !isDefaultFillAudio(backgroundFillAudio)
          "
          type="button"
          class="btn-reset-base-color"
          :title="t('slideshow.baseColorReset')"
          :aria-label="t('slideshow.baseColorReset')"
          @click="resetBackgroundColor"
        >
          ↺
        </button>
      </label>
      <!-- Eigene Farbe der Workspace-Fläche -->
      <label v-if="backgroundMode === 'workspace'" class="base-color-label">
        <span>{{ t('slideshow.workspaceColor') }}</span>
        <input
          v-model="workspaceColor"
          class="slideshow-workspace-color"
          type="color"
          :disabled="!hasWorkspace"
          @input="emit('workspace-color-change', workspaceColor)"
        />
        <button
          v-if="
            workspaceColor !== D.workspaceColor ||
            !isDefaultGradient(workspaceGradient) ||
            !isDefaultFillAudio(workspaceFillAudio)
          "
          type="button"
          class="btn-reset-workspace-color"
          :title="t('slideshow.baseColorReset')"
          :aria-label="t('slideshow.baseColorReset')"
          @click="resetWorkspaceColor"
        >
          ↺
        </button>
      </label>
      <SlideshowFillAudio
        v-if="backgroundMode === 'canvas'"
        v-model="backgroundFillAudio"
        prefix="base"
      />
      <SlideshowFillAudio
        v-if="backgroundMode === 'workspace'"
        v-model="workspaceFillAudio"
        prefix="workspace"
        :disabled="!hasWorkspace"
      />
      <SlideshowBaseGradient
        v-if="backgroundMode === 'canvas'"
        v-model="backgroundGradient"
        prefix="base"
      />
      <SlideshowBaseGradient
        v-if="backgroundMode === 'workspace'"
        v-model="workspaceGradient"
        prefix="workspace"
        :disabled="!hasWorkspace"
      />
      <!-- Eigenes Bild als Fläche (über Farbe/Verlauf) -->
      <SlideshowImageFill
        v-if="backgroundMode === 'canvas' || backgroundMode === 'workspace'"
        :key="imageFillTarget"
        :fill="imageFills.fills[imageFillTarget].value"
        :thumb="imageFills.thumbOf(imageFillTarget)"
        :loading="imageFills.loading[imageFillTarget]"
        :candidates="imageFillCandidates"
        :prefix="imageFillTarget === 'workspace' ? 'workspace' : 'base'"
        :disabled="imageFillTarget === 'workspace' && !hasWorkspace"
        @update="(partial) => imageFills.update(imageFillTarget, partial)"
        @select="(candidate) => imageFills.select(imageFillTarget, candidate)"
        @clear="imageFills.clear(imageFillTarget)"
      />
      <label class="checkbox-label" :class="{ disabled: fitsWorkspace }">
        <input
          v-model="moveWholeSlideshow"
          class="move-whole-checkbox"
          type="checkbox"
          :disabled="fitsWorkspace"
          @change="emit('move-mode-change', moveWholeSlideshow)"
        />
        <span>{{ t('slideshow.moveWhole') }}</span>
      </label>
      <p
        v-if="backgroundMode === 'workspace' && !hasWorkspace"
        class="hint warning fit-workspace-hint"
      >
        {{ t('slideshow.fitToWorkspaceNoWorkspace') }}
      </p>
    </div>

    <!-- Position & Größe (nur wenn nicht aktiv) -->
    <SlideshowTransformSettings
      v-if="!isActive && !fitsWorkspace"
      v-model:transform-x="transformX"
      v-model:transform-y="transformY"
      v-model:transform-width="transformWidth"
      v-model:transform-height="transformHeight"
      @reset="emitTransformChange"
    />

    <!-- Presets (Speichern und Laden auch während der Slideshow) -->
    <SlideshowPresets
      :presets="presetStore.presets"
      :session-images="presetStore.sessionImages"
      :storage="presetStore.imageStats"
      :cleaning="cleaningImages"
      @cleanup="cleanupPresetImages"
      @save="savePreset"
      @load="loadPreset"
      @delete="presetStore.deletePreset"
    />

    <!-- Während der Slideshow geänderte Bild-Anpassungen verwerfen (nur wenn nicht aktiv) -->
    <div v-if="!isActive" class="adjustments-section">
      <button type="button" class="btn-reset-adjustments" @click="resetImageAdjustments">
        {{ t('slideshow.resetAdjustments') }}
      </button>
    </div>

    <!-- Einstellungen eines Bildes (pausiert; Klick auf das Bild in der Leiste) -->
    <SlideshowImageEditor
      v-if="editorImage"
      :key="slideshowImageKey(editorImage)"
      :image="editorImage"
      :index="editorIndex"
      :total="orderedImages.length"
      :transition="imageTransitions[slideshowImageKey(editorImage)] ?? null"
      :duration="imageDurations[slideshowImageKey(editorImage)]"
      :fade-in="imageFadeIns[slideshowImageKey(editorImage)]"
      :fade-out="imageFadeOuts[slideshowImageKey(editorImage)]"
      :default-duration="displayDuration"
      :default-fade-in="fadeInDuration"
      :default-fade-out="fadeOutDuration"
      :default-transition="transition"
      :audio-mode="imageAudioModes[slideshowImageKey(editorImage)] ?? 'default'"
      :audio-source="imageAudioSources[slideshowImageKey(editorImage)] ?? null"
      :has-saved-settings="hasSavedSettings"
      :position="editorPosition"
      :size="editorSize"
      @update:position="updateEditedImagePosition"
      @update:size="updateEditedImageSize"
      @update:transition="(v) => updateEditedImage('transition', v)"
      @update:duration="(v) => updateEditedImage('duration', v)"
      @update:fade-in="(v) => updateEditedImage('fadeIn', v)"
      @update:fade-out="(v) => updateEditedImage('fadeOut', v)"
      @update:audio-mode="(v) => updateEditedImage('audioMode', v === 'default' ? null : v)"
      @update:audio-source="(v) => updateEditedImage('audioSource', v)"
      @close="editorIndex = null"
    />

    <!-- Steuerung + Fortschritt -->
    <SlideshowControls
      :is-active="isActive"
      :is-paused="isPaused"
      :current-image-index="currentImageIndex"
      :total-images="totalImages || orderedImages.length"
      :current-phase="currentPhase"
      :can-start="orderedImages.length >= 2"
      @start="startSlideshow"
      @pause="emit('pause')"
      @resume="emit('resume')"
      @stop="emit('stop')"
    />
  </div>
</template>

<script setup>
/**
 * Slideshow-Panel: hält den Einstellungs-Zustand und emittiert die Aktionen an
 * das FotoPanel. Die Sektionen liegen in `slideshow/` (Reihenfolge, Timing,
 * Position/Größe, Steuerung) und sind per v-model angebunden; Flächen,
 * Einstellungen pro Bild, Bild-Editor und Presets sind eigene Composables.
 */
import { ref, computed, watch, toRaw } from 'vue'
import SlideshowBaseGradient from './slideshow/SlideshowBaseGradient.vue'
import SlideshowFillAudio from './slideshow/SlideshowFillAudio.vue'
import SlideshowImageFill from './slideshow/SlideshowImageFill.vue'
import { useSlideshowImageFills } from './slideshow/useSlideshowImageFills.js'
import {
  useSlideshowBaseFills,
  isDefaultFillAudio,
  isDefaultGradient,
} from './slideshow/useSlideshowBaseFills.js'
import { useSlideshowPerImageSettings } from './slideshow/useSlideshowPerImageSettings.js'
import { useSlideshowImageEditor } from './slideshow/useSlideshowImageEditor.js'
import {
  useSlideshowPanelPresets,
  persistImageWithCleanup,
} from './slideshow/useSlideshowPanelPresets.js'
import { isSameSlideshowImageFill } from '../../lib/slideshowImageFill.js'
import { useImageGallery } from '../../composables/useImageGallery.js'
import { useStockGallery } from '../../composables/useStockGallery.js'
import { useI18n } from '../../lib/i18n.js'
import SlideshowOrderList from './slideshow/SlideshowOrderList.vue'
import SlideshowTimingSettings from './slideshow/SlideshowTimingSettings.vue'
import SlideshowTransformSettings from './slideshow/SlideshowTransformSettings.vue'
import SlideshowControls from './slideshow/SlideshowControls.vue'
import SlideshowPresets from './slideshow/SlideshowPresets.vue'
import SlideshowImageEditor from './slideshow/SlideshowImageEditor.vue'
import SlideshowStatusBadge from './slideshow/SlideshowStatusBadge.vue'
import { slideshowImageKey } from './slideshow/slideshowImageKey.js'
import { loadPersistedImage } from '../../lib/slideshowImagePersistence.js'
import {
  useSlideshowPresetStore,
  SLIDESHOW_DEFAULT_SETTINGS,
} from '../../stores/slideshowPresetStore.js'
import { useToastStore } from '../../stores/toastStore.js'

const { t, locale } = useI18n()
const presetStore = useSlideshowPresetStore()
presetStore.loadPresets()
const toastStore = useToastStore()

const props = defineProps({
  images: { type: Array, required: true },
  hasSavedSettings: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },
  currentImageIndex: { type: Number, default: 0 },
  totalImages: { type: Number, default: 0 },
  currentPhase: { type: String, default: 'fadeIn' },
  hasWorkspace: { type: Boolean, default: false },
  // Gemerkte Bild-Anpassungen/-Größen: { get(img), set(img, settings|null, audioMode),
  // getBounds(img), setBounds(img, bounds|null) }
  adjustmentsApi: { type: Object, default: null },
  // Gemeinsamer Bereich wurde per Maus verschoben ({ relX, relY, relWidth, relHeight })
  externalTransform: { type: Object, default: null },
  // Bild-Einstellungen öffnen: { index, nonce } (Klick auf ein Bild der Leiste, pausiert)
  editImageRequest: { type: Object, default: null },
  // Erhöht sich bei jeder Änderung eigener Bild-Bounds (Maus, Positionsregler)
  boundsRevision: { type: Number, default: 0 },
})

const emit = defineEmits([
  'start',
  'pause',
  'resume',
  'stop',
  'order-changed',
  'render-layer-change',
  'transform-change',
  'background-mode-change',
  'background-color-change',
  'workspace-color-change',
  'base-gradient-change',
  'base-fill-audio-change',
  'base-image-change',
  'reset-image-adjustments',
  'live-update',
  'move-mode-change',
  'visibility-change',
])

const D = SLIDESHOW_DEFAULT_SETTINGS

// Timing-Einstellungen
const fadeInDuration = ref(D.fadeInDuration)
const displayDuration = ref(D.displayDuration)
const fadeOutDuration = ref(D.fadeOutDuration)
const applyAudioReactive = ref(D.applyAudioReactive)
const loopSlideshow = ref(D.loop)
// Übergangsanimation für alle Bilder
const transition = ref(D.transition)

// Render Layer
const renderBehindVisualizer = ref(D.renderBehindVisualizer)

// Maus verschiebt die ganze Slideshow statt eines einzelnen Bildes (Shift kehrt um)
const moveWholeSlideshow = ref(D.moveWholeSlideshow)

// Slideshow als Hintergrund: 'none' | 'canvas' | 'workspace'
const backgroundMode = ref(D.backgroundMode)

// Flächen unter der Slideshow: Farbe, Verlauf, Audio-Farbe (dauerhaft gemerkt)
const baseFills = useSlideshowBaseFills(emit)
const {
  backgroundColor,
  workspaceColor,
  backgroundGradient,
  workspaceGradient,
  backgroundFillAudio,
  workspaceFillAudio,
  resetBackgroundColor,
  resetWorkspaceColor,
} = baseFills

// Eigenes Flächenbild (Canvas/Workspace) – Zustand im Composable
const { imageGallery } = useImageGallery()
const { stockImages, loadStockImageObject } = useStockGallery()
const imageFills = useSlideshowImageFills({
  onChange: (target, fill, image) => emit('base-image-change', target, fill, image),
  loadUpload: (key) => loadPersistedImage(key),
  persistUpload: (entry) => persistImageWithCleanup(presetStore, entry),
  loadStock: (stock) => loadStockImageObject(stock),
  onMissing: (name) => toastStore.warning(`${t('slideshow.imageFillMissing')}: ${name}`),
  onError: () => toastStore.error(t('slideshow.imageFillError')),
})
const imageFillTarget = computed(() =>
  backgroundMode.value === 'workspace' ? 'workspace' : 'canvas',
)
// Wählbar: alle hochgeladenen Bilder + die geöffnete Stock-Kategorie
const imageFillCandidates = computed(() => [
  ...imageGallery.value.map((g) => ({
    id: `upload:${g.id}`,
    name: g.name,
    thumb: g.img?.src || '',
    source: 'upload',
    // Original-Objekt (kein reaktiver Proxy) – Slideshow vergleicht per ===
    raw: { source: 'upload', name: g.name, img: toRaw(g.img) },
  })),
  ...(stockImages.value || [])
    .filter((st) => st?.id && st.file)
    .map((st) => ({
      id: `stock:${st.id}`,
      name: st.name,
      thumb: st.thumbnail || st.file,
      source: 'stock',
      raw: { source: 'stock', name: st.name, stockImage: st },
    })),
])

// Workspace-Modus nur mit gewähltem Workspace-Format wirksam
const effectiveBackgroundMode = computed(() =>
  backgroundMode.value === 'workspace' && !props.hasWorkspace ? 'none' : backgroundMode.value,
)
// Als Hintergrund: Position & Größe sind fest (Bilder füllen den Bereich)
const fitsWorkspace = computed(() => effectiveBackgroundMode.value !== 'none')

// Transform-Einstellungen (in Prozent für UI)
const transformX = ref(D.transform.x)
const transformY = ref(D.transform.y)
const transformWidth = ref(D.transform.width)
const transformHeight = ref(D.transform.height)

// Geordnete Bilder-Liste (Reihenfolge per Drag & Drop in SlideshowOrderList)
const orderedImages = ref([])

watch(
  () => props.images,
  (newImages, oldImages) => {
    // Während der Slideshow die gestartete Reihenfolge behalten: FotoPanel hebt
    // nach dem Start die Bildauswahl auf, Presets sollen aber weiter die
    // laufenden Bilder (Positionen) speichern können.
    if (props.isActive) return
    // Nur bei echter Auswahländerung übernehmen – eine neu erzeugte Liste mit
    // denselben Bildern (z. B. weil ein Bild zur Galerie hinzukam) soll eine
    // aus einem Preset geladene Liste nicht überschreiben
    if (oldImages && sameImageKeys(newImages, oldImages)) return
    orderedImages.value = [...newImages]
  },
  { immediate: true, deep: true },
)
// Nach dem Stoppen wieder die aktuelle Auswahl übernehmen
watch(
  () => props.isActive,
  (active) => {
    if (!active) orderedImages.value = [...props.images]
  },
)

function sameImageKeys(a, b) {
  return (
    a.length === b.length && a.every((img, i) => slideshowImageKey(img) === slideshowImageKey(b[i]))
  )
}

// Einstellungen pro Bild (nach dem Befüllen von orderedImages anlegen)
const perImage = useSlideshowPerImageSettings(orderedImages)
const {
  imageDurations,
  imageAudioModes,
  imageTransitions,
  imageFadeIns,
  imageFadeOuts,
  imageAudioSources,
} = perImage

// Sichtbar ab 2 ausgewählten Bildern, während der Slideshow, mit einer aus
// einem Preset geladenen Bildliste oder wenn Presets mit Bildern existieren
// (Sitzungsbilder oder dauerhaft gespeicherte Stock-Bilder)
const isVisible = computed(
  () =>
    props.images.length >= 2 ||
    props.isActive ||
    orderedImages.value.length >= 2 ||
    Object.keys(presetStore.sessionImages).length > 0 ||
    presetStore.presets.some((preset) => preset.slots.some((slot) => slot.stock || slot.upload)),
)
// Fenster der Sticky-Bar zeigt ohne Inhalt einen Hinweis
watch(isVisible, (visible) => emit('visibility-change', visible), { immediate: true })

// Einstellungen eines Bildes bei pausierter Slideshow
const {
  editorIndex,
  editorImage,
  editorPosition,
  editorSize,
  updateEditedImageSize,
  updateEditedImagePosition,
  updateEditedImage,
} = useSlideshowImageEditor({
  props,
  orderedImages,
  backgroundMode,
  setForImage: perImage.setForImage,
  onLiveChange: () => emit('live-update', { ...buildPayload(), preserveLive: true }),
})

// ─── Start-Konfiguration ───────────────────────────────────────────────────

function transformPayload() {
  return {
    relX: transformX.value / 100,
    relY: transformY.value / 100,
    relWidth: transformWidth.value / 100,
    relHeight: transformHeight.value / 100,
  }
}

function startSlideshow() {
  emit('start', buildPayload())
}

/** Aktuelle Panel-Einstellungen als Start-/Live-Update-Konfiguration. */
function buildPayload() {
  const fills = baseFills.snapshot()
  return {
    images: orderedImages.value.map(perImage.payloadFor),
    fadeInDuration: fadeInDuration.value,
    displayDuration: displayDuration.value,
    fadeOutDuration: fadeOutDuration.value,
    applyAudioReactive: applyAudioReactive.value,
    loop: loopSlideshow.value,
    renderBehindVisualizer: renderBehindVisualizer.value,
    backgroundMode: effectiveBackgroundMode.value,
    fitToWorkspace: effectiveBackgroundMode.value === 'workspace',
    ...fills,
    ...imageFills.payload(),
    moveWholeSlideshow: moveWholeSlideshow.value,
    transition: transition.value,
    transform: transformPayload(),
  }
}

// ─── Presets ───────────────────────────────────────────────────────────────

/** Globale Panel-Einstellungen für ein Preset. */
function captureSettings() {
  return {
    fadeInDuration: fadeInDuration.value,
    displayDuration: displayDuration.value,
    fadeOutDuration: fadeOutDuration.value,
    applyAudioReactive: applyAudioReactive.value,
    loop: loopSlideshow.value,
    renderBehindVisualizer: renderBehindVisualizer.value,
    backgroundMode: backgroundMode.value,
    fitToWorkspace: backgroundMode.value === 'workspace',
    ...baseFills.snapshot(),
    backgroundImageFill: { ...imageFills.fills.canvas.value },
    workspaceImageFill: { ...imageFills.fills.workspace.value },
    moveWholeSlideshow: moveWholeSlideshow.value,
    transition: transition.value,
    transform: {
      x: transformX.value,
      y: transformY.value,
      width: transformWidth.value,
      height: transformHeight.value,
    },
  }
}

/** Globale Einstellungen aus einem Preset übernehmen (Änderungen melden). */
function applySettings(s) {
  fadeInDuration.value = s.fadeInDuration
  displayDuration.value = s.displayDuration
  fadeOutDuration.value = s.fadeOutDuration
  applyAudioReactive.value = s.applyAudioReactive
  loopSlideshow.value = s.loop
  transition.value = s.transition
  if (renderBehindVisualizer.value !== s.renderBehindVisualizer) {
    renderBehindVisualizer.value = s.renderBehindVisualizer
    onRenderLayerChange()
  }
  if (moveWholeSlideshow.value !== s.moveWholeSlideshow) {
    moveWholeSlideshow.value = s.moveWholeSlideshow
    emit('move-mode-change', moveWholeSlideshow.value)
  }
  if (backgroundMode.value !== s.backgroundMode) {
    backgroundMode.value = s.backgroundMode
    onBackgroundModeChange()
  }
  baseFills.applySettings(s)
  // Flächenbilder (werden bei Bedarf nachgeladen)
  if (!isSameSlideshowImageFill(imageFills.fills.canvas.value, s.backgroundImageFill)) {
    imageFills.apply('canvas', s.backgroundImageFill)
  }
  if (!isSameSlideshowImageFill(imageFills.fills.workspace.value, s.workspaceImageFill)) {
    imageFills.apply('workspace', s.workspaceImageFill)
  }
  transformX.value = s.transform.x
  transformY.value = s.transform.y
  transformWidth.value = s.transform.width
  transformHeight.value = s.transform.height
}

const { cleaningImages, cleanupPresetImages, savePreset, loadPreset } = useSlideshowPanelPresets({
  props,
  emit,
  presetStore,
  toastStore,
  t,
  locale,
  orderedImages,
  perImage,
  captureSettings,
  applySettings,
  buildPayload,
})

function resetImageAdjustments() {
  emit('reset-image-adjustments')
  toastStore.success(t('slideshow.adjustmentsReset'))
}

// ─── Layer, Hintergrund-Modus, Position ────────────────────────────────────

// Render Layer geändert (auch während laufender Slideshow)
function onRenderLayerChange() {
  emit('render-layer-change', renderBehindVisualizer.value)
}

// „An Workspace anpassen“: wie ein Workspace-Hintergrund hinter dem Visualizer
// Als Hintergrund automatisch hinter dem Visualizer rendern
function onBackgroundModeChange() {
  if (backgroundMode.value !== 'none' && !renderBehindVisualizer.value) {
    renderBehindVisualizer.value = true
    onRenderLayerChange()
  }
  emit('background-mode-change', effectiveBackgroundMode.value)
}

// Workspace-Format entfernt/gewählt → Manager informieren
watch(
  () => props.hasWorkspace,
  () => {
    if (backgroundMode.value === 'workspace') {
      emit('background-mode-change', effectiveBackgroundMode.value)
    }
  },
)

// Per Maus verschobenen Bereich in die Regler übernehmen
watch(
  () => props.externalTransform,
  (tf) => {
    if (!tf) return
    transformX.value = Math.round(tf.relX * 100)
    transformY.value = Math.round(tf.relY * 100)
  },
)

function emitTransformChange() {
  emit('transform-change', transformPayload())
}

// Transform-Änderungen nur emittieren, wenn die Slideshow NICHT aktiv ist,
// um Maus-Änderungen auf dem Canvas nicht zu überschreiben.
watch([transformX, transformY, transformWidth, transformHeight], () => {
  if (!props.isActive) emitTransformChange()
})
</script>

<style scoped src="./slideshow/slideshow-shared.css"></style>
<style scoped>
.slideshow-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--primary-bg) 100%);
  border-radius: 10px;
  padding: 16px;
  border: 1px solid var(--card-bg);
  margin-top: 8px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.panel-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
[data-theme='light'] .panel-header h4 {
  color: var(--text-primary);
}
.adjustments-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--card-bg);
}
.btn-reset-adjustments {
  align-self: flex-start;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--secondary-bg);
  color: #e0e0e0;
  cursor: pointer;
}
.btn-reset-adjustments:hover {
  background: var(--btn-hover);
}
[data-theme='light'] .btn-reset-adjustments {
  background: #f0ead0;
  color: var(--text-primary);
  border-color: #d4c8a8;
}
.background-mode {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  font-size: 12px;
}
.background-mode-label {
  flex-basis: 100%;
  font-size: 11px;
  color: var(--text-muted);
}
.radio-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: #e0e0e0;
}
.radio-label input {
  accent-color: #6ea8fe;
}
.radio-label.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-theme='light'] .radio-label {
  color: var(--text-primary);
}
.base-color-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #e0e0e0;
}
.slideshow-base-color,
.slideshow-workspace-color {
  width: 36px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: none;
  cursor: pointer;
}
.btn-reset-base-color,
.btn-reset-workspace-color {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  padding: 0 4px;
}
[data-theme='light'] .base-color-label {
  color: var(--text-primary);
}
.checkbox-label.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-theme='light'] .layer-section {
  border-top-color: #d4c8a8;
}
</style>
