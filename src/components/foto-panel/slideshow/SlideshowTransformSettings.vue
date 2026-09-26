<template>
  <!-- Position & Größe -->
  <div class="transform-section">
    <label class="section-label">{{ t('slideshow.positionSize') }}</label>

    <div class="transform-controls">
      <SliderControl
        v-model="transformX"
        class="transform-control"
        :label="t('slideshow.positionX')"
        :min="0"
        :max="100"
        :step="1"
        :default-value="10"
        :value-text="`${transformX}%`"
      />
      <SliderControl
        v-model="transformY"
        class="transform-control"
        :label="t('slideshow.positionY')"
        :min="0"
        :max="100"
        :step="1"
        :default-value="10"
        :value-text="`${transformY}%`"
      />
      <SliderControl
        v-model="transformWidth"
        class="transform-control"
        :label="t('slideshow.width')"
        :min="10"
        :max="100"
        :step="1"
        :default-value="80"
        :value-text="`${transformWidth}%`"
      />
      <SliderControl
        v-model="transformHeight"
        class="transform-control"
        :label="t('slideshow.height')"
        :min="10"
        :max="100"
        :step="1"
        :default-value="80"
        :value-text="`${transformHeight}%`"
      />

      <button class="btn-reset-transform" @click="resetTransform">
        {{ t('slideshow.resetPosition') }}
      </button>
    </div>
  </div>
</template>

<script setup>
/** Position und Größe der Slideshow (in Prozent des Canvas) mit Reset. */
import SliderControl from '../../ui/SliderControl.vue'
import { useI18n } from '../../../lib/i18n.js'

const TRANSFORM_DEFAULTS = Object.freeze({ x: 10, y: 10, width: 80, height: 80 })

const transformX = defineModel('transformX', { type: Number, default: 10 })
const transformY = defineModel('transformY', { type: Number, default: 10 })
const transformWidth = defineModel('transformWidth', {
  type: Number,
  default: 80,
})
const transformHeight = defineModel('transformHeight', {
  type: Number,
  default: 80,
})

const emit = defineEmits(['reset'])
const { t } = useI18n()

function resetTransform() {
  transformX.value = TRANSFORM_DEFAULTS.x
  transformY.value = TRANSFORM_DEFAULTS.y
  transformWidth.value = TRANSFORM_DEFAULTS.width
  transformHeight.value = TRANSFORM_DEFAULTS.height
  emit('reset')
}
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.transform-controls {
  display: flex;
  flex-direction: column;
}
.btn-reset-transform {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg);
  color: #e0e0e0;
}
.btn-reset-transform:hover {
  background-color: var(--secondary-bg);
  border-color: #6ea8fe;
  color: #6ea8fe;
}
[data-theme='light'] .transform-section {
  border-top-color: #d4c8a8;
}
[data-theme='light'] .btn-reset-transform {
  border-color: #d4c8a8;
  background-color: #f0ead0;
  color: #003971;
}
[data-theme='light'] .btn-reset-transform:hover {
  background-color: #e8e0c0;
  border-color: #014f99;
  color: #014f99;
}
</style>
