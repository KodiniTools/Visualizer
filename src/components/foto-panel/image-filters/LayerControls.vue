<template>
  <div class="layer-controls-section">
    <div class="modern-section-header">
      <h4>{{ t('foto.layers') }}</h4>
      <span v-if="currentLayerInfo" class="layer-info">{{ currentLayerInfo }}</span>
    </div>
    <div class="layer-buttons">
      <button @click="bringToFront" :disabled="!canMoveUp" class="layer-btn">
        <span class="layer-icon">⬆</span>
        <span class="layer-text">{{ t('foto.bringToFront') }}</span>
      </button>
      <button @click="moveUp" :disabled="!canMoveUp" class="layer-btn">
        <span class="layer-icon">↑</span>
        <span class="layer-text">{{ t('foto.moveUp') }}</span>
      </button>
      <button @click="moveDown" :disabled="!canMoveDown" class="layer-btn">
        <span class="layer-icon">↓</span>
        <span class="layer-text">{{ t('foto.moveDown') }}</span>
      </button>
      <button @click="sendToBack" :disabled="!canMoveDown" class="layer-btn">
        <span class="layer-icon">⬇</span>
        <span class="layer-text">{{ t('foto.sendToBack') }}</span>
      </button>
    </div>

    <!-- Visualizer Layer Toggle -->
    <div class="visualizer-layer-toggle">
      <label class="toggle-label">
        <input
          type="checkbox"
          :checked="renderBehindVisualizerRef"
          @change="onRenderBehindVisualizerChange"
        />
        <span class="toggle-text">{{ t('foto.renderBehindVisualizer') }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const ifc = inject('imageFilterControls')
const {
  currentLayerInfo,
  canMoveUp,
  canMoveDown,
  renderBehindVisualizerRef,
  onRenderBehindVisualizerChange,
  bringToFront,
  moveUp,
  moveDown,
  sendToBack,
} = ifc
</script>

<style scoped src="../../ui/slider-control.css"></style>
<style scoped src="./image-filters-shared.css"></style>
<style scoped>
.layer-controls-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: color-mix(in srgb, var(--ds-surface-2) 50%, transparent);
  padding: 16px;
  border-radius: var(--ds-radius-lg);
  border: 1px solid color-mix(in srgb, var(--ds-link) 10%, transparent);
  margin-bottom: 8px;
}
.layer-controls-section .modern-section-header {
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.layer-info {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--image-section-accent);
  font-family: var(--ds-font-mono);
  background: color-mix(in srgb, var(--ds-link) 15%, transparent);
  padding: 4px 10px;
  border-radius: var(--ds-radius-lg);
  border: 1px solid color-mix(in srgb, var(--ds-link) 30%, transparent);
}
.layer-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}
.layer-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 4px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  text-align: center;
}
.layer-btn:hover:not(:disabled) {
  background: var(--btn-hover);
  border-color: var(--accent-primary);
  color: var(--accent-tertiary);
}
.layer-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.layer-icon {
  font-size: var(--ds-text-xs);
  line-height: 1;
}
.layer-text {
  font-size: var(--ds-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  opacity: 0.8;
}
.visualizer-layer-toggle {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--ds-link) 15%, transparent);
}
.visualizer-layer-toggle .toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
}
.visualizer-layer-toggle input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--image-section-accent);
  cursor: pointer;
}
.visualizer-layer-toggle .toggle-text {
  opacity: 0.9;
}

[data-theme='light'] .layer-controls-section {
  background: color-mix(in srgb, var(--accent-primary) 5%, transparent);
  border-color: var(--border-color);
}
[data-theme='light'] .layer-info {
  color: var(--accent-ink);
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border-color: var(--border-color);
}
[data-theme='light'] .layer-btn {
  background: var(--card-bg);
  border-color: var(--border-color);
}
[data-theme='light'] .layer-btn:hover:not(:disabled) {
  background: var(--secondary-bg);
  color: var(--accent-ink);
}
[data-theme='light'] .visualizer-layer-toggle {
  border-top-color: var(--border-color);
}
</style>
