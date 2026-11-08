<template>
  <!-- Text-Einstellungen (nur wenn Text ausgewählt) -->
  <div class="panel-section">
    <TextContentSection />
    <TextPositionSection />
    <TextSpacingStrokeSection />
    <TextShadowSection />
    <TextRotationSection />

    <!-- Audio-Reaktiv liegt in einem eigenen Popover der Player-Leiste -->

    <!-- Animations Panel -->
    <TextAnimationsPanel :selected-text="selectedText" />

    <!-- Einstellungen als Standard für neue Texte speichern -->
    <div class="default-settings-row">
      <UiButton size="sm" block class="btn-save-default" @click="saveAsDefault">
        <template #icon>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          >
            <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
          </svg>
        </template>
        {{ t('textManager.saveAsDefault') }}
      </UiButton>
      <UiIconButton
        variant="secondary"
        size="sm"
        class="btn-reset-default"
        :label="t('textManager.resetDefault')"
        @click="resetDefault"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
      </UiIconButton>
    </div>

    <UiButton variant="danger" size="sm" block class="btn-delete-text" @click="deleteSelectedText">
      {{ t('textManager.deleteText') }}
    </UiButton>
  </div>
</template>

<script setup>
import { ref, toRef, inject, provide, nextTick, watch } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useTextFonts } from '../../composables/useTextFonts'
import { useToastStore } from '../../stores/toastStore'
import {
  serializeTextToDefaults,
  saveTextDefaults,
  clearTextDefaults,
} from '../../lib/textDefaults'
import TextAnimationsPanel from './TextAnimationsPanel.vue'
import { UiButton, UiIconButton } from '../ui/index.js'
import TextContentSection from './text-edit/TextContentSection.vue'
import TextPositionSection from './text-edit/TextPositionSection.vue'
import TextSpacingStrokeSection from './text-edit/TextSpacingStrokeSection.vue'
import TextShadowSection from './text-edit/TextShadowSection.vue'
import TextRotationSection from './text-edit/TextRotationSection.vue'

const props = defineProps({
  selectedText: {
    type: Object,
    required: true,
  },
  canvasWidth: {
    type: Number,
    default: 1920,
  },
  canvasHeight: {
    type: Number,
    default: 1080,
  },
})

const emit = defineEmits(['delete'])

const { t } = useI18n()
const toastStore = useToastStore()
const canvasManager = inject('canvasManager')
const fontManager = inject('fontManager')

const editTextInput = ref(null)

// Reaktive Referenz auf den aktuell markierten Text, damit Font-Aktionen
// sich ausschließlich auf diesen Text beziehen.
const selectedTextRef = toRef(props, 'selectedText')

const { fontOptions, populateFontDropdown } = useTextFonts(
  canvasManager,
  fontManager,
  { value: null }, // fontSelectRef – Schriftwahl kommt als fontOptions
  { value: null }, // newTextFontSelectRef - not used in edit mode
  selectedTextRef,
  { value: null }, // newTextStyle - not used in edit mode
)

// Watch for font changes to repopulate
watch(
  () => props.selectedText,
  () => {
    nextTick(() => {
      populateFontDropdown()
    })
  },
  { immediate: true },
)

// Watch fontManager initialization
if (fontManager?.value) {
  watch(
    () => fontManager.value?.isInitialized,
    (isInitialized) => {
      if (isInitialized) {
        nextTick(() => {
          populateFontDropdown()
        })
      }
    },
    { immediate: true },
  )
}

function updateText() {
  // Normalisiere Zeilenumbrüche wenn Text bearbeitet wird
  if (props.selectedText && props.selectedText.content) {
    props.selectedText.content = normalizeLineBreaks(props.selectedText.content)
  }

  if (canvasManager.value && canvasManager.value.redrawCallback) {
    canvasManager.value.redrawCallback()
  }
}

function normalizeLineBreaks(text) {
  if (!text) return text
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function handleEditPaste() {
  setTimeout(() => {
    if (props.selectedText) {
      const normalized = normalizeLineBreaks(props.selectedText.content)
      props.selectedText.content = normalized
      updateText()
    }
  }, 50)
}

function toggleFontWeight() {
  if (props.selectedText) {
    props.selectedText.fontWeight = props.selectedText.fontWeight === 'bold' ? 'normal' : 'bold'
    updateText()
  }
}

function toggleFontStyle() {
  if (props.selectedText) {
    props.selectedText.fontStyle = props.selectedText.fontStyle === 'italic' ? 'normal' : 'italic'
    updateText()
  }
}

function setTextAlign(align) {
  if (props.selectedText) {
    props.selectedText.textAlign = align
    updateText()
  }
}

function toggleStroke() {
  if (props.selectedText) {
    props.selectedText.stroke.enabled = !props.selectedText.stroke.enabled
    updateText()
  }
}

// Einstellungen des markierten Textes als Vorlage für neue Texte speichern
function saveAsDefault() {
  if (!props.selectedText) return
  const settings = serializeTextToDefaults(props.selectedText)
  if (settings && saveTextDefaults(settings)) {
    toastStore.success(t('textManager.savedAsDefaultToast'))
  }
}

// Gespeicherte Standard-Einstellungen für neue Texte zurücksetzen
function resetDefault() {
  clearTextDefaults()
  toastStore.success(t('textManager.resetDefaultToast'))
}

function deleteSelectedText() {
  if (canvasManager.value && props.selectedText) {
    canvasManager.value.deleteActiveObject()
    emit('delete')
  }
}

function handleUpdateSelectedTextPixelPosition(axis, event) {
  if (!props.selectedText) return

  const value = parseFloat(event.target.value)
  if (isNaN(value)) return

  if (axis === 'x') {
    props.selectedText.relX = value / props.canvasWidth
  } else {
    props.selectedText.relY = value / props.canvasHeight
  }
  updateText()
}

function handleSetSelectedTextQuickPosition(position) {
  if (!props.selectedText) return

  const positions = {
    'top-left': { x: 0.1, y: 0.1 },
    'top-center': { x: 0.5, y: 0.1 },
    'top-right': { x: 0.9, y: 0.1 },
    'middle-left': { x: 0.1, y: 0.5 },
    center: { x: 0.5, y: 0.5 },
    'middle-right': { x: 0.9, y: 0.5 },
    'bottom-left': { x: 0.1, y: 0.9 },
    'bottom-center': { x: 0.5, y: 0.9 },
    'bottom-right': { x: 0.9, y: 0.9 },
  }

  const pos = positions[position]
  if (pos) {
    props.selectedText.relX = pos.x
    props.selectedText.relY = pos.y
    updateText()
  }
}

// The collapsible sub-sections consume everything through provide/inject: the
// (reactive) current text + canvas size, the DOM refs they bind via :ref, and
// the shared handlers.
provide('textEditControls', {
  selectedText: toRef(props, 'selectedText'),
  canvasWidth: toRef(props, 'canvasWidth'),
  canvasHeight: toRef(props, 'canvasHeight'),
  editTextInput,
  fontOptions,
  updateText,
  handleEditPaste,
  toggleFontWeight,
  toggleFontStyle,
  setTextAlign,
  toggleStroke,
  handleUpdateSelectedTextPixelPosition,
  handleSetSelectedTextQuickPosition,
})

// Expose focusEditor + font population for parent (TextManagerPanel)
defineExpose({ editTextInput, populateFontDropdown })
</script>

<style scoped>
.panel-section {
  margin-bottom: 8px;
}

.default-settings-row {
  display: flex;
  gap: 6px;
  margin-top: 16px;
}

.btn-save-default {
  flex: 1;
}

.btn-delete-text {
  margin-top: 16px;
}
</style>
