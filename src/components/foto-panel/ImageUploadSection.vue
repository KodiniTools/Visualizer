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
        style="display: none;"
      >
      <div class="upload-placeholder">
        <p>{{ t('foto.clickToUpload') }}</p>
        <small>{{ t('foto.multipleImagesHint') }}</small>
      </div>
    </div>

    <!-- Scrollbare Galerie mit Thumbnails -->
    <div v-if="imageGallery.length > 0" class="gallery-container">
      <div class="gallery-header">
        <span class="gallery-title">{{ locale === 'de' ? 'Galerie (' + imageGallery.length + ')' : 'Gallery (' + imageGallery.length + ')' }}</span>
        <button @click="$emit('clear-all')" class="btn-clear-all">{{ t('foto.deleteAll') }}</button>
      </div>

      <!-- Auswahl-Steuerung -->
      <div class="selection-controls">
        <button @click="$emit('select-all')" class="btn-select-all" :disabled="selectedImageCount === imageGallery.length">
          {{ t('foto.selectAll') }}
        </button>
        <button @click="$emit('deselect-all')" class="btn-deselect-all" :disabled="selectedImageCount === 0">
          {{ t('foto.deselectAll') }}
        </button>
        <span v-if="selectedImageCount > 0" class="selection-count">{{ selectedImageCount }} {{ t('foto.selected') }}</span>
      </div>
      <p class="multiselect-hint">{{ t('foto.multiselectHint') }}</p>

      <div class="gallery-scroll">
        <div class="gallery-grid">
          <div
            v-for="(imgData, index) in imageGallery"
            :key="imgData.id"
            class="thumbnail-item"
            :class="{ 'selected': selectedImageIndices.has(index) }"
            @click="$emit('select-image', index, $event)"
            @dblclick="$emit('open-preview', imgData)"
          >
            <!-- Checkbox für Mehrfachauswahl -->
            <div class="selection-checkbox" :class="{ 'checked': selectedImageIndices.has(index) }">
              <span v-if="selectedImageIndices.has(index)">✓</span>
            </div>
            <img :src="imgData.img.src" :alt="imgData.name">
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
        {{ selectedImageCount > 1 ? (locale === 'de' ? `${selectedImageCount} Bilder auf Canvas` : `${selectedImageCount} images on Canvas`) : t('foto.placeOnCanvas') }}
      </button>
      <button v-if="selectedImageCount === 1" @click="$emit('set-as-background')" class="btn-secondary">
        {{ t('foto.asBackground') }}
      </button>
      <button v-if="selectedImageCount === 1" @click="$emit('set-as-workspace-background')" class="btn-workspace">
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
import { ref } from 'vue';
import { useI18n } from '../../lib/i18n.js';
import PlacementSettings from './PlacementSettings.vue';

const { t, locale } = useI18n();

defineProps({
  imageGallery: {
    type: Array,
    default: () => []
  },
  selectedImageIndices: {
    type: Set,
    default: () => new Set()
  },
  selectedImageCount: {
    type: Number,
    default: 0
  },
  selectedAnimation: {
    type: String,
    default: 'none'
  },
  animationDuration: {
    type: Number,
    default: 1000
  },
  imageScale: {
    type: Number,
    default: 1
  },
  imageOffsetX: {
    type: Number,
    default: 0
  },
  imageOffsetY: {
    type: Number,
    default: 0
  },
  isInRangeSelectionMode: {
    type: Boolean,
    default: false
  }
});

defineEmits([
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
  'update:placement-settings'
]);

const fileInputRef = ref(null);

function triggerFileInput() {
  fileInputRef.value?.click();
}
</script>

<style scoped>
/* Upload-Bereich Styles */
.upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #333;
}

.upload-section h4 {
  margin: 0 0 14px 0;
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.upload-area {
  border: 2px dashed #555;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #1e1e1e;
}

.upload-area:hover {
  border-color: var(--image-section-accent, #6ea8fe);
  background-color: #252525;
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
  color: #e0e0e0;
}

.upload-placeholder small {
  font-size: 11px;
  color: #999;
}

/* Galerie-Container */
.gallery-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #2a2a2a;
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
  color: #e0e0e0;
}

.btn-clear-all {
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid #555;
  background-color: #ff6b6b;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-all:hover {
  background-color: #ff5252;
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
  background: #1e1e1e;
  border-radius: 3px;
}

.gallery-scroll::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.gallery-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--image-section-accent, #6ea8fe);
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
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background-color: #1e1e1e;
}

.thumbnail-item:hover {
  border-color: var(--image-section-accent, #6ea8fe);
  transform: scale(1.02);
}

.thumbnail-item.selected {
  border-color: var(--image-section-accent, #6ea8fe);
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
  background-color: rgba(255, 69, 58, 0.95);
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
  background-color: rgba(255, 69, 58, 1);
  transform: scale(1.1);
}

.thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
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
  color: #ccc;
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
  border: 1px solid #444;
  background-color: #2a2a2a;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 500;
}

.btn-select-all:hover:not(:disabled),
.btn-deselect-all:hover:not(:disabled) {
  background-color: #3a3a3a;
  border-color: var(--image-section-accent, #6ea8fe);
  color: var(--image-section-accent, #6ea8fe);
}

.btn-select-all:disabled,
.btn-deselect-all:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.selection-count {
  font-size: 11px;
  color: var(--image-section-accent, #6ea8fe);
  font-weight: 600;
  padding: 4px 8px;
  background-color: rgba(110, 168, 254, 0.15);
  border-radius: 4px;
  margin-left: auto;
}

.multiselect-hint {
  font-size: 10px;
  color: #888;
  margin: 0 0 8px 0;
  font-style: italic;
}

/* Selection Checkbox */
.selection-checkbox {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;
  font-size: 12px;
  color: white;
  font-weight: bold;
}

.selection-checkbox.checked {
  background-color: var(--image-section-accent, #6ea8fe);
  border-color: var(--image-section-accent, #6ea8fe);
  box-shadow: 0 2px 6px rgba(110, 168, 254, 0.4);
}

.thumbnail-item:hover .selection-checkbox:not(.checked) {
  border-color: var(--image-section-accent, #6ea8fe);
  background-color: rgba(110, 168, 254, 0.3);
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
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  font-size: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 600;
}

.btn-primary {
  background: rgba(201, 152, 77, 0.2);
  color: var(--accent-tertiary, #f8e1a9);
  border: 1px solid rgba(201, 152, 77, 0.3);
}

.btn-primary:hover {
  background: rgba(201, 152, 77, 0.3);
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: var(--secondary-bg, #0E1C32);
  color: var(--text-primary, #E9E9EB);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
}

.btn-secondary:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: translateY(-1px);
}

.btn-workspace {
  background: rgba(255, 193, 7, 0.1);
  color: #FFC107;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.btn-workspace:hover {
  background: rgba(255, 193, 7, 0.2);
  border-color: rgba(255, 193, 7, 0.5);
  transform: translateY(-1px);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}
</style>
