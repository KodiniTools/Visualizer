<template>
  <!-- Text-Einstellungen (nur wenn Text ausgewählt) -->
  <div class="panel-section">
    <TextContentSection />
    <TextPositionSection />
    <TextSpacingStrokeSection />
    <TextShadowSection />
    <TextRotationSection />

    <!-- Audio Reactive Panel -->
    <TextAudioReactivePanel :selected-text="selectedText" />

    <!-- Animations Panel -->
    <TextAnimationsPanel :selected-text="selectedText" />

    <!-- Löschen Button -->
    <button @click="deleteSelectedText" class="btn-danger full-width" style="margin-top: 16px">
      {{ t('textManager.deleteText') }}
    </button>
  </div>
</template>

<script setup>
import { ref, toRef, inject, provide, nextTick, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useTextFonts } from '../../composables/useTextFonts.js'
import TextAudioReactivePanel from './TextAudioReactivePanel.vue'
import TextAnimationsPanel from './TextAnimationsPanel.vue'
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
const canvasManager = inject('canvasManager')
const fontManager = inject('fontManager')

const editTextInput = ref(null)
const fontSelect = ref(null)

// Wrap props as ref-like for composable
const selectedTextRef = { value: props.selectedText }

const { populateFontDropdown } = useTextFonts(
  canvasManager,
  fontManager,
  fontSelect,
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
  fontSelect,
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

.btn-danger {
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 600;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}
.btn-danger:hover {
  background: rgba(244, 67, 54, 0.3);
  transform: translateY(-1px);
}
.full-width {
  width: 100%;
}

[data-theme='light'] .btn-danger {
  background: rgba(244, 67, 54, 0.08);
  color: #c62828;
}
[data-theme='light'] .btn-danger:hover {
  background: rgba(244, 67, 54, 0.12);
}
</style>
