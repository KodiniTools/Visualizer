<template>
  <div>
    <!-- Helligkeit -->
    <div class="control-group slider">
      <label>{{ t('foto.brightness') }}</label>
      <input
        type="range"
        :ref="ifc.brightnessInputRef"
        min="0"
        max="200"
        value="100"
        @pointerdown="onSliderStart"
        @pointerup="onSliderEnd"
        @input="onBrightnessChange"
      />
      <span :ref="ifc.brightnessValueRef">100%</span>
    </div>

    <!-- Kontrast -->
    <div class="control-group slider">
      <label>{{ t('foto.contrast') }}</label>
      <input
        type="range"
        :ref="ifc.contrastInputRef"
        min="0"
        max="200"
        value="100"
        @pointerdown="onSliderStart"
        @pointerup="onSliderEnd"
        @input="onContrastChange"
      />
      <span :ref="ifc.contrastValueRef">100%</span>
    </div>

    <!-- Sättigung -->
    <div class="control-group slider">
      <label>{{ t('foto.saturation') }}</label>
      <input
        type="range"
        :ref="ifc.saturationInputRef"
        min="0"
        max="200"
        value="100"
        @pointerdown="onSliderStart"
        @pointerup="onSliderEnd"
        @input="onSaturationChange"
      />
      <span :ref="ifc.saturationValueRef">100%</span>
    </div>

    <!-- Deckkraft -->
    <div class="control-group slider">
      <label>{{ t('foto.opacity') }}</label>
      <input
        type="range"
        :ref="ifc.opacityInputRef"
        min="0"
        max="100"
        value="100"
        @pointerdown="onSliderStart"
        @pointerup="onSliderEnd"
        @input="onOpacityChange"
      />
      <span :ref="ifc.opacityValueRef">100%</span>
    </div>

    <!-- Unschärfe -->
    <div class="control-group slider">
      <label>{{ t('foto.blur') }}</label>
      <input
        type="range"
        :ref="ifc.blurInputRef"
        min="0"
        max="20"
        value="0"
        @pointerdown="onSliderStart"
        @pointerup="onSliderEnd"
        @input="onBlurChange"
      />
      <span :ref="ifc.blurValueRef">0px</span>
    </div>

    <!-- Farbton -->
    <div class="control-group slider">
      <label>{{ t('foto.hue') }}</label>
      <input
        type="range"
        :ref="ifc.hueRotateInputRef"
        min="-180"
        max="180"
        value="0"
        @pointerdown="onSliderStart"
        @pointerup="onSliderEnd"
        @input="onHueRotateChange"
      />
      <span :ref="ifc.hueRotateValueRef">0°</span>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const ifc = inject('imageFilterControls')
const {
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
