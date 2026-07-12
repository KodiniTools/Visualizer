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

<style scoped src="./image-filters-shared.css"></style>
<style scoped>
.layer-controls-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(42, 42, 42, 0.5);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(110, 168, 254, 0.1);
  margin-bottom: 8px;
}
.layer-controls-section .modern-section-header {
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.layer-info {
  font-size: 12px;
  font-weight: 600;
  color: var(--image-section-accent, #6ea8fe);
  font-family: 'Courier New', monospace;
  background: rgba(110, 168, 254, 0.15);
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(110, 168, 254, 0.3);
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
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}
.layer-btn:hover:not(:disabled) {
  background: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
}
.layer-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.layer-icon {
  font-size: 0.7rem;
  line-height: 1;
}
.layer-text {
  font-size: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  opacity: 0.8;
}
.visualizer-layer-toggle {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(110, 168, 254, 0.15);
}
.visualizer-layer-toggle .toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--text-primary, #e9e9eb);
}
.visualizer-layer-toggle input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--image-section-accent, #6ea8fe);
  cursor: pointer;
}
.visualizer-layer-toggle .toggle-text {
  opacity: 0.9;
}

[data-theme='light'] .layer-controls-section {
  background: rgba(1, 79, 153, 0.05);
  border-color: rgba(1, 79, 153, 0.15);
}
[data-theme='light'] .layer-info {
  color: #014f99;
  background: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.25);
}
[data-theme='light'] .layer-btn {
  background: #ffffff;
  color: #003971;
  border-color: rgba(1, 79, 153, 0.2);
}
[data-theme='light'] .layer-btn:hover:not(:disabled) {
  background: #f9f2d5;
  border-color: #014f99;
  color: #014f99;
}
[data-theme='light'] .visualizer-layer-toggle {
  border-top-color: rgba(1, 79, 153, 0.15);
}
[data-theme='light'] .visualizer-layer-toggle .toggle-label {
  color: #003971;
}
</style>
