<template>
  <div class="panel-container">
    <!-- Fester Bereich: Regler und Suche bleiben immer sichtbar -->
    <div class="panel-fixed">
      <div class="panel-header">
        <h4>{{ t('visualizer.title') }}</h4>
        <HelpTooltip
          :title="t('visualizer.helpTitle')"
          :text="t('visualizer.helpText')"
          :tip="t('visualizer.helpTip')"
          position="left"
          :large="true"
        />
      </div>

      <!-- Ein/Aus, Farbe, Intensität, Farbtransparenz -->
      <VisualizerBasicsSection />

      <!-- Reaktionsquelle + Stärke -->
      <VisualizerReactSourceSection />

      <!-- Bild für Portrait-Presets -->
      <div v-if="selectedNeedsImage" class="control-section">
        <span class="section-label">{{ t('visualizer.image.label') }}</span>
        <VisualizerImagePicker
          :model-value="store.visualizerImageId"
          @update:model-value="store.setVisualizerImageId($event)"
        />
      </div>

      <!-- Position & Größe -->
      <VisualizerTransformSection />

      <!-- Suchfeld -->
      <div class="control-section">
        <span class="section-label">{{ t('visualizer.search') }}</span>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('visualizer.searchPlaceholder')"
          class="search-input"
        />
      </div>
    </div>

    <!-- Scrollbereich: Liste, Effekte, Layer -->
    <div class="panel-scroll">
      <!-- Kategorisierte Visualizer-Auswahl bzw. Suchergebnisse -->
      <VisualizerTypeList :search-query="searchQuery" />

      <!-- Effekte und Multi-Layer liegen in eigenen Popovern der Player-Leiste -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useVisualizerStore } from '../stores/visualizerStore.js'
import { Visualizers } from '../lib/visualizers/index.js'
import HelpTooltip from './HelpTooltip.vue'
import VisualizerImagePicker from './VisualizerImagePicker.vue'
import VisualizerBasicsSection from './visualizer-panel/VisualizerBasicsSection.vue'
import VisualizerReactSourceSection from './visualizer-panel/VisualizerReactSourceSection.vue'
import VisualizerTransformSection from './visualizer-panel/VisualizerTransformSection.vue'
import VisualizerTypeList from './visualizer-panel/VisualizerTypeList.vue'

const { t } = useI18n()
const store = useVisualizerStore()
const searchQuery = ref('')
const selectedNeedsImage = computed(() => !!Visualizers[store.selectedVisualizer]?.needsImage)
</script>

<style scoped src="./visualizer-panel/visualizerPanelShared.css"></style>
<style scoped>
.panel-container {
  position: relative;
  background-color: var(--card-bg, #142640);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  /* Zweigeteilt: der Kopf (Regler + Suche) bleibt stehen, nur der Bereich mit
     der Visualizer-Liste scrollt. Wirkt, sobald der Container eine begrenzte
     Höhe hat (z. B. im Player-Popover); ohne Begrenzung stapelt sich alles wie
     bisher. */
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-fixed {
  flex: 0 0 auto;
}

.panel-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-top: 4px;
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  margin-top: 4px;
  scrollbar-width: thin;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

h4 {
  margin: 0;
  color: var(--text-primary, #e9e9eb);
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* Search Input */
.search-input {
  width: 100%;
  padding: 6px 10px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.65rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ring);
  border-color: var(--accent-primary, #c9984d);
}

.search-input::placeholder {
  color: var(--text-muted, #7a8da0);
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .panel-container {
  background-color: #ffffff;
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] h4 {
  color: #003971;
}

[data-theme='light'] h4::before {
  filter: brightness(0);
}

[data-theme='light'] .search-input {
  background-color: #f9f2d5;
  color: #003971;
  border-color: rgba(1, 79, 153, 0.3);
}

[data-theme='light'] .search-input:focus-visible {
  border-color: #014f99;
}

[data-theme='light'] .search-input::placeholder {
  color: #4d6d8e;
}
</style>
