<template>
  <div>
    <!-- Preset Auswahl -->
    <div class="control-group">
      <select :ref="ifc.presetSelectRef" @mousedown="onSliderStart" @change="onPresetChange">
        <option value="">{{ t('foto.noFilter') }}</option>
        <option v-for="preset in presets" :key="preset.id" :value="preset.id">
          {{ locale === 'de' ? preset.name_de || preset.name : preset.name_en || preset.name }}
        </option>
      </select>
    </div>

    <!-- Undo / Redo / Reset -->
    <div class="history-actions">
      <button class="btn-history" :disabled="!canUndo" @click="undo" :title="t('foto.undo')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 7v6h6" />
          <path d="M3 13C5.33 7.5 10 4 16 4a9 9 0 0 1 0 18H8" />
        </svg>
        {{ t('foto.undo') }}
      </button>
      <button class="btn-history" :disabled="!canRedo" @click="redo" :title="t('foto.redo')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 7v6h-6" />
          <path d="M21 13C18.67 7.5 14 4 8 4a9 9 0 0 0 0 18h8" />
        </svg>
        {{ t('foto.redo') }}
      </button>
      <button @click="resetFilters" class="btn-history btn-reset" :title="t('foto.resetFilters')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        {{ t('foto.resetFilters') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const ifc = inject('imageFilterControls')
const {
  presets,
  locale,
  canUndo,
  canRedo,
  onSliderStart,
  onPresetChange,
  undo,
  redo,
  resetFilters,
} = ifc
</script>

<style scoped src="./image-filters-shared.css"></style>
<style scoped>
.history-actions {
  display: flex;
  gap: 4px;
  margin-top: 16px;
}
.btn-history {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 5px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  font-size: 0.55rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-history svg {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}
.btn-history:hover:not(:disabled) {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--image-section-accent, #6ea8fe);
  color: var(--image-section-accent, #6ea8fe);
}
.btn-history:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-reset:hover:not(:disabled) {
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
}
</style>
