<template>
  <div class="effect-category">
    <span class="category-title">{{ title }}</span>
    <div v-for="effect in effects" :key="effect.id" class="effect-item" :data-effect-id="effect.id">
      <UiSwitch
        :model-value="effectState(effect.id, defaultIntensity).enabled"
        :label="effect.name"
        @update:model-value="(v) => effectToggle(effect.id, v, defaultIntensity)"
      />
      <div v-if="effectState(effect.id, defaultIntensity).enabled" class="effect-body">
        <UiSelect
          :model-value="effectState(effect.id, defaultIntensity).source"
          size="sm"
          inline
          :label="t('foto.effectSource')"
          :options="sourceOptions"
          @update:model-value="(v) => effectSourceChange(effect.id, v as string, defaultIntensity)"
        />
        <SliderControl
          :label="t('foto.effectIntensity')"
          :model-value="effectState(effect.id, defaultIntensity).intensity"
          :min="0"
          :max="100"
          :default-value="defaultIntensity"
          :value-text="`${effectState(effect.id, defaultIntensity).intensity}%`"
          @update:model-value="(v) => effectIntensityChange(effect.id, v, defaultIntensity)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useI18n } from '../../../lib/i18n'
import UiSwitch from '../../ui/UiSwitch.vue'
import UiSelect from '../../ui/UiSelect.vue'
import SliderControl from '../../ui/SliderControl.vue'
import { audioSourceOptions } from './audioReactiveOptions'
import type { AudioReactiveControls, AudioReactiveEffectItem } from './audioReactiveControls'

withDefaults(
  defineProps<{
    title?: string
    effects?: AudioReactiveEffectItem[]
    defaultIntensity?: number
  }>(),
  { title: '', effects: () => [], defaultIntensity: 80 },
)

const { t } = useI18n()
const arc = inject('audioReactiveControls') as AudioReactiveControls
const { effectState, effectToggle, effectSourceChange, effectIntensityChange } = arc

const sourceOptions = computed(() => audioSourceOptions(t, { withGlobal: true }))
</script>

<style scoped>
.effect-category {
  background: rgba(0, 0, 0, 0.1);
  border-radius: var(--ds-radius-sm);
  padding: 8px;
}
.category-title {
  font-size: var(--ds-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 6px;
}
.effect-item {
  padding: 4px 0;
}
/* Einstellungen eines aktiven Effekts: eingerückt unter seinem Schalter */
.effect-body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  margin: var(--ds-space-1) 0 var(--ds-space-1) 6px;
  padding-left: var(--ds-space-3);
  border-left: 2px solid var(--ds-border-strong);
}
.effect-body :deep(.control-group) {
  margin-bottom: 0;
}

[data-theme='light'] .effect-category {
  background: var(--ds-surface-2);
}
</style>
