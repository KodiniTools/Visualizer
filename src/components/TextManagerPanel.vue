<template>
  <div class="panel">
    <h3>{{ t('textManager.title') }}</h3>

    <!-- Add new text — always visible (collapses to a button when not in use) -->
    <TextNewForm @created="onTextCreated" />

    <!-- Text-Verzeichnis: alle Texte auflisten & einzeln markieren -->
    <TextDirectoryPanel
      :items="textList"
      :active-id="selectedText?.id ?? null"
      :sequence-playing="sequencePlaying"
      v-model:global-duration-enabled="globalDurationEnabled"
      v-model:global-duration="globalDuration"
      @select="selectTextFromDirectory"
      @restart="restartTextFromDirectory"
      @return-to-canvas="returnTextToCanvas"
      @delete="deleteTextFromDirectory"
      @play-all="startTextSequence"
      @stop-all="stopTextSequence"
    />

    <!-- Multi-select edit mode -->
    <TextMultiEditPanel
      v-if="multiSelectedTexts.length > 1"
      :texts="multiSelectedTexts"
      :active-text="selectedText"
      @clear="clearMultiSelection"
    />

    <!-- Single edit mode -->
    <TextEditPanel
      v-else-if="selectedText"
      :selected-text="selectedText"
      :canvas-width="canvasWidth"
      :canvas-height="canvasHeight"
      ref="editPanelRef"
      @delete="deleteSelectedText"
    />
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useI18n } from '../lib/i18n.js'
import TextNewForm from './text-manager/TextNewForm.vue'
import TextEditPanel from './text-manager/TextEditPanel.vue'
import TextMultiEditPanel from './text-manager/TextMultiEditPanel.vue'
import TextDirectoryPanel from './text-manager/TextDirectoryPanel.vue'
import { useHistoryStore } from '../stores/historyStore.js'
import { useBeatMarkerStore } from '../stores/beatMarkerStore.js'
import { getHistoryRecorder } from '../lib/history/historyRecorder.js'
import { useTextDirectory } from '../composables/textManager/useTextDirectory.js'
import { useTextSequence } from '../composables/textManager/useTextSequence.js'
import { useTextSelectionSync } from '../composables/textManager/useTextSelectionSync.js'
import { useCanvasSize } from '../composables/textManager/useCanvasSize.js'
import { useTextEditorWithChar } from '../composables/textManager/useTextEditorWithChar.js'

const { t } = useI18n()
const canvasManager = inject('canvasManager')
const fontManager = inject('fontManager')

const selectedText = ref(null)
const multiSelectedTexts = ref([])
const editPanelRef = ref(null)

const historyRecorder = getHistoryRecorder(useHistoryStore())
const beatMarkerStore = useBeatMarkerStore()

const {
  textList,
  refreshTextList,
  returnTextToCanvas,
  deleteTextFromDirectory,
  selectTextFromDirectory,
  restartTextFromDirectory,
} = useTextDirectory({
  canvasManager,
  historyRecorder,
  beatMarkerStore,
  selectedText,
  multiSelectedTexts,
})

const {
  sequencePlaying,
  globalDurationEnabled,
  globalDuration,
  startTextSequence,
  stopTextSequence,
} = useTextSequence({ canvasManager, historyRecorder })

useTextEditorWithChar({ canvasManager, selectedText, editPanelRef })

useTextSelectionSync({
  canvasManager,
  fontManager,
  selectedText,
  multiSelectedTexts,
  editPanelRef,
  refreshTextList,
})

const { canvasWidth, canvasHeight } = useCanvasSize(canvasManager)

function onTextCreated(newTextObj) {
  if (newTextObj) {
    selectedText.value = newTextObj
  }
  refreshTextList()
}

function deleteSelectedText() {
  // TextEditPanel hat deleteActiveObject() bereits aufgerufen; nur Auswahl leeren
  selectedText.value = null
  refreshTextList()
}

function clearMultiSelection() {
  if (canvasManager.value) {
    canvasManager.value.clearMultiSelection()
    canvasManager.value.setActiveObject(null)
  }
  multiSelectedTexts.value = []
  selectedText.value = null
  refreshTextList()
}
</script>

<style scoped>
/* ===== MAIN PANEL ===== */
.panel {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-md);
  padding: 10px;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ===== HEADERS ===== */
h3 {
  margin: 0 0 8px 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-primary);
  letter-spacing: 0.4px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}

h3::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Cpath d='M4 7V4h16v3M9 20h6M12 4v16'/%3E%3C/svg%3E");
  background-size: contain;
}

/* ===== SECTIONS ===== */
.panel-section {
  margin-bottom: 8px;
}

/* ===== INFO TEXT ===== */
.info-text {
  color: var(--ds-text-3);
  font-size: var(--ds-text-xs);
  line-height: 1.6;
  margin: 0;
  text-align: center;
}

/* ═══ Light Theme Overrides ═══ */

/* --- Header Icon --- */
[data-theme='light'] h3::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23003971' stroke-width='1.5'%3E%3Cpath d='M4 7V4h16v3M9 20h6M12 4v16'/%3E%3C/svg%3E");
  filter: none;
}

/* --- Muted Text --- */
[data-theme='light'] .info-text {
  color: var(--text-muted);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .panel {
    padding: 8px;
  }
}
</style>
