<template>
  <!-- Audio-Quelle – gleiche Auswahl wie beim Bild-Audio-Reaktiv (inkl. Onset) -->
  <select
    :value="modelValue"
    :disabled="disabled"
    @change="emit('update:modelValue', $event.target.value)"
  >
    <option v-for="src in bands" :key="src" :value="src">{{ labelOf(src) }}</option>
    <optgroup :label="t('foto.onsetGroup')">
      <option v-for="src in onsets" :key="src" :value="src">{{ t(`foto.${src}`) }}</option>
    </optgroup>
  </select>
</template>

<script setup>
/**
 * Auswahl der Audio-Quelle für die Slideshow-Fläche (Farbe, Farbverlauf, Bild).
 * Optionen und Texte wie im Bild-Audio-Reaktiv-Panel (AudioReactiveMaster).
 */
import { useI18n } from '../../../lib/i18n.js'
import {
  SLIDESHOW_AUDIO_SOURCE_BANDS,
  SLIDESHOW_AUDIO_SOURCE_ONSETS,
} from '../../../lib/slideshowGradientAudio.js'

defineProps({
  modelValue: { type: String, default: 'bass' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const bands = SLIDESHOW_AUDIO_SOURCE_BANDS
const onsets = SLIDESHOW_AUDIO_SOURCE_ONSETS

// „Dynamisch (Auto-Blend)“ – Text wie beim Hintergrund-Audio-Reaktiv
function labelOf(src) {
  return src === 'dynamic' ? t('canvasControl.dynamic') : t(`foto.${src}`)
}
</script>
