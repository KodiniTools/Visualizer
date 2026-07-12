<template>
  <details class="collapsible-section" open>
    <summary class="section-header">
      <span class="section-icon">✏️</span>
      <span>{{ t('textManager.editText') }}</span>
    </summary>
    <div class="section-content">
      <!-- Text-Inhalt -->
      <div class="control-group">
        <label>Text:</label>
        <textarea
          :ref="tec.editTextInput"
          v-model="selectedText.content"
          @input="updateText"
          @paste="handleEditPaste"
          class="text-area"
          placeholder="Mehrzeiliger Text wird unterstützt..."
          rows="5"
        ></textarea>
        <div class="hint-text">Enter für Zeilenumbrüche oder mehrzeiligen Text einfügen</div>
        <div v-if="selectedText.content.includes('\n')" class="success-hint">
          {{ selectedText.content.split('\n').length }} Zeilen
        </div>
      </div>

      <!-- Schriftart -->
      <div class="control-group">
        <label>{{ t('textManager.font') }}:</label>
        <select
          :ref="tec.fontSelect"
          v-model="selectedText.fontFamily"
          @change="updateText"
          class="select-input font-select"
        >
          <!-- Wird dynamisch befüllt -->
        </select>
      </div>

      <!-- Schriftgröße -->
      <div class="control-group">
        <label>Größe: {{ selectedText.fontSize }}px</label>
        <input
          type="range"
          v-model.number="selectedText.fontSize"
          @input="updateText"
          min="12"
          max="200"
          class="slider"
        />
      </div>

      <!-- Deckkraft -->
      <div class="control-group">
        <label>Deckkraft: {{ selectedText.opacity }}%</label>
        <input
          type="range"
          v-model.number="selectedText.opacity"
          @input="updateText"
          min="0"
          max="100"
          class="slider"
        />
      </div>

      <!-- Textfarbe -->
      <div class="control-group">
        <label>{{ t('textManager.textColor') }}:</label>
        <div class="color-picker-group">
          <input
            type="color"
            v-model="selectedText.color"
            @input="updateText"
            class="color-input"
          />
          <input
            type="text"
            v-model="selectedText.color"
            @input="updateText"
            class="color-text-input"
            placeholder="#ffffff"
          />
        </div>
      </div>

      <!-- Schriftstil -->
      <div class="control-group">
        <label>{{ t('textManager.style') }}:</label>
        <div class="button-group">
          <button
            @click="toggleFontWeight"
            :class="['btn-small', { active: selectedText.fontWeight === 'bold' }]"
          >
            <strong>B</strong>
          </button>
          <button
            @click="toggleFontStyle"
            :class="['btn-small', { active: selectedText.fontStyle === 'italic' }]"
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
            @click="setTextAlign('left')"
            :class="['btn-small', { active: selectedText.textAlign === 'left' }]"
          >
            {{ t('textManager.left') }}
          </button>
          <button
            @click="setTextAlign('center')"
            :class="['btn-small', { active: selectedText.textAlign === 'center' }]"
          >
            {{ t('textManager.center') }}
          </button>
          <button
            @click="setTextAlign('right')"
            :class="['btn-small', { active: selectedText.textAlign === 'right' }]"
          >
            {{ t('textManager.right') }}
          </button>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const tec = inject('textEditControls')
const {
  selectedText,
  updateText,
  handleEditPaste,
  toggleFontWeight,
  toggleFontStyle,
  setTextAlign,
} = tec
</script>

<style scoped src="./text-edit-shared.css"></style>
<style scoped>
.font-select {
  max-height: 400px;
}
.font-select option {
  padding: 6px;
}
.text-area {
  min-height: 50px;
  line-height: 1.5;
  font-family: 'Courier New', monospace;
}
.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  margin-top: 3px;
  line-height: 1.4;
}
.success-hint {
  font-size: 0.5rem;
  color: #4ade80;
  margin-top: 3px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}
[data-theme='light'] .success-hint {
  color: #16a34a;
}

@media (max-width: 768px) {
  .text-area {
    min-height: 44px;
    font-size: 0.8rem;
  }
}
@media (max-width: 480px) {
  .text-area {
    min-height: 50px;
    font-size: 0.85rem;
  }
}
</style>
