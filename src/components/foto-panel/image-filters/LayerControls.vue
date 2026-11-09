<template>
  <div class="layer-controls-section">
    <div class="modern-section-header">
      <h4>{{ t('foto.layers') }}</h4>
      <span
        v-if="currentLayerInfo"
        class="layer-info"
        :aria-label="`${t('foto.layers')} ${currentLayerInfo}`"
        >{{ currentLayerInfo }}</span
      >
    </div>

    <div class="layer-buttons">
      <UiButton
        v-for="action in LAYER_ACTIONS"
        :key="action.key"
        size="sm"
        block
        :disabled="action.up ? !canMoveUp : !canMoveDown"
        @click="action.run"
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

    <div class="visualizer-layer-toggle">
      <UiSwitch
        :model-value="renderBehindVisualizerRef"
        :label="t('foto.renderBehindVisualizer')"
        @update:model-value="onRenderBehindVisualizerChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/** Ebenen-Reihenfolge des aktiven Bildes und „Hinter Visualizer rendern“. */
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n'
import type { ImageFilterContext } from './imageFilterContext'
import UiButton from '../../ui/UiButton.vue'
import UiSwitch from '../../ui/UiSwitch.vue'

const { t } = useI18n()
const ifc = inject('imageFilterControls') as ImageFilterContext
const {
  currentLayerInfo,
  canMoveUp,
  canMoveDown,
  renderBehindVisualizerRef,
  onRenderBehindVisualizerChange,
  bringToFront,
  moveUp,
  moveDown,
  sendToBack,
} = ifc

/** Reihenfolge wie bisher: ganz nach vorne, eins hoch, eins runter, ganz nach hinten. */
const LAYER_ACTIONS = [
  {
    key: 'bringToFront',
    up: true,
    run: bringToFront,
    path: 'M3 2.5h10M8 13.5V6M4.5 9.5 8 6l3.5 3.5',
  },
  { key: 'moveUp', up: true, run: moveUp, path: 'M8 13V3M4 7l4-4 4 4' },
  { key: 'moveDown', up: false, run: moveDown, path: 'M8 3v10M4 9l4 4 4-4' },
  {
    key: 'sendToBack',
    up: false,
    run: sendToBack,
    path: 'M3 13.5h10M8 2.5V10M4.5 6.5 8 10l3.5-3.5',
  },
]
</script>

<style scoped src="./image-filters-shared.css"></style>
<style scoped>
.layer-controls-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  background: var(--ds-surface-1);
  padding: var(--ds-space-4);
  border-radius: var(--ds-radius-lg);
  border: var(--ds-border-width) solid var(--ds-border);
  margin-bottom: var(--ds-space-2);
}
.layer-controls-section .modern-section-header {
  margin-bottom: 0;
  justify-content: space-between;
}
/* Neutrales Abzeichen: in beiden Themes lesbar */
.layer-info {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  font-family: var(--ds-font-mono);
  color: var(--ds-text);
  background: var(--ds-surface-2);
  padding: 2px var(--ds-space-2);
  border-radius: var(--ds-radius-full);
}
.layer-buttons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ds-space-1);
}
.visualizer-layer-toggle {
  padding-top: var(--ds-space-3);
  border-top: var(--ds-border-width) solid var(--ds-border);
}
</style>
