<template>
  <!-- Hintergrund zurücksetzen -->
  <div class="panel-section">
    <h4>{{ t('canvasControl.resetBackground') }}</h4>
    <p class="info-text">{{ t('canvasControl.selectWhatToReset') }}</p>
    <div class="reset-options">
      <UiButton
        size="sm"
        :disabled="!hasImageBackground && !hasVideoBackground"
        :title="t('canvasControl.resetNormalBg')"
        @click="resetNormalBackground"
      >
        {{ t('canvasControl.normalBackground') }}
      </UiButton>
      <UiButton
        size="sm"
        :disabled="!hasWorkspaceBackground && !hasWorkspaceVideoBackground"
        :title="t('canvasControl.resetWorkspaceBg')"
        @click="resetWorkspaceBackgroundOnly"
      >
        {{ t('canvasControl.workspaceBackground') }}
      </UiButton>
    </div>
    <UiButton size="sm" block @click="resetAllBackgrounds">
      {{ t('canvasControl.resetAll') }}
    </UiButton>
  </div>

  <div class="divider"></div>

  <!-- Canvas komplett zurücksetzen -->
  <div class="panel-section">
    <h4>{{ t('canvasControl.clearCanvas') }}</h4>
    <p class="info-text warning">{{ t('canvasControl.removesAll') }}</p>
    <UiButton
      variant="danger"
      size="sm"
      block
      :disabled="isCanvasEmpty"
      @click="showResetConfirm = true"
    >
      {{ t('canvasControl.deleteAll') }}
    </UiButton>
    <p v-if="isCanvasEmpty" class="hint-text">{{ t('canvasControl.canvasEmpty') }}</p>
  </div>

  <!-- Bestätigung für Canvas-Reset -->
  <UiDialog
    :open="showResetConfirm"
    :title="t('canvasControl.confirmClear')"
    :description="t('canvasControl.confirmClearText')"
    @close="showResetConfirm = false"
  >
    <template #footer>
      <UiButton @click="showResetConfirm = false">{{ t('common.cancel') }}</UiButton>
      <UiButton variant="danger" @click="handleConfirmReset">{{ t('common.delete') }}</UiButton>
    </template>
  </UiDialog>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { UiButton, UiDialog } from '../ui/index.js'

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
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  line-height: 1.3;
  margin: 0 0 6px 0;
}

.info-text.warning {
  color: var(--ds-warning);
  font-weight: var(--ds-weight-medium);
}

[data-theme='light'] .info-text.warning {
  color: var(--accent-ink);
}

.hint-text {
  margin: 8px 0 0;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
}

.reset-options {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.reset-options > * {
  flex: 1 1 0;
}

.divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 8px 0;
}

@media (max-width: 480px) {
  .reset-options {
    flex-direction: column;
  }
}
</style>
