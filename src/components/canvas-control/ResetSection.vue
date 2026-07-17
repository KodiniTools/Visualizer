<template>
  <!-- Hintergrund zurücksetzen -->
  <div class="panel-section">
    <h4>{{ t('canvasControl.resetBackground') }}</h4>
    <p class="info-text">
      {{ t('canvasControl.selectWhatToReset') || 'Wählen Sie, was zurückgesetzt werden soll' }}
    </p>
    <div class="reset-options">
      <button
        @click="resetNormalBackground"
        class="btn-reset-option"
        :disabled="!hasImageBackground && !hasVideoBackground"
        :title="t('canvasControl.resetNormalBg') || 'Normaler Hintergrund zurücksetzen'"
      >
        {{ t('canvasControl.normalBackground') || 'Hintergrund' }}
      </button>
      <button
        @click="resetWorkspaceBackgroundOnly"
        class="btn-reset-option"
        :disabled="!hasWorkspaceBackground && !hasWorkspaceVideoBackground"
        :title="t('canvasControl.resetWorkspaceBg') || 'Workspace-Hintergrund zurücksetzen'"
      >
        {{ t('canvasControl.workspaceBackground') || 'Workspace' }}
      </button>
    </div>
    <button @click="resetAllBackgrounds" class="btn-secondary full-width" style="margin-top: 8px">
      {{ t('canvasControl.resetAll') || 'Alle zurücksetzen' }}
    </button>
  </div>

  <div class="divider"></div>

  <!-- Canvas komplett zurücksetzen -->
  <div class="panel-section">
    <h4>{{ t('canvasControl.clearCanvas') }}</h4>
    <p class="info-text warning">{{ t('canvasControl.removesAll') }}</p>
    <button
      @click="showResetConfirm = true"
      class="btn-danger full-width"
      :disabled="isCanvasEmpty"
    >
      {{ t('canvasControl.deleteAll') }}
    </button>
    <div v-if="isCanvasEmpty" class="hint-text" style="margin-top: 8px; text-align: center">
      {{ t('canvasControl.canvasEmpty') }}
    </div>
  </div>

  <!-- Bestätigungs-Dialog für Canvas-Reset -->
  <div v-if="showResetConfirm" class="confirm-overlay" @click="showResetConfirm = false">
    <div class="confirm-dialog" @click.stop>
      <h4>{{ t('canvasControl.confirmClear') }}</h4>
      <p>
        {{ t('canvasControl.confirmClearText') }}
      </p>
      <div class="confirm-actions">
        <button @click="handleConfirmReset" class="btn-danger">
          {{ t('common.delete') }}
        </button>
        <button @click="showResetConfirm = false" class="btn-secondary">
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()
const bg = inject('bgSettings')
const {
  hasImageBackground,
  hasVideoBackground,
  hasWorkspaceBackground,
  hasWorkspaceVideoBackground,
  isCanvasEmpty,
  resetNormalBackground,
  resetWorkspaceBackgroundOnly,
  resetAllBackgrounds,
  confirmReset,
} = bg

const showResetConfirm = ref(false)

function handleConfirmReset() {
  confirmReset()
  showResetConfirm.value = false
}
</script>

<style scoped>
.info-text {
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  line-height: 1.3;
  margin: 0 0 6px 0;
}

.info-text.warning {
  color: #ff9800;
  font-weight: 500;
}

.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  font-style: italic;
}

.reset-options {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.btn-reset-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset-option:hover:not(:disabled) {
  background: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-tertiary, #f8e1a9);
}

.btn-reset-option:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-secondary,
.btn-danger {
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 600;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-secondary {
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
}

.btn-secondary:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: translateY(-1px);
}

.btn-danger {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.3);
  transform: translateY(-1px);
}

.btn-danger:disabled {
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-muted, #7a8da0);
  cursor: not-allowed;
  opacity: 0.5;
}

.full-width {
  width: 100%;
}

.divider {
  height: 1px;
  background-color: var(--border-color, rgba(201, 152, 77, 0.2));
  margin: 8px 0;
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-dialog {
  background-color: var(--card-bg, #142640);
  border: 1px solid rgba(244, 67, 54, 0.5);
  border-radius: 8px;
  padding: 12px;
  max-width: 300px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.confirm-dialog h4 {
  margin: 0 0 8px 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: #f44336;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.confirm-dialog p {
  margin: 0 0 12px 0;
  font-size: 0.6rem;
  line-height: 1.5;
  color: var(--text-primary, #e9e9eb);
}

.confirm-actions {
  display: flex;
  gap: 8px;
}

.confirm-actions button {
  flex: 1;
}

/* Light theme overrides */
[data-theme='light'] .btn-reset-option {
  background: #fdfbf2;
  border-color: var(--border-color);
  color: #003971;
}

[data-theme='light'] .btn-reset-option:hover:not(:disabled) {
  background: var(--btn-hover);
  border-color: #014f99;
  color: #014f99;
}

[data-theme='light'] .info-text.warning {
  color: #014f99;
}

[data-theme='light'] .confirm-overlay {
  background-color: rgba(0, 0, 0, 0.4);
}

[data-theme='light'] .confirm-dialog {
  background-color: #ffffff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

@media (max-width: 768px) {
  .btn-secondary,
  .btn-danger {
    padding: 8px 12px;
    font-size: 0.65rem;
    min-height: 40px;
  }

  .btn-reset-option {
    padding: 8px 10px;
    font-size: 0.6rem;
    min-height: 40px;
  }

  .confirm-dialog {
    max-width: 90vw;
  }
}

@media (max-width: 480px) {
  .reset-options {
    flex-direction: column;
  }

  .btn-secondary,
  .btn-danger {
    min-height: 44px;
    font-size: 0.7rem;
  }

  .btn-reset-option {
    min-height: 44px;
    font-size: 0.65rem;
  }
}
</style>
