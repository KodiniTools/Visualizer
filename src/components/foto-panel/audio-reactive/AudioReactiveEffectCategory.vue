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
  border-radius: 6px;
  padding: 8px;
}
.category-title {
  font-size: 0.55rem;
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
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 4px;
  transition: all 0.15s ease;
  margin-bottom: 4px;
}
.effect-item:hover {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.2);
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
  accent-color: #8b5cf6;
  cursor: pointer;
}
.effect-name {
  font-size: 0.65rem;
  color: var(--text-secondary);
  white-space: nowrap;
}
.effect-source-select {
  width: 100%;
  padding: 2px 4px;
  font-size: 0.55rem;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 3px;
  color: var(--text-primary);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  text-align: center;
}
.effect-source-select:hover {
  background: rgba(139, 92, 246, 0.25);
  border-color: rgba(139, 92, 246, 0.5);
}
.effect-source-select:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgb(139 92 246 / 35%);
  border-color: #8b5cf6;
}
.effect-source-select option {
  background: var(--card-bg);
  color: var(--text-primary);
}
.effect-slider {
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: rgba(139, 92, 246, 0.2);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}
.effect-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8b5cf6;
  cursor: pointer;
  border: none;
}
.effect-slider::-moz-range-thumb {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8b5cf6;
  cursor: pointer;
  border: none;
}
.effect-value {
  font-size: 0.6rem;
  color: var(--text-muted);
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
}

[data-theme='light'] .effect-item {
  background: #fdfbf2;
  border-color: var(--border-color);
}
[data-theme='light'] .effect-item:hover {
  background: var(--btn-hover);
  border-color: var(--accent-secondary);
}
[data-theme='light'] .effect-source-select {
  background: #fdfbf2;
  border-color: var(--border-color);
}
[data-theme='light'] .effect-source-select:hover {
  background: var(--btn-hover);
  border-color: var(--accent-secondary);
}
[data-theme='light'] .effect-slider {
  background: linear-gradient(90deg, rgba(7, 63, 116, 0.2) 0%, rgba(1, 79, 153, 0.4) 100%);
}
[data-theme='light'] .effect-slider::-webkit-slider-thumb {
  background: #073f74;
}
[data-theme='light'] .effect-slider::-moz-range-thumb {
  background: #073f74;
}

@media (max-width: 768px) {
  .effect-item {
    grid-template-columns: 1fr 50px 50px 28px;
    padding: 6px 8px;
  }
  .effect-source-select {
    font-size: 0.6rem;
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
