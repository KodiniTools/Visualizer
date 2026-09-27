<template>
  <!--
    Steuerung des aktiven Visualizers: Ein/Aus, Farbe, Intensität,
    Farbtransparenz, Reaktionsquelle (+ Formung), Bild für Portrait-Presets
    und Position & Größe. Früher der feste Kopfbereich des Visualizer-Panels;
    jetzt ein eigenes Popover der Player-Leiste, damit das Visualizer-Panel
    nur noch Suche und Auswahl zeigt.
  -->
  <div class="controls-panel">
    <!-- Ein/Aus, Farbe, Intensität, Farbtransparenz -->
    <VisualizerBasicsSection />

    <!-- Reaktionsquelle + Stärke + Formung -->
    <VisualizerReactSourceSection />

    <!-- Bild für Portrait-Presets -->
    <div v-if="selectedNeedsImage" class="control-section">
      <span class="section-label">{{ t('visualizer.image.label') }}</span>
      <VisualizerImagePicker
        :model-value="store.visualizerImageId"
        @update:model-value="store.setVisualizerImageId($event)"
      />
    </div>

    <!-- LED-Text / LED-Zahlen (Text, Uhrzeit, Countdown) -->
    <div v-if="selectedIsLedText" class="control-section">
      <span class="section-label">{{ t('visualizer.led.title') }}</span>
      <VisualizerLedTextSection
        :visualizer-id="store.selectedVisualizer"
        :config="store.ledConfig"
        @update="(field, value) => store.setLedConfig(field, value)"
      />
    </div>

    <!-- Position & Größe -->
    <VisualizerTransformSection />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useVisualizerStore } from '../stores/visualizerStore.js'
import { Visualizers } from '../lib/visualizers/index.js'
import VisualizerImagePicker from './VisualizerImagePicker.vue'
import VisualizerBasicsSection from './visualizer-panel/VisualizerBasicsSection.vue'
import VisualizerReactSourceSection from './visualizer-panel/VisualizerReactSourceSection.vue'
import VisualizerTransformSection from './visualizer-panel/VisualizerTransformSection.vue'
import VisualizerLedTextSection from './visualizer-panel/VisualizerLedTextSection.vue'
import { isLedTextVisualizer } from '../lib/visualizers/gl/ledTextSettings.js'

const { t } = useI18n()
const store = useVisualizerStore()
const selectedNeedsImage = computed(() => !!Visualizers[store.selectedVisualizer]?.needsImage)
const selectedIsLedText = computed(() => isLedTextVisualizer(store.selectedVisualizer))
</script>

<style scoped src="./visualizer-panel/visualizerPanelShared.css"></style>
<style scoped>
.controls-panel {
  display: flex;
  flex-direction: column;
}
</style>
