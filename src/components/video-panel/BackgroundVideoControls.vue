<template>
  <!-- Hintergrund-Video-Steuerung -->
  <div v-if="hasVideoBackground" class="background-video-section">
    <h4>{{ locale === 'de' ? 'Video-Hintergrund' : 'Video Background' }}</h4>

    <!-- Globaler Video-Hintergrund -->
    <div v-if="videoBackground" class="bg-video-item">
      <div class="bg-video-header">
        <span class="bg-video-label">{{ locale === 'de' ? 'Hintergrund' : 'Background' }}</span>
        <span class="bg-video-status" :class="{ playing: isVideoBackgroundPlaying }">
          {{ isVideoBackgroundPlaying ? '▶' : '⏸' }}
        </span>
      </div>

      <div class="bg-video-controls">
        <button
          @click="toggleVideoBackground"
          class="btn-control-lg"
          :title="isVideoBackgroundPlaying ? 'Pause' : 'Play'"
        >
          {{ isVideoBackgroundPlaying ? '⏸' : '▶' }}
        </button>
        <button @click="seekBackwardBg(5)" class="btn-control" title="-5s">⏪</button>
        <button @click="seekForwardBg(5)" class="btn-control" title="+5s">⏩</button>
        <button @click="removeVideoBackground" class="btn-control btn-delete" title="Entfernen">
          ✕
        </button>
      </div>

      <div class="bg-video-seek">
        <span class="seek-time-small">{{ formatTime(videoBackgroundTime) }}</span>
        <input
          type="range"
          :value="videoBackgroundTime"
          @input="seekVideoBackground($event.target.value)"
          :max="videoBackgroundDuration"
          min="0"
          step="0.1"
          class="seek-slider"
        />
        <span class="seek-time-small">{{ formatTime(videoBackgroundDuration) }}</span>
      </div>

      <!-- Lautstärke für Hintergrund-Video -->
      <div class="bg-video-volume">
        <div class="volume-header-small">
          <svg class="volume-icon-small" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path
              v-if="videoBackgroundVolume > 0"
              d="M15.54 8.46a5 5 0 0 1 0 7.07"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          <span>{{ Math.round(videoBackgroundVolume * 100) }}%</span>
        </div>
        <input
          type="range"
          :value="videoBackgroundVolume"
          @input="updateBgVideoVolume($event.target.value)"
          min="0"
          max="1"
          step="0.01"
          class="volume-slider-small"
        />
      </div>
    </div>

    <!-- Workspace Video-Hintergrund -->
    <div v-if="workspaceVideoBackground" class="bg-video-item workspace">
      <div class="bg-video-header">
        <span class="bg-video-label">{{
          locale === 'de' ? 'Workspace-Hintergrund' : 'Workspace Background'
        }}</span>
        <span class="bg-video-status" :class="{ playing: isWsVideoBackgroundPlaying }">
          {{ isWsVideoBackgroundPlaying ? '▶' : '⏸' }}
        </span>
      </div>

      <div class="bg-video-controls">
        <button
          @click="toggleWsVideoBackground"
          class="btn-control-lg"
          :title="isWsVideoBackgroundPlaying ? 'Pause' : 'Play'"
        >
          {{ isWsVideoBackgroundPlaying ? '⏸' : '▶' }}
        </button>
        <button @click="seekBackwardWsBg(5)" class="btn-control" title="-5s">⏪</button>
        <button @click="seekForwardWsBg(5)" class="btn-control" title="+5s">⏩</button>
        <button @click="removeWsVideoBackground" class="btn-control btn-delete" title="Entfernen">
          ✕
        </button>
      </div>

      <div class="bg-video-seek">
        <span class="seek-time-small">{{ formatTime(wsVideoBackgroundTime) }}</span>
        <input
          type="range"
          :value="wsVideoBackgroundTime"
          @input="seekWsVideoBackground($event.target.value)"
          :max="wsVideoBackgroundDuration"
          min="0"
          step="0.1"
          class="seek-slider"
        />
        <span class="seek-time-small">{{ formatTime(wsVideoBackgroundDuration) }}</span>
      </div>

      <!-- Lautstärke für Workspace-Video-Hintergrund -->
      <div class="bg-video-volume">
        <div class="volume-header-small">
          <svg class="volume-icon-small" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path
              v-if="wsVideoBackgroundVolume > 0"
              d="M15.54 8.46a5 5 0 0 1 0 7.07"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          <span>{{ Math.round(wsVideoBackgroundVolume * 100) }}%</span>
        </div>
        <input
          type="range"
          :value="wsVideoBackgroundVolume"
          @input="updateWsBgVideoVolume($event.target.value)"
          min="0"
          max="1"
          step="0.01"
          class="volume-slider-small"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'

const {
  locale,
  hasVideoBackground,
  videoBackground,
  workspaceVideoBackground,
  isVideoBackgroundPlaying,
  isWsVideoBackgroundPlaying,
  videoBackgroundTime,
  videoBackgroundDuration,
  wsVideoBackgroundTime,
  wsVideoBackgroundDuration,
  videoBackgroundVolume,
  wsVideoBackgroundVolume,
  toggleVideoBackground,
  toggleWsVideoBackground,
  seekVideoBackground,
  seekBackwardBg,
  seekForwardBg,
  seekWsVideoBackground,
  seekBackwardWsBg,
  seekForwardWsBg,
  updateBgVideoVolume,
  updateWsBgVideoVolume,
  removeVideoBackground,
  removeWsVideoBackground,
  formatTime,
} = inject('videoPanel')
</script>

<style scoped>
/* Hintergrund-Video Section */
.background-video-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.background-video-section h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #6ea8fe;
}

.bg-video-item {
  padding: 12px;
  background: rgba(110, 168, 254, 0.1);
  border: 1px solid rgba(110, 168, 254, 0.3);
  border-radius: 8px;
  margin-bottom: 10px;
}

.bg-video-item.workspace {
  background: rgba(255, 215, 0, 0.08);
  border-color: rgba(255, 215, 0, 0.3);
}

.bg-video-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.bg-video-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #e9e9eb);
}

.bg-video-status {
  font-size: 12px;
  color: var(--text-secondary, #f8e1a9);
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.bg-video-status.playing {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
}

.bg-video-controls {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.btn-control-lg {
  width: 36px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: rgba(110, 168, 254, 0.3);
  color: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-control-lg:hover {
  background: rgba(110, 168, 254, 0.5);
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

.bg-video-seek {
  display: flex;
  align-items: center;
  gap: 8px;
}

.seek-time-small {
  font-size: 10px;
  font-family: monospace;
  color: var(--text-secondary, #f8e1a9);
  min-width: 35px;
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

/* Hintergrund-Video Lautstärke */
.bg-video-volume {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(110, 168, 254, 0.2);
}

.volume-header-small {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 10px;
  color: var(--text-secondary, #f8e1a9);
}

.volume-icon-small {
  width: 14px;
  height: 14px;
  color: #6ea8fe;
}

.volume-slider-small {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(110, 168, 254, 0.3);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider-small::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #6ea8fe;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider-small::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #6ea8fe;
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.bg-video-item.workspace .bg-video-volume {
  border-top-color: rgba(255, 215, 0, 0.2);
}

.bg-video-item.workspace .volume-icon-small {
  color: #ffd700;
}

.bg-video-item.workspace .volume-slider-small {
  background: rgba(255, 215, 0, 0.3);
}

.bg-video-item.workspace .volume-slider-small::-webkit-slider-thumb {
  background: #ffd700;
}

.bg-video-item.workspace .volume-slider-small::-moz-range-thumb {
  background: #ffd700;
}

/* Light Theme */
[data-theme='light'] .background-video-section {
  border-top-color: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .background-video-section h4 {
  color: #014f99;
}

[data-theme='light'] .bg-video-item {
  background: rgba(1, 79, 153, 0.06);
  border-color: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .bg-video-item.workspace {
  background: rgba(201, 152, 77, 0.08);
  border-color: rgba(201, 152, 77, 0.25);
}

[data-theme='light'] .bg-video-label {
  color: #003971;
}

[data-theme='light'] .bg-video-status {
  color: #014f99;
  background: rgba(0, 0, 0, 0.06);
}

[data-theme='light'] .btn-control-lg {
  background: rgba(1, 79, 153, 0.25);
  color: #f5f4d6;
}

[data-theme='light'] .btn-control-lg:hover {
  background: rgba(1, 79, 153, 0.4);
}

[data-theme='light'] .btn-control {
  background: rgba(0, 0, 0, 0.08);
  color: #003971;
}

[data-theme='light'] .btn-control:hover {
  background: rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .seek-time-small {
  color: #014f99;
}

[data-theme='light'] .seek-slider {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .seek-slider::-webkit-slider-thumb {
  background: #014f99;
}

[data-theme='light'] .bg-video-volume {
  border-top-color: rgba(1, 79, 153, 0.15);
}

[data-theme='light'] .volume-header-small {
  color: #014f99;
}

[data-theme='light'] .volume-icon-small {
  color: #014f99;
}

[data-theme='light'] .volume-slider-small {
  background: rgba(1, 79, 153, 0.2);
}

[data-theme='light'] .volume-slider-small::-webkit-slider-thumb {
  background: #014f99;
}

[data-theme='light'] .volume-slider-small::-moz-range-thumb {
  background: #014f99;
}

[data-theme='light'] .bg-video-item.workspace .bg-video-volume {
  border-top-color: rgba(201, 152, 77, 0.2);
}

[data-theme='light'] .bg-video-item.workspace .volume-icon-small {
  color: #c9984d;
}

[data-theme='light'] .bg-video-item.workspace .volume-slider-small {
  background: rgba(201, 152, 77, 0.25);
}

[data-theme='light'] .bg-video-item.workspace .volume-slider-small::-webkit-slider-thumb {
  background: #c9984d;
}

[data-theme='light'] .bg-video-item.workspace .volume-slider-small::-moz-range-thumb {
  background: #c9984d;
}
</style>
