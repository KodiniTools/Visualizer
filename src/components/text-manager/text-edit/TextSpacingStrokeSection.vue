<template>
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">↔️</span>
      <span>{{ t('textManager.layout.spacingAndOutline') }}</span>
      <span v-if="selectedText.stroke.enabled" class="status-badge active">{{
        t('textManager.outline')
      }}</span>
    </summary>
    <div class="section-content">
      <!-- Buchstabenabstand -->
      <div class="control-group">
        <label
          >{{ t('textManager.layout.letterSpacing') }}: {{ selectedText.letterSpacing }}px</label
        >
        <SliderField
          v-model="selectedText.letterSpacing"
          :min="-20"
          :max="50"
          :default-value="0"
          class="slider"
          @update:model-value="updateText"
        />
      </div>

      <!-- Zeilenabstand -->
      <div class="control-group">
        <label
          >{{ t('textManager.layout.lineHeight') }}: {{ selectedText.lineHeightMultiplier }}%</label
        >
        <SliderField
          v-model="selectedText.lineHeightMultiplier"
          :min="100"
          :max="300"
          :default-value="120"
          class="slider"
          @update:model-value="updateText"
        />
      </div>

      <!-- Text-Kontur -->
      <div class="control-group">
        <label>{{ t('textManager.layout.textOutline') }}:</label>
        <div class="button-group">
          <button
            :class="['btn-small', { active: selectedText.stroke.enabled }]"
            @click="toggleStroke"
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
            <ColorField
              v-model="selectedText.stroke.color"
              class="color-input"
              @update:model-value="updateText"
            />
            <input
              v-model="selectedText.stroke.color"
              type="text"
              class="color-text-input"
              placeholder="#000000"
              @input="updateText"
            />
          </div>
        </div>

        <!-- Konturdicke -->
        <div class="control-group">
          <label>{{ t('textManager.outlineWidth') }}: {{ selectedText.stroke.width }}px</label>
          <SliderField
            v-model="selectedText.stroke.width"
            :min="1"
            :max="100"
            :default-value="2"
            class="slider"
            @update:model-value="updateText"
          />
        </div>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import SliderField from '../../ui/SliderField.vue'
import ColorField from '../../ui/ColorField.vue'
import { inject } from 'vue'
import type { TextEditControls } from './textEditControls'
import { useI18n } from '../../../lib/i18n'

const { t } = useI18n()
const tec = inject('textEditControls') as TextEditControls
const { selectedText, updateText, toggleStroke } = tec
</script>

<style scoped src="./text-edit-shared.css"></style>
