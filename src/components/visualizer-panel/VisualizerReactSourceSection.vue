<template>
  <!-- Reaktionsquelle -->
  <div class="control-section">
    <UiSelect
      class="react-select"
      size="sm"
      :label="t('visualizer.reactSource.label')"
      :options="sourceOptions"
      :model-value="store.reactSource"
      @update:model-value="store.setReactSource($event as string)"
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

<script setup lang="ts">
import { computed } from 'vue'
import SliderField from '../ui/SliderField.vue'
import UiSelect from '../ui/UiSelect.vue'
import VisualizerReactShapeControls from './VisualizerReactShapeControls.vue'
import { useI18n } from '../../lib/i18n'
import { useVisualizerStore, REACT_SOURCES } from '../../stores/visualizerStore'
import type { ReactShape } from '../../lib/visualizers/core/reactSource'

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

const SHAPE_SETTERS: Record<keyof ReactShape, (v: unknown) => void> = {
  reactSmoothing: store.setReactSmoothing,
  reactGain: store.setReactGain,
  reactEasing: store.setReactEasing,
  reactBeatBoost: store.setReactBeatBoost,
  reactPhase: store.setReactPhase,
}

function onShapeUpdate(field: keyof ReactShape, value: unknown) {
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
