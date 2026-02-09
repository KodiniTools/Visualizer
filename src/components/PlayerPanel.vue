<template>
  <div class="panel">
    <h3>{{ t('player.title') }}</h3>

    <!-- Audio Source Selector -->
    <div class="audio-source-section">
      <span class="section-label">{{ t('player.audioSource') }}</span>
      <div class="source-toggle">
        <button
          @click="selectSource('player')"
          class="source-btn"
          :class="{ active: audioSourceStore.isPlayerSource }"
          :title="t('player.playerSource')"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          <span>{{ t('player.player') }}</span>
        </button>
        <button
          @click="selectSource('microphone')"
          class="source-btn"
          :class="{
            active: audioSourceStore.isMicrophoneSource,
            listening: audioSourceStore.isMicrophoneActive
          }"
          :title="t('player.microphoneSource')"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
          <span>{{ t('player.microphone') }}</span>
        </button>
      </div>

      <!-- Microphone Status/Error Message -->
      <div v-if="audioSourceStore.isMicrophoneSource" class="mic-status">
        <div v-if="audioSourceStore.isMicrophoneActive" class="mic-active">
          <span class="mic-indicator"></span>
          <span>{{ t('player.microphoneListening') }}</span>
        </div>
        <div v-else-if="audioSourceStore.errorMessage" class="mic-error">
          {{ audioSourceStore.errorMessage }}
        </div>
      </div>

      <!-- Device Selector (when microphone is active) -->
      <div v-if="audioSourceStore.isMicrophoneSource && audioSourceStore.audioInputDevices.length > 1" class="device-selector">
        <label>{{ t('player.selectDevice') }}:</label>
        <select v-model="selectedDevice" @change="changeDevice" class="device-select">
          <option v-for="device in audioSourceStore.audioInputDevices" :key="device.deviceId" :value="device.deviceId">
            {{ device.label }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="playerStore.hasTracks" class="player-active">
      <!-- Current Track Display -->
      <div class="current-track">
        <span class="track-title">{{ playerStore.currentTrack?.name }}</span>
      </div>

      <!-- Progress Bar with Time Display and Beat Markers -->
      <div class="progress-section">
        <span class="time-display">{{ formatTime(playerStore.currentTime) }}</span>
        <div class="progress-bar-container" @click="seekToPosition">
          <div class="progress-bar-background">
            <div class="progress-bar-fill" :style="{ width: playerStore.progressPercentage + '%' }"></div>
            <!-- Beat Markers on Progress Bar -->
            <div
              v-for="marker in beatMarkerStore.sortedMarkers"
              :key="marker.id"
              class="beat-marker-indicator"
              :class="{ triggered: marker.triggered }"
              :style="{ left: getMarkerPosition(marker.time) + '%' }"
              :title="marker.label + ' (' + formatTime(marker.time) + ')'"
              @click.stop="seekToMarker(marker.time)"
            ></div>
            <div class="progress-bar-handle" :style="{ left: playerStore.progressPercentage + '%' }"></div>
          </div>
        </div>
        <span class="time-display">{{ formatTime(playerStore.duration) }}</span>
      </div>

      <!-- Player Controls with Add Marker Button -->
      <div class="player-controls">
        <button @click="playerStore.prevTrack" class="control-btn" :title="t('player.prev')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button @click="playerStore.togglePlayPause" class="control-btn control-btn-main" :title="playerStore.isPlaying ? t('player.pause') : t('player.play')">
          <svg v-if="!playerStore.isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        </button>

        <button @click="playerStore.stopPlayer" class="control-btn" :title="t('player.stop')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z"/>
          </svg>
        </button>

        <button @click="playerStore.nextTrack" class="control-btn" :title="t('player.next')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <!-- Add Beat Marker Button -->
        <button
          @click="addMarkerAtCurrentTime"
          class="control-btn control-btn-marker"
          :class="{ active: showMarkerPanel }"
          :title="t('player.beatMarker')"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>
      </div>

      <!-- Beat Marker Section -->
      <div class="beat-marker-section" v-if="beatMarkerStore.markerCount > 0 || showMarkerPanel">
        <div class="marker-header">
          <span class="section-label">{{ t('player.beatMarkers') }} ({{ beatMarkerStore.markerCount }})</span>
          <div class="marker-controls">
            <button
              @click="beatMarkerStore.toggleEnabled()"
              class="btn-toggle"
              :class="{ active: beatMarkerStore.markersEnabled }"
              :title="beatMarkerStore.markersEnabled ? t('player.disableMarkers') : t('player.enableMarkers')"
            >
              {{ beatMarkerStore.markersEnabled ? (locale === 'de' ? 'AN' : 'ON') : (locale === 'de' ? 'AUS' : 'OFF') }}
            </button>
            <button
              v-if="beatMarkerStore.markerCount > 0"
              @click="clearAllMarkers"
              class="btn-clear-markers"
              :title="t('player.deleteAllMarkers')"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Add/Edit Marker Form -->
        <div v-if="showMarkerPanel" class="marker-add-form">
          <div class="form-title">{{ editingMarkerId !== null ? t('player.editMarkerTitle') : t('player.addMarkerTitle') }}</div>
          <div class="form-row">
            <label>{{ t('player.time') }}:</label>
            <div class="time-input-wrapper">
              <input
                type="text"
                v-model="pendingMarkerTimeInput"
                @blur="updateMarkerTimeFromInput"
                @keyup.enter="updateMarkerTimeFromInput"
                class="marker-time-input"
                :placeholder="locale === 'de' ? 'z.B. 1:30' : 'e.g. 1:30'"
              />
              <span class="time-hint">{{ locale === 'de' ? '(MM:SS oder Sek.)' : '(MM:SS or sec.)' }}</span>
              <span class="time-max">/ {{ formatTime(playerStore.duration) }}</span>
            </div>
          </div>
          <div class="form-row">
            <label>{{ t('player.visualizer') }}:</label>
            <select v-model="newMarkerVisualizer" class="marker-select">
              <option value="">{{ t('player.noChange') }}</option>
              <optgroup v-for="(items, category) in visualizerStore.categorizedVisualizers" :key="category" :label="category">
                <option v-for="viz in items" :key="viz.id" :value="viz.id">{{ viz.name }}</option>
              </optgroup>
            </select>
          </div>
          <div class="form-row">
            <label>{{ t('player.color') }}:</label>
            <div class="color-input-wrapper">
              <input type="color" v-model="newMarkerColor" class="marker-color" />
              <label class="color-checkbox">
                <input type="checkbox" v-model="newMarkerChangeColor" />
                <span>{{ t('player.change') }}</span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <label>{{ t('player.label') }}:</label>
            <input type="text" v-model="newMarkerLabel" :placeholder="locale === 'de' ? 'z.B. Bass Drop' : 'e.g. Bass Drop'" class="marker-input" />
          </div>
          <div class="form-buttons">
            <button @click="confirmAddMarker" class="btn-confirm">{{ editingMarkerId !== null ? t('common.save') : t('common.add') }}</button>
            <button @click="cancelAddMarker" class="btn-cancel">{{ t('common.cancel') }}</button>
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
            <span class="marker-time" @click="seekToMarker(marker.time)">{{ formatTime(marker.time) }}</span>
            <span class="marker-label" @click="startEditMarker(marker)" :title="t('player.editMarker')">{{ marker.label }}</span>
            <span v-if="marker.action.visualizer" class="marker-action">{{ getVisualizerName(marker.action.visualizer) }}</span>
            <div class="marker-buttons">
              <button @click="startEditMarker(marker)" class="btn-edit-marker" :title="t('player.editMarker')">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
              <button @click="removeMarker(marker.id)" class="btn-delete-marker" :title="t('common.delete')">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Volume Control -->
      <div class="volume-section">
        <span class="section-label">{{ t('player.volume') }}: {{ volume }}%</span>
        <div class="volume-control">
          <svg class="volume-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            v-model="volume"
            @input="updateVolume"
            class="volume-slider"
          />
        </div>
      </div>

      <!-- EQ Controls: Bass & Treble -->
      <div class="eq-section">
        <div class="eq-control">
          <span class="eq-label">{{ t('player.bass') }}: {{ bass > 0 ? '+' : '' }}{{ bass }} dB</span>
          <div class="eq-slider-container">
            <svg class="eq-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <input
              type="range"
              min="-12"
              max="12"
              v-model="bass"
              @input="updateBass"
              class="eq-slider"
            />
          </div>
        </div>
        <div class="eq-control">
          <span class="eq-label">{{ t('player.treble') }}: {{ treble > 0 ? '+' : '' }}{{ treble }} dB</span>
          <div class="eq-slider-container">
            <svg class="eq-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l.01 10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4c2.21 0 4-1.79 4-4V7h4V3H12zm-1.99 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
            <input
              type="range"
              min="-12"
              max="12"
              v-model="treble"
              @input="updateTreble"
              class="eq-slider"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Playlist -->
    <div class="playlist-section">
      <div class="playlist-header">
        <span class="section-label">{{ t('player.playlist') }}</span>
        <button v-if="playerStore.hasTracks" @click="clearAllTracks" class="btn-clear" :title="t('player.deleteAll')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
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
            'drag-over': dragOverTrackIndex === index && draggedTrackIndex !== index
          }"
          draggable="true"
          @dragstart="handleDragStart($event, index)"
          @dragend="handleDragEnd"
          @dragover.prevent="handleDragOver($event, index)"
          @dragleave="handleDragLeave"
          @drop.prevent="handleDrop($event, index)"
        >
          <span class="drag-handle" :title="t('player.dragToReorder')">⠿</span>
          <span @click="loadTrackOnly(index)" class="track-name">{{ track.name }}</span>
          <button @click.stop="removeTrack(index)" class="btn-delete" :title="t('player.removeTrack')">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { usePlayerStore } from '../stores/playerStore.js';
import { useBeatMarkerStore } from '../stores/beatMarkerStore.js';
import { useVisualizerStore } from '../stores/visualizerStore.js';
import { useAudioSourceStore } from '../stores/audioSourceStore.js';

const { t, locale } = useI18n();
const playerStore = usePlayerStore();
const beatMarkerStore = useBeatMarkerStore();
const visualizerStore = useVisualizerStore();
const audioSourceStore = useAudioSourceStore();

const volume = ref(100);
const bass = ref(0);
const treble = ref(0);

// Drag & Drop State für Playlist-Neuordnung
const draggedTrackIndex = ref(null);
const dragOverTrackIndex = ref(null);

// Audio Source Selection
const selectedDevice = ref('default');

const selectSource = async (sourceType) => {
  if (sourceType === audioSourceStore.sourceType) return;

  if (window.switchAudioSource) {
    const success = await window.switchAudioSource(sourceType);
    if (!success && sourceType === 'microphone') {
      console.log('[PlayerPanel] Failed to switch to microphone');
    }
  } else {
    console.error('[PlayerPanel] switchAudioSource not available');
  }
};

const changeDevice = async () => {
  if (!audioSourceStore.isMicrophoneSource) return;

  audioSourceStore.selectedDeviceId = selectedDevice.value;

  // Restart microphone with new device
  if (window.switchAudioSource) {
    await window.switchAudioSource('player'); // Stop current
    await window.switchAudioSource('microphone'); // Restart with new device
  }
};

// Beat Marker State
const showMarkerPanel = ref(false);
const editingMarkerId = ref(null); // null = adding new, number = editing existing
const pendingMarkerTime = ref(0);
const pendingMarkerTimeInput = ref('0:00');
const newMarkerVisualizer = ref('');
const newMarkerColor = ref('#6ea8fe');
const newMarkerChangeColor = ref(false);
const newMarkerLabel = ref('');

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Parse MM:SS or M:SS format to seconds
const parseTimeInput = (timeStr) => {
  if (!timeStr) return 0;

  // Remove spaces and normalize
  const cleaned = timeStr.trim();

  // Handle pure seconds input (e.g., "125")
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10);
  }

  // Handle MM:SS or M:SS format
  const parts = cleaned.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }

  // Handle MM:SS:ms or similar (take first two parts)
  if (parts.length >= 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }

  return 0;
};

// Update pendingMarkerTime when input changes
const updateMarkerTimeFromInput = () => {
  const seconds = parseTimeInput(pendingMarkerTimeInput.value);
  // Clamp to valid range
  const maxTime = playerStore.duration || 0;
  pendingMarkerTime.value = Math.max(0, Math.min(seconds, maxTime));
  // Update display to show normalized format
  pendingMarkerTimeInput.value = formatTime(pendingMarkerTime.value);
};

// Beat Marker Functions
const getMarkerPosition = (time) => {
  if (playerStore.duration === 0) return 0;
  return (time / playerStore.duration) * 100;
};

const addMarkerAtCurrentTime = () => {
  editingMarkerId.value = null; // New marker mode
  pendingMarkerTime.value = playerStore.currentTime;
  pendingMarkerTimeInput.value = formatTime(playerStore.currentTime);
  newMarkerLabel.value = `Drop ${beatMarkerStore.markerCount + 1}`;
  newMarkerVisualizer.value = '';
  newMarkerChangeColor.value = false;
  showMarkerPanel.value = true;
};

const startEditMarker = (marker) => {
  editingMarkerId.value = marker.id; // Edit mode
  pendingMarkerTime.value = marker.time;
  pendingMarkerTimeInput.value = formatTime(marker.time);
  newMarkerLabel.value = marker.label || '';
  newMarkerVisualizer.value = marker.action?.visualizer || '';
  newMarkerColor.value = marker.action?.color || '#6ea8fe';
  newMarkerChangeColor.value = !!marker.action?.color;
  showMarkerPanel.value = true;
};

const confirmAddMarker = () => {
  const action = {
    type: 'combined',
    visualizer: newMarkerVisualizer.value || null,
    color: newMarkerChangeColor.value ? newMarkerColor.value : null
  };

  if (editingMarkerId.value !== null) {
    // Update existing marker
    beatMarkerStore.updateMarker(editingMarkerId.value, {
      time: pendingMarkerTime.value,
      label: newMarkerLabel.value,
      action: action
    });
  } else {
    // Add new marker
    beatMarkerStore.addMarker(pendingMarkerTime.value, action, newMarkerLabel.value);
  }

  editingMarkerId.value = null;
  showMarkerPanel.value = false;
};

const cancelAddMarker = () => {
  editingMarkerId.value = null;
  showMarkerPanel.value = false;
};

const seekToMarker = (time) => {
  playerStore.seekTo(time);
  beatMarkerStore.resetTriggers();
};

const removeMarker = (id) => {
  beatMarkerStore.removeMarker(id);
};

const clearAllMarkers = () => {
  if (confirm('Alle Beat-Drop Marker löschen?')) {
    beatMarkerStore.clearAllMarkers();
  }
};

const getVisualizerName = (id) => {
  const allViz = visualizerStore.availableVisualizers;
  const found = allViz.find(v => v.id === id);
  return found ? found.name : id;
};

// Watch for time changes to trigger markers
watch(() => playerStore.currentTime, (newTime) => {
  if (!playerStore.isPlaying) return;

  const triggered = beatMarkerStore.checkTrigger(newTime);
  if (triggered && triggered.action) {
    // Apply visualizer change
    if (triggered.action.visualizer) {
      visualizerStore.selectVisualizer(triggered.action.visualizer);
      console.log('🎯 Visualizer gewechselt zu:', triggered.action.visualizer);
    }
    // Apply color change
    if (triggered.action.color) {
      visualizerStore.setColor(triggered.action.color);
      console.log('🎨 Farbe gewechselt zu:', triggered.action.color);
    }
  }
});

// Reset markers when seeking
watch(() => playerStore.currentTime, (newTime, oldTime) => {
  // Detect seek (large time jump)
  if (Math.abs(newTime - oldTime) > 1) {
    beatMarkerStore.resetTriggers();
  }
});

// Check for markers at start (0:00) when playback begins
watch(() => playerStore.isPlaying, (isPlaying) => {
  if (isPlaying && playerStore.currentTime < 0.5) {
    // Reset triggers first to ensure clean state
    beatMarkerStore.resetTriggers();

    // Check if there's a marker at or near the start
    const triggered = beatMarkerStore.checkTrigger(playerStore.currentTime);
    if (triggered && triggered.action) {
      // Apply visualizer change
      if (triggered.action.visualizer) {
        visualizerStore.selectVisualizer(triggered.action.visualizer);
        console.log('🎯 Start-Marker: Visualizer gewechselt zu:', triggered.action.visualizer);
      }
      // Apply color change
      if (triggered.action.color) {
        visualizerStore.setColor(triggered.action.color);
        console.log('🎨 Start-Marker: Farbe gewechselt zu:', triggered.action.color);
      }
    }
  }
});

// Keyboard shortcut for adding marker (M key)
const handleKeydown = (e) => {
  if (e.key === 'm' || e.key === 'M') {
    if (!e.target.matches('input, textarea, select')) {
      e.preventDefault();
      if (playerStore.hasTracks) {
        addMarkerAtCurrentTime();
      }
    }
  }
};

const updateVolume = () => {
  if (playerStore.audioRef) {
    playerStore.audioRef.volume = volume.value / 100;
    localStorage.setItem('playerVolume', volume.value);
  }
};

const updateBass = () => {
  if (window.setBassGain) {
    window.setBassGain(parseFloat(bass.value));
    localStorage.setItem('playerBass', bass.value);
  }
};

const updateTreble = () => {
  if (window.setTrebleGain) {
    window.setTrebleGain(parseFloat(treble.value));
    localStorage.setItem('playerTreble', treble.value);
  }
};

const seekToPosition = (event) => {
  if (!playerStore.audioRef || playerStore.duration === 0) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = clickX / rect.width;
  const newTime = percentage * playerStore.duration;

  playerStore.seekTo(newTime);
};

// ✨ NEU: Lädt Track OHNE automatisches Abspielen
const loadTrackOnly = (index) => {
  playerStore.loadTrack(index);
  console.log('[PlayerPanel] Track loaded (no autoplay):', playerStore.playlist[index].name);
};

// === DRAG & DROP HANDLERS für Playlist-Neuordnung ===
const handleDragStart = (event, index) => {
  draggedTrackIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', index.toString());
  // Visuelles Feedback verzögert hinzufügen
  setTimeout(() => {
    event.target.classList.add('dragging');
  }, 0);
};

const handleDragEnd = () => {
  draggedTrackIndex.value = null;
  dragOverTrackIndex.value = null;
};

const handleDragOver = (event, index) => {
  if (draggedTrackIndex.value === null) return;
  if (draggedTrackIndex.value === index) return;

  dragOverTrackIndex.value = index;
  event.dataTransfer.dropEffect = 'move';
};

const handleDragLeave = () => {
  // Optional: Reset nur wenn wir das Element wirklich verlassen
};

const handleDrop = (event, toIndex) => {
  const fromIndex = draggedTrackIndex.value;

  if (fromIndex === null || fromIndex === toIndex) {
    handleDragEnd();
    return;
  }

  // Playlist im Store neu ordnen
  playerStore.reorderPlaylist(fromIndex, toIndex);
  handleDragEnd();
};

const removeTrack = (index) => {
  const wasPlaying = playerStore.isPlaying;
  const wasCurrentTrack = index === playerStore.currentTrackIndex;
  
  playerStore.playlist.splice(index, 1);

  // If playlist is now empty, reset everything
  if (playerStore.playlist.length === 0) {
    resetPlayer();
  } else {
    // Adjust currentTrackIndex if necessary
    if (index < playerStore.currentTrackIndex) {
      playerStore.currentTrackIndex--;
    } else if (wasCurrentTrack) {
      // Stop playback if we're removing the current track
      playerStore.stopPlayer();
      
      // Load next track without playing
      if (index >= playerStore.playlist.length) {
        playerStore.currentTrackIndex = playerStore.playlist.length - 1;
      } else {
        playerStore.currentTrackIndex = index;
      }
      
      // ✨ Nur laden, NICHT abspielen
      playerStore.loadTrack(playerStore.currentTrackIndex);
    }
  }
};

const clearAllTracks = () => {
  if (confirm('Möchten Sie wirklich alle Tracks aus der Playlist entfernen?')) {
    resetPlayer();
  }
};

const resetPlayer = () => {
  playerStore.clearPlaylist();
};

onMounted(() => {
  // Load saved volume
  const savedVolume = localStorage.getItem('playerVolume');
  if (savedVolume !== null) {
    volume.value = parseInt(savedVolume);
    updateVolume();
  } else if (playerStore.audioRef) {
    volume.value = Math.round(playerStore.audioRef.volume * 100);
  }

  // ✅ FIX: Synchronisiere Lautstärke wenn audioRef später gesetzt wird
  watch(() => playerStore.audioRef, (audioRef) => {
    if (audioRef) {
      audioRef.volume = volume.value / 100;
      console.log('[Player] Audio-Lautstärke synchronisiert:', volume.value + '%');
    }
  }, { immediate: true });

  // Load saved bass and treble settings
  const savedBass = localStorage.getItem('playerBass');
  if (savedBass !== null) {
    bass.value = parseInt(savedBass);
    updateBass();
  }

  const savedTreble = localStorage.getItem('playerTreble');
  if (savedTreble !== null) {
    treble.value = parseInt(savedTreble);
    updateTreble();
  }

  // Add keyboard listener for beat marker shortcut
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  // Remove keyboard listener
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.panel {
  background-color: var(--card-bg, #142640);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  padding: 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h3 {
  margin: 0;
  color: var(--text-primary, #E9E9EB);
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

h3::before {
  content: '';
  display: inline-block;
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Cpolygon points='5 3 19 12 5 21 5 3'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.8));
}

.section-label {
  display: block;
  font-size: 0.6rem;
  color: var(--text-muted, #7A8DA0);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Player Active Section */
.player-active {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Current Track */
.current-track {
  background-color: var(--secondary-bg, #0E1C32);
  padding: 6px 8px;
  border-radius: 5px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.track-title {
  font-size: 0.65rem;
  color: var(--accent-tertiary, #f8e1a9);
  font-weight: 600;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Progress Section */
.progress-section {
  display: flex;
  align-items: center;
  gap: 5px;
}

.time-display {
  font-size: 0.55rem;
  color: var(--text-muted, #7A8DA0);
  min-width: 28px;
  text-align: center;
  font-weight: 500;
}

.progress-bar-container {
  flex: 1;
  cursor: pointer;
  padding: 5px 0;
}

.progress-bar-background {
  position: relative;
  height: 4px;
  background-color: var(--secondary-bg, #0E1C32);
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
  width: 8px;
  height: 8px;
  background-color: var(--accent-tertiary, #f8e1a9);
  border-radius: 50%;
  transition: left 0.1s linear;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.progress-bar-container:hover .progress-bar-background {
  height: 5px;
}

.progress-bar-container:hover .progress-bar-handle {
  width: 10px;
  height: 10px;
  background-color: var(--accent-primary, #c9984d);
}

/* Player Controls */
.player-controls {
  display: flex;
  gap: 5px;
  justify-content: center;
  align-items: center;
}

.control-btn {
  background-color: var(--secondary-bg, #0E1C32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary, #E9E9EB);
  transition: all 0.2s ease;
  padding: 0;
}

.control-btn:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  transform: scale(1.05);
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn-main {
  width: 32px;
  height: 32px;
  background-color: var(--accent-primary, #c9984d);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
}

.control-btn-main:hover {
  background-color: var(--accent-tertiary, #f8e1a9);
  border-color: var(--accent-tertiary, #f8e1a9);
}

.control-btn svg {
  width: 12px;
  height: 12px;
}

.control-btn-main svg {
  width: 14px;
  height: 14px;
}

/* Volume Section */
.volume-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background-color: var(--secondary-bg, #0E1C32);
  border-radius: 5px;
}

.volume-icon {
  width: 14px;
  height: 14px;
  color: var(--text-primary, #E9E9EB);
  flex-shrink: 0;
}

.volume-slider {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--text-muted, #7A8DA0) 0%, var(--accent-primary, #c9984d) 100%);
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
  transition: all 0.2s ease;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.volume-slider::-webkit-slider-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-tertiary, #f8e1a9);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.volume-slider::-moz-range-thumb:hover {
  background: var(--accent-primary, #c9984d);
  transform: scale(1.1);
}

/* EQ Section (Bass & Treble) */
.eq-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 3px;
}

.eq-control {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.eq-label {
  font-size: 0.6rem;
  color: var(--text-muted, #7A8DA0);
}

.eq-slider-container {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 7px;
  background-color: var(--secondary-bg, #0E1C32);
  border-radius: 5px;
}

.eq-icon {
  width: 12px;
  height: 12px;
  color: var(--text-primary, #E9E9EB);
  flex-shrink: 0;
}

.eq-slider {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--text-muted, #7A8DA0) 0%, var(--accent-primary, #c9984d) 50%, var(--accent-tertiary, #f8e1a9) 100%);
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
  background: #6ea8fe;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.eq-slider::-webkit-slider-thumb:hover {
  background: #5a98ee;
  transform: scale(1.15);
}

.eq-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #6ea8fe;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.eq-slider::-moz-range-thumb:hover {
  background: #5a98ee;
  transform: scale(1.15);
}

/* Playlist Section */
.playlist-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-clear {
  background-color: transparent;
  border: none;
  color: var(--text-muted, #7A8DA0);
  cursor: pointer;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-clear:hover {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.btn-clear svg {
  width: 14px;
  height: 14px;
}

/* Playlist */
.playlist-container {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 100px;
  overflow-y: auto;
  background-color: var(--secondary-bg, #0E1C32);
  border-radius: 5px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
}

.playlist-item {
  position: relative;
  padding: 5px 7px;
  font-size: 0.6rem;
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
  color: #888;
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
  color: #121212;
  opacity: 0.7;
}

.playlist-item.active .btn-delete:hover {
  background-color: rgba(255, 68, 68, 0.8);
  color: #fff;
  opacity: 1;
}

/* Drag Handle für Playlist-Neuordnung */
.drag-handle {
  cursor: grab;
  color: #666;
  font-size: 0.7rem;
  user-select: none;
  opacity: 0.5;
  transition: opacity 0.2s ease, color 0.2s ease;
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

/* Drag & Drop Styles */
.playlist-item.dragging {
  opacity: 0.5;
  transform: scale(0.98);
  background-color: var(--accent-primary, #c9984d) !important;
  border-color: var(--accent-primary, #c9984d);
  box-shadow: 0 0 0 2px rgba(201, 152, 77, 0.3);
}

.playlist-item.drag-over {
  border-color: #4ade80;
  background-color: rgba(74, 222, 128, 0.15) !important;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.4);
  transform: scale(1.02);
}

.playlist-item.drag-over::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #4ade80;
  border-radius: 1px;
  animation: dragPulse 0.8s ease-in-out infinite;
}

@keyframes dragPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.playlist-item-empty {
  padding: 12px;
  color: #666;
  font-style: italic;
  text-align: center;
  font-size: 11px;
}

/* Scrollbar Styling */
.playlist-container::-webkit-scrollbar {
  width: 6px;
}

.playlist-container::-webkit-scrollbar-track {
  background: #2a2a2a;
  border-radius: 3px;
}

.playlist-container::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.playlist-container::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* ========== Beat Marker Styles ========== */

/* Marker indicator on progress bar */
.beat-marker-indicator {
  position: absolute;
  top: -4px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid #ffd700;
  transform: translateX(-50%);
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}

.beat-marker-indicator:hover {
  border-top-color: #ffed4a;
  transform: translateX(-50%) scale(1.3);
}

.beat-marker-indicator.triggered {
  border-top-color: #4ade80;
  animation: markerPulse 0.3s ease-out;
}

@keyframes markerPulse {
  0% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.5); }
  100% { transform: translateX(-50%) scale(1); }
}

/* Add marker button */
.control-btn-marker {
  background-color: #ffd700;
  border-color: #ffd700;
  color: #121212;
  margin-left: 8px;
}

.control-btn-marker:hover {
  background-color: #ffed4a;
  border-color: #ffed4a;
}

.control-btn-marker.active {
  background-color: #4ade80;
  border-color: #4ade80;
}

/* Beat Marker Section */
.beat-marker-section {
  background-color: #333;
  border-radius: 6px;
  padding: 8px;
  border: 1px solid #444;
}

.marker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.marker-controls {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn-toggle {
  padding: 3px 8px;
  font-size: 9px;
  font-weight: 600;
  border: 1px solid #555;
  border-radius: 4px;
  background-color: #3a3a3a;
  color: #888;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-toggle.active {
  background-color: #4ade80;
  border-color: #4ade80;
  color: #121212;
}

.btn-clear-markers {
  background-color: transparent;
  border: none;
  color: #888;
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

/* Add Marker Form */
.marker-add-form {
  background-color: #2a2a2a;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid #ffd700;
}

.form-title {
  font-size: 11px;
  font-weight: 600;
  color: #ffd700;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #444;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.form-row label {
  font-size: 10px;
  color: #aaa;
  min-width: 60px;
}

.marker-select {
  flex: 1;
  padding: 4px 6px;
  font-size: 10px;
  background-color: #3a3a3a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #e0e0e0;
}

.marker-select:focus {
  border-color: #6ea8fe;
  outline: none;
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
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.color-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #aaa;
  cursor: pointer;
}

.color-checkbox input {
  width: 12px;
  height: 12px;
}

.marker-input {
  flex: 1;
  padding: 4px 6px;
  font-size: 10px;
  background-color: #3a3a3a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #e0e0e0;
}

.marker-input:focus {
  border-color: #6ea8fe;
  outline: none;
}

/* Time Input */
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
  background-color: #3a3a3a;
  border: 1px solid #ffd700;
  border-radius: 4px;
  color: #ffd700;
  text-align: center;
}

.marker-time-input:focus {
  border-color: #ffed4a;
  outline: none;
  box-shadow: 0 0 4px rgba(255, 215, 0, 0.4);
}

.time-hint {
  font-size: 9px;
  color: #666;
  font-style: italic;
}

.time-max {
  font-size: 10px;
  color: #888;
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
  color: #121212;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm:hover {
  background-color: #22c55e;
}

.btn-cancel {
  padding: 4px 12px;
  font-size: 10px;
  background-color: #3a3a3a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #aaa;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background-color: #4a4a4a;
  color: #e0e0e0;
}

/* Marker List */
.marker-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 100px;
  overflow-y: auto;
}

.marker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: 10px;
  background-color: #2a2a2a;
  border-radius: 4px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

.marker-item:last-child {
  margin-bottom: 0;
}

.marker-item:hover {
  background-color: #3a3a3a;
}

.marker-item.triggered {
  background-color: rgba(74, 222, 128, 0.2);
  border-left: 2px solid #4ade80;
}

.marker-item.editing {
  background-color: rgba(255, 215, 0, 0.15);
  border-left: 2px solid #ffd700;
}

.marker-buttons {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.marker-time {
  font-weight: 600;
  color: #ffd700;
  cursor: pointer;
  min-width: 36px;
}

.marker-time:hover {
  text-decoration: underline;
}

.marker-label {
  flex: 1;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s ease;
}

.marker-label:hover {
  color: #ffd700;
}

.marker-action {
  font-size: 9px;
  color: #6ea8fe;
  background-color: rgba(110, 168, 254, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
}

.btn-delete-marker {
  background-color: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0.5;
}

.btn-delete-marker:hover {
  background-color: rgba(255, 68, 68, 0.8);
  color: #fff;
  opacity: 1;
}

.btn-delete-marker svg {
  width: 12px;
  height: 12px;
}

.btn-edit-marker {
  background-color: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0.5;
}

.btn-edit-marker:hover {
  background-color: rgba(255, 215, 0, 0.8);
  color: #000;
  opacity: 1;
}

.btn-edit-marker svg {
  width: 12px;
  height: 12px;
}

/* Marker list scrollbar */
.marker-list::-webkit-scrollbar {
  width: 4px;
}

.marker-list::-webkit-scrollbar-track {
  background: #2a2a2a;
  border-radius: 2px;
}

.marker-list::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 2px;
}

.marker-list::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* ========== Audio Source Selector ========== */

.audio-source-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: linear-gradient(180deg, var(--card-bg, #142640) 0%, rgba(201, 152, 77, 0.08) 100%);
  border-radius: 6px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  border-left: 2px solid var(--accent-primary, #c9984d);
}

.source-toggle {
  display: flex;
  gap: 6px;
}

.source-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: var(--secondary-bg, #0E1C32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 6px;
  color: var(--text-muted, #7A8DA0);
  font-size: 0.65rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.source-btn:hover {
  background-color: var(--btn-hover, #1a2a42);
  border-color: var(--accent-primary, #c9984d);
  color: var(--text-primary, #E9E9EB);
}

.source-btn.active {
  background-color: var(--accent-primary, #c9984d);
  border-color: var(--accent-primary, #c9984d);
  color: var(--accent-text, #091428);
  font-weight: 600;
}

.source-btn.listening {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border-color: #22c55e;
  color: #fff;
  animation: pulse-glow 1.5s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(34, 197, 94, 0.4);
  }
  50% {
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.7);
  }
}

.source-btn svg {
  width: 16px;
  height: 16px;
}

/* Microphone Status */
.mic-status {
  padding: 6px 10px;
  border-radius: 5px;
  font-size: 0.6rem;
}

.mic-active {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #22c55e;
  background-color: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 5px;
  padding: 6px 10px;
}

.mic-indicator {
  width: 8px;
  height: 8px;
  background-color: #22c55e;
  border-radius: 50%;
  animation: mic-pulse 1s ease-in-out infinite;
}

@keyframes mic-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

.mic-error {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 5px;
  padding: 6px 10px;
}

/* Device Selector */
.device-selector {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-selector label {
  font-size: 0.55rem;
  color: var(--text-muted, #7A8DA0);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.device-select {
  padding: 6px 8px;
  font-size: 0.6rem;
  background-color: var(--secondary-bg, #0E1C32);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.3));
  border-radius: 5px;
  color: var(--text-primary, #E9E9EB);
  cursor: pointer;
  transition: all 0.2s ease;
}

.device-select:hover {
  border-color: var(--accent-primary, #c9984d);
}

.device-select:focus {
  outline: none;
  border-color: var(--accent-primary, #c9984d);
  box-shadow: 0 0 0 2px rgba(201, 152, 77, 0.2);
}

.device-select option {
  background-color: var(--card-bg, #142640);
  color: var(--text-primary, #E9E9EB);
}
</style>
