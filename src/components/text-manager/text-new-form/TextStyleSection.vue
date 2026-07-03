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
        <label>{{ t('textManager.font') }}:</label>
        <select ref="fontSelect" v-model="settings.fontFamily" class="select-input font-select">
          <!-- Wird dynamisch befüllt -->
        </select>
      </div>

      <!-- Schriftgröße -->
      <div class="control-group">
        <label>{{ t('textManager.fontSize') }}: {{ settings.fontSize }}px</label>
        <input
          v-model.number="settings.fontSize"
          type="range"
          min="12"
          max="200"
          class="slider"
          :disabled="settings.autoFit"
        />
      </div>

      <!-- Auto-Fit -->
      <div class="control-group">
        <label class="effect-checkbox">
          <input v-model="settings.autoFit" type="checkbox" />
          📐 {{ t('textManager.autoFit') }}
        </label>
        <div v-if="settings.autoFit" class="auto-fit-settings">
          <label>{{ t('textManager.autoFitPadding') }}: {{ settings.autoFitPadding }}%</label>
          <input
            v-model.number="settings.autoFitPadding"
            type="range"
            min="0"
            max="30"
            class="slider"
          />
        </div>
      </div>

      <!-- Textfarbe -->
      <div class="control-group">
        <label>{{ t('textManager.textColor') }}:</label>
        <div class="color-picker-group">
          <input v-model="settings.color" type="color" class="color-input" />
          <input
            v-model="settings.color"
            type="text"
            class="color-text-input"
            placeholder="#ff0000"
          />
        </div>
      </div>

      <!-- Deckkraft -->
      <div class="control-group">
        <label>{{ t('textManager.opacity') }}: {{ settings.opacity }}%</label>
        <input v-model.number="settings.opacity" type="range" min="0" max="100" class="slider" />
      </div>

      <!-- Schriftstil -->
      <div class="control-group">
        <label>{{ t('textManager.style') }}:</label>
        <div class="button-group">
          <button
            :class="['btn-small', { active: settings.fontWeight === 'bold' }]"
            @click="settings.fontWeight = settings.fontWeight === 'bold' ? 'normal' : 'bold'"
          >
            <strong>B</strong>
          </button>
          <button
            :class="['btn-small', { active: settings.fontStyle === 'italic' }]"
            @click="settings.fontStyle = settings.fontStyle === 'italic' ? 'normal' : 'italic'"
          >
            <em>I</em>
          </button>
        </div>
      </div>

      <!-- Ausrichtung -->
      <div class="control-group">
        <label>{{ t('textManager.alignment') }}:</label>
        <div class="button-group">
          <button
            :class="['btn-small', { active: settings.textAlign === 'left' }]"
            @click="settings.textAlign = 'left'"
          >
            {{ t('textManager.left') }}
          </button>
          <button
            :class="['btn-small', { active: settings.textAlign === 'center' }]"
            @click="settings.textAlign = 'center'"
          >
            {{ t('textManager.center') }}
          </button>
          <button
            :class="['btn-small', { active: settings.textAlign === 'right' }]"
            @click="settings.textAlign = 'right'"
          >
            {{ t('textManager.right') }}
          </button>
        </div>
      </div>

      <!-- Einstellungen speichern/laden -->
      <div class="settings-actions">
        <button
          class="btn-save"
          :title="
            locale === 'de'
              ? 'Aktuelle Einstellungen als Standard speichern'
              : 'Save current settings as default'
          "
          @click="$emit('save')"
        >
          💾 {{ t('textManager.saveAsDefault') }}
        </button>
        <button
          class="btn-reset-small"
          :title="
            locale === 'de' ? 'Auf Werkseinstellungen zurücksetzen' : 'Reset to factory settings'
          "
          @click="$emit('reset')"
        >
          🔄 {{ t('textManager.resetToDefault') }}
        </button>
      </div>
    </div>
  </details>
</template>

<script setup>
import { ref, inject, computed } from 'vue'
import { useI18n } from '../../../lib/i18n.js'
import { useTextFonts } from '../../../composables/useTextFonts.js'

const settings = defineModel('settings', {
  type: Object,
  required: true,
})

defineEmits(['save', 'reset'])

const { t, locale } = useI18n()
const canvasManager = inject('canvasManager')
const fontManager = inject('fontManager')

const fontSelect = ref(null)

// settings als ref-artige Quelle für das Font-Composable bereitstellen
const styleRef = computed(() => settings.value)

const { populateNewTextFontDropdown } = useTextFonts(
  canvasManager,
  fontManager,
  { value: null }, // fontSelectRef - hier nicht verwendet
  fontSelect,
  { value: null }, // selectedText - hier nicht verwendet
  styleRef,
)

defineExpose({ populateNewTextFontDropdown })
</script>

<style scoped src="./textFormStyles.css"></style>
