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
    @update:model-value="(v) => emit('update:modelValue', (v as string) || null)"
  />
</template>

<script setup lang="ts">
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
import UiSelect, { type UiSelectEntry } from '../../ui/UiSelect.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    // Beschriftung des Feldes (Pflicht für die Barrierefreiheit)
    label: string
    // Beschriftung links neben dem Feld statt darüber
    inline?: boolean
    // Beschriftung für „keine eigene Quelle“ (z. B. „Wie Einstellung“); leer = aus
    inheritLabel?: string
    disabled?: boolean
  }>(),
  { modelValue: 'bass', inline: true, inheritLabel: '', disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
const { t } = useI18n()

// „Dynamisch (Auto-Blend)“ – Text wie beim Hintergrund-Audio-Reaktiv
function labelOf(src: string): string {
  return src === 'dynamic' ? t('canvasControl.dynamic') : t(`foto.${src}`)
}

const options = computed((): UiSelectEntry[] => [
  // optional: keine eigene Quelle (Wert '' → null)
  ...(props.inheritLabel ? [{ value: '', label: props.inheritLabel }] : []),
  ...SLIDESHOW_AUDIO_SOURCE_BANDS.map((src) => ({ value: src, label: labelOf(src) })),
  {
    label: t('foto.onsetGroup'),
    options: SLIDESHOW_AUDIO_SOURCE_ONSETS.map((src) => ({ value: src, label: t(`foto.${src}`) })),
  },
])
</script>
