<template>
  <div class="image-section">
    <label>{{ t('backgroundTiles.tileImage') }}:</label>

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
      <div class="image-source-buttons">
        <button class="btn-upload" @click="fileInput.click()">
          📁 {{ t('backgroundTiles.uploadImage') }}
        </button>
        <button class="btn-gallery" @click="openGalleryModal">
          🖼️ {{ t('backgroundTiles.fromGallery') }}
        </button>
      </div>
      <div class="image-source-buttons" style="margin-top: 6px">
        <button class="btn-video" @click="videoInput.click()">
          🎬 {{ t('backgroundTiles.uploadVideo') }}
        </button>
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
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="tilesStore.selectedTile.videoSettings?.muted !== false"
            @change="updateVideoSetting('muted', $event.target.checked)"
          />
          <span>{{ t('backgroundTiles.videoMuted') }}</span>
        </label>
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="tilesStore.selectedTile.videoSettings?.loop !== false"
            @change="updateVideoSetting('loop', $event.target.checked)"
          />
          <span>{{ t('backgroundTiles.videoLoop') }}</span>
        </label>
      </div>

      <!-- Ersetzen-Buttons für Video -->
      <div class="replace-section">
        <span class="replace-label">{{ t('backgroundTiles.replaceWith') }}:</span>
        <div class="replace-buttons">
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
          <button class="btn-replace" @click="replaceImageFromVideoInput.click()">
            📁 {{ t('backgroundTiles.uploadImage') }}
          </button>
          <button class="btn-replace btn-replace-gallery" @click="openGalleryModal">
            🖼️ {{ t('backgroundTiles.fromGallery') }}
          </button>
          <button class="btn-replace btn-replace-video" @click="replaceVideoFromVideoInput.click()">
            🎬 {{ t('backgroundTiles.uploadVideo') }}
          </button>
        </div>
      </div>

      <button class="btn-remove" @click="removeVideo">
        {{ t('backgroundTiles.removeVideo') }}
      </button>
    </div>

    <!-- Bild-Vorschau und Filter -->
    <div v-else class="image-controls">
      <div class="image-preview">
        <img :src="tilesStore.selectedTile.imageSrc" alt="Kachel-Bild" />
      </div>

      <!-- Ersetzen-Buttons -->
      <div class="replace-section">
        <span class="replace-label">{{ t('backgroundTiles.replaceWith') }}:</span>
        <div class="replace-buttons">
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
          <button class="btn-replace" @click="replaceImageInput.click()">
            📁 {{ t('backgroundTiles.uploadImage') }}
          </button>
          <button class="btn-replace btn-replace-gallery" @click="openGalleryModal">
            🖼️ {{ t('backgroundTiles.fromGallery') }}
          </button>
          <button class="btn-replace btn-replace-video" @click="replaceVideoInput.click()">
            🎬 {{ t('backgroundTiles.uploadVideo') }}
          </button>
        </div>
      </div>

      <!-- Bild-Filter -->
      <div class="filter-controls">
        <div class="filter-row">
          <label>{{ t('backgroundTiles.brightness') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.brightness"
            min="0"
            max="200"
            step="5"
            @input="updateImageSetting('brightness', $event.target.value)"
          />
          <span>{{ tilesStore.selectedTile.imageSettings.brightness }}%</span>
        </div>

        <div class="filter-row">
          <label>{{ t('backgroundTiles.contrast') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.contrast"
            min="0"
            max="200"
            step="5"
            @input="updateImageSetting('contrast', $event.target.value)"
          />
          <span>{{ tilesStore.selectedTile.imageSettings.contrast }}%</span>
        </div>

        <div class="filter-row">
          <label>{{ t('backgroundTiles.saturation') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.saturation"
            min="0"
            max="200"
            step="5"
            @input="updateImageSetting('saturation', $event.target.value)"
          />
          <span>{{ tilesStore.selectedTile.imageSettings.saturation }}%</span>
        </div>

        <div class="filter-row">
          <label>{{ t('backgroundTiles.opacity') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.opacity"
            min="0"
            max="100"
            step="5"
            @input="updateImageSetting('opacity', $event.target.value)"
          />
          <span>{{ tilesStore.selectedTile.imageSettings.opacity }}%</span>
        </div>

        <div class="filter-row">
          <label>{{ t('backgroundTiles.blur') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.blur"
            min="0"
            max="20"
            step="1"
            @input="updateImageSetting('blur', $event.target.value)"
          />
          <span>{{ tilesStore.selectedTile.imageSettings.blur }}px</span>
        </div>

        <div class="filter-row">
          <label>{{ t('backgroundTiles.hueRotate') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.hueRotate"
            min="0"
            max="360"
            step="10"
            @input="updateImageSetting('hueRotate', $event.target.value)"
          />
          <span>{{ tilesStore.selectedTile.imageSettings.hueRotate }}°</span>
        </div>

        <div class="filter-row">
          <label>{{ t('backgroundTiles.grayscale') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.grayscale"
            min="0"
            max="100"
            step="5"
            @input="updateImageSetting('grayscale', $event.target.value)"
          />
          <span>{{ tilesStore.selectedTile.imageSettings.grayscale }}%</span>
        </div>

        <div class="filter-row">
          <label>{{ t('backgroundTiles.sepia') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.sepia"
            min="0"
            max="100"
            step="5"
            @input="updateImageSetting('sepia', $event.target.value)"
          />
          <span>{{ tilesStore.selectedTile.imageSettings.sepia }}%</span>
        </div>

        <div class="filter-row">
          <label>{{ t('backgroundTiles.scale') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.scale"
            min="0.5"
            max="2"
            step="0.1"
            @input="updateImageSetting('scale', $event.target.value)"
          />
          <span>{{ Math.round(tilesStore.selectedTile.imageSettings.scale * 100) }}%</span>
        </div>

        <div class="filter-row">
          <label>{{ t('backgroundTiles.offsetX') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.offsetX"
            min="-200"
            max="200"
            step="5"
            @input="updateImageSetting('offsetX', $event.target.value)"
          />
          <span>{{ tilesStore.selectedTile.imageSettings.offsetX }}px</span>
        </div>

        <div class="filter-row">
          <label>{{ t('backgroundTiles.offsetY') }}</label>
          <input
            type="range"
            :value="tilesStore.selectedTile.imageSettings.offsetY"
            min="-200"
            max="200"
            step="5"
            @input="updateImageSetting('offsetY', $event.target.value)"
          />
          <span>{{ tilesStore.selectedTile.imageSettings.offsetY }}px</span>
        </div>
      </div>

      <button class="btn-remove" @click="removeImage">
        {{ t('backgroundTiles.removeImage') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'

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
  border-top: 1px solid rgba(74, 222, 128, 0.2);
}

.image-section > label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  color: #bbb;
  font-weight: 500;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.checkbox-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: #4ade80;
}

.image-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border: 2px dashed rgba(74, 222, 128, 0.3);
  border-radius: 6px;
  margin-top: 8px;
}

.btn-upload {
  padding: 8px 16px;
  background: rgba(74, 222, 128, 0.2);
  border: 1px solid rgba(74, 222, 128, 0.5);
  border-radius: 6px;
  color: #4ade80;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-upload:hover {
  background: rgba(74, 222, 128, 0.3);
}

.hint {
  font-size: 10px;
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
  border-radius: 4px;
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

.filter-row {
  display: grid;
  grid-template-columns: 80px 1fr 45px;
  align-items: center;
  gap: 8px;
  font-size: 10px;
}

.filter-row label {
  color: var(--text-muted);
  margin: 0;
}

.filter-row input[type='range'] {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(74, 222, 128, 0.3);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.filter-row input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4ade80;
  cursor: pointer;
}

.filter-row span {
  color: var(--text-muted);
  text-align: right;
  font-family: monospace;
}

.btn-remove {
  width: 100%;
  padding: 6px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 4px;
  color: #ef4444;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.3);
}

/* ═══ Video Styles ═══ */
.btn-video {
  flex: 1;
  padding: 8px 12px;
  font-size: 11px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  border: 1px solid rgba(236, 72, 153, 0.4);
  color: #f9a8d4;
}

.btn-video:hover {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
  border-color: rgba(236, 72, 153, 0.6);
  transform: translateY(-1px);
}

.video-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.video-preview {
  position: relative;
  width: 100%;
  border-radius: 6px;
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
  background: rgba(236, 72, 153, 0.9);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.video-settings {
  display: flex;
  gap: 12px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.video-settings .checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #7a8da0;
  cursor: pointer;
}

.video-settings .checkbox-label input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: #ec4899;
}

/* ═══ Bildquellen-Buttons / Galerie ═══ */
.image-source-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.image-source-buttons .btn-upload,
.image-source-buttons .btn-gallery {
  flex: 1;
  padding: 8px 12px;
  font-size: 11px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-gallery {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(201, 152, 77, 0.2) 100%);
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #c4b5fd;
}

.btn-gallery:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(201, 152, 77, 0.3) 100%);
  border-color: rgba(139, 92, 246, 0.6);
  transform: translateY(-1px);
}

/* ═══ Ersetzen-Buttons ═══ */
.replace-section {
  margin: 10px 0;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px dashed rgba(74, 222, 128, 0.3);
  border-radius: 6px;
}

.replace-label {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.replace-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-replace {
  flex: 1;
  min-width: 80px;
  padding: 6px 10px;
  font-size: 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.3);
  color: #4ade80;
}

.btn-replace:hover {
  background: rgba(74, 222, 128, 0.25);
  border-color: rgba(74, 222, 128, 0.5);
  transform: translateY(-1px);
}

.btn-replace-gallery {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
}

.btn-replace-gallery:hover {
  background: rgba(139, 92, 246, 0.25);
  border-color: rgba(139, 92, 246, 0.5);
}

.btn-replace-video {
  background: rgba(236, 72, 153, 0.15);
  border-color: rgba(236, 72, 153, 0.3);
  color: #f9a8d4;
}

.btn-replace-video:hover {
  background: rgba(236, 72, 153, 0.25);
  border-color: rgba(236, 72, 153, 0.5);
}

/* ═══ Light Theme Overrides ═══ */
[data-theme='light'] .image-section > label {
  color: #4d6d8e;
}

[data-theme='light'] .image-section {
  border-top-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .checkbox-label input[type='checkbox'] {
  accent-color: #014f99;
}

[data-theme='light'] .image-upload-area {
  background: rgba(255, 255, 255, 0.4);
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .btn-upload {
  background: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-upload:hover {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .hint {
  color: #4d6d8e;
}

[data-theme='light'] .image-preview {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme='light'] .filter-row label {
  color: #4d6d8e;
}

[data-theme='light'] .filter-row span {
  color: #4d6d8e;
}

[data-theme='light'] .filter-row input[type='range'] {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .btn-remove {
  background: rgba(239, 68, 68, 0.08);
}

[data-theme='light'] .video-preview {
  background: #fdfbf2;
}

[data-theme='light'] .video-settings {
  background: rgba(0, 0, 0, 0.04);
}

[data-theme='light'] .video-settings .checkbox-label {
  color: #4d6d8e;
}

[data-theme='light'] .video-settings .checkbox-label input[type='checkbox'] {
  accent-color: #014f99;
}

[data-theme='light'] .btn-gallery {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.1) 0%, rgba(7, 63, 116, 0.1) 100%);
  border-color: rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-gallery:hover {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.2) 0%, rgba(7, 63, 116, 0.2) 100%);
  border-color: rgba(1, 79, 153, 0.5);
}

[data-theme='light'] .btn-video {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.1) 0%, rgba(7, 63, 116, 0.1) 100%);
  border-color: rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-video:hover {
  background: linear-gradient(135deg, rgba(1, 79, 153, 0.18) 0%, rgba(7, 63, 116, 0.18) 100%);
  border-color: rgba(1, 79, 153, 0.5);
}

[data-theme='light'] .replace-section {
  background: rgba(255, 255, 255, 0.4);
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .replace-label {
  color: #4d6d8e;
}

[data-theme='light'] .btn-replace {
  background: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-replace:hover {
  background: rgba(1, 79, 153, 0.2);
  border-color: rgba(1, 79, 153, 0.5);
}

[data-theme='light'] .btn-replace-gallery {
  background: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-replace-gallery:hover {
  background: rgba(1, 79, 153, 0.2);
  border-color: rgba(1, 79, 153, 0.5);
}

[data-theme='light'] .btn-replace-video {
  background: rgba(1, 79, 153, 0.1);
  border-color: rgba(1, 79, 153, 0.3);
  color: #014f99;
}

[data-theme='light'] .btn-replace-video:hover {
  background: rgba(1, 79, 153, 0.2);
  border-color: rgba(1, 79, 153, 0.5);
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
  .btn-upload,
  .btn-gallery,
  .btn-video {
    padding: 8px 12px;
    font-size: 12px;
    min-height: 40px;
  }

  .btn-replace {
    min-height: 40px;
    font-size: 11px;
  }

  .btn-remove {
    padding: 8px;
    font-size: 11px;
    min-height: 40px;
  }
}

@media (max-width: 480px) {
  .image-source-buttons {
    flex-direction: column;
  }

  .replace-buttons {
    flex-direction: column;
  }

  .btn-replace {
    min-height: 44px;
  }
}
</style>
