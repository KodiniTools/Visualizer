<template>
  <div class="selected-tile-editor">
    <div class="editor-header">
      <h6>{{ t('backgroundTiles.editTile').replace('{n}', tilesStore.selectedTileIndex + 1) }}</h6>
      <UiIconButton size="sm" :label="t('common.close')" @click="deselectTile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </UiIconButton>
    </div>

    <!-- Hintergrundfarbe -->
    <div class="control-group">
      <label>{{ t('backgroundTiles.backgroundColor') }}</label>
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
    <SliderControl
      :label="t('backgroundTiles.opacity')"
      :model-value="tilesStore.selectedTile.backgroundOpacity"
      :min="0"
      :max="1"
      :step="0.05"
      :default-value="1"
      :value-text="`${Math.round(tilesStore.selectedTile.backgroundOpacity * 100)}%`"
      @update:model-value="setTileOpacity($event)"
    />

    <!-- Bild-Bereich -->
    <TileImageSection />

    <!-- Audio-Reaktiv Sektion -->
    <TileAudioSection />

    <!-- Kachel zurücksetzen -->
    <UiButton variant="secondary" size="sm" block class="btn-reset" @click="resetTile">
      {{ t('backgroundTiles.resetTile') }}
    </UiButton>
  </div>
</template>

<script setup>
import ColorField from '../ui/ColorField.vue'
import SliderControl from '../ui/SliderControl.vue'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import TileImageSection from './TileImageSection.vue'
import TileAudioSection from './TileAudioSection.vue'

const { t } = useI18n()
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
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
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

.btn-reset {
  margin-top: 12px;
}

/* ═══ Light Theme Overrides ═══ */

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

[data-theme='light'] .color-input {
  background-color: var(--card-bg);
  border-color: var(--border-color);
}

[data-theme='light'] .color-hex {
  color: var(--text-muted);
}
</style>
