<template>
  <div class="gradient-section">
    <h5>{{ t('canvasControl.gradient') }}</h5>

    <UiSwitch
      v-model="gradientEnabled"
      :label="t('canvasControl.enableGradient')"
      @update:model-value="updateGradientSettings"
    />

    <div v-if="gradientEnabled" class="gradient-controls">
      <div class="control-group">
        <label>{{ t('canvasControl.secondColor') }}</label>
        <div class="color-picker-group">
          <ColorField
            v-model="gradientColor2"
            :label="t('canvasControl.secondColor')"
            @update:model-value="updateGradientSettings"
          />
          <span class="color-hex">{{ gradientColor2 }}</span>
        </div>
      </div>

      <UiSelect
        v-model="gradientType"
        size="sm"
        inline
        :label="t('canvasControl.type')"
        :options="typeOptions"
        @update:model-value="updateGradientSettings"
      />

      <SliderControl
        v-if="gradientType === 'linear'"
        v-model="gradientAngle"
        :label="t('canvasControl.angle')"
        :min="0"
        :max="360"
        :step="5"
        :default-value="45"
        :value-text="`${gradientAngle}°`"
        @update:model-value="updateGradientSettings"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import ColorField from '../../ui/ColorField.vue'
import SliderControl from '../../ui/SliderControl.vue'
import UiSelect from '../../ui/UiSelect.vue'
import UiSwitch from '../../ui/UiSwitch.vue'

const { t } = useI18n()
const bg = inject('bgSettings')
const { gradientEnabled, gradientColor2, gradientType, gradientAngle, updateGradientSettings } = bg

const typeOptions = computed(() => [
  { value: 'radial', label: t('canvasControl.radial') },
  { value: 'linear', label: t('canvasControl.linear') },
])
</script>

<style scoped src="./background-shared.css"></style>
<style scoped>
.gradient-section {
  margin-top: 10px;
  padding: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-left: 2px solid var(--accent-primary);
  border-radius: var(--ds-radius-sm);
}
.gradient-section h5 {
  margin: 0 0 8px 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--accent-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.gradient-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.gradient-controls :deep(.control-group.slider) {
  margin-bottom: 0;
}
.color-hex {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  font-family: var(--ds-font-mono);
}

[data-theme='light'] .gradient-section h5 {
  color: var(--accent-ink);
}
[data-theme='light'] .gradient-section {
  border-left-color: var(--accent-primary);
}
</style>
