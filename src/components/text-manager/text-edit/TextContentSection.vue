<template>
  <details class="collapsible-section" open>
    <summary class="section-header">
      <span class="section-icon">✏️</span>
      <span>{{ t('textManager.editText') }}</span>
    </summary>
    <div class="section-content">
      <!-- Text-Inhalt -->
      <div class="control-group text-content">
        <UiTextArea
          :ref="bindEditInput"
          v-model="selectedText.content"
          :label="t('textManager.layout.textLabel')"
          :placeholder="t('textManager.layout.multilinePlaceholder')"
          :hint="t('textManager.layout.multilineHint')"
          :rows="5"
          @input="updateText"
          @paste="handleEditPaste"
        />
        <div v-if="selectedText.content.includes('\n')" class="success-hint">
          {{
            t('textManager.layout.lineCount').replace(
              '{n}',
              selectedText.content.split('\n').length,
            )
          }}
        </div>
      </div>

      <!-- Schriftart -->
      <div class="control-group">
        <UiSelect
          v-model="selectedText.fontFamily"
          :options="fontOptions"
          :label="t('textManager.font')"
          size="sm"
          @change="updateText"
        />
      </div>

      <!-- Schriftgröße -->
      <div class="control-group">
        <label>{{ t('textManager.fontSize') }}: {{ selectedText.fontSize }}px</label>
        <SliderField
          v-model="selectedText.fontSize"
          :min="12"
          :max="200"
          :default-value="48"
          class="slider"
          @update:model-value="updateText"
        />
      </div>

      <!-- Deckkraft -->
      <div class="control-group">
        <label>{{ t('textManager.opacity') }}: {{ selectedText.opacity }}%</label>
        <SliderField
          v-model="selectedText.opacity"
          :min="0"
          :max="100"
          :default-value="100"
          class="slider"
          @update:model-value="updateText"
        />
      </div>

      <!-- Textfarbe -->
      <div class="control-group">
        <label>{{ t('textManager.textColor') }}:</label>
        <div class="color-picker-group">
          <ColorField
            v-model="selectedText.color"
            class="color-input"
            :label="t('textManager.textColor')"
            @update:model-value="updateText"
          />
          <input
            v-model="selectedText.color"
            type="text"
            class="color-text-input"
            placeholder="#ffffff"
            :aria-label="t('textManager.layout.colorHex')"
            @input="updateText"
          />
        </div>
      </div>

      <!-- Schriftstil -->
      <div class="control-group">
        <label>{{ t('textManager.style') }}:</label>
        <div class="button-group">
          <UiIconButton
            variant="secondary"
            size="sm"
            :label="t('textManager.bold')"
            :pressed="selectedText.fontWeight === 'bold'"
            @click="toggleFontWeight"
          >
            <strong aria-hidden="true">B</strong>
          </UiIconButton>
          <UiIconButton
            variant="secondary"
            size="sm"
            :label="t('textManager.italic')"
            :pressed="selectedText.fontStyle === 'italic'"
            @click="toggleFontStyle"
          >
            <em aria-hidden="true">I</em>
          </UiIconButton>
        </div>
      </div>

      <!-- Ausrichtung -->
      <div class="control-group">
        <label aria-hidden="true">{{ t('textManager.alignment') }}:</label>
        <UiSegmentedControl
          :model-value="selectedText.textAlign"
          :options="alignOptions"
          :label="t('textManager.alignment')"
          size="sm"
          @update:model-value="setTextAlign"
        />
      </div>
    </div>
  </details>
</template>

<script setup>
import SliderField from '../../ui/SliderField.vue'
import ColorField from '../../ui/ColorField.vue'
import { computed, inject } from 'vue'
import { useI18n } from '../../../lib/i18n'
import { UiIconButton, UiSegmentedControl, UiSelect, UiTextArea } from '../../ui/index.js'

const { t } = useI18n()
const tec = inject('textEditControls')
const {
  selectedText,
  updateText,
  handleEditPaste,
  toggleFontWeight,
  toggleFontStyle,
  setTextAlign,
  fontOptions,
} = tec

// Fokus/Cursor setzt useTextEditorWithChar direkt am <textarea>
function bindEditInput(component) {
  tec.editTextInput.value = component?.textarea ?? null
}

const alignOptions = computed(() =>
  ['left', 'center', 'right'].map((value) => ({ value, label: t(`textManager.${value}`) })),
)
</script>

<style scoped src="./text-edit-shared.css"></style>
<style scoped>
.text-content :deep(.ui-textarea__input) {
  min-height: 50px;
  line-height: 1.5;
  font-family: var(--ds-font-mono);
}
.success-hint {
  font-size: var(--ds-text-xs);
  color: var(--ds-success);
  margin-top: 3px;
  font-weight: var(--ds-weight-semibold);
  display: flex;
  align-items: center;
  gap: 4px;
}
/* Ui-Labels wie die übrigen Feld-Labels des Abschnitts (text-edit-shared.css) */
.control-group :deep(.ui-textarea__label),
.control-group :deep(.ui-select__label) {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: var(--ds-weight-medium);
}
.button-group :deep(.ui-icon-button) {
  font-size: var(--ds-text-sm);
}
</style>
