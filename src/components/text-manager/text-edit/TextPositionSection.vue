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
          :min="0"
          :max="1"
          :step="0.01"
          :default-value="0.5"
          class="slider"
          @update:model-value="updateText"
        />
        <input
          type="number"
          :value="Math.round(selectedText.relX * canvasWidth)"
          class="number-input"
          :aria-label="t('textManager.layout.pixelX')"
          :placeholder="'0 - ' + canvasWidth"
          @input="handleUpdateSelectedTextPixelPosition('x', $event)"
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
          :min="0"
          :max="1"
          :step="0.01"
          :default-value="0.5"
          class="slider"
          @update:model-value="updateText"
        />
        <input
          type="number"
          :value="Math.round(selectedText.relY * canvasHeight)"
          class="number-input"
          :aria-label="t('textManager.layout.pixelY')"
          :placeholder="'0 - ' + canvasHeight"
          @input="handleUpdateSelectedTextPixelPosition('y', $event)"
        />
        <span class="unit-label">px</span>
      </div>

      <!-- Schnellauswahl-Buttons -->
      <div class="control-group">
        <label>{{ t('textManager.layout.quickSelect') }}:</label>
        <div class="position-grid">
          <UiIconButton
            v-for="pos in quickPositions"
            :key="pos.id"
            variant="secondary"
            class="btn-pos"
            :label="t(`textManager.quickPos.${pos.key}`)"
            @click="handleSetSelectedTextQuickPosition(pos.id)"
          >
            <span aria-hidden="true">{{ pos.glyph }}</span>
          </UiIconButton>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup>
import { useI18n } from '../../../lib/i18n'
import SliderField from '../../ui/SliderField.vue'
import { inject } from 'vue'
import { UiIconButton } from '../../ui/index.js'

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

// 3 × 3-Raster: Position, i18n-Schlüssel (quickPos.*) und Richtungspfeil
const quickPositions = [
  { id: 'top-left', key: 'topLeft', glyph: '↖' },
  { id: 'top-center', key: 'topCenter', glyph: '↑' },
  { id: 'top-right', key: 'topRight', glyph: '↗' },
  { id: 'middle-left', key: 'middleLeft', glyph: '←' },
  { id: 'center', key: 'center', glyph: '⊙' },
  { id: 'middle-right', key: 'middleRight', glyph: '→' },
  { id: 'bottom-left', key: 'bottomLeft', glyph: '↙' },
  { id: 'bottom-center', key: 'bottomCenter', glyph: '↓' },
  { id: 'bottom-right', key: 'bottomRight', glyph: '↘' },
]
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
  width: 100%;
  font-size: var(--ds-text-lg);
}

[data-theme='light'] .number-input {
  background-color: var(--card-bg);
  color: var(--text-primary);
}
[data-theme='light'] .number-input:focus {
  border-color: var(--accent-primary);
}
</style>
