<template>
  <div>
    <!-- Kachelanzahl -->
    <div class="control-group">
      <label>{{ t('backgroundTiles.tileCount') }}:</label>
      <div class="tile-count-buttons">
        <button
          v-for="count in [3, 6, 9, 12]"
          :key="count"
          :class="{ active: tilesStore.tileCount === count }"
          @click="setTileCount(count)"
        >
          {{ count }}
        </button>
      </div>
    </div>

    <!-- Lücke zwischen Kacheln -->
    <div class="control-group">
      <label>{{ t('backgroundTiles.gap') }}: {{ tilesStore.tileGap }}px</label>
      <SliderField
        :model-value="tilesStore.tileGap"
        :min="0"
        :max="30"
        :step="1"
        :default-value="5"
        class="gap-slider"
        @update:model-value="setTileGap($event)"
      />
    </div>

    <!-- Kachel-Vorschau/Auswahl -->
    <div class="control-group">
      <label>{{ t('backgroundTiles.selectTile') }}:</label>
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
import SliderField from '../ui/SliderField.vue'

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
  color: var(--ds-text-2);
  font-weight: var(--ds-weight-medium);
}

/* Kachelanzahl-Buttons */
.tile-count-buttons {
  display: flex;
  gap: 6px;
}

.tile-count-buttons button {
  flex: 1;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--ds-surface-2) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-success) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  color: var(--ds-text);
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-semibold);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.tile-count-buttons button:hover {
  background: color-mix(in srgb, var(--ds-success) 20%, transparent);
  border-color: color-mix(in srgb, var(--ds-success) 50%, transparent);
}

.tile-count-buttons button.active {
  background: color-mix(in srgb, var(--ds-success) 30%, transparent);
  border-color: var(--ds-success);
  color: var(--ds-success);
}

/* Gap Slider */
.gap-slider {
  width: 100%;
  height: 6px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-success);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.gap-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: #ffffff;
  box-shadow: var(--ds-shadow-overlay);
  cursor: pointer;
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
[data-theme='light'] .control-group label {
  color: var(--text-muted);
}

[data-theme='light'] .tile-count-buttons button {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme='light'] .tile-count-buttons button:hover {
  background: var(--btn-hover);
  border-color: var(--accent-primary);
}

[data-theme='light'] .tile-count-buttons button.active {
  background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
  border-color: var(--accent-primary);
  color: var(--accent-ink);
}

[data-theme='light'] .gap-slider {
  background: color-mix(in srgb, var(--accent-primary) 25%, transparent);
}

[data-theme='light'] .gap-slider::-webkit-slider-thumb {
  background: var(--accent-primary);
  box-shadow: var(--ds-shadow-overlay);
}

[data-theme='light'] .gap-slider::-moz-range-thumb {
  background: var(--accent-primary);
  box-shadow: var(--ds-shadow-overlay);
}

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

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .tile-count-buttons button {
    padding: 8px 10px;
    font-size: var(--ds-text-xs);
    min-height: 40px;
  }

  .gap-slider::-webkit-slider-thumb {
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 480px) {
  .tile-count-buttons {
    flex-wrap: wrap;
  }

  .tile-count-buttons button {
    flex: 1 1 40%;
    min-height: 44px;
  }
}
</style>
