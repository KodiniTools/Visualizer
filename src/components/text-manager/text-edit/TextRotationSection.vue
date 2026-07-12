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
        <input
          type="range"
          v-model.number="selectedText.rotation"
          @input="updateText"
          min="-180"
          max="180"
          class="slider"
        />
      </div>
    </div>
  </details>
</template>

<script setup>
import { inject } from 'vue'

const tec = inject('textEditControls')
const { selectedText, updateText } = tec
</script>

<style scoped src="./text-edit-shared.css"></style>
