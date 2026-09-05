<template>
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">🌑</span>
      <span>{{ t('textManager.shadow') }}</span>
      <span
        v-if="
          selectedText.shadow.blur > 0 ||
          selectedText.shadow.offsetX !== 0 ||
          selectedText.shadow.offsetY !== 0
        "
        class="status-badge active"
        >{{ t('textManager.active') }}</span
      >
    </summary>
    <div class="section-content">
      <!-- Schattenfarbe -->
      <div class="control-group">
        <label>{{ t('textManager.shadowColor') }}:</label>
        <div class="color-picker-group">
          <ColorField
            v-model="selectedText.shadow.color"
            class="color-input"
            @update:model-value="updateText"
          />
          <input
            type="text"
            v-model="selectedText.shadow.color"
            @input="updateText"
            class="color-text-input"
            placeholder="#000000"
          />
        </div>
      </div>

      <!-- Schatten-Unschärfe -->
      <div class="control-group">
        <label>{{ t('textManager.shadowBlur') }}: {{ selectedText.shadow.blur }}px</label>
        <SliderField
          v-model="selectedText.shadow.blur"
          @update:model-value="updateText"
          :min="0"
          :max="50"
          :default-value="0"
          class="slider"
        />
      </div>

      <!-- Schatten X-Offset -->
      <div class="control-group">
        <label>{{ t('textManager.shadowX') }}-Offset: {{ selectedText.shadow.offsetX }}px</label>
        <SliderField
          v-model="selectedText.shadow.offsetX"
          @update:model-value="updateText"
          :min="-50"
          :max="50"
          :default-value="0"
          class="slider"
        />
      </div>

      <!-- Schatten Y-Offset -->
      <div class="control-group">
        <label>{{ t('textManager.shadowY') }}-Offset: {{ selectedText.shadow.offsetY }}px</label>
        <SliderField
          v-model="selectedText.shadow.offsetY"
          @update:model-value="updateText"
          :min="-50"
          :max="50"
          :default-value="0"
          class="slider"
        />
      </div>
    </div>
  </details>
</template>

<script setup>
import SliderField from '../../ui/SliderField.vue'
import ColorField from '../../ui/ColorField.vue'
import { inject } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

const { t } = useI18n()
const tec = inject('textEditControls')
const { selectedText, updateText } = tec
</script>

<style scoped src="./text-edit-shared.css"></style>
