<template>
  <!-- ✨ NEU: Position & Bereich (klappbar) -->
  <details class="collapsible-section" :open="selectionBounds !== null">
    <summary class="section-header">
      <span class="section-icon">📍</span>
      <span>{{ t('textManager.layout.positionAndArea') }}</span>
      <span v-if="selectionBounds" class="status-badge active">{{
        t('textManager.layout.selectionBadge')
      }}</span>
    </summary>
    <div class="section-content">
      <!-- Rechteck auf Canvas zeichnen -->
      <div class="control-group">
        <UiButton
          variant="secondary"
          size="sm"
          block
          :disabled="isSelecting"
          @click="$emit('start-selection')"
        >
          {{ isSelecting ? t('textManager.layout.drawingRect') : t('textManager.layout.markArea') }}
        </UiButton>
        <div class="hint-text">
          {{ t('textManager.layout.markAreaHint') }}
        </div>
      </div>

      <!-- Auswahl-Info (nur wenn Auswahl vorhanden) -->
      <div v-if="selectionBounds" class="selection-info">
        <div class="selection-preview">
          <span class="selection-label">{{ t('textManager.layout.selectedArea') }}:</span>
          <span class="selection-value"
            >{{ Math.round(selectionBounds.width) }} ×
            {{ Math.round(selectionBounds.height) }} px</span
          >
        </div>
        <UiButton variant="ghost" size="sm" @click="$emit('clear-selection')">
          {{ t('textManager.layout.clearSelection') }}
        </UiButton>
      </div>

      <!-- Manuelle Position X -->
      <div class="control-group">
        <label>{{ t('textManager.layout.positionX') }}: {{ Math.round(position.x * 100) }}%</label>
        <SliderField
          v-model="position.x"
          :min="0"
          :max="1"
          :step="0.01"
          :default-value="0.5"
          class="slider"
        />
        <input
          v-model.number="position.xPixel"
          type="number"
          class="number-input"
          :aria-label="t('textManager.layout.pixelX')"
          :placeholder="'0 - ' + canvasWidth"
          @input="$emit('update-pixel', 'x')"
        />
        <span class="unit-label">px</span>
      </div>

      <!-- Manuelle Position Y -->
      <div class="control-group">
        <label>{{ t('textManager.layout.positionY') }}: {{ Math.round(position.y * 100) }}%</label>
        <SliderField
          v-model="position.y"
          :min="0"
          :max="1"
          :step="0.01"
          :default-value="0.5"
          class="slider"
        />
        <input
          v-model.number="position.yPixel"
          type="number"
          class="number-input"
          :aria-label="t('textManager.layout.pixelY')"
          :placeholder="'0 - ' + canvasHeight"
          @input="$emit('update-pixel', 'y')"
        />
        <span class="unit-label">px</span>
      </div>

      <!-- Schnellauswahl-Buttons -->
      <div class="control-group">
        <label>{{ t('textManager.layout.quickSelect') }}:</label>
        <div class="position-grid">
          <UiIconButton
            v-for="pos in QUICK_POSITIONS"
            :key="pos.id"
            variant="secondary"
            class="btn-pos"
            :label="t(`textManager.quickPos.${pos.key}`)"
            @click="$emit('quick-position', pos.id)"
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
import { UiButton, UiIconButton } from '../../ui'

const { t } = useI18n()
defineModel('position', {
  type: Object,
  required: true,
})

defineProps({
  selectionBounds: {
    type: Object,
    default: null,
  },
  isSelecting: {
    type: Boolean,
    default: false,
  },
  canvasWidth: {
    type: Number,
    default: 1920,
  },
  canvasHeight: {
    type: Number,
    default: 1080,
  },
})

defineEmits(['start-selection', 'clear-selection', 'update-pixel', 'quick-position'])

// 3 × 3-Raster: Position, i18n-Schlüssel (quickPos.*) und Richtungspfeil
const QUICK_POSITIONS = [
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

<style scoped src="./textFormStyles.css"></style>
<style scoped>
.btn-pos {
  width: 100%;
  font-size: var(--ds-text-lg);
}
</style>
