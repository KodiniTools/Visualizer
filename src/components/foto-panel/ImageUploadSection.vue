<template>
  <div class="upload-section">
    <h4>{{ t('foto.ownImages') }}</h4>

    <div class="upload-area" @click="triggerFileInput">
      <input
        type="file"
        ref="fileInputRef"
        @change="$emit('upload', $event)"
        accept="image/*"
        multiple
        style="display: none"
      />
      <div class="upload-placeholder">
        <p>{{ t('foto.clickToUpload') }}</p>
        <small>{{ t('foto.multipleImagesHint') }}</small>
        <small>{{ locale === 'de' ? 'oder Ctrl+V zum Einfügen' : 'or Ctrl+V to paste' }}</small>
      </div>
    </div>

    <!-- Scrollbare Galerie mit Thumbnails -->
    <div v-if="imageGallery.length > 0" class="gallery-container">
      <div class="gallery-header">
        <span class="gallery-title">{{
          locale === 'de'
            ? 'Galerie (' + imageGallery.length + ')'
            : 'Gallery (' + imageGallery.length + ')'
        }}</span>
        <button @click="$emit('clear-all')" class="btn-clear-all">{{ t('foto.deleteAll') }}</button>
      </div>

      <!-- Auswahl-Steuerung -->
      <div class="selection-controls">
        <button
          @click="$emit('select-all')"
          class="btn-select-all"
          :disabled="selectedImageCount === imageGallery.length"
        >
          {{ t('foto.selectAll') }}
        </button>
        <button
          @click="$emit('deselect-all')"
          class="btn-deselect-all"
          :disabled="selectedImageCount === 0"
        >
          {{ t('foto.deselectAll') }}
        </button>
        <span v-if="selectedImageCount > 0" class="selection-count"
          >{{ selectedImageCount }} {{ t('foto.selected') }}</span
        >
      </div>
      <p class="multiselect-hint">{{ t('foto.multiselectHint') }}</p>
      <p v-if="selectedImageCount === 1 && imageGallery.length > 1" class="slideshow-select-hint">
        {{ t('foto.slideshowSelectHint') }}
      </p>
      <p class="drag-hint">{{ t('foto.dragToCanvasHint') }}</p>

      <div class="gallery-scroll">
        <div class="gallery-grid">
          <div
            v-for="(imgData, index) in imageGallery"
            :key="imgData.id"
            class="thumbnail-item"
            :class="{ selected: selectedImageIndices.has(index) }"
            draggable="true"
            @click="$emit('select-image', index, $event)"
            @dblclick="$emit('open-preview', imgData)"
            @dragstart="$emit('image-dragstart', { imgData, event: $event })"
            @dragend="$emit('image-dragend')"
          >
            <!-- Checkbox für Mehrfachauswahl: schaltet additiv um (wie Strg+Klick) -->
            <div
              class="selection-checkbox"
              :class="{ checked: selectedImageIndices.has(index) }"
              role="checkbox"
              :aria-checked="selectedImageIndices.has(index)"
              :aria-label="imgData.name"
              @click.stop="$emit('select-image', index, { ctrlKey: true })"
              @dblclick.stop
            >
              <span v-if="selectedImageIndices.has(index)">✓</span>
            </div>
            <img :src="imgData.img.src" :alt="imgData.name" draggable="false" />
            <div class="thumbnail-overlay">
              <button @click.stop="$emit('delete-image', index)" class="btn-delete-thumb">✕</button>
            </div>
            <div class="thumbnail-info">
              <span class="thumbnail-name">{{ imgData.name }}</span>
              <span class="thumbnail-size">{{ imgData.dimensions }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action-Buttons (nur sichtbar wenn Bilder ausgewählt) -->
    <div v-if="selectedImageCount > 0" class="action-buttons">
      <button @click="$emit('add-to-canvas')" class="btn-primary">
        {{
          selectedImageCount > 1
            ? locale === 'de'
              ? `${selectedImageCount} Bilder auf Canvas`
              : `${selectedImageCount} images on Canvas`
            : t('foto.placeOnCanvas')
        }}
      </button>
      <button
        v-if="selectedImageCount === 1"
        @click="$emit('set-as-background')"
        class="btn-secondary"
      >
        {{ t('foto.asBackground') }}
      </button>
      <button
        v-if="selectedImageCount === 1"
        @click="$emit('set-as-workspace-background')"
        class="btn-workspace"
      >
        {{ t('foto.asWorkspaceBackground') }}
      </button>
    </div>

    <!-- Platzierung mit Animation für eigene Bilder -->
    <PlacementSettings
      v-if="selectedImageCount === 1"
      :selectedAnimation="selectedAnimation"
      :animationDuration="animationDuration"
      :imageScale="imageScale"
      :imageOffsetX="imageOffsetX"
      :imageOffsetY="imageOffsetY"
      :isInRangeSelectionMode="isInRangeSelectionMode"
      @update:settings="$emit('update:placement-settings', $event)"
      @start-draw="$emit('start-range-selection')"
      @place-directly="$emit('add-directly')"
    />

    <!-- Info-Text wenn keine Bilder -->
    <div v-if="imageGallery.length === 0" class="empty-state">
      <p>{{ t('foto.noImagesUploaded') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import PlacementSettings from './PlacementSettings.vue'

const { t, locale } = useI18n()

defineProps({
  imageGallery: {
    type: Array,
    default: () => [],
  },
  selectedImageIndices: {
    type: Set,
    default: () => new Set(),
  },
  selectedImageCount: {
    type: Number,
    default: 0,
  },
  selectedAnimation: {
    type: String,
    default: 'none',
  },
  animationDuration: {
    type: Number,
    default: 1000,
  },
  imageScale: {
    type: Number,
    default: 1,
  },
  imageOffsetX: {
    type: Number,
    default: 0,
  },
  imageOffsetY: {
    type: Number,
    default: 0,
  },
  isInRangeSelectionMode: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'upload',
  'select-image',
  'open-preview',
  'delete-image',
  'clear-all',
  'select-all',
  'deselect-all',
  'add-to-canvas',
  'set-as-background',
  'set-as-workspace-background',
  'start-range-selection',
  'add-directly',
  'update:placement-settings',
  'image-dragstart',
  'image-dragend',
])

const fileInputRef = ref(null)

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onPaste(event) {
  const items = event.clipboardData?.items
  if (!items) return
  const imageFiles = []
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) imageFiles.push(file)
    }
  }
  if (imageFiles.length > 0) {
    emit('upload', { target: { files: imageFiles } })
  }
}

onMounted(() => document.addEventListener('paste', onPaste))
onUnmounted(() => document.removeEventListener('paste', onPaste))
</script>

<style scoped src="./image-grid-shared.css"></style>

<style scoped>
/* Upload-Bereich Styles */
.upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: var(--secondary-bg);
  border-radius: var(--ds-radius-md);
  padding: 16px;
  border: 1px solid var(--border-color);
}

.upload-section h4 {
  margin: 0 0 14px 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.upload-area {
  border: 2px dashed var(--border-color);
  border-radius: var(--ds-radius-md);
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all var(--ds-duration-slow) var(--ds-ease);
  background-color: var(--secondary-bg);
}

.upload-area:hover {
  border-color: var(--image-section-accent);
  background-color: var(--secondary-bg);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-placeholder p {
  margin: 0;
  font-size: var(--ds-text-md);
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text);
}

.upload-placeholder small {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}

/* Galerie-Container */
.gallery-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: var(--secondary-bg);
  border-radius: var(--ds-radius-md);
  padding: 12px;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.gallery-title {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
}

.btn-clear-all {
  padding: 4px 10px;
  font-size: var(--ds-text-xs);
  border-radius: var(--ds-radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--ds-danger);
  color: white;
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-clear-all:hover {
  background-color: var(--ds-danger);
}

/* Scrollbarer Galerie-Bereich */
.gallery-scroll {
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

/* Custom Scrollbar */
.gallery-scroll::-webkit-scrollbar {
  width: 6px;
}

/* Thumbnail-Grid */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4px;
  opacity: 0;
  transition: opacity var(--ds-duration) var(--ds-ease);
}

.thumbnail-item:hover .thumbnail-overlay {
  opacity: 1;
}

.btn-delete-thumb {
  width: 22px;
  height: 22px;
  border-radius: var(--ds-radius-full);
  background-color: var(--ds-danger);
  color: white;
  border: 1.5px solid white;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-delete-thumb:hover {
  background-color: var(--ds-danger);
}

.thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 6px 6px 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.thumbnail-name {
  font-size: var(--ds-text-xs);
  color: white;
  font-weight: var(--ds-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumbnail-size {
  font-size: var(--ds-text-xs);
  color: var(--text-secondary);
}

/* Selection Controls */
.selection-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

/* Selection Checkbox */
.slideshow-select-hint {
  margin: 4px 0 0;
  font-size: var(--ds-text-xs);
  color: var(--image-section-accent);
}

/* Größere Klickfläche für die Checkbox, ohne das Aussehen zu ändern */
.selection-checkbox::before {
  content: '';
  position: absolute;
  inset: -8px;
}

/* Action-Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .upload-section {
  background-color: var(--card-bg);
  border-color: var(--border-color);
}

[data-theme='light'] .upload-area {
  border-color: var(--border-color);
}

[data-theme='light'] .upload-area:hover {
  border-color: var(--accent-primary);
  background-color: var(--card-bg);
}

[data-theme='light'] .upload-placeholder p {
  color: var(--text-primary);
}

[data-theme='light'] .gallery-container {
  background-color: var(--card-bg);
}

[data-theme='light'] .gallery-title {
  color: var(--text-primary);
}

[data-theme='light'] .btn-clear-all {
  border-color: color-mix(in srgb, var(--ds-danger) 50%, transparent);
}
</style>
