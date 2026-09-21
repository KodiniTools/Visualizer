<template>
  <!-- Kategorisierte Visualizer-Auswahl -->
  <div class="control-section">
    <span class="section-label"
      >{{ t('visualizer.visualizerType') }} ({{ totalCount }} {{ t('visualizer.effects') }})</span
    >

    <!-- Suchergebnisse -->
    <div v-if="searchQuery.trim()" class="visualizer-buttons">
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
      <button
        v-for="viz in filteredVisualizers"
        :key="viz.id"
        class="visualizer-btn"
        :class="{ active: !store.multiLayerMode && store.selectedVisualizer === viz.id }"
        @click="store.selectVisualizer(viz.id)"
      >
        {{ viz.name }}
      </button>
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
          <button
            v-for="viz in visualizers"
            :key="viz.id"
            class="visualizer-btn"
            :class="{ active: !store.multiLayerMode && store.selectedVisualizer === viz.id }"
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
import { ref, computed, nextTick } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'
import { useLayerPresetStore } from '../../stores/layerPresetStore.js'

const props = defineProps({
  /** Aktueller Suchbegriff; nicht-leer schaltet von Kategorien auf Trefferliste um. */
  searchQuery: {
    type: String,
    default: '',
  },
})

const { t } = useI18n()
const store = useVisualizerStore()
const layerPresetStore = useLayerPresetStore()

// Schlüssel der Kategorie "Eigene Presets" (kein Visualizer-Kategorie-Key)
const USER_PRESETS_CATEGORY = 'Eigene Presets'

// Akkordeon: es ist immer höchstens eine Kategorie aufgeklappt. Wird eine
// geöffnet, klappen alle anderen zu; ein Klick auf die offene schließt sie.
const openCategory = ref('GPU-Presets')

// Map German category keys to i18n translation keys
const categoryTranslationKeys = {
  'GPU-Presets': 'visualizer.categories.gpu',
  Laser: 'visualizer.categories.laser',
  'LED-Ziffern': 'visualizer.categories.ledDigits',
  'LED-Buchstaben': 'visualizer.categories.ledLetters',
  'LED-Rahmen': 'visualizer.categories.ledFrames',
  Portrait: 'visualizer.categories.portrait',
  Klassisch: 'visualizer.categories.classic',
}

function getCategoryName(category) {
  const key = categoryTranslationKeys[category]
  return key ? t(key) : category
}

function isCategoryOpen(category) {
  return openCategory.value === category
}

function toggleCategory(category, event) {
  const opening = !isCategoryOpen(category)
  openCategory.value = opening ? category : null
  // Klappt eine größere Kategorie darüber zu, rutscht die angeklickte
  // Überschrift nach oben – nach dem Rendern wieder in den sichtbaren Bereich holen.
  const header = event?.currentTarget
  if (opening && header) {
    nextTick(() => header.scrollIntoView?.({ block: 'nearest' }))
  }
}

// Gefilterte Visualizer für Suche
const filteredVisualizers = computed(() => {
  const query = props.searchQuery.toLowerCase().trim()
  if (!query) return []

  return store.availableVisualizers.filter(
    (viz) => viz.name.toLowerCase().includes(query) || viz.id.toLowerCase().includes(query),
  )
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

.preset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}
.preset-btn .preset-badge {
  margin-left: auto;
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  background-color: rgba(201, 152, 77, 0.2);
  padding: 1px 5px;
  border-radius: 8px;
}
.preset-btn.active .preset-badge {
  color: var(--accent-text, #091428);
  background-color: rgba(9, 20, 40, 0.2);
}
.category-presets {
  border-color: rgba(201, 152, 77, 0.45);
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
