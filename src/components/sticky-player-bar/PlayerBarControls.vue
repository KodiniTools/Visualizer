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
            :title="marker.label + ' (' + formatTimePrecise(marker.time) + ')'"
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
      <!-- Globaler Undo/Redo-Verlauf (alle Panels) -->
      <button
        class="spb-icon-btn spb-history-btn"
        :disabled="!historyStore.canUndo"
        :title="undoTitle"
        :aria-label="t('history.undo')"
        data-testid="history-undo"
        @click="historyStore.undo()"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
          />
        </svg>
      </button>
      <button
        class="spb-icon-btn spb-history-btn"
        :disabled="!historyStore.canRedo"
        :title="redoTitle"
        :aria-label="t('history.redo')"
        data-testid="history-redo"
        @click="historyStore.redo()"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"
          />
        </svg>
      </button>
      <span class="spb-divider" aria-hidden="true"></span>

      <button
        class="spb-icon-btn spb-slideshow-btn"
        :class="{ active: isOpen('slideshow') }"
        :title="t('player.openSlideshow')"
        data-testid="open-slideshow"
        @click="togglePopover('slideshow')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"
          />
        </svg>
        <span v-if="slideshow.imageCount >= 2" class="spb-badge">{{ slideshow.imageCount }}</span>
      </button>

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
        :class="{ active: isOpen('presets') }"
        :title="t('player.openPresets')"
        @click="togglePopover('presets')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2l2.09 6.26H20.5l-5.2 3.78 1.99 6.26L12 14.52 6.71 18.3l1.99-6.26-5.2-3.78h6.41L12 2z"
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
        :class="{ active: isOpen('textManager') }"
        :title="t('player.openTextManager')"
        @click="togglePopover('textManager')"
      >
        <!-- Großes „T“ (Text-Manager) -->
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 4v3h5.5v12h3V7H19V4H5z" />
        </svg>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('textAudioReactive') }"
        :title="t('player.openTextAudioReactive')"
        @click="togglePopover('textAudioReactive')"
      >
        <!-- Schrift „T“ über Pegelbalken (Text-Audio-Reaktiv) -->
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 3h12v2.5h-4.75V15h-2.5V5.5H4V3z" />
          <path d="M3 18h2v3H3v-3zm4-2h2v5H7v-5zm4 3h2v2h-2v-2zm4-4h2v6h-2v-6zm4 2h2v4h-2v-4z" />
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
        :class="{ active: isOpen('visualizer') }"
        :title="t('player.openVisualizer')"
        @click="togglePopover('visualizer')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 12h2v9H3v-9zm4-6h2v15H7V6zm4 3h2v12h-2V9zm4-6h2v18h-2V3zm4 9h2v9h-2v-9z" />
        </svg>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('visualizerControls') }"
        :title="t('player.openVisualizerControls')"
        @click="togglePopover('visualizerControls')"
      >
        <!-- Schieberegler (Visualizer-Steuerung) -->
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"
          />
        </svg>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('multiLayer') }"
        :title="t('player.openMultiLayer')"
        @click="togglePopover('multiLayer')"
      >
        <!-- Gestapelte Ebenen (Layer) -->
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zm0 11.5L4.21 9.62 2 10.73l10 5 10-5-2.21-1.11L12 13.5zm0 5L4.21 14.62 2 15.73l10 5 10-5-2.21-1.11L12 18.5z"
          />
        </svg>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('effects') }"
        :title="t('player.openEffects')"
        @click="togglePopover('effects')"
      >
        <!-- Funkeln (Post-Processing-Effekte) -->
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-8.5.5L8 4 5.5 9.5 0 12l5.5 2.5L8 20l2.5-5.5L16 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"
          />
        </svg>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('canvasControl') }"
        :title="t('player.openCanvasControl')"
        @click="togglePopover('canvasControl')"
      >
        <!-- Palette (Canvas-Steuerung: Hintergrund, Presets, Effekte) -->
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
          />
        </svg>
      </button>

      <button
        class="spb-icon-btn"
        :class="{ active: isOpen('video') }"
        :title="t('player.openVideo')"
        @click="togglePopover('video')"
      >
        <!-- Filmklappe/Videokamera -->
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
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
import { computed, inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useHistoryStore } from '../../stores/historyStore.js'
import { useSlideshowPopover } from '../../composables/useSlideshowPopover.js'
import { historyStepLabel } from '../../lib/history/historyLabels.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useAudioSourceStore } from '../../stores/audioSourceStore.js'
import { useRecorderStore } from '../../stores/recorderStore.js'
import { formatTime, formatTimePrecise } from '../../utils/formatTime.js'

const { t } = useI18n()
const playerStore = usePlayerStore()
const beatMarkerStore = useBeatMarkerStore()
const audioSourceStore = useAudioSourceStore()
const recorderStore = useRecorderStore()
const historyStore = useHistoryStore()
const slideshow = useSlideshowPopover()

// Tooltip nennt den Schritt, der rückgängig gemacht / wiederholt würde.
const undoTitle = computed(() => {
  const cmd = historyStore.history[historyStore.currentIndex]
  const base = `${t('history.undo')} (${t('history.undoShortcut')})`
  return historyStore.canUndo && cmd ? `${base}: ${historyStepLabel(cmd, t)}` : base
})
const redoTitle = computed(() => {
  const cmd = historyStore.history[historyStore.currentIndex + 1]
  const base = `${t('history.redo')} (${t('history.redoShortcut')})`
  return historyStore.canRedo && cmd ? `${base}: ${historyStepLabel(cmd, t)}` : base
})

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
.spb-icon-btn:disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}
.spb-divider {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background-color: var(--border-color, rgba(201, 152, 77, 0.3));
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
