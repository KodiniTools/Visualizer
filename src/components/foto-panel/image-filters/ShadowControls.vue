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
          <input
            type="color"
            :ref="ifc.shadowColorInputRef"
            value="#000000"
            class="modern-color-input"
            @mousedown="onSliderStart"
            @change="onSliderEnd"
            @input="onShadowColorChange"
          />
          <input
            type="text"
            :ref="ifc.shadowColorTextRef"
            value="#000000"
            class="modern-color-text"
            @change="onShadowColorTextChange"
          />
        </div>
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowBlur') }}</span>
          <span class="label-value" :ref="ifc.shadowBlurValueRef">0px</span>
        </div>
        <input
          type="range"
          :ref="ifc.shadowBlurInputRef"
          min="0"
          max="50"
          value="0"
          class="modern-slider shadow-slider"
          @pointerdown="onSliderStart"
          @pointerup="onSliderEnd"
          @input="onShadowBlurChange"
        />
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowOffsetX') }}</span>
          <span class="label-value" :ref="ifc.shadowOffsetXValueRef">0px</span>
        </div>
        <input
          type="range"
          :ref="ifc.shadowOffsetXInputRef"
          min="-50"
          max="50"
          value="0"
          class="modern-slider shadow-slider"
          @pointerdown="onSliderStart"
          @pointerup="onSliderEnd"
          @input="onShadowOffsetXChange"
        />
      </div>

      <div class="modern-control">
        <div class="modern-label">
          <span class="label-text">{{ t('foto.shadowOffsetY') }}</span>
          <span class="label-value" :ref="ifc.shadowOffsetYValueRef">0px</span>
        </div>
        <input
          type="range"
          :ref="ifc.shadowOffsetYInputRef"
          min="-50"
          max="50"
          value="0"
          class="modern-slider shadow-slider"
          @pointerdown="onSliderStart"
          @pointerup="onSliderEnd"
          @input="onShadowOffsetYChange"
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
