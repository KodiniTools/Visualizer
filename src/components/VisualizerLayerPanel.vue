<template>
  <div class="layer-panel">
    <!-- Multi-Layer Toggle -->
    <div class="layer-header">
      <div class="header-left">
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
            <option v-for="viz in visualizers" :key="viz.id" :value="viz.id">
              {{ viz.name }}
            </option>
          </optgroup>
        </select>
        <button class="add-layer-btn" @click="addNewLayer">
          {{ t('visualizer.addLayer') || 'Hinzufügen' }}
        </button>
      </div>

      <!-- Layer Liste (unterster Layer unten) -->
      <div class="layer-list" ref="layerListRef">
        <div
          v-for="(layer, index) in reversedLayers"
          :key="layer.id"
          :ref="(el) => setLayerRef(layer.id, el)"
          class="layer-item"
          :class="{
            active: store.activeLayerId === layer.id,
            hidden: !layer.visible,
          }"
          @click="selectLayerAndScroll(layer.id)"
        >
          <!-- Layer Header -->
          <div class="layer-item-header">
            <button
              class="visibility-btn"
              @click.stop="store.toggleLayerVisibility(layer.id)"
              :title="layer.visible ? t('visualizer.hideLayer') : t('visualizer.showLayer')"
            >
              {{ layer.visible ? t('common.on') : t('common.off') }}
            </button>

            <span class="layer-color" :style="{ backgroundColor: layer.color }"></span>

            <span class="layer-name">{{ getVisualizerName(layer.visualizerId) }}</span>

            <div class="layer-actions">
              <button
                class="action-btn"
                @click.stop="store.moveLayerUp(layer.id)"
                :disabled="index === 0"
                :title="t('common.moveUp')"
              >
                <span class="caret-up" aria-hidden="true"></span>
              </button>
              <button
                class="action-btn"
                @click.stop="store.moveLayerDown(layer.id)"
                :disabled="index === reversedLayers.length - 1"
                :title="t('common.moveDown')"
              >
                <span class="caret-down" aria-hidden="true"></span>
              </button>
              <button
                class="action-btn duplicate-btn"
                @click.stop="store.duplicateLayer(layer.id)"
                :title="t('common.duplicate')"
              >
                {{ t('common.duplicate') }}
              </button>
              <button
                class="action-btn delete-btn"
                @click.stop="store.removeLayer(layer.id)"
                :title="t('common.delete')"
              >
                {{ t('common.delete') }}
              </button>
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
                  <option v-for="viz in visualizers" :key="viz.id" :value="viz.id">
                    {{ viz.name }}
                  </option>
                </optgroup>
              </select>
            </div>

            <!-- Farbe -->
            <div class="detail-row">
              <span class="detail-label">{{ t('visualizer.color') }}</span>
              <ColorField
                class="detail-color"
                :model-value="layer.color"
                @update:model-value="updateProperty(layer.id, 'color', $event)"
              />
            </div>

            <!-- Deckkraft -->
            <div class="detail-row">
              <span class="detail-label"
                >{{ t('visualizer.intensity') }}: {{ Math.round(layer.opacity * 100) }}%</span
              >
              <SliderField
                class="detail-slider"
                :min="0"
                :max="1"
                :step="0.01"
                :default-value="1"
                :model-value="layer.opacity"
                @update:model-value="updateProperty(layer.id, 'opacity', $event)"
              />
            </div>

            <!-- Farbtransparenz -->
            <div class="detail-row">
              <span class="detail-label"
                >{{ t('visualizer.colorTransparency') }}:
                {{ Math.round(layer.colorOpacity * 100) }}%</span
              >
              <SliderField
                class="detail-slider"
                :min="0"
                :max="1"
                :step="0.01"
                :default-value="1"
                :model-value="layer.colorOpacity"
                @update:model-value="updateProperty(layer.id, 'colorOpacity', $event)"
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
                <option v-for="mode in blendModes" :key="mode.id" :value="mode.id">
                  {{ getBlendModeName(mode) }}
                </option>
              </select>
            </div>

            <!-- Reaktionsquelle -->
            <div class="detail-row">
              <span class="detail-label">{{ t('visualizer.reactSource.label') }}</span>
              <select
                class="detail-select"
                :value="layer.reactSource || 'spectrum'"
                @change="updateProperty(layer.id, 'reactSource', $event.target.value)"
              >
                <option v-for="src in levelSources" :key="src" :value="src">
                  {{ t(`visualizer.reactSource.${src}`) }}
                </option>
                <optgroup :label="t('visualizer.reactSource.onsetGroup')">
                  <option v-for="src in onsetSources" :key="src" :value="src">
                    {{ t(`visualizer.reactSource.${src}`) }}
                  </option>
                </optgroup>
              </select>
            </div>
            <div v-if="(layer.reactSource || 'spectrum') !== 'spectrum'" class="detail-row">
              <span class="detail-label"
                >{{ t('visualizer.reactSource.strength') }}: {{ layer.reactStrength ?? 70 }}%</span
              >
              <SliderField
                class="detail-slider"
                :min="0"
                :max="100"
                :step="1"
                :default-value="70"
                :model-value="layer.reactStrength ?? 70"
                @update:model-value="updateProperty(layer.id, 'reactStrength', $event)"
              />
              <VisualizerReactShapeControls
                :settings="layer"
                compact
                @update="(field, value) => updateProperty(layer.id, field, value)"
              />
            </div>

            <!-- Bild für Portrait-Presets -->
            <div v-if="layerNeedsImage(layer)" class="detail-row">
              <span class="detail-label">{{ t('visualizer.image.label') }}</span>
              <VisualizerImagePicker
                :model-value="layer.imageId || null"
                @update:model-value="updateProperty(layer.id, 'imageId', $event)"
              />
            </div>

            <!-- Position X -->
            <div class="detail-row">
              <span class="detail-label">X: {{ Math.round(layer.x * 100) }}%</span>
              <SliderField
                class="detail-slider position-slider"
                :min="0"
                :max="1"
                :step="0.01"
                :default-value="0.5"
                :model-value="layer.x"
                @update:model-value="updateProperty(layer.id, 'x', $event)"
              />
            </div>

            <!-- Position Y -->
            <div class="detail-row">
              <span class="detail-label">Y: {{ Math.round(layer.y * 100) }}%</span>
              <SliderField
                class="detail-slider position-slider"
                :min="0"
                :max="1"
                :step="0.01"
                :default-value="0.5"
                :model-value="layer.y"
                @update:model-value="updateProperty(layer.id, 'y', $event)"
              />
            </div>

            <!-- Skalierung -->
            <div class="detail-row">
              <span class="detail-label"
                >{{ t('foto.size') || 'Größe' }}: {{ Math.round(layer.scale * 100) }}%</span
              >
              <SliderField
                class="detail-slider scale-slider"
                :min="0.1"
                :max="3"
                :step="0.01"
                :default-value="1"
                :model-value="layer.scale"
                @update:model-value="updateProperty(layer.id, 'scale', $event)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Info wenn keine Layer -->
      <div v-if="store.visualizerLayers.length === 0" class="no-layers">
        {{ t('visualizer.noLayers') || 'Keine Layer vorhanden' }}
      </div>

      <!-- Layer-Presets: aktuelle Layer als eigenes Preset speichern -->
      <div class="layer-presets">
        <div class="layer-presets-header">
          <span class="layer-presets-title">{{ t('visualizer.layerPresets') }}</span>
          <span class="layer-presets-count">{{ layerPresetStore.layerPresets.length }}</span>
        </div>
        <div class="save-preset-row">
          <input
            v-model="presetName"
            type="text"
            class="preset-name-input"
            :placeholder="t('visualizer.presetNamePlaceholder')"
            maxlength="40"
            @keyup.enter="saveLayerPreset"
          />
          <button
            class="add-layer-btn save-preset-btn"
            :disabled="store.visualizerLayers.length === 0"
            :title="t('visualizer.savePresetHint')"
            @click="saveLayerPreset"
          >
            {{ t('visualizer.savePreset') }}
          </button>
        </div>
        <ul v-if="layerPresetStore.layerPresets.length > 0" class="preset-list">
          <li
            v-for="preset in layerPresetStore.layerPresets"
            :key="preset.id"
            class="preset-item"
            :class="{ active: layerPresetStore.isLayerPresetActive(preset) }"
          >
            <button
              class="preset-apply-btn"
              :title="t('visualizer.applyPreset')"
              @click="applyLayerPreset(preset)"
            >
              <span class="preset-name">{{ preset.name }}</span>
              <span class="preset-layer-count">{{ preset.layers.length }}</span>
            </button>
            <button
              class="action-btn delete-btn preset-delete-btn"
              :title="t('visualizer.deletePreset')"
              @click.stop="deleteLayerPreset(preset)"
            >
              {{ t('common.delete') }}
            </button>
          </li>
        </ul>
        <div v-else class="no-layers no-presets">{{ t('visualizer.noLayerPresets') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import SliderField from './ui/SliderField.vue'
import VisualizerReactShapeControls from './visualizer-panel/VisualizerReactShapeControls.vue'
import VisualizerImagePicker from './VisualizerImagePicker.vue'
import ColorField from './ui/ColorField.vue'
import { ref, computed, nextTick } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useVisualizerStore, BLEND_MODES, REACT_SOURCES } from '../stores/visualizerStore.js'
import { useLayerPresetStore } from '../stores/layerPresetStore.js'
import { useToastStore } from '../stores/toastStore.js'
import { Visualizers } from '../lib/visualizers/index.js'

const { t, locale } = useI18n()
const store = useVisualizerStore()
const layerPresetStore = useLayerPresetStore()
const toastStore = useToastStore()

// ══════════════════ Layer-Presets ══════════════════
const presetName = ref('')

function saveLayerPreset() {
  if (store.visualizerLayers.length === 0) {
    toastStore.warning(t('visualizer.layerPresetNoLayers'))
    return
  }
  const preset = layerPresetStore.saveCurrentLayersAsPreset(presetName.value)
  if (preset) {
    presetName.value = ''
    toastStore.success(`${t('visualizer.layerPresetSaved')}: ${preset.name}`)
  }
}

function applyLayerPreset(preset) {
  layerPresetStore.applyLayerPreset(preset)
}

function deleteLayerPreset(preset) {
  if (confirm(`${t('visualizer.confirmDeletePreset')} (${preset.name})`)) {
    layerPresetStore.deleteLayerPreset(preset.id)
  }
}

// Blend modes
const blendModes = BLEND_MODES
const levelSources = REACT_SOURCES.filter((s) => !s.endsWith('Onset'))
const onsetSources = REACT_SOURCES.filter((s) => s.endsWith('Onset'))

// Auswahl für neuen Layer (Standard: aktuell ausgewählter Visualizer)
const newLayerVisualizerId = ref(store.selectedVisualizer || 'bars')

// Refs für Layer-Elemente (für Auto-Scroll)
const layerListRef = ref(null)
const layerRefs = ref({})

function setLayerRef(layerId, el) {
  if (el) {
    layerRefs.value[layerId] = el
  } else {
    delete layerRefs.value[layerId]
  }
}

// Layer auswählen und in Sicht scrollen
function layerNeedsImage(layer) {
  return !!Visualizers[layer.visualizerId]?.needsImage
}

function selectLayerAndScroll(layerId) {
  store.selectLayer(layerId)
  // Nach dem Rendern der Details in Sicht scrollen
  nextTick(() => {
    const el = layerRefs.value[layerId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })
}

// Umgekehrte Layer-Liste (oberster Layer oben in der UI)
const reversedLayers = computed(() => {
  return [...store.visualizerLayers].reverse()
})

// Kategorie-Namen (Übersetzung)
const categoryTranslationKeys = {
  'GPU-Presets': 'visualizer.categories.gpu',
  'LED-Buchstaben': 'visualizer.categories.ledLetters',
  Portrait: 'visualizer.categories.portrait',
  Klassisch: 'visualizer.categories.classic',
}

function getCategoryName(category) {
  const key = categoryTranslationKeys[category]
  return key ? t(key) : category
}

function getVisualizerName(visualizerId) {
  const viz = Visualizers[visualizerId]
  if (!viz) return visualizerId
  return locale.value === 'en'
    ? viz.name_en || viz.name_de || visualizerId
    : viz.name_de || viz.name_en || visualizerId
}

function getBlendModeName(mode) {
  return locale.value === 'en' ? mode.name_en : mode.name_de
}

function toggleMultiLayerMode() {
  store.setMultiLayerMode(!store.multiLayerMode)
}

function addNewLayer() {
  // Füge neuen Layer mit dem ausgewählten Visualizer hinzu
  const visualizerId = newLayerVisualizerId.value

  // Generiere eine harmonische Farbe basierend auf der Layer-Anzahl
  const hue = (store.visualizerLayers.length * 137.5) % 360 // Goldener Winkel für Farbverteilung

  // Konvertiere HSL zu HEX
  const hslToHex = (h, s, l) => {
    s /= 100
    l /= 100
    const a = s * Math.min(l, 1 - l)
    const f = (n) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  const hexColor = hslToHex(hue, 70, 60)
  const newLayer = store.addLayer(visualizerId, { color: hexColor })

  // Nach dem Rendern zum neuen Layer scrollen (ist oben in der Liste)
  nextTick(() => {
    const el = layerRefs.value[newLayer.id]
    // Optional-Call: jsdom (Tests) kennt scrollIntoView nicht.
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  })
}

function updateProperty(layerId, property, value) {
  store.updateLayerProperty(layerId, property, value)
}
</script>

<style scoped>
/* ═══ Layer-Presets ═══ */
.layer-presets {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}
.layer-presets-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.layer-presets-title {
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-muted, #7a8da0);
}
.layer-presets-count {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  background-color: rgba(201, 152, 77, 0.2);
  padding: 1px 5px;
  border-radius: 8px;
}
.save-preset-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.preset-name-input {
  flex: 1;
  min-width: 0;
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  padding: 6px 8px;
  font-size: 0.6rem;
}
.preset-name-input:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}
.preset-name-input::placeholder {
  color: var(--text-muted, #7a8da0);
}
.save-preset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.save-preset-btn:disabled:hover {
  background-color: var(--accent-primary, #c9984d);
}
.preset-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.preset-item {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 5px;
  background-color: var(--secondary-bg, #0e1c32);
  padding: 2px 4px 2px 0;
  transition: all 0.2s ease;
}
.preset-item:hover {
  border-color: var(--accent-primary, #c9984d);
}
.preset-item.active {
  border-color: var(--accent-primary, #c9984d);
  background-color: rgba(201, 152, 77, 0.15);
}
.preset-apply-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-primary, #e9e9eb);
  padding: 5px 8px;
  font-size: 0.6rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}
.preset-item.active .preset-apply-btn {
  color: var(--accent-tertiary, #f8e1a9);
  font-weight: 600;
}
.preset-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preset-layer-count {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  background-color: rgba(201, 152, 77, 0.2);
  padding: 1px 5px;
  border-radius: 8px;
}
.no-presets {
  padding: 8px;
}
[data-theme='light'] .layer-presets {
  border-top-color: rgba(1, 79, 153, 0.15);
}
[data-theme='light'] .preset-name-input {
  background-color: #f9f2d5;
  color: #003971;
  border-color: rgba(1, 79, 153, 0.3);
}
[data-theme='light'] .preset-item {
  background-color: #f9f2d5;
  border-color: rgba(1, 79, 153, 0.2);
}
[data-theme='light'] .preset-item.active {
  border-color: #014f99;
  background-color: rgba(1, 79, 153, 0.1);
}
[data-theme='light'] .preset-apply-btn {
  color: #003971;
}
[data-theme='light'] .preset-item.active .preset-apply-btn {
  color: #014f99;
}

.layer-panel {
  background-color: var(--card-bg, #142640);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
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

.header-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-primary, #e9e9eb);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.toggle-btn {
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.toggle-btn:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
}

.toggle-btn.active {
  background-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
  border-color: var(--accent-primary, #c9984d);
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
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  padding: 6px 8px;
  font-size: 0.6rem;
  cursor: pointer;
  min-width: 0;
}

.add-layer-select:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}

.add-layer-select optgroup {
  font-weight: 600;
  color: var(--text-muted, #7a8da0);
}

.add-layer-select option {
  background-color: var(--card-bg, #142640);
  color: var(--text-primary, #e9e9eb);
}

.add-layer-btn {
  background-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
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
  background-color: var(--accent-tertiary, #f8e1a9);
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

/* Aktiver Layer scrollt in Sicht */
.layer-item.active {
  scroll-margin: 10px;
}

.layer-item {
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 5px;
  overflow: hidden;
  /* Die Liste ist eine Flex-Spalte mit max-height. Wegen overflow: hidden
     faellt das implizite min-height: auto weg und die Karten wuerden
     zusammengedrueckt statt die Liste ueberlaufen zu lassen: die aufgeklappte
     Karte wird abgeschnitten und es erscheint kein Scrollbalken. */
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-item:hover {
  border-color: var(--accent-primary, #c9984d);
}

.layer-item.active {
  border-color: var(--accent-primary, #c9984d);
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
  background-color: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 3px;
  cursor: pointer;
  color: var(--text-muted, #7a8da0);
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  padding: 2px 5px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.visibility-btn:hover {
  border-color: var(--accent-primary, #c9984d);
  color: var(--text-primary, #e9e9eb);
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
  color: var(--text-primary, #e9e9eb);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-actions {
  display: flex;
  gap: 2px;
}

.action-btn {
  background-color: var(--card-bg, #142640);
  color: var(--text-muted, #7a8da0);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 3px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Rein per CSS gezeichnete Pfeile (kein Glyph/Emoji) */
.caret-up,
.caret-down {
  width: 5px;
  height: 5px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
}
.caret-up {
  transform: rotate(-135deg);
  margin-top: 2px;
}
.caret-down {
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.action-btn:hover:not(:disabled) {
  background-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
  border-color: var(--accent-primary, #c9984d);
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
  background-color: var(--card-bg, #142640);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.detail-label {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  font-weight: 500;
}

.detail-select {
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 0.6rem;
  cursor: pointer;
}

.detail-select:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}

.detail-color {
  width: 100%;
  height: 24px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--secondary-bg, #0e1c32);
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
  background: linear-gradient(
    to right,
    var(--secondary-bg, #0e1c32) 0%,
    var(--accent-primary, #c9984d) 100%
  );
}

.detail-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.detail-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
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
  color: var(--text-muted, #7a8da0);
  font-size: 0.65rem;
  font-style: italic;
}

/* Scrollbar Styling */
.layer-list::-webkit-scrollbar {
  width: 6px;
}

.layer-list::-webkit-scrollbar-track {
  background: var(--card-bg, #142640);
  border-radius: 3px;
}

.layer-list::-webkit-scrollbar-thumb {
  background: var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 3px;
}

.layer-list::-webkit-scrollbar-thumb:hover {
  background: var(--accent-primary, #c9984d);
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .layer-panel {
  background-color: #ffffff;
  border-color: rgba(1, 79, 153, 0.18);
}

[data-theme='light'] .header-title {
  color: #003971;
}

[data-theme='light'] .toggle-btn {
  background-color: #f9f2d5;
  color: #003971;
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .toggle-btn:hover {
  background-color: #f8e1a9;
  border-color: #014f99;
}

[data-theme='light'] .toggle-btn.active {
  background-color: #014f99;
  color: #f5f4d6;
  border-color: #014f99;
}

[data-theme='light'] .add-layer-select {
  background-color: #f9f2d5;
  color: #003971;
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .add-layer-select:focus {
  border-color: #014f99;
}

[data-theme='light'] .add-layer-select optgroup {
  color: #4d6d8e;
}

[data-theme='light'] .add-layer-select option {
  background-color: #ffffff;
  color: #003971;
}

[data-theme='light'] .add-layer-btn {
  background-color: #014f99;
  color: #f5f4d6;
}

[data-theme='light'] .add-layer-btn:hover {
  background-color: #003971;
}

[data-theme='light'] .layer-item {
  background-color: #f9f2d5;
  border-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .layer-item:hover {
  border-color: #014f99;
}

[data-theme='light'] .layer-item.active {
  border-color: #014f99;
}

[data-theme='light'] .layer-color {
  border-color: rgba(0, 0, 0, 0.2);
}

[data-theme='light'] .layer-name {
  color: #003971;
}

[data-theme='light'] .action-btn {
  background-color: #ffffff;
  color: #4d6d8e;
  border-color: rgba(1, 79, 153, 0.18);
}

[data-theme='light'] .action-btn:hover:not(:disabled) {
  background-color: #014f99;
  color: #f5f4d6;
  border-color: #014f99;
}

[data-theme='light'] .delete-btn:hover:not(:disabled) {
  background-color: #ff6b6b;
  border-color: #ff6b6b;
}

[data-theme='light'] .layer-details {
  background-color: #ffffff;
  border-top-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .detail-label {
  color: #4d6d8e;
}

[data-theme='light'] .detail-select {
  background-color: #f9f2d5;
  color: #003971;
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .detail-select:focus {
  border-color: #014f99;
}

[data-theme='light'] .detail-color {
  background-color: #f9f2d5;
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .detail-slider {
  background: linear-gradient(to right, #f9f2d5 0%, #014f99 100%);
}

[data-theme='light'] .detail-slider::-webkit-slider-thumb {
  background: #014f99;
  border-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .detail-slider::-moz-range-thumb {
  background: #014f99;
  border-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .position-slider {
  background: linear-gradient(to right, #e0e0e0 0%, #6ea8fe 50%, #e0e0e0 100%);
}

[data-theme='light'] .scale-slider {
  background: linear-gradient(to right, #e0e0e0 0%, #4caf50 50%, #8bc34a 100%);
}

[data-theme='light'] .no-layers {
  color: #4d6d8e;
}

[data-theme='light'] .layer-list::-webkit-scrollbar-track {
  background: #ffffff;
}

[data-theme='light'] .layer-list::-webkit-scrollbar-thumb {
  background: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .layer-list::-webkit-scrollbar-thumb:hover {
  background: #014f99;
}
</style>
