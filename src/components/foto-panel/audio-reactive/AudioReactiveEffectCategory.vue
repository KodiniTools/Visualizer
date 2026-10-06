<template>
  <div class="effect-category">
    <span class="category-title">{{ title }}</span>
    <div v-for="effect in effects" :key="effect.id" class="effect-item" :data-effect-id="effect.id">
      <label class="effect-checkbox-label">
        <input
          type="checkbox"
          class="effect-checkbox"
          @change="effectToggle(effect.id, $event.target.checked)"
        />
        <span class="effect-name">{{ effect.name }}</span>
      </label>
      <select
        class="effect-source-select"
        @change="effectSourceChange(effect.id, $event.target.value)"
      >
        <option value="">{{ t('foto.global') }}</option>
        <option value="bass">{{ t('foto.bass') }}</option>
        <option value="mid">{{ t('foto.mid') }}</option>
        <option value="treble">{{ t('foto.treble') }}</option>
        <option value="volume">{{ t('foto.volume') }}</option>
        <optgroup :label="t('foto.onsetGroup')">
          <option value="bassOnset">{{ t('foto.bassOnset') }}</option>
          <option value="midOnset">{{ t('foto.midOnset') }}</option>
          <option value="trebleOnset">{{ t('foto.trebleOnset') }}</option>
          <option value="allOnset">{{ t('foto.allOnset') }}</option>
        </optgroup>
      </select>
      <input
        type="range"
        class="effect-slider"
        min="0"
        max="100"
        :value="defaultIntensity"
        @input="effectIntensityChange(effect.id, $event.target.value)"
      />
      <span class="effect-value">{{ defaultIntensity }}%</span>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

defineProps({
  title: { type: String, default: '' },
  effects: { type: Array, default: () => [] },
  defaultIntensity: { type: Number, default: 80 },
})

const { t } = useI18n()
const arc = inject('audioReactiveControls')
const { effectToggle, effectSourceChange, effectIntensityChange } = arc
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
  display: grid;
  grid-template-columns: 1fr 50px 45px 28px;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid color-mix(in srgb, var(--ds-link) 10%, transparent);
  border-radius: var(--ds-radius-sm);
  transition: all var(--ds-duration) var(--ds-ease);
  margin-bottom: 4px;
}
.effect-item:hover {
  background: color-mix(in srgb, var(--ds-link) 8%, transparent);
  border-color: color-mix(in srgb, var(--ds-link) 20%, transparent);
}
.effect-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.effect-checkbox {
  width: 12px;
  height: 12px;
  accent-color: var(--ds-link);
  cursor: pointer;
}
.effect-name {
  font-size: var(--ds-text-xs);
  color: var(--text-secondary);
  white-space: nowrap;
}
.effect-source-select {
  width: 100%;
  padding: 2px 4px;
  font-size: var(--ds-text-xs);
  background: color-mix(in srgb, var(--ds-link) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-link) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  text-align: center;
}
.effect-source-select:hover {
  background: color-mix(in srgb, var(--ds-link) 25%, transparent);
  border-color: color-mix(in srgb, var(--ds-link) 50%, transparent);
}
.effect-source-select:focus-visible {
  outline: none;
  border-color: var(--ds-link);
}
.effect-source-select option {
  background: var(--card-bg);
  color: var(--text-primary);
}
.effect-slider {
  width: 100%;
  height: 3px;
  border-radius: var(--ds-radius-sm);
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}
.effect-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 8px;
  height: 8px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-link);
  cursor: pointer;
  border: none;
}
.effect-slider::-moz-range-thumb {
  width: 8px;
  height: 8px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-link);
  cursor: pointer;
  border: none;
}
.effect-value {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  text-align: right;
  font-family: var(--ds-font-mono);
}

[data-theme='light'] .effect-item {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}
[data-theme='light'] .effect-item:hover {
  background: var(--btn-hover);
  border-color: var(--accent-secondary);
}
[data-theme='light'] .effect-source-select {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}
[data-theme='light'] .effect-source-select:hover {
  background: var(--btn-hover);
  border-color: var(--accent-secondary);
}
[data-theme='light'] .effect-slider {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
}
[data-theme='light'] .effect-slider::-webkit-slider-thumb {
  background: var(--accent-primary);
}
[data-theme='light'] .effect-slider::-moz-range-thumb {
  background: var(--accent-primary);
}

@media (max-width: 768px) {
  .effect-item {
    grid-template-columns: 1fr 50px 50px 28px;
    padding: 6px 8px;
  }
  .effect-source-select {
    font-size: var(--ds-text-xs);
    padding: 4px 6px;
    min-height: 32px;
  }
  .effect-slider::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }
  .effect-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
  }
}
@media (max-width: 480px) {
  .effect-item {
    grid-template-columns: 1fr 45px 40px 28px;
  }
}
</style>
