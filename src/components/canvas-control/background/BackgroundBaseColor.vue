<template>
  <div>
    <div class="control-group">
      <label>{{ t('canvasControl.selectColor') }}:</label>
      <div class="color-picker-group">
        <input
          type="color"
          v-model="backgroundColor"
          @input="updateFromColorPicker"
          class="color-input"
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
      <input
        type="range"
        v-model.number="backgroundOpacity"
        @input="updateFromOpacitySlider"
        min="0"
        max="1"
        step="0.01"
        class="opacity-slider"
      />
    </div>
  </div>
</template>

<script setup>
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
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.6rem;
  font-family: 'Courier New', monospace;
}
.color-text-input:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}

.opacity-slider {
  width: 100%;
  height: 3px;
  background: linear-gradient(
    to right,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
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
  background-color: var(--accent-tertiary, #f8e1a9);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.opacity-slider::-webkit-slider-thumb:hover {
  background-color: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}
.opacity-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background-color: var(--accent-tertiary, #f8e1a9);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.opacity-slider::-moz-range-thumb:hover {
  background-color: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

[data-theme='light'] .opacity-slider {
  background: linear-gradient(to right, rgba(7, 63, 116, 0.2) 0%, rgba(1, 79, 153, 0.5) 100%);
}
[data-theme='light'] .opacity-slider::-webkit-slider-thumb {
  background: #073f74;
  border-color: #014f99;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
[data-theme='light'] .opacity-slider::-moz-range-thumb {
  background: #073f74;
  border-color: #014f99;
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
