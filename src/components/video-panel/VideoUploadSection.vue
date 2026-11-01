<template>
  <div class="upload-section">
    <h4 class="section-title">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        aria-hidden="true"
      >
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
      {{ t('videoPanel.videosTitle') }}
    </h4>

    <input
      ref="fileInputRef"
      type="file"
      accept="video/mp4,video/webm,video/ogg,video/quicktime"
      hidden
      @change="handleVideoUpload"
    />

    <!-- Upload-Fläche: Klick öffnet die Dateiauswahl, Dateien können abgelegt werden -->
    <button
      type="button"
      class="upload-area"
      @click="triggerFileInput"
      @drop.prevent="handleDrop"
      @dragover.prevent
    >
      <svg
        class="upload-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        aria-hidden="true"
      >
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
      <span class="upload-label">{{ t('videoPanel.uploadVideo') }}</span>
      <span class="upload-formats">{{ t('videoPanel.uploadFormats') }}</span>
    </button>

    <!-- Video-Galerie -->
    <div v-if="videoGallery.length > 0" class="gallery-container">
      <div class="gallery-header">
        <span class="gallery-title"
          >{{ t('videoPanel.videosTitle') }} ({{ videoGallery.length }})</span
        >
        <UiButton variant="danger" size="sm" @click="clearAllVideos">
          {{ t('videoPanel.deleteAllVideos') }}
        </UiButton>
      </div>

      <div class="gallery-scroll">
        <div class="gallery-grid">
          <div
            v-for="(videoData, index) in videoGallery"
            :key="videoData.id"
            class="thumbnail-item"
            :class="{ selected: selectedVideoIndex === index }"
            role="button"
            tabindex="0"
            :aria-pressed="selectedVideoIndex === index"
            :aria-label="videoData.name"
            @click="selectVideo(index)"
            @keydown.enter.prevent="selectVideo(index)"
            @keydown.space.prevent="selectVideo(index)"
          >
            <video
              :src="videoData.src"
              muted
              preload="metadata"
              class="video-thumb"
              @loadedmetadata="generateThumbnail($event, index)"
            />
            <span class="video-play-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </span>
            <UiIconButton
              :label="t('videoPanel.deleteVideo')"
              size="sm"
              round
              class="btn-delete-thumb"
              @click.stop="deleteVideo(index)"
              @keydown.stop
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </UiIconButton>
            <span class="thumbnail-info">
              <span class="thumbnail-name">{{ videoData.name }}</span>
              <span class="thumbnail-duration">{{ formatDuration(videoData.duration) }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Aktionen für das gewählte Video -->
    <div v-if="selectedVideoIndex !== null" class="action-buttons">
      <UiButton variant="primary" size="sm" block class="action-main" @click="addVideoToCanvas">
        {{ t('videoPanel.placeOnCanvas') }}
      </UiButton>
      <UiButton variant="secondary" size="sm" @click="setVideoAsBackground">
        {{ t('videoPanel.asBackground') }}
      </UiButton>
      <UiButton variant="secondary" size="sm" @click="setVideoAsWorkspaceBackground">
        {{ t('videoPanel.asWorkspaceBackground') }}
      </UiButton>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'

const { t } = useI18n()

const {
  fileInputRef,
  videoGallery,
  selectedVideoIndex,
  triggerFileInput,
  handleDrop,
  handleVideoUpload,
  generateThumbnail,
  selectVideo,
  deleteVideo,
  clearAllVideos,
  formatDuration,
  addVideoToCanvas,
  setVideoAsBackground,
  setVideoAsWorkspaceBackground,
} = inject('videoPanel')
</script>

<style scoped>
.upload-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  margin: 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

.section-title svg {
  width: var(--ds-icon-sm);
  height: var(--ds-icon-sm);
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ds-space-1);
  width: 100%;
  padding: var(--ds-space-4) var(--ds-space-3);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) dashed var(--ds-border-strong);
  border-radius: var(--ds-radius-md);
  color: var(--ds-text);
  font: inherit;
  cursor: pointer;
  transition: border-color var(--ds-duration) var(--ds-ease);
}

.upload-area:hover {
  border-color: var(--ds-accent);
}

.upload-area:focus-visible {
  outline: none;
  border-color: var(--ds-accent);
  box-shadow: var(--ds-focus-ring);
}

.upload-icon {
  width: 28px;
  height: 28px;
  color: var(--accent-ink);
}

.upload-label {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
}

.upload-formats {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}

.gallery-container {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gallery-title {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-3);
}

.gallery-scroll {
  max-height: 200px;
  overflow-y: auto;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: var(--ds-space-2);
}

.thumbnail-item {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-2);
  cursor: pointer;
  transition: border-color var(--ds-duration) var(--ds-ease);
}

.thumbnail-item:hover {
  border-color: var(--ds-border-strong);
}

.thumbnail-item.selected {
  border-color: var(--ds-accent);
}

.thumbnail-item:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
}

.video-thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  border-radius: var(--ds-radius-full);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  pointer-events: none;
}

.video-play-icon svg {
  width: 12px;
  height: 12px;
  margin-left: 2px;
}

/* Löschen-Knopf über dem Video: dunkle Fläche, damit er auf jedem Bild lesbar ist */
.btn-delete-thumb {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 22px;
  height: 22px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  opacity: 0.8;
}

.btn-delete-thumb:hover,
.btn-delete-thumb:focus-visible {
  background: var(--ds-danger);
  color: #fff;
  opacity: 1;
}

.btn-delete-thumb svg {
  width: 12px;
  height: 12px;
}

.thumbnail-info {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  padding: 2px 6px 4px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
  pointer-events: none;
}

.thumbnail-name,
.thumbnail-duration {
  font-size: var(--ds-text-xs);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumbnail-duration {
  opacity: 0.8;
  font-family: var(--ds-font-mono);
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ds-space-2);
}

.action-main {
  grid-column: 1 / -1;
}
</style>
