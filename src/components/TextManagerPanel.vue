<template>
  <div class="panel">
    <h3>{{ t('textManager.title') }}</h3>

    <!-- Add new text — always visible (collapses to a button when not in use) -->
    <TextNewForm @created="onTextCreated" />

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
import { ref, inject, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from '../lib/i18n.js'
import TextNewForm from './text-manager/TextNewForm.vue'
import TextEditPanel from './text-manager/TextEditPanel.vue'
import TextMultiEditPanel from './text-manager/TextMultiEditPanel.vue'

const { t } = useI18n()
const canvasManager = inject('canvasManager')
const fontManager = inject('fontManager')

const selectedText = ref(null)
const multiSelectedTexts = ref([])
const canvasWidth = ref(1920)
const canvasHeight = ref(1080)
const editPanelRef = ref(null)

let eventListenerRegistered = false

// ✨ FIX: Verbesserte Callback-Funktion für Selection-Changes
function handleSelectionChange(obj) {
  if (obj && obj.type === 'text') {
    // Sicherheitsprüfung: Initialisiere fehlende Properties
    if (!obj.letterSpacing && obj.letterSpacing !== 0) {
      obj.letterSpacing = 0
    }
    if (!obj.lineHeightMultiplier) {
      obj.lineHeightMultiplier = 120
    }
    if (!obj.stroke) {
      obj.stroke = { enabled: false, color: '#000000', width: 2 }
    }
    if (obj.stroke && obj.stroke.enabled === undefined) {
      obj.stroke.enabled = false
    }
    if (!obj.shadow) {
      obj.shadow = {
        color: '#000000',
        blur: 0,
        offsetX: 0,
        offsetY: 0,
      }
    }

    // ✨ Initialisiere audioReactive wenn nicht vorhanden (für ältere Text-Objekte)
    if (!obj.audioReactive) {
      obj.audioReactive = {
        enabled: false,
        source: 'bass',
        smoothing: 50,
        threshold: 0,
        attack: 90,
        release: 50,
        effects: {
          hue: { enabled: false, intensity: 80 },
          brightness: { enabled: false, intensity: 80 },
          scale: { enabled: false, intensity: 80 },
          glow: { enabled: false, intensity: 80 },
          shake: { enabled: false, intensity: 80 },
          bounce: { enabled: false, intensity: 80 },
          swing: { enabled: false, intensity: 80 },
          opacity: { enabled: false, intensity: 80, minimum: 0, ease: false },
          letterSpacing: { enabled: false, intensity: 80 },
          strokeWidth: { enabled: false, intensity: 80 },
        },
      }
    }

    // ✨ Initialisiere animation wenn nicht vorhanden (für ältere Text-Objekte)
    if (!obj.animation) {
      obj.animation = {
        type: 'none',
        typewriter: {
          enabled: false,
          speed: 50,
          startDelay: 0,
          loop: false,
          loopDelay: 1000,
          showCursor: true,
          cursorChar: '|',
        },
        _state: {
          startTime: null,
          isPlaying: false,
          currentIndex: 0,
        },
      }
    }

    selectedText.value = obj

    // ✨ FIX: Font-Dropdown befüllen
    nextTick(() => {
      if (editPanelRef.value?.populateFontDropdown) {
        editPanelRef.value.populateFontDropdown()
      }
    })
  } else {
    selectedText.value = null
  }
}

function onTextCreated(newTextObj) {
  if (newTextObj) {
    selectedText.value = newTextObj
  }
}

function deleteSelectedText() {
  // TextEditPanel already called deleteActiveObject(); just clear selection state
  selectedText.value = null
}

// ✨ NEU: Handler für Tastatureingabe zum Öffnen des Texteditors
function handleOpenTextEditorWithChar(event) {
  const char = event.detail?.char
  if (!char) return

  // ✨ LÖSUNG: Sofort Text zum Canvas hinzufügen und Editor öffnen!
  if (!canvasManager.value) return

  // Erstelle sofort einen neuen Text auf dem Canvas mit dem eingegebenen Zeichen
  const newTextObj = canvasManager.value.addText(char, {
    fontSize: 48,
    fontFamily: 'Arial',
    color: '#ff0000',
    opacity: 100,
    letterSpacing: 0,
    lineHeightMultiplier: 120,
    strokeEnabled: false,
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowColor: '#000000',
    shadowBlur: 5,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
  })

  // Der Text wird automatisch als activeObject gesetzt (durch addText)
  // Das triggert handleSelectionChange, was selectedText setzt und den Editor öffnet
  if (newTextObj) {
    selectedText.value = newTextObj

    // Fokussiere das Editor-Textarea, damit der Benutzer weiter tippen kann
    nextTick(() => {
      if (editPanelRef.value?.editTextInput) {
        editPanelRef.value.editTextInput.focus()
        // Setze Cursor ans Ende des Textes
        editPanelRef.value.editTextInput.selectionStart =
          editPanelRef.value.editTextInput.selectionEnd = char.length
      }
    })
  }
}

// ✨ FIX: Überwache canvasManager.activeObject direkt
watch(
  () => canvasManager.value?.activeObject,
  (newObj) => {
    handleSelectionChange(newObj)
  },
  { deep: true },
)

// Watch multi-selection array
watch(
  () => canvasManager.value?.selectedObjects,
  (arr) => {
    if (arr && arr.length > 1) {
      multiSelectedTexts.value = [...arr]
      // Keep selectedText pointing at activeObject for audio-reactive copy button
      const active = canvasManager.value?.activeObject
      if (active?.type === 'text') handleSelectionChange(active)
    } else {
      multiSelectedTexts.value = []
    }
  },
  { deep: true },
)

function clearMultiSelection() {
  if (canvasManager.value) {
    canvasManager.value.clearMultiSelection()
    canvasManager.value.setActiveObject(null)
  }
  multiSelectedTexts.value = []
  selectedText.value = null
}

// ✨ NEU: Watch für Canvas-Dimensionen Updates
watch(
  () => canvasManager.value?.canvas,
  (canvas) => {
    if (canvas) {
      canvasWidth.value = canvas.width
      canvasHeight.value = canvas.height
    }
  },
  { immediate: true },
)

// Setup beim Mounting
onMounted(() => {
  // ✨ WICHTIG: Event-Listener für Tastatureingabe IMMER registrieren (unabhängig von canvasManager)
  window.addEventListener('openTextEditorWithChar', handleOpenTextEditorWithChar)

  if (!canvasManager.value) return

  // ✨ NEU: Canvas-Dimensionen initialisieren
  if (canvasManager.value.canvas) {
    canvasWidth.value = canvasManager.value.canvas.width
    canvasHeight.value = canvasManager.value.canvas.height
  }

  // ✨ FIX: Registriere Event-Listener wenn verfügbar
  if (canvasManager.value.onSelectionChanged && !eventListenerRegistered) {
    canvasManager.value.onSelectionChanged(handleSelectionChange)
    eventListenerRegistered = true
  }

  // Prüfe ob bereits ein Text ausgewählt ist
  if (canvasManager.value.activeObject?.type === 'text') {
    handleSelectionChange(canvasManager.value.activeObject)
  }

  // Überwache FontManager und aktualisiere Dropdown wenn Fonts geladen werden
  if (fontManager?.value) {
    watch(
      () => fontManager.value?.isInitialized,
      (isInitialized) => {
        if (isInitialized) {
          nextTick(() => {
            if (editPanelRef.value?.populateFontDropdown) {
              editPanelRef.value.populateFontDropdown()
            }
          })
        }
      },
      { immediate: true },
    )
  }
})

// Cleanup beim Unmounting
onUnmounted(() => {
  eventListenerRegistered = false
  // ✨ NEU: Event-Listener entfernen
  window.removeEventListener('openTextEditorWithChar', handleOpenTextEditorWithChar)
})
</script>

<style scoped>
/* ===== MAIN PANEL ===== */
.panel {
  background-color: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 8px;
  padding: 10px;
  color: var(--text-primary, #e9e9eb);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ===== HEADERS ===== */
h3 {
  margin: 0 0 8px 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-primary, #e9e9eb);
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
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.8));
}

/* ===== SECTIONS ===== */
.panel-section {
  margin-bottom: 8px;
}

/* ===== INFO TEXT ===== */
.info-text {
  color: #777;
  font-size: 11px;
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
  color: #4d6d8e;
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .panel {
    padding: 8px;
  }
}
</style>
