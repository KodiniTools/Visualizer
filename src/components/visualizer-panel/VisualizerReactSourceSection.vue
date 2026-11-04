<template>
  <!-- Reaktionsquelle -->
  <div class="control-section">
    <UiSelect
      class="react-select"
      size="sm"
      :label="t('visualizer.reactSource.label')"
      :options="sourceOptions"
      :model-value="store.reactSource"
      @update:model-value="store.setReactSource($event)"
    />
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
import { computed } from 'vue'
import SliderField from '../ui/SliderField.vue'
import UiSelect from '../ui/UiSelect.vue'
import VisualizerReactShapeControls from './VisualizerReactShapeControls.vue'
import { useI18n } from '../../lib/i18n.js'
import { useVisualizerStore, REACT_SOURCES } from '../../stores/visualizerStore.js'

const { t } = useI18n()
const store = useVisualizerStore()
const levelSources = REACT_SOURCES.filter((s) => !s.endsWith('Onset'))
const onsetSources = REACT_SOURCES.filter((s) => s.endsWith('Onset'))
const sourceOptions = computed(() => [
  ...levelSources.map((value) => ({ value, label: t(`visualizer.reactSource.${value}`) })),
  {
    label: t('visualizer.reactSource.onsetGroup'),
    options: onsetSources.map((value) => ({
      value,
      label: t(`visualizer.reactSource.${value}`),
    })),
  },
])

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
<style scoped src="../ui/slider-control.css"></style>
<style scoped>
.control-section > :deep(.ui-select) {
  margin-bottom: 8px;
}

.react-hint {
  display: block;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-top: 4px;
  line-height: 1.3;
}
</style>
