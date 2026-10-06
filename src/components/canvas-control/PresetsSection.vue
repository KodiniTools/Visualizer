<template>
  <div class="panel-section">
    <h4>{{ t('canvasControl.presets') }}</h4>

    <div class="control-group">
      <button @click="saveCurrentAsPreset" class="btn-primary full-width">
        {{ t('canvasControl.saveAsPreset') }}
      </button>
    </div>

    <div v-if="savedPresets.length > 0" class="presets-list">
      <label>{{ t('canvasControl.savedPresets') }}:</label>
      <div v-for="preset in savedPresets" :key="preset.id" class="preset-item">
        <div class="preset-info">
          <span class="preset-name">{{ preset.name }}</span>
          <span class="preset-preview" :style="{ backgroundColor: preset.backgroundColor }"></span>
        </div>
        <div class="preset-actions">
          <button
            @click="loadPreset(preset)"
            class="btn-small btn-load"
            :title="t('canvasControl.load')"
          >
            {{ t('canvasControl.load') }}
          </button>
          <button
            @click="deletePreset(preset.id)"
            class="btn-small btn-delete"
            :title="t('common.delete')"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>
    <div v-else class="hint-text" style="text-align: center; margin-top: 8px">
      {{ t('canvasControl.noPresets') }}
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()
const bg = inject('bgSettings')
const { savedPresets, saveCurrentAsPreset, loadPreset, deletePreset } = bg
</script>

<style scoped>
.control-group {
  margin-bottom: 6px;
}

.presets-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.presets-list > label {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 7px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--ds-radius-sm);
  transition: all var(--ds-duration) var(--ds-ease);
}

.preset-item:hover {
  border-color: var(--accent-primary);
  background: var(--btn-hover);
}

.preset-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-name {
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
  font-weight: var(--ds-weight-medium);
}

.preset-preview {
  width: 16px;
  height: 16px;
  border-radius: var(--ds-radius-sm);
  border: 1px solid var(--border-color);
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
  background: var(--ds-accent-soft);
}

.btn-load:hover {
  background: color-mix(in srgb, var(--ds-accent) 40%, transparent);
}

.btn-delete {
  background: color-mix(in srgb, var(--ds-danger) 20%, transparent);
}

.btn-delete:hover {
  background: color-mix(in srgb, var(--ds-danger) 40%, transparent);
}

.btn-primary {
  padding: 6px 10px;
  border: none;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  transition: all var(--ds-duration) var(--ds-ease);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: var(--ds-accent-soft);
  color: var(--accent-tertiary);
  border: 1px solid var(--ds-border);
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
}

.full-width {
  width: 100%;
}

.hint-text {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  font-style: italic;
}

/* Light theme overrides */
[data-theme='light'] .btn-primary {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border: 1px solid var(--border-color);
  color: var(--accent-ink);
}

[data-theme='light'] .btn-primary:hover {
  background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
}

[data-theme='light'] .btn-load {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
}

[data-theme='light'] .btn-load:hover {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
}

@media (max-width: 768px) {
  .preset-item {
    padding: 6px 8px;
  }
}
</style>
