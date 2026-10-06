<template>
  <div class="audio-preset-actions">
    <button class="btn-preset-action btn-save" @click="saveSettings" :disabled="!hasActiveImage">
      {{ t('foto.save') }}
    </button>
    <button
      class="btn-preset-action btn-apply"
      @click="applySettings"
      :disabled="!hasSavedSettings"
    >
      {{ t('foto.apply') }}
    </button>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const arc = inject('audioReactiveControls')
const { hasActiveImage, hasSavedSettings, saveSettings, applySettings } = arc
</script>

<style scoped>
.audio-preset-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--ds-link) 10%, transparent);
}
.btn-preset-action {
  flex: 1;
  padding: 5px 8px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
  border: none;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.btn-preset-action:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-save {
  background: color-mix(in srgb, var(--ds-link) 15%, transparent);
  color: var(--ds-link);
}
.btn-save:not(:disabled):hover {
  background: color-mix(in srgb, var(--ds-link) 25%, transparent);
}
.btn-apply {
  background: color-mix(in srgb, var(--ds-danger) 15%, transparent);
  color: var(--ds-link);
}
.btn-apply:not(:disabled):hover {
  background: color-mix(in srgb, var(--ds-danger) 25%, transparent);
}

[data-theme='light'] .btn-save {
  background: var(--ds-surface-2);
  color: var(--text-primary);
}
[data-theme='light'] .btn-save:not(:disabled):hover {
  background: var(--btn-hover);
}
[data-theme='light'] .btn-apply {
  background: var(--ds-surface-2);
  color: var(--text-primary);
}
[data-theme='light'] .btn-apply:not(:disabled):hover {
  background: var(--btn-hover);
}
</style>
