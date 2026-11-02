<template>
  <div v-if="selectedVideoIndex !== null" class="placement-section">
    <h4 class="placement-header">{{ t('placement.title') }}</h4>

    <UiSelect
      v-model="selectedAnimation"
      :label="t('placement.effect')"
      :options="animationOptions"
      size="sm"
      inline
    />

    <SliderControl
      v-if="selectedAnimation !== 'none'"
      v-model="animationDuration"
      :label="t('placement.duration')"
      :min="100"
      :max="5000"
      :step="100"
      :default-value="500"
      :value-text="`${(animationDuration / 1000).toFixed(1)}s`"
    />

    <SliderControl
      v-model="videoScale"
      :label="t('placement.size')"
      :min="1"
      :max="8"
      :step="1"
      :default-value="3"
      :value-text="`${videoScale}x`"
    />

    <div class="placement-switches">
      <UiSwitch v-model="videoLoop" :label="t('videoPanel.loop')" />
      <UiSwitch v-model="videoMuted" :label="t('videoPanel.muted')" />
    </div>

    <UiButton variant="primary" size="sm" block class="btn-place" @click="addVideoDirectly">
      {{ t('placement.place') }}
    </UiButton>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import SliderControl from '../ui/SliderControl.vue'
import UiButton from '../ui/UiButton.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiSwitch from '../ui/UiSwitch.vue'
import { placementAnimationOptions } from '../../lib/placementAnimations.js'

const { t } = useI18n()

const {
  selectedVideoIndex,
  selectedAnimation,
  animationDuration,
  videoScale,
  videoLoop,
  videoMuted,
  addVideoDirectly,
} = inject('videoPanel')

const animationOptions = computed(() => placementAnimationOptions(t))
</script>

<style scoped>
.placement-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding: var(--ds-space-3);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}

.placement-header {
  margin: 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

/* Auswahl füllt die Zeile; Label in derselben Optik wie die Regler-Labels */
.placement-section > .ui-select :deep(.ui-select__control) {
  flex: 1;
}

.placement-section > .ui-select :deep(.ui-select__label) {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
}

.placement-switches {
  display: flex;
  gap: var(--ds-space-4);
}
</style>
