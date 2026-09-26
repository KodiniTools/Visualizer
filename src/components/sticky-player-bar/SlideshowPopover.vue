<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-slideshow">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('player.openSlideshow') }}</span>
      <SlideshowStatusBadge
        v-if="slideshow.panelVisible"
        class="spb-slideshow-status"
        :is-active="slideshow.active"
        :is-paused="slideshow.paused"
      />
      <button class="spb-popover-close" :title="t('common.close')" @click="close">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
    <div class="spb-slideshow-scroll">
      <!-- Ziel des <Teleport> im FotoPanel (Slideshow-Panel) -->
      <div :id="SLIDESHOW_POPOVER_TARGET_ID" class="spb-slideshow-target"></div>
      <p v-if="!slideshow.panelVisible" class="spb-empty-hint">
        {{ t('player.slideshowEmpty') }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { vPopoverDrag } from '../../directives/popoverDrag.js'
import SlideshowStatusBadge from '../foto-panel/slideshow/SlideshowStatusBadge.vue'
import {
  SLIDESHOW_POPOVER_TARGET_ID,
  useSlideshowPopover,
} from '../../composables/useSlideshowPopover.js'

const { t } = useI18n()

const { popover } = inject('playerBar')
const { closePopover, cascadeOffset } = popover
const close = () => closePopover('slideshow')
const initOffset = cascadeOffset('slideshow')
const slideshow = useSlideshowPopover()
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.spb-popover-slideshow {
  width: 360px;
  padding: 0;
  /* Nur der Inhalt scrollt, der Kopf bleibt als Ziehgriff stehen. */
  max-height: calc(100vh - 110px);
  overflow: hidden;
}
.spb-popover-slideshow .spb-popover-header {
  padding: 12px 12px 0;
}
.spb-slideshow-scroll {
  padding: 10px 12px 12px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
/* Rahmen und Titel stellt hier das Fenster. */
.spb-slideshow-scroll :deep(.slideshow-panel) {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
}
.spb-slideshow-scroll :deep(.slideshow-panel > .panel-header) {
  display: none;
}
/* Status sitzt rechts in der Kopfzeile, direkt vor dem Schließen-Knopf */
.spb-slideshow-status {
  margin-left: auto;
}
</style>
