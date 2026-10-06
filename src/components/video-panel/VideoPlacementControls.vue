<template>
  <div v-if="selectedVideoIndex !== null" class="placement-section">
    <div class="placement-header">
      <span>{{ locale === 'de' ? 'Platzierung' : 'Placement' }}</span>
    </div>

    <!-- Kompakte Einstellungen Grid -->
    <div class="placement-grid">
      <!-- Animation -->
      <div class="placement-row">
        <span class="placement-label">{{ locale === 'de' ? 'Effekt' : 'Effect' }}</span>
        <select v-model="selectedAnimation" class="placement-select">
          <option value="none">–</option>
          <option value="fade">Fade</option>
          <option value="slideLeft">← Slide</option>
          <option value="slideRight">→ Slide</option>
          <option value="slideUp">↑ Slide</option>
          <option value="slideDown">↓ Slide</option>
          <option value="zoom">Zoom</option>
          <option value="bounce">Bounce</option>
          <option value="spin">Spin</option>
          <option value="elastic">Elastic</option>
        </select>
      </div>

      <!-- Dauer (nur wenn Animation) -->
      <div v-if="selectedAnimation !== 'none'" class="placement-row">
        <span class="placement-label">{{ locale === 'de' ? 'Dauer' : 'Duration' }}</span>
        <div class="placement-slider-wrap">
          <SliderField
            v-model="animationDuration"
            :min="100"
            :max="5000"
            :step="100"
            :default-value="500"
            class="placement-slider"
          />
          <span class="placement-value">{{ (animationDuration / 1000).toFixed(1) }}s</span>
        </div>
      </div>

      <!-- Größe -->
      <div class="placement-row">
        <span class="placement-label">{{ locale === 'de' ? 'Größe' : 'Size' }}</span>
        <div class="placement-slider-wrap">
          <SliderField
            v-model="videoScale"
            :min="1"
            :max="8"
            :step="1"
            :default-value="3"
            class="placement-slider"
          />
          <span class="placement-value">{{ videoScale }}x</span>
        </div>
      </div>

      <!-- Loop & Muted -->
      <div class="placement-row placement-checkboxes">
        <label class="checkbox-label">
          <input type="checkbox" v-model="videoLoop" />
          <span>{{ locale === 'de' ? 'Wiederholen' : 'Loop' }}</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="videoMuted" />
          <span>{{ locale === 'de' ? 'Stumm' : 'Muted' }}</span>
        </label>
      </div>
    </div>

    <!-- Buttons -->
    <div class="placement-buttons">
      <button @click="addVideoDirectly" class="btn-placement btn-place">
        {{ locale === 'de' ? 'Platzieren' : 'Place' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import SliderField from '../ui/SliderField.vue'
import { inject } from 'vue'

const {
  locale,
  selectedVideoIndex,
  selectedAnimation,
  animationDuration,
  videoScale,
  videoLoop,
  videoMuted,
  addVideoDirectly,
} = inject('videoPanel')
</script>

<style scoped>
/* Placement Section */
.placement-section {
  margin-top: 8px;
  padding: 8px;
  background: var(--secondary-bg);
  border-radius: var(--ds-radius-sm);
  border: 1px solid var(--border-color);
}

.placement-header {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-primary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.placement-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.placement-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.placement-label {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  min-width: 40px;
  text-transform: uppercase;
}

.placement-select {
  flex: 1;
  padding: 4px 6px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
}

.placement-slider-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.placement-slider {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--text-muted);
  border-radius: var(--ds-radius-sm);
  outline: none;
}

.placement-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  background: var(--accent-tertiary);
  border: 2px solid var(--ds-surface-1);
  border-radius: var(--ds-radius-full);
  cursor: pointer;
}

.placement-value {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  min-width: 28px;
  text-align: right;
}

.placement-checkboxes {
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  accent-color: var(--accent-primary);
  width: 12px;
  height: 12px;
}

.placement-buttons {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.btn-placement {
  flex: 1;
  padding: 5px 8px;
  border: none;
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
  text-transform: uppercase;
}

.btn-place {
  background: var(--ds-accent-soft);
  border: 1px solid var(--ds-border);
  color: var(--accent-tertiary);
}

.btn-place:hover {
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
}

/* Light Theme */
[data-theme='light'] .placement-section {
  background: var(--card-bg);
  border-color: var(--border-color);
}

[data-theme='light'] .placement-select {
  background: var(--secondary-bg);
  border-color: var(--border-color);
}

[data-theme='light'] .placement-slider::-webkit-slider-thumb {
  background: var(--accent-primary);
  border-color: var(--card-bg);
}

[data-theme='light'] .btn-place {
  background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
  border: 1px solid var(--border-color);
  color: var(--accent-ink);
}

[data-theme='light'] .btn-place:hover {
  background: color-mix(in srgb, var(--accent-primary) 25%, transparent);
}
</style>
