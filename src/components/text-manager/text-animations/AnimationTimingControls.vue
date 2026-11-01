<template>
  <!-- Dauer -->
  <div class="control-group">
    <label>{{ t('textManager.duration') }}: {{ effect.duration }}ms</label>
    <SliderField
      :model-value="effect.duration"
      :min="100"
      :max="20000"
      :step="100"
      :default-value="1000"
      class="slider"
      @update:model-value="(v) => set('duration', v)"
    />
    <div v-if="durationHint" class="hint-text">{{ durationHint }}</div>
  </div>

  <!-- Start-Verzögerung -->
  <div class="control-group">
    <label>{{ t('textManager.startDelay') }}: {{ effect.startDelay }}ms</label>
    <SliderField
      :model-value="effect.startDelay"
      :min="0"
      :max="20000"
      :step="100"
      :default-value="0"
      class="slider"
      @update:model-value="(v) => set('startDelay', v)"
    />
  </div>

  <!-- Easing -->
  <div class="control-group">
    <UiSelect
      :model-value="effect.easing"
      :options="easingOptions"
      :label="t('textManager.animation')"
      size="sm"
      @update:model-value="(v) => set('easing', v)"
    />
  </div>
</template>

<script setup>
/** Dauer, Start-Verzögerung und Easing einer Animation (Fade/Scale/Slide). */
import { computed } from 'vue'
import SliderField from '../../ui/SliderField.vue'
import UiSelect from '../../ui/UiSelect.vue'
import { useI18n } from '../../../lib/i18n.js'
import { useEffectField } from './useEffectField.js'

defineProps({
  durationHint: { type: String, default: '' },
})
const effect = defineModel('effect', { type: Object, required: true })
const emit = defineEmits(['change'])
const set = useEffectField(effect, emit)
const { t } = useI18n()

const easingOptions = computed(() =>
  ['linear', 'ease', 'easeIn', 'easeOut'].map((value) => ({
    value,
    label: t(`textManager.${value}`),
  })),
)
</script>

<style scoped src="./text-animations-shared.css"></style>
