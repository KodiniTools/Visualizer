<template>
  <div class="stock-gallery-section">
    <h4>{{ t('foto.gallery') }}</h4>

    <!-- Kategorie-Tabs -->
    <div class="category-tabs">
      <button
        v-for="category in stockCategories"
        :key="category.id"
        class="category-tab"
        :class="{ active: selectedStockCategory === category.id }"
        @click="$emit('select-category', category.id)"
      >
        <span class="category-icon">{{ category.icon }}</span>
        <span class="category-name">{{ getStockCategoryName(category) }}</span>
        <span v-if="category.count" class="category-count">{{ category.count }}</span>
      </button>
    </div>

    <!-- Stock-Bilder Grid -->
    <div class="stock-gallery-scroll">
      <!-- Auswahl-Steuerung -->
      <div v-if="filteredStockImages.length > 0" class="selection-controls">
        <button
          @click="$emit('select-all')"
          class="btn-select-all"
          :disabled="selectedStockCount === filteredStockImages.length"
        >
          {{ t('foto.selectAll') }}
        </button>
        <button
          @click="$emit('deselect-all')"
          class="btn-deselect-all"
          :disabled="selectedStockCount === 0"
        >
          {{ t('foto.deselectAll') }}
        </button>
        <span v-if="selectedStockCount > 0" class="selection-count"
          >{{ selectedStockCount }} {{ t('foto.selected') }}</span
        >
      </div>
      <p class="multiselect-hint">{{ t('foto.multiselectHint') }}</p>
      <p class="drag-hint">{{ t('foto.dragToCanvasHint') }}</p>
      <div class="stock-gallery-grid">
        <div
          v-for="img in filteredStockImages"
          :key="img.id"
          class="stock-thumbnail-item"
          :class="{ selected: selectedStockImages.has(img.id) }"
          draggable="true"
          @click="$emit('select-image', img, $event)"
          @dblclick="$emit('open-preview', img)"
          @dragstart="$emit('image-dragstart', { img, event: $event })"
          @dragend="$emit('image-dragend')"
        >
          <!-- Checkbox für Mehrfachauswahl: schaltet additiv um (wie Strg+Klick) -->
          <div
            class="selection-checkbox"
            :class="{ checked: selectedStockImages.has(img.id) }"
            role="checkbox"
            :aria-checked="selectedStockImages.has(img.id)"
            :aria-label="img.name"
            @click.stop="$emit('select-image', img, { ctrlKey: true })"
            @dblclick.stop
          >
            <span v-if="selectedStockImages.has(img.id)">✓</span>
          </div>
          <img :src="img.thumbnail" :alt="img.name" loading="lazy" draggable="false" />
          <div class="stock-thumbnail-info">
            <span class="stock-thumbnail-name">{{ img.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Stock-Bild Action-Buttons -->
    <div v-if="selectedStockCount > 0" class="action-buttons stock-actions">
      <button @click="$emit('add-to-canvas')" class="btn-primary">
        {{
          selectedStockCount > 1
            ? locale === 'de'
              ? `${selectedStockCount} Bilder auf Canvas`
              : `${selectedStockCount} images on Canvas`
            : t('foto.placeOnCanvas')
        }}
      </button>
      <button
        v-if="selectedStockCount === 1"
        @click="$emit('set-as-background')"
        class="btn-secondary"
      >
        {{ t('foto.asBackground') }}
      </button>
      <button
        v-if="selectedStockCount === 1"
        @click="$emit('set-as-workspace-background')"
        class="btn-workspace"
      >
        {{ t('foto.asWorkspaceBackground') }}
      </button>
    </div>

    <!-- Platzierung mit Animation für Stock-Bilder -->
    <PlacementSettings
      v-if="selectedStockCount === 1"
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

    <!-- Ladeanzeige -->
    <div v-if="stockImagesLoading || categoryLoading" class="loading-state">
      <p>{{ stockImagesLoading ? t('foto.loadingGallery') : t('foto.loadingCategory') }}</p>
    </div>

    <!-- Fehleranzeige wenn keine Bilder -->
    <div v-if="!stockImagesLoading && stockCategories.length === 0" class="error-state">
      <p>{{ t('foto.galleryLoadError') }}</p>
      <button @click="$emit('retry-load')" class="btn-retry">{{ t('foto.retryLoad') }}</button>
    </div>

    <!-- Keine Bilder in Kategorie -->
    <div
      v-if="
        !stockImagesLoading &&
        !categoryLoading &&
        stockCategories.length > 0 &&
        filteredStockImages.length === 0
      "
      class="empty-state"
    >
      <p>{{ t('foto.noImagesInCategory') }}</p>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '../../lib/i18n.js'
import PlacementSettings from './PlacementSettings.vue'

const { t, locale } = useI18n()

defineProps({
  stockCategories: {
    type: Array,
    default: () => [],
  },
  filteredStockImages: {
    type: Array,
    default: () => [],
  },
  selectedStockCategory: {
    type: String,
    default: 'backgrounds',
  },
  selectedStockImages: {
    type: Set,
    default: () => new Set(),
  },
  selectedStockCount: {
    type: Number,
    default: 0,
  },
  stockImagesLoading: {
    type: Boolean,
    default: false,
  },
  categoryLoading: {
    type: Boolean,
    default: false,
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

defineEmits([
  'select-category',
  'select-image',
  'open-preview',
  'select-all',
  'deselect-all',
  'add-to-canvas',
  'set-as-background',
  'set-as-workspace-background',
  'start-range-selection',
  'add-directly',
  'retry-load',
  'update:placement-settings',
  'image-dragstart',
  'image-dragend',
])

// Function to get translated stock category name
function getStockCategoryName(category) {
  const translationKey = `foto.stockCategories.${category.id}`
  const translated = t(translationKey)
  if (translated !== translationKey) {
    return translated
  }
  return locale.value === 'en' && category.name_en ? category.name_en : category.name
}
</script>

<style scoped>
.stock-gallery-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: var(--card-bg);
  border-radius: 6px;
  padding: 10px;
  border: 1px solid var(--border-color);
}

.stock-gallery-section h4 {
  margin: 0 0 6px 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stock-gallery-section h4::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='M21 15l-5-5L5 21'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.8));
}

/* Kategorie-Tabs */
.category-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 5px;
  border: 1px solid var(--border-color);
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  font-size: 0.55rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-tab:hover {
  border-color: var(--accent-primary);
  background-color: var(--btn-hover);
  transform: translateY(-1px);
}

.category-tab.active {
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
  border-color: var(--accent-primary);
  color: var(--accent-tertiary);
  font-weight: 600;
}

.category-icon {
  font-size: 0.65rem;
}

.category-name {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.category-count {
  font-size: 10px;
  background-color: rgba(255, 255, 255, 0.15);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.category-tab.active .category-count {
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--ds-text-3);
}

/* Stock-Galerie Scroll-Container */
.stock-gallery-scroll {
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.stock-gallery-scroll::-webkit-scrollbar {
  width: 6px;
}

.stock-gallery-scroll::-webkit-scrollbar-track {
  background: var(--secondary-bg);
  border-radius: 3px;
}

.stock-gallery-scroll::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.stock-gallery-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--image-section-accent);
}

/* Stock-Galerie Grid */
.stock-gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stock-thumbnail-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: grab;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background-color: var(--secondary-bg);
}

.stock-thumbnail-item:active {
  cursor: grabbing;
}

.stock-thumbnail-item:hover {
  border-color: var(--image-section-accent);
  transform: scale(1.03);
}

.stock-thumbnail-item.selected {
  border-color: var(--image-section-accent);
  box-shadow: 0 0 0 2px rgba(110, 168, 254, 0.3);
}

.stock-thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.stock-thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
  padding: 6px 6px 4px 6px;
}

.stock-thumbnail-name {
  font-size: 9px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* Auswahl-Steuerung */
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

.stock-thumbnail-item:hover .selection-checkbox:not(.checked) {
  border-color: var(--image-section-accent);
  background-color: color-mix(in srgb, var(--ds-link) 30%, transparent);
}

/* Stock Action-Buttons */
.stock-actions {
  margin-top: 8px;
}

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

/* Ladeanzeige */
.loading-state {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
}

.loading-state p {
  margin: 0;
  font-size: 13px;
}

/* Fehleranzeige */
.error-state {
  text-align: center;
  padding: 20px;
  color: var(--ds-danger);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.error-state p {
  margin: 0;
  font-size: 13px;
}

.btn-retry {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--image-section-accent);
  background-color: var(--secondary-bg);
  color: var(--image-section-accent);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-retry:hover {
  background-color: var(--image-section-accent);
  color: var(--ds-text-3);
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
[data-theme='light'] .stock-gallery-section {
  border-color: var(--border-color);
}

[data-theme='light'] .category-tab {
  background-color: var(--card-bg);
  border-color: var(--border-color);
}

[data-theme='light'] .category-tab:hover {
  background-color: var(--secondary-bg);
}

[data-theme='light'] .category-tab.active {
  background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
  color: var(--accent-ink);
}

[data-theme='light'] .category-count {
  background-color: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  color: var(--text-muted);
}

[data-theme='light'] .category-tab.active .category-count {
  background-color: color-mix(in srgb, var(--accent-primary) 20%, transparent);
  color: var(--accent-ink);
}

[data-theme='light'] .stock-gallery-scroll::-webkit-scrollbar-thumb {
  background: var(--ds-link);
}

[data-theme='light'] .stock-gallery-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--accent-primary);
}

[data-theme='light'] .stock-thumbnail-item:hover {
  border-color: var(--accent-primary);
}

[data-theme='light'] .stock-thumbnail-item.selected {
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

[data-theme='light'] .stock-thumbnail-item:hover .selection-checkbox:not(.checked) {
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

[data-theme='light'] .btn-retry {
  background-color: var(--card-bg);
  border-color: var(--accent-primary);
  color: var(--accent-ink);
}

[data-theme='light'] .btn-retry:hover {
  background-color: var(--accent-primary);
  color: var(--accent-text);
}
</style>
