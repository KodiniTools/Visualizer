<template>
  <details class="collapsible-section">
    <summary class="section-header">
      <span class="section-icon">📍</span>
      <span>Position</span>
    </summary>
    <div class="section-content">
      <!-- Position X -->
      <div class="control-group">
        <label>Position X: {{ Math.round(selectedText.relX * 100) }}%</label>
        <input
          type="range"
          v-model.number="selectedText.relX"
          @input="updateText"
          min="0"
          max="1"
          step="0.01"
          class="slider"
        />
        <input
          type="number"
          :value="Math.round(selectedText.relX * canvasWidth)"
          @input="handleUpdateSelectedTextPixelPosition('x', $event)"
          class="number-input"
          :placeholder="'0 - ' + canvasWidth"
        />
        <span class="unit-label">px</span>
      </div>

      <!-- Position Y -->
      <div class="control-group">
        <label>Position Y: {{ Math.round(selectedText.relY * 100) }}%</label>
        <input
          type="range"
          v-model.number="selectedText.relY"
          @input="updateText"
          min="0"
          max="1"
          step="0.01"
          class="slider"
        />
        <input
          type="number"
          :value="Math.round(selectedText.relY * canvasHeight)"
          @input="handleUpdateSelectedTextPixelPosition('y', $event)"
          class="number-input"
          :placeholder="'0 - ' + canvasHeight"
        />
        <span class="unit-label">px</span>
      </div>

      <!-- Schnellauswahl-Buttons -->
      <div class="control-group">
        <label>Schnellauswahl:</label>
        <div class="position-grid">
          <button
            @click="handleSetSelectedTextQuickPosition('top-left')"
            class="btn-pos"
            title="Oben Links"
          >
            ↖
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('top-center')"
            class="btn-pos"
            title="Oben Mitte"
          >
            ↑
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('top-right')"
            class="btn-pos"
            title="Oben Rechts"
          >
            ↗
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('middle-left')"
            class="btn-pos"
            title="Mitte Links"
          >
            ←
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('center')"
            class="btn-pos"
            title="Zentrum"
          >
            ⊙
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('middle-right')"
            class="btn-pos"
            title="Mitte Rechts"
          >
            →
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('bottom-left')"
            class="btn-pos"
            title="Unten Links"
          >
            ↙
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('bottom-center')"
            class="btn-pos"
            title="Unten Mitte"
          >
            ↓
          </button>
          <button
            @click="handleSetSelectedTextQuickPosition('bottom-right')"
            class="btn-pos"
            title="Unten Rechts"
          >
            ↘
          </button>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup>
import { inject } from 'vue'

const tec = inject('textEditControls')
const {
  selectedText,
  canvasWidth,
  canvasHeight,
  updateText,
  handleUpdateSelectedTextPixelPosition,
  handleSetSelectedTextQuickPosition,
} = tec
</script>

<style scoped src="./text-edit-shared.css"></style>
<style scoped>
.number-input {
  width: 70px;
  padding: 6px 8px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  margin-left: 8px;
}
.number-input:focus {
  border-color: #6ea8fe;
  outline: none;
}
.unit-label {
  color: var(--text-muted);
  font-size: 11px;
  margin-left: 4px;
}
.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-top: 8px;
}
.btn-pos {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-pos:hover {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--card-bg) 100%);
  border-color: #6ea8fe;
  color: #6ea8fe;
}
.btn-pos.active {
  background: linear-gradient(135deg, #3a5a8a 0%, #2a4a7a 100%);
  border-color: #6ea8fe;
  color: #6ea8fe;
}

[data-theme='light'] .number-input {
  background-color: #ffffff;
  border: 1px solid rgba(1, 79, 153, 0.2);
  color: #003971;
}
[data-theme='light'] .number-input:focus {
  border-color: #014f99;
}
[data-theme='light'] .unit-label {
  color: #4d6d8e;
}
[data-theme='light'] .btn-pos {
  background: linear-gradient(135deg, #ffffff 0%, #f9f2d5 100%);
  border: 1px solid rgba(1, 79, 153, 0.15);
  color: #4d6d8e;
}
[data-theme='light'] .btn-pos:hover {
  background: linear-gradient(135deg, #f9f2d5 0%, #ffffff 100%);
  border-color: #014f99;
  color: #014f99;
}
[data-theme='light'] .btn-pos.active {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.1) 0%, rgba(1, 79, 153, 0.06) 100%);
  border-color: #014f99;
  color: #014f99;
}

@media (max-width: 768px) {
  .btn-pos {
    min-height: 36px;
    min-width: 36px;
  }
}
@media (max-width: 480px) {
  .btn-pos {
    min-height: 40px;
    min-width: 40px;
  }
}
</style>
