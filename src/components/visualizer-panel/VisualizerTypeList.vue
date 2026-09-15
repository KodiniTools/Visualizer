<template>
  <!-- Kategorisierte Visualizer-Auswahl -->
  <div class="control-section">
    <span class="section-label"
      >{{ t('visualizer.visualizerType') }} ({{ totalCount }} {{ t('visualizer.effects') }})</span
    >

    <!-- Suchergebnisse -->
    <div v-if="searchQuery.trim()" class="visualizer-buttons">
      <button
        v-for="viz in filteredVisualizers"
        :key="viz.id"
        class="visualizer-btn"
        :class="{ active: store.selectedVisualizer === viz.id }"
        @click="store.selectVisualizer(viz.id)"
      >
        {{ viz.name }}
      </button>
      <div v-if="filteredVisualizers.length === 0" class="no-results">
        {{ t('visualizer.noResultsFor') }} "{{ searchQuery }}"
      </div>
    </div>

    <!-- Kategorien (wenn keine Suche aktiv) -->
    <div v-else class="category-list">
      <details
        v-for="(visualizers, category) in store.categorizedVisualizers"
        :key="category"
        class="category"
        :open="isCategoryOpen(category)"
      >
        <summary
          class="category-header"
          :class="{ open: openCategories[category] }"
          @click.prevent="toggleCategory(category)"
        >
          <span class="category-name">{{ getCategoryName(category) }}</span>
          <span class="category-count">{{ visualizers.length }}</span>
          <span class="category-caret" aria-hidden="true"></span>
        </summary>
        <div class="category-content">
          <button
            v-for="viz in visualizers"
            :key="viz.id"
            class="visualizer-btn"
            :class="{ active: store.selectedVisualizer === viz.id }"
            @click="store.selectVisualizer(viz.id)"
          >
            {{ viz.name }}
          </button>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'

const props = defineProps({
  /** Aktueller Suchbegriff; nicht-leer schaltet von Kategorien auf Trefferliste um. */
  searchQuery: {
    type: String,
    default: '',
  },
})

const { t } = useI18n()
const store = useVisualizerStore()

const openCategories = ref({
  'GPU-Presets': true, // GPU-Presets offen, „Klassisch“ eingeklappt
})

// Map German category keys to i18n translation keys
const categoryTranslationKeys = {
  'GPU-Presets': 'visualizer.categories.gpu',
  Portrait: 'visualizer.categories.portrait',
  Klassisch: 'visualizer.categories.classic',
}

function getCategoryName(category) {
  const key = categoryTranslationKeys[category]
  return key ? t(key) : category
}

function isCategoryOpen(category) {
  return openCategories.value[category] || false
}

function toggleCategory(category) {
  openCategories.value[category] = !openCategories.value[category]
}

// Gefilterte Visualizer für Suche
const filteredVisualizers = computed(() => {
  const query = props.searchQuery.toLowerCase().trim()
  if (!query) return []

  return store.availableVisualizers.filter(
    (viz) => viz.name.toLowerCase().includes(query) || viz.id.toLowerCase().includes(query),
  )
})

// Gesamtanzahl der Visualizer
const totalCount = computed(() => store.availableVisualizers.length)
</script>

<style scoped src="./visualizerPanelShared.css"></style>
<style scoped>
/* Category List */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.category {
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 5px;
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.category-header:hover {
  background-color: var(--btn-hover, #1a2a42);
}

.category-name {
  flex: 1;
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--text-primary, #e9e9eb);
}

.category-count {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  background-color: rgba(201, 152, 77, 0.2);
  padding: 1px 5px;
  border-radius: 8px;
}

/* Rein per CSS gezeichneter Chevron (kein Glyph/Emoji) */
.category-caret {
  width: 6px;
  height: 6px;
  border-right: 1.5px solid var(--text-muted, #7a8da0);
  border-bottom: 1.5px solid var(--text-muted, #7a8da0);
  transform: rotate(-45deg);
  transition: transform 0.2s ease;
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
  background-color: var(--card-bg, #142640);
}

/* Visualizer Buttons */
.visualizer-buttons {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.visualizer-btn {
  width: 100%;
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 5px;
  padding: 6px 10px;
  font-size: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-weight: 500;
}

.visualizer-btn:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: translateX(2px);
}

.visualizer-btn.active {
  background-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
  border-color: var(--accent-primary, #c9984d);
  font-weight: 600;
}

.visualizer-btn.active:hover {
  background-color: var(--accent-tertiary, #f8e1a9);
}

.no-results {
  padding: 10px;
  text-align: center;
  color: var(--text-muted, #7a8da0);
  font-size: 0.65rem;
  font-style: italic;
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .category {
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .category-header {
  background-color: #f9f2d5;
}

[data-theme='light'] .category-header:hover {
  background-color: #f8e1a9;
}

[data-theme='light'] .category-name {
  color: #003971;
}

[data-theme='light'] .category-count {
  color: #4d6d8e;
  background-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .category-content {
  background-color: #ffffff;
}

[data-theme='light'] .visualizer-btn {
  background-color: #f9f2d5;
  color: #003971;
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .visualizer-btn:hover {
  background-color: #f8e1a9;
  border-color: #014f99;
}

[data-theme='light'] .visualizer-btn.active {
  background-color: #014f99;
  color: #f5f4d6;
  border-color: #014f99;
}

[data-theme='light'] .visualizer-btn.active:hover {
  background-color: #003971;
}

[data-theme='light'] .no-results {
  color: #4d6d8e;
}
</style>
