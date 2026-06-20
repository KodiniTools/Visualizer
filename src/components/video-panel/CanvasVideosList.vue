<template>
  <!-- Canvas-Videos Liste -->
  <div v-if="canvasVideos.length > 0" class="canvas-videos-section">
    <h4>{{ t('videoPanel.canvasVideosTitle') }}</h4>
    <div class="canvas-videos-list">
      <div
        v-for="(video, index) in canvasVideos"
        :key="video.id"
        class="canvas-video-item"
        :class="{ active: isVideoActive(video) }"
        @click="selectCanvasVideo(video)"
      >
        <div class="video-info">
          <span class="video-index">{{ index + 1 }}</span>
          <span class="video-name">Video {{ index + 1 }}</span>
          <span class="video-status" :class="{ playing: video.isPlaying }">
            {{ video.isPlaying ? '▶' : '⏸' }}
          </span>
        </div>
        <div class="video-controls">
          <button
            @click.stop="togglePlayVideo(video)"
            class="btn-control"
            :title="video.isPlaying ? 'Pause' : 'Play'"
          >
            {{ video.isPlaying ? '⏸' : '▶' }}
          </button>
          <button
            @click.stop="removeCanvasVideo(video)"
            class="btn-control btn-delete"
            :title="t('common.remove')"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Globale Video-Steuerung -->
    <div class="global-video-controls">
      <button @click="playAllVideos" class="btn-global">
        {{ t('videoPanel.playAll') }}
      </button>
      <button @click="pauseAllVideos" class="btn-global">
        {{ t('videoPanel.pauseAll') }}
      </button>
    </div>

    <!-- Globale Video-Einstellungen für alle Canvas-Videos -->
    <div class="global-video-settings">
      <div class="settings-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="videoLoop" />
          <span>{{ t('videoPanel.loop') }}</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="videoMuted" />
          <span>{{ t('videoPanel.muted') }}</span>
        </label>
      </div>
    </div>

    <!-- Seek-Steuerung für ausgewähltes Video -->
    <div v-if="selectedCanvasVideo" class="video-seek-section">
      <div class="seek-header">
        <span>{{ t('videoPanel.videoControl') }}</span>
        <span class="seek-time"
          >{{ formatTime(selectedVideoCurrentTime) }} /
          {{ formatTime(selectedVideoDuration) }}</span
        >
      </div>
      <div class="seek-controls">
        <button @click="seekBackward(selectedCanvasVideo, 5)" class="btn-seek" title="-5s">
          ⏪
        </button>
        <input
          type="range"
          :value="selectedVideoCurrentTime"
          @input="seekToTime(selectedCanvasVideo, $event.target.value)"
          :max="selectedVideoDuration"
          min="0"
          step="0.1"
          class="seek-slider"
        />
        <button @click="seekForward(selectedCanvasVideo, 5)" class="btn-seek" title="+5s">
          ⏩
        </button>
      </div>

      <!-- Lautstärke-Slider für Video -->
      <div class="video-volume-section">
        <div class="volume-header">
          <svg class="volume-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path
              v-if="selectedVideoVolume > 0"
              d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          <span>{{ t('videoPanel.volume') }}: {{ Math.round(selectedVideoVolume * 100) }}%</span>
        </div>
        <input
          type="range"
          :value="selectedVideoVolume"
          @input="updateVideoVolume($event.target.value)"
          min="0"
          max="1"
          step="0.01"
          class="volume-slider"
        />
        <p class="volume-hint">{{ t('videoPanel.audioRecordHint') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()

const {
  locale,
  canvasVideos,
  selectedCanvasVideo,
  selectedVideoCurrentTime,
  selectedVideoDuration,
  selectedVideoVolume,
  videoLoop,
  videoMuted,
  isVideoActive,
  selectCanvasVideo,
  togglePlayVideo,
  removeCanvasVideo,
  playAllVideos,
  pauseAllVideos,
  formatTime,
  seekToTime,
  seekBackward,
  seekForward,
  updateVideoVolume,
} = inject('videoPanel')
</script>

<style scoped>
/* Canvas Videos Section */
.canvas-videos-section {
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.canvas-videos-section h4 {
  margin: 0 0 8px 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-primary, #e9e9eb);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.canvas-videos-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.canvas-video-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.canvas-video-item:hover {
  background: rgba(139, 92, 246, 0.15);
}

.canvas-video-item.active {
  border-color: rgba(139, 92, 246, 0.6);
  background: rgba(139, 92, 246, 0.2);
}

.video-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-index {
  width: 20px;
  height: 20px;
  background: rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
}

.video-name {
  font-size: 12px;
  color: var(--text-primary, #e9e9eb);
}

.video-status {
  font-size: 10px;
  color: var(--text-secondary, #f8e1a9);
}

.video-status.playing {
  color: #4ade80;
}

.video-controls {
  display: flex;
  gap: 4px;
}

.btn-control {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #e9e9eb);
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-control:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-control.btn-delete:hover {
  background: rgba(255, 69, 58, 0.3);
  color: #ff6b6b;
}

.global-video-controls {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-global {
  flex: 1;
  padding: 8px 12px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  color: var(--text-primary, #e9e9eb);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-global:hover {
  background: rgba(139, 92, 246, 0.3);
}

/* Globale Video-Einstellungen */
.global-video-settings {
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
}

.global-video-settings .settings-row {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.55rem;
  color: var(--text-primary, #e9e9eb);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  accent-color: var(--accent-primary, #c9984d);
  width: 12px;
  height: 12px;
}

/* Video Seek Section */
.video-seek-section {
  margin-top: 12px;
  padding: 10px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.seek-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--text-secondary, #f8e1a9);
}

.seek-time {
  font-family: monospace;
  color: var(--text-primary, #e9e9eb);
}

.seek-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-seek {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: rgba(139, 92, 246, 0.3);
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-seek:hover {
  background: rgba(139, 92, 246, 0.5);
}

.seek-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(139, 92, 246, 0.3);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.seek-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #8b5cf6;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

.seek-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

/* Video Volume Section */
.video-volume-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(139, 92, 246, 0.2);
}

.volume-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--text-secondary, #f8e1a9);
}

.volume-header .volume-icon {
  width: 16px;
  height: 16px;
  color: #8b5cf6;
}

.volume-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(139, 92, 246, 0.3);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #8b5cf6;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #8b5cf6;
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.volume-hint {
  margin: 8px 0 0 0;
  font-size: 10px;
  color: rgba(255, 193, 7, 0.9);
  background: rgba(255, 193, 7, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  text-align: center;
}

/* Light Theme */
[data-theme='light'] .canvas-videos-section {
  border-top-color: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .canvas-videos-section h4 {
  color: #003971;
}

[data-theme='light'] .canvas-video-item {
  background: rgba(1, 79, 153, 0.06);
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .canvas-video-item:hover {
  background: rgba(1, 79, 153, 0.12);
}

[data-theme='light'] .canvas-video-item.active {
  border-color: rgba(1, 79, 153, 0.5);
  background: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .video-index {
  background: rgba(1, 79, 153, 0.2);
  color: #014f99;
}

[data-theme='light'] .video-name {
  color: #003971;
}

[data-theme='light'] .video-status {
  color: #014f99;
}

[data-theme='light'] .btn-control {
  background: rgba(0, 0, 0, 0.08);
  color: #003971;
}

[data-theme='light'] .btn-control:hover {
  background: rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .btn-global {
  background: rgba(1, 79, 153, 0.12);
  border-color: rgba(1, 79, 153, 0.25);
  color: #003971;
}

[data-theme='light'] .btn-global:hover {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .global-video-settings {
  background: rgba(1, 79, 153, 0.06);
  border-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .checkbox-label {
  color: #003971;
}

[data-theme='light'] .checkbox-label input[type='checkbox'] {
  accent-color: #014f99;
}

[data-theme='light'] .video-seek-section {
  background: rgba(1, 79, 153, 0.06);
  border-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .seek-header {
  color: #014f99;
}

[data-theme='light'] .seek-time {
  color: #003971;
}

[data-theme='light'] .btn-seek {
  background: rgba(1, 79, 153, 0.25);
  color: #f5f4d6;
}

[data-theme='light'] .btn-seek:hover {
  background: rgba(1, 79, 153, 0.4);
}

[data-theme='light'] .seek-slider {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .seek-slider::-webkit-slider-thumb {
  background: #014f99;
}

[data-theme='light'] .video-volume-section {
  border-top-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .volume-header {
  color: #014f99;
}

[data-theme='light'] .volume-header .volume-icon {
  color: #014f99;
}

[data-theme='light'] .volume-slider {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .volume-slider::-webkit-slider-thumb {
  background: #014f99;
}

[data-theme='light'] .volume-slider::-moz-range-thumb {
  background: #014f99;
}

[data-theme='light'] .volume-hint {
  color: #c9984d;
  background: rgba(201, 152, 77, 0.1);
}
</style>
