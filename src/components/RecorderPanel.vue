<template>
  <div class="recorder-panel">
    <div class="panel-header">
      <h3>Recorder</h3>
      <HelpTooltip
        title="Video aufnehmen"
        icon="🎬"
        text="Nehmen Sie Ihre Visualisierung als Video auf. Workflow: Prepare → Start → Stop. Das Video wird im WebM-Format erstellt."
        tip="Wählen Sie 'High' Qualität für die meisten Anwendungen."
        position="left"
        :large="true"
      />
    </div>

    <!-- Status Anzeige -->
    <div 
      class="status-indicator" 
      :class="statusClass"
    >
      <div class="status-dot"></div>
      <span class="status-text">{{ statusText }}</span>
    </div>

    <!-- Haupt-Kontrollen -->
    <div class="recorder-controls">
      <!-- Prepare Button -->
      <button
        v-if="!recorderStore.isPrepared && !recorderStore.isRecording"
        class="btn btn-prepare"
        @click="handlePrepare"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12h8M12 8v8"/>
        </svg>
        Prepare
      </button>

      <!-- Start Button -->
      <button
        v-if="recorderStore.isPrepared && !recorderStore.isRecording"
        class="btn btn-start"
        @click="handleStart"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"/>
        </svg>
        Start
      </button>

      <!-- Pause/Resume Button -->
      <button
        v-if="recorderStore.isRecording && !recorderStore.isPaused"
        class="btn btn-pause"
        @click="handlePause"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
        Pause
      </button>

      <button
        v-if="recorderStore.isRecording && recorderStore.isPaused"
        class="btn btn-resume"
        @click="handleResume"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        Resume
      </button>

      <!-- Stop Button -->
      <button
        v-if="recorderStore.isRecording"
        class="btn btn-stop"
        @click="handleStop"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
        Stop
      </button>

      <!-- Reset Button -->
      <button
        v-if="recorderStore.isPrepared && !recorderStore.isRecording"
        class="btn btn-reset"
        @click="handleReset"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        Reset
      </button>
    </div>

    <!-- Qualitäts-Einstellungen -->
    <div class="control-section" v-if="!recorderStore.isRecording">
      <span class="section-label">Video Quality</span>
      <div class="quality-buttons">
        <button
          v-for="quality in qualityPresets"
          :key="quality.value"
          class="quality-btn"
          :class="{ active: selectedQuality === quality.value }"
          @click="selectQuality(quality.value)"
          :disabled="recorderStore.isRecording"
        >
          {{ quality.label }}
        </button>
      </div>
    </div>

    <!-- Upload Modus -->
    <div class="control-section" v-if="!recorderStore.isRecording">
      <span class="section-label">Upload Mode</span>
      <div class="upload-buttons">
        <button
          class="upload-btn"
          :class="{ active: uploadMode === 'auto' }"
          @click="selectUploadMode('auto')"
          :disabled="recorderStore.isRecording"
        >
          Auto
        </button>
        <button
          class="upload-btn"
          :class="{ active: uploadMode === 'server' }"
          @click="selectUploadMode('server')"
          :disabled="recorderStore.isRecording"
        >
          Server
        </button>
        <button
          class="upload-btn"
          :class="{ active: uploadMode === 'direct' }"
          @click="selectUploadMode('direct')"
          :disabled="recorderStore.isRecording"
        >
          Direct
        </button>
      </div>
    </div>

    <!-- FFmpeg Server Conversion -->
    <div class="control-section" v-if="!recorderStore.isRecording">
      <div class="section-header">
        <span class="section-label">MP4 Konvertierung</span>
        <span
          class="server-status"
          :class="{ available: serverAvailable, unavailable: serverAvailable === false }"
          :title="serverAvailable ? 'FFmpeg Server verfügbar' : 'FFmpeg Server nicht erreichbar'"
        >
          {{ serverAvailable ? '●' : '○' }}
        </span>
      </div>

      <label class="toggle-row">
        <input
          type="checkbox"
          v-model="enableServerConversion"
          :disabled="!serverAvailable || recorderStore.isRecording"
        >
        <span class="toggle-label">Auto-Konvertierung nach Aufnahme</span>
      </label>

      <div class="quality-buttons conversion-quality" v-if="enableServerConversion && serverAvailable">
        <button
          v-for="preset in conversionPresets"
          :key="preset.value"
          class="quality-btn"
          :class="{ active: conversionQuality === preset.value }"
          @click="conversionQuality = preset.value"
          :title="preset.desc"
          :disabled="recorderStore.isRecording"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <!-- Conversion Progress -->
    <div class="conversion-progress" v-if="isConverting || conversionStatus === 'completed'">
      <div class="progress-header">
        <span class="progress-label">
          {{ conversionStatus === 'uploading' ? 'Uploading...' :
             conversionStatus === 'converting' ? 'Konvertiere zu MP4...' :
             conversionStatus === 'completed' ? 'MP4 bereit!' :
             conversionStatus === 'error' ? 'Fehler!' : '' }}
        </span>
        <span class="progress-percent">{{ conversionProgress }}%</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :class="{ completed: conversionStatus === 'completed', error: conversionStatus === 'error' }"
          :style="{ width: conversionProgress + '%' }"
        ></div>
      </div>

      <!-- MP4 Download Button -->
      <a
        v-if="convertedVideoUrl && conversionStatus === 'completed'"
        :href="convertedVideoUrl"
        :download="convertedFilename"
        class="mp4-download-btn"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        MP4 Download
      </a>
    </div>

    <!-- Manual Convert Button -->
    <button
      v-if="recorderStore.lastRecording && !isConverting && serverAvailable && conversionStatus !== 'completed'"
      class="btn btn-convert"
      @click="convertLastRecording"
      :disabled="isProcessing"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M23 4v6h-6"/>
        <path d="M1 20v-6h6"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
        <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
      </svg>
      Zu MP4 konvertieren
    </button>
  </div>

  <!-- Results Modal (Fullscreen Popup) -->
  <Teleport to="body">
    <div 
      id="results-panel" 
      class="results-modal"
      style="display: none;"
      @click.self="closeResults"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>🎬 Recording Preview</h2>
          <button @click="closeResults" class="modal-close-btn" title="Close (ESC)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="video-container">
            <video id="preview" controls class="preview-video"></video>
          </div>

          <div class="modal-actions">
            <a id="downloadLink" download class="download-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Video
            </a>
            <button @click="closeResults" class="cancel-btn">
              Close
            </button>
          </div>

          <div id="mimeInfo" class="file-info"></div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRecorderStore } from '../stores/recorderStore.js';
import HelpTooltip from './HelpTooltip.vue';
import { checkServerHealth, convertAndWait, getFileUrl } from '../lib/videoApi.js';

const recorderStore = useRecorderStore();

// Lokaler State
const selectedQuality = ref(8_000_000);
const uploadMode = ref('auto');
const isProcessing = ref(false);

// Server Conversion State
const serverAvailable = ref(null); // null = unknown, true/false
const enableServerConversion = ref(true); // FFmpeg Konvertierung aktiviert
const conversionQuality = ref('social'); // FFmpeg Preset
const isConverting = ref(false);
const conversionProgress = ref(0);
const conversionStatus = ref(''); // 'uploading', 'converting', 'completed', 'error'
const convertedVideoUrl = ref(null);
const convertedFilename = ref(null);

// Quality Presets - ✅ Erweitert für 4K+ und Audio-Reaktiv
const qualityPresets = [
  { value: 2_000_000, label: 'Low' },
  { value: 5_000_000, label: 'Med' },
  { value: 8_000_000, label: 'High' },
  { value: 15_000_000, label: 'V.High' },
  { value: 25_000_000, label: 'Ultra' },
  { value: 40_000_000, label: '4K' },
  { value: 60_000_000, label: '4K+' },
  { value: 80_000_000, label: 'Max' }
];

// FFmpeg Conversion Presets
const conversionPresets = [
  { value: 'preview', label: 'Preview', desc: 'Schnell, niedrige Qualität' },
  { value: 'medium', label: 'Medium', desc: 'Gute Balance' },
  { value: 'social', label: 'Social', desc: 'Optimiert für Social Media' },
  { value: 'high', label: 'High', desc: 'Hohe Qualität' },
  { value: 'highest', label: 'Highest', desc: 'Maximale Qualität' }
];

// Computed
const statusClass = computed(() => {
  const baseClass = 'status-indicator';
  if (recorderStore.statusType === 'processing') return `${baseClass} processing`;
  if (recorderStore.isPaused) return `${baseClass} paused`;
  if (recorderStore.isRecording) return `${baseClass} recording`;
  if (recorderStore.isPrepared) return `${baseClass} ready`;
  return `${baseClass} idle`;
});

const statusText = computed(() => {
  if (recorderStore.statusType === 'processing') return '🎬 Processing...';
  if (recorderStore.isPaused) return 'PAUSED';
  if (recorderStore.isRecording) return 'RECORDING';
  if (recorderStore.isPrepared) return 'READY';
  return 'IDLE';
});

// Quality Selection
function selectQuality(value) {
  selectedQuality.value = value;
  recorderStore.setRecordingQuality(value);
  console.log('✅ [Panel] Quality changed to:', (value / 1_000_000).toFixed(1), 'Mbps');
}

// Upload Mode Selection
function selectUploadMode(mode) {
  uploadMode.value = mode;
  recorderStore.setUploadMode(mode);
  console.log('✅ [Panel] Upload mode changed to:', mode);
}

// Event Handlers
async function handlePrepare() {
  if (isProcessing.value) return;
  
  try {
    isProcessing.value = true;
    const success = await recorderStore.prepareRecording({
      quality: selectedQuality.value
    });
    
    if (success) {
      console.log('✅ [Panel] Preparation successful');
    } else {
      console.error('❌ [Panel] Preparation failed');
    }
  } catch (error) {
    console.error('❌ [Panel] Prepare error:', error);
  } finally {
    isProcessing.value = false;
  }
}

async function handleStart() {
  if (isProcessing.value) return;
  
  try {
    isProcessing.value = true;
    const success = await recorderStore.startRecording();
    
    if (success) {
      console.log('✅ [Panel] Recording started');
    } else {
      console.error('❌ [Panel] Start failed');
    }
  } catch (error) {
    console.error('❌ [Panel] Start error:', error);
  } finally {
    isProcessing.value = false;
  }
}

function handlePause() {
  if (isProcessing.value) return;
  
  try {
    isProcessing.value = true;
    const success = recorderStore.pauseRecording();
    
    if (success) {
      console.log('✅ [Panel] Recording paused (video frozen, audio continues)');
    } else {
      console.error('❌ [Panel] Pause failed');
    }
  } catch (error) {
    console.error('❌ [Panel] Pause error:', error);
  } finally {
    isProcessing.value = false;
  }
}

function handleResume() {
  if (isProcessing.value) return;
  
  try {
    isProcessing.value = true;
    const success = recorderStore.resumeRecording();
    
    if (success) {
      console.log('✅ [Panel] Recording resumed (video synchronized)');
    } else {
      console.error('❌ [Panel] Resume failed');
    }
  } catch (error) {
    console.error('❌ [Panel] Resume error:', error);
  } finally {
    isProcessing.value = false;
  }
}

async function handleStop() {
  if (isProcessing.value) return;

  try {
    isProcessing.value = true;
    const blob = await recorderStore.stopRecording();

    if (blob) {
      const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
      console.log('✅ [Panel] Recording stopped:', sizeMB, 'MB');

      // Server-Konvertierung starten wenn aktiviert
      if (enableServerConversion.value && serverAvailable.value) {
        await startServerConversion(blob);
      }
    } else {
      console.warn('⚠️ [Panel] Recording stopped but no blob received');
    }
  } catch (error) {
    console.error('❌ [Panel] Stop error:', error);
  } finally {
    isProcessing.value = false;
  }
}

/**
 * Startet die Server-seitige FFmpeg Konvertierung
 */
async function startServerConversion(blob) {
  if (!blob || isConverting.value) return;

  console.log('🎬 [Panel] Starte Server-Konvertierung...');
  isConverting.value = true;
  conversionProgress.value = 0;
  conversionStatus.value = 'uploading';
  convertedVideoUrl.value = null;
  convertedFilename.value = null;

  try {
    const result = await convertAndWait(blob, {
      quality: conversionQuality.value,
      onProgress: (progress) => {
        conversionProgress.value = progress;
      },
      onStatusChange: (status) => {
        conversionStatus.value = status;
        console.log('📊 [Panel] Conversion status:', status);
      }
    });

    if (result.success) {
      convertedVideoUrl.value = result.fileUrl;
      convertedFilename.value = result.filename;
      conversionStatus.value = 'completed';
      console.log('✅ [Panel] Konvertierung abgeschlossen:', result.filename);
    }
  } catch (error) {
    console.error('❌ [Panel] Konvertierung fehlgeschlagen:', error);
    conversionStatus.value = 'error';
  } finally {
    isConverting.value = false;
  }
}

/**
 * Manuelle Konvertierung starten (für bereits aufgenommene Videos)
 */
async function convertLastRecording() {
  if (!recorderStore.lastRecording?.blob) {
    console.warn('⚠️ [Panel] Keine Aufnahme zum Konvertieren');
    return;
  }

  await startServerConversion(recorderStore.lastRecording.blob);
}

function handleReset() {
  if (isProcessing.value) return;
  
  try {
    isProcessing.value = true;
    recorderStore.resetRecorder();
    console.log('✅ [Panel] Recorder reset');
  } catch (error) {
    console.error('❌ [Panel] Reset error:', error);
  } finally {
    isProcessing.value = false;
  }
}

function closeResults() {
  const modal = document.getElementById('results-panel');
  if (modal) {
    modal.style.display = 'none';
    const video = document.getElementById('preview');
    if (video) {
      video.pause();
      video.src = '';
    }
  }
}

// Keyboard Shortcuts
function handleKeydown(e) {
  if (e.key === 'Escape') {
    closeResults();
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown);

  // Server-Verfügbarkeit prüfen
  try {
    const health = await checkServerHealth();
    serverAvailable.value = health.available;
    if (health.available) {
      console.log('✅ [Panel] FFmpeg Backend verfügbar');
    } else {
      console.warn('⚠️ [Panel] FFmpeg Backend nicht erreichbar:', health.error);
    }
  } catch (error) {
    serverAvailable.value = false;
    console.error('❌ [Panel] Server Health Check fehlgeschlagen:', error);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.recorder-panel {
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  color: #e0e0e0;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Status Indicator */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #666;
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #888;
}

.status-indicator.idle .status-dot {
  background: #666;
  animation: none;
}

.status-indicator.processing {
  background-color: rgba(255, 193, 7, 0.15);
  border-color: rgba(255, 193, 7, 0.4);
}

.status-indicator.processing .status-dot {
  background-color: #FFC107;
  animation: processingPulse 1.5s ease-in-out infinite;
}

@keyframes processingPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.1); }
}

.status-indicator.ready {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
}

.status-indicator.ready .status-dot {
  background: #4CAF50;
}

.status-indicator.ready .status-text {
  color: #4CAF50;
}

.status-indicator.recording {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.3);
}

.status-indicator.recording .status-dot {
  background: #F44336;
}

.status-indicator.recording .status-text {
  color: #F44336;
}

.status-indicator.paused {
  background: rgba(255, 152, 0, 0.1);
  border-color: rgba(255, 152, 0, 0.3);
}

.status-indicator.paused .status-dot {
  background: #FF9800;
  animation: none;
}

.status-indicator.paused .status-text {
  color: #FF9800;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

/* Recorder Controls */
.recorder-controls {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn {
  flex: 1;
  min-width: 80px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn .icon {
  width: 14px;
  height: 14px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-prepare {
  background: rgba(110, 168, 254, 0.2);
  color: #6ea8fe;
  border: 1px solid rgba(110, 168, 254, 0.3);
}

.btn-prepare:hover:not(:disabled) {
  background: rgba(110, 168, 254, 0.3);
  transform: translateY(-1px);
}

.btn-start {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.btn-start:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.3);
  transform: translateY(-1px);
}

.btn-pause {
  background: rgba(255, 152, 0, 0.2);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.btn-pause:hover:not(:disabled) {
  background: rgba(255, 152, 0, 0.3);
  transform: translateY(-1px);
}

.btn-resume {
  background: rgba(33, 150, 243, 0.2);
  color: #2196F3;
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.btn-resume:hover:not(:disabled) {
  background: rgba(33, 150, 243, 0.3);
  transform: translateY(-1px);
}

.btn-stop {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.btn-stop:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.3);
  transform: translateY(-1px);
}

.btn-reset {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
  border: 1px solid rgba(158, 158, 158, 0.3);
}

.btn-reset:hover:not(:disabled) {
  background: rgba(158, 158, 158, 0.3);
  transform: translateY(-1px);
}

/* Control Section (Quality & Upload Mode) */
.control-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 11px;
  color: #888;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Quality Buttons - ✅ Angepasst für 8 Presets (4K+ Audio-Reaktiv) */
.quality-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.quality-btn {
  background-color: #3a3a3a;
  color: #c0c0c0;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.quality-btn:hover:not(:disabled) {
  background-color: #454545;
  border-color: #666;
  transform: translateY(-1px);
}

.quality-btn.active {
  background-color: #6ea8fe;
  color: #fff;
  border-color: #6ea8fe;
  font-weight: 600;
}

.quality-btn.active:hover {
  background-color: #5a96e8;
}

.quality-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Upload Buttons */
.upload-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.upload-btn {
  background-color: #3a3a3a;
  color: #c0c0c0;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.upload-btn:hover:not(:disabled) {
  background-color: #454545;
  border-color: #666;
  transform: translateY(-1px);
}

.upload-btn.active {
  background-color: #6ea8fe;
  color: #fff;
  border-color: #6ea8fe;
  font-weight: 600;
}

.upload-btn.active:hover {
  background-color: #5a96e8;
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Server Conversion Section */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.server-status {
  font-size: 12px;
  transition: color 0.3s ease;
}

.server-status.available {
  color: #4CAF50;
}

.server-status.unavailable {
  color: #666;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;
}

.toggle-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #6ea8fe;
  cursor: pointer;
}

.toggle-row input[type="checkbox"]:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.toggle-label {
  font-size: 11px;
  color: #c0c0c0;
}

.conversion-quality {
  grid-template-columns: repeat(5, 1fr);
}

/* Conversion Progress */
.conversion-progress {
  background: rgba(110, 168, 254, 0.1);
  border: 1px solid rgba(110, 168, 254, 0.3);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  font-size: 11px;
  font-weight: 500;
  color: #6ea8fe;
}

.progress-percent {
  font-size: 11px;
  font-weight: 600;
  color: #6ea8fe;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6ea8fe, #4FC3F7);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill.completed {
  background: linear-gradient(90deg, #4CAF50, #66BB6A);
}

.progress-fill.error {
  background: linear-gradient(90deg, #F44336, #E57373);
}

.mp4-download-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.mp4-download-btn svg {
  width: 14px;
  height: 14px;
}

.mp4-download-btn:hover {
  background: linear-gradient(135deg, #45a049 0%, #4CAF50 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

/* Convert Button */
.btn-convert {
  background: rgba(156, 39, 176, 0.2);
  color: #CE93D8;
  border: 1px solid rgba(156, 39, 176, 0.3);
  width: 100%;
}

.btn-convert:hover:not(:disabled) {
  background: rgba(156, 39, 176, 0.3);
  transform: translateY(-1px);
}

/* Responsive */
@media (max-width: 768px) {
  .recorder-controls {
    flex-direction: column;
  }

  .btn {
    min-width: auto;
  }

  .quality-buttons {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 500px) {
  .quality-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

<style>
/* Results Modal - Global styles (nicht scoped, damit Teleport funktioniert) */
.results-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
  margin: 0;
  overflow: auto;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 800px;
  max-height: 85vh;
  width: 90%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideIn 0.3s ease;
  margin: auto;
  position: relative;
}

@keyframes slideIn {
  from {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: inherit;
}

.modal-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.modal-close-btn svg {
  width: 18px;
  height: 18px;
}

.modal-close-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
  transform: rotate(90deg);
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.video-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.preview-video {
  width: 100%;
  height: auto;
  max-height: 40vh;
  display: block;
  object-fit: contain;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
  border: none;
  cursor: pointer;
}

.download-btn svg {
  width: 18px;
  height: 18px;
}

.download-btn:hover {
  background: linear-gradient(135deg, #45a049 0%, #4CAF50 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

.download-btn:active {
  transform: translateY(0);
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;
  cursor: pointer;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.file-info {
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: inherit;
}

.file-info strong {
  color: #4FC3F7;
  font-weight: 600;
}

/* Responsive Modal */
@media (max-width: 768px) {
  .modal-content {
    max-width: 95%;
    max-height: 90vh;
    width: 95%;
    margin: auto;
  }

  .modal-header {
    padding: 16px 20px;
  }

  .modal-header h2 {
    font-size: 16px;
  }

  .modal-body {
    padding: 16px 20px;
    gap: 16px;
  }

  .preview-video {
    max-height: 35vh;
  }

  .modal-actions {
    flex-direction: column;
    gap: 10px;
  }

  .download-btn,
  .cancel-btn {
    width: 100%;
    justify-content: center;
    font-size: 14px;
  }
}

@media (min-width: 769px) {
  .modal-content {
    margin: auto;
  }
}
</style>
