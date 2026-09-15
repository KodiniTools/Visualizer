<template>
  <!-- Position & Größe -->
  <div class="control-section position-section">
    <div class="section-header">
      <span class="section-label">{{ t('visualizer.positionSize') }}</span>
      <button
        class="reset-btn"
        :title="t('visualizer.resetToDefault')"
        @click="store.resetVisualizerTransform()"
      >
        {{ t('visualizer.reset') }}
      </button>
    </div>

    <!-- X-Position -->
    <div class="position-control">
      <span class="control-label">X: {{ Math.round(store.visualizerX * 100) }}%</span>
      <SliderField
        :min="0"
        :max="1"
        :step="0.01"
        :default-value="0.5"
        :model-value="store.visualizerX"
        class="slider position-slider"
        @update:model-value="store.setVisualizerX($event)"
      />
    </div>

    <!-- Y-Position -->
    <div class="position-control">
      <span class="control-label">Y: {{ Math.round(store.visualizerY * 100) }}%</span>
      <SliderField
        :min="0"
        :max="1"
        :step="0.01"
        :default-value="0.5"
        :model-value="store.visualizerY"
        class="slider position-slider"
        @update:model-value="store.setVisualizerY($event)"
      />
    </div>

    <!-- Skalierung -->
    <div class="position-control">
      <span class="control-label"
        >{{ t('foto.size') }}: {{ Math.round(store.visualizerScale * 100) }}%</span
      >
      <SliderField
        :min="0.1"
        :max="2"
        :step="0.01"
        :default-value="1"
        :model-value="store.visualizerScale"
        class="slider scale-slider"
        @update:model-value="store.setVisualizerScale($event)"
      />
    </div>
  </div>
</template>

<script setup>
import SliderField from '../ui/SliderField.vue'
import { useI18n } from '../../lib/i18n.js'
import { useVisualizerStore } from '../../stores/visualizerStore.js'

const { t } = useI18n()
const store = useVisualizerStore()
</script>

<style scoped src="./visualizerPanelShared.css"></style>
<style scoped>
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

/* ═══ Light Theme Overrides ═══ */

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
</style>
