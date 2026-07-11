<template>
  <div ref="barRef" class="sticky-player-bar">
    <!-- ══════════════ POPOVERS (open above the bar) ══════════════ -->

    <!-- Audio Source Popover -->
    <div v-if="activePopover === 'audio'" class="spb-popover spb-popover-audio">
      <div class="spb-popover-header">
        <span class="section-label">{{ t('player.audioSource') }}</span>
        <button class="spb-popover-close" :title="t('common.close')" @click="closePopover">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>
      <div class="source-toggle">
        <button
          class="source-btn"
          :class="{ active: audioSourceStore.isPlayerSource }"
          :title="t('player.playerSource')"
          @click="selectSource('player')"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
            />
          </svg>
          <span>{{ t('player.player') }}</span>
        </button>
        <button
          class="source-btn"
          :class="{
            active: audioSourceStore.isMicrophoneSource,
            listening: audioSourceStore.isMicrophoneActive,
          }"
          :title="t('player.microphoneSource')"
          @click="selectSource('microphone')"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
            />
          </svg>
          <span>{{ t('player.microphone') }}</span>
        </button>
      </div>

      <div v-if="audioSourceStore.isMicrophoneSource" class="mic-status">
        <div v-if="audioSourceStore.isMicrophoneActive" class="mic-active">
          <span class="mic-indicator"></span>
          <span>{{ t('player.microphoneListening') }}</span>
        </div>
        <div v-else-if="audioSourceStore.errorMessage" class="mic-error">
          {{ audioSourceStore.errorMessage }}
        </div>
      </div>

      <div
        v-if="audioSourceStore.isMicrophoneSource && audioSourceStore.audioInputDevices.length > 1"
        class="device-selector"
      >
        <label>{{ t('player.selectDevice') }}:</label>
        <select v-model="selectedDevice" class="device-select" @change="changeDevice">
          <option
            v-for="device in audioSourceStore.audioInputDevices"
            :key="device.deviceId"
            :value="device.deviceId"
          >
            {{ device.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Volume & EQ Popover -->
    <div v-if="activePopover === 'volume'" class="spb-popover spb-popover-volume">
      <div class="spb-popover-header">
        <span class="section-label">{{ t('player.openVolume') }}</span>
        <button class="spb-popover-close" :title="t('common.close')" @click="closePopover">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>
      <div class="volume-section">
        <span class="section-label">{{ t('player.volume') }}: {{ volume }}%</span>
        <div class="volume-control">
          <svg class="volume-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
            />
          </svg>
          <input
            v-model="volume"
            type="range"
            min="0"
            max="100"
            class="volume-slider"
            @input="updateVolume"
          />
        </div>
      </div>

      <div class="eq-section">
        <div class="eq-control">
          <span class="eq-label"
            >{{ t('player.bass') }}: {{ bass > 0 ? '+' : '' }}{{ bass }} dB</span
          >
          <div class="eq-slider-container">
            <svg class="eq-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
              />
            </svg>
            <input
              v-model="bass"
              type="range"
              min="-12"
              max="12"
              class="eq-slider"
              @input="updateBass"
            />
          </div>
        </div>
        <div class="eq-control">
          <span class="eq-label"
            >{{ t('player.treble') }}: {{ treble > 0 ? '+' : '' }}{{ treble }} dB</span
          >
          <div class="eq-slider-container">
            <svg class="eq-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4c2.21 0 4-1.79 4-4V7h4V3H12zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
              />
            </svg>
            <input
              v-model="treble"
              type="range"
              min="-12"
              max="12"
              class="eq-slider"
              @input="updateTreble"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Beat Marker Popover -->
    <div v-if="activePopover === 'markers'" class="spb-popover spb-popover-markers">
      <div class="spb-popover-header">
        <span class="section-label"
          >{{ t('player.beatMarkers') }} ({{ beatMarkerStore.markerCount }})</span
        >
        <div class="marker-controls">
          <button
            class="btn-toggle"
            :class="{ active: beatMarkerStore.markersEnabled }"
            :title="
              beatMarkerStore.markersEnabled
                ? t('player.disableMarkers')
                : t('player.enableMarkers')
            "
            @click="beatMarkerStore.toggleEnabled()"
          >
            {{
              beatMarkerStore.markersEnabled
                ? locale === 'de'
                  ? 'AN'
                  : 'ON'
                : locale === 'de'
                  ? 'AUS'
                  : 'OFF'
            }}
          </button>
          <button
            class="btn-toggle"
            :class="{ active: showMarkerPanel }"
            :title="t('player.beatMarker')"
            @click="addMarkerAtCurrentTime"
          >
            +
          </button>
          <button
            v-if="beatMarkerStore.markerCount > 0"
            class="btn-clear-markers"
            :title="t('player.deleteAllMarkers')"
            @click="clearAllMarkers"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
          </button>
          <button class="spb-popover-close" :title="t('common.close')" @click="closePopover">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Add/Edit Marker Form -->
      <div v-if="showMarkerPanel" class="marker-add-form">
        <div class="form-title">
          {{ editingMarkerId !== null ? t('player.editMarkerTitle') : t('player.addMarkerTitle') }}
        </div>
        <div class="form-row">
          <label>{{ t('player.time') }}:</label>
          <div class="time-input-wrapper">
            <input
              v-model="pendingMarkerTimeInput"
              type="text"
              class="marker-time-input"
              :placeholder="locale === 'de' ? 'z.B. 1:30' : 'e.g. 1:30'"
              @blur="updateMarkerTimeFromInput"
              @keyup.enter="updateMarkerTimeFromInput"
            />
            <span class="time-hint">{{
              locale === 'de' ? '(MM:SS oder Sek.)' : '(MM:SS or sec.)'
            }}</span>
            <span class="time-max">/ {{ formatTime(playerStore.duration) }}</span>
          </div>
        </div>
        <div class="form-row">
          <label>{{ t('player.visualizer') }}:</label>
          <select v-model="newMarkerVisualizer" class="marker-select">
            <option value="">{{ t('player.noChange') }}</option>
            <optgroup
              v-for="(items, category) in visualizerStore.categorizedVisualizers"
              :key="category"
              :label="category"
            >
              <option v-for="viz in items" :key="viz.id" :value="viz.id">{{ viz.name }}</option>
            </optgroup>
          </select>
        </div>
        <div class="form-row">
          <label>{{ t('player.color') }}:</label>
          <div class="color-input-wrapper">
            <input v-model="newMarkerColor" type="color" class="marker-color" />
            <label class="color-checkbox">
              <input v-model="newMarkerChangeColor" type="checkbox" />
              <span>{{ t('player.change') }}</span>
            </label>
          </div>
        </div>
        <div class="form-row">
          <label>{{ t('player.label') }}:</label>
          <input
            v-model="newMarkerLabel"
            type="text"
            :placeholder="locale === 'de' ? 'z.B. Bass Drop' : 'e.g. Bass Drop'"
            class="marker-input"
          />
        </div>
        <div class="form-buttons">
          <button class="btn-confirm" @click="confirmAddMarker">
            {{ editingMarkerId !== null ? t('common.save') : t('common.add') }}
          </button>
          <button class="btn-cancel" @click="cancelAddMarker">{{ t('common.cancel') }}</button>
        </div>
      </div>

      <!-- Marker List -->
      <ul v-if="beatMarkerStore.markerCount > 0" class="marker-list">
        <li
          v-for="marker in beatMarkerStore.sortedMarkers"
          :key="marker.id"
          class="marker-item"
          :class="{ triggered: marker.triggered, editing: editingMarkerId === marker.id }"
        >
          <span class="marker-time" @click="seekToMarker(marker.time)">{{
            formatTime(marker.time)
          }}</span>
          <span
            class="marker-label"
            :title="t('player.editMarker')"
            @click="startEditMarker(marker)"
            >{{ marker.label }}</span
          >
          <span v-if="marker.action.visualizer" class="marker-action">{{
            getVisualizerName(marker.action.visualizer)
          }}</span>
          <div class="marker-buttons">
            <button
              class="btn-edit-marker"
              :title="t('player.editMarker')"
              @click="startEditMarker(marker)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                />
              </svg>
            </button>
            <button
              class="btn-delete-marker"
              :title="t('common.delete')"
              @click="removeMarker(marker.id)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          </div>
        </li>
      </ul>
      <p v-else class="spb-empty-hint">{{ t('player.addMarkerTitle') }}</p>
    </div>

    <!-- Playlist Popover -->
    <div v-if="activePopover === 'playlist'" class="spb-popover spb-popover-playlist">
      <div class="spb-popover-header">
        <span class="section-label">{{ t('player.playlist') }}</span>
        <div class="marker-controls">
          <button
            v-if="playerStore.hasTracks"
            class="btn-clear-markers"
            :title="t('player.deleteAll')"
            @click="clearAllTracks"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
          </button>
          <button class="spb-popover-close" :title="t('common.close')" @click="closePopover">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
      </div>
      <ul class="playlist-container">
        <li v-if="!playerStore.hasTracks" class="playlist-item-empty">
          {{ t('player.playlistEmpty') }}
        </li>
        <li
          v-for="(track, index) in playerStore.playlist"
          :key="track.url"
          class="playlist-item"
          :class="{
            active: index === playerStore.currentTrackIndex,
            dragging: draggedTrackIndex === index,
            'drag-over': dragOverTrackIndex === index && draggedTrackIndex !== index,
          }"
          draggable="true"
          @dragstart="handleDragStart($event, index)"
          @dragend="handleDragEnd"
          @dragover.prevent="handleDragOver($event, index)"
          @dragleave="handleDragLeave"
          @drop.prevent="handleDrop($event, index)"
        >
          <span class="drag-handle" :title="t('player.dragToReorder')">⠿</span>
          <span class="track-name" @click="loadTrackOnly(index)">{{ track.name }}</span>
          <button
            class="btn-delete"
            :title="t('player.removeTrack')"
            @click.stop="removeTrack(index)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </li>
      </ul>
    </div>

    <!-- Recorder Popover (recording + download + conversions) -->
    <div v-if="activePopover === 'recorder'" class="spb-popover spb-popover-recorder">
      <div class="spb-popover-header">
        <span class="section-label">{{ t('player.openRecorder') }}</span>
        <button class="spb-popover-close" :title="t('common.close')" @click="closePopover">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>
      <div class="spb-recorder-scroll">
        <RecorderPanel />
      </div>
    </div>

    <!-- ══════════════ THE BAR ══════════════ -->
    <div class="spb-bar">
      <!-- Track info + audio source -->
      <div class="spb-track">
        <button
          class="spb-icon-btn spb-source-btn"
          :class="{
            active: activePopover === 'audio',
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
          :class="{ active: activePopover === 'markers' }"
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
          :class="{ active: activePopover === 'volume' }"
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
          :class="{ active: activePopover === 'playlist' }"
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
          class="spb-icon-btn spb-record-btn"
          :class="{ active: activePopover === 'recorder', recording: recorderStore.isRecording }"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { usePlayerStore } from '../stores/playerStore.js'
import { useBeatMarkerStore } from '../stores/beatMarkerStore.js'
import { useVisualizerStore } from '../stores/visualizerStore.js'
import { useAudioSourceStore } from '../stores/audioSourceStore.js'
import { useRecorderStore } from '../stores/recorderStore.js'
import RecorderPanel from './RecorderPanel.vue'

const { t, locale } = useI18n()
const playerStore = usePlayerStore()
const beatMarkerStore = useBeatMarkerStore()
const visualizerStore = useVisualizerStore()
const audioSourceStore = useAudioSourceStore()
const recorderStore = useRecorderStore()

const barRef = ref(null)

// ── Popover management ────────────────────────────────────────────────
const activePopover = ref(null) // null | 'audio' | 'volume' | 'markers' | 'playlist' | 'recorder'

const togglePopover = (name) => {
  activePopover.value = activePopover.value === name ? null : name
}
const closePopover = () => {
  activePopover.value = null
}
const handleOutsideClick = (event) => {
  if (!activePopover.value) return
  if (barRef.value && !barRef.value.contains(event.target)) {
    // Keep recorder popover open even on outside clicks so its modals/downloads
    // (which may live outside the bar) remain usable.
    if (activePopover.value === 'recorder') return
    activePopover.value = null
  }
}

// ── Volume / EQ ───────────────────────────────────────────────────────
const volume = ref(100)
const bass = ref(0)
const treble = ref(0)

const updateVolume = () => {
  if (playerStore.audioRef) {
    playerStore.audioRef.volume = volume.value / 100
    localStorage.setItem('playerVolume', volume.value)
  }
}
const updateBass = () => {
  if (window.setBassGain) {
    window.setBassGain(parseFloat(bass.value))
    localStorage.setItem('playerBass', bass.value)
  }
}
const updateTreble = () => {
  if (window.setTrebleGain) {
    window.setTrebleGain(parseFloat(treble.value))
    localStorage.setItem('playerTreble', treble.value)
  }
}

// ── Play mode ─────────────────────────────────────────────────────────
const PLAY_MODES = ['none', 'sequence', 'repeat-one', 'repeat-all', 'shuffle']
function cyclePlayMode() {
  const idx = PLAY_MODES.indexOf(playerStore.playMode)
  playerStore.playMode = PLAY_MODES[(idx + 1) % PLAY_MODES.length]
}
const playModeLabel = computed(() => {
  const labels = {
    none: locale.value === 'de' ? 'Kein Autoplay' : 'No autoplay',
    sequence: locale.value === 'de' ? 'Playlist (einmal)' : 'Playlist (once)',
    'repeat-one': locale.value === 'de' ? 'Track wiederholen' : 'Repeat track',
    'repeat-all': locale.value === 'de' ? 'Playlist wiederholen' : 'Repeat all',
    shuffle: locale.value === 'de' ? 'Zufällige Reihenfolge' : 'Shuffle',
  }
  return labels[playerStore.playMode] ?? ''
})

// ── Audio Source ──────────────────────────────────────────────────────
const selectedDevice = ref('default')
const selectSource = async (sourceType) => {
  if (sourceType === audioSourceStore.sourceType) return
  if (window.switchAudioSource) {
    const success = await window.switchAudioSource(sourceType)
    if (!success && sourceType === 'microphone') {
      console.log('[StickyPlayerBar] Failed to switch to microphone')
    }
  } else {
    console.error('[StickyPlayerBar] switchAudioSource not available')
  }
}
const changeDevice = async () => {
  if (!audioSourceStore.isMicrophoneSource) return
  audioSourceStore.selectedDeviceId = selectedDevice.value
  if (window.switchAudioSource) {
    await window.switchAudioSource('player')
    await window.switchAudioSource('microphone')
  }
}

// ── Beat Marker State ─────────────────────────────────────────────────
const showMarkerPanel = ref(false)
const editingMarkerId = ref(null)
const pendingMarkerTime = ref(0)
const pendingMarkerTimeInput = ref('0:00')
const newMarkerVisualizer = ref('')
const newMarkerColor = ref('#6ea8fe')
const newMarkerChangeColor = ref(false)
const newMarkerLabel = ref('')

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const parseTimeInput = (timeStr) => {
  if (!timeStr) return 0
  const cleaned = timeStr.trim()
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10)
  }
  const parts = cleaned.split(':')
  if (parts.length >= 2) {
    const mins = parseInt(parts[0], 10) || 0
    const secs = parseInt(parts[1], 10) || 0
    return mins * 60 + secs
  }
  return 0
}

const updateMarkerTimeFromInput = () => {
  const seconds = parseTimeInput(pendingMarkerTimeInput.value)
  const maxTime = playerStore.duration || 0
  pendingMarkerTime.value = Math.max(0, Math.min(seconds, maxTime))
  pendingMarkerTimeInput.value = formatTime(pendingMarkerTime.value)
}

const getMarkerPosition = (time) => {
  if (playerStore.duration === 0) return 0
  return (time / playerStore.duration) * 100
}

const addMarkerAtCurrentTime = () => {
  editingMarkerId.value = null
  pendingMarkerTime.value = playerStore.currentTime
  pendingMarkerTimeInput.value = formatTime(playerStore.currentTime)
  newMarkerLabel.value = `Drop ${beatMarkerStore.markerCount + 1}`
  newMarkerVisualizer.value = ''
  newMarkerChangeColor.value = false
  showMarkerPanel.value = true
  activePopover.value = 'markers'
}

const startEditMarker = (marker) => {
  editingMarkerId.value = marker.id
  pendingMarkerTime.value = marker.time
  pendingMarkerTimeInput.value = formatTime(marker.time)
  newMarkerLabel.value = marker.label || ''
  newMarkerVisualizer.value = marker.action?.visualizer || ''
  newMarkerColor.value = marker.action?.color || '#6ea8fe'
  newMarkerChangeColor.value = !!marker.action?.color
  showMarkerPanel.value = true
}

const confirmAddMarker = () => {
  const action = {
    type: 'combined',
    visualizer: newMarkerVisualizer.value || null,
    color: newMarkerChangeColor.value ? newMarkerColor.value : null,
  }
  if (editingMarkerId.value !== null) {
    beatMarkerStore.updateMarker(editingMarkerId.value, {
      time: pendingMarkerTime.value,
      label: newMarkerLabel.value,
      action: action,
    })
  } else {
    beatMarkerStore.addMarker(pendingMarkerTime.value, action, newMarkerLabel.value)
  }
  editingMarkerId.value = null
  showMarkerPanel.value = false
}

const cancelAddMarker = () => {
  editingMarkerId.value = null
  showMarkerPanel.value = false
}

const seekToMarker = (time) => {
  playerStore.seekTo(time)
  beatMarkerStore.resetTriggers()
}

const removeMarker = (id) => {
  beatMarkerStore.removeMarker(id)
}

const clearAllMarkers = () => {
  if (confirm(t('player.confirmDeleteMarkers'))) {
    beatMarkerStore.clearAllMarkers()
  }
}

const getVisualizerName = (id) => {
  const allViz = visualizerStore.availableVisualizers
  const found = allViz.find((v) => v.id === id)
  return found ? found.name : id
}

// Watch for time changes to trigger markers
watch(
  () => playerStore.currentTime,
  (newTime) => {
    if (!playerStore.isPlaying) return
    const triggered = beatMarkerStore.checkTrigger(newTime)
    if (triggered && triggered.action) {
      if (triggered.action.visualizer) {
        visualizerStore.selectVisualizer(triggered.action.visualizer)
        console.log('🎯 Visualizer gewechselt zu:', triggered.action.visualizer)
      }
      if (triggered.action.color) {
        visualizerStore.setColor(triggered.action.color)
        console.log('🎨 Farbe gewechselt zu:', triggered.action.color)
      }
    }
  },
)

// Reset markers when seeking (large time jump)
watch(
  () => playerStore.currentTime,
  (newTime, oldTime) => {
    if (Math.abs(newTime - oldTime) > 1) {
      beatMarkerStore.resetTriggers()
    }
  },
)

// Check for markers at start (0:00) when playback begins
watch(
  () => playerStore.isPlaying,
  (isPlaying) => {
    if (isPlaying && playerStore.currentTime < 0.5) {
      beatMarkerStore.resetTriggers()
      const triggered = beatMarkerStore.checkTrigger(playerStore.currentTime)
      if (triggered && triggered.action) {
        if (triggered.action.visualizer) {
          visualizerStore.selectVisualizer(triggered.action.visualizer)
          console.log('🎯 Start-Marker: Visualizer gewechselt zu:', triggered.action.visualizer)
        }
        if (triggered.action.color) {
          visualizerStore.setColor(triggered.action.color)
          console.log('🎨 Start-Marker: Farbe gewechselt zu:', triggered.action.color)
        }
      }
    }
  },
)

// Keyboard shortcut for adding marker (M key)
const handleKeydown = (e) => {
  if (e.key === 'm' || e.key === 'M') {
    if (!e.target.matches('input, textarea, select')) {
      e.preventDefault()
      if (playerStore.hasTracks) {
        addMarkerAtCurrentTime()
      }
    }
  }
}

// ── Seek ──────────────────────────────────────────────────────────────
const seekToPosition = (event) => {
  if (!playerStore.audioRef || playerStore.duration === 0) return
  const rect = event.currentTarget.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const newTime = percentage * playerStore.duration
  playerStore.seekTo(newTime)
}

// ── Playlist ──────────────────────────────────────────────────────────
const draggedTrackIndex = ref(null)
const dragOverTrackIndex = ref(null)

const loadTrackOnly = (index) => {
  playerStore.loadTrack(index)
  console.log('[StickyPlayerBar] Track loaded (no autoplay):', playerStore.playlist[index].name)
}

const handleDragStart = (event, index) => {
  draggedTrackIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', index.toString())
  setTimeout(() => {
    event.target.classList.add('dragging')
  }, 0)
}
const handleDragEnd = () => {
  draggedTrackIndex.value = null
  dragOverTrackIndex.value = null
}
const handleDragOver = (event, index) => {
  if (draggedTrackIndex.value === null) return
  if (draggedTrackIndex.value === index) return
  dragOverTrackIndex.value = index
  event.dataTransfer.dropEffect = 'move'
}
const handleDragLeave = () => {}
const handleDrop = (event, toIndex) => {
  const fromIndex = draggedTrackIndex.value
  if (fromIndex === null || fromIndex === toIndex) {
    handleDragEnd()
    return
  }
  playerStore.reorderPlaylist(fromIndex, toIndex)
  handleDragEnd()
}

const removeTrack = (index) => {
  const wasCurrentTrack = index === playerStore.currentTrackIndex
  playerStore.playlist.splice(index, 1)

  if (playerStore.playlist.length === 0) {
    resetPlayer()
  } else {
    if (index < playerStore.currentTrackIndex) {
      playerStore.currentTrackIndex--
    } else if (wasCurrentTrack) {
      playerStore.stopPlayer()
      if (index >= playerStore.playlist.length) {
        playerStore.currentTrackIndex = playerStore.playlist.length - 1
      } else {
        playerStore.currentTrackIndex = index
      }
      playerStore.loadTrack(playerStore.currentTrackIndex)
    }
  }
}

const clearAllTracks = () => {
  if (confirm(t('player.confirmDeleteAll'))) {
    resetPlayer()
  }
}
const resetPlayer = () => {
  playerStore.clearPlaylist()
}

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(() => {
  const savedVolume = localStorage.getItem('playerVolume')
  if (savedVolume !== null) {
    volume.value = parseInt(savedVolume)
    updateVolume()
  } else if (playerStore.audioRef) {
    volume.value = Math.round(playerStore.audioRef.volume * 100)
  }

  watch(
    () => playerStore.audioRef,
    (audioRef) => {
      if (audioRef) {
        audioRef.volume = volume.value / 100
        console.log('[StickyPlayerBar] Audio-Lautstärke synchronisiert:', volume.value + '%')
      }
    },
    { immediate: true },
  )

  const savedBass = localStorage.getItem('playerBass')
  if (savedBass !== null) {
    bass.value = parseInt(savedBass)
    updateBass()
  }
  const savedTreble = localStorage.getItem('playerTreble')
  if (savedTreble !== null) {
    treble.value = parseInt(savedTreble)
    updateTreble()
  }

  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<style scoped>
/* ══════════════════════ Sticky Bar ══════════════════════ */
.sticky-player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  /* Above the floating help button (z-index 9998) so open popovers are never
     covered by it. The bar row itself sits below the help button, which floats
     just above the bar, so they never overlap spatially. */
  z-index: 9999;
}

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
  flex: 1;
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

/* ══════════════════════ Popovers ══════════════════════ */
.spb-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 12px;
  width: 340px;
  max-width: calc(100vw - 24px);
  max-height: 60vh;
  overflow-y: auto;
  background-color: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: popIn 0.15s ease-out;
}
@keyframes popIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.spb-popover-recorder {
  width: 380px;
  padding: 0;
}
.spb-popover-recorder .spb-popover-header {
  padding: 12px 12px 0;
}
.spb-recorder-scroll {
  padding: 10px 12px 12px;
}
/* Neutralize the embedded RecorderPanel's own card chrome inside the popover */
.spb-recorder-scroll :deep(.recorder-panel) {
  background-color: transparent;
  border: none;
  padding: 0;
}

.spb-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.spb-popover-close {
  background-color: transparent;
  border: none;
  color: var(--text-muted, #7a8da0);
  cursor: pointer;
  padding: 3px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}
.spb-popover-close:hover {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
.spb-popover-close svg {
  width: 15px;
  height: 15px;
}
.spb-empty-hint {
  font-size: 0.65rem;
  color: var(--text-muted, #7a8da0);
  font-style: italic;
  text-align: center;
  margin: 4px 0;
}

.section-label {
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Audio source */
.source-toggle {
  display: flex;
  gap: 8px;
}
.source-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-radius: 6px;
  color: var(--text-muted, #7a8da0);
  cursor: pointer;
  font-size: 0.6rem;
  transition: all 0.2s ease;
}
.source-btn svg {
  width: 18px;
  height: 18px;
}
.source-btn:hover {
  background-color: var(--btn-hover, #1a2a42);
  color: var(--text-primary, #e9e9eb);
}
.source-btn.active {
  background-color: var(--accent-primary, #c9984d);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
}
.source-btn.listening {
  border-color: #4ade80;
}
.mic-status {
  font-size: 0.65rem;
}
.mic-active {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4ade80;
}
.mic-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  animation: recPulse 1s infinite;
}
.mic-error {
  color: #ef4444;
}
.device-selector {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.6rem;
  color: var(--text-muted);
}
.device-select {
  padding: 5px 6px;
  font-size: 0.65rem;
  background-color: var(--secondary-bg, #0e1c32);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
}

/* Volume & EQ */
.volume-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.volume-control {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background-color: var(--secondary-bg, #0e1c32);
  border-radius: 5px;
}
.volume-icon {
  width: 14px;
  height: 14px;
  color: var(--text-primary, #e9e9eb);
  flex-shrink: 0;
}
.volume-slider {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 100%
  );
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}
.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #fff;
}
.eq-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.eq-control {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.eq-label {
  font-size: 0.6rem;
  color: var(--text-muted, #7a8da0);
}
.eq-slider-container {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 7px;
  background-color: var(--secondary-bg, #0e1c32);
  border-radius: 5px;
}
.eq-icon {
  width: 12px;
  height: 12px;
  color: var(--text-primary, #e9e9eb);
  flex-shrink: 0;
}
.eq-slider {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--text-muted, #7a8da0) 0%,
    var(--accent-primary, #c9984d) 50%,
    var(--accent-tertiary, #f8e1a9) 100%
  );
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}
.eq-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
.eq-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
  border: 2px solid #fff;
}

/* Markers */
.marker-controls {
  display: flex;
  gap: 6px;
  align-items: center;
}
.btn-toggle {
  padding: 3px 8px;
  font-size: 9px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--secondary-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 22px;
}
.btn-toggle.active {
  background-color: #4ade80;
  border-color: #4ade80;
  color: var(--accent-text);
}
.btn-clear-markers {
  background-color: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}
.btn-clear-markers:hover {
  background-color: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}
.btn-clear-markers svg {
  width: 14px;
  height: 14px;
}
.marker-add-form {
  background-color: var(--secondary-bg);
  border-radius: 4px;
  padding: 8px;
  border: 1px solid var(--accent-primary);
}
.form-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-primary);
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color);
}
.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.form-row label {
  font-size: 10px;
  color: var(--text-muted);
  min-width: 55px;
}
.marker-select,
.marker-input {
  flex: 1;
  padding: 4px 6px;
  font-size: 10px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
}
.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.marker-color {
  width: 28px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}
.color-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-muted);
  cursor: pointer;
}
.color-checkbox input {
  width: 12px;
  height: 12px;
}
.time-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.marker-time-input {
  width: 60px;
  padding: 4px 6px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  background-color: var(--secondary-bg);
  border: 1px solid var(--accent-primary);
  border-radius: 4px;
  color: var(--accent-primary);
  text-align: center;
}
.time-hint {
  font-size: 9px;
  color: var(--text-muted);
  font-style: italic;
}
.time-max {
  font-size: 10px;
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
}
.form-buttons {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  margin-top: 8px;
}
.btn-confirm {
  padding: 4px 12px;
  font-size: 10px;
  font-weight: 600;
  background-color: #4ade80;
  border: none;
  border-radius: 4px;
  color: var(--accent-text);
  cursor: pointer;
}
.btn-confirm:hover {
  background-color: #22c55e;
}
.btn-cancel {
  padding: 4px 12px;
  font-size: 10px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
}
.btn-cancel:hover {
  background-color: var(--btn-hover);
  color: var(--text-primary);
}
.marker-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.marker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: 10px;
  background-color: var(--secondary-bg);
  border-radius: 4px;
  transition: all 0.2s ease;
}
.marker-item:hover {
  background-color: var(--btn-hover);
}
.marker-item.triggered {
  background-color: rgba(74, 222, 128, 0.2);
  border-left: 2px solid #4ade80;
}
.marker-item.editing {
  background-color: rgba(201, 152, 77, 0.15);
  border-left: 2px solid var(--accent-primary);
}
.marker-time {
  font-weight: 600;
  color: var(--accent-primary);
  cursor: pointer;
  min-width: 36px;
}
.marker-time:hover {
  text-decoration: underline;
}
.marker-label {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.marker-label:hover {
  color: var(--accent-primary);
}
.marker-action {
  font-size: 9px;
  color: var(--accent-primary);
  background-color: rgba(201, 152, 77, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
}
.marker-buttons {
  display: flex;
  gap: 2px;
  margin-left: auto;
}
.btn-edit-marker,
.btn-delete-marker {
  background-color: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0.5;
}
.btn-edit-marker:hover {
  background-color: rgba(201, 152, 77, 0.8);
  color: var(--accent-text);
  opacity: 1;
}
.btn-delete-marker:hover {
  background-color: rgba(255, 68, 68, 0.8);
  color: #fff;
  opacity: 1;
}
.btn-edit-marker svg,
.btn-delete-marker svg {
  width: 12px;
  height: 12px;
}

/* Playlist */
.playlist-container {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 240px;
  overflow-y: auto;
  background-color: var(--secondary-bg, #0e1c32);
  border-radius: 5px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}
.playlist-item {
  position: relative;
  padding: 6px 8px;
  font-size: 0.65rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--border-color, rgba(201, 152, 77, 0.1));
}
.playlist-item:last-child {
  border-bottom: none;
}
.playlist-item:hover {
  background-color: var(--btn-hover, #1a2a42);
}
.playlist-item.active {
  background-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
  font-weight: 600;
}
.track-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.btn-delete {
  background-color: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0.6;
  flex-shrink: 0;
}
.btn-delete:hover {
  background-color: rgba(255, 68, 68, 0.8);
  color: #fff;
  opacity: 1;
}
.btn-delete svg {
  width: 14px;
  height: 14px;
}
.playlist-item.active .btn-delete {
  color: var(--accent-text);
  opacity: 0.7;
}
.drag-handle {
  cursor: grab;
  color: var(--text-muted);
  font-size: 0.7rem;
  user-select: none;
  opacity: 0.5;
  flex-shrink: 0;
  padding-right: 4px;
}
.drag-handle:hover {
  opacity: 1;
  color: var(--accent-primary, #c9984d);
}
.drag-handle:active {
  cursor: grabbing;
}
.playlist-item.dragging {
  opacity: 0.5;
  transform: scale(0.98);
  background-color: var(--accent-primary, #c9984d) !important;
  box-shadow: 0 0 0 2px rgba(201, 152, 77, 0.3);
}
.playlist-item.drag-over {
  border-color: #4ade80;
  background-color: rgba(74, 222, 128, 0.15) !important;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.4);
  transform: scale(1.02);
}
.playlist-item-empty {
  padding: 14px;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  font-size: 11px;
}

/* Scrollbars */
.spb-popover::-webkit-scrollbar,
.playlist-container::-webkit-scrollbar {
  width: 6px;
}
.spb-popover::-webkit-scrollbar-thumb,
.playlist-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

/* ══════════════════════ Light Theme ══════════════════════ */
[data-theme='light'] .spb-bar {
  background-color: #ffffff;
  border-top-color: rgba(1, 79, 153, 0.15);
}
[data-theme='light'] .spb-ctrl,
[data-theme='light'] .spb-icon-btn {
  background-color: #f3f6fa;
}
[data-theme='light'] .spb-popover {
  background-color: #ffffff;
  border-color: rgba(1, 79, 153, 0.15);
}

/* ══════════════════════ Responsive ══════════════════════ */
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
    flex-basis: 100%;
  }
  .spb-transport {
    order: 4;
    flex-basis: 100%;
    justify-content: center;
  }
  .spb-popover {
    right: 50%;
    transform: translateX(50%);
    width: calc(100vw - 16px);
  }
  @keyframes popIn {
    from {
      opacity: 0;
      transform: translateX(50%) translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateX(50%) translateY(0);
    }
  }
}
</style>
