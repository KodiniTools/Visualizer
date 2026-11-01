<template>
  <!-- Loop -->
  <div class="control-group">
    <UiSwitch
      :model-value="Boolean(effect.loop)"
      :label="t('textManager.loop')"
      @update:model-value="(v) => set('loop', v)"
    />
  </div>

  <!-- Loop-Verzögerung (nur wenn Loop aktiv) -->
  <div v-if="effect.loop" class="control-group">
    <label>{{ t('textManager.loopDelay') }}: {{ effect.loopDelay }}ms</label>
    <SliderField
      :model-value="effect.loopDelay"
      :min="0"
      :max="maxDelay"
      :step="100"
      :default-value="1000"
      class="slider"
      @update:model-value="(v) => set('loopDelay', v)"
    />
  </div>
</template>

<script setup>
/** Wiederholung (Loop) + Pause zwischen den Wiederholungen. */
import SliderField from '../../ui/SliderField.vue'
import UiSwitch from '../../ui/UiSwitch.vue'
import { useI18n } from '../../../lib/i18n.js'
import { useEffectField } from './useEffectField.js'

defineProps({
  maxDelay: { type: Number, default: 20000 },
})
const effect = defineModel('effect', { type: Object, required: true })
const emit = defineEmits(['change'])
const set = useEffectField(effect, emit)
const { t } = useI18n()
</script>

<style scoped src="./text-animations-shared.css"></style>
