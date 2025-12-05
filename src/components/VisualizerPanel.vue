<template>
  <div class="panel-container" :class="{ 'panel-disabled': !store.showVisualizer }">
    <!-- Disabled Overlay -->
    <div v-if="!store.showVisualizer" class="disabled-overlay">
      <span class="disabled-text">Visualizer deaktiviert</span>
    </div>
    <div class="panel-header">
      <h4>Visualizer</h4>
      <HelpTooltip
        title="Audio Visualizer"
        icon="🎨"
        text="Wählen Sie einen von 30+ Visualizer-Effekten. Die Visualisierung reagiert auf die Audiowiedergabe in Echtzeit."
        tip="Starten Sie die Musik, um die Effekte live zu sehen!"
        position="left"
        :large="true"
      />
    </div>

    <!-- Visualizer Ein/Aus -->
    <div class="control-section">
      <span class="section-label">Status</span>
      <button
        class="toggle-btn"
        :class="{ active: store.showVisualizer }"
        @click="store.toggleVisualizer()"
      >
        <span class="btn-icon">{{ store.showVisualizer ? '✓' : '×' }}</span>
        {{ store.showVisualizer ? 'An' : 'Aus' }}
      </button>
    </div>

    <!-- Farbwähler -->
    <div class="control-section">
      <span class="section-label">Farbe</span>
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
        Intensität: {{ Math.round(store.visualizerOpacity * 100) }}%
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
        Farbtransparenz: {{ Math.round(store.colorOpacity * 100) }}%
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
        <span class="section-label">Position & Größe</span>
        <button
          class="reset-btn"
          @click="store.resetVisualizerTransform()"
          title="Auf Standard zurücksetzen"
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
        <span class="control-label">Größe: {{ Math.round(store.visualizerScale * 100) }}%</span>
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
      <span class="section-label">Suche</span>
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Visualizer suchen..."
        class="search-input"
      />
    </div>

    <!-- Kategorisierte Visualizer-Auswahl -->
    <div class="control-section">
      <span class="section-label">Visualizer-Typ ({{ totalCount }} Effekte)</span>

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
          Keine Ergebnisse für "{{ searchQuery }}"
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
import { useVisualizerStore } from '../stores/visualizerStore.js';
import HelpTooltip from './HelpTooltip.vue';

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
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #333;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

h4 {
  margin: 0;
  color: #e0e0e0;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.control-section {
  margin-bottom: 12px;
}

.control-section:last-child {
  margin-bottom: 0;
}

.section-label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-bottom: 6px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Toggle Button */
.toggle-btn {
  width: 100%;
  background-color: #3a3a3a;
  color: #c0c0c0;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 500;
}

.toggle-btn:hover {
  background-color: #454545;
  border-color: #666;
}

.toggle-btn.active {
  background-color: #6ea8fe;
  color: #fff;
  border-color: #6ea8fe;
}

.toggle-btn.active:hover {
  background-color: #5a96e8;
}

.btn-icon {
  font-size: 14px;
  font-weight: bold;
}

/* Color Picker */
.color-picker {
  width: 100%;
  height: 36px;
  border: 2px solid #444;
  border-radius: 6px;
  cursor: pointer;
  background-color: #1e1e1e;
  transition: border-color 0.2s ease;
}

.color-picker:hover {
  border-color: #6ea8fe;
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
  height: 6px;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

/* Intensität-Slider */
.intensity-slider {
  background: linear-gradient(to right, #333 0%, #6ea8fe 100%);
}

.intensity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6ea8fe;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.intensity-slider::-webkit-slider-thumb:hover {
  background: #5a98ee;
  transform: scale(1.15);
}

.intensity-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6ea8fe;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.intensity-slider::-moz-range-thumb:hover {
  background: #5a98ee;
  transform: scale(1.15);
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
  padding: 8px 12px;
  background-color: #1e1e1e;
  border: 1px solid #444;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: #6ea8fe;
}

.search-input::placeholder {
  color: #666;
}

/* Category List */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category {
  border: 1px solid #444;
  border-radius: 6px;
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background-color: #333;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.category-header:hover {
  background-color: #3a3a3a;
}

.category-icon {
  font-size: 14px;
}

.category-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: #e0e0e0;
}

.category-count {
  font-size: 10px;
  color: #888;
  background-color: #444;
  padding: 2px 6px;
  border-radius: 10px;
}

.category-arrow {
  font-size: 10px;
  color: #666;
}

.category-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  background-color: #2a2a2a;
}

/* Visualizer Buttons */
.visualizer-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.visualizer-btn {
  width: 100%;
  background-color: #3a3a3a;
  color: #c0c0c0;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-weight: 500;
}

.visualizer-btn:hover {
  background-color: #454545;
  border-color: #666;
  transform: translateX(2px);
}

.visualizer-btn.active {
  background-color: #6ea8fe;
  color: #fff;
  border-color: #6ea8fe;
  font-weight: 600;
}

.visualizer-btn.active:hover {
  background-color: #5a96e8;
}

.no-results {
  padding: 12px;
  text-align: center;
  color: #666;
  font-size: 12px;
  font-style: italic;
}

/* ✨ NEU: Position & Größe Styles */
.position-section {
  background-color: #252525;
  border-radius: 6px;
  padding: 10px;
  border: 1px solid #3a3a3a;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-header .section-label {
  margin-bottom: 0;
}

.reset-btn {
  background-color: #3a3a3a;
  color: #888;
  border: 1px solid #555;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-btn:hover {
  background-color: #6ea8fe;
  color: #fff;
  border-color: #6ea8fe;
}

.position-control {
  margin-bottom: 8px;
}

.position-control:last-child {
  margin-bottom: 0;
}

.control-label {
  display: block;
  font-size: 10px;
  color: #888;
  margin-bottom: 4px;
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

.panel-disabled .control-section:not(:first-child):not(:nth-child(2)) {
  pointer-events: none;
  opacity: 0.4;
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
