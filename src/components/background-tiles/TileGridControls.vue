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
      <input
        type="range"
        :value="tilesStore.tileGap"
        min="0"
        max="30"
        step="1"
        class="gap-slider"
        @input="setTileGap($event.target.value)"
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
  font-size: 11px;
  color: #bbb;
  font-weight: 500;
}

/* Kachelanzahl-Buttons */
.tile-count-buttons {
  display: flex;
  gap: 6px;
}

.tile-count-buttons button {
  flex: 1;
  padding: 8px 12px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tile-count-buttons button:hover {
  background: rgba(74, 222, 128, 0.2);
  border-color: rgba(74, 222, 128, 0.5);
}

.tile-count-buttons button.active {
  background: rgba(74, 222, 128, 0.3);
  border-color: #4ade80;
  color: #4ade80;
}

/* Gap Slider */
.gap-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #4ade80 0%, #10b981 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.gap-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

/* Kachel-Vorschau Grid */
.tiles-preview {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 6px;
  min-height: 80px;
}

.tile-preview {
  aspect-ratio: 16/9;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.tile-preview:hover {
  border-color: rgba(74, 222, 128, 0.5);
  transform: scale(1.02);
}

.tile-preview.selected {
  border-color: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.4);
}

.tile-number {
  font-size: 12px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.tile-has-image {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 4px;
  border-radius: 2px;
  margin-top: 2px;
}

.tile-has-audio {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.4);
  padding: 1px 3px;
  border-radius: 2px;
  animation: pulse-audio 1.5s ease-in-out infinite;
}

.tile-preview.has-audio {
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
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
  color: #4d6d8e;
}

[data-theme='light'] .tile-count-buttons button {
  background: #fdfbf2;
  border-color: rgba(1, 79, 153, 0.2);
  color: #003971;
}

[data-theme='light'] .tile-count-buttons button:hover {
  background: var(--btn-hover);
  border-color: rgba(1, 79, 153, 0.4);
}

[data-theme='light'] .tile-count-buttons button.active {
  background: rgba(1, 79, 153, 0.15);
  border-color: #014f99;
  color: #014f99;
}

[data-theme='light'] .gap-slider {
  background: linear-gradient(90deg, rgba(7, 63, 116, 0.25) 0%, rgba(1, 79, 153, 0.45) 100%);
}

[data-theme='light'] .gap-slider::-webkit-slider-thumb {
  background: #073f74;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .gap-slider::-moz-range-thumb {
  background: #073f74;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .tiles-preview {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme='light'] .tile-number {
  color: rgba(0, 0, 0, 0.7);
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.5);
}

[data-theme='light'] .tile-has-image {
  color: rgba(0, 0, 0, 0.6);
  background: rgba(255, 255, 255, 0.7);
}

[data-theme='light'] .tile-preview:hover {
  border-color: rgba(1, 79, 153, 0.4);
}

[data-theme='light'] .tile-preview.selected {
  border-color: #014f99;
  box-shadow: 0 0 10px rgba(1, 79, 153, 0.3);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .tile-count-buttons button {
    padding: 8px 10px;
    font-size: 12px;
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
