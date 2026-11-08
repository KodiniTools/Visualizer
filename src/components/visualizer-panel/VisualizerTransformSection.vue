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
import { useVisualizerStore } from '../../stores/visualizerStore'

const { t } = useI18n()
const store = useVisualizerStore()
</script>

<style scoped src="./visualizerPanelShared.css"></style>
<style scoped src="../ui/slider-control.css"></style>
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
/* Scale Slider */
/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .position-section {
  background-color: color-mix(in srgb, var(--accent-primary) 5%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .reset-btn {
  border-color: var(--border-color);
}
</style>
