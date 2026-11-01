<template>
  <div class="image-section">
    <label>{{ t('backgroundTiles.tileImage') }}</label>

    <div
      v-if="!tilesStore.selectedTile.image && !tilesStore.selectedTile.video"
      class="image-upload-area"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleImageUpload"
      />
      <input
        ref="videoInput"
        type="file"
        accept="video/*"
        style="display: none"
        @change="handleVideoUpload"
      />
      <div class="source-buttons">
        <UiButton size="sm" @click="fileInput.click()">
          <template #icon>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </template>
          {{ t('backgroundTiles.uploadImage') }}
        </UiButton>
        <UiButton size="sm" @click="openGalleryModal">
          <template #icon>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
            </svg>
          </template>
          {{ t('backgroundTiles.fromGallery') }}
        </UiButton>
        <UiButton size="sm" @click="videoInput.click()">
          <template #icon>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="2" y="6" width="14" height="12" rx="2" />
              <path d="m22 8-6 4 6 4V8z" />
            </svg>
          </template>
          {{ t('backgroundTiles.uploadVideo') }}
        </UiButton>
      </div>
      <p class="hint">{{ t('backgroundTiles.orDragDrop') }}</p>
    </div>

    <!-- Video-Vorschau und Steuerung -->
    <div v-else-if="tilesStore.selectedTile.video" class="video-controls">
      <div class="video-preview">
        <video :src="tilesStore.selectedTile.videoSrc" muted loop autoplay playsinline></video>
        <span class="video-badge">🎬 {{ t('backgroundTiles.videoPlaying') }}</span>
      </div>

      <!-- Video-Einstellungen -->
      <div class="video-settings">
        <UiSwitch
          :model-value="tilesStore.selectedTile.videoSettings?.muted !== false"
          :label="t('backgroundTiles.videoMuted')"
          @update:model-value="updateVideoSetting('muted', $event)"
        />
        <UiSwitch
          :model-value="tilesStore.selectedTile.videoSettings?.loop !== false"
          :label="t('backgroundTiles.videoLoop')"
          @update:model-value="updateVideoSetting('loop', $event)"
        />
      </div>

      <!-- Ersetzen-Buttons für Video -->
      <div class="replace-section">
        <span class="replace-label">{{ t('backgroundTiles.replaceWith') }}</span>
        <div class="source-buttons">
          <input
            ref="replaceImageFromVideoInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleImageUpload"
          />
          <input
            ref="replaceVideoFromVideoInput"
            type="file"
            accept="video/*"
            style="display: none"
            @change="handleVideoUpload"
          />
          <UiButton size="sm" @click="replaceImageFromVideoInput.click()">
            <template #icon>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </template>
            {{ t('backgroundTiles.uploadImage') }}
          </UiButton>
          <UiButton size="sm" @click="openGalleryModal">
            <template #icon>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
              </svg>
            </template>
            {{ t('backgroundTiles.fromGallery') }}
          </UiButton>
          <UiButton size="sm" @click="replaceVideoFromVideoInput.click()">
            <template #icon>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="2" y="6" width="14" height="12" rx="2" />
                <path d="m22 8-6 4 6 4V8z" />
              </svg>
            </template>
            {{ t('backgroundTiles.uploadVideo') }}
          </UiButton>
        </div>
      </div>

      <UiButton variant="danger" size="sm" block class="btn-remove" @click="removeVideo">
        {{ t('backgroundTiles.removeVideo') }}
      </UiButton>
    </div>

    <!-- Bild-Vorschau und Filter -->
    <div v-else class="image-controls">
      <div class="image-preview">
        <img :src="tilesStore.selectedTile.imageSrc" :alt="t('backgroundTiles.tileImage')" />
      </div>

      <!-- Ersetzen-Buttons -->
      <div class="replace-section">
        <span class="replace-label">{{ t('backgroundTiles.replaceWith') }}</span>
        <div class="source-buttons">
          <input
            ref="replaceImageInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleImageUpload"
          />
          <input
            ref="replaceVideoInput"
            type="file"
            accept="video/*"
            style="display: none"
            @change="handleVideoUpload"
          />
          <UiButton size="sm" @click="replaceImageInput.click()">
            <template #icon>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </template>
            {{ t('backgroundTiles.uploadImage') }}
          </UiButton>
          <UiButton size="sm" @click="openGalleryModal">
            <template #icon>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
              </svg>
            </template>
            {{ t('backgroundTiles.fromGallery') }}
          </UiButton>
          <UiButton size="sm" @click="replaceVideoInput.click()">
            <template #icon>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="2" y="6" width="14" height="12" rx="2" />
                <path d="m22 8-6 4 6 4V8z" />
              </svg>
            </template>
            {{ t('backgroundTiles.uploadVideo') }}
          </UiButton>
        </div>
      </div>

      <!-- Bild-Filter -->
      <div class="filter-controls">
        <SliderControl
          v-for="filter in IMAGE_FILTERS"
          :key="filter.key"
          :label="t(`backgroundTiles.${filter.key}`)"
          :model-value="tilesStore.selectedTile.imageSettings[filter.key]"
          :min="filter.min"
          :max="filter.max"
          :step="filter.step"
          :default-value="filter.default"
          :value-text="filter.format(tilesStore.selectedTile.imageSettings[filter.key])"
          @update:model-value="updateImageSetting(filter.key, $event)"
        />
      </div>

      <UiButton variant="danger" size="sm" block class="btn-remove" @click="removeImage">
        {{ t('backgroundTiles.removeImage') }}
      </UiButton>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import SliderControl from '../ui/SliderControl.vue'
import UiButton from '../ui/UiButton.vue'
import UiSwitch from '../ui/UiSwitch.vue'

const percent = (v) => `${v}%`
const px = (v) => `${v}px`

/** Bild-Filter der Kachel: Schlüssel in imageSettings, Bereich, Standard, Anzeige */
const IMAGE_FILTERS = [
  { key: 'brightness', min: 0, max: 200, step: 5, default: 100, format: percent },
  { key: 'contrast', min: 0, max: 200, step: 5, default: 100, format: percent },
  { key: 'saturation', min: 0, max: 200, step: 5, default: 100, format: percent },
  { key: 'opacity', min: 0, max: 100, step: 5, default: 100, format: percent },
  { key: 'blur', min: 0, max: 20, step: 1, default: 0, format: px },
  { key: 'hueRotate', min: 0, max: 360, step: 10, default: 0, format: (v) => `${v}°` },
  { key: 'grayscale', min: 0, max: 100, step: 5, default: 0, format: percent },
  { key: 'sepia', min: 0, max: 100, step: 5, default: 0, format: percent },
  {
    key: 'scale',
    min: 0.5,
    max: 2,
    step: 0.1,
    default: 1,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  { key: 'offsetX', min: -200, max: 200, step: 5, default: 0, format: px },
  { key: 'offsetY', min: -200, max: 200, step: 5, default: 0, format: px },
]

const { t } = useI18n()
const {
  tilesStore,
  handleImageUpload,
  handleVideoUpload,
  updateImageSetting,
  updateVideoSetting,
  removeImage,
  removeVideo,
} = inject('tileControls')
const { openGalleryModal } = inject('tileGallery')

const fileInput = ref(null)
const videoInput = ref(null)
const replaceImageInput = ref(null)
const replaceVideoInput = ref(null)
const replaceImageFromVideoInput = ref(null)
const replaceVideoFromVideoInput = ref(null)
</script>

<style scoped>
/* Bild-Bereich */

.image-section {
  margin: 12px 0;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--ds-success) 20%, transparent);
}

.image-section > label {
  display: block;
  margin-bottom: 6px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

.image-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border: 2px dashed color-mix(in srgb, var(--ds-success) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  margin-top: 8px;
}

.hint {
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
  margin-top: 8px;
}

.image-controls {
  margin-top: 8px;
}

.image-preview {
  width: 100%;
  height: 60px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--ds-radius-sm);
  overflow: hidden;
  margin-bottom: 10px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Filter-Steuerungen */

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

/* ═══ Video Styles ═══ */

.video-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.video-preview {
  position: relative;
  width: 100%;
  border-radius: var(--ds-radius-sm);
  overflow: hidden;
  background: #000;
}

.video-preview video {
  width: 100%;
  height: auto;
  max-height: 120px;
  object-fit: cover;
  display: block;
}

.video-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 3px 8px;
  background: color-mix(in srgb, var(--ds-danger) 90%, transparent);
  color: #fff;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  border-radius: var(--ds-radius-sm);
  display: flex;
  align-items: center;
  gap: 4px;
}

.video-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--ds-radius-sm);
}

/* ═══ Ersetzen-Buttons ═══ */

.replace-section {
  margin: 10px 0;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px dashed color-mix(in srgb, var(--ds-success) 30%, transparent);
  border-radius: var(--ds-radius-sm);
}

.replace-label {
  display: block;
  margin-bottom: 8px;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

/* ═══ Light Theme Overrides ═══ */

[data-theme='light'] .image-section {
  border-top-color: var(--border-color);
}

[data-theme='light'] .image-upload-area {
  background: rgba(255, 255, 255, 0.4);
  border-color: var(--border-color);
}

[data-theme='light'] .image-preview {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme='light'] .video-preview {
  background: var(--ds-surface-2);
}

[data-theme='light'] .video-settings {
  background: rgba(0, 0, 0, 0.04);
}

[data-theme='light'] .replace-section {
  background: rgba(255, 255, 255, 0.4);
  border-color: var(--border-color);
}

/* ═══ Responsive ═══ */

.source-buttons {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.source-buttons > * {
  flex: 1 1 auto;
}

.btn-remove {
  margin-top: 4px;
}

@media (max-width: 480px) {
  .source-buttons {
    flex-direction: column;
  }
}
</style>
