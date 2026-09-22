<template>
  <!-- Reaktionsquelle -->
  <div class="control-section">
    <span class="section-label">{{ t('visualizer.reactSource.label') }}</span>
    <select
      class="react-select"
      :value="store.reactSource"
      @change="store.setReactSource($event.target.value)"
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
    <template v-if="store.reactSource !== 'spectrum'">
      <span class="section-label">
        {{ t('visualizer.reactSource.strength') }}: {{ store.reactStrength }}%
      </span>
      <SliderField
        :min="0"
        :max="100"
        :step="1"
        :default-value="70"
        :model-value="store.reactStrength"
        class="slider react-slider"
        @update:model-value="store.setReactStrength($event)"
      />
      <span class="react-hint">{{ t('visualizer.reactSource.hint') }}</span>
      <VisualizerReactShapeControls :settings="store" @update="onShapeUpdate" />
    </template>
  </div>
</template>

<script setup>
import SliderField from '../ui/SliderField.vue'
import VisualizerReactShapeControls from './VisualizerReactShapeControls.vue'
import { useI18n } from '../../lib/i18n.js'
import { useVisualizerStore, REACT_SOURCES } from '../../stores/visualizerStore.js'

const { t } = useI18n()
const store = useVisualizerStore()
const levelSources = REACT_SOURCES.filter((s) => !s.endsWith('Onset'))
const onsetSources = REACT_SOURCES.filter((s) => s.endsWith('Onset'))

const SHAPE_SETTERS = {
  reactSmoothing: store.setReactSmoothing,
  reactGain: store.setReactGain,
  reactEasing: store.setReactEasing,
  reactBeatBoost: store.setReactBeatBoost,
  reactPhase: store.setReactPhase,
}

function onShapeUpdate(field, value) {
  SHAPE_SETTERS[field]?.(value)
}
</script>

<style scoped src="./visualizerPanelShared.css"></style>
<style scoped>
.react-select {
  width: 100%;
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 0.65rem;
  cursor: pointer;
  margin-bottom: 8px;
}

.react-select:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}

.react-hint {
  display: block;
  font-size: 0.58rem;
  color: var(--text-muted, #7a8da0);
  margin-top: 4px;
  line-height: 1.3;
}
</style>
