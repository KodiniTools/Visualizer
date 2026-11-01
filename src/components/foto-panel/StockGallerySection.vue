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
    <div class="gallery-scroll">
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
      <div class="gallery-grid">
        <div
          v-for="img in filteredStockImages"
          :key="img.id"
          class="thumbnail-item"
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
          <div class="thumbnail-info">
            <span class="thumbnail-name">{{ img.name }}</span>
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

<style scoped src="./image-grid-shared.css"></style>

<style scoped>
.stock-gallery-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: var(--card-bg);
  border-radius: var(--ds-radius-sm);
  padding: 10px;
  border: 1px solid var(--border-color);
}

.stock-gallery-section h4 {
  margin: 0 0 6px 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
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
  border-radius: var(--ds-radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.category-tab:hover {
  border-color: var(--accent-primary);
  background-color: var(--btn-hover);
}

.category-tab.active {
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
  border-color: var(--accent-primary);
  color: var(--accent-tertiary);
  font-weight: var(--ds-weight-semibold);
}

.category-icon {
  font-size: var(--ds-text-xs);
}

.category-name {
  font-size: var(--ds-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.category-count {
  font-size: var(--ds-text-xs);
  background-color: rgba(255, 255, 255, 0.15);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: var(--ds-radius-md);
  font-weight: var(--ds-weight-semibold);
  min-width: 20px;
  text-align: center;
}

.category-tab.active .category-count {
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--ds-text-3);
}

/* Stock-Galerie Scroll-Container */
.gallery-scroll {
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.gallery-scroll::-webkit-scrollbar {
  width: 6px;
}

/* Stock-Galerie Grid */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
  padding: 6px 6px 4px 6px;
}

.thumbnail-name {
  font-size: var(--ds-text-xs);
  color: white;
  font-weight: var(--ds-weight-medium);
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

/* Selection Checkbox */
/* Größere Klickfläche für die Checkbox, ohne das Aussehen zu ändern */
.selection-checkbox::before {
  content: '';
  position: absolute;
  inset: -8px;
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

/* Ladeanzeige */
.loading-state {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
}

.loading-state p {
  margin: 0;
  font-size: var(--ds-text-sm);
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
  font-size: var(--ds-text-sm);
}

.btn-retry {
  padding: 8px 16px;
  border-radius: var(--ds-radius-sm);
  border: 1px solid var(--image-section-accent);
  background-color: var(--secondary-bg);
  color: var(--image-section-accent);
  font-size: var(--ds-text-xs);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-retry:hover {
  background-color: var(--image-section-accent);
  color: var(--ds-text-3);
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
