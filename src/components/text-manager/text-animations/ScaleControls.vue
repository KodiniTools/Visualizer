<template>
  <!-- Richtung -->
  <div class="control-group">
    <UiSelect
      :model-value="effect.direction"
      :options="directionOptions"
      :label="t('textManager.direction')"
      size="sm"
      @update:model-value="(v) => set('direction', v)"
    />
  </div>

  <!-- Start-Skalierung -->
  <div class="control-group">
    <label>{{ t('textManager.startSize') }}: {{ Math.round(effect.startScale * 100) }}%</label>
    <SliderField
      :model-value="effect.startScale"
      :min="0"
      :max="3"
      :step="0.1"
      :default-value="0"
      class="slider"
      @update:model-value="(v) => set('startScale', v)"
    />
    <div class="hint-text">{{ t('textManager.sizeHint') }}</div>
  </div>

  <!-- End-Skalierung -->
  <div class="control-group">
    <label>{{ t('textManager.endSize') }}: {{ Math.round(effect.endScale * 100) }}%</label>
    <SliderField
      :model-value="effect.endScale"
      :min="0"
      :max="3"
      :step="0.1"
      :default-value="1"
      class="slider"
      @update:model-value="(v) => set('endScale', v)"
    />
  </div>

  <AnimationTimingControls :effect="effect" @change="emit('change')" />
  <AnimationLoopControls :effect="effect" @change="emit('change')" />
  <AnimationDisplayControls :effect="effect" @change="emit('change')" />
</template>

<script setup>
/** Einstellungen des Scale-Effekts (Edit-Panel und Neu-Formular). */
import { computed } from 'vue'
import SliderField from '../../ui/SliderField.vue'
import UiSelect from '../../ui/UiSelect.vue'
import AnimationTimingControls from './AnimationTimingControls.vue'
import AnimationLoopControls from './AnimationLoopControls.vue'
import AnimationDisplayControls from './AnimationDisplayControls.vue'
import { useI18n } from '../../../lib/i18n.js'
import { useEffectField } from './useEffectField.js'

const effect = defineModel('effect', { type: Object, required: true })
const emit = defineEmits(['change'])
const set = useEffectField(effect, emit)
const { t } = useI18n()

const directionOptions = computed(() => [
  { value: 'in', label: t('textManager.zoomIn') },
  { value: 'out', label: t('textManager.zoomOut') },
  { value: 'inOut', label: t('textManager.zoomInOut') },
])
</script>

<style scoped src="./text-animations-shared.css"></style>
