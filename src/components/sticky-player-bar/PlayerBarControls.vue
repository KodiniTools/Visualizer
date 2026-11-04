<template>
  <div class="spb-bar">
    <!-- Track info + audio source -->
    <div class="spb-track">
      <UiIconButton
        class="spb-icon-btn spb-source-btn"
        :class="{ active: isOpen('audio'), listening: audioSourceStore.isMicrophoneActive }"
        v-bind="toggleProps('audio')"
        :label="t('player.openAudioSource')"
        @click="togglePopover('audio')"
      >
        <PlayerIcon :icon="audioSourceStore.isMicrophoneSource ? ICONS.microphone : ICONS.note" />
      </UiIconButton>
      <span class="spb-track-name" :class="{ muted: !playerStore.currentTrack }">
        {{ playerStore.currentTrack?.name || t('player.noTrackLoaded') }}
      </span>
    </div>

    <!-- Transport controls -->
    <div class="spb-transport">
      <UiIconButton
        v-for="ctrl in transport"
        :key="ctrl.id"
        class="spb-ctrl"
        :class="{ 'spb-ctrl-main': ctrl.main }"
        :variant="ctrl.main ? 'primary' : 'secondary'"
        round
        :disabled="!playerStore.hasTracks"
        :label="ctrl.label"
        @click="ctrl.action"
      >
        <PlayerIcon :icon="ctrl.icon" />
      </UiIconButton>
      <UiIconButton
        class="spb-ctrl spb-ctrl-playmode"
        :class="{ active: playerStore.playMode !== 'none' }"
        variant="secondary"
        round
        :pressed="playerStore.playMode !== 'none'"
        :label="playModeLabel"
        @click="cyclePlayMode"
      >
        <PlayerIcon :icon="PLAY_MODE_ICONS[playerStore.playMode] ?? PLAY_MODE_ICONS.shuffle" />
      </UiIconButton>
    </div>

    <!-- Progress bar with beat markers -->
    <div class="spb-progress">
      <span class="time-display">{{ formatTime(playerStore.currentTime) }}</span>
      <div
        class="progress-bar-container"
        role="slider"
        tabindex="0"
        :aria-label="t('player.seekPosition')"
        aria-valuemin="0"
        :aria-valuemax="Math.round(playerStore.duration || 0)"
        :aria-valuenow="Math.round(playerStore.currentTime || 0)"
        :aria-valuetext="`${formatTime(playerStore.currentTime)} / ${formatTime(playerStore.duration)}`"
        @click="seekToPosition"
        @keydown="onSeekKeydown"
      >
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
      <!-- Globaler Undo/Redo-Verlauf (alle Panels); Titel nennt den Schritt -->
      <UiIconButton
        class="spb-icon-btn"
        variant="secondary"
        :disabled="!historyStore.canUndo"
        :label="undoTitle"
        data-testid="history-undo"
        @click="historyStore.undo()"
      >
        <PlayerIcon :icon="ICONS.undo" />
      </UiIconButton>
      <UiIconButton
        class="spb-icon-btn"
        variant="secondary"
        :disabled="!historyStore.canRedo"
        :label="redoTitle"
        data-testid="history-redo"
        @click="historyStore.redo()"
      >
        <PlayerIcon :icon="ICONS.redo" />
      </UiIconButton>
      <span class="spb-divider" aria-hidden="true"></span>

      <UiIconButton
        class="spb-icon-btn spb-slideshow-btn"
        :class="{ active: isOpen('slideshow') }"
        v-bind="toggleProps('slideshow')"
        :label="t('player.openSlideshow')"
        data-testid="open-slideshow"
        @click="togglePopover('slideshow')"
      >
        <PlayerIcon :icon="ICONS.slideshow" />
        <span v-if="slideshow.imageCount >= 2" class="spb-badge">{{ slideshow.imageCount }}</span>
      </UiIconButton>

      <UiIconButton
        class="spb-icon-btn"
        :class="{ active: isOpen('markers') }"
        v-bind="toggleProps('markers')"
        :label="t('player.openMarkers')"
        @click="togglePopover('markers')"
      >
        <PlayerIcon :icon="ICONS.markers" />
        <span v-if="beatMarkerStore.markerCount > 0" class="spb-badge">{{
          beatMarkerStore.markerCount
        }}</span>
      </UiIconButton>

      <UiIconButton
        class="spb-icon-btn spb-volume-btn"
        :class="{ active: isOpen('volume'), muted: playerStore.isMuted }"
        v-bind="toggleProps('volume')"
        :label="
          playerStore.isMuted
            ? `${t('player.openVolume')} (${t('player.muted')})`
            : t('player.openVolume')
        "
        @click="togglePopover('volume')"
      >
        <PlayerIcon :icon="playerStore.isMuted ? ICONS.volumeMuted : ICONS.volume" />
      </UiIconButton>

      <UiIconButton
        v-for="item in popoverButtons"
        :key="item.id"
        class="spb-icon-btn"
        :class="{ active: isOpen(item.id) }"
        v-bind="toggleProps(item.id)"
        :label="t(item.label)"
        :data-popover="item.id"
        @click="togglePopover(item.id)"
      >
        <PlayerIcon :icon="ICONS[item.id]" />
        <span v-if="item.badge" class="spb-badge">{{ item.badge }}</span>
      </UiIconButton>

      <UiIconButton
        class="spb-icon-btn spb-record-btn"
        :class="{ active: isOpen('recorder'), recording: recorderStore.isRecording }"
        v-bind="toggleProps('recorder')"
        :label="t('player.openRecorder')"
        @click="togglePopover('recorder')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
        </svg>
        <span v-if="recorderStore.isRecording" class="spb-rec-dot"></span>
      </UiIconButton>
    </div>
  </div>
</template>

<script setup>
import { computed, h, inject } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useHistoryStore } from '../../stores/historyStore.js'
import { useSlideshowPopover } from '../../composables/useSlideshowPopover.js'
import { historyStepLabel } from '../../lib/history/historyLabels.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'
import { useAudioSourceStore } from '../../stores/audioSourceStore.js'
import { useRecorderStore } from '../../stores/recorderStore.js'
import { formatTime, formatTimePrecise } from '../../utils/formatTime.js'
import UiIconButton from '../ui/UiIconButton.vue'
import { PLAYER_ICONS as ICONS, PLAY_MODE_ICONS, iconPaths } from './playerBarIcons.js'

/** Symbol aus einem oder mehreren SVG-Pfaden (24×24, currentColor). */
const PlayerIcon = (props) =>
  h(
    'svg',
    { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' },
    iconPaths(props.icon).map((d) => h('path', { d })),
  )
PlayerIcon.props = ['icon']

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

/** Popover-Umschalter: offen = Primärfläche mit aria-pressed. */
const toggleProps = (id) => ({
  variant: isOpen(id) ? 'primary' : 'secondary',
  pressed: isOpen(id),
})

const transport = computed(() => [
  { id: 'prev', label: t('player.prev'), icon: ICONS.prev, action: () => playerStore.prevTrack() },
  {
    id: 'play',
    main: true,
    label: playerStore.isPlaying ? t('player.pause') : t('player.play'),
    icon: playerStore.isPlaying ? ICONS.pause : ICONS.play,
    action: () => playerStore.togglePlayPause(),
  },
  { id: 'stop', label: t('player.stop'), icon: ICONS.stop, action: () => playerStore.stopPlayer() },
  { id: 'next', label: t('player.next'), icon: ICONS.next, action: () => playerStore.nextTrack() },
])

/** Popover-Knöpfe zwischen Lautstärke und Aufnahme, in Anzeigereihenfolge. */
const popoverButtons = computed(() => [
  { id: 'playlist', label: 'player.openPlaylist', badge: playerStore.playlist.length },
  { id: 'gallery', label: 'player.openGallery' },
  { id: 'presets', label: 'player.openPresets' },
  { id: 'audioReactive', label: 'player.openAudioReactive' },
  { id: 'textManager', label: 'player.openTextManager' },
  { id: 'shapes', label: 'player.openShapes' },
  { id: 'textAudioReactive', label: 'player.openTextAudioReactive' },
  { id: 'canvasFormat', label: 'player.openCanvasFormat' },
  { id: 'visualizer', label: 'player.openVisualizer' },
  { id: 'visualizerControls', label: 'player.openVisualizerControls' },
  { id: 'multiLayer', label: 'player.openMultiLayer' },
  { id: 'effects', label: 'player.openEffects' },
  { id: 'canvasControl', label: 'player.openCanvasControl' },
  { id: 'video', label: 'player.openVideo' },
  { id: 'screenshot', label: 'player.openScreenshot' },
])

const seekToPosition = (event) => {
  if (!playerStore.audioRef || playerStore.duration === 0) return
  const rect = event.currentTarget.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const newTime = percentage * playerStore.duration
  playerStore.seekTo(newTime)
}

/** Schrittweite der Pfeiltasten auf dem Fortschrittsbalken (Sekunden) */
const SEEK_STEP = 5

/** Tastatur auf dem Fortschrittsbalken: Pfeile ±5 s, Pos1/Ende springen an Anfang/Ende. */
const onSeekKeydown = (event) => {
  const duration = playerStore.duration
  if (!playerStore.audioRef || !duration) return
  const now = playerStore.currentTime
  const targets = {
    ArrowLeft: now - SEEK_STEP,
    ArrowDown: now - SEEK_STEP,
    ArrowRight: now + SEEK_STEP,
    ArrowUp: now + SEEK_STEP,
    Home: 0,
    End: duration,
  }
  if (!(event.key in targets)) return
  // Nicht an die globalen Kürzel weiterreichen (← → wechseln dort den Titel)
  event.preventDefault()
  event.stopPropagation()
  playerStore.seekTo(Math.min(duration, Math.max(0, targets[event.key])))
}
</script>

<style scoped>
/* Player-Leiste nach Design-System v2: ds-surface-1, 1 px Rand oben, kein
   Schatten, Höhe ds-player-height. Transport = runde Icon-Buttons (secondary),
   Play/Pause = die eine Primärfläche in Gold. Hover ändert nur Farbe. */
.spb-bar {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  min-height: var(--ds-player-height);
  padding: 0 var(--ds-space-4);
  background-color: var(--ds-surface-1);
  border-top: var(--ds-border-width) solid var(--ds-border);
}

/* Track info */
.spb-track {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  min-width: 140px;
  max-width: 240px;
  flex-shrink: 0;
}

.spb-track-name {
  font-size: var(--ds-text-sm);
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spb-track-name.muted {
  color: var(--ds-text-2);
  font-weight: var(--ds-weight-regular);
}

/* Transport */
.spb-transport {
  display: flex;
  align-items: center;
  gap: var(--ds-space-1);
  flex-shrink: 0;
}

/* Transport: UiIconButton round (secondary), Play/Pause primär und größer */
.spb-transport .spb-ctrl svg {
  width: var(--ds-icon-sm);
  height: var(--ds-icon-sm);
}
.spb-transport .spb-ctrl-main {
  width: var(--ds-control-lg);
  height: var(--ds-control-lg);
}
.spb-transport .spb-ctrl-main svg {
  width: var(--ds-icon-md);
  height: var(--ds-icon-md);
}
/* Umschalter „an“: Tinte accent-ink (Gold im Dark, Text im Light) */
.spb-transport .spb-ctrl-playmode.ui-icon-button--pressed {
  color: var(--accent-ink);
}

/* Progress */
.spb-progress {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  /* Hold a fixed comfortable width instead of stretching across the whole
     screen. Grow is 0 so the space it no longer eats is absorbed by the
     action cluster's auto margin (Rec etc. get pushed to the right edge);
     shrink is 1 so it still condenses on narrow viewports. */
  flex: 0 1 520px;
  min-width: 120px;
}
.time-display {
  font-family: var(--ds-font-mono);
  font-size: var(--ds-text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--ds-text-2);
  min-width: 36px;
  text-align: center;
}
.progress-bar-container {
  flex: 1;
  cursor: pointer;
  padding: var(--ds-space-2) 0;
}
.progress-bar-background {
  position: relative;
  height: 6px;
  background-color: var(--ds-border-strong);
  border-radius: var(--ds-radius-full);
  overflow: visible;
}
.progress-bar-fill {
  position: absolute;
  height: 100%;
  background-color: var(--ds-accent);
  border-radius: var(--ds-radius-full);
  transition: width 0.1s linear;
}
.progress-bar-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background-color: var(--ds-accent);
  border: 2px solid var(--ds-surface-1);
  border-radius: var(--ds-radius-full);
  transition: left 0.1s linear;
}
.progress-bar-container:focus-visible {
  outline: none;
  box-shadow: var(--ds-focus-ring);
  border-radius: var(--ds-radius-sm);
}
.progress-bar-container:hover .progress-bar-fill,
.progress-bar-container:hover .progress-bar-handle {
  background-color: var(--ds-accent-hover);
}
.beat-marker-indicator {
  position: absolute;
  top: -4px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid var(--ds-accent);
  transform: translateX(-50%);
  cursor: pointer;
  z-index: 10;
  transition: border-color var(--ds-duration) var(--ds-ease);
}
.beat-marker-indicator:hover {
  border-top-color: var(--ds-accent-hover);
}
.beat-marker-indicator.triggered {
  border-top-color: var(--ds-success);
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
  gap: var(--ds-space-2);
  flex-shrink: 0;
  /* Pin the cluster to the right edge; absorbs the space freed by the capped
     progress bar. */
  margin-left: auto;
}

/* Icon-Buttons: UiIconButton secondary, offenes Popover = primary */
.spb-icon-btn {
  position: relative;
}
.spb-divider {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background-color: var(--ds-border-strong);
}
/* Stumm: Lautstärke-Button hervorheben (Symbol mit Durchstreichung) */
.spb-bar .spb-volume-btn.muted:not(.active) {
  color: var(--accent-ink);
  border-color: var(--ds-accent);
}
.spb-bar .spb-source-btn.listening:not(.active) {
  border-color: var(--ds-success);
  color: var(--ds-success);
}
/* Zähler (ds-kbd) */
.spb-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 var(--ds-space-1);
  border-radius: var(--ds-radius-full);
  background-color: var(--ds-accent);
  color: var(--ds-on-accent);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
/* Danger ist textbasiert, nie Vollfläche */
.spb-bar .spb-record-btn:not(.active) {
  color: var(--ds-danger);
}
.spb-bar .spb-record-btn.recording {
  background-color: var(--ds-surface-2);
  border-color: var(--ds-danger);
  color: var(--ds-danger);
  animation: recPulse 1.4s ease-in-out infinite;
}
.spb-rec-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 9px;
  height: 9px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-danger);
  border: 1.5px solid var(--ds-surface-1);
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

/* Responsive */
@media (max-width: 768px) {
  .spb-bar {
    flex-wrap: wrap;
    gap: var(--ds-space-2);
    padding: var(--ds-space-2) var(--ds-space-3);
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
