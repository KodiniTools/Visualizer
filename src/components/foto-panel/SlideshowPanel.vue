<template>
  <div v-if="images.length >= 2 || isActive" class="slideshow-panel">
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
      v-if="!isActive && images.length >= 2"
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

    <!-- Presets (nur wenn nicht aktiv) -->
    <SlideshowPresets
      v-if="!isActive"
      :presets="presetStore.presets"
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
      :total-images="totalImages || images.length"
      :current-phase="currentPhase"
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
  // { get(img) → object|null, set(img, settings|null, audioMode) } – gemerkte Bild-Anpassungen
  adjustmentsApi: { type: Object, default: null },
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
// Optionaler Audio-Reaktiv-Modus pro Bild ({ [id]: mode }); fehlt ein Eintrag, gilt 'default'
const imageAudioModes = ref({})

watch(
  () => props.images,
  (newImages) => {
    orderedImages.value = [...newImages]
  },
  { immediate: true, deep: true },
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
  emit('start', {
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
    transform: transformPayload(),
  })
}

// ─── Presets ───────────────────────────────────────────────────────────────
function savePreset(name) {
  const saved = presetStore.savePreset(name, {
    settings: {
      fadeInDuration: fadeInDuration.value,
      displayDuration: displayDuration.value,
      fadeOutDuration: fadeOutDuration.value,
      applyAudioReactive: applyAudioReactive.value,
      loop: loopSlideshow.value,
      renderBehindVisualizer: renderBehindVisualizer.value,
      fitToWorkspace: fitToWorkspace.value,
      transform: {
        x: transformX.value,
        y: transformY.value,
        width: transformWidth.value,
        height: transformHeight.value,
      },
    },
    // Pro Position in der aktuellen Reihenfolge
    slots: orderedImages.value.map((img) => {
      const key = slideshowImageKey(img)
      return {
        displayDuration: imageDurations.value[key] ?? null,
        audioMode: imageAudioModes.value[key] ?? SLIDESHOW_AUDIO_DEFAULT,
        adjustments: props.adjustmentsApi?.get(img) ?? null,
      }
    }),
  })
  if (saved) toastStore.success(t('slideshow.presetSaved'))
  else toastStore.error(t('slideshow.presetSaveError'))
}

function loadPreset(preset) {
  const s = preset.settings
  fadeInDuration.value = s.fadeInDuration
  displayDuration.value = s.displayDuration
  fadeOutDuration.value = s.fadeOutDuration
  applyAudioReactive.value = s.applyAudioReactive
  loopSlideshow.value = s.loop
  if (renderBehindVisualizer.value !== s.renderBehindVisualizer) {
    renderBehindVisualizer.value = s.renderBehindVisualizer
    onRenderLayerChange()
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
  orderedImages.value.forEach((img, index) => {
    const slot = preset.slots[index]
    const key = slideshowImageKey(img)
    if (!slot || key === undefined) return
    if (Number.isFinite(slot.displayDuration)) durations[key] = slot.displayDuration
    if (slot.audioMode !== SLIDESHOW_AUDIO_DEFAULT) modes[key] = slot.audioMode
  })
  // Bild-Anpassungen pro Position übernehmen (ohne Slot/Anpassung → verwerfen)
  orderedImages.value.forEach((img, index) => {
    const slot = preset.slots[index]
    props.adjustmentsApi?.set(
      img,
      slot?.adjustments ?? null,
      slot?.audioMode ?? SLIDESHOW_AUDIO_DEFAULT,
    )
  })
  imageDurations.value = durations
  imageAudioModes.value = modes
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
