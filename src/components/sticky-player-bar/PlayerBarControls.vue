<template>
  <div class="spb-bar">
    <!-- Track info + audio source -->
    <div class="spb-track">
      <button
        class="spb-icon-btn spb-source-btn"
        :class="{
          active: isOpen('audio'),
          listening: audioSourceStore.isMicrophoneActive,
        }"
        :title="t('player.openAudioSource')"
        @click="togglePopover('audio')"
      >
        <svg v-if="audioSourceStore.isMicrophoneSource" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
          />
        </svg>
      </button>
      <span class="spb-track-name" :class="{ muted: !playerStore.currentTrack }">
        {{ playerStore.currentTrack?.name || t('player.noTrackLoaded') }}
      </span>
    </div>

    <!-- Transport controls -->
    <div class="spb-transport">
      <button
        class="spb-ctrl"
        :disabled="!playerStore.hasTracks"
        :title="t('player.prev')"
        @click="playerStore.prevTrack"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
      </button>
      <button
        class="spb-ctrl spb-ctrl-main"
        :disabled="!playerStore.hasTracks"
        :title="playerStore.isPlaying ? t('player.pause') : t('player.play')"
        @click="playerStore.togglePlayPause"
      >
        <svg v-if="!playerStore.isPlaying" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      </button>
      <button
        class="spb-ctrl"
        :disabled="!playerStore.hasTracks"
        :title="t('player.stop')"
        @click="playerStore.stopPlayer"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h12v12H6z" />
        </svg>
      </button>
      <button
        class="spb-ctrl"
        :disabled="!playerStore.hasTracks"
        :title="t('player.next')"
        @click="playerStore.nextTrack"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
      </button>
      <button
        class="spb-ctrl spb-ctrl-playmode"
        :class="{ active: playerStore.playMode !== 'none' }"
        :title="playModeLabel"
        @click="cyclePlayMode"
      >
        <svg v-if="playerStore.playMode === 'none'" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
        </svg>
        <svg
          v-else-if="playerStore.playMode === 'sequence'"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M6 18l8.5-6L6 6v12zm8.5-6L23 6v12l-8.5-6zM4 6H2v12h2V6z" />
        </svg>
        <svg
          v-else-if="playerStore.playMode === 'repeat-one'"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"
          />
        </svg>
        <svg
          v-else-if="playerStore.playMode === 'repeat-all'"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"
          />
        </svg>
      </button>
    </div>

    <!-- Progress bar with beat markers -->
    <div class="spb-progress">
      <span class="time-display">{{ formatTime(playerStore.currentTime) }}</span>
      <div class="progress-bar-container" @click="seekToPosition">
        <div class="progress-bar-background">
          <div
            class="progress-bar-fill"
            :style="{ width: playerStore.progressPercentage + '%' }"
          ></div>
          <div
            v-for="marker in beatMarkerStore.sortedMarkers"
            :key="marker.id"
            class="beat-marker-indicator"
            :class="{ triggered: marker.triggered }"
            :style="{ left: getMarkerPosition(marker.time) + '%' }"
            :title="marker.label + ' (' + formatTime(marker.time) + ')'"
            @click.stop="seekToMarker(marker.time)"
          ></div>
          <div
            class="progress-bar-handle"
            :style="{ left: playerStore.progressPercentage + '%' }"
          ></div>
        </div>
      </div>
      <span class="time-display">{{ formatTime(playerStore.duration) }}</span>
    </div>

    <!-- Right actions: popover toggles -->
    <div class="spb-actions">
      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('markers') }"
        :title="t('player.openMarkers')"
        @click="togglePopover('markers')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
        <span v-if="beatMarkerStore.markerCount > 0" class="spb-badge">{{
          beatMarkerStore.markerCount
        }}</span>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('volume') }"
        :title="t('player.openVolume')"
        @click="togglePopover('volume')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
          />
        </svg>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('playlist') }"
        :title="t('player.openPlaylist')"
        @click="togglePopover('playlist')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 10h11v2H3v-2zm0-4h11v2H3V6zm0 8h7v2H3v-2zm13-1v5.55l4-2.28-4-3.27z" />
        </svg>
        <span v-if="playerStore.playlist.length > 0" class="spb-badge">{{
          playerStore.playlist.length
        }}</span>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('gallery') }"
        :title="t('player.openGallery')"
        @click="togglePopover('gallery')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"
          />
        </svg>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('audioReactive') }"
        :title="t('player.openAudioReactive')"
        @click="togglePopover('audioReactive')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z" />
        </svg>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('canvasFormat') }"
        :title="t('player.openCanvasFormat')"
        @click="togglePopover('canvasFormat')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"
          />
        </svg>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('screenshot') }"
        :title="t('player.openScreenshot')"
        @click="togglePopover('screenshot')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8a3 3 0 100 6 3 3 0 000-6z"
          />
        </svg>
      </button>

      <button
        class="spb-icon-btn spb-record-btn"
        :class="{ active: isOpen('recorder'), recording: recorderStore.isRecording }"
        :title="t('player.openRecorder')"
        @click="togglePopover('recorder')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8" />
        </svg>
        <span v-if="recorderStore.isRecording" class="spb-rec-dot"></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useAudioSourceStore } from '../../stores/audioSourceStore.js'
import { useRecorderStore } from '../../stores/recorderStore.js'
import { formatTime } from '../../utils/formatTime.js'

const { t } = useI18n()
const playerStore = usePlayerStore()
const beatMarkerStore = useBeatMarkerStore()
const audioSourceStore = useAudioSourceStore()
const recorderStore = useRecorderStore()

const { popover, playMode, markers } = inject('playerBar')
const { isOpen, togglePopover } = popover
const { cyclePlayMode, playModeLabel } = playMode
const { getMarkerPosition, seekToMarker } = markers

const seekToPosition = (event) => {
  if (!playerStore.audioRef || playerStore.duration === 0) return
  const rect = event.currentTarget.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const newTime = percentage * playerStore.duration
  playerStore.seekTo(newTime)
}
</script>

<style scoped>
.spb-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 16px;
  background-color: var(--card-bg, #142640);
  border-top: 1px solid var(--border-color, rgba(201, 152, 77, 0.25));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.35);
}

/* Track info */
.spb-track {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
  max-width: 240px;
  flex-shrink: 0;
}

.spb-track-name {
  font-size: 0.7rem;
  color: var(--accent-tertiary, #f8e1a9);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spb-track-name.muted {
  color: var(--text-muted, #7a8da0);
  font-weight: 500;
}

/* Transport */
.spb-transport {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.spb-ctrl {
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary, #e9e9eb);
  transition: all 0.2s ease;
  padding: 0;
  flex-shrink: 0;
}
.spb-ctrl:hover:not(:disabled) {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: scale(1.05);
}
.spb-ctrl:active:not(:disabled) {
  transform: scale(0.95);
}
.spb-ctrl:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.spb-ctrl svg {
  width: 14px;
  height: 14px;
}
.spb-ctrl-main {
  width: 38px;
  height: 38px;
  background-color: var(--accent-primary, #c9984d);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
}
.spb-ctrl-main:hover:not(:disabled) {
  background-color: var(--accent-tertiary, #f8e1a9);
  border-color: var(--accent-tertiary, #f8e1a9);
}
.spb-ctrl-main svg {
  width: 18px;
  height: 18px;
}
.spb-ctrl-playmode.active {
  background-color: rgba(74, 158, 255, 0.2);
  border-color: #4a9eff;
  color: #4a9eff;
}
[data-theme='light'] .spb-ctrl-playmode.active {
  background-color: rgba(1, 79, 153, 0.12);
  border-color: #014f99;
  color: #014f99;
}

/* Progress */
.spb-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Hold a fixed comfortable width instead of stretching across the whole
     screen. Grow is 0 so the space it no longer eats is absorbed by the
     action cluster's auto margin (Rec etc. get pushed to the right edge);
     shrink is 1 so it still condenses on narrow viewports. */
  flex: 0 1 520px;
  min-width: 120px;
}
.time-display {
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  min-width: 30px;
  text-align: center;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.progress-bar-container {
  flex: 1;
  cursor: pointer;
  padding: 8px 0;
}
.progress-bar-background {
  position: relative;
  height: 4px;
  background-color: var(--secondary-bg, #0e1c32);
  border-radius: 2px;
  overflow: visible;
}
.progress-bar-fill {
  position: absolute;
  height: 100%;
  background-color: var(--accent-primary, #c9984d);
  border-radius: 2px;
  transition: width 0.1s linear;
}
.progress-bar-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background-color: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  transition: left 0.1s linear;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}
.progress-bar-container:hover .progress-bar-background {
  height: 6px;
}
.progress-bar-container:hover .progress-bar-handle {
  width: 12px;
  height: 12px;
  background-color: var(--accent-primary, #c9984d);
}
.beat-marker-indicator {
  position: absolute;
  top: -4px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid var(--accent-primary);
  transform: translateX(-50%);
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}
.beat-marker-indicator:hover {
  border-top-color: var(--accent-tertiary);
  transform: translateX(-50%) scale(1.3);
}
.beat-marker-indicator.triggered {
  border-top-color: #4ade80;
  animation: markerPulse 0.3s ease-out;
}
@keyframes markerPulse {
  0% {
    transform: translateX(-50%) scale(1);
  }
  50% {
    transform: translateX(-50%) scale(1.5);
  }
  100% {
    transform: translateX(-50%) scale(1);
  }
}

/* Right actions */
.spb-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  /* Pin the cluster to the right edge; absorbs the space freed by the capped
     progress bar. */
  margin-left: auto;
}

.spb-icon-btn {
  position: relative;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary, #e9e9eb);
  transition: all 0.2s ease;
  padding: 0;
}
.spb-icon-btn:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
}
.spb-icon-btn.active {
  background-color: var(--accent-primary, #c9984d);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
}
.spb-icon-btn svg {
  width: 16px;
  height: 16px;
}
.spb-source-btn.listening {
  border-color: #4ade80;
  color: #4ade80;
}
.spb-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 8px;
  background-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
  font-size: 8px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.spb-record-btn {
  color: #f44336;
}
.spb-record-btn.recording {
  background-color: rgba(244, 67, 54, 0.2);
  border-color: #f44336;
  animation: recPulse 1.4s ease-in-out infinite;
}
.spb-record-btn.recording.active {
  color: #f44336;
}
.spb-rec-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #f44336;
  border: 1.5px solid var(--card-bg, #142640);
  animation: recPulse 1s ease-in-out infinite;
}
@keyframes recPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

/* Light theme */
[data-theme='light'] .spb-bar {
  background-color: #ffffff;
  border-top-color: rgba(1, 79, 153, 0.18);
}
[data-theme='light'] .spb-ctrl,
[data-theme='light'] .spb-icon-btn {
  background-color: #eef2f8;
  /* Stronger, clearly visible outline + dark icon for contrast on white */
  border-color: rgba(1, 79, 153, 0.4);
  color: #003971;
}
[data-theme='light'] .spb-ctrl:hover:not(:disabled),
[data-theme='light'] .spb-icon-btn:hover {
  background-color: #dfe8f4;
  border-color: var(--accent-primary, #014f99);
}
/* Keep the main play/pause button filled and prominent (the light .spb-ctrl
   rule above has the same specificity and would otherwise wash it out). */
[data-theme='light'] .spb-ctrl-main {
  background-color: var(--accent-primary, #014f99);
  border-color: var(--accent-primary, #014f99);
  color: #ffffff;
}
[data-theme='light'] .spb-ctrl-main:hover:not(:disabled) {
  background-color: #013a73;
  border-color: #013a73;
}

/* Responsive */
@media (max-width: 768px) {
  .spb-bar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 10px;
  }
  .spb-track {
    order: 1;
    min-width: 0;
    flex: 1;
  }
  .spb-actions {
    order: 2;
  }
  .spb-progress {
    order: 3;
    /* Full row width on small screens */
    flex-basis: 100%;
  }
  .spb-transport {
    order: 4;
    flex-basis: 100%;
    justify-content: center;
  }
}
</style>
