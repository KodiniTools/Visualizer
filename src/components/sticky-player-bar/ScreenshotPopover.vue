<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-screenshot">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('player.openScreenshot') }}</span>
      <button class="spb-popover-close" :title="t('common.close')" @click="close">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
    <div class="spb-screenshot-scroll">
      <ScreenshotPanel />
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import ScreenshotPanel from '../ScreenshotPanel.vue'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

const { t } = useI18n()

const { popover } = inject('playerBar')
const { closePopover, cascadeOffset } = popover
const close = () => closePopover('screenshot')
const initOffset = cascadeOffset('screenshot')
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.spb-popover-screenshot {
  width: 360px;
  padding: 0;
}
.spb-popover-screenshot .spb-popover-header {
  padding: 12px 12px 0;
}
.spb-screenshot-scroll {
  padding: 10px 12px 12px;
}
/* Neutralize the embedded ScreenshotPanel's own card chrome inside the popover */
.spb-screenshot-scroll :deep(.screenshot-panel) {
  background-color: transparent;
  border: none;
  padding: 0;
}
</style>
