<template>
  <div class="control-group presets-section">
    <label>{{ t('backgroundTiles.tilePresets') }}</label>
    <UiButton size="sm" block @click="saveTilePreset">
      {{ t('backgroundTiles.saveTilePreset') }}
    </UiButton>

    <div v-if="tilePresets.length > 0" class="presets-list">
      <div v-for="preset in tilePresets" :key="preset.id" class="preset-item">
        <span class="preset-name">{{ preset.name }}</span>
        <div class="preset-actions">
          <UiIconButton
            size="sm"
            :label="t('backgroundTiles.load')"
            @click="loadTilePreset(preset)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </UiIconButton>
          <UiIconButton
            size="sm"
            :label="t('backgroundTiles.delete')"
            @click="deleteTilePreset(preset.id)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </UiIconButton>
        </div>
      </div>
    </div>
    <div v-else class="hint-text">{{ t('backgroundTiles.noTilePresets') }}</div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'

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
  margin-bottom: 8px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
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

[data-theme='light'] .hint-text {
  color: var(--text-muted);
}
</style>
