<template>
  <div class="upload-section">
    <h4>{{ locale === 'de' ? 'Videos' : 'Videos' }}</h4>

    <div class="upload-area" @click="triggerFileInput" @drop.prevent="handleDrop" @dragover.prevent>
      <input
        type="file"
        ref="fileInputRef"
        @change="handleVideoUpload"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        style="display: none"
      />
      <div class="upload-placeholder">
        <div class="upload-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <p>{{ locale === 'de' ? 'MP4-Video hochladen' : 'Upload MP4 video' }}</p>
        <small>{{ locale === 'de' ? 'MP4, WebM, MOV' : 'MP4, WebM, MOV' }}</small>
      </div>
    </div>

    <!-- Video-Galerie -->
    <div v-if="videoGallery.length > 0" class="gallery-container">
      <div class="gallery-header">
        <span class="gallery-title">{{
          locale === 'de'
            ? 'Videos (' + videoGallery.length + ')'
            : 'Videos (' + videoGallery.length + ')'
        }}</span>
        <button @click="clearAllVideos" class="btn-clear-all">
          {{ locale === 'de' ? 'Alle löschen' : 'Delete all' }}
        </button>
      </div>

      <div class="gallery-scroll">
        <div class="gallery-grid">
          <div
            v-for="(videoData, index) in videoGallery"
            :key="videoData.id"
            class="thumbnail-item video-thumbnail"
            :class="{ selected: selectedVideoIndex === index }"
            @click="selectVideo(index)"
          >
            <!-- Video-Thumbnail -->
            <video
              :src="videoData.src"
              muted
              preload="metadata"
              class="video-thumb"
              @loadedmetadata="generateThumbnail($event, index)"
            />
            <!-- Play-Icon Overlay -->
            <div class="video-play-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <div class="thumbnail-overlay">
              <button @click.stop="deleteVideo(index)" class="btn-delete-thumb">✕</button>
            </div>
            <div class="thumbnail-info">
              <span class="thumbnail-name">{{ videoData.name }}</span>
              <span class="thumbnail-duration">{{ formatDuration(videoData.duration) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action-Buttons -->
    <div v-if="selectedVideoIndex !== null" class="action-buttons">
      <button @click="addVideoToCanvas" class="btn-primary">
        {{ locale === 'de' ? 'Auf Canvas platzieren' : 'Place on Canvas' }}
      </button>
      <button @click="setVideoAsBackground" class="btn-secondary">
        {{ locale === 'de' ? 'Als Hintergrund' : 'As Background' }}
      </button>
      <button @click="setVideoAsWorkspaceBackground" class="btn-workspace">
        {{ locale === 'de' ? 'Workspace-Hintergrund' : 'Workspace Background' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'

const {
  locale,
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
.upload-section h4 {
  margin: 0 0 8px 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.upload-section h4::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Cpolygon points='23 7 16 12 23 17 23 7'/%3E%3Crect x='1' y='5' width='15' height='14' rx='2' ry='2'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.8));
}

.upload-area {
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  padding: 14px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--secondary-bg);
}

.upload-area:hover {
  border-color: var(--accent-primary);
  background: var(--btn-hover);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.upload-icon {
  width: 32px;
  height: 32px;
  color: var(--accent-ink);
}

.upload-icon svg {
  width: 100%;
  height: 100%;
}

.upload-placeholder p {
  margin: 0;
  font-size: 0.6rem;
  color: var(--text-primary);
}

.upload-placeholder small {
  font-size: 0.5rem;
  color: var(--text-muted);
}

/* Gallery */
.gallery-container {
  margin-top: 8px;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.gallery-title {
  font-size: 0.55rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-clear-all {
  font-size: 0.5rem;
  color: var(--ds-danger);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
}

.btn-clear-all:hover {
  text-decoration: underline;
}

.gallery-scroll {
  max-height: 200px;
  overflow-y: auto;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.thumbnail-item {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.thumbnail-item:hover {
  border-color: color-mix(in srgb, var(--ds-link) 50%, transparent);
}

.thumbnail-item.selected {
  border-color: color-mix(in srgb, var(--ds-link) 90%, transparent);
}

.video-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  pointer-events: none;
}

.video-play-icon svg {
  width: 12px;
  height: 12px;
  margin-left: 2px;
}

.thumbnail-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.thumbnail-item:hover .thumbnail-overlay {
  opacity: 1;
}

.btn-delete-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ds-danger) 90%, transparent);
  border: none;
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.thumbnail-name {
  font-size: 10px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumbnail-duration {
  font-size: 9px;
  color: var(--ds-text-2);
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.btn-primary {
  flex: 1;
  min-width: 100%;
  padding: 6px 10px;
  background: var(--ds-accent-soft);
  border: 1px solid var(--ds-border);
  border-radius: 5px;
  color: var(--accent-tertiary);
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn-primary:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--ds-accent) 30%, transparent);
}

.btn-secondary {
  flex: 1;
  padding: 5px 8px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  color: var(--text-primary);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.btn-secondary:hover {
  background: var(--btn-hover);
  border-color: var(--accent-primary);
}

.btn-workspace {
  flex: 1;
  padding: 5px 8px;
  background: color-mix(in srgb, var(--ds-warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-warning) 30%, transparent);
  border-radius: 5px;
  color: var(--ds-warning);
  font-size: 0.55rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.btn-workspace:hover {
  background: color-mix(in srgb, var(--ds-warning) 20%, transparent);
  border-color: color-mix(in srgb, var(--ds-warning) 50%, transparent);
}

/* Light Theme */

[data-theme='light'] .upload-section h4::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23003971' stroke-width='1.5'%3E%3Cpolygon points='23 7 16 12 23 17 23 7'/%3E%3Crect x='1' y='5' width='15' height='14' rx='2' ry='2'/%3E%3C/svg%3E");
  filter: none;
}

[data-theme='light'] .upload-area {
  border-color: var(--accent-primary);
  background: var(--card-bg);
}

[data-theme='light'] .upload-area:hover {
  background: var(--secondary-bg);
}

[data-theme='light'] .thumbnail-info {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
}

[data-theme='light'] .btn-primary {
  background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
  border: 1px solid var(--border-color);
  color: var(--accent-ink);
}

[data-theme='light'] .btn-primary:hover {
  background: color-mix(in srgb, var(--accent-primary) 25%, transparent);
}

[data-theme='light'] .btn-secondary {
  background: var(--card-bg);
  border-color: var(--border-color);
}

[data-theme='light'] .btn-secondary:hover {
  background: var(--secondary-bg);
}

[data-theme='light'] .btn-workspace {
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
  border-color: var(--border-color);
  color: var(--accent-ink);
}

[data-theme='light'] .btn-workspace:hover {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
  border-color: var(--accent-primary);
}

/* Responsive */
@media (max-width: 768px) {
  .gallery-scroll {
    max-height: 250px;
  }

  .video-play-icon {
    width: 32px;
    height: 32px;
  }

  .btn-delete-thumb {
    width: 24px;
    height: 24px;
  }

  .upload-icon {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 480px) {
  .video-play-icon {
    width: 36px;
    height: 36px;
  }

  .btn-delete-thumb {
    width: 28px;
    height: 28px;
  }
}
</style>
