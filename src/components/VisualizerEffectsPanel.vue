<template>
  <div class="fx-section">
    <div v-if="!layerId" class="fx-header">
      <span class="section-label">{{ t('visualizer.postFx.title') }}</span>
    </div>

    <!-- Bloom / Glow -->
    <div class="fx-row">
      <UiSwitch
        :model-value="fx.bloomEnabled"
        class="fx-toggle"
        :label="t('visualizer.postFx.bloom')"
        @update:model-value="set('bloomEnabled', $event)"
      />
    </div>

    <div v-if="fx.bloomEnabled" class="fx-sub">
      <div class="fx-control">
        <span class="control-label"
          >{{ t('visualizer.postFx.strength') }}: {{ fx.bloomStrength.toFixed(2) }}</span
        >
        <SliderField
          :min="0"
          :max="2"
          :step="0.05"
          :default-value="0.55"
          :model-value="fx.bloomStrength"
          class="slider fx-slider"
          @update:model-value="set('bloomStrength', $event)"
        />
      </div>
      <div class="fx-control">
        <span class="control-label"
          >{{ t('visualizer.postFx.threshold') }}: {{ Math.round(fx.bloomThreshold * 100) }}%</span
        >
        <SliderField
          :min="0"
          :max="1"
          :step="0.01"
          :default-value="0.35"
          :model-value="fx.bloomThreshold"
          class="slider fx-slider"
          @update:model-value="set('bloomThreshold', $event)"
        />
      </div>
      <div class="fx-control">
        <span class="control-label"
          >{{ t('visualizer.postFx.radius') }}: {{ fx.bloomRadius }}px</span
        >
        <SliderField
          :min="1"
          :max="32"
          :step="1"
          :default-value="8"
          :model-value="fx.bloomRadius"
          class="slider fx-slider"
          @update:model-value="set('bloomRadius', $event)"
        />
      </div>
    </div>

    <!-- Trails / Afterimages -->
    <div class="fx-row">
      <UiSwitch
        :model-value="fx.trailsEnabled"
        class="fx-toggle"
        :label="t('visualizer.postFx.trails')"
        @update:model-value="set('trailsEnabled', $event)"
      />
    </div>

    <div v-if="fx.trailsEnabled" class="fx-sub">
      <div class="fx-control">
        <span class="control-label"
          >{{ t('visualizer.postFx.trailLength') }}: {{ Math.round(fx.trailsDecay * 100) }}%</span
        >
        <SliderField
          :min="0"
          :max="0.97"
          :step="0.01"
          :default-value="0.85"
          :model-value="fx.trailsDecay"
          class="slider fx-slider"
          @update:model-value="set('trailsDecay', $event)"
        />
      </div>
    </div>

    <!-- Beat-Punch (global onset zoom) -->
    <div class="fx-row">
      <UiSwitch
        :model-value="fx.beatPunchEnabled"
        class="fx-toggle"
        :label="t('visualizer.postFx.beatPunch')"
        @update:model-value="set('beatPunchEnabled', $event)"
      />
      <span class="fx-hint">{{ t('visualizer.postFx.beatPunchHint') }}</span>
    </div>

    <div v-if="fx.beatPunchEnabled" class="fx-sub">
      <div class="fx-control">
        <span class="control-label" aria-hidden="true">{{
          t('visualizer.postFx.punchSource')
        }}</span>
        <UiSegmentedControl
          :model-value="fx.beatPunchSource"
          :options="sourceOptions"
          :label="t('visualizer.postFx.punchSource')"
          size="sm"
          @update:model-value="set('beatPunchSource', $event)"
        />
      </div>
      <div class="fx-control">
        <span class="control-label"
          >{{ t('visualizer.postFx.strength') }}: {{ fx.beatPunchStrength }}%</span
        >
        <SliderField
          :min="0"
          :max="100"
          :step="5"
          :default-value="50"
          :model-value="fx.beatPunchStrength"
          class="slider fx-slider"
          @update:model-value="set('beatPunchStrength', $event)"
        />
      </div>
      <div class="fx-control">
        <span class="control-label"
          >{{ t('visualizer.postFx.variation') }}: {{ store.beatPunchVariation }}%</span
        >
        <SliderField
          :min="0"
          :max="100"
          :step="5"
          :default-value="0"
          :model-value="store.beatPunchVariation"
          class="slider fx-slider"
          @update:model-value="store.setBeatPunchVariation($event)"
        />
        <span class="fx-hint">{{ t('visualizer.postFx.variationHint') }}</span>
      </div>
    </div>

    <!-- Onset flourishes (beat-triggered effects in flagship visualizers) -->
    <div class="fx-row">
      <UiSwitch
        :model-value="fx.onsetFlourishEnabled"
        class="fx-toggle"
        :label="t('visualizer.postFx.onsetFx')"
        @update:model-value="set('onsetFlourishEnabled', $event)"
      />
      <span class="fx-hint">{{ t('visualizer.postFx.onsetFxHint') }}</span>
    </div>

    <div v-if="fx.onsetFlourishEnabled" class="fx-sub">
      <div class="fx-control">
        <span class="control-label"
          >{{ t('visualizer.postFx.strength') }}: {{ fx.onsetFlourishStrength }}%</span
        >
        <SliderField
          :min="0"
          :max="100"
          :step="5"
          :default-value="70"
          :model-value="fx.onsetFlourishStrength"
          class="slider fx-slider"
          @update:model-value="set('onsetFlourishStrength', $event)"
        />
      </div>
    </div>

    <!-- Adaptive quality -->
    <div v-if="!layerId" class="fx-row">
      <UiSwitch
        :model-value="store.adaptiveQuality"
        class="fx-toggle"
        :label="t('visualizer.postFx.adaptive')"
        @update:model-value="store.setAdaptiveQuality($event)"
      />
      <span class="fx-hint">{{ t('visualizer.postFx.adaptiveHint') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import SliderField from './ui/SliderField.vue'
import { UiSegmentedControl, UiSwitch } from './ui'
import { computed } from 'vue'
import { useI18n } from '../lib/i18n'
import { useVisualizerStore } from '../stores/visualizerStore'

const props = withDefaults(
  defineProps<{
    /**
     * Ohne layerId bedient das Panel die globalen Post-Processing-Einstellungen
     * (bisheriges Verhalten). Mit layerId bearbeitet es die Effekte genau dieses
     * Layers; sie wirken zusätzlich zu den globalen.
     */
    layerId?: string | null
  }>(),
  { layerId: null },
)

const store = useVisualizerStore()
const { t } = useI18n()

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

const SETTERS: Record<string, string> = {
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

function set(key: string, value: unknown) {
  if (props.layerId) {
    store.updateLayerEffect(props.layerId, key, value)
    return
  }
  const setter = SETTERS[key]
  if (setter)
    (store as unknown as Record<string, ((v: unknown) => void) | undefined>)[setter]?.(value)
}

// Quelle des Beat-Punch als Segmented Control
const sourceOptions = computed(() =>
  ['bass', 'mid', 'treble', 'all'].map((value) => ({
    value,
    label: t(`visualizer.postFx.${value}`),
  })),
)
</script>

<style scoped>
.fx-section {
  margin-bottom: 10px;
  background-color: var(--ds-accent-soft);
  border-radius: var(--ds-radius-sm);
  padding: 8px;
  border: 1px solid var(--border-color);
}

.fx-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-label {
  display: block;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  font-weight: var(--ds-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.fx-row {
  margin-bottom: 6px;
}

.fx-hint {
  display: block;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-top: 2px;
  margin-left: 40px;
  font-style: italic;
}

.fx-sub {
  padding: 4px 0 8px 40px;
}

.fx-control {
  margin-bottom: 6px;
}

.fx-control:last-child {
  margin-bottom: 0;
}

.control-label {
  display: block;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-bottom: 3px;
  font-weight: var(--ds-weight-medium);
}

.slider {
  width: 100%;
  height: 5px;
  border-radius: var(--ds-radius-sm);
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.fx-slider {
  background: var(--secondary-bg);
}

.fx-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: var(--accent-tertiary);
  cursor: pointer;
  border: 2px solid var(--ds-surface-1);
  transition: all var(--ds-duration) var(--ds-ease);
}

.fx-slider::-webkit-slider-thumb:hover {
  background: var(--accent-primary);
}

.fx-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: var(--accent-tertiary);
  cursor: pointer;
  border: 2px solid var(--ds-surface-1);
  transition: all var(--ds-duration) var(--ds-ease);
}

[data-theme='light'] .fx-section {
  background-color: color-mix(in srgb, var(--accent-primary) 5%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .section-label,
[data-theme='light'] .control-label,
[data-theme='light'] .fx-hint {
  color: var(--text-muted);
}

[data-theme='light'] .fx-slider::-webkit-slider-thumb {
  background: var(--accent-primary);
}

[data-theme='light'] .fx-slider::-moz-range-thumb {
  background: var(--accent-primary);
}
</style>
