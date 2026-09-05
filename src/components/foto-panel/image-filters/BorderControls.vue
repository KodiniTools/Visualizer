<template>
  <div>
    <div class="modern-section-header">
      <h4>{{ t('foto.border') }}</h4>
    </div>

    <div class="modern-controls-group">
      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.borderColor') }}</span>
        </div>
        <div class="modern-color-picker">
          <ColorField
            :model-value="borderColor"
            class="modern-color-input"
            :label="t('foto.borderColor')"
            @start="onSliderStart"
            @update:model-value="onBorderColorChange"
            @change="onSliderEnd"
          />
          <input
            type="text"
            :value="borderColor"
            class="modern-color-text"
            @change="onBorderColorTextChange"
          />
        </div>
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.borderWidth') }}</span>
          <span class="label-value">{{ filters.borderWidth }}px</span>
        </div>
        <SliderField
          :model-value="filters.borderWidth"
          :min="0"
          :max="50"
          :default-value="0"
          class="modern-slider border-slider"
          @start="onSliderStart"
          @update:model-value="onBorderWidthChange"
          @change="onSliderEnd"
        />
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.borderOpacity') }}</span>
          <span class="label-value">{{ filters.borderOpacity }}%</span>
        </div>
        <SliderField
          :model-value="filters.borderOpacity"
          :min="0"
          :max="100"
          :default-value="100"
          class="modern-slider border-opacity-slider"
          @start="onSliderStart"
          @update:model-value="onBorderOpacityChange"
          @change="onSliderEnd"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import SliderField from '../../ui/SliderField.vue'
import ColorField from '../../ui/ColorField.vue'
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const ifc = inject('imageFilterControls')
const {
  filters,
  borderColor,
  onSliderStart,
  onSliderEnd,
  onBorderColorChange,
  onBorderColorTextChange,
  onBorderWidthChange,
  onBorderOpacityChange,
} = ifc
</script>

<style scoped src="./image-filters-shared.css"></style>
<style scoped>
.border-slider {
  background: linear-gradient(90deg, var(--primary-bg) 0%, #ffffff 50%, #6ea8fe 100%);
}
.border-opacity-slider {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.5) 50%,
    #ffffff 100%
  );
}
[data-theme='light'] .border-slider {
  background: linear-gradient(90deg, #f9f2d5 0%, #003971 50%, #014f99 100%);
}
[data-theme='light'] .border-opacity-slider {
  background: linear-gradient(
    90deg,
    rgba(0, 57, 113, 0.1) 0%,
    rgba(0, 57, 113, 0.4) 50%,
    #003971 100%
  );
}
</style>
