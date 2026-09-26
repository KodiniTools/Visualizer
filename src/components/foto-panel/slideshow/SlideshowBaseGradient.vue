<template>
  <!-- Farbverlauf der Fläche unter der Slideshow (Farbe 1 = Flächenfarbe) -->
  <div class="base-gradient" :class="`${prefix}-gradient`">
    <label class="checkbox-label">
      <input
        :checked="gradient.enabled"
        :class="`${prefix}-gradient-toggle`"
        type="checkbox"
        :disabled="disabled"
        @change="update({ enabled: $event.target.checked })"
      />
      <span>{{ t('slideshow.gradient') }}</span>
    </label>
    <div v-if="gradient.enabled" class="base-gradient-options">
      <label class="base-gradient-field">
        <span>{{ t('slideshow.gradientColor2') }}</span>
        <input
          :value="gradient.color2"
          :class="`${prefix}-gradient-color2`"
          type="color"
          :disabled="disabled"
          @input="update({ color2: $event.target.value })"
        />
      </label>
      <label class="base-gradient-field">
        <span>{{ t('slideshow.gradientType') }}</span>
        <select
          :value="gradient.type"
          :class="`${prefix}-gradient-type`"
          :disabled="disabled"
          @change="update({ type: $event.target.value })"
        >
          <option value="linear">{{ t('slideshow.gradientLinear') }}</option>
          <option value="radial">{{ t('slideshow.gradientRadial') }}</option>
        </select>
      </label>
      <SliderControl
        v-if="gradient.type === 'linear'"
        class="base-gradient-slider"
        :input-class="`${prefix}-gradient-angle`"
        :label="t('slideshow.gradientAngle')"
        :model-value="gradient.angle"
        :min="0"
        :max="359"
        :step="1"
        :default-value="SLIDESHOW_GRADIENT_DEFAULT.angle"
        :disabled="disabled"
        :value-text="`${gradient.angle}°`"
        @update:model-value="(v) => update({ angle: v })"
      />

      <!-- Audio-Reaktiv: Puls + Rotation/Kreisen im Takt -->
      <label class="checkbox-label audio-toggle">
        <input
          :checked="gradient.audio.enabled"
          :class="`${prefix}-gradient-audio-toggle`"
          type="checkbox"
          :disabled="disabled"
          @change="updateAudio({ enabled: $event.target.checked })"
        />
        <span>{{ t('slideshow.gradientAudio') }}</span>
      </label>
      <template v-if="gradient.audio.enabled">
        <label class="base-gradient-field">
          <span>{{ t('slideshow.gradientAudioSource') }}</span>
          <SlideshowAudioSourceSelect
            :model-value="gradient.audio.source"
            :class="`${prefix}-gradient-audio-source`"
            :disabled="disabled"
            @update:model-value="(v) => updateAudio({ source: v })"
          />
        </label>
        <div class="base-gradient-slider">
          <SliderControl
            :input-class="`${prefix}-gradient-audio-pulse`"
            :label="t('slideshow.gradientAudioPulse')"
            :model-value="gradient.audio.pulse"
            :min="0"
            :max="100"
            :step="1"
            :default-value="SLIDESHOW_GRADIENT_DEFAULT.audio.pulse"
            :disabled="disabled"
            :value-text="`${gradient.audio.pulse} %`"
            @update:model-value="(v) => updateAudio({ pulse: v })"
          />
          <SliderControl
            :input-class="`${prefix}-gradient-audio-rotation`"
            :label="
              gradient.type === 'radial'
                ? t('slideshow.gradientAudioOrbit')
                : t('slideshow.gradientAudioRotation')
            "
            :model-value="gradient.audio.rotation"
            :min="0"
            :max="100"
            :step="1"
            :default-value="SLIDESHOW_GRADIENT_DEFAULT.audio.rotation"
            :disabled="disabled"
            :value-text="`${gradient.audio.rotation} %`"
            @update:model-value="(v) => updateAudio({ rotation: v })"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
/**
 * Einstellungen für den Farbverlauf einer Slideshow-Fläche (Canvas oder
 * Workspace). Rein darstellend: v-model liefert den bereinigten Verlauf.
 */
import { useI18n } from '../../../lib/i18n.js'
import {
  normalizeSlideshowGradient,
  SLIDESHOW_GRADIENT_DEFAULT,
} from '../../../lib/slideshowBaseColor.js'
import SliderControl from '../../ui/SliderControl.vue'
import SlideshowAudioSourceSelect from './SlideshowAudioSourceSelect.vue'

const gradient = defineModel({ type: Object, required: true })
defineProps({
  // CSS-Klassen-Präfix ('base' | 'workspace') – unterscheidet die Felder
  prefix: { type: String, default: 'base' },
  disabled: { type: Boolean, default: false },
})
const { t } = useI18n()

function update(partial) {
  gradient.value = normalizeSlideshowGradient({ ...gradient.value, ...partial }, gradient.value)
}

function updateAudio(partial) {
  update({ audio: { ...gradient.value.audio, ...partial } })
}
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.base-gradient {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.base-gradient-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding-left: 20px;
}
.base-gradient-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 11px;
}
.base-gradient-field input[type='color'] {
  width: 36px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: none;
  cursor: pointer;
}
.base-gradient-field select {
  padding: 3px 6px;
  font-size: 11px;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.audio-toggle,
.base-gradient-slider {
  flex-basis: 100%;
}
[data-theme='light'] .base-gradient-field select {
  background: #f9f2d5;
  color: #003971;
  border-color: #d4c8a8;
}
</style>
