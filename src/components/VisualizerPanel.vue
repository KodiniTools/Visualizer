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
        :text="t('visualizer.helpText')"
        :tip="t('visualizer.helpTip')"
        position="left"
        :large="true"
      />
    </div>

    <!-- Visualizer Ein/Aus + Farbe (kompakte Zeilen) -->
    <div class="control-section status-toggle">
      <div class="inline-row">
        <span class="section-label">{{ t('visualizer.status') }}</span>
        <button
          class="switch"
          :class="{ on: store.showVisualizer }"
          type="button"
          role="switch"
          :aria-checked="store.showVisualizer"
          :title="store.showVisualizer ? t('common.on') : t('common.off')"
          @click="store.toggleVisualizer()"
        >
          <span class="switch-knob"></span>
        </button>
      </div>
    </div>

    <div class="control-section">
      <div class="inline-row">
        <span class="section-label">{{ t('visualizer.color') }}</span>
        <input
          type="color"
          :value="store.visualizerColor"
          @input="store.setColor($event.target.value)"
          class="color-swatch"
          :title="t('visualizer.color')"
        />
      </div>
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

    <!-- Position & Größe -->
    <div class="control-section position-section">
      <div class="section-header">
        <span class="section-label">{{ t('visualizer.positionSize') }}</span>
        <button
          class="reset-btn"
          @click="store.resetVisualizerTransform()"
          :title="t('visualizer.resetToDefault')"
        >
          {{ t('visualizer.reset') }}
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
        <span class="control-label"
          >{{ t('foto.size') }}: {{ Math.round(store.visualizerScale * 100) }}%</span
        >
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

    <!-- Post-Processing Effekte (Bloom / Trails / Adaptive Qualität) -->
    <VisualizerEffectsPanel />

    <!-- Multi-Layer Panel -->
    <VisualizerLayerPanel />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useVisualizerStore } from '../stores/visualizerStore.js'
import HelpTooltip from './HelpTooltip.vue'
import VisualizerLayerPanel from './VisualizerLayerPanel.vue'
import VisualizerEffectsPanel from './VisualizerEffectsPanel.vue'

const { t } = useI18n()
const store = useVisualizerStore()
const searchQuery = ref('')
const openCategories = ref({
  'Balken & Spektrum': true, // Erste Kategorie standardmäßig offen
})

// Map German category keys to i18n translation keys
const categoryTranslationKeys = {
  'Balken & Spektrum': 'visualizer.categories.barsSpectrum',
  Wellen: 'visualizer.categories.waves',
  'Kreise & Kugeln': 'visualizer.categories.circlesSpheres',
  Partikel: 'visualizer.categories.particles',
  Geometrie: 'visualizer.categories.geometry',
  Organisch: 'visualizer.categories.organic',
  'Kristalle & Netze': 'visualizer.categories.crystalsNets',
  Blüten: 'visualizer.categories.blossoms',
  '3D-Objekte': 'visualizer.categories.objects3d',
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
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return []

  return store.availableVisualizers.filter(
    (viz) => viz.name.toLowerCase().includes(query) || viz.id.toLowerCase().includes(query),
  )
})

// Gesamtanzahl der Visualizer
const totalCount = computed(() => store.availableVisualizers.length)
</script>

<style scoped>
.panel-container {
  background-color: var(--card-bg, #142640);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

h4 {
  margin: 0;
  color: var(--text-primary, #e9e9eb);
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
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
  color: var(--text-muted, #7a8da0);
  margin-bottom: 5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Kompakte Zeile: Label links, Steuerung rechts */
.inline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.inline-row .section-label {
  margin-bottom: 0;
}

/* Modern Toggle Switch (ersetzt den großen Status-Button) */
.switch {
  position: relative;
  flex-shrink: 0;
  width: 34px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background-color: var(--secondary-bg, #0e1c32);
  box-shadow: inset 0 0 0 1px var(--border-color, rgba(201, 152, 77, 0.35));
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}
.switch .switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-muted, #7a8da0);
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;
}
.switch.on {
  background-color: var(--accent-primary, #c9984d);
  box-shadow: inset 0 0 0 1px var(--accent-primary, #c9984d);
}
.switch.on .switch-knob {
  transform: translateX(16px);
  background: var(--accent-text, #091428);
}
.switch:focus-visible {
  outline: none;
  box-shadow:
    inset 0 0 0 1px var(--accent-primary, #c9984d),
    0 0 0 3px var(--ring);
}

/* Kompakter Farb-Swatch (ersetzt die große Farbleiste) */
.color-swatch {
  flex-shrink: 0;
  width: 30px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.35));
  border-radius: 5px;
  cursor: pointer;
  background-color: transparent;
  transition: border-color 0.2s ease;
}
.color-swatch:hover {
  border-color: var(--accent-primary, #c9984d);
}
.color-swatch::-webkit-color-swatch-wrapper {
  padding: 2px;
}
.color-swatch::-webkit-color-swatch {
  border: none;
  border-radius: 3px;
}
.color-swatch::-moz-color-swatch {
  border: none;
  border-radius: 3px;
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
  background: linear-gradient(
    to right,
    var(--secondary-bg, #0e1c32) 0%,
    var(--accent-primary, #c9984d) 100%
  );
}

.intensity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.intensity-slider::-webkit-slider-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.intensity-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.intensity-slider::-moz-range-thumb:hover {
  background: var(--accent-primary, #c9984d);
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
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.65rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ring);
  border-color: var(--accent-primary, #c9984d);
}

.search-input::placeholder {
  color: var(--text-muted, #7a8da0);
}

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

/* Position & Größe Styles */
.position-section {
  background-color: rgba(201, 152, 77, 0.05);
  border-radius: 5px;
  padding: 8px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
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
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-muted, #7a8da0);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  height: 22px;
  padding: 0 8px;
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-btn:hover {
  background-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
  border-color: var(--accent-primary, #c9984d);
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
  color: var(--text-muted, #7a8da0);
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

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .panel-container {
  background-color: #ffffff;
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] h4 {
  color: #003971;
}

[data-theme='light'] h4::before {
  filter: brightness(0);
}

[data-theme='light'] .section-label {
  color: #4d6d8e;
}

[data-theme='light'] .switch {
  background-color: #eef2f8;
  box-shadow: inset 0 0 0 1px rgba(1, 79, 153, 0.3);
}
[data-theme='light'] .switch .switch-knob {
  background: #7a8da0;
}
[data-theme='light'] .switch.on {
  background-color: #014f99;
  box-shadow: inset 0 0 0 1px #014f99;
}
[data-theme='light'] .switch.on .switch-knob {
  background: #ffffff;
}

[data-theme='light'] .color-swatch {
  border-color: rgba(1, 79, 153, 0.3);
}
[data-theme='light'] .color-swatch:hover {
  border-color: #014f99;
}

[data-theme='light'] .intensity-slider {
  background: linear-gradient(to right, #f9f2d5 0%, #014f99 100%);
}

[data-theme='light'] .intensity-slider::-webkit-slider-thumb {
  background: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .intensity-slider::-webkit-slider-thumb:hover {
  background: #003971;
}

[data-theme='light'] .intensity-slider::-moz-range-thumb {
  background: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .intensity-slider::-moz-range-thumb:hover {
  background: #003971;
}

[data-theme='light'] .color-slider::-webkit-slider-thumb {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .color-slider::-moz-range-thumb {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .search-input {
  background-color: #f9f2d5;
  color: #003971;
  border-color: rgba(1, 79, 153, 0.3);
}

[data-theme='light'] .search-input:focus-visible {
  border-color: #014f99;
}

[data-theme='light'] .search-input::placeholder {
  color: #4d6d8e;
}

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

[data-theme='light'] .category-arrow {
  color: #4d6d8e;
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

[data-theme='light'] .position-section {
  background-color: rgba(1, 79, 153, 0.05);
  border-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .reset-btn {
  background-color: #f9f2d5;
  color: #4d6d8e;
  border-color: rgba(1, 79, 153, 0.3);
}

[data-theme='light'] .reset-btn:hover {
  background-color: #014f99;
  color: #f5f4d6;
  border-color: #014f99;
}

[data-theme='light'] .control-label {
  color: #4d6d8e;
}

[data-theme='light'] .position-slider {
  background: linear-gradient(to right, #c9c4a8 0%, #6ea8fe 50%, #c9c4a8 100%);
}

[data-theme='light'] .position-slider::-webkit-slider-thumb {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .position-slider::-moz-range-thumb {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .scale-slider {
  background: linear-gradient(to right, #c9c4a8 0%, #4caf50 50%, #8bc34a 100%);
}

[data-theme='light'] .scale-slider::-webkit-slider-thumb {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .scale-slider::-moz-range-thumb {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .disabled-overlay {
  background: rgba(255, 255, 255, 0.3);
}

[data-theme='light'] .disabled-text {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .color-swatch {
    width: 34px;
    height: 26px;
  }
}
</style>
