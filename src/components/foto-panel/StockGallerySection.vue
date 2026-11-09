<template>
  <div class="stock-gallery-section">
    <h4 class="section-title">{{ t('foto.gallery') }}</h4>

    <!-- Kategorien -->
    <UiSegmentedControl
      v-if="stockCategories.length"
      :model-value="selectedStockCategory"
      :options="categoryOptions"
      :label="t('foto.gallery')"
      size="sm"
      wrap
      @update:model-value="$emit('select-category', $event)"
    />

    <!-- Stock-Bilder -->
    <template v-if="filteredStockImages.length > 0">
      <div class="selection-controls">
        <UiButton
          size="sm"
          :disabled="selectedStockCount === filteredStockImages.length"
          @click="$emit('select-all')"
        >
          {{ t('foto.selectAll') }}
        </UiButton>
        <UiButton size="sm" :disabled="selectedStockCount === 0" @click="$emit('deselect-all')">
          {{ t('foto.deselectAll') }}
        </UiButton>
        <span v-if="selectedStockCount > 0" class="selection-count"
          >{{ selectedStockCount }} {{ t('foto.selected') }}</span
        >
      </div>
      <p class="hint">{{ t('foto.multiselectHint') }}</p>
      <p class="hint">{{ t('foto.dragToCanvasHint') }}</p>

      <div class="gallery-scroll">
        <div class="gallery-grid">
          <div
            v-for="img in filteredStockImages"
            :key="img.id"
            class="thumbnail-item"
            :class="{ selected: selectedStockImages.has(img.id) }"
            role="button"
            tabindex="0"
            :aria-pressed="selectedStockImages.has(img.id)"
            :aria-label="img.name"
            draggable="true"
            @click="$emit('select-image', img, $event)"
            @keydown.enter.prevent="$emit('select-image', img, $event)"
            @keydown.space.prevent="$emit('select-image', img, $event)"
            @dblclick="$emit('open-preview', img)"
            @dragstart="$emit('image-dragstart', { img, event: $event })"
            @dragend="$emit('image-dragend')"
          >
            <!-- Checkbox für Mehrfachauswahl: schaltet additiv um (wie Strg+Klick) -->
            <span
              class="selection-checkbox"
              :class="{ checked: selectedStockImages.has(img.id) }"
              role="checkbox"
              tabindex="0"
              :aria-checked="selectedStockImages.has(img.id)"
              :aria-label="img.name"
              @click.stop="toggleSelection(img)"
              @keydown.space.stop.prevent="toggleSelection(img)"
              @keydown.enter.stop.prevent="toggleSelection(img)"
              @dblclick.stop
            >
              <svg
                v-if="selectedStockImages.has(img.id)"
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
            <img :src="img.thumbnail" alt="" loading="lazy" draggable="false" />
            <span class="thumbnail-info">
              <span class="thumbnail-name">{{ img.name }}</span>
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- Aktionen (nur mit Auswahl) -->
    <div v-if="selectedStockCount > 0" class="action-buttons">
      <UiButton variant="primary" size="sm" block @click="$emit('add-to-canvas')">
        {{ placeLabel }}
      </UiButton>
      <template v-if="selectedStockCount === 1">
        <UiButton size="sm" block @click="$emit('set-as-background')">
          {{ t('foto.asBackground') }}
        </UiButton>
        <UiButton size="sm" block @click="$emit('set-as-workspace-background')">
          {{ t('foto.asWorkspaceBackground') }}
        </UiButton>
      </template>
    </div>

    <!-- Platzierung mit Animation für Stock-Bilder -->
    <PlacementSettings
      v-if="selectedStockCount === 1"
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

    <!-- Ladeanzeige -->
    <p v-if="stockImagesLoading || categoryLoading" class="state-text">
      {{ stockImagesLoading ? t('foto.loadingGallery') : t('foto.loadingCategory') }}
    </p>

    <!-- Fehleranzeige wenn keine Kategorien -->
    <div v-if="!stockImagesLoading && stockCategories.length === 0" class="error-state">
      <UiCallout type="danger">{{ t('foto.galleryLoadError') }}</UiCallout>
      <UiButton size="sm" @click="$emit('retry-load')">{{ t('foto.retryLoad') }}</UiButton>
    </div>

    <!-- Keine Bilder in Kategorie -->
    <p
      v-if="
        !stockImagesLoading &&
        !categoryLoading &&
        stockCategories.length > 0 &&
        filteredStockImages.length === 0
      "
      class="state-text"
    >
      {{ t('foto.noImagesInCategory') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../lib/i18n'
import { localizedName } from '../../lib/localizedName'
import { UiButton, UiCallout, UiSegmentedControl } from '../ui'
import PlacementSettings from './PlacementSettings.vue'
import type { SelectModifiers, StockCategory, StockImage } from '../../composables/useStockGallery'
import type { PlacementSettings as PlacementSettingsValue } from '../../lib/imagePlacementSettings'

/** Kategorie mit (optional bekannter) Bildanzahl */
type StockCategoryWithCount = StockCategory & { count?: number }

const { t, locale } = useI18n()

const props = withDefaults(
  defineProps<{
    stockCategories?: StockCategoryWithCount[]
    filteredStockImages?: StockImage[]
    selectedStockCategory?: string
    selectedStockImages?: Set<string>
    selectedStockCount?: number
    stockImagesLoading?: boolean
    categoryLoading?: boolean
    selectedAnimation?: string
    animationDuration?: number
    imageScale?: number
    imageOffsetX?: number
    imageOffsetY?: number
    isInRangeSelectionMode?: boolean
  }>(),
  {
    stockCategories: () => [],
    filteredStockImages: () => [],
    selectedStockCategory: 'backgrounds',
    selectedStockImages: () => new Set(),
    selectedStockCount: 0,
    stockImagesLoading: false,
    categoryLoading: false,
    selectedAnimation: 'none',
    animationDuration: 1000,
    imageScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0,
    isInRangeSelectionMode: false,
  },
)

const emit = defineEmits<{
  'select-category': [categoryId: string]
  'select-image': [img: StockImage, event: SelectModifiers]
  'open-preview': [img: StockImage]
  'select-all': []
  'deselect-all': []
  'add-to-canvas': []
  'set-as-background': []
  'set-as-workspace-background': []
  'start-range-selection': []
  'add-directly': []
  'retry-load': []
  'update:placement-settings': [settings: PlacementSettingsValue]
  'image-dragstart': [payload: { img: StockImage; event: DragEvent }]
  'image-dragend': []
}>()

/** Kategorien als Segmente: Symbol, Name und (falls bekannt) Anzahl. */
const categoryOptions = computed(() =>
  props.stockCategories.map((category) => ({
    value: category.id,
    // Anzahl nur zeigen, wenn bekannt und größer 0 (wie bisher)
    label: [category.icon, getStockCategoryName(category), category.count || '']
      .filter(Boolean)
      .join(' '),
  })),
)

const placeLabel = computed(() =>
  props.selectedStockCount > 1
    ? t('foto.imagesOnCanvas').replace('{count}', String(props.selectedStockCount))
    : t('foto.placeOnCanvas'),
)

/** Checkbox: schaltet additiv um (wie Strg+Klick). */
function toggleSelection(img: StockImage) {
  emit('select-image', img, { ctrlKey: true })
}

// Function to get translated stock category name
function getStockCategoryName(category: StockCategory) {
  const translationKey = `foto.stockCategories.${category.id}`
  const translated = t(translationKey)
  if (translated !== translationKey) {
    return translated
  }
  return localizedName(category, locale.value)
}
</script>

<style scoped>
.stock-gallery-section {
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

.selection-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2);
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

.gallery-scroll {
  max-height: 220px;
  overflow-y: auto;
  overflow-x: hidden;
  /* Platz für Rahmen und Fokusring der Kacheln */
  padding: 3px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

.thumbnail-info {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 6px 6px 4px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.thumbnail-name {
  display: block;
  overflow: hidden;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
  color: white;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
}

.state-text {
  margin: 0;
  padding: var(--ds-space-4);
  text-align: center;
  font-size: var(--ds-text-sm);
  color: var(--ds-text-3);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ds-space-2);
}
</style>
