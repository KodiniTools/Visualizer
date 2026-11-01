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
        <button
          :class="['btn-selection', 'full-width', { active: isSelecting }]"
          :disabled="isSelecting"
          @click="$emit('start-selection')"
        >
          <span v-if="isSelecting">{{ t('textManager.layout.drawingRect') }}</span>
          <span v-else>{{ t('textManager.layout.markArea') }}</span>
        </button>
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
        <button class="btn-small btn-clear" @click="$emit('clear-selection')">
          {{ t('textManager.layout.clearSelection') }}
        </button>
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
          :placeholder="'0 - ' + canvasHeight"
          @input="$emit('update-pixel', 'y')"
        />
        <span class="unit-label">px</span>
      </div>

      <!-- Schnellauswahl-Buttons -->
      <div class="control-group">
        <label>{{ t('textManager.layout.quickSelect') }}:</label>
        <div class="position-grid">
          <button
            class="btn-pos"
            :title="t('textManager.quickPos.topLeft')"
            @click="$emit('quick-position', 'top-left')"
          >
            ↖
          </button>
          <button
            class="btn-pos"
            :title="t('textManager.quickPos.topCenter')"
            @click="$emit('quick-position', 'top-center')"
          >
            ↑
          </button>
          <button
            class="btn-pos"
            :title="t('textManager.quickPos.topRight')"
            @click="$emit('quick-position', 'top-right')"
          >
            ↗
          </button>
          <button
            class="btn-pos"
            :title="t('textManager.quickPos.middleLeft')"
            @click="$emit('quick-position', 'middle-left')"
          >
            ←
          </button>
          <button
            class="btn-pos active"
            :title="t('textManager.quickPos.center')"
            @click="$emit('quick-position', 'center')"
          >
            ⊙
          </button>
          <button
            class="btn-pos"
            :title="t('textManager.quickPos.middleRight')"
            @click="$emit('quick-position', 'middle-right')"
          >
            →
          </button>
          <button
            class="btn-pos"
            :title="t('textManager.quickPos.bottomLeft')"
            @click="$emit('quick-position', 'bottom-left')"
          >
            ↙
          </button>
          <button
            class="btn-pos"
            :title="t('textManager.quickPos.bottomCenter')"
            @click="$emit('quick-position', 'bottom-center')"
          >
            ↓
          </button>
          <button
            class="btn-pos"
            :title="t('textManager.quickPos.bottomRight')"
            @click="$emit('quick-position', 'bottom-right')"
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
</script>

<style scoped src="./textFormStyles.css"></style>
