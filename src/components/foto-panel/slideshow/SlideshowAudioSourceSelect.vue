<template>
  <!-- Audio-Quelle – gleiche Auswahl wie beim Bild-Audio-Reaktiv (inkl. Onset).
       Klasse und weitere Attribute landen über UiSelect am nativen <select>. -->
  <UiSelect
    :model-value="modelValue ?? ''"
    :options="options"
    :label="label"
    size="sm"
    :inline="inline"
    :disabled="disabled"
    @update:model-value="(v) => emit('update:modelValue', v || null)"
  />
</template>

<script setup>
/**
 * Auswahl der Audio-Quelle für die Slideshow-Fläche (Farbe, Farbverlauf, Bild).
 * Optionen und Texte wie im Bild-Audio-Reaktiv-Panel (AudioReactiveMaster).
 */
import { computed } from 'vue'
import { useI18n } from '../../../lib/i18n'
import {
  SLIDESHOW_AUDIO_SOURCE_BANDS,
  SLIDESHOW_AUDIO_SOURCE_ONSETS,
} from '../../../lib/slideshowGradientAudio'
import UiSelect from '../../ui/UiSelect.vue'

const props = defineProps({
  modelValue: { type: String, default: 'bass' },
  // Beschriftung des Feldes (Pflicht für die Barrierefreiheit)
  label: { type: String, required: true },
  // Beschriftung links neben dem Feld statt darüber
  inline: { type: Boolean, default: true },
  // Beschriftung für „keine eigene Quelle“ (z. B. „Wie Einstellung“); leer = aus
  inheritLabel: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

// „Dynamisch (Auto-Blend)“ – Text wie beim Hintergrund-Audio-Reaktiv
function labelOf(src) {
  return src === 'dynamic' ? t('canvasControl.dynamic') : t(`foto.${src}`)
}

const options = computed(() => [
  // optional: keine eigene Quelle (Wert '' → null)
  ...(props.inheritLabel ? [{ value: '', label: props.inheritLabel }] : []),
  ...SLIDESHOW_AUDIO_SOURCE_BANDS.map((src) => ({ value: src, label: labelOf(src) })),
  {
    label: t('foto.onsetGroup'),
    options: SLIDESHOW_AUDIO_SOURCE_ONSETS.map((src) => ({ value: src, label: t(`foto.${src}`) })),
  },
])
</script>
