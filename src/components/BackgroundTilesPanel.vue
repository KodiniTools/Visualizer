<template>
  <div class="tiles-section">
    <h5>{{ t('backgroundTiles.title') }}</h5>

    <!-- Aktivierung -->
    <div class="control-group">
      <label class="checkbox-label">
        <input type="checkbox" :checked="tilesStore.tilesEnabled" @change="toggleTiles" />
        <span>{{ t('backgroundTiles.enableTiles') }}</span>
      </label>
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
          <button class="btn-reset-all" @click="resetAllTiles">
            {{ t('backgroundTiles.resetAllTiles') }}
          </button>
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

import TileGridControls from './background-tiles/TileGridControls.vue'
import SelectedTileEditor from './background-tiles/SelectedTileEditor.vue'
import TilePresetsSection from './background-tiles/TilePresetsSection.vue'
import TileGalleryModal from './background-tiles/TileGalleryModal.vue'

const { t } = useI18n()

// Kern-Logik: Store-Aktionen + Canvas-Redraw
const controls = useBackgroundTiles()
const { tilesStore, redraw, toggleTiles, resetAllTiles } = controls

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
  border-radius: 8px;
}

.tiles-section h5 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ds-success);
}

.control-group {
  margin-bottom: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.checkbox-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--ds-success);
}

.tiles-controls {
  margin-top: 12px;
}

.reset-all {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--ds-success) 20%, transparent);
}

.btn-reset-all {
  width: 100%;
  padding: 8px;
  background: color-mix(in srgb, var(--ds-danger) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-danger) 30%, transparent);
  border-radius: 4px;
  color: var(--ds-danger);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset-all:hover {
  background: color-mix(in srgb, var(--ds-danger) 25%, transparent);
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .tiles-section {
  background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .tiles-section h5 {
  color: var(--accent-ink);
}

[data-theme='light'] .checkbox-label input[type='checkbox'] {
  accent-color: var(--accent-primary);
}

[data-theme='light'] .btn-reset-all {
  background: color-mix(in srgb, var(--ds-danger) 8%, transparent);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .tiles-section {
    padding: 10px;
  }

  .tiles-section h5 {
    font-size: 12px;
  }

  .btn-reset-all {
    padding: 8px;
    font-size: 11px;
    min-height: 40px;
  }
}
</style>
