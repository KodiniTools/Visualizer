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
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
}

.tiles-section h5 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #4ade80;
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
  accent-color: #4ade80;
}

.tiles-controls {
  margin-top: 12px;
}

.reset-all {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(74, 222, 128, 0.2);
}

.btn-reset-all {
  width: 100%;
  padding: 8px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
  color: #f87171;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset-all:hover {
  background: rgba(239, 68, 68, 0.25);
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .tiles-section {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.06) 0%, rgba(7, 63, 116, 0.06) 100%);
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .tiles-section h5 {
  color: #014f99;
}

[data-theme='light'] .checkbox-label input[type='checkbox'] {
  accent-color: #014f99;
}

[data-theme='light'] .btn-reset-all {
  background: rgba(239, 68, 68, 0.08);
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
