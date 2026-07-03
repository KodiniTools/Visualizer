<template>
  <!-- ✨ NEU: Position & Bereich (klappbar) -->
  <details class="collapsible-section" :open="selectionBounds !== null">
    <summary class="section-header">
      <span class="section-icon">📍</span>
      <span>Position &amp; Bereich</span>
      <span v-if="selectionBounds" class="status-badge active">Auswahl</span>
    </summary>
    <div class="section-content">
      <!-- Rechteck auf Canvas zeichnen -->
      <div class="control-group">
        <button
          :class="['btn-selection', 'full-width', { active: isSelecting }]"
          :disabled="isSelecting"
          @click="$emit('start-selection')"
        >
          <span v-if="isSelecting">✓ Zeichnen Sie ein Rechteck auf dem Canvas...</span>
          <span v-else>🖱️ Bereich auf Canvas markieren</span>
        </button>
        <div class="hint-text">
          Ziehen Sie ein Rechteck auf dem Canvas, um die Position des Textes festzulegen
        </div>
      </div>

      <!-- Auswahl-Info (nur wenn Auswahl vorhanden) -->
      <div v-if="selectionBounds" class="selection-info">
        <div class="selection-preview">
          <span class="selection-label">Ausgewählter Bereich:</span>
          <span class="selection-value"
            >{{ Math.round(selectionBounds.width) }} ×
            {{ Math.round(selectionBounds.height) }} px</span
          >
        </div>
        <button class="btn-small btn-clear" @click="$emit('clear-selection')">
          Auswahl löschen
        </button>
      </div>

      <!-- Manuelle Position X -->
      <div class="control-group">
        <label>Position X: {{ Math.round(position.x * 100) }}%</label>
        <input
          v-model.number="position.x"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="slider"
        />
        <input
          v-model.number="position.xPixel"
          type="number"
          class="number-input"
          :placeholder="'0 - ' + canvasWidth"
          @input="$emit('update-pixel', 'x')"
        />
        <span class="unit-label">px</span>
      </div>

      <!-- Manuelle Position Y -->
      <div class="control-group">
        <label>Position Y: {{ Math.round(position.y * 100) }}%</label>
        <input
          v-model.number="position.y"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="slider"
        />
        <input
          v-model.number="position.yPixel"
          type="number"
          class="number-input"
          :placeholder="'0 - ' + canvasHeight"
          @input="$emit('update-pixel', 'y')"
        />
        <span class="unit-label">px</span>
      </div>

      <!-- Schnellauswahl-Buttons -->
      <div class="control-group">
        <label>Schnellauswahl:</label>
        <div class="position-grid">
          <button class="btn-pos" title="Oben Links" @click="$emit('quick-position', 'top-left')">
            ↖
          </button>
          <button class="btn-pos" title="Oben Mitte" @click="$emit('quick-position', 'top-center')">
            ↑
          </button>
          <button class="btn-pos" title="Oben Rechts" @click="$emit('quick-position', 'top-right')">
            ↗
          </button>
          <button
            class="btn-pos"
            title="Mitte Links"
            @click="$emit('quick-position', 'middle-left')"
          >
            ←
          </button>
          <button class="btn-pos active" title="Zentrum" @click="$emit('quick-position', 'center')">
            ⊙
          </button>
          <button
            class="btn-pos"
            title="Mitte Rechts"
            @click="$emit('quick-position', 'middle-right')"
          >
            →
          </button>
          <button
            class="btn-pos"
            title="Unten Links"
            @click="$emit('quick-position', 'bottom-left')"
          >
            ↙
          </button>
          <button
            class="btn-pos"
            title="Unten Mitte"
            @click="$emit('quick-position', 'bottom-center')"
          >
            ↓
          </button>
          <button
            class="btn-pos"
            title="Unten Rechts"
            @click="$emit('quick-position', 'bottom-right')"
          >
            ↘
          </button>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup>
defineModel('position', {
  type: Object,
  required: true,
})

defineProps({
  selectionBounds: {
    type: Object,
    default: null,
  },
  isSelecting: {
    type: Boolean,
    default: false,
  },
  canvasWidth: {
    type: Number,
    default: 1920,
  },
  canvasHeight: {
    type: Number,
    default: 1080,
  },
})

defineEmits(['start-selection', 'clear-selection', 'update-pixel', 'quick-position'])
</script>

<style scoped src="./textFormStyles.css"></style>
