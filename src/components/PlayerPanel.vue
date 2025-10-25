<template>
  <div class="panel">
    <h3>Player</h3>
    
    <div v-if="playerStore.hasTracks" class="player-active">
      <!-- Current Track Display -->
      <div class="current-track">
        <span class="track-title">{{ playerStore.currentTrack?.name }}</span>
      </div>

      <!-- Progress Bar with Time Display -->
      <div class="progress-section">
        <span class="time-display">{{ formatTime(playerStore.currentTime) }}</span>
        <div class="progress-bar-container" @click="seekToPosition">
          <div class="progress-bar-background">
            <div class="progress-bar-fill" :style="{ width: playerStore.progressPercentage + '%' }"></div>
            <div class="progress-bar-handle" :style="{ left: playerStore.progressPercentage + '%' }"></div>
          </div>
        </div>
        <span class="time-display">{{ formatTime(playerStore.duration) }}</span>
      </div>

      <!-- Player Controls -->
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
import { ref, onMounted } from 'vue';
import { usePlayerStore } from '../stores/playerStore.js';

const playerStore = usePlayerStore();
const volume = ref(100);

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const updateVolume = () => {
  if (playerStore.audioRef) {
    playerStore.audioRef.volume = volume.value / 100;
    localStorage.setItem('playerVolume', volume.value);
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
});
</script>

<style scoped>
.panel {
  background-color: #2a2a2a;
  border: 1px solid #333;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h3 {
  margin: 0;
  color: #e0e0e0;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-label {
  display: block;
  font-size: 11px;
  color: #888;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Player Active Section */
.player-active {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Current Track */
.current-track {
  background-color: #333;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #444;
}

.track-title {
  font-size: 11px;
  color: #ffd700;
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
  gap: 6px;
}

.time-display {
  font-size: 10px;
  color: #888;
  min-width: 32px;
  text-align: center;
  font-weight: 500;
}

.progress-bar-container {
  flex: 1;
  cursor: pointer;
  padding: 6px 0;
}

.progress-bar-background {
  position: relative;
  height: 4px;
  background-color: #444;
  border-radius: 2px;
  overflow: visible;
}

.progress-bar-fill {
  position: absolute;
  height: 100%;
  background-color: #6ea8fe;
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-bar-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background-color: #6ea8fe;
  border-radius: 50%;
  transition: left 0.1s linear;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.progress-bar-container:hover .progress-bar-background {
  height: 5px;
}

.progress-bar-container:hover .progress-bar-handle {
  width: 12px;
  height: 12px;
  background-color: #5a98ee;
}

/* Player Controls */
.player-controls {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
}

.control-btn {
  background-color: #3a3a3a;
  border: 1px solid #555;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #e0e0e0;
  transition: all 0.2s ease;
  padding: 0;
}

.control-btn:hover {
  background-color: #4a4a4a;
  border-color: #6ea8fe;
  transform: scale(1.05);
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn-main {
  width: 36px;
  height: 36px;
  background-color: #6ea8fe;
  border-color: #6ea8fe;
  color: #121212;
}

.control-btn-main:hover {
  background-color: #5a98ee;
  border-color: #5a98ee;
}

.control-btn svg {
  width: 14px;
  height: 14px;
}

.control-btn-main svg {
  width: 18px;
  height: 18px;
}

/* Volume Section */
.volume-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: #333;
  border-radius: 6px;
}

.volume-icon {
  width: 16px;
  height: 16px;
  color: #e0e0e0;
  flex-shrink: 0;
}

.volume-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, #555 0%, #6ea8fe 100%);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6ea8fe;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.volume-slider::-webkit-slider-thumb:hover {
  background: #5a98ee;
  transform: scale(1.15);
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6ea8fe;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.volume-slider::-moz-range-thumb:hover {
  background: #5a98ee;
  transform: scale(1.15);
}

/* Playlist Section */
.playlist-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-clear {
  background-color: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-clear:hover {
  background-color: rgba(255, 68, 68, 0.2);
  color: #ff4444;
}

.btn-clear svg {
  width: 16px;
  height: 16px;
}

/* Playlist */
.playlist-container {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 140px;
  overflow-y: auto;
  background-color: #333;
  border-radius: 6px;
  border: 1px solid #444;
}

.playlist-item {
  padding: 6px 8px;
  font-size: 11px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  border-bottom: 1px solid #3a3a3a;
}

.playlist-item:last-child {
  border-bottom: none;
}

.playlist-item:hover {
  background-color: #3a3a3a;
}

.playlist-item.active {
  background-color: #6ea8fe;
  color: #121212;
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
</style>
