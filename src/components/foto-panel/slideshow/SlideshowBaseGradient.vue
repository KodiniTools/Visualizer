<template>
  <!-- Farbverlauf der Fläche unter der Slideshow (Farbe 1 = Flächenfarbe) -->
  <div class="base-gradient" :class="`${prefix}-gradient`">
    <UiSwitch
      :model-value="gradient.enabled"
      :class="`${prefix}-gradient-toggle`"
      :label="t('slideshow.gradient')"
      :disabled="disabled"
      @update:model-value="(v) => update({ enabled: v })"
    />
    <div v-if="gradient.enabled" class="base-gradient-options">
      <div class="base-gradient-field">
        <span aria-hidden="true">{{ t('slideshow.gradientColor2') }}</span>
        <ColorField
          :model-value="gradient.color2"
          :class="`${prefix}-gradient-color2`"
          :label="t('slideshow.gradientColor2')"
          :disabled="disabled"
          @update:model-value="(v) => update({ color2: v })"
        />
      </div>
      <UiSelect
        :model-value="gradient.type"
        :class="`${prefix}-gradient-type`"
        size="sm"
        inline
        :label="t('slideshow.gradientType')"
        :options="typeOptions"
        :disabled="disabled"
        @update:model-value="(v) => update({ type: v })"
      />
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
      <UiSwitch
        :model-value="gradient.audio.enabled"
        class="audio-toggle"
        :class="`${prefix}-gradient-audio-toggle`"
        :label="t('slideshow.gradientAudio')"
        :disabled="disabled"
        @update:model-value="(v) => updateAudio({ enabled: v })"
      />
      <template v-if="gradient.audio.enabled">
        <SlideshowAudioSourceSelect
          :label="t('slideshow.gradientAudioSource')"
          :model-value="gradient.audio.source"
          :class="`${prefix}-gradient-audio-source`"
          :disabled="disabled"
          @update:model-value="(v) => updateAudio({ source: v })"
        />
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
import { computed } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import {
  normalizeSlideshowGradient,
  SLIDESHOW_GRADIENT_DEFAULT,
} from '../../../lib/slideshowBaseColor.js'
import ColorField from '../../ui/ColorField.vue'
import SliderControl from '../../ui/SliderControl.vue'
import UiSelect from '../../ui/UiSelect.vue'
import UiSwitch from '../../ui/UiSwitch.vue'
import SlideshowAudioSourceSelect from './SlideshowAudioSourceSelect.vue'

const gradient = defineModel({ type: Object, required: true })
defineProps({
  // CSS-Klassen-Präfix ('base' | 'workspace') – unterscheidet die Felder
  prefix: { type: String, default: 'base' },
  disabled: { type: Boolean, default: false },
})
const { t } = useI18n()

const typeOptions = computed(() => [
  { value: 'linear', label: t('slideshow.gradientLinear') },
  { value: 'radial', label: t('slideshow.gradientRadial') },
])

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
  font-size: var(--ds-text-xs);
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
  font-size: var(--ds-text-xs);
}
.audio-toggle,
.base-gradient-slider {
  flex-basis: 100%;
}
</style>
