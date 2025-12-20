<template>
  <div class="panel">
    <h3>{{ t('fileUpload.title') }}</h3>

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
          {{ t('fileUpload.selectFiles') }}
        </span>
        <span class="upload-main" v-else>
          {{ playerStore.playlist.length }} Track{{ playerStore.playlist.length !== 1 ? 's' : '' }}
        </span>
        <span class="upload-sub">
          {{ t('fileUpload.dragOrClick') }}
        </span>
      </div>

      <div class="supported-formats">
        <span class="format-label">{{ t('fileUpload.supported') }}:</span>
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
        <span class="info-text">{{ playerStore.playlist.length }} {{ locale === 'de' ? (playerStore.playlist.length !== 1 ? 'Dateien' : 'Datei') : (playerStore.playlist.length !== 1 ? 'files' : 'file') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { usePlayerStore } from '../stores/playerStore.js';

const { t, locale } = useI18n();

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
  background-color: var(--panel, #151b1d);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  padding: 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Cpath d='M9 18V5l12-2v13'/%3E%3Ccircle cx='6' cy='18' r='3'/%3E%3Ccircle cx='18' cy='16' r='3'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.8));
}

/* Upload Area */
.upload-area {
  background: linear-gradient(135deg, var(--btn, #1c2426) 0%, rgba(96, 145, 152, 0.1) 100%);
  border: 2px dashed var(--border-color, rgba(158, 190, 193, 0.3));
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-height: 100px;
  justify-content: center;
}

.upload-area:hover {
  border-color: var(--accent, #609198);
  background: linear-gradient(135deg, rgba(96, 145, 152, 0.15) 0%, rgba(188, 229, 229, 0.1) 100%);
  transform: translateY(-1px);
}

.upload-area.drag-over {
  border-color: var(--accent-light, #BCE5E5);
  background: linear-gradient(135deg, rgba(96, 145, 152, 0.2) 0%, rgba(188, 229, 229, 0.15) 100%);
  border-style: solid;
  transform: scale(1.01);
}

/* Upload Icon - Minimalistic white with black outline */
.upload-icon {
  width: 36px;
  height: 36px;
  color: var(--accent-light, #BCE5E5);
  transition: all 0.3s ease;
}

.upload-icon svg {
  width: 100%;
  height: 100%;
  stroke: #ffffff;
  stroke-width: 1.5;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.6));
}

.upload-area:hover .upload-icon {
  transform: translateY(-3px);
}

.upload-area.drag-over .upload-icon {
  transform: scale(1.15);
}

/* Upload Text */
.upload-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-align: center;
}

.upload-main {
  font-size: 0.7rem;
  color: var(--text, #E9E9EB);
  font-weight: 600;
}

.upload-sub {
  font-size: 0.6rem;
  color: var(--muted, #A8A992);
  font-weight: 500;
}

/* Supported Formats */
.supported-formats {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.format-label {
  font-size: 0.55rem;
  color: var(--muted, #A8A992);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
}

.format-item {
  font-size: 0.55rem;
  color: var(--accent, #609198);
  background-color: rgba(96, 145, 152, 0.15);
  padding: 2px 5px;
  border-radius: 3px;
  font-weight: 500;
  border: 1px solid rgba(96, 145, 152, 0.25);
}

/* Tracks Info */
.tracks-info {
  background-color: rgba(197, 222, 176, 0.1);
  border: 1px solid rgba(197, 222, 176, 0.3);
  border-radius: 5px;
  padding: 6px 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-icon {
  width: 14px;
  height: 14px;
  color: var(--success, #C5DEB0);
  flex-shrink: 0;
}

.info-text {
  font-size: 0.65rem;
  color: var(--success, #C5DEB0);
  font-weight: 600;
}

/* Responsive */
@media (max-width: 400px) {
  .upload-area {
    padding: 12px;
    min-height: 90px;
  }

  .upload-icon {
    width: 32px;
    height: 32px;
  }
}
</style>
