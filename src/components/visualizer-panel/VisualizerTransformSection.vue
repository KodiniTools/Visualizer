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
  background-color: var(--ds-accent-soft);
  border-radius: var(--ds-radius-sm);
  padding: 8px;
  border: 1px solid var(--border-color);
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
  background-color: var(--secondary-bg);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  height: 22px;
  padding: 0 8px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-btn:hover {
  background-color: var(--accent-primary);
  color: var(--accent-text);
  border-color: var(--accent-primary);
}

.position-control {
  margin-bottom: 6px;
}

.position-control:last-child {
  margin-bottom: 0;
}

.control-label {
  display: block;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-bottom: 3px;
  font-weight: var(--ds-weight-medium);
}

/* Position Slider */
.position-slider {
  background: var(--ds-surface-3);
}

.position-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-warning);
  cursor: pointer;
  border: 2px solid var(--ds-surface-1);
  transition: all var(--ds-duration) var(--ds-ease);
}

.position-slider::-webkit-slider-thumb:hover {
  background: var(--ds-warning);
}

.position-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-warning);
  cursor: pointer;
  border: 2px solid var(--ds-surface-1);
  transition: all var(--ds-duration) var(--ds-ease);
}

.position-slider::-moz-range-thumb:hover {
  background: var(--ds-warning);
}

/* Scale Slider */
.scale-slider {
  background: var(--ds-surface-3);
}

.scale-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-success);
  cursor: pointer;
  border: 2px solid var(--ds-surface-1);
  transition: all var(--ds-duration) var(--ds-ease);
}

.scale-slider::-webkit-slider-thumb:hover {
  background: var(--ds-success);
}

.scale-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-success);
  cursor: pointer;
  border: 2px solid var(--ds-surface-1);
  transition: all var(--ds-duration) var(--ds-ease);
}

.scale-slider::-moz-range-thumb:hover {
  background: var(--ds-success);
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .position-section {
  background-color: color-mix(in srgb, var(--accent-primary) 5%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .reset-btn {
  border-color: var(--border-color);
}
</style>
