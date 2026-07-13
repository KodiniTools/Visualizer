<template>
  <div class="fx-section">
    <div class="fx-header">
      <span class="section-label">{{ L.title }}</span>
      <span class="fx-badge" :title="L.badgeHint">✨</span>
    </div>

    <!-- Bloom / Glow -->
    <div class="fx-row">
      <label class="fx-toggle">
        <input
          type="checkbox"
          :checked="store.bloomEnabled"
          @change="store.setBloomEnabled($event.target.checked)"
        />
        <span>{{ L.bloom }}</span>
      </label>
    </div>

    <div v-if="store.bloomEnabled" class="fx-sub">
      <div class="fx-control">
        <span class="control-label">{{ L.strength }}: {{ store.bloomStrength.toFixed(2) }}</span>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          :value="store.bloomStrength"
          @input="store.setBloomStrength(parseFloat($event.target.value))"
          class="slider fx-slider"
        />
      </div>
      <div class="fx-control">
        <span class="control-label"
          >{{ L.threshold }}: {{ Math.round(store.bloomThreshold * 100) }}%</span
        >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="store.bloomThreshold"
          @input="store.setBloomThreshold(parseFloat($event.target.value))"
          class="slider fx-slider"
        />
      </div>
      <div class="fx-control">
        <span class="control-label">{{ L.radius }}: {{ store.bloomRadius }}px</span>
        <input
          type="range"
          min="1"
          max="32"
          step="1"
          :value="store.bloomRadius"
          @input="store.setBloomRadius(parseInt($event.target.value))"
          class="slider fx-slider"
        />
      </div>
    </div>

    <!-- Trails / Afterimages -->
    <div class="fx-row">
      <label class="fx-toggle">
        <input
          type="checkbox"
          :checked="store.trailsEnabled"
          @change="store.setTrailsEnabled($event.target.checked)"
        />
        <span>{{ L.trails }}</span>
      </label>
    </div>

    <div v-if="store.trailsEnabled" class="fx-sub">
      <div class="fx-control">
        <span class="control-label"
          >{{ L.trailLength }}: {{ Math.round(store.trailsDecay * 100) }}%</span
        >
        <input
          type="range"
          min="0"
          max="0.97"
          step="0.01"
          :value="store.trailsDecay"
          @input="store.setTrailsDecay(parseFloat($event.target.value))"
          class="slider fx-slider"
        />
      </div>
    </div>

    <!-- Adaptive quality -->
    <div class="fx-row">
      <label class="fx-toggle">
        <input
          type="checkbox"
          :checked="store.adaptiveQuality"
          @change="store.setAdaptiveQuality($event.target.checked)"
        />
        <span>{{ L.adaptive }}</span>
      </label>
      <span class="fx-hint">{{ L.adaptiveHint }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useVisualizerStore } from '../stores/visualizerStore.js'

const store = useVisualizerStore()
const { locale } = useI18n()

const LABELS = {
  de: {
    title: 'Effekte (Post-Processing)',
    badgeHint: 'GPU-beschleunigt mit automatischem Fallback',
    bloom: 'Bloom / Glühen',
    strength: 'Stärke',
    threshold: 'Schwelle',
    radius: 'Radius',
    trails: 'Bewegungsspuren',
    trailLength: 'Länge',
    adaptive: 'Adaptive Qualität',
    adaptiveHint: 'hält die Bildrate stabil',
  },
  en: {
    title: 'Effects (Post-Processing)',
    badgeHint: 'GPU-accelerated with automatic fallback',
    bloom: 'Bloom / Glow',
    strength: 'Strength',
    threshold: 'Threshold',
    radius: 'Radius',
    trails: 'Motion trails',
    trailLength: 'Length',
    adaptive: 'Adaptive quality',
    adaptiveHint: 'keeps the frame rate stable',
  },
}

const L = computed(() => LABELS[locale.value === 'en' ? 'en' : 'de'])
</script>

<style scoped>
.fx-section {
  margin-bottom: 10px;
  background-color: rgba(201, 152, 77, 0.05);
  border-radius: 5px;
  padding: 8px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
}

.fx-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-label {
  display: block;
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.fx-badge {
  font-size: 0.7rem;
  cursor: help;
}

.fx-row {
  margin-bottom: 6px;
}

.fx-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.65rem;
  color: var(--text-primary, #e9e9eb);
  font-weight: 500;
}

.fx-toggle input {
  accent-color: var(--accent-primary, #c9984d);
  cursor: pointer;
}

.fx-hint {
  display: block;
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  margin-top: 2px;
  margin-left: 22px;
  font-style: italic;
}

.fx-sub {
  padding: 4px 0 8px 22px;
}

.fx-control {
  margin-bottom: 6px;
}

.fx-control:last-child {
  margin-bottom: 0;
}

.control-label {
  display: block;
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  margin-bottom: 3px;
  font-weight: 500;
}

.slider {
  width: 100%;
  height: 5px;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.fx-slider {
  background: linear-gradient(
    to right,
    var(--secondary-bg, #0e1c32) 0%,
    var(--accent-primary, #c9984d) 100%
  );
}

.fx-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.fx-slider::-webkit-slider-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.fx-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

[data-theme='light'] .fx-section {
  background-color: rgba(1, 79, 153, 0.05);
  border-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .section-label,
[data-theme='light'] .control-label,
[data-theme='light'] .fx-hint {
  color: #4d6d8e;
}

[data-theme='light'] .fx-toggle {
  color: #003971;
}

[data-theme='light'] .fx-slider {
  background: linear-gradient(to right, #f9f2d5 0%, #014f99 100%);
}

[data-theme='light'] .fx-slider::-webkit-slider-thumb {
  background: #014f99;
}

[data-theme='light'] .fx-slider::-moz-range-thumb {
  background: #014f99;
}
</style>
