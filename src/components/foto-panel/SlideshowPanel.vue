<template>
  <div class="slideshow-panel" v-if="images.length >= 2 || isActive">
    <div class="panel-header">
      <h4>{{ t('slideshow.title') }}</h4>
      <div class="status-badge" :class="{ 'active': isActive, 'paused': isPaused }">
        <span v-if="isActive && !isPaused">{{ t('slideshow.running') }}</span>
        <span v-else-if="isPaused">{{ t('slideshow.paused') }}</span>
        <span v-else>{{ t('slideshow.ready') }}</span>
      </div>
    </div>

    <!-- Reihenfolge der Bilder (nur wenn nicht aktiv) -->
    <div class="order-section" v-if="!isActive && images.length >= 2">
      <label class="section-label">{{ t('slideshow.order') }}</label>
      <div class="image-order-list" ref="orderListRef">
        <div
          v-for="(img, index) in orderedImages"
          :key="img.id || index"
          class="order-item"
          :class="{ 'dragging': dragIndex === index }"
          draggable="true"
          @dragstart="onDragStart(index, $event)"
          @dragover.prevent="onDragOver(index)"
          @drop="onDrop(index)"
          @dragend="onDragEnd"
        >
          <span class="order-number">{{ index + 1 }}</span>
          <img :src="img.img?.src || img.imageObject?.src" :alt="img.name || 'Bild'" class="order-thumb">
          <span class="order-name">{{ img.name || `Bild ${index + 1}` }}</span>
          <span class="drag-handle">&#x2630;</span>
        </div>
      </div>
    </div>

    <!-- Timing-Einstellungen (nur wenn nicht aktiv) -->
    <div class="timing-section" v-if="!isActive">
      <label class="section-label">{{ t('slideshow.timing') }}</label>

      <div class="timing-control">
        <label>{{ t('slideshow.fadeIn') }}</label>
        <div class="slider-row">
          <input
            type="range"
            v-model.number="fadeInDuration"
            min="100"
            max="5000"
            step="100"
          >
          <span class="value">{{ (fadeInDuration / 1000).toFixed(1) }}s</span>
        </div>
      </div>

      <div class="timing-control">
        <label>{{ t('slideshow.display') }}</label>
        <div class="slider-row">
          <input
            type="range"
            v-model.number="displayDuration"
            min="500"
            max="30000"
            step="500"
          >
          <span class="value">{{ (displayDuration / 1000).toFixed(1) }}s</span>
        </div>
      </div>

      <div class="timing-control">
        <label>{{ t('slideshow.fadeOut') }}</label>
        <div class="slider-row">
          <input
            type="range"
            v-model.number="fadeOutDuration"
            min="100"
            max="5000"
            step="100"
          >
          <span class="value">{{ (fadeOutDuration / 1000).toFixed(1) }}s</span>
        </div>
      </div>
    </div>

    <!-- Audio-Reaktiv Option (nur wenn nicht aktiv) -->
    <div class="audio-reactive-section" v-if="!isActive">
      <label class="checkbox-label">
        <input
          type="checkbox"
          v-model="applyAudioReactive"
        >
        <span>{{ t('slideshow.applyAudioReactive') }}</span>
      </label>
      <p class="hint" v-if="applyAudioReactive && hasSavedSettings">
        {{ t('slideshow.audioReactiveHint') }}
      </p>
      <p class="hint warning" v-if="applyAudioReactive && !hasSavedSettings">
        {{ t('slideshow.noSavedSettings') }}
      </p>
    </div>

    <!-- Loop Option (nur wenn nicht aktiv) -->
    <div class="loop-section" v-if="!isActive">
      <label class="checkbox-label">
        <input
          type="checkbox"
          v-model="loopSlideshow"
        >
        <span>{{ t('slideshow.loop') }}</span>
      </label>
    </div>

    <!-- Render Behind Visualizer Option -->
    <div class="layer-section">
      <label class="checkbox-label">
        <input
          type="checkbox"
          v-model="renderBehindVisualizer"
          @change="onRenderLayerChange"
        >
        <span>{{ t('slideshow.renderBehind') }}</span>
      </label>
    </div>

    <!-- Position & Größe Sektion -->
    <div class="transform-section" v-if="!isActive">
      <label class="section-label">{{ t('slideshow.positionSize') }}</label>

      <div class="transform-controls">
        <div class="transform-control">
          <label>{{ t('slideshow.positionX') }}</label>
          <div class="slider-row">
            <input
              type="range"
              v-model.number="transformX"
              min="0"
              max="100"
              step="1"
            >
            <span class="value">{{ transformX }}%</span>
          </div>
        </div>

        <div class="transform-control">
          <label>{{ t('slideshow.positionY') }}</label>
          <div class="slider-row">
            <input
              type="range"
              v-model.number="transformY"
              min="0"
              max="100"
              step="1"
            >
            <span class="value">{{ transformY }}%</span>
          </div>
        </div>

        <div class="transform-control">
          <label>{{ t('slideshow.width') }}</label>
          <div class="slider-row">
            <input
              type="range"
              v-model.number="transformWidth"
              min="10"
              max="100"
              step="1"
            >
            <span class="value">{{ transformWidth }}%</span>
          </div>
        </div>

        <div class="transform-control">
          <label>{{ t('slideshow.height') }}</label>
          <div class="slider-row">
            <input
              type="range"
              v-model.number="transformHeight"
              min="10"
              max="100"
              step="1"
            >
            <span class="value">{{ transformHeight }}%</span>
          </div>
        </div>

        <button class="btn-reset-transform" @click="resetTransform">
          {{ t('slideshow.resetPosition') }}
        </button>
      </div>

      <p class="hint">{{ t('slideshow.dragHint') }}</p>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button
        v-if="!isActive"
        @click="startSlideshow"
        class="btn-start"
      >
        {{ t('slideshow.start') }}
      </button>

      <template v-else>
        <button
          v-if="!isPaused"
          @click="pauseSlideshow"
          class="btn-pause"
        >
          {{ t('slideshow.pause') }}
        </button>
        <button
          v-else
          @click="resumeSlideshow"
          class="btn-resume"
        >
          {{ t('slideshow.resume') }}
        </button>
        <button
          @click="stopSlideshow"
          class="btn-stop"
        >
          {{ t('slideshow.stop') }}
        </button>
      </template>
    </div>

    <!-- Progress Indicator -->
    <div v-if="isActive" class="progress-section">
      <div class="progress-info">
        <span>{{ t('slideshow.image') }} {{ currentImageIndex + 1 }} / {{ totalImages || images.length }}</span>
        <span class="phase-indicator" :class="currentPhase">{{ phaseLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from '../../lib/i18n.js';

const { t, locale } = useI18n();

const props = defineProps({
  images: {
    type: Array,
    required: true
  },
  hasSavedSettings: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  currentImageIndex: {
    type: Number,
    default: 0
  },
  totalImages: {
    type: Number,
    default: 0
  },
  currentPhase: {
    type: String,
    default: 'fadeIn'
  }
});

const emit = defineEmits([
  'start',
  'pause',
  'resume',
  'stop',
  'order-changed',
  'render-layer-change',
  'transform-change'
]);

// Timing-Einstellungen
const fadeInDuration = ref(1000);
const displayDuration = ref(3000);
const fadeOutDuration = ref(1000);
const applyAudioReactive = ref(true);
const loopSlideshow = ref(false);

// ✨ NEU: Render Layer
const renderBehindVisualizer = ref(false);

// ✨ NEU: Transform-Einstellungen (in Prozent für UI)
const transformX = ref(10);      // 0-100%
const transformY = ref(10);      // 0-100%
const transformWidth = ref(80);  // 10-100%
const transformHeight = ref(80); // 10-100%

// Geordnete Bilder-Liste
const orderedImages = ref([]);

// Drag & Drop State
const dragIndex = ref(null);
const orderListRef = ref(null);

// Initialisiere geordnete Bilder wenn sich images ändert
watch(() => props.images, (newImages) => {
  orderedImages.value = [...newImages];
}, { immediate: true, deep: true });

// Phase Label
const phaseLabel = computed(() => {
  switch (props.currentPhase) {
    case 'fadeIn':
      return locale.value === 'de' ? 'Einblenden' : 'Fading In';
    case 'display':
      return locale.value === 'de' ? 'Anzeige' : 'Displaying';
    case 'fadeOut':
      return locale.value === 'de' ? 'Ausblenden' : 'Fading Out';
    default:
      return '';
  }
});

// Drag & Drop Handlers
function onDragStart(index, event) {
  dragIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', index.toString());
}

function onDragOver(index) {
  if (dragIndex.value === null || dragIndex.value === index) return;

  const item = orderedImages.value[dragIndex.value];
  orderedImages.value.splice(dragIndex.value, 1);
  orderedImages.value.splice(index, 0, item);
  dragIndex.value = index;
}

function onDrop() {
  emit('order-changed', orderedImages.value);
}

function onDragEnd() {
  dragIndex.value = null;
}

// Slideshow Controls
function startSlideshow() {
  emit('start', {
    images: orderedImages.value,
    fadeInDuration: fadeInDuration.value,
    displayDuration: displayDuration.value,
    fadeOutDuration: fadeOutDuration.value,
    applyAudioReactive: applyAudioReactive.value,
    loop: loopSlideshow.value,
    renderBehindVisualizer: renderBehindVisualizer.value,
    transform: {
      relX: transformX.value / 100,
      relY: transformY.value / 100,
      relWidth: transformWidth.value / 100,
      relHeight: transformHeight.value / 100
    }
  });
}

function pauseSlideshow() {
  emit('pause');
}

function resumeSlideshow() {
  emit('resume');
}

function stopSlideshow() {
  emit('stop');
}

// ✨ NEU: Render Layer geändert (auch während laufender Slideshow)
function onRenderLayerChange() {
  emit('render-layer-change', renderBehindVisualizer.value);
}

// ✨ NEU: Transform zurücksetzen
function resetTransform() {
  transformX.value = 10;
  transformY.value = 10;
  transformWidth.value = 80;
  transformHeight.value = 80;
  emitTransformChange();
}

// ✨ NEU: Transform-Änderung emittieren
function emitTransformChange() {
  emit('transform-change', {
    relX: transformX.value / 100,
    relY: transformY.value / 100,
    relWidth: transformWidth.value / 100,
    relHeight: transformHeight.value / 100
  });
}

// ✨ NEU: Watch für Transform-Änderungen
watch([transformX, transformY, transformWidth, transformHeight], () => {
  emitTransformChange();
}, { deep: true });
</script>

<style scoped>
.slideshow-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #3a3a3a;
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
  background-color: #3a3a3a;
  color: #888;
}

.status-badge.active {
  background-color: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
}

.status-badge.paused {
  background-color: rgba(241, 196, 15, 0.2);
  color: #f1c40f;
}

.section-label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  display: block;
}

/* Reihenfolge-Liste */
.order-section {
  display: flex;
  flex-direction: column;
}

.image-order-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 4px;
}

.image-order-list::-webkit-scrollbar {
  width: 6px;
}

.image-order-list::-webkit-scrollbar-track {
  background: #1e1e1e;
  border-radius: 3px;
}

.image-order-list::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #333;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: grab;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.order-item:hover {
  background-color: #3a3a3a;
  border-color: #4a4a4a;
}

.order-item.dragging {
  opacity: 0.5;
  border-color: var(--image-section-accent, #6ea8fe);
}

.order-number {
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a9af8 100%);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.order-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.order-name {
  flex: 1;
  font-size: 12px;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drag-handle {
  color: #666;
  font-size: 14px;
  cursor: grab;
  padding: 4px;
}

.drag-handle:hover {
  color: #888;
}

/* Timing-Sektion */
.timing-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timing-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timing-control label {
  font-size: 11px;
  color: #aaa;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-row input[type="range"] {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #444;
  -webkit-appearance: none;
  appearance: none;
}

.slider-row input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a9af8 100%);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(110, 168, 254, 0.4);
}

.slider-row .value {
  font-size: 12px;
  color: #6ea8fe;
  font-weight: 600;
  min-width: 45px;
  text-align: right;
}

/* Audio-Reaktiv & Loop Sektion */
.audio-reactive-section,
.loop-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 12px;
  color: #e0e0e0;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #6ea8fe;
  cursor: pointer;
}

.hint {
  font-size: 10px;
  color: #888;
  margin: 0;
  padding-left: 26px;
}

.hint.warning {
  color: #f1c40f;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-buttons button {
  flex: 1;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-start {
  background: linear-gradient(135deg, #6ea8fe 0%, #5a9af8 100%);
  color: #fff;
}

.btn-start:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.4);
}

.btn-pause {
  background: linear-gradient(135deg, #f1c40f 0%, #e2b70e 100%);
  color: #1e1e1e;
}

.btn-pause:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(241, 196, 15, 0.4);
}

.btn-resume {
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  color: #fff;
}

.btn-resume:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
}

.btn-stop {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: #fff;
}

.btn-stop:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

/* Progress Section */
.progress-section {
  padding-top: 12px;
  border-top: 1px solid #3a3a3a;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #aaa;
}

.phase-indicator {
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 9px;
}

.phase-indicator.fadeIn {
  background-color: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
}

.phase-indicator.display {
  background-color: rgba(110, 168, 254, 0.2);
  color: #6ea8fe;
}

.phase-indicator.fadeOut {
  background-color: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

/* ✨ Layer Section */
.layer-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #3a3a3a;
}

/* ✨ Transform Section */
.transform-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid #3a3a3a;
}

.transform-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.transform-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.transform-control label {
  font-size: 11px;
  color: #aaa;
}

.btn-reset-transform {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #4a4a4a;
  background-color: #333;
  color: #e0e0e0;
}

.btn-reset-transform:hover {
  background-color: #3a3a3a;
  border-color: #6ea8fe;
  color: #6ea8fe;
}
</style>
