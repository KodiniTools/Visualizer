<template>
  <div>
    <div class="control-group">
      <label>{{ t('canvasControl.selectColor') }}:</label>
      <div class="color-picker-group">
        <ColorField
          v-model="backgroundColor"
          class="color-input"
          @update:model-value="updateFromColorPicker"
        />
        <input
          type="text"
          v-model="colorDisplay"
          @input="updateFromTextInput"
          @blur="formatColorDisplay"
          class="color-text-input"
          placeholder="rgba(0, 0, 0, 1)"
        />
      </div>
    </div>

    <div class="control-group">
      <label>
        {{ t('canvasControl.backgroundOpacity') }}: {{ Math.round(backgroundOpacity * 100) }}%
      </label>
      <SliderField
        v-model="backgroundOpacity"
        :min="0"
        :max="1"
        :step="0.01"
        :default-value="1"
        class="opacity-slider"
        @update:model-value="updateFromOpacitySlider"
      />
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
const {
  backgroundColor,
  backgroundOpacity,
  colorDisplay,
  updateFromColorPicker,
  updateFromOpacitySlider,
  updateFromTextInput,
  formatColorDisplay,
} = bg
</script>

<style scoped src="./background-shared.css"></style>
<style scoped>
.color-text-input {
  flex: 1;
  padding: 5px 7px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.6rem;
  font-family: 'Courier New', monospace;
}
.color-text-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.opacity-slider {
  width: 100%;
  height: 3px;
  background: var(--text-muted);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}
.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background-color: var(--accent-tertiary);
  border: 2px solid var(--ds-surface-1);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.opacity-slider::-webkit-slider-thumb:hover {
  background-color: var(--accent-primary);
  transform: scale(1.1);
}
.opacity-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background-color: var(--accent-tertiary);
  border: 2px solid var(--ds-surface-1);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.opacity-slider::-moz-range-thumb:hover {
  background-color: var(--accent-primary);
  transform: scale(1.1);
}

[data-theme='light'] .opacity-slider {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
}
[data-theme='light'] .opacity-slider::-webkit-slider-thumb {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
[data-theme='light'] .opacity-slider::-moz-range-thumb {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

@media (max-width: 768px) {
  .opacity-slider::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }
  .opacity-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
  }
}
</style>
