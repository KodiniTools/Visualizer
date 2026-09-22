<template>
  <div class="fx-section">
    <div v-if="!layerId" class="fx-header">
      <span class="section-label">{{ L.title }}</span>
    </div>

    <!-- Bloom / Glow -->
    <div class="fx-row">
      <label class="fx-toggle">
        <input
          type="checkbox"
          :checked="fx.bloomEnabled"
          @change="set('bloomEnabled', $event.target.checked)"
        />
        <span>{{ L.bloom }}</span>
      </label>
    </div>

    <div v-if="fx.bloomEnabled" class="fx-sub">
      <div class="fx-control">
        <span class="control-label">{{ L.strength }}: {{ fx.bloomStrength.toFixed(2) }}</span>
        <SliderField
          :min="0"
          :max="2"
          :step="0.05"
          :default-value="0.55"
          :model-value="fx.bloomStrength"
          @update:model-value="set('bloomStrength', $event)"
          class="slider fx-slider"
        />
      </div>
      <div class="fx-control">
        <span class="control-label"
          >{{ L.threshold }}: {{ Math.round(fx.bloomThreshold * 100) }}%</span
        >
        <SliderField
          :min="0"
          :max="1"
          :step="0.01"
          :default-value="0.35"
          :model-value="fx.bloomThreshold"
          @update:model-value="set('bloomThreshold', $event)"
          class="slider fx-slider"
        />
      </div>
      <div class="fx-control">
        <span class="control-label">{{ L.radius }}: {{ fx.bloomRadius }}px</span>
        <SliderField
          :min="1"
          :max="32"
          :step="1"
          :default-value="8"
          :model-value="fx.bloomRadius"
          @update:model-value="set('bloomRadius', $event)"
          class="slider fx-slider"
        />
      </div>
    </div>

    <!-- Trails / Afterimages -->
    <div class="fx-row">
      <label class="fx-toggle">
        <input
          type="checkbox"
          :checked="fx.trailsEnabled"
          @change="set('trailsEnabled', $event.target.checked)"
        />
        <span>{{ L.trails }}</span>
      </label>
    </div>

    <div v-if="fx.trailsEnabled" class="fx-sub">
      <div class="fx-control">
        <span class="control-label"
          >{{ L.trailLength }}: {{ Math.round(fx.trailsDecay * 100) }}%</span
        >
        <SliderField
          :min="0"
          :max="0.97"
          :step="0.01"
          :default-value="0.85"
          :model-value="fx.trailsDecay"
          @update:model-value="set('trailsDecay', $event)"
          class="slider fx-slider"
        />
      </div>
    </div>

    <!-- Beat-Punch (global onset zoom) -->
    <div class="fx-row">
      <label class="fx-toggle">
        <input
          type="checkbox"
          :checked="fx.beatPunchEnabled"
          @change="set('beatPunchEnabled', $event.target.checked)"
        />
        <span>{{ L.beatPunch }}</span>
      </label>
      <span class="fx-hint">{{ L.beatPunchHint }}</span>
    </div>

    <div v-if="fx.beatPunchEnabled" class="fx-sub">
      <div class="fx-control">
        <span class="control-label">{{ L.punchSource }}</span>
        <select
          :value="fx.beatPunchSource"
          @change="set('beatPunchSource', $event.target.value)"
          class="fx-select"
        >
          <option value="bass">{{ L.bass }}</option>
          <option value="mid">{{ L.mid }}</option>
          <option value="treble">{{ L.treble }}</option>
          <option value="all">{{ L.all }}</option>
        </select>
      </div>
      <div class="fx-control">
        <span class="control-label">{{ L.strength }}: {{ fx.beatPunchStrength }}%</span>
        <SliderField
          :min="0"
          :max="100"
          :step="5"
          :default-value="50"
          :model-value="fx.beatPunchStrength"
          @update:model-value="set('beatPunchStrength', $event)"
          class="slider fx-slider"
        />
      </div>
    </div>

    <!-- Onset flourishes (beat-triggered effects in flagship visualizers) -->
    <div class="fx-row">
      <label class="fx-toggle">
        <input
          type="checkbox"
          :checked="fx.onsetFlourishEnabled"
          @change="set('onsetFlourishEnabled', $event.target.checked)"
        />
        <span>{{ L.onsetFx }}</span>
      </label>
      <span class="fx-hint">{{ L.onsetFxHint }}</span>
    </div>

    <div v-if="fx.onsetFlourishEnabled" class="fx-sub">
      <div class="fx-control">
        <span class="control-label">{{ L.strength }}: {{ fx.onsetFlourishStrength }}%</span>
        <SliderField
          :min="0"
          :max="100"
          :step="5"
          :default-value="70"
          :model-value="fx.onsetFlourishStrength"
          @update:model-value="set('onsetFlourishStrength', $event)"
          class="slider fx-slider"
        />
      </div>
    </div>

    <!-- Adaptive quality -->
    <div v-if="!layerId" class="fx-row">
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
import SliderField from './ui/SliderField.vue'
import { computed } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useVisualizerStore } from '../stores/visualizerStore.js'

const props = defineProps({
  /**
   * Ohne layerId bedient das Panel die globalen Post-Processing-Einstellungen
   * (bisheriges Verhalten). Mit layerId bearbeitet es die Effekte genau dieses
   * Layers; sie wirken zusätzlich zu den globalen.
   */
  layerId: {
    type: String,
    default: null,
  },
})

const store = useVisualizerStore()
const { locale } = useI18n()

const layer = computed(() =>
  props.layerId ? store.visualizerLayers.find((l) => l.id === props.layerId) || null : null,
)

// Aktuelle Werte: entweder die Effekte des Layers oder die globalen Felder.
const fx = computed(() => {
  if (props.layerId) return store.layerEffects(layer.value)
  return {
    bloomEnabled: store.bloomEnabled,
    bloomStrength: store.bloomStrength,
    bloomThreshold: store.bloomThreshold,
    bloomRadius: store.bloomRadius,
    trailsEnabled: store.trailsEnabled,
    trailsDecay: store.trailsDecay,
    beatPunchEnabled: store.beatPunchEnabled,
    beatPunchSource: store.beatPunchSource,
    beatPunchStrength: store.beatPunchStrength,
    onsetFlourishEnabled: store.onsetFlourishEnabled,
    onsetFlourishStrength: store.onsetFlourishStrength,
  }
})

const SETTERS = {
  bloomEnabled: 'setBloomEnabled',
  bloomStrength: 'setBloomStrength',
  bloomThreshold: 'setBloomThreshold',
  bloomRadius: 'setBloomRadius',
  trailsEnabled: 'setTrailsEnabled',
  trailsDecay: 'setTrailsDecay',
  beatPunchEnabled: 'setBeatPunchEnabled',
  beatPunchSource: 'setBeatPunchSource',
  beatPunchStrength: 'setBeatPunchStrength',
  onsetFlourishEnabled: 'setOnsetFlourishEnabled',
  onsetFlourishStrength: 'setOnsetFlourishStrength',
}

function set(key, value) {
  if (props.layerId) {
    store.updateLayerEffect(props.layerId, key, value)
    return
  }
  store[SETTERS[key]]?.(value)
}

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
    beatPunch: 'Beat-Punch',
    beatPunchHint: 'Onset-Zoom der ganzen Ebene – reagiert auf Beats, nicht auf Dauerlautstärke',
    punchSource: 'Quelle',
    bass: 'Bass',
    mid: 'Mitten',
    treble: 'Höhen',
    all: 'Alle',
    onsetFx: 'Onset-Flourishes',
    onsetFxHint: 'Beat-getriggerte Effekte (Partikel-Burst, Blüten-Pop, Grid-Punch, Orb-Pop)',
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
    beatPunch: 'Beat punch',
    beatPunchHint: 'Onset zoom of the whole layer – reacts to beats, not sustained loudness',
    punchSource: 'Source',
    bass: 'Bass',
    mid: 'Mid',
    treble: 'Treble',
    all: 'All',
    onsetFx: 'Onset flourishes',
    onsetFxHint: 'Beat-triggered effects (particle burst, bloom pop, grid punch, orb pop)',
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

.fx-select {
  width: 100%;
  padding: 4px 6px;
  font-size: 0.6rem;
  color: var(--text-primary, #e9e9eb);
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  cursor: pointer;
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
