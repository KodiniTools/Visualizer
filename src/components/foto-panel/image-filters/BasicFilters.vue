<template>
  <div>
    <!-- Helligkeit -->
    <div class="control-group slider">
      <label>{{ t('foto.brightness') }}</label>
      <SliderField
        :model-value="filters.brightness"
        :min="0"
        :max="200"
        :default-value="100"
        @start="onSliderStart"
        @update:model-value="onBrightnessChange"
        @change="onSliderEnd"
      />
      <span>{{ filters.brightness }}%</span>
    </div>

    <!-- Kontrast -->
    <div class="control-group slider">
      <label>{{ t('foto.contrast') }}</label>
      <SliderField
        :model-value="filters.contrast"
        :min="0"
        :max="200"
        :default-value="100"
        @start="onSliderStart"
        @update:model-value="onContrastChange"
        @change="onSliderEnd"
      />
      <span>{{ filters.contrast }}%</span>
    </div>

    <!-- Sättigung -->
    <div class="control-group slider">
      <label>{{ t('foto.saturation') }}</label>
      <SliderField
        :model-value="filters.saturation"
        :min="0"
        :max="200"
        :default-value="100"
        @start="onSliderStart"
        @update:model-value="onSaturationChange"
        @change="onSliderEnd"
      />
      <span>{{ filters.saturation }}%</span>
    </div>

    <!-- Deckkraft -->
    <div class="control-group slider">
      <label>{{ t('foto.opacity') }}</label>
      <SliderField
        :model-value="filters.opacity"
        :min="0"
        :max="100"
        :default-value="100"
        @start="onSliderStart"
        @update:model-value="onOpacityChange"
        @change="onSliderEnd"
      />
      <span>{{ filters.opacity }}%</span>
    </div>

    <!-- Unschärfe -->
    <div class="control-group slider">
      <label>{{ t('foto.blur') }}</label>
      <SliderField
        :model-value="filters.blur"
        :min="0"
        :max="20"
        :default-value="0"
        @start="onSliderStart"
        @update:model-value="onBlurChange"
        @change="onSliderEnd"
      />
      <span>{{ filters.blur }}px</span>
    </div>

    <!-- Farbton -->
    <div class="control-group slider">
      <label>{{ t('foto.hue') }}</label>
      <SliderField
        :model-value="filters.hueRotate"
        :min="-180"
        :max="180"
        :default-value="0"
        @start="onSliderStart"
        @update:model-value="onHueRotateChange"
        @change="onSliderEnd"
      />
      <span>{{ filters.hueRotate }}°</span>
    </div>
  </div>
</template>

<script setup>
import SliderField from '../../ui/SliderField.vue'
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const ifc = inject('imageFilterControls')
const {
  filters,
  onSliderStart,
  onSliderEnd,
  onBrightnessChange,
  onContrastChange,
  onSaturationChange,
  onOpacityChange,
  onBlurChange,
  onHueRotateChange,
} = ifc
</script>

<style scoped src="./image-filters-shared.css"></style>
