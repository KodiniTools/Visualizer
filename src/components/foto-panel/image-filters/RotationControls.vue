<template>
  <div>
    <div class="modern-section-header">
      <h4>{{ t('foto.rotation') }}</h4>
    </div>

    <div class="modern-controls-group">
      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.rotationAngle') }}</span>
          <span class="label-value">{{ Math.round(filters.rotation) }}°</span>
        </div>
        <SliderField
          :model-value="filters.rotation"
          :min="-180"
          :max="180"
          :default-value="0"
          class="modern-slider rotation-slider"
          @start="onSliderStart"
          @update:model-value="onRotationChange"
          @change="onSliderEnd"
        />
        <span class="rotation-hint">-180° ← → +180°</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import SliderField from '../../ui/SliderField.vue'
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const ifc = inject('imageFilterControls')
const { filters, onSliderStart, onSliderEnd, onRotationChange } = ifc
</script>

<style scoped src="./image-filters-shared.css"></style>
<style scoped>
.rotation-slider {
  background: linear-gradient(90deg, #f97316 0%, #6ea8fe 50%, #3b82f6 100%);
}
.rotation-hint {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  margin-top: 4px;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}
[data-theme='light'] .rotation-hint {
  color: #4d6d8e;
}
</style>
