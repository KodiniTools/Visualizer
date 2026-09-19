<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-multilayer">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('player.openMultiLayer') }}</span>
      <button class="spb-popover-close" :title="t('common.close')" @click="close">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
    <div class="spb-multilayer-scroll">
      <VisualizerLayerPanel />
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import VisualizerLayerPanel from '../VisualizerLayerPanel.vue'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

const { t } = useI18n()

const { popover } = inject('playerBar')
const { closePopover, cascadeOffset } = popover
const close = () => closePopover('multiLayer')
const initOffset = cascadeOffset('multiLayer')
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.spb-popover-multilayer {
  width: 380px;
  padding: 0;
  /* Wie das Visualizer-Popover: das Popover selbst scrollt nicht, nur der
     Inhaltsbereich – so bleibt der Kopf zum Verschieben immer greifbar. */
  max-height: calc(100vh - 110px);
  overflow: hidden;
}
.spb-popover-multilayer .spb-popover-header {
  padding: 12px 12px 0;
}
.spb-multilayer-scroll {
  padding: 10px 12px 12px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
</style>
