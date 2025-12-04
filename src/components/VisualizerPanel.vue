<template>
  <div class="panel-container">
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
</style>
