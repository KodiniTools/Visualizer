<template>
  <div class="panel-section">
    <h4>🎨 {{ t('canvasControl.presets') }}</h4>

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
            📥
          </button>
          <button
            @click="deletePreset(preset.id)"
            class="btn-small btn-delete"
            :title="t('common.delete')"
          >
            🗑️
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
  font-size: 0.55rem;
  color: var(--text-muted, #7a8da0);
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 7px;
  background: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 5px;
  transition: all 0.2s ease;
}

.preset-item:hover {
  border-color: var(--accent-primary, #c9984d);
  background: var(--btn-hover, #1a2a42);
}

.preset-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-name {
  font-size: 0.6rem;
  color: var(--text-primary, #e9e9eb);
  font-weight: 500;
}

.preset-preview {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
}

.preset-actions {
  display: flex;
  gap: 4px;
}

.btn-small {
  padding: 3px 6px;
  font-size: 0.65rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-load {
  background: rgba(201, 152, 77, 0.2);
}

.btn-load:hover {
  background: rgba(201, 152, 77, 0.4);
}

.btn-delete {
  background: rgba(244, 67, 54, 0.2);
}

.btn-delete:hover {
  background: rgba(244, 67, 54, 0.4);
}

.btn-primary {
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.6rem;
  font-weight: 600;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: rgba(201, 152, 77, 0.2);
  color: var(--accent-tertiary, #f8e1a9);
  border: 1px solid rgba(201, 152, 77, 0.3);
}

.btn-primary:hover {
  background: rgba(201, 152, 77, 0.3);
  transform: translateY(-1px);
}

.full-width {
  width: 100%;
}

.hint-text {
  font-size: 0.5rem;
  color: var(--text-muted, #7a8da0);
  font-style: italic;
}

/* Light theme overrides */
[data-theme='light'] .btn-primary {
  background: rgba(1, 79, 153, 0.1);
  border: 1px solid rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-primary:hover {
  background: rgba(1, 79, 153, 0.18);
}

[data-theme='light'] .btn-load {
  background: rgba(1, 79, 153, 0.1);
}

[data-theme='light'] .btn-load:hover {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .preset-item:hover {
  border-color: #014f99;
}

@media (max-width: 768px) {
  .preset-item {
    padding: 6px 8px;
  }
}
</style>
