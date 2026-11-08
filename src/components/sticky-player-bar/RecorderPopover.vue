<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-recorder">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('player.openRecorder') }}</span>
      <button class="spb-popover-close" :title="t('common.close')" @click="close">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
    <div class="spb-recorder-scroll">
      <RecorderPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import type { PlayerBarContext } from './playerBarContext'
import { useI18n } from '../../lib/i18n'
import RecorderPanel from '../RecorderPanel.vue'
import { vPopoverDrag } from '../../directives/popoverDrag'

const { t } = useI18n()

const { popover } = inject('playerBar') as PlayerBarContext
const { closePopover, cascadeOffset } = popover
const close = () => closePopover('recorder')
const initOffset = cascadeOffset('recorder')
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.spb-popover-recorder {
  width: 380px;
  padding: 0;
}
.spb-popover-recorder .spb-popover-header {
  padding: 12px 12px 0;
}
.spb-recorder-scroll {
  padding: 10px 12px 12px;
}
/* Neutralize the embedded RecorderPanel's own card chrome inside the popover */
.spb-recorder-scroll :deep(.recorder-panel) {
  background-color: transparent;
  border: none;
  padding: 0;
}
</style>
