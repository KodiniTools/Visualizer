<template>
  <!-- Permanent anzeigen -->
  <div class="control-group">
    <UiSwitch
      :model-value="Boolean(effect.permanent)"
      :label="t('textManager.permanentDisplay')"
      @update:model-value="(v) => set('permanent', v)"
    />
    <div class="hint-text">{{ t('textManager.permanentDisplayHint') }}</div>
  </div>

  <!-- Anzeigedauer (nur wenn nicht permanent) -->
  <div v-if="!effect.permanent" class="control-group">
    <label>{{ t('textManager.displayDuration') }}: {{ effect.displayDuration }}ms</label>
    <div class="dur-row">
      <SliderField
        :model-value="effect.displayDuration"
        :min="500"
        :max="30000"
        :step="100"
        :default-value="5000"
        class="slider"
        @update:model-value="(v) => set('displayDuration', v)"
      />
    </div>
    <div class="hint-text">{{ t('textManager.displayDurationHint') }}</div>
  </div>
</template>

<script setup>
/** Permanent anzeigen / Anzeigedauer einer Animation. */
import SliderField from '../../ui/SliderField.vue'
import UiSwitch from '../../ui/UiSwitch.vue'
import { useI18n } from '../../../lib/i18n.js'
import { useEffectField } from './useEffectField.js'

const effect = defineModel('effect', { type: Object, required: true })
const emit = defineEmits(['change'])
const set = useEffectField(effect, emit)
const { t } = useI18n()
</script>

<style scoped src="./text-animations-shared.css"></style>
