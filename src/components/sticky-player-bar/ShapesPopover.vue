<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-shapes">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('shapes.title') }}</span>
      <button class="spb-popover-close" :title="t('common.close')" @click="close">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
    <div class="spb-shapes-scroll">
      <ShapesPanel />
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import ShapesPanel from '../shapes/ShapesPanel.vue'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

const { t } = useI18n()

const { popover } = inject('playerBar')
const { closePopover, cascadeOffset } = popover
const close = () => closePopover('shapes')
const initOffset = cascadeOffset('shapes')
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.spb-popover-shapes {
  width: 360px;
  padding: 0;
  /* Wie die übrigen Panel-Popover: nur der Inhalt scrollt, der Kopf bleibt
     als Ziehgriff stehen. */
  max-height: calc(100vh - 110px);
  overflow: hidden;
}
.spb-popover-shapes .spb-popover-header {
  padding: 12px 12px 0;
}
.spb-shapes-scroll {
  padding: 10px 12px 12px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
</style>
