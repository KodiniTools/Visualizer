<template>
  <div class="video-panel-wrapper">
    <!-- Upload-Bereich -->
    <div class="upload-section">
      <h4>{{ locale === 'de' ? 'Videos' : 'Videos' }}</h4>

      <div class="upload-area" @click="triggerFileInput" @drop.prevent="handleDrop" @dragover.prevent>
        <input
          type="file"
          ref="fileInputRef"
          @change="handleVideoUpload"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          style="display: none;"
        >
        <div class="upload-placeholder">
          <div class="upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <p>{{ locale === 'de' ? 'MP4-Video hochladen' : 'Upload MP4 video' }}</p>
          <small>{{ locale === 'de' ? 'MP4, WebM, MOV' : 'MP4, WebM, MOV' }}</small>
        </div>
      </div>

      <!-- Video-Galerie -->
      <div v-if="videoGallery.length > 0" class="gallery-container">
        <div class="gallery-header">
          <span class="gallery-title">{{ locale === 'de' ? 'Videos (' + videoGallery.length + ')' : 'Videos (' + videoGallery.length + ')' }}</span>
          <button @click="clearAllVideos" class="btn-clear-all">{{ locale === 'de' ? 'Alle löschen' : 'Delete all' }}</button>
        </div>

        <div class="gallery-scroll">
          <div class="gallery-grid">
            <div
              v-for="(videoData, index) in videoGallery"
              :key="videoData.id"
              class="thumbnail-item video-thumbnail"
              :class="{ 'selected': selectedVideoIndex === index }"
              @click="selectVideo(index)"
            >
              <!-- Video-Thumbnail -->
              <video
                :src="videoData.src"
                muted
                preload="metadata"
                class="video-thumb"
                @loadedmetadata="generateThumbnail($event, index)"
              />
              <!-- Play-Icon Overlay -->
              <div class="video-play-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
              <div class="thumbnail-overlay">
                <button @click.stop="deleteVideo(index)" class="btn-delete-thumb">✕</button>
              </div>
              <div class="thumbnail-info">
                <span class="thumbnail-name">{{ videoData.name }}</span>
                <span class="thumbnail-duration">{{ formatDuration(videoData.duration) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action-Buttons -->
      <div v-if="selectedVideoIndex !== null" class="action-buttons">
        <button @click="addVideoToCanvas" class="btn-primary">
          {{ locale === 'de' ? 'Auf Canvas platzieren' : 'Place on Canvas' }}
        </button>
      </div>

      <!-- Platzierung mit Animation -->
      <div v-if="selectedVideoIndex !== null" class="placement-section">
        <div class="placement-header">
          <span>{{ locale === 'de' ? 'Platzierung' : 'Placement' }}</span>
        </div>

        <!-- Kompakte Einstellungen Grid -->
        <div class="placement-grid">
          <!-- Animation -->
          <div class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Effekt' : 'Effect' }}</span>
            <select v-model="selectedAnimation" class="placement-select">
              <option value="none">–</option>
              <option value="fade">Fade</option>
              <option value="slideLeft">← Slide</option>
              <option value="slideRight">→ Slide</option>
              <option value="slideUp">↑ Slide</option>
              <option value="slideDown">↓ Slide</option>
              <option value="zoom">Zoom</option>
              <option value="bounce">Bounce</option>
              <option value="spin">Spin</option>
              <option value="elastic">Elastic</option>
            </select>
          </div>

          <!-- Dauer (nur wenn Animation) -->
          <div v-if="selectedAnimation !== 'none'" class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Dauer' : 'Duration' }}</span>
            <div class="placement-slider-wrap">
              <input type="range" v-model.number="animationDuration" min="100" max="5000" step="100" class="placement-slider" />
              <span class="placement-value">{{ (animationDuration / 1000).toFixed(1) }}s</span>
            </div>
          </div>

          <!-- Größe -->
          <div class="placement-row">
            <span class="placement-label">{{ locale === 'de' ? 'Größe' : 'Size' }}</span>
            <div class="placement-slider-wrap">
              <input type="range" v-model.number="videoScale" min="1" max="8" step="1" class="placement-slider" />
              <span class="placement-value">{{ videoScale }}x</span>
            </div>
          </div>

          <!-- Loop & Muted -->
          <div class="placement-row placement-checkboxes">
            <label class="checkbox-label">
              <input type="checkbox" v-model="videoLoop" />
              <span>{{ locale === 'de' ? 'Wiederholen' : 'Loop' }}</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="videoMuted" />
              <span>{{ locale === 'de' ? 'Stumm' : 'Muted' }}</span>
            </label>
          </div>
        </div>

        <!-- Buttons -->
        <div class="placement-buttons">
          <button @click="addVideoDirectly" class="btn-placement btn-place">
            {{ locale === 'de' ? 'Platzieren' : 'Place' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Canvas-Videos Liste -->
    <div v-if="canvasVideos.length > 0" class="canvas-videos-section">
      <h4>{{ locale === 'de' ? 'Videos auf Canvas' : 'Videos on Canvas' }}</h4>
      <div class="canvas-videos-list">
        <div
          v-for="(video, index) in canvasVideos"
          :key="video.id"
          class="canvas-video-item"
          :class="{ 'active': isVideoActive(video) }"
          @click="selectCanvasVideo(video)"
        >
          <div class="video-info">
            <span class="video-index">{{ index + 1 }}</span>
            <span class="video-name">Video {{ index + 1 }}</span>
            <span class="video-status" :class="{ 'playing': video.isPlaying }">
              {{ video.isPlaying ? '▶' : '⏸' }}
            </span>
          </div>
          <div class="video-controls">
            <button @click.stop="togglePlayVideo(video)" class="btn-control" :title="video.isPlaying ? 'Pause' : 'Play'">
              {{ video.isPlaying ? '⏸' : '▶' }}
            </button>
            <button @click.stop="removeCanvasVideo(video)" class="btn-control btn-delete" title="Entfernen">
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Globale Video-Steuerung -->
      <div class="global-video-controls">
        <button @click="playAllVideos" class="btn-global">
          {{ locale === 'de' ? 'Alle abspielen' : 'Play all' }}
        </button>
        <button @click="pauseAllVideos" class="btn-global">
          {{ locale === 'de' ? 'Alle pausieren' : 'Pause all' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue';
import { useI18n } from '../lib/i18n.js';

const { locale } = useI18n();

// Injected dependencies
const canvasManager = inject('canvasManager');
const videoManager = inject('videoManager');

// Refs
const fileInputRef = ref(null);
const videoGallery = ref([]);
const selectedVideoIndex = ref(null);

// Placement settings
const selectedAnimation = ref('none');
const animationDuration = ref(500);
const videoScale = ref(3);
const videoLoop = ref(true);
const videoMuted = ref(true);

// Computed
const canvasVideos = computed(() => {
  if (!videoManager.value) return [];
  return videoManager.value.getAllVideos() || [];
});

// Methods
function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleDrop(e) {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    processVideoFile(files[0]);
  }
}

function handleVideoUpload(e) {
  const file = e.target.files?.[0];
  if (file) {
    processVideoFile(file);
  }
  // Reset input
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function processVideoFile(file) {
  // Validate file type
  const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  if (!validTypes.includes(file.type)) {
    console.error('Ungültiger Video-Typ:', file.type);
    return;
  }

  const url = URL.createObjectURL(file);

  // Create video element to get metadata
  const video = document.createElement('video');
  video.src = url;
  video.crossOrigin = 'anonymous';
  video.preload = 'metadata';

  video.onloadedmetadata = () => {
    const videoData = {
      id: Date.now() + Math.random(),
      name: file.name.replace(/\.[^/.]+$/, ''),
      src: url,
      file: file,
      videoElement: video,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight
    };

    videoGallery.value.push(videoData);
    selectedVideoIndex.value = videoGallery.value.length - 1;

    console.log('✅ Video geladen:', videoData.name, `${videoData.width}x${videoData.height}`, `${videoData.duration.toFixed(1)}s`);
  };

  video.onerror = () => {
    console.error('❌ Fehler beim Laden des Videos:', file.name);
    URL.revokeObjectURL(url);
  };

  video.load();
}

function generateThumbnail(event, index) {
  const video = event.target;
  // Seek to first frame for thumbnail
  video.currentTime = 0.1;
}

function selectVideo(index) {
  selectedVideoIndex.value = index;
}

function deleteVideo(index) {
  const video = videoGallery.value[index];
  if (video.src) {
    URL.revokeObjectURL(video.src);
  }
  videoGallery.value.splice(index, 1);

  if (selectedVideoIndex.value === index) {
    selectedVideoIndex.value = videoGallery.value.length > 0 ? 0 : null;
  } else if (selectedVideoIndex.value > index) {
    selectedVideoIndex.value--;
  }
}

function clearAllVideos() {
  videoGallery.value.forEach(video => {
    if (video.src) {
      URL.revokeObjectURL(video.src);
    }
  });
  videoGallery.value = [];
  selectedVideoIndex.value = null;
}

function formatDuration(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function addVideoToCanvas() {
  addVideoDirectly();
}

function addVideoDirectly() {
  if (selectedVideoIndex.value === null) return;

  const videoData = videoGallery.value[selectedVideoIndex.value];
  if (!videoData || !videoData.videoElement) return;

  const vm = videoManager.value;
  if (!vm) {
    console.error('VideoManager nicht verfügbar');
    return;
  }

  // Create a new video element for canvas (don't reuse the gallery one)
  const canvasVideo = document.createElement('video');
  canvasVideo.src = videoData.src;
  canvasVideo.crossOrigin = 'anonymous';
  canvasVideo.preload = 'auto';
  canvasVideo.muted = videoMuted.value;
  canvasVideo.loop = videoLoop.value;

  canvasVideo.onloadeddata = () => {
    // Calculate size based on scale
    const baseWidth = 1 / 3; // 1/3 of canvas width
    const scaledWidth = baseWidth * (videoScale.value / 3);

    const options = {
      relWidth: scaledWidth,
      loop: videoLoop.value,
      muted: videoMuted.value,
      animation: selectedAnimation.value,
      animationDuration: animationDuration.value
    };

    vm.addVideo(canvasVideo, options);

    // Auto-play if not muted
    if (!videoMuted.value) {
      canvasVideo.play().catch(() => {});
    }

    console.log('✅ Video auf Canvas platziert');
  };

  canvasVideo.onerror = () => {
    console.error('❌ Fehler beim Laden des Videos für Canvas');
  };

  canvasVideo.load();
}

function isVideoActive(video) {
  const cm = canvasManager.value;
  if (!cm) return false;
  return cm.activeObject && cm.activeObject.id === video.id;
}

function selectCanvasVideo(video) {
  const cm = canvasManager.value;
  if (cm) {
    cm.setActiveObject(video);
  }
}

function togglePlayVideo(video) {
  const vm = videoManager.value;
  if (!vm) return;

  if (video.isPlaying) {
    vm.pauseVideo(video.id);
  } else {
    vm.playVideo(video.id);
  }
}

function removeCanvasVideo(video) {
  const vm = videoManager.value;
  if (vm) {
    vm.removeVideo(video.id);
  }
}

function playAllVideos() {
  const vm = videoManager.value;
  if (vm) {
    vm.playAll();
  }
}

function pauseAllVideos() {
  const vm = videoManager.value;
  if (vm) {
    vm.pauseAll();
  }
}

onMounted(() => {
  console.log('✅ VideoPanel mounted');
});
</script>

<style scoped>
.video-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
}

.upload-section h4,
.canvas-videos-section h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #9EBEC1);
}

.upload-area {
  border: 2px dashed rgba(139, 92, 246, 0.4);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(139, 92, 246, 0.05);
}

.upload-area:hover {
  border-color: rgba(139, 92, 246, 0.7);
  background: rgba(139, 92, 246, 0.1);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  width: 40px;
  height: 40px;
  color: rgba(139, 92, 246, 0.7);
}

.upload-icon svg {
  width: 100%;
  height: 100%;
}

.upload-placeholder p {
  margin: 0;
  font-size: 13px;
  color: var(--text, #E9E9EB);
}

.upload-placeholder small {
  font-size: 11px;
  color: var(--text-secondary, #9EBEC1);
}

/* Gallery */
.gallery-container {
  margin-top: 12px;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.gallery-title {
  font-size: 12px;
  color: var(--text-secondary, #9EBEC1);
}

.btn-clear-all {
  font-size: 11px;
  color: #ff6b6b;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
}

.btn-clear-all:hover {
  text-decoration: underline;
}

.gallery-scroll {
  max-height: 200px;
  overflow-y: auto;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.thumbnail-item {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.thumbnail-item:hover {
  border-color: rgba(139, 92, 246, 0.5);
}

.thumbnail-item.selected {
  border-color: rgba(139, 92, 246, 0.9);
}

.video-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  pointer-events: none;
}

.video-play-icon svg {
  width: 12px;
  height: 12px;
  margin-left: 2px;
}

.thumbnail-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.thumbnail-item:hover .thumbnail-overlay {
  opacity: 1;
}

.btn-delete-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 69, 58, 0.9);
  border: none;
  color: white;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.thumbnail-name {
  font-size: 10px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumbnail-duration {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.7);
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-primary {
  flex: 1;
  padding: 10px 16px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

/* Placement Section */
.placement-section {
  margin-top: 12px;
  padding: 12px;
  background: rgba(139, 92, 246, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.placement-header {
  font-size: 12px;
  font-weight: 500;
  color: var(--text, #E9E9EB);
  margin-bottom: 10px;
}

.placement-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.placement-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.placement-label {
  font-size: 11px;
  color: var(--text-secondary, #9EBEC1);
  min-width: 50px;
}

.placement-select {
  flex: 1;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--text, #E9E9EB);
  font-size: 11px;
}

.placement-slider-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.placement-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(139, 92, 246, 0.3);
  border-radius: 2px;
  outline: none;
}

.placement-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #8b5cf6;
  border-radius: 50%;
  cursor: pointer;
}

.placement-value {
  font-size: 11px;
  color: var(--text-secondary, #9EBEC1);
  min-width: 35px;
  text-align: right;
}

.placement-checkboxes {
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text, #E9E9EB);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  accent-color: #8b5cf6;
}

.placement-buttons {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-placement {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-place {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
}

.btn-place:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
}

/* Canvas Videos Section */
.canvas-videos-section {
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.canvas-videos-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.canvas-video-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.canvas-video-item:hover {
  background: rgba(139, 92, 246, 0.15);
}

.canvas-video-item.active {
  border-color: rgba(139, 92, 246, 0.6);
  background: rgba(139, 92, 246, 0.2);
}

.video-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-index {
  width: 20px;
  height: 20px;
  background: rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
}

.video-name {
  font-size: 12px;
  color: var(--text, #E9E9EB);
}

.video-status {
  font-size: 10px;
  color: var(--text-secondary, #9EBEC1);
}

.video-status.playing {
  color: #4ade80;
}

.video-controls {
  display: flex;
  gap: 4px;
}

.btn-control {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text, #E9E9EB);
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

.global-video-controls {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-global {
  flex: 1;
  padding: 8px 12px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  color: var(--text, #E9E9EB);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-global:hover {
  background: rgba(139, 92, 246, 0.3);
}
</style>
