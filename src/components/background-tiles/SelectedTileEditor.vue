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
        <ColorField
          :model-value="tilesStore.selectedTile.backgroundColor"
          class="color-input"
          @update:model-value="setTileColor($event)"
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
      <SliderField
        :model-value="tilesStore.selectedTile.backgroundOpacity"
        :min="0"
        :max="1"
        :step="0.05"
        :default-value="1"
        class="opacity-slider"
        @update:model-value="setTileOpacity($event)"
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
import ColorField from '../ui/ColorField.vue'
import SliderField from '../ui/SliderField.vue'
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
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  font-weight: var(--ds-weight-medium);
}

/* Ausgewählte Kachel Editor */
.selected-tile-editor {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--ds-radius-sm);
  border: 1px solid color-mix(in srgb, var(--ds-success) 30%, transparent);
}

.selected-tile-editor h6 {
  margin: 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-success);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--ds-success) 20%, transparent);
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: var(--ds-text-xl);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.btn-close:hover {
  color: var(--ds-text);
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
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  background-color: var(--secondary-bg);
}

.color-hex {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  font-family: var(--ds-font-mono);
}

/* Opacity Slider */
.opacity-slider {
  width: 100%;
  height: 6px;
  border-radius: var(--ds-radius-sm);
  background: color-mix(in srgb, var(--ds-success) 20%, transparent);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: var(--ds-radius-full);
  background: #ffffff;
  box-shadow: var(--ds-shadow-overlay);
  cursor: pointer;
}

.btn-reset {
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  background: color-mix(in srgb, var(--ds-warning) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-warning) 40%, transparent);
  border-radius: var(--ds-radius-sm);
  color: var(--ds-warning);
  font-size: var(--ds-text-xs);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-reset:hover {
  background: color-mix(in srgb, var(--ds-warning) 30%, transparent);
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .control-group label {
  color: var(--text-muted);
}

[data-theme='light'] .selected-tile-editor h6 {
  color: var(--accent-ink);
}

[data-theme='light'] .selected-tile-editor {
  background: rgba(255, 255, 255, 0.5);
  border-color: var(--border-color);
}

[data-theme='light'] .editor-header {
  border-bottom-color: var(--border-color);
}

[data-theme='light'] .btn-close:hover {
  color: var(--text-primary);
}

[data-theme='light'] .color-input {
  background-color: var(--card-bg);
  border-color: var(--border-color);
}

[data-theme='light'] .color-hex {
  color: var(--text-muted);
}

[data-theme='light'] .opacity-slider {
  background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
}

[data-theme='light'] .opacity-slider::-webkit-slider-thumb {
  background: var(--accent-primary);
  box-shadow: var(--ds-shadow-overlay);
}

[data-theme='light'] .opacity-slider::-moz-range-thumb {
  background: var(--accent-primary);
  box-shadow: var(--ds-shadow-overlay);
}

[data-theme='light'] .btn-reset {
  background: color-mix(in srgb, var(--accent-primary) 8%, transparent);
  border-color: var(--border-color);
  color: var(--accent-ink);
}

[data-theme='light'] .btn-reset:hover {
  background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .btn-reset {
    padding: 8px;
    font-size: var(--ds-text-xs);
    min-height: 40px;
  }
}
</style>
