<template>
  <div>
    <!-- Preset Auswahl -->
    <div class="control-group">
      <select
        :ref="ifc.presetSelectRef"
        :aria-label="t('foto.filterPreset')"
        @mousedown="onSliderStart"
        @change="onPresetChange"
      >
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

<style scoped src="../../ui/slider-control.css"></style>
<style scoped src="./image-filters-shared.css"></style>
<style scoped>
/* Drei Buttons in Größe sm (UiButton secondary); bei schmalem Panel bricht die Zeile um */
.history-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-1);
  margin-top: var(--ds-space-4);
}
.btn-history {
  flex: 1 1 auto;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-1);
  height: var(--ds-control-sm);
  padding: 0 var(--ds-space-2);
  border-radius: var(--ds-radius-sm);
  border: 1px solid var(--ds-border-strong);
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}
.btn-history svg {
  width: var(--ds-icon-sm);
  height: var(--ds-icon-sm);
  flex-shrink: 0;
}
.btn-history:hover:not(:disabled) {
  background-color: var(--btn-hover);
  border-color: var(--image-section-accent);
  color: var(--image-section-accent);
}
.btn-history:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-reset:hover:not(:disabled) {
  border-color: var(--accent-primary);
  color: var(--accent-tertiary);
}
</style>
