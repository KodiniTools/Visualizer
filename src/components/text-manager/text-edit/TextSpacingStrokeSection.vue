<template>
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">↔️</span>
      <span>Abstände &amp; Kontur</span>
      <span v-if="selectedText.stroke.enabled" class="status-badge active">{{
        t('textManager.outline')
      }}</span>
    </summary>
    <div class="section-content">
      <!-- Buchstabenabstand -->
      <div class="control-group">
        <label>Buchstabenabstand: {{ selectedText.letterSpacing }}px</label>
        <input
          type="range"
          v-model.number="selectedText.letterSpacing"
          @input="updateText"
          min="-20"
          max="50"
          class="slider"
        />
      </div>

      <!-- Zeilenabstand -->
      <div class="control-group">
        <label>Zeilenabstand: {{ selectedText.lineHeightMultiplier }}%</label>
        <input
          type="range"
          v-model.number="selectedText.lineHeightMultiplier"
          @input="updateText"
          min="100"
          max="300"
          class="slider"
        />
      </div>

      <!-- Text-Kontur -->
      <div class="control-group">
        <label>Text-Kontur:</label>
        <div class="button-group">
          <button
            @click="toggleStroke"
            :class="['btn-small', { active: selectedText.stroke.enabled }]"
          >
            {{
              selectedText.stroke.enabled
                ? t('textManager.activated')
                : t('textManager.deactivated')
            }}
          </button>
        </div>
      </div>

      <!-- Kontur-Einstellungen (nur wenn aktiviert) -->
      <div v-if="selectedText.stroke.enabled">
        <!-- Konturfarbe -->
        <div class="control-group">
          <label>{{ t('textManager.outlineColor') }}:</label>
          <div class="color-picker-group">
            <input
              type="color"
              v-model="selectedText.stroke.color"
              @input="updateText"
              class="color-input"
            />
            <input
              type="text"
              v-model="selectedText.stroke.color"
              @input="updateText"
              class="color-text-input"
              placeholder="#000000"
            />
          </div>
        </div>

        <!-- Konturdicke -->
        <div class="control-group">
          <label>{{ t('textManager.outlineWidth') }}: {{ selectedText.stroke.width }}px</label>
          <input
            type="range"
            v-model.number="selectedText.stroke.width"
            @input="updateText"
            min="1"
            max="100"
            class="slider"
          />
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
const { selectedText, updateText, toggleStroke } = tec
</script>

<style scoped src="./text-edit-shared.css"></style>
