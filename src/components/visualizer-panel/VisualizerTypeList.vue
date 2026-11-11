<template>
  <!-- Kategorisierte Visualizer-Auswahl -->
  <div class="control-section">
    <div v-if="favoritesOnly" class="favorites-header">
      <span class="section-label"
        >{{ t('visualizer.favorites') }} ({{ favoriteVisualizers.length }})</span
      >
      <UiButton class="show-all-btn" variant="ghost" size="sm" @click="emit('showAll')">
        {{ t('visualizer.showAll') }}
      </UiButton>
    </div>
    <span v-else class="section-label"
      >{{ t('visualizer.visualizerType') }} ({{ totalCount }} {{ t('visualizer.effects') }})</span
    >

    <!-- Favoriten (Umschalter neben der Suche); Suchbegriff filtert innerhalb -->
    <div v-if="favoritesOnly" class="visualizer-buttons favorites-list">
      <VisualizerTypeRow v-for="viz in shownFavorites" :key="viz.id" :viz="viz" />
      <div v-if="favoriteVisualizers.length === 0" class="no-results favorites-empty">
        {{ t('visualizer.noFavorites') }}
      </div>
      <div v-else-if="shownFavorites.length === 0" class="no-results">
        {{ t('visualizer.noResultsFor') }} "{{ searchQuery }}"
      </div>
    </div>

    <!-- Suchergebnisse -->
    <div v-else-if="searchQuery.trim()" class="visualizer-buttons">
      <button
        v-for="preset in filteredPresets"
        :key="preset.id"
        class="visualizer-btn preset-btn"
        :class="{ active: layerPresetStore.isLayerPresetActive(preset) }"
        :title="t('visualizer.applyPreset')"
        @click="layerPresetStore.applyLayerPreset(preset)"
      >
        {{ preset.name }}
        <span class="preset-badge">{{ preset.layers.length }}</span>
      </button>
      <VisualizerTypeRow v-for="viz in filteredVisualizers" :key="viz.id" :viz="viz" />
      <div
        v-if="filteredVisualizers.length === 0 && filteredPresets.length === 0"
        class="no-results"
      >
        {{ t('visualizer.noResultsFor') }} "{{ searchQuery }}"
      </div>
    </div>

    <!-- Kategorien (wenn keine Suche aktiv) -->
    <div v-else class="category-list">
      <!-- Eigene Presets (gespeicherte Multi-Layer-Konfigurationen) -->
      <details
        v-if="layerPresetStore.layerPresets.length > 0"
        class="category category-presets"
        :open="isCategoryOpen(USER_PRESETS_CATEGORY)"
      >
        <summary
          class="category-header"
          :class="{ open: isCategoryOpen(USER_PRESETS_CATEGORY) }"
          @click.prevent="toggleCategory(USER_PRESETS_CATEGORY, $event)"
        >
          <span class="category-name">{{ t('visualizer.categories.userPresets') }}</span>
          <span class="category-count">{{ layerPresetStore.layerPresets.length }}</span>
          <span class="category-caret" aria-hidden="true"></span>
        </summary>
        <div class="category-content">
          <button
            v-for="preset in layerPresetStore.layerPresets"
            :key="preset.id"
            class="visualizer-btn preset-btn"
            :class="{ active: layerPresetStore.isLayerPresetActive(preset) }"
            :title="t('visualizer.applyPreset')"
            @click="layerPresetStore.applyLayerPreset(preset)"
          >
            {{ preset.name }}
            <span class="preset-badge">{{ preset.layers.length }}</span>
          </button>
        </div>
      </details>

      <details
        v-for="(visualizers, category) in store.categorizedVisualizers"
        :key="category"
        class="category"
        :open="isCategoryOpen(category)"
      >
        <summary
          class="category-header"
          :class="{ open: isCategoryOpen(category) }"
          @click.prevent="toggleCategory(category, $event)"
        >
          <span class="category-name">{{ getCategoryName(category) }}</span>
          <span class="category-count">{{ visualizers.length }}</span>
          <span class="category-caret" aria-hidden="true"></span>
        </summary>
        <div class="category-content">
          <VisualizerTypeRow v-for="viz in visualizers" :key="viz.id" :viz="viz" />
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useVisualizerStore } from '../../stores/visualizerStore'
import { useLayerPresetStore } from '../../stores/layerPresetStore'
import { useVisualizerFavoritesStore } from '../../stores/visualizerFavoritesStore'
import VisualizerTypeRow from './VisualizerTypeRow.vue'
import { UiButton } from '../ui'

const props = withDefaults(
  defineProps<{
    /** Aktueller Suchbegriff; nicht-leer schaltet von Kategorien auf Trefferliste um. */
    searchQuery?: string
    /** true = nur die gemerkten Favoriten zeigen (statt Kategorien). */
    favoritesOnly?: boolean
  }>(),
  { searchQuery: '', favoritesOnly: false },
)

const emit = defineEmits<{
  /** Favoriten-Ansicht verlassen und wieder alle Visualizer zeigen. */
  showAll: []
}>()

const { t } = useI18n()
const store = useVisualizerStore()
const layerPresetStore = useLayerPresetStore()
const favoritesStore = useVisualizerFavoritesStore()

// Schlüssel der Kategorie "Eigene Presets" (kein Visualizer-Kategorie-Key)
const USER_PRESETS_CATEGORY = 'Eigene Presets'

// Akkordeon: es ist immer höchstens eine Kategorie aufgeklappt. Wird eine
// geöffnet, klappen alle anderen zu; ein Klick auf die offene schließt sie.
const openCategory = ref<string | null>('GPU-Presets')

// Map German category keys to i18n translation keys
const categoryTranslationKeys: Record<string, string> = {
  'GPU-Presets': 'visualizer.categories.gpu',
  Laser: 'visualizer.categories.laser',
  'LED-Ziffern': 'visualizer.categories.ledDigits',
  'LED-Buchstaben': 'visualizer.categories.ledLetters',
  'LED-Rahmen': 'visualizer.categories.ledFrames',
  Portrait: 'visualizer.categories.portrait',
  Klassisch: 'visualizer.categories.classic',
}

function getCategoryName(category: string) {
  const key = categoryTranslationKeys[category]
  return key ? t(key) : category
}

function isCategoryOpen(category: string) {
  return openCategory.value === category
}

function toggleCategory(category: string, event?: Event) {
  const opening = !isCategoryOpen(category)
  openCategory.value = opening ? category : null
  // Klappt eine größere Kategorie darüber zu, rutscht die angeklickte
  // Überschrift nach oben – nach dem Rendern wieder in den sichtbaren Bereich holen.
  const header = event?.currentTarget as HTMLElement | null | undefined
  if (opening && header) {
    nextTick(() => header.scrollIntoView?.({ block: 'nearest' }))
  }
}

function matchesQuery(viz: { id: string; name: string }, query: string) {
  return viz.name.toLowerCase().includes(query) || viz.id.toLowerCase().includes(query)
}

// Gefilterte Visualizer für Suche
const filteredVisualizers = computed(() => {
  const query = props.searchQuery.toLowerCase().trim()
  if (!query) return []

  return store.availableVisualizers.filter((viz) => matchesQuery(viz, query))
})

// Favoriten in der Reihenfolge des Merkens; unbekannte IDs (entfernte
// Visualizer) werden ausgelassen, bleiben aber gespeichert.
const favoriteVisualizers = computed(() => {
  const byId = new Map(store.availableVisualizers.map((viz) => [viz.id, viz]))
  return favoritesStore.favoriteIds.flatMap((id) => {
    const viz = byId.get(id)
    return viz ? [viz] : []
  })
})

// Favoriten nach Suchbegriff gefiltert
const shownFavorites = computed(() => {
  const query = props.searchQuery.toLowerCase().trim()
  if (!query) return favoriteVisualizers.value
  return favoriteVisualizers.value.filter((viz) => matchesQuery(viz, query))
})

// Gespeicherte Layer-Presets, die zum Suchbegriff passen
const filteredPresets = computed(() => {
  const query = props.searchQuery.toLowerCase().trim()
  if (!query) return []
  return layerPresetStore.layerPresets.filter((p) => p.name.toLowerCase().includes(query))
})

// Gesamtanzahl der Visualizer
const totalCount = computed(() => store.availableVisualizers.length)
</script>

<style scoped src="./visualizerPanelShared.css"></style>
<style scoped src="./visualizerTypeButtons.css"></style>
<style scoped>
/* Category List */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.category {
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background-color: var(--secondary-bg);
  cursor: pointer;
  user-select: none;
  transition: background-color var(--ds-duration) var(--ds-ease);
}

.category-header:hover {
  background-color: var(--btn-hover);
}

.category-name {
  flex: 1;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
  color: var(--text-primary);
}

.category-count {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  background-color: var(--ds-accent-soft);
  padding: 1px 5px;
  border-radius: var(--ds-radius-md);
}

/* Rein per CSS gezeichneter Chevron (kein Glyph/Emoji) */
.category-caret {
  width: 6px;
  height: 6px;
  border-right: 1.5px solid var(--text-muted);
  border-bottom: 1.5px solid var(--text-muted);
  transform: rotate(-45deg);
  transition: transform var(--ds-duration) var(--ds-ease);
  flex-shrink: 0;
}
.category-header.open .category-caret {
  transform: rotate(45deg);
}

.category-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 3px;
  background-color: var(--card-bg);
}

.favorites-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 5px;
}

.favorites-header .section-label {
  margin-bottom: 0;
}

.category-presets {
  border-color: var(--ds-accent);
}

.no-results {
  padding: 10px;
  text-align: center;
  color: var(--text-muted);
  font-size: var(--ds-text-xs);
  font-style: italic;
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .category {
  border-color: var(--border-color);
}

[data-theme='light'] .category-count {
  background-color: color-mix(in srgb, var(--accent-primary) 15%, transparent);
}
</style>
