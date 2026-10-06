<template>
  <div class="flip-controls">
    <div class="modern-section-header">
      <h4>{{ t('foto.flip') }}</h4>
    </div>
    <div class="flip-buttons">
      <button
        @pointerdown="onSliderStart"
        @click="onFlipHorizontal"
        class="flip-button"
        :class="{ active: flipHRef }"
      >
        ↔ {{ t('foto.flipH') }}
      </button>
      <button
        @pointerdown="onSliderStart"
        @click="onFlipVertical"
        class="flip-button"
        :class="{ active: flipVRef }"
      >
        ↕ {{ t('foto.flipV') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const ifc = inject('imageFilterControls')
const { flipHRef, flipVRef, onSliderStart, onFlipHorizontal, onFlipVertical } = ifc
</script>

<style scoped>
.flip-controls {
  margin-top: 12px;
}
.flip-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.flip-button {
  flex: 1;
  padding: 10px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}
.flip-button:hover {
  background: var(--btn-hover);
  border-color: var(--image-section-accent);
  color: var(--ds-text);
}
.flip-button.active {
  background: var(--image-section-gradient);
  border-color: var(--image-section-accent);
  color: var(--ds-text);
}

.modern-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.modern-section-header h4 {
  margin: 0;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
[data-theme='light'] .flip-button {
  border-color: var(--border-color);
  color: var(--text-primary);
}
[data-theme='light'] .flip-button:hover {
  background: var(--secondary-bg);
  border-color: var(--accent-primary);
  color: var(--accent-ink);
}
[data-theme='light'] .flip-button.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--accent-text);
}
</style>
