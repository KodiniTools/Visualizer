<template>
  <!-- ✨ Text-Stil Einstellungen (klappbar) -->
  <details class="collapsible-section" open>
    <summary class="section-header">
      <span class="section-icon">🎨</span>
      <span>{{ t('textManager.textStyle') }}</span>
    </summary>
    <div class="section-content">
      <!-- Schriftart -->
      <div class="control-group">
        <UiSelect
          v-model="settings.fontFamily"
          :options="newTextFontOptions"
          :label="t('textManager.font')"
          size="sm"
        />
      </div>

      <!-- Schriftgröße -->
      <div class="control-group">
        <label>{{ t('textManager.fontSize') }}: {{ settings.fontSize }}px</label>
        <SliderField
          v-model="settings.fontSize"
          :min="12"
          :max="200"
          :default-value="48"
          class="slider"
          :disabled="settings.autoFit"
        />
      </div>

      <!-- Auto-Fit -->
      <div class="control-group">
        <UiSwitch v-model="settings.autoFit" :label="t('textManager.autoFit')" />
        <div v-if="settings.autoFit" class="auto-fit-settings">
          <label>{{ t('textManager.autoFitPadding') }}: {{ settings.autoFitPadding }}%</label>
          <SliderField
            v-model="settings.autoFitPadding"
            :min="0"
            :max="30"
            :default-value="10"
            class="slider"
          />
        </div>
      </div>

      <!-- Textfarbe -->
      <div class="control-group">
        <label>{{ t('textManager.textColor') }}:</label>
        <div class="color-picker-group">
          <ColorField
            v-model="settings.color"
            class="color-input"
            :label="t('textManager.textColor')"
          />
          <input
            v-model="settings.color"
            type="text"
            class="color-text-input"
            placeholder="#ff0000"
            :aria-label="t('textManager.layout.colorHex')"
          />
        </div>
      </div>

      <!-- Deckkraft -->
      <div class="control-group">
        <label>{{ t('textManager.opacity') }}: {{ settings.opacity }}%</label>
        <SliderField
          v-model="settings.opacity"
          :min="0"
          :max="100"
          :default-value="100"
          class="slider"
        />
      </div>

      <!-- Schriftstil -->
      <div class="control-group">
        <label>{{ t('textManager.style') }}:</label>
        <div class="button-group">
          <UiIconButton
            variant="secondary"
            size="sm"
            :label="t('textManager.bold')"
            :pressed="settings.fontWeight === 'bold'"
            @click="settings.fontWeight = settings.fontWeight === 'bold' ? 'normal' : 'bold'"
          >
            <strong aria-hidden="true">B</strong>
          </UiIconButton>
          <UiIconButton
            variant="secondary"
            size="sm"
            :label="t('textManager.italic')"
            :pressed="settings.fontStyle === 'italic'"
            @click="settings.fontStyle = settings.fontStyle === 'italic' ? 'normal' : 'italic'"
          >
            <em aria-hidden="true">I</em>
          </UiIconButton>
        </div>
      </div>

      <!-- Ausrichtung -->
      <div class="control-group">
        <label aria-hidden="true">{{ t('textManager.alignment') }}:</label>
        <UiSegmentedControl
          v-model="settings.textAlign"
          :options="alignOptions"
          :label="t('textManager.alignment')"
          size="sm"
        />
      </div>

      <!-- Einstellungen speichern/laden -->
      <div class="settings-actions">
        <UiButton
          size="sm"
          class="btn-save-settings"
          :title="t('textManager.saveAsDefaultTitle')"
          @click="$emit('save')"
        >
          {{ t('textManager.saveAsDefault') }}
        </UiButton>
        <UiButton
          variant="ghost"
          size="sm"
          :title="t('textManager.resetToDefaultTitle')"
          @click="$emit('reset')"
        >
          {{ t('textManager.resetToDefault') }}
        </UiButton>
      </div>
    </div>
  </details>
</template>

<script setup>
import SliderField from '../../ui/SliderField.vue'
import ColorField from '../../ui/ColorField.vue'
import { inject, computed } from 'vue'
import { useI18n } from '../../../lib/i18n'
import { useTextFonts } from '../../../composables/useTextFonts'
import { UiButton, UiIconButton, UiSegmentedControl, UiSelect, UiSwitch } from '../../ui/index.js'

const settings = defineModel('settings', {
  type: Object,
  required: true,
})

defineEmits(['save', 'reset'])

const { t } = useI18n()
const canvasManager = inject('canvasManager')
const fontManager = inject('fontManager')

const { newTextFontOptions, populateNewTextFontDropdown } = useTextFonts(
  canvasManager,
  fontManager,
  { value: null }, // fontSelectRef - hier nicht verwendet
  { value: null }, // newTextFontSelectRef - Schriftwahl kommt als newTextFontOptions
  { value: null }, // selectedText - hier nicht verwendet
  { value: null }, // newTextStyle - hier nicht verwendet
)

const alignOptions = computed(() =>
  ['left', 'center', 'right'].map((value) => ({ value, label: t(`textManager.${value}`) })),
)

// Auffrischen der Schriftliste (z. B. nach geladenen Fonts) für TextNewForm
defineExpose({ populateNewTextFontDropdown })
</script>

<style scoped src="./textFormStyles.css"></style>
<style scoped>
/* Ui-Labels wie die übrigen Feld-Labels des Formulars (textFormStyles.css) */
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
.btn-save-settings {
  flex: 1;
}
</style>
