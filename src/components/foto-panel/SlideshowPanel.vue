<template>
  <div v-if="isVisible" class="slideshow-panel">
    <div class="panel-header">
      <h4>{{ t('slideshow.title') }}</h4>
      <div class="status-badge" :class="{ active: isActive, paused: isPaused }">
        <span v-if="isActive && !isPaused">{{ t('slideshow.running') }}</span>
        <span v-else-if="isPaused">{{ t('slideshow.paused') }}</span>
        <span v-else>{{ t('slideshow.ready') }}</span>
      </div>
    </div>

    <!-- Reihenfolge der Bilder (nur wenn nicht aktiv) -->
    <SlideshowOrderList
      v-if="!isActive && orderedImages.length >= 2"
      v-model="orderedImages"
      v-model:durations="imageDurations"
      v-model:audio-modes="imageAudioModes"
      :default-duration="displayDuration"
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
      :has-saved-settings="hasSavedSettings"
    />

    <!-- Render Behind Visualizer Option (auch während laufender Slideshow) -->
    <div class="layer-section">
      <label class="checkbox-label">
        <input v-model="renderBehindVisualizer" type="checkbox" @change="onRenderLayerChange" />
        <span>{{ t('slideshow.renderBehind') }}</span>
      </label>
      <label class="checkbox-label" :class="{ disabled: !hasWorkspace }">
        <input
          v-model="fitToWorkspace"
          class="fit-workspace-checkbox"
          type="checkbox"
          :disabled="!hasWorkspace"
          @change="onFitWorkspaceChange"
        />
        <span>{{ t('slideshow.fitToWorkspace') }}</span>
      </label>
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
      <p class="hint move-whole-hint">
        {{ moveWholeSlideshow ? t('slideshow.moveWholeHintOn') : t('slideshow.moveWholeHintOff') }}
      </p>
      <p v-if="!hasWorkspace" class="hint warning fit-workspace-hint">
        {{ t('slideshow.fitToWorkspaceNoWorkspace') }}
      </p>
      <p v-else-if="fitToWorkspace" class="hint fit-workspace-hint">
        {{ t('slideshow.fitToWorkspaceHint') }}
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
      @save="savePreset"
      @load="loadPreset"
      @delete="presetStore.deletePreset"
    />

    <!-- Während der Slideshow geänderte Bild-Anpassungen verwerfen (nur wenn nicht aktiv) -->
    <div v-if="!isActive" class="adjustments-section">
      <p class="hint">{{ t('slideshow.adjustmentsKeptHint') }}</p>
      <button type="button" class="btn-reset-adjustments" @click="resetImageAdjustments">
        {{ t('slideshow.resetAdjustments') }}
      </button>
    </div>

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
 * Position/Größe, Steuerung) und sind per v-model angebunden.
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import SlideshowOrderList from './slideshow/SlideshowOrderList.vue'
import SlideshowTimingSettings from './slideshow/SlideshowTimingSettings.vue'
import SlideshowTransformSettings from './slideshow/SlideshowTransformSettings.vue'
import SlideshowControls from './slideshow/SlideshowControls.vue'
import SlideshowPresets from './slideshow/SlideshowPresets.vue'
import { slideshowImageKey } from './slideshow/slideshowImageKey.js'
import { restorePresetImages } from '../../lib/slideshowSources.js'
import { persistUploadImage, restoreUploadImage } from '../../lib/slideshowImagePersistence.js'
import {
  useSlideshowPresetStore,
  SLIDESHOW_DEFAULT_SETTINGS,
} from '../../stores/slideshowPresetStore.js'
import { useToastStore } from '../../stores/toastStore.js'
import { SLIDESHOW_AUDIO_DEFAULT } from '../../lib/slideshowAudio.js'

const { t } = useI18n()
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
})

const emit = defineEmits([
  'start',
  'pause',
  'resume',
  'stop',
  'order-changed',
  'render-layer-change',
  'transform-change',
  'fit-workspace-change',
  'reset-image-adjustments',
  'live-update',
  'move-mode-change',
])

const D = SLIDESHOW_DEFAULT_SETTINGS

// Timing-Einstellungen
const fadeInDuration = ref(D.fadeInDuration)
const displayDuration = ref(D.displayDuration)
const fadeOutDuration = ref(D.fadeOutDuration)
const applyAudioReactive = ref(D.applyAudioReactive)
const loopSlideshow = ref(D.loop)

// Render Layer
const renderBehindVisualizer = ref(D.renderBehindVisualizer)

// Maus verschiebt die ganze Slideshow statt eines einzelnen Bildes (Shift kehrt um)
const moveWholeSlideshow = ref(D.moveWholeSlideshow)

// Bilder füllen den Workspace-Bereich (wie „Als Workspace-Hintergrund“)
const fitToWorkspace = ref(D.fitToWorkspace)
// Nur wirksam, wenn ein Workspace-Format gewählt ist
const fitsWorkspace = computed(() => fitToWorkspace.value && props.hasWorkspace)

// Transform-Einstellungen (in Prozent für UI)
const transformX = ref(D.transform.x)
const transformY = ref(D.transform.y)
const transformWidth = ref(D.transform.width)
const transformHeight = ref(D.transform.height)

// Geordnete Bilder-Liste (Reihenfolge per Drag & Drop in SlideshowOrderList)
const orderedImages = ref([])
// Optionale Anzeigedauer pro Bild ({ [id]: ms }); fehlt ein Eintrag, gilt displayDuration
const imageDurations = ref({})
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

// Optionaler Audio-Reaktiv-Modus pro Bild ({ [id]: mode }); fehlt ein Eintrag, gilt 'default'
const imageAudioModes = ref({})

watch(
  () => props.images,
  (newImages) => {
    // Während der Slideshow die gestartete Reihenfolge behalten: FotoPanel hebt
    // nach dem Start die Bildauswahl auf, Presets sollen aber weiter die
    // laufenden Bilder (Positionen) speichern können.
    if (props.isActive) return
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
  return {
    images: orderedImages.value.map((img) => {
      const key = slideshowImageKey(img)
      const own = imageDurations.value[key]
      return {
        ...img,
        displayDuration: Number.isFinite(own) ? own : undefined,
        audioMode: imageAudioModes.value[key] ?? SLIDESHOW_AUDIO_DEFAULT,
      }
    }),
    fadeInDuration: fadeInDuration.value,
    displayDuration: displayDuration.value,
    fadeOutDuration: fadeOutDuration.value,
    applyAudioReactive: applyAudioReactive.value,
    loop: loopSlideshow.value,
    renderBehindVisualizer: renderBehindVisualizer.value,
    fitToWorkspace: fitsWorkspace.value,
    moveWholeSlideshow: moveWholeSlideshow.value,
    transform: transformPayload(),
  }
}

// ─── Presets ───────────────────────────────────────────────────────────────
/** Dauerhaft speicherbarer Verweis auf ein Stock-Bild (sonst null). */
function stockRefOf(img) {
  if (img?.source !== 'stock' || !img.stockImage) return null
  const { id, name, file, thumbnail } = img.stockImage
  return { id, name, file, thumbnail }
}

async function savePreset(name) {
  // Zustand sofort festhalten – während des Speicherns der Bilder kann sich
  // die Liste ändern
  const images = [...orderedImages.value]
  const snapshot = {
    settings: {
      fadeInDuration: fadeInDuration.value,
      displayDuration: displayDuration.value,
      fadeOutDuration: fadeOutDuration.value,
      applyAudioReactive: applyAudioReactive.value,
      loop: loopSlideshow.value,
      renderBehindVisualizer: renderBehindVisualizer.value,
      fitToWorkspace: fitToWorkspace.value,
      moveWholeSlideshow: moveWholeSlideshow.value,
      transform: {
        x: transformX.value,
        y: transformY.value,
        width: transformWidth.value,
        height: transformHeight.value,
      },
    },
    // Pro Position in der aktuellen Reihenfolge
    slots: images.map((img) => {
      const key = slideshowImageKey(img)
      return {
        displayDuration: imageDurations.value[key] ?? null,
        audioMode: imageAudioModes.value[key] ?? SLIDESHOW_AUDIO_DEFAULT,
        adjustments: props.adjustmentsApi?.get(img) ?? null,
        bounds: props.adjustmentsApi?.getBounds?.(img) ?? null,
        // Stock-Bilder dauerhaft als Verweis (Galerie-Pfad) speichern
        stock: stockRefOf(img),
      }
    }),
  }

  // Hochgeladene Bilder dauerhaft in IndexedDB ablegen (Verweis im Preset)
  const failed = []
  const uploadRefs = await Promise.all(
    images.map(async (img) => {
      if (img.source === 'stock') return null
      try {
        return await persistUploadImage(img)
      } catch (e) {
        console.warn('[SlideshowPresets] Bild nicht dauerhaft gespeichert:', img.name, e)
        failed.push(img.name)
        return null
      }
    }),
  )
  snapshot.slots.forEach((slot, i) => {
    slot.upload = uploadRefs[i] ?? null
  })

  // Bilder zusätzlich für diese Sitzung merken (exakte Objekte)
  const saved = presetStore.savePreset(name, snapshot, images)
  if (!saved) toastStore.error(t('slideshow.presetSaveError'))
  else if (failed.length > 0) {
    toastStore.warning(t('slideshow.presetImagesNotPersisted') + ': ' + failed.join(', '))
  } else toastStore.success(t('slideshow.presetSaved'))
}

async function loadPreset(preset) {
  const s = preset.settings
  // Bilder: 1. in dieser Sitzung gespeicherte Bilder, 2. dauerhaft gespeicherte
  // Verweise (Stock-Pfade, hochgeladene Bilder aus IndexedDB; fehlende Positionen
  // mit aktuell ausgewählten Uploads), 3. aktuelle Auswahl
  const previousKeys = orderedImages.value.map(slideshowImageKey).join('|')
  const sessionList = presetStore.getSessionImages(preset.id)
  let pairs
  if (sessionList && sessionList.length > 0) {
    pairs = sessionList.map((img, i) => ({ img, slot: preset.slots[i] }))
  } else {
    const restored = await restorePresetImages(
      preset.slots,
      props.images.length > 0 ? props.images : orderedImages.value,
      { loadUpload: restoreUploadImage },
    )
    if (restored?.missing.length > 0) {
      toastStore.warning(t('slideshow.presetImagesMissing') + ': ' + restored.missing.join(', '))
    }
    pairs = restored?.pairs ?? orderedImages.value.map((img, i) => ({ img, slot: preset.slots[i] }))
  }
  orderedImages.value = pairs.map((p) => p.img)
  const imagesChanged = orderedImages.value.map(slideshowImageKey).join('|') !== previousKeys
  fadeInDuration.value = s.fadeInDuration
  displayDuration.value = s.displayDuration
  fadeOutDuration.value = s.fadeOutDuration
  applyAudioReactive.value = s.applyAudioReactive
  loopSlideshow.value = s.loop
  if (renderBehindVisualizer.value !== s.renderBehindVisualizer) {
    renderBehindVisualizer.value = s.renderBehindVisualizer
    onRenderLayerChange()
  }
  if (moveWholeSlideshow.value !== s.moveWholeSlideshow) {
    moveWholeSlideshow.value = s.moveWholeSlideshow
    emit('move-mode-change', moveWholeSlideshow.value)
  }
  if (fitToWorkspace.value !== s.fitToWorkspace) {
    fitToWorkspace.value = s.fitToWorkspace
    onFitWorkspaceChange()
  }
  transformX.value = s.transform.x
  transformY.value = s.transform.y
  transformWidth.value = s.transform.width
  transformHeight.value = s.transform.height

  // Einstellungen pro Position auf die aktuelle Reihenfolge übertragen;
  // Bilder ohne passende Position erhalten die Standardwerte.
  const durations = {}
  const modes = {}
  pairs.forEach(({ img, slot }) => {
    const key = slideshowImageKey(img)
    if (!slot || key === undefined) return
    if (Number.isFinite(slot.displayDuration)) durations[key] = slot.displayDuration
    if (slot.audioMode !== SLIDESHOW_AUDIO_DEFAULT) modes[key] = slot.audioMode
  })
  // Bild-Anpassungen pro Position übernehmen (ohne Slot/Anpassung → verwerfen)
  pairs.forEach(({ img, slot }) => {
    props.adjustmentsApi?.set(
      img,
      slot?.adjustments ?? null,
      slot?.audioMode ?? SLIDESHOW_AUDIO_DEFAULT,
    )
    // Eigene Position/Größe des Bildes (ohne → gemeinsamer Bereich)
    props.adjustmentsApi?.setBounds?.(img, slot?.bounds ?? null)
  })
  imageDurations.value = durations
  imageAudioModes.value = modes
  // Läuft die Slideshow, sofort übernehmen – bei anderen Bildern neu starten
  if (props.isActive) {
    if (imagesChanged) emit('start', buildPayload())
    else emit('live-update', buildPayload())
  }
  toastStore.success(t('slideshow.presetLoaded'))
}

function resetImageAdjustments() {
  emit('reset-image-adjustments')
  toastStore.success(t('slideshow.adjustmentsReset'))
}

// Render Layer geändert (auch während laufender Slideshow)
function onRenderLayerChange() {
  emit('render-layer-change', renderBehindVisualizer.value)
}

// „An Workspace anpassen“: wie ein Workspace-Hintergrund hinter dem Visualizer
function onFitWorkspaceChange() {
  if (fitToWorkspace.value && !renderBehindVisualizer.value) {
    renderBehindVisualizer.value = true
    onRenderLayerChange()
  }
  emit('fit-workspace-change', fitsWorkspace.value)
}

// Workspace-Format entfernt/gewählt → Manager informieren
watch(
  () => props.hasWorkspace,
  () => {
    if (fitToWorkspace.value) emit('fit-workspace-change', fitsWorkspace.value)
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
.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  background-color: var(--secondary-bg);
  color: var(--text-muted);
}
.status-badge.active {
  background-color: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
}
.status-badge.paused {
  background-color: rgba(241, 196, 15, 0.2);
  color: #f1c40f;
}
[data-theme='light'] .panel-header h4 {
  color: #003971;
}
[data-theme='light'] .status-badge {
  background-color: #f0ead0;
  color: #4d6d8e;
}
.adjustments-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--card-bg);
}
.adjustments-section .hint {
  padding-left: 0;
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
  color: #003971;
  border-color: #d4c8a8;
}
.checkbox-label.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-theme='light'] .layer-section {
  border-top-color: #d4c8a8;
}
</style>
