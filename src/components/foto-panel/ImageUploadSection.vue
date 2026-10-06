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

<style scoped>
/* Upload-Bereich Styles */
.upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: var(--secondary-bg);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color);
}

.upload-section h4 {
  margin: 0 0 14px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
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
  font-size: 14px;
  font-weight: 500;
  color: var(--ds-text);
}

.upload-placeholder small {
  font-size: 11px;
  color: var(--text-muted);
}

/* Galerie-Container */
.gallery-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: var(--secondary-bg);
  border-radius: 8px;
  padding: 12px;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.gallery-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ds-text);
}

.btn-clear-all {
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--ds-danger);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
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

.gallery-scroll::-webkit-scrollbar-track {
  background: var(--secondary-bg);
  border-radius: 3px;
}

.gallery-scroll::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.gallery-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--image-section-accent);
}

/* Thumbnail-Grid */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.thumbnail-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: grab;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background-color: var(--secondary-bg);
}

.thumbnail-item:active {
  cursor: grabbing;
}

.thumbnail-item:hover {
  border-color: var(--image-section-accent);
  transform: scale(1.02);
}

.thumbnail-item.selected {
  border-color: var(--image-section-accent);
  box-shadow: 0 0 0 2px rgba(110, 168, 254, 0.3);
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.thumbnail-item:hover .thumbnail-overlay {
  opacity: 1;
}

.btn-delete-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: var(--ds-danger);
  color: white;
  border: 1.5px solid white;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-delete-thumb:hover {
  background-color: var(--ds-danger);
  transform: scale(1.1);
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
  font-size: 10px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumbnail-size {
  font-size: 9px;
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

.btn-select-all,
.btn-deselect-all {
  padding: 5px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--secondary-bg);
  color: var(--ds-text);
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 500;
}

.btn-select-all:hover:not(:disabled),
.btn-deselect-all:hover:not(:disabled) {
  background-color: var(--secondary-bg);
  border-color: var(--image-section-accent);
  color: var(--image-section-accent);
}

.btn-select-all:disabled,
.btn-deselect-all:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.selection-count {
  font-size: 11px;
  color: var(--image-section-accent);
  font-weight: 600;
  padding: 4px 8px;
  background-color: color-mix(in srgb, var(--ds-link) 15%, transparent);
  border-radius: 4px;
  margin-left: auto;
}

.multiselect-hint {
  font-size: 10px;
  color: var(--text-muted);
  margin: 0 0 2px 0;
  font-style: italic;
}

.drag-hint {
  font-size: 10px;
  color: var(--accent-tertiary);
  margin: 0 0 8px 0;
  font-style: italic;
  display: flex;
  align-items: center;
  gap: 4px;
}

.drag-hint::before {
  content: '↦';
  font-style: normal;
  font-size: 12px;
}

/* Selection Checkbox */
.slideshow-select-hint {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--image-section-accent);
}
/* Größere Klickfläche für die Checkbox, ohne das Aussehen zu ändern */
.selection-checkbox::before {
  content: '';
  position: absolute;
  inset: -8px;
}
.selection-checkbox {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  border: 2px solid var(--ds-border);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  color: white;
  font-weight: bold;
}

.selection-checkbox.checked {
  background-color: var(--image-section-accent);
  border-color: var(--image-section-accent);
  box-shadow: 0 2px 6px rgba(110, 168, 254, 0.4);
}

.thumbnail-item:hover .selection-checkbox:not(.checked) {
  border-color: var(--image-section-accent);
  background-color: color-mix(in srgb, var(--ds-link) 30%, transparent);
}

/* Action-Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-buttons button {
  padding: 6px 10px;
  border-radius: 5px;
  border: 1px solid var(--border-color);
  font-size: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 600;
}

.btn-primary {
  background: var(--ds-accent-soft);
  color: var(--accent-tertiary);
  border: 1px solid var(--ds-border);
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background-color: var(--btn-hover);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.btn-workspace {
  background: color-mix(in srgb, var(--ds-warning) 10%, transparent);
  color: var(--ds-warning);
  border: 1px solid color-mix(in srgb, var(--ds-warning) 30%, transparent);
}

.btn-workspace:hover {
  background: color-mix(in srgb, var(--ds-warning) 20%, transparent);
  border-color: color-mix(in srgb, var(--ds-warning) 50%, transparent);
  transform: translateY(-1px);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
}

.empty-state p {
  margin: 0;
  font-size: 13px;
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

[data-theme='light'] .gallery-scroll::-webkit-scrollbar-thumb {
  background: var(--ds-link);
}

[data-theme='light'] .gallery-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--accent-primary);
}

[data-theme='light'] .thumbnail-item:hover {
  border-color: var(--accent-primary);
}

[data-theme='light'] .thumbnail-item.selected {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 30%, transparent);
}

[data-theme='light'] .btn-select-all,
[data-theme='light'] .btn-deselect-all {
  border-color: var(--border-color);
  background-color: var(--card-bg);
  color: var(--text-primary);
}

[data-theme='light'] .btn-select-all:hover:not(:disabled),
[data-theme='light'] .btn-deselect-all:hover:not(:disabled) {
  border-color: var(--accent-primary);
  color: var(--accent-ink);
}

[data-theme='light'] .selection-count {
  color: var(--accent-ink);
  background-color: color-mix(in srgb, var(--accent-primary) 10%, transparent);
}

[data-theme='light'] .selection-checkbox.checked {
  background-color: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--accent-primary) 40%, transparent);
}

[data-theme='light'] .thumbnail-item:hover .selection-checkbox:not(.checked) {
  border-color: var(--accent-primary);
  background-color: color-mix(in srgb, var(--accent-primary) 30%, transparent);
}

[data-theme='light'] .action-buttons button {
  border-color: var(--border-color);
}

[data-theme='light'] .btn-primary {
  background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
  color: var(--accent-ink);
  border-color: var(--border-color);
}

[data-theme='light'] .btn-primary:hover {
  background: color-mix(in srgb, var(--accent-primary) 25%, transparent);
}

[data-theme='light'] .btn-secondary {
  background-color: var(--card-bg);
  border-color: var(--border-color);
}

[data-theme='light'] .btn-secondary:hover {
  background-color: var(--secondary-bg);
}
</style>
