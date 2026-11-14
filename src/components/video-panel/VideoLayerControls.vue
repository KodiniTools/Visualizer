<template>
  <div class="video-layer-controls" role="group" :aria-label="t('foto.layers')">
    <div class="video-layer-header">
      <span class="video-layer-title">{{ t('foto.layers') }}</span>
      <span v-if="selectedVideoLayerInfo" class="video-layer-info">{{
        selectedVideoLayerInfo
      }}</span>
    </div>

    <div class="video-layer-buttons">
      <UiButton
        v-for="action in LAYER_ACTION_DEFS"
        :key="action.key"
        size="sm"
        block
        :disabled="!canMoveSelectedVideo(action.key)"
        @click="moveSelectedVideo(action.key)"
      >
        <template #icon>
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path :d="action.path" />
          </svg>
        </template>
        {{ t(`foto.${action.key}`) }}
      </UiButton>
    </div>

    <UiSwitch
      :model-value="selectedVideoBehindVisualizer"
      :label="t('videoPanel.selectedBehindVisualizer')"
      @update:model-value="setVideoBehindVisualizer"
    />
    <p v-if="selectedVideoBehindVisualizer" class="video-layer-hint">
      {{ t('videoPanel.behindLayerHint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Ebenen des ausgewählten Canvas-Videos: Reihenfolge im gemeinsamen Stapel mit
 * den Bildern (wie die Ebenen-Steuerung im Foto-Panel) und „hinter Visualizer“.
 */
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n'
import type { VideoPanelApi } from '../../composables/useVideoPanel'
import UiButton from '../ui/UiButton.vue'
import UiSwitch from '../ui/UiSwitch.vue'
import { LAYER_ACTION_DEFS } from '../foto-panel/image-filters/layerActions'

const { t } = useI18n()
const {
  selectedVideoLayerInfo,
  canMoveSelectedVideo,
  moveSelectedVideo,
  selectedVideoBehindVisualizer,
  setVideoBehindVisualizer,
} = inject('videoPanel') as VideoPanelApi
</script>

<style scoped>
.video-layer-controls {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.video-layer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.video-layer-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

/* Neutrales Abzeichen wie bei den Bild-Ebenen: in beiden Themes lesbar */
.video-layer-info {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  font-family: var(--ds-font-mono);
  color: var(--ds-text);
  background: var(--ds-surface-2);
  padding: 2px var(--ds-space-2);
  border-radius: var(--ds-radius-full);
}

.video-layer-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ds-space-1);
}

.video-layer-hint {
  margin: 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}
</style>
