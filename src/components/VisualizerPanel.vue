<template>
  <div class="panel-container" :class="{ 'panel-disabled': !store.showVisualizer }">
    <!-- Disabled Overlay -->
    <div v-if="!store.showVisualizer" class="disabled-overlay">
      <span class="disabled-text">{{ t('visualizer.disabled') }}</span>
    </div>
    <div class="panel-header">
      <h4>{{ t('visualizer.title') }}</h4>
      <HelpTooltip
        :title="t('visualizer.helpTitle')"
        icon="🎨"
        :text="t('visualizer.helpText')"
        :tip="t('visualizer.helpTip')"
        position="left"
        :large="true"
      />
    </div>

    <!-- Visualizer Ein/Aus -->
    <div class="control-section status-toggle">
      <span class="section-label">{{ t('visualizer.status') }}</span>
      <button
        class="toggle-btn"
        :class="{ active: store.showVisualizer }"
        @click="store.toggleVisualizer()"
      >
        <span class="btn-icon">{{ store.showVisualizer ? '✓' : '×' }}</span>
        {{ store.showVisualizer ? t('common.on') : t('common.off') }}
      </button>
    </div>

    <!-- Farbwähler -->
    <div class="control-section">
      <span class="section-label">{{ t('visualizer.color') }}</span>
      <input
        type="color"
        :value="store.visualizerColor"
        @input="store.setColor($event.target.value)"
        class="color-picker"
      />
    </div>

    <!-- Intensität-Regler -->
    <div class="control-section">
      <span class="section-label">
        {{ t('visualizer.intensity') }}: {{ Math.round(store.visualizerOpacity * 100) }}%
      </span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="store.visualizerOpacity"
        @input="store.setOpacity(parseFloat($event.target.value))"
        class="slider intensity-slider"
      />
    </div>

    <!-- Farbtransparenz-Regler -->
    <div class="control-section">
      <span class="section-label">
        {{ t('visualizer.colorTransparency') }}: {{ Math.round(store.colorOpacity * 100) }}%
      </span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="store.colorOpacity"
        @input="store.setColorOpacity(parseFloat($event.target.value))"
        class="slider color-slider"
      />
    </div>

    <!-- ✨ NEU: Position & Größe -->
    <div class="control-section position-section">
      <div class="section-header">
        <span class="section-label">{{ t('visualizer.positionSize') }}</span>
        <button
          class="reset-btn"
          @click="store.resetVisualizerTransform()"
          :title="t('visualizer.resetToDefault')"
        >
          ↺
        </button>
      </div>

      <!-- X-Position -->
      <div class="position-control">
        <span class="control-label">X: {{ Math.round(store.visualizerX * 100) }}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="store.visualizerX"
          @input="store.setVisualizerX(parseFloat($event.target.value))"
          class="slider position-slider"
        />
      </div>

      <!-- Y-Position -->
      <div class="position-control">
        <span class="control-label">Y: {{ Math.round(store.visualizerY * 100) }}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="store.visualizerY"
          @input="store.setVisualizerY(parseFloat($event.target.value))"
          class="slider position-slider"
        />
      </div>

      <!-- Skalierung -->
      <div class="position-control">
        <span class="control-label">{{ t('foto.size') }}: {{ Math.round(store.visualizerScale * 100) }}%</span>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.01"
          :value="store.visualizerScale"
          @input="store.setVisualizerScale(parseFloat($event.target.value))"
          class="slider scale-slider"
        />
      </div>
    </div>

    <!-- Suchfeld -->
    <div class="control-section">
      <span class="section-label">{{ t('visualizer.search') }}</span>
      <input
        type="text"
        v-model="searchQuery"
        :placeholder="t('visualizer.searchPlaceholder')"
        class="search-input"
      />
    </div>

    <!-- Kategorisierte Visualizer-Auswahl -->
    <div class="control-section">
      <span class="section-label">{{ t('visualizer.visualizerType') }} ({{ totalCount }} {{ t('visualizer.effects') }})</span>

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
          <summary class="category-header" @click.prevent="toggleCategory(category)">
            <span class="category-icon">{{ getCategoryIcon(category) }}</span>
            <span class="category-name">{{ category }}</span>
            <span class="category-count">{{ visualizers.length }}</span>
            <span class="category-arrow">{{ openCategories[category] ? '▼' : '▶' }}</span>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { useVisualizerStore } from '../stores/visualizerStore.js';
import HelpTooltip from './HelpTooltip.vue';

const { t, locale } = useI18n();
const store = useVisualizerStore();
const searchQuery = ref('');
const openCategories = ref({
  'Balken & Spektrum': true // Erste Kategorie standardmäßig offen
});

// Icons für Kategorien
const categoryIcons = {
  'Balken & Spektrum': '📊',
  'Wellen': '🌊',
  'Kreise & Kugeln': '⭕',
  'Partikel': '✨',
  'Geometrie': '🔷',
  'Organisch': '🌿',
  'Kristalle & Netze': '💎',
  'Blüten': '🌸',
  '3D-Objekte': '🎲'
};

function getCategoryIcon(category) {
  return categoryIcons[category] || '🎨';
}

function isCategoryOpen(category) {
  return openCategories.value[category] || false;
}

function toggleCategory(category) {
  openCategories.value[category] = !openCategories.value[category];
}

// Gefilterte Visualizer für Suche
const filteredVisualizers = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return [];

  return store.availableVisualizers.filter(viz =>
    viz.name.toLowerCase().includes(query) ||
    viz.id.toLowerCase().includes(query)
  );
});

// Gesamtanzahl der Visualizer
const totalCount = computed(() => store.availableVisualizers.length);
</script>

<style scoped>
.panel-container {
  background-color: var(--panel, #151b1d);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

h4 {
  margin: 0;
  color: var(--text, #E9E9EB);
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

h4::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Cpath d='M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.8));
}

.control-section {
  margin-bottom: 10px;
}

.control-section:last-child {
  margin-bottom: 0;
}

.section-label {
  display: block;
  font-size: 0.6rem;
  color: var(--muted, #A8A992);
  margin-bottom: 5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Toggle Button */
.toggle-btn {
  width: 100%;
  background-color: var(--btn, #1c2426);
  color: var(--text, #E9E9EB);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 0.65rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-weight: 500;
}

.toggle-btn:hover {
  background-color: var(--btn-hover, #2a3335);
  border-color: var(--accent, #609198);
}

.toggle-btn.active {
  background-color: var(--accent, #609198);
  color: var(--accent-text, #0f1416);
  border-color: var(--accent, #609198);
}

.toggle-btn.active:hover {
  background-color: var(--accent-light, #BCE5E5);
}

.btn-icon {
  font-size: 0.75rem;
  font-weight: bold;
}

/* Color Picker */
.color-picker {
  width: 100%;
  height: 32px;
  border: 2px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 5px;
  cursor: pointer;
  background-color: var(--btn, #1c2426);
  transition: border-color 0.2s ease;
}

.color-picker:hover {
  border-color: var(--accent, #609198);
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

.color-picker::-moz-color-swatch {
  border: none;
  border-radius: 4px;
}

/* Slider Basis-Styling */
.slider {
  width: 100%;
  height: 5px;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

/* Intensität-Slider */
.intensity-slider {
  background: linear-gradient(to right, var(--btn, #1c2426) 0%, var(--accent, #609198) 100%);
}

.intensity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-light, #BCE5E5);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.intensity-slider::-webkit-slider-thumb:hover {
  background: var(--accent, #609198);
  transform: scale(1.1);
}

.intensity-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-light, #BCE5E5);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.intensity-slider::-moz-range-thumb:hover {
  background: var(--accent, #609198);
  transform: scale(1.1);
}

/* Farbtransparenz-Slider */
.color-slider {
  background: linear-gradient(to right, rgba(110, 168, 254, 0) 0%, rgba(110, 168, 254, 1) 100%);
}

.color-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #8bc34a;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.color-slider::-webkit-slider-thumb:hover {
  background: #7cb342;
  transform: scale(1.15);
}

.color-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #8bc34a;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.color-slider::-moz-range-thumb:hover {
  background: #7cb342;
  transform: scale(1.15);
}

/* Search Input */
.search-input {
  width: 100%;
  padding: 6px 10px;
  background-color: var(--btn, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 5px;
  color: var(--text, #E9E9EB);
  font-size: 0.65rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: var(--accent, #609198);
}

.search-input::placeholder {
  color: var(--muted, #A8A992);
}

/* Category List */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.category {
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-radius: 5px;
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background-color: var(--btn, #1c2426);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.category-header:hover {
  background-color: var(--btn-hover, #2a3335);
}

.category-icon {
  font-size: 0.7rem;
}

.category-name {
  flex: 1;
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--text, #E9E9EB);
}

.category-count {
  font-size: 0.55rem;
  color: var(--muted, #A8A992);
  background-color: rgba(96, 145, 152, 0.2);
  padding: 1px 5px;
  border-radius: 8px;
}

.category-arrow {
  font-size: 0.5rem;
  color: var(--muted, #A8A992);
}

.category-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 3px;
  background-color: var(--panel, #151b1d);
}

/* Visualizer Buttons */
.visualizer-buttons {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.visualizer-btn {
  width: 100%;
  background-color: var(--btn, #1c2426);
  color: var(--text, #E9E9EB);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-radius: 5px;
  padding: 6px 10px;
  font-size: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-weight: 500;
}

.visualizer-btn:hover {
  background-color: var(--btn-hover, #2a3335);
  border-color: var(--accent, #609198);
  transform: translateX(2px);
}

.visualizer-btn.active {
  background-color: var(--accent, #609198);
  color: var(--accent-text, #0f1416);
  border-color: var(--accent, #609198);
  font-weight: 600;
}

.visualizer-btn.active:hover {
  background-color: var(--accent-light, #BCE5E5);
}

.no-results {
  padding: 10px;
  text-align: center;
  color: var(--muted, #A8A992);
  font-size: 0.65rem;
  font-style: italic;
}

/* ✨ NEU: Position & Größe Styles */
.position-section {
  background-color: rgba(96, 145, 152, 0.05);
  border-radius: 5px;
  padding: 8px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.15));
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header .section-label {
  margin-bottom: 0;
}

.reset-btn {
  background-color: var(--btn, #1c2426);
  color: var(--muted, #A8A992);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 4px;
  width: 24px;
  height: 24px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-btn:hover {
  background-color: var(--accent, #609198);
  color: var(--accent-text, #0f1416);
  border-color: var(--accent, #609198);
}

.position-control {
  margin-bottom: 6px;
}

.position-control:last-child {
  margin-bottom: 0;
}

.control-label {
  display: block;
  font-size: 0.55rem;
  color: var(--muted, #A8A992);
  margin-bottom: 3px;
  font-weight: 500;
}

/* Position Slider */
.position-slider {
  background: linear-gradient(to right, #444 0%, #6ea8fe 50%, #444 100%);
}

.position-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ff9800;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.position-slider::-webkit-slider-thumb:hover {
  background: #f57c00;
  transform: scale(1.15);
}

.position-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ff9800;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.position-slider::-moz-range-thumb:hover {
  background: #f57c00;
  transform: scale(1.15);
}

/* Scale Slider */
.scale-slider {
  background: linear-gradient(to right, #333 0%, #4caf50 50%, #8bc34a 100%);
}

.scale-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4caf50;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.scale-slider::-webkit-slider-thumb:hover {
  background: #388e3c;
  transform: scale(1.15);
}

.scale-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4caf50;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.scale-slider::-moz-range-thumb:hover {
  background: #388e3c;
  transform: scale(1.15);
}

/* ✅ NEU: Disabled State Styles */
.panel-container {
  position: relative;
  transition: opacity 0.3s ease;
}

.panel-disabled {
  opacity: 0.6;
}

/* Alle Steuerungen außer dem Status-Toggle deaktivieren */
.panel-disabled .control-section:not(.status-toggle) {
  pointer-events: none;
  opacity: 0.4;
}

/* Status-Toggle immer aktiv und sichtbar halten */
.panel-disabled .status-toggle {
  pointer-events: auto !important;
  opacity: 1 !important;
  position: relative;
  z-index: 20;
}

.disabled-overlay {
  position: absolute;
  top: 50px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 0 0 8px 8px;
  pointer-events: none;
}

.disabled-text {
  background: rgba(255, 107, 107, 0.9);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>
