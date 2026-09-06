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
    </div>

    <!-- Position & Größe (nur wenn nicht aktiv) -->
    <SlideshowTransformSettings
      v-if="!isActive"
      v-model:transform-x="transformX"
      v-model:transform-y="transformY"
      v-model:transform-width="transformWidth"
      v-model:transform-height="transformHeight"
      @reset="emitTransformChange"
    />

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
import { ref, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import SlideshowOrderList from './slideshow/SlideshowOrderList.vue'
import SlideshowTimingSettings from './slideshow/SlideshowTimingSettings.vue'
import SlideshowTransformSettings from './slideshow/SlideshowTransformSettings.vue'
import SlideshowControls from './slideshow/SlideshowControls.vue'

const { t } = useI18n()

const props = defineProps({
  images: { type: Array, required: true },
  hasSavedSettings: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },
  currentImageIndex: { type: Number, default: 0 },
  totalImages: { type: Number, default: 0 },
  currentPhase: { type: String, default: 'fadeIn' },
})

const emit = defineEmits([
  'start',
  'pause',
  'resume',
  'stop',
  'order-changed',
  'render-layer-change',
  'transform-change',
])

// Timing-Einstellungen
const fadeInDuration = ref(1000)
const displayDuration = ref(3000)
const fadeOutDuration = ref(1000)
const applyAudioReactive = ref(true)
const loopSlideshow = ref(false)

// Render Layer
const renderBehindVisualizer = ref(false)

// Transform-Einstellungen (in Prozent für UI)
const transformX = ref(10)
const transformY = ref(10)
const transformWidth = ref(80)
const transformHeight = ref(80)

// Geordnete Bilder-Liste (Reihenfolge per Drag & Drop in SlideshowOrderList)
const orderedImages = ref([])

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
    images: orderedImages.value,
    fadeInDuration: fadeInDuration.value,
    displayDuration: displayDuration.value,
    fadeOutDuration: fadeOutDuration.value,
    applyAudioReactive: applyAudioReactive.value,
    loop: loopSlideshow.value,
    renderBehindVisualizer: renderBehindVisualizer.value,
    transform: transformPayload(),
  })
}

// Render Layer geändert (auch während laufender Slideshow)
function onRenderLayerChange() {
  emit('render-layer-change', renderBehindVisualizer.value)
}

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
[data-theme='light'] .layer-section {
  border-top-color: #d4c8a8;
}
</style>
