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
        :placeholder="t('textManager.textPlaceholder')"
        rows="8"
        @keydown.esc="cancelNewText"
        @paste="handlePasteForNewText"
      ></textarea>
      <div class="hint-text">
        {{ t('textManager.browserTextTip') }}
      </div>
      <div class="hint-text" style="margin-top: 4px">
        {{ t('textManager.notepadTip') }}
      </div>
      <div v-if="newTextContent.includes('\n')" class="success-hint">
        {{ t('textManager.linesDetected').replace('{n}', newTextContent.split('\n').length) }}
      </div>
    </div>

    <TextStyleSection
      ref="styleSectionRef"
      v-model:settings="newTextStyle"
      @save="saveCurrentSettings"
      @reset="clearSavedSettings"
    />

    <!-- Einfach hinzufügen: Text ohne Animation/Effekt zum Canvas -->
    <div class="control-group add-plain-group">
      <button
        class="btn-primary full-width"
        :disabled="!newTextContent.trim()"
        :title="t('textManager.addToCanvasPlainTitle')"
        @click="createNewText(NO_ANIMATION)"
      >
        {{ t('textManager.addToCanvasPlain') }}
      </button>
    </div>

    <TypewriterSection
      v-model:settings="newTextTypewriter"
      :can-add="!!newTextContent.trim()"
      @add="createNewText('typewriter')"
    />

    <FadeSection
      v-model:settings="newTextFade"
      :can-add="!!newTextContent.trim()"
      @add="createNewText('fade')"
    />

    <ScaleSection
      v-model:settings="newTextScale"
      :can-add="!!newTextContent.trim()"
      @add="createNewText('scale')"
    />

    <SlideSection
      v-model:settings="newTextSlide"
      :can-add="!!newTextContent.trim()"
      @add="createNewText('slide')"
    />

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

    <div class="hint-text add-animation-hint">
      {{ t('textManager.layout.addTextHint') }}
    </div>

    <div class="button-row">
      <button
        class="btn-primary"
        :disabled="!newTextContent.trim()"
        @click="createNewText(NO_ANIMATION)"
      >
        {{ t('textManager.addToCanvasPlain') }}
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

const { t } = useI18n()
const toastStore = useToastStore()
const canvasManager = inject('canvasManager')

const emit = defineEmits(['created', 'cancel'])

const isAddingNewText = ref(false)
const newTextContent = ref('')
const newTextInput = ref(null)
const styleSectionRef = ref(null)

const {
  newTextStyle,
  newTextShadow,
  newTextStroke,
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

// Kennung für "Text ohne Effekt hinzufügen" (keine Animation anwenden)
const NO_ANIMATION = 'none'

// Baut eine Animations-Konfiguration mit NUR der angegebenen Animation.
function buildSoloAnimation(animationKey) {
  const settingsByKey = {
    typewriter: newTextTypewriter,
    fade: newTextFade,
    scale: newTextScale,
    slide: newTextSlide,
  }
  const payload = {}
  for (const key of ['typewriter', 'fade', 'scale', 'slide']) {
    payload[key] = { ...settingsByKey[key].value, enabled: key === animationKey }
  }
  return buildAnimationConfig(payload)
}

function createNewText(animationKey = null) {
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
    letterSpacing: newTextStyle.value.letterSpacing ?? 0,
    lineHeightMultiplier: newTextStyle.value.lineHeightMultiplier ?? 120,
    rotation: newTextStyle.value.rotation ?? 0,
    strokeEnabled: newTextStroke.value.enabled,
    strokeColor: newTextStroke.value.color,
    strokeWidth: newTextStroke.value.width,
    shadowColor: newTextShadow.value.color,
    shadowBlur: newTextShadow.value.blur,
    shadowOffsetX: newTextShadow.value.offsetX,
    shadowOffsetY: newTextShadow.value.offsetY,
  })

  if (newTextObj) {
    newTextObj.fontWeight = newTextStyle.value.fontWeight
    newTextObj.fontStyle = newTextStyle.value.fontStyle
    newTextObj.textAlign = newTextStyle.value.textAlign

    // 'none' → Text bewusst ohne Effekt hinzufügen (auch wenn Effekte aktiviert sind)
    // Sonst: nur die gewählte Animation anwenden (Button pro Animation)
    let animation = null
    if (animationKey && animationKey !== NO_ANIMATION) {
      animation = buildSoloAnimation(animationKey)
    } else if (!animationKey) {
      animation = buildAnimationConfig({
        typewriter: newTextTypewriter.value,
        fade: newTextFade.value,
        scale: newTextScale.value,
        slide: newTextSlide.value,
      })
    }

    if (animation) {
      newTextObj.animation = animation

      if (animation.typewriter?.enabled) console.log('⌨️ Text mit Typewriter-Effekt erstellt')
      if (animation.fade?.enabled) console.log('🌫️ Text mit Fade-Effekt erstellt')
      if (animation.scale?.enabled) console.log('🔍 Text mit Scale-Effekt erstellt')
      if (animation.slide?.enabled) console.log('➡️ Text mit Slide-Effekt erstellt')
    } else {
      console.log('📝 Text ohne Effekt erstellt')
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
