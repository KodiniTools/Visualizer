<template>
  <div class="gradient-section">
    <h5>{{ t('canvasControl.gradient') }}</h5>

    <div class="control-group">
      <label class="checkbox-label">
        <input type="checkbox" v-model="gradientEnabled" @change="updateGradientSettings" />
        <span>{{ t('canvasControl.enableGradient') }}</span>
      </label>
    </div>

    <div v-if="gradientEnabled" class="gradient-controls">
      <div class="control-group">
        <label>{{ t('canvasControl.secondColor') }}:</label>
        <div class="color-picker-group">
          <ColorField
            v-model="gradientColor2"
            class="color-input"
            @update:model-value="updateGradientSettings"
          />
          <span class="color-hex">{{ gradientColor2 }}</span>
        </div>
      </div>

      <div class="control-group">
        <label>{{ t('canvasControl.type') }}:</label>
        <select v-model="gradientType" @change="updateGradientSettings" class="gradient-select">
          <option value="radial">{{ t('canvasControl.radial') }}</option>
          <option value="linear">{{ t('canvasControl.linear') }}</option>
        </select>
      </div>

      <div v-if="gradientType === 'linear'" class="control-group">
        <label>{{ t('canvasControl.angle') }}: {{ gradientAngle }}°</label>
        <SliderField
          v-model="gradientAngle"
          :min="0"
          :max="360"
          :step="5"
          :default-value="45"
          class="angle-slider"
          @update:model-value="updateGradientSettings"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import ColorField from '../../ui/ColorField.vue'
import SliderField from '../../ui/SliderField.vue'
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const bg = inject('bgSettings')
const { gradientEnabled, gradientColor2, gradientType, gradientAngle, updateGradientSettings } = bg
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
.gradient-select {
  width: 100%;
  padding: 5px 8px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
  cursor: pointer;
}
.gradient-select:hover {
  border-color: var(--accent-primary);
}
.gradient-select:focus {
  outline: none;
  border-color: var(--accent-primary);
}
.angle-slider {
  width: 100%;
  height: 3px;
  background: var(--text-muted);
  border-radius: var(--ds-radius-sm);
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}
.angle-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary);
  border: 2px solid var(--ds-surface-1);
  border-radius: var(--ds-radius-full);
  cursor: pointer;
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
[data-theme='light'] .angle-slider {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
}
[data-theme='light'] .angle-slider::-webkit-slider-thumb {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

@media (max-width: 768px) {
  .gradient-select {
    min-height: 36px;
    font-size: var(--ds-text-xs);
  }
}
</style>
