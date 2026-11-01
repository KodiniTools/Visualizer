<template>
  <!-- Geschwindigkeit -->
  <div class="control-group">
    <label>{{ t('textManager.speed') }}: {{ effect.speed }}{{ t('textManager.msPerChar') }}</label>
    <SliderField
      :model-value="effect.speed"
      :min="10"
      :max="200"
      :default-value="50"
      class="slider"
      @update:model-value="(v) => set('speed', v)"
    />
    <div class="hint-text">{{ t('textManager.speedHint') }}</div>
  </div>

  <!-- Start-Verzögerung -->
  <div class="control-group">
    <label>{{ t('textManager.startDelay') }}: {{ effect.startDelay }}ms</label>
    <SliderField
      :model-value="effect.startDelay"
      :min="0"
      :max="3000"
      :step="100"
      :default-value="0"
      class="slider"
      @update:model-value="(v) => set('startDelay', v)"
    />
  </div>

  <AnimationLoopControls :effect="effect" :max-delay="5000" @change="emit('change')" />

  <!-- Cursor -->
  <div class="control-group">
    <UiSwitch
      :model-value="Boolean(effect.showCursor)"
      :label="t('textManager.showCursor')"
      @update:model-value="(v) => set('showCursor', v)"
    />
  </div>

  <!-- Cursor-Zeichen (nur wenn Cursor aktiv) -->
  <div v-if="effect.showCursor" class="control-group">
    <UiSelect
      :model-value="effect.cursorChar"
      :options="cursorOptions"
      :label="t('textManager.cursorChar')"
      size="sm"
      @update:model-value="(v) => set('cursorChar', v)"
    />
  </div>

  <AnimationDisplayControls :effect="effect" @change="emit('change')" />
</template>

<script setup>
/** Einstellungen des Schreibmaschinen-Effekts (Edit-Panel und Neu-Formular). */
import { computed } from 'vue'
import SliderField from '../../ui/SliderField.vue'
import UiSelect from '../../ui/UiSelect.vue'
import UiSwitch from '../../ui/UiSwitch.vue'
import AnimationLoopControls from './AnimationLoopControls.vue'
import AnimationDisplayControls from './AnimationDisplayControls.vue'
import { useI18n } from '../../../lib/i18n.js'
import { useEffectField } from './useEffectField.js'

const effect = defineModel('effect', { type: Object, required: true })
const emit = defineEmits(['change'])
const set = useEffectField(effect, emit)
const { t } = useI18n()

const cursorOptions = computed(() => [
  { value: '|', label: t('textManager.cursorLine') },
  { value: '_', label: t('textManager.cursorUnderscore') },
  { value: '▌', label: t('textManager.cursorBlock') },
  { value: '█', label: t('textManager.cursorFullBlock') },
])
</script>

<style scoped src="./text-animations-shared.css"></style>
