<template>
  <div class="selected-tile-editor">
    <div class="editor-header">
      <h6>
        {{
          locale === 'de'
            ? `Kachel ${tilesStore.selectedTileIndex + 1} bearbeiten`
            : `Edit tile ${tilesStore.selectedTileIndex + 1}`
        }}
      </h6>
      <button class="btn-close" @click="deselectTile">×</button>
    </div>

    <!-- Hintergrundfarbe -->
    <div class="control-group">
      <label>{{ t('backgroundTiles.backgroundColor') }}:</label>
      <div class="color-picker-group">
        <input
          type="color"
          :value="tilesStore.selectedTile.backgroundColor"
          class="color-input"
          @input="setTileColor($event.target.value)"
        />
        <span class="color-hex">{{ tilesStore.selectedTile.backgroundColor }}</span>
      </div>
    </div>

    <!-- Hintergrund Deckkraft -->
    <div class="control-group">
      <label
        >{{ t('backgroundTiles.opacity') }}:
        {{ Math.round(tilesStore.selectedTile.backgroundOpacity * 100) }}%</label
      >
      <input
        type="range"
        :value="tilesStore.selectedTile.backgroundOpacity"
        min="0"
        max="1"
        step="0.05"
        class="opacity-slider"
        @input="setTileOpacity($event.target.value)"
      />
    </div>

    <!-- Bild-Bereich -->
    <TileImageSection />

    <!-- Audio-Reaktiv Sektion -->
    <TileAudioSection />

    <!-- Kachel zurücksetzen -->
    <button class="btn-reset" @click="resetTile">
      {{ t('backgroundTiles.resetTile') }}
    </button>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import TileImageSection from './TileImageSection.vue'
import TileAudioSection from './TileAudioSection.vue'

const { t, locale } = useI18n()
const { tilesStore, deselectTile, setTileColor, setTileOpacity, resetTile } = inject('tileControls')
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

/* Ausgewählte Kachel Editor */
.selected-tile-editor {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.selected-tile-editor h6 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #4ade80;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(74, 222, 128, 0.2);
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.btn-close:hover {
  color: #fff;
}

/* Farbauswahl */
.color-picker-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-input {
  width: 40px;
  height: 30px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  background-color: var(--secondary-bg);
}

.color-hex {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
}

/* Opacity Slider */
.opacity-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, rgba(74, 222, 128, 0.2) 0%, rgba(74, 222, 128, 1) 100%);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.btn-reset {
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  background: rgba(251, 146, 60, 0.2);
  border: 1px solid rgba(251, 146, 60, 0.4);
  border-radius: 4px;
  color: #fb923c;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: rgba(251, 146, 60, 0.3);
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .control-group label {
  color: #4d6d8e;
}

[data-theme='light'] .selected-tile-editor h6 {
  color: #014f99;
}

[data-theme='light'] .selected-tile-editor {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .editor-header {
  border-bottom-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .btn-close {
  color: #4d6d8e;
}

[data-theme='light'] .btn-close:hover {
  color: #003971;
}

[data-theme='light'] .color-input {
  background-color: #ffffff;
  border-color: var(--border-color);
}

[data-theme='light'] .color-hex {
  color: #4d6d8e;
}

[data-theme='light'] .opacity-slider {
  background: linear-gradient(to right, rgba(7, 63, 116, 0.15) 0%, rgba(1, 79, 153, 0.5) 100%);
}

[data-theme='light'] .opacity-slider::-webkit-slider-thumb {
  background: #073f74;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .opacity-slider::-moz-range-thumb {
  background: #073f74;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .btn-reset {
  background: rgba(1, 79, 153, 0.08);
  border-color: rgba(1, 79, 153, 0.2);
  color: #014f99;
}

[data-theme='light'] .btn-reset:hover {
  background: rgba(1, 79, 153, 0.15);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .btn-reset {
    padding: 8px;
    font-size: 11px;
    min-height: 40px;
  }
}
</style>
