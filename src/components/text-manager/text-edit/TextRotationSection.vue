<template>
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">🔄</span>
      <span>Rotation</span>
      <span v-if="selectedText.rotation !== 0" class="status-badge"
        >{{ selectedText.rotation }}°</span
      >
    </summary>
    <div class="section-content">
      <div class="control-group">
        <label>Rotation: {{ selectedText.rotation }}°</label>
        <SliderField
          v-model="selectedText.rotation"
          @update:model-value="updateText"
          :min="-180"
          :max="180"
          :default-value="0"
          class="slider"
        />
      </div>
    </div>
  </details>
</template>

<script setup>
import SliderField from '../../ui/SliderField.vue'
import { inject } from 'vue'

const tec = inject('textEditControls')
const { selectedText, updateText } = tec
</script>

<style scoped src="./text-edit-shared.css"></style>
