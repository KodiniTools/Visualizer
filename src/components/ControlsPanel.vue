<template>
  <div class="panel-container">
    <h4>{{ t('controls.title') }}</h4>

    <div class="control-section">
      <span class="section-label">{{ t('controls.grid') }}</span>
      <button
        class="toggle-btn"
        :class="{ active: gridStore.isVisible }"
        @click="gridStore.toggleGrid"
      >
        <span class="btn-icon">{{ gridStore.isVisible ? '✓' : '×' }}</span>
        {{ gridStore.isVisible ? t('common.on') : t('common.off') }}
      </button>

      <div v-if="gridStore.isVisible" class="grid-options">
        <div class="slider-group">
          <label class="slider-label">
            {{ t('controls.gridSize') }}
            <span class="slider-value">{{ gridSizeValue }}px</span>
          </label>
          <input
            type="range"
            class="slider"
            min="10"
            max="200"
            v-model="gridSizeValue"
          />
        </div>

        <div class="color-group">
          <label class="slider-label">{{ t('controls.gridColor') }}</label>
          <input
            type="color"
            class="color-picker"
            v-model="gridColorValue"
          />
        </div>
      </div>
    </div>

    <div class="control-section">
      <span class="section-label">{{ t('controls.workspace') }}</span>
      <div class="preset-buttons">
        <button
          class="preset-btn"
          :class="{ active: workspaceStore.selectedPresetKey === null }"
          @click="workspaceStore.selectedPresetKey = null"
        >
          {{ t('controls.free') }}
        </button>
        <button
          v-for="(preset, key) in workspaceStore.presets"
          :key="key"
          class="preset-btn"
          :class="{ active: workspaceStore.selectedPresetKey === key }"
          @click="workspaceStore.selectedPresetKey = key"
          :title="preset.name"
        >
          {{ getPresetShortName(preset.name) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { useGridStore } from '../stores/gridStore.js';
import { useWorkspaceStore } from '../stores/workspaceStore.js';

const { t } = useI18n();
const gridStore = useGridStore();
const workspaceStore = useWorkspaceStore();

// Computed properties für v-model Bindung
const gridSizeValue = computed({
  get: () => gridStore.gridSize,
  set: (value) => gridStore.setSize(Number(value))
});

const gridColorValue = computed({
  get: () => gridStore.gridColor,
  set: (value) => gridStore.setColor(value)
});

// Funktion für Kurzbezeichnungen der Presets
function getPresetShortName(name) {
  const mapping = {
    'TikTok (9:16)': 'TikTok',
    'Instagram Story (9:16)': 'IG Story',
    'Instagram Post (1:1)': 'IG Post',
    'Instagram Reel (9:16)': 'IG Reel',
    'YouTube Short (9:16)': 'YT Short',
    'YouTube Video (16:9)': 'YT Video',
    'Facebook Post (1.91:1)': 'FB',
    'X/Twitter Video (16:9)': 'X/Twitter',
    'LinkedIn Video (16:9)': 'LinkedIn'
  };
  return mapping[name] || name;
}
</script>

<style scoped>
.panel-container {
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #333;
}

h4 {
  margin: 0 0 12px 0;
  color: #e0e0e0;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.control-section {
  margin-bottom: 12px;
}

.control-section:last-child {
  margin-bottom: 0;
}

.section-label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-bottom: 6px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.toggle-btn {
  width: 100%;
  background-color: #3a3a3a;
  color: #c0c0c0;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 500;
}

.toggle-btn:hover {
  background-color: #454545;
  border-color: #666;
}

.toggle-btn.active {
  background-color: #6ea8fe;
  color: #fff;
  border-color: #6ea8fe;
}

.toggle-btn.active:hover {
  background-color: #5a96e8;
}

.btn-icon {
  font-size: 14px;
  font-weight: bold;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.preset-btn {
  background-color: #3a3a3a;
  color: #c0c0c0;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.preset-btn:hover {
  background-color: #454545;
  border-color: #666;
  transform: translateY(-1px);
}

.preset-btn.active {
  background-color: #6ea8fe;
  color: #fff;
  border-color: #6ea8fe;
  font-weight: 600;
}

.preset-btn.active:hover {
  background-color: #5a96e8;
}

/* Grid Options */
.grid-options {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #444;
}

.slider-group {
  margin-bottom: 12px;
}

.slider-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #aaa;
  margin-bottom: 6px;
}

.slider-value {
  color: #6ea8fe;
  font-weight: 600;
}

.slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #444;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6ea8fe;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6ea8fe;
  cursor: pointer;
  border: none;
}

.color-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.color-picker {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 2px solid #555;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

/* Responsive Anpassung für kleine Bildschirme */
@media (max-width: 400px) {
  .preset-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
