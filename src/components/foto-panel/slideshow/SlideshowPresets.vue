<template>
  <!-- Slideshow-Presets: Speichern / Laden / Löschen -->
  <div class="presets-section">
    <label class="section-label">{{ t('slideshow.presets') }}</label>
    <p class="hint">{{ t('slideshow.presetHint') }}</p>

    <div class="preset-save-row">
      <input
        v-model="newName"
        class="preset-name-input"
        type="text"
        maxlength="40"
        :placeholder="t('slideshow.presetNamePlaceholder')"
        @keydown.enter.prevent="save"
      />
      <button type="button" class="btn-save-preset" @click="save">
        {{ t('slideshow.savePreset') }}
      </button>
    </div>

    <p v-if="presets.length === 0" class="hint empty">{{ t('slideshow.noPresets') }}</p>
    <ul v-else class="preset-list">
      <li v-for="preset in presets" :key="preset.id" class="preset-item">
        <span class="preset-name" :title="preset.name">{{ preset.name }}</span>
        <span
          v-if="sessionImages[preset.id]"
          class="preset-images-badge"
          :title="t('slideshow.presetImagesHint')"
          >🖼</span
        >
        <span class="preset-meta">{{ preset.slots.length }} × {{ t('slideshow.image') }}</span>
        <button type="button" class="btn-load-preset" @click="emit('load', preset)">
          {{ t('slideshow.loadPreset') }}
        </button>
        <button
          type="button"
          class="btn-delete-preset"
          :title="t('slideshow.deletePreset')"
          :aria-label="t('slideshow.deletePreset')"
          @click="emit('delete', preset.id)"
        >
          &#x2715;
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
/**
 * Liste der Slideshow-Presets. Rein darstellend: Speichern/Laden/Löschen
 * werden an das SlideshowPanel emittiert, das den Store bedient.
 */
import { ref } from 'vue'
import { useI18n } from '../../../lib/i18n.js'

defineProps({
  presets: { type: Array, default: () => [] },
  // presetId → Bilder dieser Sitzung (siehe slideshowPresetStore.sessionImages)
  sessionImages: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['save', 'load', 'delete'])
const { t } = useI18n()

const newName = ref('')

function save() {
  emit('save', newName.value.trim())
  newName.value = ''
}
</script>

<style scoped src="./slideshow-shared.css"></style>
<style scoped>
.presets-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--card-bg);
}
.presets-section .hint {
  padding-left: 0;
}
.preset-save-row {
  display: flex;
  gap: 6px;
}
.preset-name-input {
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  font-size: 12px;
  background: var(--secondary-bg);
  color: #e0e0e0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.preset-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
}
.preset-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background-color: var(--card-bg);
  border-radius: 6px;
}
.preset-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.preset-images-badge {
  font-size: 12px;
  flex-shrink: 0;
}
.preset-meta {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.btn-save-preset,
.btn-load-preset,
.btn-delete-preset {
  flex-shrink: 0;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a9af8 100%);
}
.btn-delete-preset {
  padding: 4px 7px;
  background: rgba(231, 76, 60, 0.25);
  color: #e74c3c;
}
.btn-save-preset:hover,
.btn-load-preset:hover {
  filter: brightness(1.1);
}
.btn-delete-preset:hover {
  background: rgba(231, 76, 60, 0.4);
}
[data-theme='light'] .preset-name-input {
  background: #f9f2d5;
  color: #003971;
  border-color: #d4c8a8;
}
[data-theme='light'] .preset-item {
  background-color: #f0ead0;
}
[data-theme='light'] .preset-name {
  color: #003971;
}
[data-theme='light'] .btn-save-preset,
[data-theme='light'] .btn-load-preset {
  background: linear-gradient(135deg, #014f99 0%, #003971 100%);
  color: #f5f4d6;
}
</style>
