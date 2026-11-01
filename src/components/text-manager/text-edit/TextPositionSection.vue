<template>
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">📍</span>
      <span>{{ t('textManager.layout.position') }}</span>
    </summary>
    <div class="section-content">
      <!-- Position X -->
      <div class="control-group">
        <label
          >{{ t('textManager.layout.positionX') }}:
          {{ Math.round(selectedText.relX * 100) }}%</label
        >
        <SliderField
          v-model="selectedText.relX"
          @update:model-value="updateText"
          :min="0"
          :max="1"
          :step="0.01"
          :default-value="0.5"
          class="slider"
        />
        <input
          type="number"
          :value="Math.round(selectedText.relX * canvasWidth)"
          @input="handleUpdateSelectedTextPixelPosition('x', $event)"
          class="number-input"
          :placeholder="'0 - ' + canvasWidth"
        />
        <span class="unit-label">px</span>
      </div>

      <!-- Position Y -->
      <div class="control-group">
        <label
          >{{ t('textManager.layout.positionY') }}:
          {{ Math.round(selectedText.relY * 100) }}%</label
        >
        <SliderField
          v-model="selectedText.relY"
          @update:model-value="updateText"
          :min="0"
          :max="1"
          :step="0.01"
          :default-value="0.5"
          class="slider"
        />
        <input
          type="number"
          :value="Math.round(selectedText.relY * canvasHeight)"
          @input="handleUpdateSelectedTextPixelPosition('y', $event)"
          class="number-input"
          :placeholder="'0 - ' + canvasHeight"
        />
        <span class="unit-label">px</span>
      </div>

      <!-- Schnellauswahl-Buttons -->
      <div class="control-group">
        <label>{{ t('textManager.layout.quickSelect') }}:</label>
        <div class="position-grid">
          <button
            @click="handleSetSelectedTextQuickPosition('top-left')"
            class="btn-pos"
            :title="t('textManager.quickPos.topLeft')"
          >
            ↖
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('top-center')"
            class="btn-pos"
            :title="t('textManager.quickPos.topCenter')"
          >
            ↑
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('top-right')"
            class="btn-pos"
            :title="t('textManager.quickPos.topRight')"
          >
            ↗
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('middle-left')"
            class="btn-pos"
            :title="t('textManager.quickPos.middleLeft')"
          >
            ←
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('center')"
            class="btn-pos"
            :title="t('textManager.quickPos.center')"
          >
            ⊙
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('middle-right')"
            class="btn-pos"
            :title="t('textManager.quickPos.middleRight')"
          >
            →
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('bottom-left')"
            class="btn-pos"
            :title="t('textManager.quickPos.bottomLeft')"
          >
            ↙
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('bottom-center')"
            class="btn-pos"
            :title="t('textManager.quickPos.bottomCenter')"
          >
            ↓
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('bottom-right')"
            class="btn-pos"
            :title="t('textManager.quickPos.bottomRight')"
          >
            ↘
          </button>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup>
import { useI18n } from '../../../lib/i18n.js'
import SliderField from '../../ui/SliderField.vue'
import { inject } from 'vue'

const { t } = useI18n()

const tec = inject('textEditControls')
const {
  selectedText,
  canvasWidth,
  canvasHeight,
  updateText,
  handleUpdateSelectedTextPixelPosition,
  handleSetSelectedTextQuickPosition,
} = tec
</script>

<style scoped src="./text-edit-shared.css"></style>
<style scoped>
.number-input {
  width: 70px;
  padding: 6px 8px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--ds-text);
  font-size: var(--ds-text-xs);
  margin-left: 8px;
}
.number-input:focus {
  border-color: var(--ds-link);
  outline: none;
}
.unit-label {
  color: var(--text-muted);
  font-size: var(--ds-text-xs);
  margin-left: 4px;
}
.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-top: 8px;
}
.btn-pos {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 8px;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  font-size: var(--ds-text-lg);
  transition: all var(--ds-duration) var(--ds-ease);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-pos:hover {
  background: var(--card-bg);
  border-color: var(--ds-link);
  color: var(--ds-link);
}
.btn-pos.active {
  background: var(--ds-surface-3);
  border-color: var(--ds-link);
  color: var(--ds-link);
}

[data-theme='light'] .number-input {
  background-color: var(--card-bg);
  color: var(--text-primary);
}
[data-theme='light'] .number-input:focus {
  border-color: var(--accent-primary);
}
[data-theme='light'] .btn-pos:hover {
  background: var(--secondary-bg);
  border-color: var(--accent-primary);
  color: var(--accent-ink);
}
[data-theme='light'] .btn-pos.active {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border-color: var(--accent-primary);
  color: var(--accent-ink);
}

@media (max-width: 768px) {
  .btn-pos {
    min-height: 36px;
    min-width: 36px;
  }
}
@media (max-width: 480px) {
  .btn-pos {
    min-height: 40px;
    min-width: 40px;
  }
}
</style>
