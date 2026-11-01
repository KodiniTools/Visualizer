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

  <AnimationTimingControls
    :effect="effect"
    :duration-hint="t('textManager.fadeDurationHint')"
    @change="emit('change')"
  />
  <AnimationLoopControls :effect="effect" @change="emit('change')" />
  <AnimationDisplayControls :effect="effect" @change="emit('change')" />
</template>

<script setup>
/** Einstellungen des Fade-Effekts (Edit-Panel und Neu-Formular). */
import { computed } from 'vue'
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
  { value: 'in', label: t('textManager.fadeIn') },
  { value: 'out', label: t('textManager.fadeOut') },
  { value: 'inOut', label: t('textManager.fadeInOut') },
])
</script>

<style scoped src="./text-animations-shared.css"></style>
