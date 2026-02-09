<template>
  <div class="color-settings-section">
    <div class="color-settings-header" @click="showColorPicker = !showColorPicker">
      <div class="color-settings-title">
        <span class="color-preview-dot" :style="{ background: panelSettingsStore.getSelectedColor().gradient }"></span>
        <span>{{ t('foto.sectionColor') }}</span>
      </div>
      <button class="color-toggle-btn" :class="{ 'rotated': showColorPicker }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </div>
    <transition name="collapse-color">
      <div v-show="showColorPicker" class="color-picker-content">
        <div class="color-presets">
          <button
            v-for="colorOption in panelSettingsStore.colorOptions"
            :key="colorOption.id"
            class="color-preset-btn"
            :class="{ 'active': !panelSettingsStore.useCustomColor && panelSettingsStore.selectedImageSectionColorId === colorOption.id }"
            :style="{ background: colorOption.gradient }"
            :title="colorOption.name"
            @click="panelSettingsStore.setImageSectionColor(colorOption.id)"
          />
        </div>
        <div class="custom-color-row">
          <label class="custom-color-label">
            <input
              type="checkbox"
              :checked="panelSettingsStore.useCustomColor"
              @change="panelSettingsStore.toggleCustomColor($event.target.checked)"
            >
            <span>{{ t('foto.customColor') }}</span>
          </label>
          <input
            type="color"
            class="custom-color-input"
            :value="panelSettingsStore.customColor"
            @input="panelSettingsStore.setCustomColor($event.target.value)"
            :disabled="!panelSettingsStore.useCustomColor"
          >
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { usePanelSettingsStore } from '../../stores/panelSettingsStore';
import { useI18n } from '../../lib/i18n.js';

const { t } = useI18n();
const panelSettingsStore = usePanelSettingsStore();
const showColorPicker = ref(false);
</script>

<style scoped>
.color-settings-section {
  background-color: var(--secondary-bg, #0E1C32);
  border-radius: 6px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  overflow: hidden;
}

.color-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}

.color-settings-header:hover {
  background: rgba(201, 152, 77, 0.05);
}

.color-settings-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-muted, #7A8DA0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.color-preview-dot {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.color-toggle-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.color-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.color-toggle-btn svg {
  width: 14px;
  height: 14px;
  transition: transform 0.3s ease;
}

.color-toggle-btn.rotated svg {
  transform: rotate(-180deg);
}

.color-picker-content {
  padding: 12px 16px 16px;
  border-top: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-preset-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.color-preset-btn:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.color-preset-btn.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3), 0 2px 8px rgba(0, 0, 0, 0.4);
}

.custom-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.custom-color-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #ccc;
  cursor: pointer;
}

.custom-color-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--image-section-accent, #6ea8fe);
  cursor: pointer;
}

.custom-color-input {
  width: 40px;
  height: 28px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.custom-color-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.custom-color-input::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.custom-color-input::-webkit-color-swatch {
  border-radius: 4px;
  border: 1px solid #555;
}

/* Collapse Animation */
.collapse-color-enter-active,
.collapse-color-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-color-enter-from,
.collapse-color-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-color-enter-to,
.collapse-color-leave-from {
  opacity: 1;
  max-height: 200px;
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .color-settings-section {
  background-color: #FFFFFF;
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .color-settings-header:hover {
  background: rgba(1, 79, 153, 0.05);
}

[data-theme='light'] .color-settings-title {
  color: #4d6d8e;
}

[data-theme='light'] .color-toggle-btn {
  background: rgba(1, 79, 153, 0.08);
  color: rgba(0, 57, 113, 0.5);
}

[data-theme='light'] .color-toggle-btn:hover {
  background: rgba(1, 79, 153, 0.15);
  color: #014f99;
}

[data-theme='light'] .color-picker-content {
  border-top-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .color-preset-btn {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .color-preset-btn:hover {
  border-color: rgba(1, 79, 153, 0.4);
}

[data-theme='light'] .color-preset-btn.active {
  border-color: #014f99;
  box-shadow: 0 0 0 2px rgba(1, 79, 153, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .custom-color-label {
  color: #003971;
}

[data-theme='light'] .custom-color-input::-webkit-color-swatch {
  border-color: rgba(1, 79, 153, 0.3);
}
</style>
