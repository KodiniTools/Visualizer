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
          <input
            type="color"
            v-model="gradientColor2"
            @input="updateGradientSettings"
            class="color-input"
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
        <input
          type="range"
          v-model.number="gradientAngle"
          @input="updateGradientSettings"
          min="0"
          max="360"
          step="5"
          class="angle-slider"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
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
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(201, 152, 77, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid var(--accent-primary, #c9984d);
  border-radius: 6px;
}
.gradient-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-tertiary, #f8e1a9);
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
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  cursor: pointer;
}
.gradient-select:hover {
  border-color: var(--accent-primary, #c9984d);
}
.gradient-select:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}
.angle-slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(
    to right,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  border-radius: 2px;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}
.angle-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent-tertiary, #f8e1a9);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.color-hex {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  font-family: monospace;
}

[data-theme='light'] .gradient-section h5 {
  color: #014f99;
}
[data-theme='light'] .gradient-section {
  background: linear-gradient(180deg, #ffffff 0%, rgba(1, 79, 153, 0.06) 100%);
  border-left-color: #014f99;
}
[data-theme='light'] .angle-slider {
  background: linear-gradient(to right, rgba(7, 63, 116, 0.2) 0%, rgba(1, 79, 153, 0.5) 100%);
}
[data-theme='light'] .angle-slider::-webkit-slider-thumb {
  background: #073f74;
  border-color: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

@media (max-width: 768px) {
  .gradient-select {
    min-height: 36px;
    font-size: 0.65rem;
  }
}
</style>
