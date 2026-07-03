<template>
  <!-- Neuer Text Eingabemodus -->
  <div v-if="isAddingNewText" class="panel-section">
    <h4>{{ t('textManager.createNewText') }}</h4>

    <div class="control-group">
      <label>{{ t('textManager.enterText') }}:</label>
      <textarea
        ref="newTextInput"
        v-model="newTextContent"
        class="text-area"
        placeholder="Mehrzeiliger Text wird unterstützt!
Zeile 1
Zeile 2
Zeile 3..."
        rows="8"
        @keydown.esc="cancelNewText"
        @paste="handlePasteForNewText"
      ></textarea>
      <div class="hint-text">
        <strong>{{ t('textManager.browserTextTip') }}:</strong>
        {{
          locale === 'de'
            ? 'Nach dem Einfügen drücken Sie Enter, um Zeilenumbrüche hinzuzufügen'
            : 'After pasting, press Enter to add line breaks'
        }}
      </div>
      <div class="hint-text" style="margin-top: 4px">
        <strong>{{ t('textManager.notepadTip') }}:</strong>
        {{
          locale === 'de'
            ? 'Zeilenumbrüche werden automatisch erkannt'
            : 'Line breaks are automatically detected'
        }}
      </div>
      <div v-if="newTextContent.includes('\n')" class="success-hint">
        {{
          locale === 'de'
            ? newTextContent.split('\n').length + ' Zeilen erkannt'
            : newTextContent.split('\n').length + ' lines detected'
        }}
      </div>
    </div>

    <TextStyleSection
      ref="styleSectionRef"
      v-model:settings="newTextStyle"
      @save="saveCurrentSettings"
      @reset="clearSavedSettings"
    />

    <TypewriterSection v-model:settings="newTextTypewriter" />

    <FadeSection v-model:settings="newTextFade" />

    <ScaleSection v-model:settings="newTextScale" />

    <SlideSection v-model:settings="newTextSlide" />

    <PositionSection
      v-model:position="newTextPosition"
      :selection-bounds="textSelectionBounds"
      :is-selecting="isSelectingOnCanvas"
      :canvas-width="canvasWidth"
      :canvas-height="canvasHeight"
      @start-selection="startTextSelectionOnCanvas"
      @clear-selection="clearTextSelection"
      @update-pixel="updatePositionFromPixel"
      @quick-position="setQuickPosition"
    />

    <div class="button-row">
      <button class="btn-primary" :disabled="!newTextContent.trim()" @click="createNewText">
        {{ t('textManager.addToCanvas') }}
      </button>
      <button
        v-if="newTextContent && !newTextContent.includes('\n') && newTextContent.length > 60"
        class="btn-secondary"
        :title="t('textManager.autoWrapTitle')"
        @click="autoWrapText"
      >
        {{ t('textManager.autoWrap') }}
      </button>
      <button class="btn-secondary" @click="cancelNewText">
        {{ t('textManager.cancel') }}
      </button>
    </div>
  </div>

  <!-- Normal: Button zum Hinzufügen -->
  <div v-else class="panel-section">
    <button class="btn-primary full-width" @click="startAddingText">
      {{ t('textManager.addNewText') }}
    </button>
    <button
      class="btn-selection full-width"
      style="margin-top: 8px"
      @click="startAddingTextWithSelection"
    >
      🖱️ {{ t('textManager.addWithArea') }}
    </button>
  </div>
</template>

<script setup>
import { ref, inject, nextTick, watch } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useToastStore } from '../../stores/toastStore.js'
import { useNewTextSettings } from '../../composables/useNewTextSettings.js'
import { buildAnimationConfig } from './text-new-form/buildAnimation.js'
import TextStyleSection from './text-new-form/TextStyleSection.vue'
import TypewriterSection from './text-new-form/TypewriterSection.vue'
import FadeSection from './text-new-form/FadeSection.vue'
import ScaleSection from './text-new-form/ScaleSection.vue'
import SlideSection from './text-new-form/SlideSection.vue'
import PositionSection from './text-new-form/PositionSection.vue'

const { t, locale } = useI18n()
const toastStore = useToastStore()
const canvasManager = inject('canvasManager')

const emit = defineEmits(['created', 'cancel'])

const isAddingNewText = ref(false)
const newTextContent = ref('')
const newTextInput = ref(null)
const styleSectionRef = ref(null)

const {
  newTextStyle,
  newTextTypewriter,
  newTextFade,
  newTextScale,
  newTextSlide,
  newTextPosition,
  isSelectingOnCanvas,
  textSelectionBounds,
  canvasWidth,
  canvasHeight,
  loadSavedSettings,
  saveCurrentSettings,
  clearSavedSettings,
  resetNewTextSettings,
  calculateAutoFitFontSize,
  normalizeLineBreaks,
  updateCanvasDimensions,
  resetNewTextPosition,
  updatePositionFromPixel,
  setQuickPosition,
  updatePositionPreview,
  clearPositionPreview,
  startTextSelectionOnCanvas,
  cancelTextSelectionOnCanvas,
  clearTextSelection,
} = useNewTextSettings(canvasManager)

// Watch position changes for canvas preview
watch(
  () => newTextPosition.value.x,
  () => {
    if (isAddingNewText.value) {
      newTextPosition.value.xPixel = Math.round(newTextPosition.value.x * canvasWidth.value)
      updatePositionPreview()
    }
  },
)

watch(
  () => newTextPosition.value.y,
  () => {
    if (isAddingNewText.value) {
      newTextPosition.value.yPixel = Math.round(newTextPosition.value.y * canvasHeight.value)
      updatePositionPreview()
    }
  },
)

// Clear preview when leaving add mode
watch(isAddingNewText, (newValue) => {
  if (!newValue) {
    clearPositionPreview()
  }
})

// Position sync watch
watch(
  () => [newTextPosition.value.x, newTextPosition.value.y],
  ([newX, newY]) => {
    newTextPosition.value.xPixel = Math.round(newX * canvasWidth.value)
    newTextPosition.value.yPixel = Math.round(newY * canvasHeight.value)
  },
)

function handlePasteForNewText() {
  setTimeout(() => {
    if (newTextContent.value) {
      newTextContent.value = normalizeLineBreaks(newTextContent.value)
    }
  }, 50)
}

function startAddingText() {
  isAddingNewText.value = true
  newTextContent.value = ''

  loadSavedSettings()
  updateCanvasDimensions()
  resetNewTextPosition()

  nextTick(() => {
    updatePositionPreview()
  })

  nextTick(() => {
    if (newTextInput.value) {
      newTextInput.value.focus()
    }
    styleSectionRef.value?.populateNewTextFontDropdown()
  })
}

function startAddingTextWithSelection() {
  startAddingText()

  nextTick(() => {
    startTextSelectionOnCanvas()
  })
}

function createNewText() {
  if (!canvasManager.value || !newTextContent.value.trim()) {
    return
  }

  const normalizedText = normalizeLineBreaks(newTextContent.value)

  let fontSize = newTextStyle.value.fontSize
  if (newTextStyle.value.autoFit) {
    fontSize = calculateAutoFitFontSize(
      normalizedText,
      newTextStyle.value.fontFamily,
      newTextStyle.value.fontWeight,
      newTextStyle.value.fontStyle,
      newTextStyle.value.autoFitPadding,
    )
    console.log(`📐 Auto-Fit: Schriftgröße angepasst auf ${fontSize}px`)
  }

  const posX = newTextPosition.value.x
  const posY = newTextPosition.value.y

  console.log(`📍 Text-Position: X=${Math.round(posX * 100)}%, Y=${Math.round(posY * 100)}%`)

  const newTextObj = canvasManager.value.addText(normalizedText, {
    relX: posX,
    relY: posY,
    fontSize: fontSize,
    fontFamily: newTextStyle.value.fontFamily,
    color: newTextStyle.value.color,
    fontWeight: newTextStyle.value.fontWeight,
    fontStyle: newTextStyle.value.fontStyle,
    textAlign: newTextStyle.value.textAlign,
    opacity: newTextStyle.value.opacity,
    letterSpacing: 0,
    lineHeightMultiplier: 120,
    strokeEnabled: false,
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowColor: '#000000',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  })

  if (newTextObj) {
    newTextObj.fontWeight = newTextStyle.value.fontWeight
    newTextObj.fontStyle = newTextStyle.value.fontStyle
    newTextObj.textAlign = newTextStyle.value.textAlign

    const animation = buildAnimationConfig({
      typewriter: newTextTypewriter.value,
      fade: newTextFade.value,
      scale: newTextScale.value,
      slide: newTextSlide.value,
    })

    if (animation) {
      newTextObj.animation = animation

      if (newTextTypewriter.value.enabled) console.log('⌨️ Text mit Typewriter-Effekt erstellt')
      if (newTextFade.value.enabled) console.log('🌫️ Text mit Fade-Effekt erstellt')
      if (newTextScale.value.enabled) console.log('🔍 Text mit Scale-Effekt erstellt')
      if (newTextSlide.value.enabled) console.log('➡️ Text mit Slide-Effekt erstellt')
    }

    console.log('✅ Text erstellt mit Stil:', newTextStyle.value)
    toastStore.success(t('toast.textAdded'))
    emit('created', newTextObj)
  }

  isAddingNewText.value = false
  newTextContent.value = ''
  resetNewTextSettings()

  clearTextSelection()
  clearPositionPreview()
  resetNewTextPosition()
}

function cancelNewText() {
  isAddingNewText.value = false
  newTextContent.value = ''
  resetNewTextSettings()

  cancelTextSelectionOnCanvas()
  clearPositionPreview()
  textSelectionBounds.value = null

  emit('cancel')
}

function autoWrapText() {
  if (!newTextContent.value) return

  const maxCharsPerLine = 50
  const text = newTextContent.value.trim()
  const words = text.split(/\s+/)

  let lines = []
  let currentLine = ''

  words.forEach((word) => {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine.trim())
      currentLine = word
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word
    }
  })

  if (currentLine) {
    lines.push(currentLine.trim())
  }

  newTextContent.value = lines.join('\n')
}
</script>

<style scoped src="./text-new-form/textFormStyles.css"></style>
