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
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
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
  background: linear-gradient(135deg, var(--btn-hover) 0%, var(--card-bg) 100%);
  border-color: var(--image-section-accent, #6ea8fe);
  color: #fff;
}
.flip-button.active {
  background: var(--image-section-gradient, linear-gradient(135deg, #6ea8fe 0%, #5090e0 100%));
  border-color: var(--image-section-accent, #6ea8fe);
  color: #fff;
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
  color: var(--text-muted, #7a8da0);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
[data-theme='light'] .modern-section-header h4 {
  color: rgba(0, 57, 113, 0.6);
}
[data-theme='light'] .flip-button {
  background: linear-gradient(135deg, #ffffff 0%, #f9f2d5 100%);
  border-color: rgba(1, 79, 153, 0.3);
  color: #003971;
}
[data-theme='light'] .flip-button:hover {
  background: linear-gradient(135deg, #f9f2d5 0%, #ffffff 100%);
  border-color: #014f99;
  color: #014f99;
}
[data-theme='light'] .flip-button.active {
  background: linear-gradient(135deg, #014f99 0%, #003971 100%);
  border-color: #014f99;
  color: #f5f4d6;
}
</style>
