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
  border-top: 1px solid rgba(139, 92, 246, 0.1);
}
.btn-preset-action {
  flex: 1;
  padding: 5px 8px;
  font-size: 0.65rem;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
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
  background: rgba(139, 92, 246, 0.15);
  color: #a78bfa;
}
.btn-save:not(:disabled):hover {
  background: rgba(139, 92, 246, 0.25);
}
.btn-apply {
  background: rgba(236, 72, 153, 0.15);
  color: #f472b6;
}
.btn-apply:not(:disabled):hover {
  background: rgba(236, 72, 153, 0.25);
}

[data-theme='light'] .btn-save {
  background: #fdfbf2;
  color: var(--text-primary);
}
[data-theme='light'] .btn-save:not(:disabled):hover {
  background: var(--btn-hover);
}
[data-theme='light'] .btn-apply {
  background: #fdfbf2;
  color: var(--text-primary);
}
[data-theme='light'] .btn-apply:not(:disabled):hover {
  background: var(--btn-hover);
}
</style>
