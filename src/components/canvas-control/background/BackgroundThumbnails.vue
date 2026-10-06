<template>
  <div>
    <!-- Hintergrund-Thumbnail -->
    <div v-if="hasImageBackground" class="background-thumb-section">
      <h5>{{ t('canvasControl.backgroundImage') || 'Hintergrundbild' }}</h5>
      <div
        class="background-thumb"
        @dblclick="openBackgroundReplaceModal('background')"
        :title="t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen'"
      >
        <img v-if="backgroundImageSrc" :src="backgroundImageSrc" alt="Background" />
        <span class="thumb-hint">{{
          t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen'
        }}</span>
      </div>
    </div>

    <!-- Workspace-Hintergrund-Thumbnail -->
    <div v-if="hasWorkspaceBackground" class="background-thumb-section">
      <h5>{{ t('canvasControl.workspaceBackgroundImage') || 'Workspace-Hintergrundbild' }}</h5>
      <div
        class="background-thumb"
        @dblclick="openBackgroundReplaceModal('workspace')"
        :title="t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen'"
      >
        <img
          v-if="workspaceBackgroundImageSrc"
          :src="workspaceBackgroundImageSrc"
          alt="Workspace Background"
        />
        <span class="thumb-hint">{{
          t('canvasControl.dblClickToReplace') || 'Doppelklick zum Ersetzen'
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const bg = inject('bgSettings')
const {
  hasImageBackground,
  hasWorkspaceBackground,
  backgroundImageSrc,
  workspaceBackgroundImageSrc,
  openBackgroundReplaceModal,
} = bg
</script>

<style scoped>
.background-thumb-section {
  margin-top: 10px;
  padding: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-left: 2px solid var(--accent-primary);
  border-radius: var(--ds-radius-sm);
}
.background-thumb-section h5 {
  margin: 0 0 8px 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--accent-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.background-thumb {
  position: relative;
  width: 100%;
  height: 60px;
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}
.background-thumb:hover {
  border-color: var(--accent-primary);
}
.background-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.background-thumb .thumb-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.7);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
  text-align: center;
  opacity: 0;
  transition: opacity var(--ds-duration) var(--ds-ease);
}
.background-thumb:hover .thumb-hint {
  opacity: 1;
}

[data-theme='light'] .background-thumb-section h5 {
  color: var(--accent-ink);
}
[data-theme='light'] .background-thumb-section {
  border-left-color: var(--accent-primary);
}
[data-theme='light'] .background-thumb .thumb-hint {
  background: rgba(255, 255, 255, 0.85);
}
</style>
