<template>
  <UiSelect
    :model-value="modelValue"
    size="sm"
    inline
    :label="t('audioFx.source')"
    :options="options"
    @update:model-value="$emit('update:modelValue', $event as string)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../lib/i18n'
import { AUDIO_FX_ONSET_SOURCES, AUDIO_FX_SOURCES } from '../../data/audioFxEffects'
import UiSelect from '../ui/UiSelect.vue'

defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()

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
