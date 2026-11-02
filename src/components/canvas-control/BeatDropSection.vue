<template>
  <div class="panel-section">
    <div class="section-header-row">
      <h4>{{ t('beatDrop.title') }}</h4>
      <UiSwitch v-model="beatDropStore.enabled" :label="t('beatDrop.title')" label-hidden />
    </div>

    <div v-if="beatDropStore.enabled" class="beat-drop-body">
      <UiSelect
        v-model="beatDropStore.source"
        :label="t('beatDrop.source')"
        :options="sourceOptions"
        size="sm"
        inline
        class="beat-drop-source"
      />

      <section v-for="effect in BEAT_DROP_EFFECTS" :key="effect.key" class="beat-effect">
        <div class="beat-effect-row">
          <UiSwitch
            v-model="beatDropStore[effect.enabledKey]"
            :label="t(`beatDrop.${effect.key}`)"
          />
          <ColorField
            v-if="effect.colorKey"
            v-model="beatDropStore[effect.colorKey]"
            :label="t(`beatDrop.${effect.key}`)"
          />
        </div>
        <template v-if="beatDropStore[effect.enabledKey]">
          <SliderControl
            v-for="slider in effect.sliders"
            :key="slider.storeKey"
            v-model="beatDropStore[slider.storeKey]"
            :label="t(`beatDrop.${slider.label}`)"
            :min="slider.min"
            :max="slider.max"
            :default-value="slider.defaultValue"
            :value-text="`${beatDropStore[slider.storeKey]}${slider.unit}`"
          />
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ColorField from '../ui/ColorField.vue'
import SliderControl from '../ui/SliderControl.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiSwitch from '../ui/UiSwitch.vue'
import { useI18n } from '../../lib/i18n.js'
import { useBeatDropStore } from '../../stores/beatDropStore.js'

const { t } = useI18n()
const beatDropStore = useBeatDropStore()

const LEVEL_SOURCES = ['bass', 'mid', 'treble', 'volume', 'dynamic']
const ONSET_SOURCES = ['bassOnset', 'midOnset', 'trebleOnset', 'allOnset']

const sourceOptions = computed(() => [
  ...LEVEL_SOURCES.map((value) => ({ value, label: t(`beatDrop.sources.${value}`) })),
  {
    label: t('beatDrop.sources.onsetGroup'),
    options: ONSET_SOURCES.map((value) => ({ value, label: t(`beatDrop.sources.${value}`) })),
  },
])

const percent = (storeKey, defaultValue, label = 'intensity', min = 0) => ({
  storeKey,
  label,
  min,
  max: 100,
  defaultValue,
  unit: '%',
})

/** Effekte in Anzeige-Reihenfolge; Schlüssel = Felder im beatDropStore. */
const BEAT_DROP_EFFECTS = [
  {
    key: 'flash',
    enabledKey: 'flashEnabled',
    colorKey: 'flashColor',
    sliders: [percent('flashIntensity', 70), percent('flashDecay', 60, 'decay', 1)],
  },
  {
    key: 'colorBurst',
    enabledKey: 'colorBurstEnabled',
    colorKey: 'colorBurstColor',
    sliders: [percent('colorBurstIntensity', 60)],
  },
  {
    key: 'strobe',
    enabledKey: 'strobeEnabled',
    colorKey: null,
    sliders: [
      { storeKey: 'strobeRate', label: 'rate', min: 1, max: 30, defaultValue: 8, unit: ' Hz' },
      percent('strobeIntensity', 80),
    ],
  },
  {
    key: 'vignette',
    enabledKey: 'vignettePulseEnabled',
    colorKey: 'vignettePulseColor',
    sliders: [percent('vignettePulseIntensity', 70)],
  },
]
</script>

<style scoped>
.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--ds-space-2);
}

.section-header-row h4 {
  margin: 0;
}

.beat-drop-body {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

/* Auswahl füllt die Zeile */
.beat-drop-body > .ui-select :deep(.ui-select__control) {
  flex: 1;
}

.beat-effect {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
}

.beat-effect-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-2);
  min-height: var(--ds-control-sm);
}
</style>
