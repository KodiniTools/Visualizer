<template>
  <div class="tiles-section">
    <h5>{{ t('backgroundTiles.title') }}</h5>

    <!-- Aktivierung -->
    <div class="control-group">
      <UiSwitch
        :model-value="tilesStore.tilesEnabled"
        :label="t('backgroundTiles.enableTiles')"
        @update:model-value="setTilesEnabled"
      />
    </div>

    <Transition name="panel-collapse">
      <div v-show="tilesStore.tilesEnabled" class="tiles-controls">
        <!-- Kachelanzahl, Abstand & Vorschau -->
        <TileGridControls />

        <!-- Bearbeitung der ausgewählten Kachel -->
        <SelectedTileEditor v-if="tilesStore.selectedTile" />

        <!-- ✨ Kachel-Presets -->
        <TilePresetsSection />

        <!-- Alle Kacheln zurücksetzen -->
        <div class="control-group reset-all">
          <UiButton variant="danger" size="sm" block @click="resetAllTiles">
            {{ t('backgroundTiles.resetAllTiles') }}
          </UiButton>
        </div>
      </div>
    </Transition>

    <!-- Galerie-Modal -->
    <TileGalleryModal />
  </div>
</template>

<script setup>
import { provide } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useBackgroundTiles } from '../composables/useBackgroundTiles.js'
import { useTilePresets } from '../composables/useTilePresets.js'
import { useTileGallery } from '../composables/useTileGallery.js'
import UiSwitch from './ui/UiSwitch.vue'
import UiButton from './ui/UiButton.vue'

import TileGridControls from './background-tiles/TileGridControls.vue'
import SelectedTileEditor from './background-tiles/SelectedTileEditor.vue'
import TilePresetsSection from './background-tiles/TilePresetsSection.vue'
import TileGalleryModal from './background-tiles/TileGalleryModal.vue'

const { t } = useI18n()

// Kern-Logik: Store-Aktionen + Canvas-Redraw
const controls = useBackgroundTiles()
const { tilesStore, redraw, setTilesEnabled, resetAllTiles } = controls

// Galerie-Modal & Presets
const gallery = useTileGallery(tilesStore, redraw)
const presets = useTilePresets(tilesStore)

// An die Unterkomponenten weiterreichen
provide('tileControls', controls)
provide('tileGallery', gallery)
provide('tilePresets', presets)
</script>

<style scoped>
.tiles-section {
  margin-top: 16px;
  padding: 12px;
  background: color-mix(in srgb, var(--ds-success) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-success) 30%, transparent);
  border-radius: var(--ds-radius-md);
}

.tiles-section h5 {
  margin: 0 0 12px 0;
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-success);
}

.control-group {
  margin-bottom: 12px;
}

.tiles-controls {
  margin-top: 12px;
}

.reset-all {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--ds-success) 20%, transparent);
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .tiles-section {
  background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .tiles-section h5 {
  color: var(--accent-ink);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .tiles-section {
    padding: 10px;
  }

  .tiles-section h5 {
    font-size: var(--ds-text-xs);
  }
}
</style>
