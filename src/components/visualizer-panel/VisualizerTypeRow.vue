<template>
  <!-- Eine Zeile der Visualizer-Liste: Auswahl-Button + Stern (Favorit an/aus) -->
  <div class="viz-row">
    <button
      type="button"
      class="visualizer-btn"
      :class="{ active: !store.multiLayerMode && store.selectedVisualizer === viz.id }"
      @click="store.selectVisualizer(viz.id)"
    >
      {{ viz.name }}
    </button>
    <UiIconButton
      class="fav-toggle"
      :class="{ 'is-favorite': favorite }"
      size="sm"
      :pressed="favorite"
      :label="favorite ? t('visualizer.removeFavorite') : t('visualizer.addFavorite')"
      @click="favorites.toggleFavorite(viz.id)"
    >
      <svg
        viewBox="0 0 24 24"
        :fill="favorite ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z" />
      </svg>
    </UiIconButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useVisualizerStore } from '../../stores/visualizerStore'
import { useVisualizerFavoritesStore } from '../../stores/visualizerFavoritesStore'
import { UiIconButton } from '../ui'

const props = defineProps<{
  /** Visualizer-Eintrag aus dem Katalog (ID + lokalisierter Name). */
  viz: { id: string; name: string }
}>()

const { t } = useI18n()
const store = useVisualizerStore()
const favorites = useVisualizerFavoritesStore()

const favorite = computed(() => favorites.isFavorite(props.viz.id))
</script>

<style scoped src="./visualizerTypeButtons.css"></style>
<style scoped>
.viz-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.viz-row .visualizer-btn {
  flex: 1;
  min-width: 0;
}

/* Stern: ruhig, solange kein Favorit; gefüllt in Akzentfarbe als Favorit */
.viz-row .fav-toggle {
  color: var(--ds-text-3);
}

.viz-row .fav-toggle.ui-icon-button--pressed {
  border-color: transparent;
}

.viz-row .fav-toggle.is-favorite {
  color: var(--ds-accent);
}
</style>
