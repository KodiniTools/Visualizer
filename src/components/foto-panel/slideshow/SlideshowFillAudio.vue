<template>
  <!-- Audio-Reaktive Flächenfarbe (einfarbig und Farbverlauf) -->
  <div class="fill-audio" :class="`${prefix}-fill-audio`">
    <UiSwitch
      :model-value="audio.enabled"
      :class="`${prefix}-fill-audio-toggle`"
      :label="t('slideshow.fillAudio')"
      :disabled="disabled"
      @update:model-value="(v) => update({ enabled: v })"
    />
    <div v-if="audio.enabled" class="fill-audio-options">
      <SlideshowAudioSourceSelect
        :label="t('slideshow.gradientAudioSource')"
        :model-value="audio.source"
        :class="`${prefix}-fill-audio-source`"
        :disabled="disabled"
        @update:model-value="(v) => update({ source: v })"
      />
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
import UiSwitch from '../../ui/UiSwitch.vue'
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
  font-size: var(--ds-text-xs);
}
.fill-audio-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding-left: 20px;
}
.fill-audio-slider {
  flex-basis: 100%;
}
</style>
