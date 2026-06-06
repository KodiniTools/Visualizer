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
          <input
            type="range"
            v-model.number="animationDuration"
            min="100"
            max="5000"
            step="100"
            class="placement-slider"
          />
          <span class="placement-value">{{ (animationDuration / 1000).toFixed(1) }}s</span>
        </div>
      </div>

      <!-- Größe -->
      <div class="placement-row">
        <span class="placement-label">{{ locale === 'de' ? 'Größe' : 'Size' }}</span>
        <div class="placement-slider-wrap">
          <input
            type="range"
            v-model.number="videoScale"
            min="1"
            max="8"
            step="1"
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
  background: var(--secondary-bg, #0e1c32);
  border-radius: 6px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.placement-header {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-primary, #e9e9eb);
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
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  min-width: 40px;
  text-transform: uppercase;
}

.placement-select {
  flex: 1;
  padding: 4px 6px;
  background: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.55rem;
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
  background: linear-gradient(
    90deg,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  border-radius: 2px;
  outline: none;
}

.placement-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  background: var(--accent-tertiary, #f8e1a9);
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
}

.placement-value {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
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
  font-size: 0.55rem;
  color: var(--text-primary, #e9e9eb);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  accent-color: var(--accent-primary, #c9984d);
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
  border-radius: 5px;
  font-size: 0.55rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.btn-place {
  background: rgba(201, 152, 77, 0.2);
  border: 1px solid rgba(201, 152, 77, 0.3);
  color: var(--accent-tertiary, #f8e1a9);
}

.btn-place:hover {
  transform: translateY(-1px);
  background: rgba(201, 152, 77, 0.3);
}

/* Light Theme */
[data-theme='light'] .placement-section {
  background: #ffffff;
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .placement-header {
  color: #003971;
}

[data-theme='light'] .placement-label {
  color: #4d6d8e;
}

[data-theme='light'] .placement-select {
  background: #f9f2d5;
  border-color: rgba(1, 79, 153, 0.3);
  color: #003971;
}

[data-theme='light'] .placement-slider {
  background: linear-gradient(90deg, #4d6d8e 0%, #014f99 100%);
}

[data-theme='light'] .placement-slider::-webkit-slider-thumb {
  background: #c9984d;
  border-color: #ffffff;
}

[data-theme='light'] .placement-value {
  color: #4d6d8e;
}

[data-theme='light'] .checkbox-label {
  color: #003971;
}

[data-theme='light'] .checkbox-label input[type='checkbox'] {
  accent-color: #014f99;
}

[data-theme='light'] .btn-place {
  background: rgba(1, 79, 153, 0.15);
  border: 1px solid rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-place:hover {
  background: rgba(1, 79, 153, 0.25);
}
</style>
