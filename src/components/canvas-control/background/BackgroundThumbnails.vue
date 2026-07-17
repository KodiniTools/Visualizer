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
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(201, 152, 77, 0.08) 100%);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid var(--accent-primary, #c9984d);
  border-radius: 6px;
}
.background-thumb-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--accent-tertiary, #f8e1a9);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.background-thumb {
  position: relative;
  width: 100%;
  height: 60px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}
.background-thumb:hover {
  border-color: var(--accent-primary, #c9984d);
  box-shadow: 0 0 8px rgba(201, 152, 77, 0.3);
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
  color: var(--text-primary, #e9e9eb);
  font-size: 0.5rem;
  text-align: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.background-thumb:hover .thumb-hint {
  opacity: 1;
}

[data-theme='light'] .background-thumb-section h5 {
  color: #014f99;
}
[data-theme='light'] .background-thumb-section {
  background: linear-gradient(180deg, #ffffff 0%, rgba(1, 79, 153, 0.06) 100%);
  border-left-color: #014f99;
}
[data-theme='light'] .background-thumb:hover {
  box-shadow: 0 0 8px rgba(1, 79, 153, 0.2);
}
[data-theme='light'] .background-thumb .thumb-hint {
  background: rgba(255, 255, 255, 0.85);
  color: #003971;
}
</style>
