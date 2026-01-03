<template>
  <div class="layer-panel">
    <!-- Multi-Layer Toggle -->
    <div class="layer-header">
      <div class="header-left">
        <span class="layer-icon">🎨</span>
        <span class="header-title">{{ t('visualizer.multiLayer') || 'Multi-Layer' }}</span>
      </div>
      <button
        class="toggle-btn"
        :class="{ active: store.multiLayerMode }"
        @click="toggleMultiLayerMode"
      >
        {{ store.multiLayerMode ? t('common.on') : t('common.off') }}
      </button>
    </div>

    <!-- Layer Controls (nur wenn Multi-Layer aktiv) -->
    <div v-if="store.multiLayerMode" class="layer-content">
      <!-- Add Layer Section -->
      <div class="add-layer-section">
        <select v-model="newLayerVisualizerId" class="add-layer-select">
          <optgroup
            v-for="(visualizers, category) in store.categorizedVisualizers"
            :key="category"
            :label="getCategoryName(category)"
          >
            <option
              v-for="viz in visualizers"
              :key="viz.id"
              :value="viz.id"
            >
              {{ viz.name }}
            </option>
          </optgroup>
        </select>
        <button class="add-layer-btn" @click="addNewLayer">
          <span class="btn-icon">+</span>
          {{ t('visualizer.addLayer') || 'Hinzufügen' }}
        </button>
      </div>

      <!-- Layer Liste (unterster Layer unten) -->
      <div class="layer-list">
        <div
          v-for="(layer, index) in reversedLayers"
          :key="layer.id"
          class="layer-item"
          :class="{
            active: store.activeLayerId === layer.id,
            hidden: !layer.visible
          }"
          @click="store.selectLayer(layer.id)"
        >
          <!-- Layer Header -->
          <div class="layer-item-header">
            <button
              class="visibility-btn"
              @click.stop="store.toggleLayerVisibility(layer.id)"
              :title="layer.visible ? t('visualizer.hideLayer') : t('visualizer.showLayer')"
            >
              {{ layer.visible ? '👁' : '👁‍🗨' }}
            </button>

            <span class="layer-color" :style="{ backgroundColor: layer.color }"></span>

            <span class="layer-name">{{ getVisualizerName(layer.visualizerId) }}</span>

            <div class="layer-actions">
              <button
                class="action-btn"
                @click.stop="store.moveLayerUp(layer.id)"
                :disabled="index === 0"
                title="Nach oben"
              >▲</button>
              <button
                class="action-btn"
                @click.stop="store.moveLayerDown(layer.id)"
                :disabled="index === reversedLayers.length - 1"
                title="Nach unten"
              >▼</button>
              <button
                class="action-btn duplicate-btn"
                @click.stop="store.duplicateLayer(layer.id)"
                title="Duplizieren"
              >⧉</button>
              <button
                class="action-btn delete-btn"
                @click.stop="store.removeLayer(layer.id)"
                title="Löschen"
              >×</button>
            </div>
          </div>

          <!-- Layer Details (nur wenn aktiv) -->
          <div v-if="store.activeLayerId === layer.id" class="layer-details">
            <!-- Visualizer Auswahl -->
            <div class="detail-row">
              <span class="detail-label">{{ t('visualizer.visualizerType') }}</span>
              <select
                class="detail-select"
                :value="layer.visualizerId"
                @change="updateProperty(layer.id, 'visualizerId', $event.target.value)"
              >
                <optgroup
                  v-for="(visualizers, category) in store.categorizedVisualizers"
                  :key="category"
                  :label="getCategoryName(category)"
                >
                  <option
                    v-for="viz in visualizers"
                    :key="viz.id"
                    :value="viz.id"
                  >
                    {{ viz.name }}
                  </option>
                </optgroup>
              </select>
            </div>

            <!-- Farbe -->
            <div class="detail-row">
              <span class="detail-label">{{ t('visualizer.color') }}</span>
              <input
                type="color"
                class="detail-color"
                :value="layer.color"
                @input="updateProperty(layer.id, 'color', $event.target.value)"
              />
            </div>

            <!-- Deckkraft -->
            <div class="detail-row">
              <span class="detail-label">{{ t('visualizer.intensity') }}: {{ Math.round(layer.opacity * 100) }}%</span>
              <input
                type="range"
                class="detail-slider"
                min="0" max="1" step="0.01"
                :value="layer.opacity"
                @input="updateProperty(layer.id, 'opacity', parseFloat($event.target.value))"
              />
            </div>

            <!-- Farbtransparenz -->
            <div class="detail-row">
              <span class="detail-label">{{ t('visualizer.colorTransparency') }}: {{ Math.round(layer.colorOpacity * 100) }}%</span>
              <input
                type="range"
                class="detail-slider"
                min="0" max="1" step="0.01"
                :value="layer.colorOpacity"
                @input="updateProperty(layer.id, 'colorOpacity', parseFloat($event.target.value))"
              />
            </div>

            <!-- Blend Mode -->
            <div class="detail-row">
              <span class="detail-label">{{ t('visualizer.blendMode') || 'Mischmodus' }}</span>
              <select
                class="detail-select"
                :value="layer.blendMode"
                @change="updateProperty(layer.id, 'blendMode', $event.target.value)"
              >
                <option
                  v-for="mode in blendModes"
                  :key="mode.id"
                  :value="mode.id"
                >
                  {{ getBlendModeName(mode) }}
                </option>
              </select>
            </div>

            <!-- Position X -->
            <div class="detail-row">
              <span class="detail-label">X: {{ Math.round(layer.x * 100) }}%</span>
              <input
                type="range"
                class="detail-slider position-slider"
                min="0" max="1" step="0.01"
                :value="layer.x"
                @input="updateProperty(layer.id, 'x', parseFloat($event.target.value))"
              />
            </div>

            <!-- Position Y -->
            <div class="detail-row">
              <span class="detail-label">Y: {{ Math.round(layer.y * 100) }}%</span>
              <input
                type="range"
                class="detail-slider position-slider"
                min="0" max="1" step="0.01"
                :value="layer.y"
                @input="updateProperty(layer.id, 'y', parseFloat($event.target.value))"
              />
            </div>

            <!-- Skalierung -->
            <div class="detail-row">
              <span class="detail-label">{{ t('foto.size') || 'Größe' }}: {{ Math.round(layer.scale * 100) }}%</span>
              <input
                type="range"
                class="detail-slider scale-slider"
                min="0.1" max="3" step="0.01"
                :value="layer.scale"
                @input="updateProperty(layer.id, 'scale', parseFloat($event.target.value))"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Info wenn keine Layer -->
      <div v-if="store.visualizerLayers.length === 0" class="no-layers">
        {{ t('visualizer.noLayers') || 'Keine Layer vorhanden' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { useVisualizerStore, BLEND_MODES } from '../stores/visualizerStore.js';
import { Visualizers } from '../lib/visualizers/index.js';

const { t, locale } = useI18n();
const store = useVisualizerStore();

// Blend modes
const blendModes = BLEND_MODES;

// Auswahl für neuen Layer (Standard: aktuell ausgewählter Visualizer)
const newLayerVisualizerId = ref(store.selectedVisualizer || 'bars');

// Umgekehrte Layer-Liste (oberster Layer oben in der UI)
const reversedLayers = computed(() => {
  return [...store.visualizerLayers].reverse();
});

// Kategorie-Namen (Übersetzung)
const categoryTranslationKeys = {
  'Balken & Spektrum': 'visualizer.categories.barsSpectrum',
  'Wellen': 'visualizer.categories.waves',
  'Kreise & Kugeln': 'visualizer.categories.circlesSpheres',
  'Partikel': 'visualizer.categories.particles',
  'Geometrie': 'visualizer.categories.geometry',
  'Organisch': 'visualizer.categories.organic',
  'Kristalle & Netze': 'visualizer.categories.crystalsNets',
  'Blüten': 'visualizer.categories.blossoms',
  '3D-Objekte': 'visualizer.categories.objects3d',
  'Retro & Pixel': 'visualizer.categories.retroPixel'
};

function getCategoryName(category) {
  const key = categoryTranslationKeys[category];
  return key ? t(key) : category;
}

function getVisualizerName(visualizerId) {
  const viz = Visualizers[visualizerId];
  if (!viz) return visualizerId;
  return locale.value === 'en'
    ? (viz.name_en || viz.name_de || visualizerId)
    : (viz.name_de || viz.name_en || visualizerId);
}

function getBlendModeName(mode) {
  return locale.value === 'en' ? mode.name_en : mode.name_de;
}

function toggleMultiLayerMode() {
  store.setMultiLayerMode(!store.multiLayerMode);
}

function addNewLayer() {
  // Füge neuen Layer mit dem ausgewählten Visualizer hinzu
  const visualizerId = newLayerVisualizerId.value;

  // Generiere eine harmonische Farbe basierend auf der Layer-Anzahl
  const hue = (store.visualizerLayers.length * 137.5) % 360; // Goldener Winkel für Farbverteilung
  const color = `hsl(${hue}, 70%, 60%)`;

  // Konvertiere HSL zu HEX
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const hexColor = hslToHex(hue, 70, 60);
  store.addLayer(visualizerId, { color: hexColor });
}

function updateProperty(layerId, property, value) {
  store.updateLayerProperty(layerId, property, value);
}
</script>

<style scoped>
.layer-panel {
  background-color: var(--panel, #151b1d);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  margin-top: 10px;
}

.layer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.layer-icon {
  font-size: 0.9rem;
}

.header-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text, #E9E9EB);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.toggle-btn {
  background-color: var(--btn, #1c2426);
  color: var(--text, #E9E9EB);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
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

.layer-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-layer-section {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.add-layer-select {
  flex: 1;
  background-color: var(--btn, #1c2426);
  color: var(--text, #E9E9EB);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 5px;
  padding: 6px 8px;
  font-size: 0.6rem;
  cursor: pointer;
  min-width: 0;
}

.add-layer-select:focus {
  outline: none;
  border-color: var(--accent, #609198);
}

.add-layer-select optgroup {
  font-weight: 600;
  color: var(--muted, #A8A992);
}

.add-layer-select option {
  background-color: var(--panel, #151b1d);
  color: var(--text, #E9E9EB);
}

.add-layer-btn {
  background-color: var(--accent, #609198);
  color: var(--accent-text, #0f1416);
  border: none;
  border-radius: 5px;
  padding: 6px 12px;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
}

.add-layer-btn:hover {
  background-color: var(--accent-light, #BCE5E5);
}

.btn-icon {
  font-size: 1rem;
  font-weight: bold;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.layer-item {
  background-color: var(--btn, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-radius: 5px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-item:hover {
  border-color: var(--accent, #609198);
}

.layer-item.active {
  border-color: var(--accent, #609198);
  border-width: 2px;
}

.layer-item.hidden {
  opacity: 0.5;
}

.layer-item-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  gap: 6px;
}

.visibility-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.visibility-btn:hover {
  opacity: 1;
}

.layer-color {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.layer-name {
  flex: 1;
  font-size: 0.6rem;
  color: var(--text, #E9E9EB);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-actions {
  display: flex;
  gap: 2px;
}

.action-btn {
  background-color: var(--panel, #151b1d);
  color: var(--muted, #A8A992);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-radius: 3px;
  width: 18px;
  height: 18px;
  font-size: 0.55rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover:not(:disabled) {
  background-color: var(--accent, #609198);
  color: var(--accent-text, #0f1416);
  border-color: var(--accent, #609198);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.delete-btn:hover:not(:disabled) {
  background-color: #ff6b6b;
  border-color: #ff6b6b;
}

.layer-details {
  background-color: var(--panel, #151b1d);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.detail-label {
  font-size: 0.55rem;
  color: var(--muted, #A8A992);
  font-weight: 500;
}

.detail-select {
  background-color: var(--btn, #1c2426);
  color: var(--text, #E9E9EB);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 0.6rem;
  cursor: pointer;
}

.detail-select:focus {
  outline: none;
  border-color: var(--accent, #609198);
}

.detail-color {
  width: 100%;
  height: 24px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--btn, #1c2426);
}

.detail-color::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.detail-color::-webkit-color-swatch {
  border: none;
  border-radius: 3px;
}

.detail-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(to right, var(--btn, #1c2426) 0%, var(--accent, #609198) 100%);
}

.detail-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-light, #BCE5E5);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.detail-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-light, #BCE5E5);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.position-slider {
  background: linear-gradient(to right, #444 0%, #6ea8fe 50%, #444 100%);
}

.position-slider::-webkit-slider-thumb {
  background: #ff9800;
}

.position-slider::-moz-range-thumb {
  background: #ff9800;
}

.scale-slider {
  background: linear-gradient(to right, #333 0%, #4caf50 50%, #8bc34a 100%);
}

.scale-slider::-webkit-slider-thumb {
  background: #4caf50;
}

.scale-slider::-moz-range-thumb {
  background: #4caf50;
}

.no-layers {
  text-align: center;
  padding: 15px;
  color: var(--muted, #A8A992);
  font-size: 0.65rem;
  font-style: italic;
}

/* Scrollbar Styling */
.layer-list::-webkit-scrollbar {
  width: 6px;
}

.layer-list::-webkit-scrollbar-track {
  background: var(--panel, #151b1d);
  border-radius: 3px;
}

.layer-list::-webkit-scrollbar-thumb {
  background: var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 3px;
}

.layer-list::-webkit-scrollbar-thumb:hover {
  background: var(--accent, #609198);
}
</style>
