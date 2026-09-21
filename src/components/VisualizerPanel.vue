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

      <!-- Steuerung (Ein/Aus, Farbe, Intensität, Reaktion, Position & Größe)
           liegt in einem eigenen Popover der Player-Leiste. Hier nur ein
           Schnellzugriff darauf plus der Hinweis, wenn der Visualizer aus ist. -->
      <div class="control-section controls-link-row">
        <button
          v-if="playerBar"
          type="button"
          class="controls-link"
          :class="{ active: playerBar.popover.isOpen('visualizerControls') }"
          @click="playerBar.popover.togglePopover('visualizerControls')"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"
            />
          </svg>
          {{ t('visualizer.openControls') }}
        </button>
        <span v-if="!store.showVisualizer" class="status-hint">{{ t('visualizer.disabled') }}</span>
      </div>

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
import { ref, inject } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useVisualizerStore } from '../stores/visualizerStore.js'
import HelpTooltip from './HelpTooltip.vue'
import VisualizerTypeList from './visualizer-panel/VisualizerTypeList.vue'

const { t } = useI18n()
const store = useVisualizerStore()
const searchQuery = ref('')
// Player-Leiste (Popover-Verwaltung); null, wenn das Panel außerhalb der
// Leiste gemountet wird – dann entfällt nur der Schnellzugriff-Button.
const playerBar = inject('playerBar', null)
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

/* Schnellzugriff auf das Steuerungs-Popover */
.controls-link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.controls-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #e9e9eb);
  font-size: 0.65rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.controls-link svg {
  width: 14px;
  height: 14px;
}

.controls-link:hover,
.controls-link.active {
  border-color: var(--accent-primary, #c9984d);
  background-color: rgba(201, 152, 77, 0.15);
}

.controls-link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ring);
}

.status-hint {
  font-size: 0.6rem;
  color: #ef4444;
  font-weight: 500;
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

[data-theme='light'] .controls-link {
  background-color: #f9f2d5;
  color: #003971;
  border-color: rgba(1, 79, 153, 0.3);
}

[data-theme='light'] .controls-link:hover,
[data-theme='light'] .controls-link.active {
  border-color: #014f99;
  background-color: rgba(1, 79, 153, 0.1);
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
