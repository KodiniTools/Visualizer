<template>
  <div class="panel">
    <h3>Player</h3>

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
        <button @click="playerStore.prevTrack" class="control-btn" title="Zurück">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button @click="playerStore.togglePlayPause" class="control-btn control-btn-main" :title="playerStore.isPlaying ? 'Pause' : 'Play'">
          <svg v-if="!playerStore.isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        </button>

        <button @click="playerStore.stopPlayer" class="control-btn" title="Stop">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z"/>
          </svg>
        </button>

        <button @click="playerStore.nextTrack" class="control-btn" title="Vorwärts">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <!-- Add Beat Marker Button -->
        <button
          @click="addMarkerAtCurrentTime"
          class="control-btn control-btn-marker"
          :class="{ active: showMarkerPanel }"
          title="Beat-Drop Marker setzen (M)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>
      </div>

      <!-- Beat Marker Section -->
      <div class="beat-marker-section" v-if="beatMarkerStore.markerCount > 0 || showMarkerPanel">
        <div class="marker-header">
          <span class="section-label">Beat-Drop Marker ({{ beatMarkerStore.markerCount }})</span>
          <div class="marker-controls">
            <button
              @click="beatMarkerStore.toggleEnabled()"
              class="btn-toggle"
              :class="{ active: beatMarkerStore.markersEnabled }"
              :title="beatMarkerStore.markersEnabled ? 'Marker deaktivieren' : 'Marker aktivieren'"
            >
              {{ beatMarkerStore.markersEnabled ? 'AN' : 'AUS' }}
            </button>
            <button
              v-if="beatMarkerStore.markerCount > 0"
              @click="clearAllMarkers"
              class="btn-clear-markers"
              title="Alle Marker löschen"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Add Marker Form -->
        <div v-if="showMarkerPanel" class="marker-add-form">
          <div class="form-row">
            <label>Visualizer:</label>
            <select v-model="newMarkerVisualizer" class="marker-select">
              <option value="">-- Kein Wechsel --</option>
              <optgroup v-for="(items, category) in visualizerStore.categorizedVisualizers" :key="category" :label="category">
                <option v-for="viz in items" :key="viz.id" :value="viz.id">{{ viz.name }}</option>
              </optgroup>
            </select>
          </div>
          <div class="form-row">
            <label>Farbe:</label>
            <div class="color-input-wrapper">
              <input type="color" v-model="newMarkerColor" class="marker-color" />
              <label class="color-checkbox">
                <input type="checkbox" v-model="newMarkerChangeColor" />
                <span>Ändern</span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <label>Label:</label>
            <input type="text" v-model="newMarkerLabel" placeholder="z.B. Bass Drop" class="marker-input" />
          </div>
          <div class="form-buttons">
            <button @click="confirmAddMarker" class="btn-confirm">Hinzufügen</button>
            <button @click="cancelAddMarker" class="btn-cancel">Abbrechen</button>
          </div>
        </div>

        <!-- Marker List -->
        <ul v-if="beatMarkerStore.markerCount > 0" class="marker-list">
          <li
            v-for="marker in beatMarkerStore.sortedMarkers"
            :key="marker.id"
            class="marker-item"
            :class="{ triggered: marker.triggered }"
          >
            <span class="marker-time" @click="seekToMarker(marker.time)">{{ formatTime(marker.time) }}</span>
            <span class="marker-label">{{ marker.label }}</span>
            <span v-if="marker.action.visualizer" class="marker-action">{{ getVisualizerName(marker.action.visualizer) }}</span>
            <button @click="removeMarker(marker.id)" class="btn-delete-marker" title="Marker löschen">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </li>
        </ul>
      </div>

      <!-- Volume Control -->
      <div class="volume-section">
        <span class="section-label">Lautstärke: {{ volume }}%</span>
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
          <span class="eq-label">Bass: {{ bass > 0 ? '+' : '' }}{{ bass }} dB</span>
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
          <span class="eq-label">Treble: {{ treble > 0 ? '+' : '' }}{{ treble }} dB</span>
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
        <span class="section-label">Wiedergabeliste</span>
        <button v-if="playerStore.hasTracks" @click="clearAllTracks" class="btn-clear" title="Alles löschen">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
      
      <ul class="playlist-container">
        <li v-if="!playerStore.hasTracks" class="playlist-item-empty">
          Playlist ist leer
        </li>
        <li
          v-for="(track, index) in playerStore.playlist"
          :key="track.url"
          class="playlist-item"
          :class="{ active: index === playerStore.currentTrackIndex }"
        >
          <span @click="loadTrackOnly(index)" class="track-name">{{ track.name }}</span>
          <button @click.stop="removeTrack(index)" class="btn-delete" title="Track entfernen">
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
import { usePlayerStore } from '../stores/playerStore.js';
import { useBeatMarkerStore } from '../stores/beatMarkerStore.js';
import { useVisualizerStore } from '../stores/visualizerStore.js';

const playerStore = usePlayerStore();
const beatMarkerStore = useBeatMarkerStore();
const visualizerStore = useVisualizerStore();

const volume = ref(100);
const bass = ref(0);
const treble = ref(0);

// Beat Marker State
const showMarkerPanel = ref(false);
const pendingMarkerTime = ref(0);
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

// Beat Marker Functions
const getMarkerPosition = (time) => {
  if (playerStore.duration === 0) return 0;
  return (time / playerStore.duration) * 100;
};

const addMarkerAtCurrentTime = () => {
  pendingMarkerTime.value = playerStore.currentTime;
  newMarkerLabel.value = `Drop ${beatMarkerStore.markerCount + 1}`;
  newMarkerVisualizer.value = '';
  newMarkerChangeColor.value = false;
  showMarkerPanel.value = true;
};

const confirmAddMarker = () => {
  const action = {
    type: 'combined',
    visualizer: newMarkerVisualizer.value || null,
    color: newMarkerChangeColor.value ? newMarkerColor.value : null
  };

  beatMarkerStore.addMarker(pendingMarkerTime.value, action, newMarkerLabel.value);
  showMarkerPanel.value = false;
};

const cancelAddMarker = () => {
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
  background-color: var(--panel, #151b1d);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  padding: 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h3 {
  margin: 0;
  color: var(--text, #E9E9EB);
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
  color: var(--muted, #A8A992);
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
  background-color: var(--btn, #1c2426);
  padding: 6px 8px;
  border-radius: 5px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
}

.track-title {
  font-size: 0.65rem;
  color: var(--accent-light, #BCE5E5);
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
  color: var(--muted, #A8A992);
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
  background-color: var(--btn, #1c2426);
  border-radius: 2px;
  overflow: visible;
}

.progress-bar-fill {
  position: absolute;
  height: 100%;
  background-color: var(--accent, #609198);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-bar-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background-color: var(--accent-light, #BCE5E5);
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
  background-color: var(--accent, #609198);
}

/* Player Controls */
.player-controls {
  display: flex;
  gap: 5px;
  justify-content: center;
  align-items: center;
}

.control-btn {
  background-color: var(--btn, #1c2426);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text, #E9E9EB);
  transition: all 0.2s ease;
  padding: 0;
}

.control-btn:hover {
  background-color: var(--btn-hover, #2a3335);
  border-color: var(--accent, #609198);
  transform: scale(1.05);
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn-main {
  width: 32px;
  height: 32px;
  background-color: var(--accent, #609198);
  border-color: var(--accent, #609198);
  color: var(--accent-text, #0f1416);
}

.control-btn-main:hover {
  background-color: var(--accent-light, #BCE5E5);
  border-color: var(--accent-light, #BCE5E5);
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
  background-color: var(--btn, #1c2426);
  border-radius: 5px;
}

.volume-icon {
  width: 14px;
  height: 14px;
  color: var(--text, #E9E9EB);
  flex-shrink: 0;
}

.volume-slider {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--muted, #A8A992) 0%, var(--accent, #609198) 100%);
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
  background: var(--accent-light, #BCE5E5);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.volume-slider::-webkit-slider-thumb:hover {
  background: var(--accent, #609198);
  transform: scale(1.1);
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-light, #BCE5E5);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.volume-slider::-moz-range-thumb:hover {
  background: var(--accent, #609198);
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
  color: var(--muted, #A8A992);
}

.eq-slider-container {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 7px;
  background-color: var(--btn, #1c2426);
  border-radius: 5px;
}

.eq-icon {
  width: 12px;
  height: 12px;
  color: var(--text, #E9E9EB);
  flex-shrink: 0;
}

.eq-slider {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--muted, #A8A992) 0%, var(--accent, #609198) 50%, var(--accent-light, #BCE5E5) 100%);
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
  color: var(--muted, #A8A992);
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
  background-color: var(--btn, #1c2426);
  border-radius: 5px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
}

.playlist-item {
  padding: 5px 7px;
  font-size: 0.6rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--border-color, rgba(158, 190, 193, 0.1));
}

.playlist-item:last-child {
  border-bottom: none;
}

.playlist-item:hover {
  background-color: var(--btn-hover, #2a3335);
}

.playlist-item.active {
  background-color: var(--accent, #609198);
  color: var(--accent-text, #0f1416);
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
</style>
