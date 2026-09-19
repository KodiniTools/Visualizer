<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-canvascontrol">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('player.openCanvasControl') }}</span>
      <button class="spb-popover-close" :title="t('common.close')" @click="close">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
    <div class="spb-canvascontrol-scroll">
      <CanvasControlPanel />
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import CanvasControlPanel from '../CanvasControlPanel.vue'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

const { t } = useI18n()

const { popover } = inject('playerBar')
const { closePopover, cascadeOffset } = popover
const close = () => closePopover('canvasControl')
const initOffset = cascadeOffset('canvasControl')
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.spb-popover-canvascontrol {
  width: 360px;
  padding: 0;
  /* Nur der Inhalt scrollt, der Kopf bleibt als Ziehgriff stehen. */
  max-height: calc(100vh - 110px);
  overflow: hidden;
}
.spb-popover-canvascontrol .spb-popover-header {
  padding: 12px 12px 0;
}
.spb-canvascontrol-scroll {
  padding: 10px 12px 12px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
/* Das Panel bringt im Popover keinen eigenen Rahmen mit — der Rahmen ist hier
   das Popover selbst. Die Panel-Überschrift wiederholt nur den Popover-Titel;
   der Auf-/Zuklapp-Kopf wird dadurch überflüssig. */
.spb-canvascontrol-scroll :deep(.panel) {
  background-color: transparent;
  border: none;
  padding: 0;
  gap: 0;
}
.spb-canvascontrol-scroll :deep(.panel-header) {
  display: none;
}
</style>
