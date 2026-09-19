<template>
  <div v-popover-drag="initOffset" class="spb-popover spb-popover-textaudioreactive">
    <div class="spb-popover-header">
      <span class="section-label">{{ t('player.openTextAudioReactive') }}</span>
      <button class="spb-popover-close" :title="t('common.close')" @click="close">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
    <div class="spb-textaudioreactive-scroll">
      <!-- `open` fällt als Attribut auf das <details> des Panels durch, damit der
           Bereich im eigenen Popover nicht erst aufgeklappt werden muss. -->
      <TextAudioReactivePanel
        v-if="selectedText"
        :key="selectedText.id"
        :selected-text="selectedText"
        open
      />
      <p v-else class="spb-empty-hint">{{ t('textManager.clickToEdit') }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import TextAudioReactivePanel from '../text-manager/TextAudioReactivePanel.vue'
import { vPopoverDrag } from '../../directives/popoverDrag.js'

const { t } = useI18n()
const canvasManager = inject('canvasManager')

// Direkt am aktiven Canvas-Objekt hängen statt am Text-Manager-Panel links:
// So funktioniert das Popover unabhängig davon, ob jenes Panel sichtbar ist.
const selectedText = computed(() => {
  const active = canvasManager?.value?.activeObject
  return active?.type === 'text' ? active : null
})

const { popover } = inject('playerBar')
const { closePopover, cascadeOffset } = popover
const close = () => closePopover('textAudioReactive')
const initOffset = cascadeOffset('textAudioReactive')
</script>

<style scoped src="./popover-chrome.css"></style>
<style scoped>
.spb-popover-textaudioreactive {
  width: 360px;
  padding: 0;
  max-height: calc(100vh - 110px);
  overflow: hidden;
}
.spb-popover-textaudioreactive .spb-popover-header {
  padding: 12px 12px 0;
}
.spb-textaudioreactive-scroll {
  padding: 10px 12px 12px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
/* Rahmen und Überschrift stellt hier das Popover; die Klapp-Zeile des Panels
   wiederholt nur den Popover-Titel. */
.spb-textaudioreactive-scroll :deep(.collapsible-section) {
  background-color: transparent;
  border: none;
  margin: 0;
}
.spb-textaudioreactive-scroll :deep(.collapsible-section > .section-header) {
  display: none;
}
.spb-textaudioreactive-scroll :deep(.section-content) {
  padding: 0;
}
</style>
