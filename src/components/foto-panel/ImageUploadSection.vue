<template>
  <div class="upload-section">
    <h4 class="section-title">{{ t('foto.ownImages') }}</h4>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      multiple
      hidden
      @change="$emit('upload', $event)"
    />

    <!-- Upload-Fläche: Klick öffnet die Dateiauswahl; Strg+V fügt Bilder ein -->
    <button type="button" class="upload-area" @click="triggerFileInput">
      <svg
        class="upload-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span class="upload-label">{{ t('foto.clickToUpload') }}</span>
      <span class="upload-hint">{{ t('foto.multipleImagesHint') }}</span>
      <span class="upload-hint">{{ t('foto.pasteHint') }}</span>
    </button>

    <!-- Galerie mit Vorschaubildern -->
    <div v-if="imageGallery.length > 0" class="gallery-container">
      <div class="gallery-header">
        <span class="gallery-title">{{ galleryTitle }}</span>
        <UiButton variant="danger" size="sm" @click="$emit('clear-all')">
          {{ t('foto.deleteAll') }}
        </UiButton>
      </div>

      <div class="selection-controls">
        <UiButton
          size="sm"
          :disabled="selectedImageCount === imageGallery.length"
          @click="$emit('select-all')"
        >
          {{ t('foto.selectAll') }}
        </UiButton>
        <UiButton size="sm" :disabled="selectedImageCount === 0" @click="$emit('deselect-all')">
          {{ t('foto.deselectAll') }}
        </UiButton>
        <span v-if="selectedImageCount > 0" class="selection-count"
          >{{ selectedImageCount }} {{ t('foto.selected') }}</span
        >
      </div>
      <p class="hint">{{ t('foto.multiselectHint') }}</p>
      <p
        v-if="selectedImageCount === 1 && imageGallery.length > 1"
        class="hint slideshow-select-hint"
      >
        {{ t('foto.slideshowSelectHint') }}
      </p>
      <p class="hint">{{ t('foto.dragToCanvasHint') }}</p>

      <div class="gallery-scroll">
        <div class="gallery-grid">
          <div
            v-for="(imgData, index) in imageGallery"
            :key="imgData.id"
            class="thumbnail-item"
            :class="{ selected: selectedImageIndices.has(index) }"
            role="button"
            tabindex="0"
            :aria-pressed="selectedImageIndices.has(index)"
            :aria-label="imgData.name"
            draggable="true"
            @click="$emit('select-image', index, $event)"
            @keydown.enter.prevent="$emit('select-image', index, $event)"
            @keydown.space.prevent="$emit('select-image', index, $event)"
            @dblclick="$emit('open-preview', imgData)"
            @dragstart="$emit('image-dragstart', { imgData, event: $event })"
            @dragend="$emit('image-dragend')"
          >
            <!-- Checkbox für Mehrfachauswahl: schaltet additiv um (wie Strg+Klick) -->
            <span
              class="selection-checkbox"
              :class="{ checked: selectedImageIndices.has(index) }"
              role="checkbox"
              tabindex="0"
              :aria-checked="selectedImageIndices.has(index)"
              :aria-label="imgData.name"
              @click.stop="toggleSelection(index)"
              @keydown.space.stop.prevent="toggleSelection(index)"
              @keydown.enter.stop.prevent="toggleSelection(index)"
              @dblclick.stop
            >
              <svg
                v-if="selectedImageIndices.has(index)"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <img :src="imgData.img.src" alt="" draggable="false" />
            <UiIconButton
              :label="t('foto.deleteImage')"
              size="sm"
              round
              class="btn-delete-thumb"
              @click.stop="$emit('delete-image', index)"
              @keydown.stop
              @dblclick.stop
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </UiIconButton>
            <span class="thumbnail-info">
              <span class="thumbnail-name">{{ imgData.name }}</span>
              <span class="thumbnail-size">{{ imgData.dimensions }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Aktionen (nur mit Auswahl) -->
    <div v-if="selectedImageCount > 0" class="action-buttons">
      <UiButton variant="primary" size="sm" block @click="$emit('add-to-canvas')">
        {{ placeLabel }}
      </UiButton>
      <template v-if="selectedImageCount === 1">
        <UiButton size="sm" block @click="$emit('set-as-background')">
          {{ t('foto.asBackground') }}
        </UiButton>
        <UiButton size="sm" block @click="$emit('set-as-workspace-background')">
          {{ t('foto.asWorkspaceBackground') }}
        </UiButton>
      </template>
    </div>

    <!-- Platzierung mit Animation für eigene Bilder -->
    <PlacementSettings
      v-if="selectedImageCount === 1"
      :selected-animation="selectedAnimation"
      :animation-duration="animationDuration"
      :image-scale="imageScale"
      :image-offset-x="imageOffsetX"
      :image-offset-y="imageOffsetY"
      :is-in-range-selection-mode="isInRangeSelectionMode"
      @update:settings="$emit('update:placement-settings', $event)"
      @start-draw="$emit('start-range-selection')"
      @place-directly="$emit('add-directly')"
    />

    <p v-if="imageGallery.length === 0" class="empty-state">{{ t('foto.noImagesUploaded') }}</p>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../../lib/i18n'
import PlacementSettings from './PlacementSettings.vue'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'

const { t } = useI18n()

const props = defineProps({
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

/** Galerie-Titel mit Anzahl, z. B. „Galerie (3)“. */
const galleryTitle = computed(() =>
  t('foto.galleryCount').replace('{count}', String(props.imageGallery.length)),
)

/** Haupt-Aktion: ein Bild platzieren oder „N Bilder auf Canvas“. */
const placeLabel = computed(() =>
  props.selectedImageCount > 1
    ? t('foto.imagesOnCanvas').replace('{count}', String(props.selectedImageCount))
    : t('foto.placeOnCanvas'),
)

/** Checkbox: schaltet additiv um (wie Strg+Klick). */
function toggleSelection(index) {
  emit('select-image', index, { ctrlKey: true })
}

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
.upload-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  padding: var(--ds-space-4);
  background: var(--ds-surface-1);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}

.section-title {
  margin: 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ds-space-1);
  width: 100%;
  padding: var(--ds-space-4) var(--ds-space-3);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) dashed var(--ds-border-strong);
  border-radius: var(--ds-radius-md);
  color: var(--ds-text);
  font: inherit;
  cursor: pointer;
  transition: border-color var(--ds-duration) var(--ds-ease);
}

.upload-area:hover {
  border-color: var(--ds-accent);
}

.upload-area:focus-visible {
  outline: none;
  border-color: var(--ds-accent);
  box-shadow: var(--ds-focus-ring);
}

.upload-icon {
  width: 28px;
  height: 28px;
  color: var(--accent-ink);
}

.upload-label {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
}

.upload-hint {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}

.gallery-container {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.gallery-header,
.selection-controls {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}

.gallery-header {
  justify-content: space-between;
}

.selection-controls {
  flex-wrap: wrap;
}

.gallery-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

.selection-count {
  margin-left: auto;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text);
}

.hint {
  margin: 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}

.slideshow-select-hint {
  color: var(--ds-text-2);
}

.gallery-scroll {
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  /* Platz für Rahmen und Fokusring der Kacheln */
  padding: 3px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--ds-space-2);
}

.thumbnail-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-2);
  cursor: grab;
  transition: border-color var(--ds-duration) var(--ds-ease);
}

.thumbnail-item:active {
  cursor: grabbing;
}

.thumbnail-item:hover {
  border-color: var(--ds-border-strong);
}

.thumbnail-item.selected {
  border-color: var(--ds-accent);
}

.thumbnail-item:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.thumbnail-item img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selection-checkbox {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 2px solid white;
  border-radius: var(--ds-radius-sm);
  background: rgba(0, 0, 0, 0.5);
  color: var(--ds-on-accent);
  cursor: pointer;
}

/* Größere Klickfläche für die Checkbox, ohne das Aussehen zu ändern */
.selection-checkbox::before {
  content: '';
  position: absolute;
  inset: -8px;
}

.selection-checkbox svg {
  width: 12px;
  height: 12px;
}

.selection-checkbox.checked {
  background: var(--ds-accent);
  border-color: var(--ds-accent);
}

.selection-checkbox:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

/* Löschen erscheint bei Hover oder Tastaturfokus in der Kachel */
.btn-delete-thumb {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity var(--ds-duration) var(--ds-ease);
}

.thumbnail-item:hover .btn-delete-thumb,
.thumbnail-item:has(:focus-visible) .btn-delete-thumb,
.thumbnail-item:focus-visible .btn-delete-thumb {
  opacity: 1;
}

.thumbnail-info {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 6px 4px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.thumbnail-name {
  overflow: hidden;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
  color: white;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.thumbnail-size {
  font-size: var(--ds-text-xs);
  color: rgba(255, 255, 255, 0.75);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
}

.empty-state {
  margin: 0;
  padding: var(--ds-space-4);
  text-align: center;
  font-size: var(--ds-text-sm);
  color: var(--ds-text-3);
}
</style>
