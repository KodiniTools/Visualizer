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
          <input
            type="color"
            :ref="ifc.borderColorInputRef"
            value="#ffffff"
            class="modern-color-input"
            @mousedown="onSliderStart"
            @change="onSliderEnd"
            @input="onBorderColorChange"
          />
          <input
            type="text"
            :ref="ifc.borderColorTextRef"
            value="#ffffff"
            class="modern-color-text"
            @change="onBorderColorTextChange"
          />
        </div>
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.borderWidth') }}</span>
          <span class="label-value" :ref="ifc.borderWidthValueRef">0px</span>
        </div>
        <input
          type="range"
          :ref="ifc.borderWidthInputRef"
          min="0"
          max="50"
          value="0"
          class="modern-slider border-slider"
          @pointerdown="onSliderStart"
          @pointerup="onSliderEnd"
          @input="onBorderWidthChange"
        />
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.borderOpacity') }}</span>
          <span class="label-value" :ref="ifc.borderOpacityValueRef">100%</span>
        </div>
        <input
          type="range"
          :ref="ifc.borderOpacityInputRef"
          min="0"
          max="100"
          value="100"
          class="modern-slider border-opacity-slider"
          @pointerdown="onSliderStart"
          @pointerup="onSliderEnd"
          @input="onBorderOpacityChange"
        />
      </div>
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
