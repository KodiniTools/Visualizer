<template>
  <!-- Canvas-Videos Liste -->
  <div v-if="canvasVideos.length > 0" class="canvas-videos-section">
    <h4 class="section-title">{{ t('videoPanel.canvasVideosTitle') }}</h4>
    <ul class="canvas-videos-list">
      <li
        v-for="(video, index) in canvasVideos"
        :key="video.id"
        class="canvas-video-item"
        :class="{ active: isVideoActive(video) }"
        @click="selectCanvasVideo(video)"
      >
        <div class="video-info">
          <span class="video-index">{{ index + 1 }}</span>
          <span class="video-name">{{ t('videoPanel.videoLabel') }} {{ index + 1 }}</span>
          <span
            class="video-status"
            :class="{ playing: video.isPlaying }"
            :title="video.isPlaying ? t('videoPanel.playing') : t('videoPanel.paused')"
          ></span>
        </div>
        <div class="video-controls">
          <UiIconButton
            :label="video.isPlaying ? t('videoPanel.pause') : t('videoPanel.play')"
            size="sm"
            @click.stop="togglePlayVideo(video)"
          >
            <svg v-if="video.isPlaying" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"
              />
            </svg>
          </UiIconButton>
          <UiIconButton
            :label="t('common.remove')"
            size="sm"
            class="btn-delete"
            @click.stop="removeCanvasVideo(video)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
            </svg>
          </UiIconButton>
        </div>
      </li>
    </ul>

    <!-- Globale Video-Steuerung -->
    <div class="global-video-controls">
      <UiButton variant="secondary" size="sm" block @click="playAllVideos">
        {{ t('videoPanel.playAll') }}
      </UiButton>
      <UiButton variant="secondary" size="sm" block @click="pauseAllVideos">
        {{ t('videoPanel.pauseAll') }}
      </UiButton>
    </div>

    <!-- Globale Video-Einstellungen für alle Canvas-Videos -->
    <div class="global-video-settings">
      <UiSwitch v-model="videoLoop" :label="t('videoPanel.loop')" />
      <UiSwitch v-model="videoMuted" :label="t('videoPanel.muted')" />
    </div>

    <!-- Seek-Steuerung für ausgewähltes Video -->
    <div v-if="selectedCanvasVideo" class="video-seek-section">
      <div class="seek-header">
        <span class="section-title">{{ t('videoPanel.videoControl') }}</span>
        <span class="seek-time"
          >{{ formatTime(selectedVideoCurrentTime) }} /
          {{ formatTime(selectedVideoDuration) }}</span
        >
      </div>
      <div class="seek-controls">
        <UiIconButton
          :label="t('videoPanel.seekBack5')"
          variant="secondary"
          size="sm"
          @click="seekBackward(selectedCanvasVideo, 5)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 6v12l-8.5-6L11 6zm9.5 0v12L12 12l8.5-6z" />
          </svg>
        </UiIconButton>
        <SliderField
          :model-value="selectedVideoCurrentTime"
          :max="selectedVideoDuration"
          :min="0"
          :step="0.1"
          :default-value="0"
          class="seek-slider"
          @update:model-value="seekToTime(selectedCanvasVideo, $event)"
        />
        <UiIconButton
          :label="t('videoPanel.seekForward5')"
          variant="secondary"
          size="sm"
          @click="seekForward(selectedCanvasVideo, 5)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 6v12l8.5-6L13 6zM3.5 6v12L12 12 3.5 6z" />
          </svg>
        </UiIconButton>
      </div>

      <!-- Lautstärke des ausgewählten Videos -->
      <SliderControl
        :label="t('videoPanel.volume')"
        :model-value="selectedVideoVolume"
        :min="0"
        :max="1"
        :step="0.01"
        :default-value="1"
        :value-text="`${Math.round(selectedVideoVolume * 100)}%`"
        class="volume-control"
        @update:model-value="updateVideoVolume($event)"
      />
      <p class="volume-hint">{{ t('videoPanel.audioRecordHint') }}</p>
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
import SliderControl from '../ui/SliderControl.vue'
import UiButton from '../ui/UiButton.vue'
import UiIconButton from '../ui/UiIconButton.vue'
import UiSwitch from '../ui/UiSwitch.vue'
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
  margin: var(--ds-space-1) 0 0;
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
}

.canvas-videos-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  padding-top: var(--ds-space-3);
  border-top: var(--ds-border-width) solid var(--ds-border);
}

.section-title {
  margin: 0;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--ds-text-2);
}

.canvas-videos-list {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.canvas-video-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--ds-space-1) var(--ds-space-1) var(--ds-space-1) var(--ds-space-2);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  cursor: pointer;
  transition:
    background-color var(--ds-duration) var(--ds-ease),
    border-color var(--ds-duration) var(--ds-ease);
}

.canvas-video-item:hover {
  border-color: var(--ds-border-strong);
}

.canvas-video-item.active {
  border-color: var(--ds-accent);
  background: var(--ds-accent-soft);
}

.video-info {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}

.video-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-3);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  font-family: var(--ds-font-mono);
  color: var(--ds-text-2);
}

.canvas-video-item.active .video-index {
  background: var(--ds-accent);
  color: var(--ds-on-accent);
}

.video-name {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text);
}

/* Punkt: grün = läuft, grau = pausiert */
.video-status {
  width: 6px;
  height: 6px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-text-3);
}

.video-status.playing {
  background: var(--ds-success);
}

.video-controls {
  display: flex;
  gap: 2px;
}

.video-controls svg,
.seek-controls svg {
  width: 14px;
  height: 14px;
}

.btn-delete:hover {
  color: var(--ds-danger);
}

.global-video-controls {
  display: flex;
  gap: var(--ds-space-2);
}

.global-video-settings {
  display: flex;
  gap: var(--ds-space-4);
  padding: var(--ds-space-2) var(--ds-space-3);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}

.video-seek-section {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
  padding: var(--ds-space-3);
  background: var(--ds-surface-2);
  border: var(--ds-border-width) solid var(--ds-border);
  border-radius: var(--ds-radius-md);
}

.seek-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.seek-time {
  font-size: var(--ds-text-xs);
  font-family: var(--ds-font-mono);
  color: var(--ds-text);
}

.seek-controls {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}

.seek-slider {
  flex: 1;
  min-width: 0;
}

.volume-control {
  margin: 0;
}

.volume-hint {
  margin: 0;
  font-size: var(--ds-text-xs);
  line-height: var(--ds-leading);
  color: var(--ds-text-3);
}
</style>
