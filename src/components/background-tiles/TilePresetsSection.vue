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
  background: rgba(30, 30, 30, 0.6);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.presets-section > label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.btn-save-preset {
  width: 100%;
  padding: 8px 12px;
  background: linear-gradient(135deg, #6ea8fe 0%, #8b5cf6 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-save-preset:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.3);
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
  background: rgba(40, 40, 40, 0.8);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  transition: all 0.15s ease;
}

.preset-item:hover {
  border-color: #6ea8fe;
}

.preset-name {
  font-size: 11px;
  color: #e0e0e0;
}

.preset-actions {
  display: flex;
  gap: 4px;
}

.btn-small {
  padding: 3px 6px;
  font-size: 12px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-load {
  background: rgba(110, 168, 254, 0.2);
}

.btn-load:hover {
  background: rgba(110, 168, 254, 0.4);
}

.btn-delete {
  background: rgba(239, 68, 68, 0.2);
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.4);
}

.hint-text {
  font-size: 10px;
  color: #666;
  text-align: center;
  margin-top: 8px;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .presets-section {
  background: rgba(255, 255, 255, 0.5);
  border-color: var(--border-color);
}

[data-theme='light'] .presets-section > label {
  color: #4d6d8e;
}

[data-theme='light'] .btn-save-preset {
  background: linear-gradient(135deg, #014f99 0%, #073f74 100%);
  color: #f5f4d6;
}

[data-theme='light'] .btn-save-preset:hover {
  box-shadow: 0 4px 12px rgba(1, 79, 153, 0.3);
}

[data-theme='light'] .preset-item {
  background: #fdfbf2;
  border-color: var(--border-color);
}

[data-theme='light'] .preset-item:hover {
  border-color: #014f99;
}

[data-theme='light'] .preset-name {
  color: #003971;
}

[data-theme='light'] .btn-load {
  background: rgba(1, 79, 153, 0.1);
}

[data-theme='light'] .btn-load:hover {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .hint-text {
  color: #4d6d8e;
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .btn-save-preset {
    padding: 10px 12px;
    min-height: 44px;
  }
}
</style>
