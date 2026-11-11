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
          data-popover-trigger
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

      <!-- Suchfeld + Favoriten-Umschalter -->
      <div class="control-section">
        <span class="section-label">{{ t('visualizer.search') }}</span>
        <div class="search-row">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('visualizer.searchPlaceholder')"
            class="search-input"
          />
          <UiButton
            class="favorites-toggle"
            :class="{ active: favoritesOnly }"
            variant="secondary"
            size="sm"
            :aria-pressed="favoritesOnly"
            :title="t('visualizer.showFavorites')"
            @click="favoritesOnly = !favoritesOnly"
          >
            <template #icon>
              <svg
                viewBox="0 0 24 24"
                :fill="favoritesOnly ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linejoin="round"
              >
                <path
                  d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"
                />
              </svg>
            </template>
            {{ t('visualizer.favorites') }}
            <span class="favorites-count">{{ favoritesStore.favoriteIds.length }}</span>
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Scrollbereich: Liste, Effekte, Layer -->
    <div class="panel-scroll">
      <!-- Kategorisierte Visualizer-Auswahl bzw. Suchergebnisse -->
      <VisualizerTypeList
        :search-query="searchQuery"
        :favorites-only="favoritesOnly"
        @show-all="favoritesOnly = false"
      />

      <!-- Effekte und Multi-Layer liegen in eigenen Popovern der Player-Leiste -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { useI18n } from '../lib/i18n'
import { useVisualizerStore } from '../stores/visualizerStore'
import { useVisualizerFavoritesStore } from '../stores/visualizerFavoritesStore'
import { UiButton } from './ui'
import HelpTooltip from './HelpTooltip.vue'
import VisualizerTypeList from './visualizer-panel/VisualizerTypeList.vue'
import type { PlayerBarContext } from './sticky-player-bar/playerBarContext'

const { t } = useI18n()
const store = useVisualizerStore()
const favoritesStore = useVisualizerFavoritesStore()
const searchQuery = ref('')
/** Nur Favoriten anzeigen (Bereich „Favoriten“ neben der Suche). */
const favoritesOnly = ref(false)
// Player-Leiste (Popover-Verwaltung); null, wenn das Panel außerhalb der
// Leiste gemountet wird – dann entfällt nur der Schnellzugriff-Button.
const playerBar = inject<PlayerBarContext | null>('playerBar', null)
</script>

<style scoped src="./visualizer-panel/visualizerPanelShared.css"></style>
<style scoped>
.panel-container {
  position: relative;
  background-color: var(--card-bg);
  border-radius: var(--ds-radius-md);
  padding: 10px;
  border: 1px solid var(--border-color);
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
  border-top: 1px solid var(--border-color);
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
  color: var(--text-primary);
  font-weight: var(--ds-weight-semibold);
  font-size: var(--ds-text-xs);
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
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
  cursor: pointer;
  transition:
    border-color var(--ds-duration) var(--ds-ease),
    background-color var(--ds-duration) var(--ds-ease);
}

.controls-link svg {
  width: 14px;
  height: 14px;
}

.controls-link:hover,
.controls-link.active {
  border-color: var(--accent-primary);
  background-color: var(--ds-accent-soft);
}

.controls-link:focus-visible {
  outline: none;
}

.status-hint {
  font-size: var(--ds-text-xs);
  color: var(--ds-danger);
  font-weight: var(--ds-weight-medium);
}

/* Suche + Favoriten-Umschalter in einer Zeile */
.search-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.favorites-toggle {
  flex-shrink: 0;
}

.favorites-toggle.active {
  border-color: var(--ds-accent);
  color: var(--ds-accent);
}

.favorites-count {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  background-color: var(--ds-accent-soft);
  padding: 1px 5px;
  border-radius: var(--ds-radius-md);
}

/* Search Input */
.search-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  padding: 6px 10px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
  outline: none;
  transition: border-color var(--ds-duration) var(--ds-ease);
}

.search-input:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
}

.search-input::placeholder {
  color: var(--text-muted);
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .panel-container {
  border-color: var(--border-color);
}

[data-theme='light'] .controls-link {
  border-color: var(--border-color);
}

[data-theme='light'] .controls-link:hover,
[data-theme='light'] .controls-link.active {
  background-color: color-mix(in srgb, var(--accent-primary) 10%, transparent);
}

[data-theme='light'] .search-input {
  border-color: var(--border-color);
}
</style>
