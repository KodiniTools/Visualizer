<template>
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">🔄</span>
      <span>{{ t('textManager.rotation') }}</span>
      <span v-if="selectedText.rotation !== 0" class="status-badge"
        >{{ selectedText.rotation }}°</span
      >
    </summary>
    <div class="section-content">
      <div class="control-group">
        <label>{{ t('textManager.rotation') }}: {{ selectedText.rotation }}°</label>
        <SliderField
          v-model="selectedText.rotation"
          :min="-180"
          :max="180"
          :default-value="0"
          class="slider"
          @update:model-value="updateText"
        />
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { useI18n } from '../../../lib/i18n'
import SliderField from '../../ui/SliderField.vue'
import { inject } from 'vue'
import type { TextEditControls } from './textEditControls'

const { t } = useI18n()

const tec = inject('textEditControls') as TextEditControls
const { selectedText, updateText } = tec
</script>

<style scoped src="./text-edit-shared.css"></style>
