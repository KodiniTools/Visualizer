<template>
  <div>
    <!-- Kachelanzahl -->
    <div class="control-group">
      <label>{{ t('backgroundTiles.tileCount') }}</label>
      <UiSegmentedControl
        :model-value="String(tilesStore.tileCount)"
        class="tile-count"
        size="sm"
        :label="t('backgroundTiles.tileCount')"
        :options="TILE_COUNT_OPTIONS"
        @update:model-value="setTileCount(Number($event))"
      />
    </div>

    <!-- Lücke zwischen Kacheln -->
    <SliderControl
      :label="t('backgroundTiles.gap')"
      :model-value="tilesStore.tileGap"
      :min="0"
      :max="30"
      :step="1"
      :default-value="5"
      :value-text="`${tilesStore.tileGap}px`"
      @update:model-value="setTileGap($event)"
    />

    <!-- Kachel-Vorschau/Auswahl -->
    <div class="control-group">
      <label>{{ t('backgroundTiles.selectTile') }}</label>
      <div class="tiles-preview" :style="gridStyle">
        <div
          v-for="(tile, index) in tilesStore.tiles"
          :key="tile.id"
          class="tile-preview"
          :class="{
            selected: tilesStore.selectedTileIndex === index,
            'has-audio': tile.audioReactive?.enabled,
          }"
          :style="getTileStyle(tile)"
          @click="selectTile(index)"
        >
          <span class="tile-number">{{ index + 1 }}</span>
          <span v-if="tile.image" class="tile-has-image">{{ t('backgroundTiles.image') }}</span>
          <span
            v-if="tile.audioReactive?.enabled"
            class="tile-has-audio"
            :title="t('backgroundTiles.audioReactive')"
            >♪</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import SliderControl from '../ui/SliderControl.vue'
import UiSegmentedControl from '../ui/UiSegmentedControl.vue'

const TILE_COUNT_OPTIONS = [3, 6, 9, 12].map((n) => ({ value: String(n), label: String(n) }))

const { t } = useI18n()
const { tilesStore, gridStyle, getTileStyle, setTileCount, setTileGap, selectTile } =
  inject('tileControls')
</script>

<style scoped>
.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

/* Kachelanzahl über die volle Breite */
.tile-count {
  display: flex;
  width: 100%;
}

.tile-count :deep(.ui-segmented__option) {
  flex: 1;
}

/* Kachel-Vorschau Grid */

.tiles-preview {
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--ds-radius-sm);
  padding: 6px;
  min-height: 80px;
}

.tile-preview {
  aspect-ratio: 16/9;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 2px solid transparent;
  transition: all var(--ds-duration) var(--ds-ease);
}

.tile-preview:hover {
  border-color: color-mix(in srgb, var(--ds-success) 50%, transparent);
}

.tile-preview.selected {
  border-color: var(--ds-success);
}

.tile-number {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-bold);
  color: var(--ds-text-2);
}

.tile-has-image {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 4px;
  border-radius: var(--ds-radius-sm);
  margin-top: 2px;
}

.tile-has-audio {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: var(--ds-text-xs);
  color: var(--ds-link);
  background: color-mix(in srgb, var(--ds-link) 40%, transparent);
  padding: 1px 3px;
  border-radius: var(--ds-radius-sm);
  animation: pulse-audio 1.5s ease-in-out infinite;
}

@keyframes pulse-audio {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .tiles-preview {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme='light'] .tile-has-image {
  background: rgba(255, 255, 255, 0.7);
}

[data-theme='light'] .tile-preview:hover {
  border-color: var(--accent-primary);
}

[data-theme='light'] .tile-preview.selected {
  border-color: var(--accent-primary);
}
</style>
