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
        <SliderField
          :model-value="selectedVideoCurrentTime"
          @update:model-value="seekToTime(selectedCanvasVideo, $event)"
          :max="selectedVideoDuration"
          :min="0"
          :step="0.1"
          :default-value="0"
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
        <SliderField
          :model-value="selectedVideoVolume"
          @update:model-value="updateVideoVolume($event)"
          :min="0"
          :max="1"
          :step="0.01"
          :default-value="1"
          class="volume-slider"
        />
        <p class="volume-hint">{{ t('videoPanel.audioRecordHint') }}</p>
      </div>
    </div>

    <!--
      Audio-Reaktiv: identische Einstellungen wie bei Bildern. Immer sichtbar,
      sobald Videos auf dem Canvas liegen – gilt für das ausgewählte Video,
      sonst für das erste in der Liste.
    -->
    <VideoAudioReactive
      v-if="audioTargetVideo"
      :video="audioTargetVideo"
      :label="audioTargetLabel"
    />
    <p v-if="audioTargetVideo && !selectedCanvasVideo" class="audio-target-hint">
      {{ t('videoPanel.audioTargetHint') }}
    </p>
  </div>
</template>

<script setup>
import SliderField from '../ui/SliderField.vue'
import VideoAudioReactive from './VideoAudioReactive.vue'
import { computed, inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()

const {
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

// Ziel des Audio-Reaktiv-Panels: ausgewähltes Video, sonst das erste Canvas-Video
const audioTargetVideo = computed(() => selectedCanvasVideo.value || canvasVideos.value[0] || null)
const audioTargetLabel = computed(() => {
  const v = audioTargetVideo.value
  if (!v) return ''
  const idx = canvasVideos.value.indexOf(v)
  return `${t('videoPanel.videoLabel')} ${idx >= 0 ? idx + 1 : 1}`
})
</script>

<style scoped>
.audio-target-hint {
  margin: 4px 0 0;
  font-size: var(--ds-text-xs);
  color: var(--text-muted);
}

/* Canvas Videos Section */
.canvas-videos-section {
  padding-top: 12px;
  border-top: 1px solid var(--ds-border);
}

.canvas-videos-section h4 {
  margin: 0 0 8px 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--text-primary);
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
  background: color-mix(in srgb, var(--ds-link) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-link) 20%, transparent);
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.canvas-video-item:hover {
  background: color-mix(in srgb, var(--ds-link) 15%, transparent);
}

.canvas-video-item.active {
  border-color: color-mix(in srgb, var(--ds-link) 60%, transparent);
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
}

.video-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-index {
  width: 20px;
  height: 20px;
  background: color-mix(in srgb, var(--ds-link) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-medium);
}

.video-name {
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
}

.video-status {
  font-size: var(--ds-text-xs);
  color: var(--text-secondary);
}

.video-status.playing {
  color: var(--ds-success);
}

.video-controls {
  display: flex;
  gap: 4px;
}

.btn-control {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--ds-radius-sm);
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-control:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-control.btn-delete:hover {
  background: color-mix(in srgb, var(--ds-danger) 30%, transparent);
  color: var(--ds-danger);
}

.global-video-controls {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-global {
  flex: 1;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-link) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  color: var(--text-primary);
  font-size: var(--ds-text-xs);
  cursor: pointer;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-global:hover {
  background: color-mix(in srgb, var(--ds-link) 30%, transparent);
}

/* Globale Video-Einstellungen */
.global-video-settings {
  margin-top: 10px;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--ds-link) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-link) 20%, transparent);
  border-radius: var(--ds-radius-sm);
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
  font-size: var(--ds-text-xs);
  color: var(--text-primary);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  accent-color: var(--accent-primary);
  width: 12px;
  height: 12px;
}

/* Video Seek Section */
.video-seek-section {
  margin-top: 12px;
  padding: 10px;
  background: color-mix(in srgb, var(--ds-link) 10%, transparent);
  border-radius: var(--ds-radius-sm);
  border: 1px solid color-mix(in srgb, var(--ds-link) 20%, transparent);
}

.seek-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: var(--ds-text-xs);
  color: var(--text-secondary);
}

.seek-time {
  font-family: var(--ds-font-mono);
  color: var(--text-primary);
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
  border-radius: var(--ds-radius-sm);
  background: color-mix(in srgb, var(--ds-link) 30%, transparent);
  color: white;
  font-size: var(--ds-text-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--ds-duration) var(--ds-ease);
}

.btn-seek:hover {
  background: color-mix(in srgb, var(--ds-link) 50%, transparent);
}

.seek-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: color-mix(in srgb, var(--ds-link) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  outline: none;
  cursor: pointer;
}

.seek-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: var(--ds-link);
  border-radius: var(--ds-radius-full);
  cursor: pointer;
  transition: transform 0.1s;
}

/* Video Volume Section */
.video-volume-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--ds-link) 20%, transparent);
}

.volume-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: var(--ds-text-xs);
  color: var(--text-secondary);
}

.volume-header .volume-icon {
  width: 16px;
  height: 16px;
  color: var(--ds-link);
}

.volume-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: color-mix(in srgb, var(--ds-link) 30%, transparent);
  border-radius: var(--ds-radius-sm);
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: var(--ds-link);
  border-radius: var(--ds-radius-full);
  cursor: pointer;
  transition: transform 0.1s;
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--ds-link);
  border-radius: var(--ds-radius-full);
  border: none;
  cursor: pointer;
}

.volume-hint {
  margin: 8px 0 0 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-warning);
  background: color-mix(in srgb, var(--ds-warning) 10%, transparent);
  padding: 4px 8px;
  border-radius: var(--ds-radius-sm);
  text-align: center;
}

/* Light Theme */
[data-theme='light'] .canvas-videos-section {
  border-top-color: var(--ds-border);
}

[data-theme='light'] .canvas-video-item {
  background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .canvas-video-item:hover {
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
}

[data-theme='light'] .canvas-video-item.active {
  border-color: var(--accent-primary);
  background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
}

[data-theme='light'] .video-index {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
  color: var(--accent-ink);
}

[data-theme='light'] .video-status {
  color: var(--accent-ink);
}

[data-theme='light'] .btn-control {
  background: rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .btn-control:hover {
  background: rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .btn-global {
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .btn-global:hover {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
}

[data-theme='light'] .global-video-settings {
  background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .video-seek-section {
  background: color-mix(in srgb, var(--accent-primary) 6%, transparent);
  border-color: var(--border-color);
}

[data-theme='light'] .seek-header {
  color: var(--accent-ink);
}

[data-theme='light'] .btn-seek {
  background: color-mix(in srgb, var(--accent-primary) 25%, transparent);
  color: var(--accent-text);
}

[data-theme='light'] .btn-seek:hover {
  background: color-mix(in srgb, var(--accent-primary) 40%, transparent);
}

[data-theme='light'] .seek-slider {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
}

[data-theme='light'] .seek-slider::-webkit-slider-thumb {
  background: var(--accent-primary);
}

[data-theme='light'] .video-volume-section {
  border-top-color: var(--border-color);
}

[data-theme='light'] .volume-header {
  color: var(--accent-ink);
}

[data-theme='light'] .volume-header .volume-icon {
  color: var(--accent-ink);
}

[data-theme='light'] .volume-slider {
  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
}

[data-theme='light'] .volume-slider::-webkit-slider-thumb {
  background: var(--accent-primary);
}

[data-theme='light'] .volume-slider::-moz-range-thumb {
  background: var(--accent-primary);
}

[data-theme='light'] .volume-hint {
  color: var(--accent-ink);
  background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
}
</style>
