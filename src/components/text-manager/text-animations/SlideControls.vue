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

  <!-- Von welcher Seite -->
  <div class="control-group">
    <UiSelect
      :model-value="effect.from"
      :options="fromOptions"
      :label="t('textManager.slideFrom')"
      size="sm"
      @update:model-value="(v) => set('from', v)"
    />
  </div>

  <!-- Distanz: Prozent der Canvas-Breite bzw. -Höhe (lib/textManager/animation/slide.js) -->
  <div class="control-group">
    <label>{{ t('textManager.distance') }}: {{ effect.distance }}%</label>
    <SliderField
      :model-value="effect.distance"
      :min="10"
      :max="1000"
      :step="10"
      :default-value="100"
      class="slider"
      @update:model-value="(v) => set('distance', v)"
    />
    <div class="hint-text">{{ t('textManager.slideDistanceHint') }}</div>
  </div>

  <AnimationTimingControls :effect="effect" @change="emit('change')" />
  <AnimationLoopControls :effect="effect" @change="emit('change')" />
  <AnimationDisplayControls :effect="effect" @change="emit('change')" />
</template>

<script setup>
/** Einstellungen des Slide-Effekts (Edit-Panel und Neu-Formular). */
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
  { value: 'in', label: t('textManager.slideIn') },
  { value: 'out', label: t('textManager.slideOut') },
  { value: 'inOut', label: t('textManager.slideInOut') },
])

const fromOptions = computed(() => [
  { value: 'left', label: t('textManager.left') },
  { value: 'right', label: t('textManager.right') },
  { value: 'top', label: t('textManager.sideTop') },
  { value: 'bottom', label: t('textManager.sideBottom') },
])
</script>

<style scoped src="./text-animations-shared.css"></style>
