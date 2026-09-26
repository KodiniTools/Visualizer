<template>
  <!-- Audio-Reaktive Flächenfarbe (einfarbig und Farbverlauf) -->
  <div class="fill-audio" :class="`${prefix}-fill-audio`">
    <label class="checkbox-label">
      <input
        :checked="audio.enabled"
        :class="`${prefix}-fill-audio-toggle`"
        type="checkbox"
        :disabled="disabled"
        @change="update({ enabled: $event.target.checked })"
      />
      <span>{{ t('slideshow.fillAudio') }}</span>
    </label>
    <div v-if="audio.enabled" class="fill-audio-options">
      <label class="fill-audio-field">
        <span>{{ t('slideshow.gradientAudioSource') }}</span>
        <SlideshowAudioSourceSelect
          :model-value="audio.source"
          :class="`${prefix}-fill-audio-source`"
          :disabled="disabled"
          @update:model-value="(v) => update({ source: v })"
        />
      </label>
      <div class="fill-audio-slider">
        <SliderControl
          :input-class="`${prefix}-fill-audio-brightness`"
          :label="t('slideshow.fillAudioBrightness')"
          :model-value="audio.brightness"
          :min="0"
          :max="100"
          :step="1"
          :default-value="SLIDESHOW_FILL_AUDIO_DEFAULT.brightness"
          :disabled="disabled"
          :value-text="`${audio.brightness} %`"
          @update:model-value="(v) => update({ brightness: v })"
        />
        <SliderControl
          :input-class="`${prefix}-fill-audio-hue`"
          :label="t('slideshow.fillAudioHue')"
          :model-value="audio.hue"
          :min="0"
          :max="100"
          :step="1"
          :default-value="SLIDESHOW_FILL_AUDIO_DEFAULT.hue"
          :disabled="disabled"
          :value-text="`${audio.hue} %`"
          @update:model-value="(v) => update({ hue: v })"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Audio-Reaktiv für die Farbe einer Slideshow-Fläche (Canvas oder Workspace).
 * Rein darstellend: v-model liefert die bereinigte Einstellung.
 */
import { useI18n } from '../../../lib/i18n.js'
import {
  normalizeSlideshowFillAudio,
  SLIDESHOW_FILL_AUDIO_DEFAULT,
} from '../../../lib/slideshowFillAudio.js'
import SliderControl from '../../ui/SliderControl.vue'
import SlideshowAudioSourceSelect from './SlideshowAudioSourceSelect.vue'

const audio = defineModel({ type: Object, required: true })
defineProps({
  // CSS-Klassen-Präfix ('base' | 'workspace') – unterscheidet die Felder
  prefix: { type: String, default: 'base' },
  disabled: { type: Boolean, default: false },
})
const { t } = useI18n()

function update(partial) {
  audio.value = normalizeSlideshowFillAudio({ ...audio.value, ...partial }, audio.value)
}
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.fill-audio {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.fill-audio-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding-left: 20px;
}
.fill-audio-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 11px;
}
.fill-audio-slider {
  flex-basis: 100%;
}
.fill-audio-field select {
  padding: 3px 6px;
  font-size: 11px;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
[data-theme='light'] .fill-audio-field select {
  background: #f9f2d5;
  color: #003971;
  border-color: #d4c8a8;
}
</style>
