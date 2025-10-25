<template>
  <div class="panel">
    <h3>Audiodateien</h3>
    
    <!-- Upload Area mit Drag & Drop -->
    <div 
      class="upload-area"
      :class="{ 'drag-over': isDragging }"
      @click="triggerFileInput"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div class="upload-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      
      <div class="upload-text">
        <span class="upload-main" v-if="!playerStore.hasTracks">
          Audio-Dateien auswählen
        </span>
        <span class="upload-main" v-else>
          {{ playerStore.playlist.length }} Track{{ playerStore.playlist.length !== 1 ? 's' : '' }} geladen
        </span>
        <span class="upload-sub">
          Klicken oder Dateien hierher ziehen
        </span>
      </div>
      
      <div class="supported-formats">
        <span class="format-label">Unterstützt:</span>
        <span class="format-item">MP3</span>
        <span class="format-item">WAV</span>
        <span class="format-item">OGG</span>
        <span class="format-item">M4A</span>
      </div>
    </div>
    
    <!-- Hidden File Input -->
    <input 
      ref="fileInput"
      type="file" 
      @change="onSelectFiles" 
      multiple 
      accept="audio/*" 
      style="display: none;"
    />
    
    <!-- Tracks Info -->
    <div v-if="playerStore.hasTracks" class="tracks-info">
      <div class="info-row">
        <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span class="info-text">{{ playerStore.playlist.length }} Datei{{ playerStore.playlist.length !== 1 ? 'en' : '' }} bereit</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { usePlayerStore } from '../stores/playerStore.js';

const playerStore = usePlayerStore();
const fileInput = ref(null);
const isDragging = ref(false);

function triggerFileInput() {
  fileInput.value?.click();
}

function onSelectFiles(event) {
  const files = event.target.files;
  if (files && files.length > 0) {
    playerStore.addTracks(files);
    event.target.value = ''; // Reset input to allow re-uploading same files
  }
}

function onDragOver(event) {
  isDragging.value = true;
}

function onDragLeave(event) {
  isDragging.value = false;
}

function onDrop(event) {
  isDragging.value = false;
  const files = event.dataTransfer.files;
  if (files && files.length > 0) {
    // Filter nur Audio-Dateien
    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length > 0) {
      playerStore.addTracks(audioFiles);
    }
  }
}
</script>

<style scoped>
.panel {
  background-color: #2a2a2a;
  border: 1px solid #333;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h3 {
  margin: 0;
  color: #e0e0e0;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Upload Area */
.upload-area {
  background: linear-gradient(135deg, #333 0%, #3a3a3a 100%);
  border: 2px dashed #555;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 140px;
  justify-content: center;
}

.upload-area:hover {
  border-color: #6ea8fe;
  background: linear-gradient(135deg, #3a3a3a 0%, #404040 100%);
  transform: translateY(-2px);
}

.upload-area.drag-over {
  border-color: #6ea8fe;
  background: linear-gradient(135deg, rgba(110, 168, 254, 0.1) 0%, rgba(110, 168, 254, 0.15) 100%);
  border-style: solid;
  transform: scale(1.02);
}

/* Upload Icon */
.upload-icon {
  width: 48px;
  height: 48px;
  color: #6ea8fe;
  transition: all 0.3s ease;
}

.upload-area:hover .upload-icon {
  transform: translateY(-4px);
  color: #5a96e8;
}

.upload-area.drag-over .upload-icon {
  transform: scale(1.2);
  color: #5a96e8;
}

.upload-icon svg {
  width: 100%;
  height: 100%;
}

/* Upload Text */
.upload-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.upload-main {
  font-size: 12px;
  color: #e0e0e0;
  font-weight: 600;
}

.upload-sub {
  font-size: 10px;
  color: #888;
  font-weight: 500;
}

/* Supported Formats */
.supported-formats {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.format-label {
  font-size: 9px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.format-item {
  font-size: 9px;
  color: #888;
  background-color: rgba(110, 168, 254, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  border: 1px solid rgba(110, 168, 254, 0.2);
}

/* Tracks Info */
.tracks-info {
  background-color: rgba(110, 168, 254, 0.1);
  border: 1px solid rgba(110, 168, 254, 0.3);
  border-radius: 6px;
  padding: 8px 10px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon {
  width: 16px;
  height: 16px;
  color: #6ea8fe;
  flex-shrink: 0;
}

.info-text {
  font-size: 11px;
  color: #6ea8fe;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 400px) {
  .upload-area {
    padding: 16px;
    min-height: 120px;
  }
  
  .upload-icon {
    width: 40px;
    height: 40px;
  }
  
  .upload-main {
    font-size: 11px;
  }
  
  .upload-sub {
    font-size: 9px;
  }
}
</style>
