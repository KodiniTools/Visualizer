<template>
  <!--
    Formung der Reaktion – dieselben Regler wie "Audio-Reaktiv" beim Bild:
    Glättung, Audio-Pegel, Übergang, Beat-Verstärkung, Phase.
    Wird im Single-Modus (VisualizerReactSourceSection) und je Layer
    (VisualizerLayerPanel) verwendet; die Werte kommen als Objekt herein,
    Änderungen gehen als (Feld, Wert) hinaus.
  -->
  <div class="react-shape" :class="{ 'react-shape--compact': compact }">
    <!-- Glättung -->
    <div class="react-shape__row">
      <span class="react-shape__label">
        {{ t('visualizer.reactSource.smoothing') }}: {{ shape.reactSmoothing }}%
      </span>
      <SliderField
        class="react-shape__slider react-shape__slider--smoothing"
        :min="0"
        :max="100"
        :step="1"
        :default-value="DEFAULT_REACT_SHAPE.reactSmoothing"
        :model-value="shape.reactSmoothing"
        :aria-label="t('visualizer.reactSource.smoothing')"
        @update:model-value="emit('update', 'reactSmoothing', $event)"
      />
    </div>

    <!-- Audio-Pegel (Gain) -->
    <div class="react-shape__row">
      <span class="react-shape__label">
        {{ t('visualizer.reactSource.gain') }}: {{ shape.reactGain }}%
      </span>
      <SliderField
        class="react-shape__slider react-shape__slider--gain"
        :min="0"
        :max="REACT_GAIN_MAX"
        :step="5"
        :default-value="DEFAULT_REACT_SHAPE.reactGain"
        :model-value="shape.reactGain"
        :aria-label="t('visualizer.reactSource.gain')"
        @update:model-value="emit('update', 'reactGain', $event)"
      />
    </div>

    <!-- Übergang (Easing) -->
    <div class="react-shape__row">
      <span class="react-shape__label">{{ t('visualizer.reactSource.easing') }}</span>
      <select
        class="react-shape__select"
        :value="shape.reactEasing"
        :aria-label="t('visualizer.reactSource.easing')"
        @change="emit('update', 'reactEasing', $event.target.value)"
      >
        <option v-for="e in REACT_EASINGS" :key="e" :value="e">{{ EASING_LABELS[e] }}</option>
      </select>
    </div>

    <!-- Beat-Verstärkung -->
    <div class="react-shape__row">
      <span class="react-shape__label">
        {{ t('visualizer.reactSource.beatBoost') }}: {{ beatBoostLabel }}
      </span>
      <SliderField
        class="react-shape__slider react-shape__slider--beat-boost"
        :min="1"
        :max="REACT_BEAT_BOOST_MAX"
        :step="0.1"
        :default-value="DEFAULT_REACT_SHAPE.reactBeatBoost"
        :model-value="shape.reactBeatBoost"
        :aria-label="t('visualizer.reactSource.beatBoost')"
        @update:model-value="emit('update', 'reactBeatBoost', $event)"
      />
    </div>

    <!-- Phase -->
    <div class="react-shape__row">
      <span class="react-shape__label">
        {{ t('visualizer.reactSource.phase') }}: {{ shape.reactPhase }}°
      </span>
      <SliderField
        class="react-shape__slider react-shape__slider--phase"
        :min="0"
        :max="360"
        :step="5"
        :default-value="DEFAULT_REACT_SHAPE.reactPhase"
        :model-value="shape.reactPhase"
        :aria-label="t('visualizer.reactSource.phase')"
        @update:model-value="emit('update', 'reactPhase', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SliderField from '../ui/SliderField.vue'
import { useI18n } from '../../lib/i18n.js'
import {
  REACT_EASINGS,
  DEFAULT_REACT_SHAPE,
  REACT_GAIN_MAX,
  REACT_BEAT_BOOST_MAX,
  normalizeReactShape,
} from '../../lib/visualizers/core/reactSource.js'

const props = defineProps({
  /** Objekt mit reactSmoothing/reactGain/reactEasing/reactBeatBoost/reactPhase (Store oder Layer). */
  settings: { type: Object, required: true },
  /** Kompakte Darstellung (Layer-Popover). */
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['update'])

const { t } = useI18n()

// Anzeige-Namen wie im Bild-Panel (dort ebenfalls nicht übersetzt).
const EASING_LABELS = {
  linear: 'Linear',
  easeIn: 'Ease In',
  easeOut: 'Ease Out',
  easeInOut: 'Ease In/Out',
  bounce: 'Bounce',
  elastic: 'Elastic',
  punch: 'Punch',
}

// Fehlende Felder (ältere Layer/Presets) → Standardwerte für die Anzeige.
const shape = computed(() => normalizeReactShape(props.settings))

const beatBoostLabel = computed(() =>
  shape.value.reactBeatBoost <= 1
    ? t('visualizer.reactSource.beatBoostOff')
    : `×${shape.value.reactBeatBoost.toFixed(1)}`,
)
</script>

<style scoped>
.react-shape {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.react-shape__row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.react-shape__label {
  display: block;
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.react-shape--compact .react-shape__label {
  font-size: 0.55rem;
  text-transform: none;
  letter-spacing: 0;
}

.react-shape__slider {
  width: 100%;
  height: 5px;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(
    90deg,
    var(--accent-primary, #c9984d) 0%,
    var(--accent-secondary, #d4b483) 100%
  );
}

.react-shape--compact .react-shape__slider {
  height: 4px;
  border-radius: 2px;
}

.react-shape__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.react-shape__slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.react-shape__select {
  width: 100%;
  background-color: var(--secondary-bg, #0e1c32);
  color: var(--text-primary, #e9e9eb);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 0.65rem;
  cursor: pointer;
}

.react-shape--compact .react-shape__select {
  font-size: 0.6rem;
}

.react-shape__select:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
}

[data-theme='light'] .react-shape__label {
  color: #4d6d8e;
}

[data-theme='light'] .react-shape__select {
  background-color: #f9f2d5;
  color: #003971;
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .react-shape__select:focus {
  border-color: #014f99;
}
</style>
