<template>
  <div class="control-group presets-section">
    <label>🔲 {{ t('backgroundTiles.tilePresets') }}:</label>
    <button class="btn-save-preset" @click="saveTilePreset">
      {{ t('backgroundTiles.saveTilePreset') }}
    </button>

    <div v-if="tilePresets.length > 0" class="presets-list">
      <div v-for="preset in tilePresets" :key="preset.id" class="preset-item">
        <span class="preset-name">{{ preset.name }}</span>
        <div class="preset-actions">
          <button
            class="btn-small btn-load"
            :title="t('backgroundTiles.load')"
            @click="loadTilePreset(preset)"
          >
            📥
          </button>
          <button
            class="btn-small btn-delete"
            :title="t('backgroundTiles.delete')"
            @click="deleteTilePreset(preset.id)"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
    <div v-else class="hint-text">{{ t('backgroundTiles.noTilePresets') }}</div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()
const { tilePresets, saveTilePreset, loadTilePreset, deleteTilePreset } = inject('tilePresets')
</script>

<style scoped>
.control-group {
  margin-bottom: 12px;
}

/* Preset Styles */
.presets-section {
  margin-top: 16px;
  padding: 12px;
  background: color-mix(in srgb, var(--ds-surface-1) 60%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-md);
}

.presets-section > label {
  display: block;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  margin-bottom: 8px;
}

.btn-save-preset {
  width: 100%;
  padding: 8px 12px;
  background: var(--ds-link);
  border: none;
  border-radius: var(--ds-radius-sm);
  color: white;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.presets-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--ds-surface-2) 80%, transparent);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  transition: all var(--ds-duration) var(--ds-ease);
}

.preset-item:hover {
  border-color: var(--ds-link);
}

.preset-name {
  font-size: var(--ds-text-xs);
  color: var(--ds-text);
}

.preset-actions {
  display: flex;
  gap: 4px;
}

.btn-small {
  padding: 3px 6px;
  font-size: var(--ds-text-xs);
  border: none;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-load {
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
}

.btn-load:hover {
  background: color-mix(in srgb, var(--ds-link) 40%, transparent);
}

.btn-delete {
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
}

.btn-delete:hover {
  background: color-mix(in srgb, var(--ds-danger) 40%, transparent);
}

.hint-text {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
  text-align: center;
  margin-top: 8px;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .presets-section {
  background: rgba(255, 255, 255, 0.5);
  border-color: var(--border-color);
}

[data-theme='light'] .presets-section > label {
  color: var(--text-muted);
}

[data-theme='light'] .btn-save-preset {
  background: var(--accent-primary);
  color: var(--accent-text);
}

[data-theme='light'] .preset-item {
  background: var(--ds-surface-2);
  border-color: var(--border-color);
}

[data-theme='light'] .preset-item:hover {
  border-color: var(--accent-primary);
}

[data-theme='light'] .preset-name {
  color: var(--text-primary);
}

[data-theme='light'] .btn-load {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
}

[data-theme='light'] .btn-load:hover {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
}

[data-theme='light'] .hint-text {
  color: var(--text-muted);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .btn-save-preset {
    padding: 10px 12px;
    min-height: 44px;
  }
}
</style>
