<template>
  <UiSelect
    :model-value="modelValue"
    size="sm"
    inline
    :label="t('audioFx.source')"
    :options="options"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { AUDIO_FX_ONSET_SOURCES, AUDIO_FX_SOURCES } from '../../data/audioFxEffects.js'
import UiSelect from '../ui/UiSelect.vue'

defineProps({ modelValue: { type: String, required: true } })
defineEmits(['update:modelValue'])

const { t } = useI18n()

const options = computed(() => [
  ...AUDIO_FX_SOURCES.map((value) => ({ value, label: t(`beatDrop.sources.${value}`) })),
  {
    label: t('beatDrop.sources.onsetGroup'),
    options: AUDIO_FX_ONSET_SOURCES.map((value) => ({
      value,
      label: t(`beatDrop.sources.${value}`),
    })),
  },
])
</script>
