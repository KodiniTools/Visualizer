<template>
  <div>
    <div class="modern-section-header">
      <h4>{{ t('foto.shadow') }}</h4>
    </div>

    <div class="modern-controls-group">
      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowColor') }}</span>
        </div>
        <div class="modern-color-picker">
          <ColorField
            :model-value="shadowColor"
            class="modern-color-input"
            :label="t('foto.shadowColor')"
            @start="onSliderStart"
            @update:model-value="onShadowColorChange"
            @change="onSliderEnd"
          />
          <input
            type="text"
            :value="shadowColor"
            class="modern-color-text"
            @change="onShadowColorTextChange"
          />
        </div>
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowBlur') }}</span>
          <span class="label-value">{{ filters.shadowBlur }}px</span>
        </div>
        <SliderField
          :model-value="filters.shadowBlur"
          :min="0"
          :max="50"
          :default-value="0"
          class="modern-slider shadow-slider"
          @start="onSliderStart"
          @update:model-value="onShadowBlurChange"
          @change="onSliderEnd"
        />
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowOffsetX') }}</span>
          <span class="label-value">{{ filters.shadowOffsetX }}px</span>
        </div>
        <SliderField
          :model-value="filters.shadowOffsetX"
          :min="-50"
          :max="50"
          :default-value="0"
          class="modern-slider shadow-slider"
          @start="onSliderStart"
          @update:model-value="onShadowOffsetXChange"
          @change="onSliderEnd"
        />
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowOffsetY') }}</span>
          <span class="label-value">{{ filters.shadowOffsetY }}px</span>
        </div>
        <SliderField
          :model-value="filters.shadowOffsetY"
          :min="-50"
          :max="50"
          :default-value="0"
          class="modern-slider shadow-slider"
          @start="onSliderStart"
          @update:model-value="onShadowOffsetYChange"
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
  shadowColor,
  onSliderStart,
  onSliderEnd,
  onShadowColorChange,
  onShadowColorTextChange,
  onShadowBlurChange,
  onShadowOffsetXChange,
  onShadowOffsetYChange,
} = ifc
</script>

<style scoped src="./image-filters-shared.css"></style>
<style scoped>
.shadow-slider {
  background: linear-gradient(90deg, var(--primary-bg) 0%, #6ea8fe 50%, #a78bfa 100%);
}
[data-theme='light'] .shadow-slider {
  background: linear-gradient(90deg, #f9f2d5 0%, #014f99 50%, #6a5acd 100%);
}
</style>
