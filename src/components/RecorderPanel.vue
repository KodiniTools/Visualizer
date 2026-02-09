<template>
  <div class="recorder-panel">
    <div class="panel-header">
      <h3>{{ t('recorder.title') }}</h3>
      <HelpTooltip
        :title="t('recorder.helpTitle')"
        icon="🎬"
        :text="t('recorder.helpText')"
        :tip="t('recorder.helpTip')"
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
      <!-- Recording Timer -->
      <span
        v-if="recorderStore.isRecording"
        class="recording-timer"
        :class="{ paused: recorderStore.isPaused }"
      >
        {{ recordingDisplayTime }}
      </span>
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
        {{ t('recorder.prepare') }}
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
        {{ t('recorder.start') }}
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
        {{ t('recorder.pause') }}
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
        {{ t('recorder.resume') }}
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
        {{ t('recorder.stop') }}
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
        {{ t('recorder.reset') }}
      </button>
    </div>

    <!-- ✨ NEU: Mikrofon zuschalten während Aufnahme -->
    <div class="control-section audio-source-section" v-if="recorderStore.isRecording">
      <div class="section-header">
        <span class="section-label">{{ t('recorder.audioSource') || 'Audio' }}</span>
        <span class="source-indicator active">
          🎵 Player {{ microphoneEnabled ? '+ 🎤 Mic' : '' }}
        </span>
      </div>
      <label class="mic-toggle-row">
        <input
          type="checkbox"
          v-model="microphoneEnabled"
          @change="toggleMicrophone"
          :disabled="isSwitchingSource"
        >
        <span class="toggle-label">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          Mikrofon zuschalten
        </span>
      </label>
      <p class="source-hint" v-if="isSwitchingSource">Aktiviere Mikrofon...</p>
      <p class="source-hint info" v-else-if="microphoneEnabled">
        💡 Nur Mic? Player pausieren oder stumm schalten
      </p>
    </div>

    <!-- Qualitäts-Einstellungen -->
    <div class="control-section" v-if="!recorderStore.isRecording">
      <span class="section-label">{{ t('recorder.videoQuality') }}</span>
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
      <span class="section-label">{{ t('recorder.uploadMode') }}</span>
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
        <span class="section-label">{{ t('recorder.mp4Conversion') }}</span>
        <span
          class="server-status"
          :class="{ available: serverAvailable, unavailable: serverAvailable === false }"
          :title="serverAvailable ? t('recorder.serverAvailable') : t('recorder.serverUnavailable')"
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
        <span class="toggle-label">{{ t('recorder.autoConvert') }}</span>
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
    <div class="conversion-progress" v-if="isConverting || conversionStatus === 'completed' || conversionStatus === 'error'">
      <div class="progress-header">
        <span class="progress-label">
          {{ conversionStatus === 'uploading' ? t('recorder.uploading') :
             conversionStatus === 'converting' ? t('recorder.converting') :
             conversionStatus === 'completed' ? t('recorder.completed') :
             conversionStatus === 'error' ? t('recorder.conversionError') : t('recorder.processing') }}
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
      <div v-if="convertedVideoUrl && conversionStatus === 'completed'" class="download-actions">
        <a
          :href="convertedVideoUrl"
          :download="convertedFilename"
          class="mp4-download-btn"
          @click="handleDownloadClick"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {{ t('recorder.downloadMp4') }}
        </a>
        <button class="btn btn-close-conversion" @click="dismissConversion(true)" :title="t('recorder.closeAndDelete')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Error Actions -->
      <div v-if="conversionStatus === 'error'" class="error-actions">
        <span class="error-message">{{ conversionError || t('recorder.unknownError') }}</span>
        <button class="btn btn-retry" @click="retryConversion">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
          </svg>
          {{ t('recorder.retry') }}
        </button>
        <button class="btn btn-dismiss" @click="dismissConversion">
          {{ t('common.close') }}
        </button>
      </div>
    </div>

    <!-- Manual Convert Button - nur wenn Auto-Konvertierung DEAKTIVIERT ist -->
    <button
      v-if="recorderStore.lastRecording && !isConverting && serverAvailable && !enableServerConversion && conversionStatus !== 'completed'"
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
      {{ t('recorder.convertToMp4') }}
    </button>
  </div>

  <!-- Conversion Overlay (Fullscreen) -->
  <Teleport to="body">
    <div
      v-if="isConverting"
      class="conversion-overlay"
    >
      <div class="conversion-modal">
        <div class="conversion-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
          </svg>
        </div>
        <h2 class="conversion-title">{{ t('recorder.convertingVideo') || 'Dein Video wird konvertiert' }}</h2>
        <p class="conversion-subtitle">
          {{ conversionStatus === 'uploading' ? (t('recorder.uploadingToServer') || 'Video wird hochgeladen...') :
             (t('recorder.processingOnServer') || 'Server verarbeitet dein Video...') }}
        </p>
        <div class="conversion-progress-bar">
          <div class="conversion-progress-fill" :style="{ width: conversionProgress + '%' }"></div>
        </div>
        <span class="conversion-percent">{{ conversionProgress }}%</span>
        <p class="conversion-hint">{{ t('recorder.dontCloseWindow') || 'Bitte das Fenster nicht schließen' }}</p>
      </div>
    </div>
  </Teleport>

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
          <h2>{{ t('recorder.recordingPreview') }}</h2>
          <button @click="closeResults" class="modal-close-btn" :title="t('common.close') + ' (ESC)'">
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
              {{ t('recorder.downloadVideo') }}
            </a>
            <button @click="closeResults" class="cancel-btn">
              {{ t('common.close') }}
            </button>
          </div>

          <div id="mimeInfo" class="file-info"></div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from '../lib/i18n.js';
import { useRecorderStore } from '../stores/recorderStore.js';
import HelpTooltip from './HelpTooltip.vue';
import { checkServerHealth, convertAndWait, getFileUrl, getDownloadUrl, cleanupFile } from '../lib/videoApi.js';

const { t } = useI18n();
const recorderStore = useRecorderStore();

// Lokaler State
const selectedQuality = ref(8_000_000);
const uploadMode = ref('auto');
const isProcessing = ref(false);

// Recording Timer State
const recordingStartTime = ref(null);
const recordingElapsedAtPause = ref(0);
const recordingDisplayTime = ref('00:00');
let timerInterval = null;

// ✨ NEU: Mikrofon zuschalten (Player + Mic gleichzeitig)
const microphoneEnabled = ref(false);
const isSwitchingSource = ref(false);

// ✅ FIX: Mikrofon-Status zurücksetzen wenn Aufnahme endet
watch(() => recorderStore.isRecording, (isRecording) => {
  if (!isRecording) {
    // Aufnahme beendet - Reset Mikrofon-Status
    microphoneEnabled.value = false;
    console.log('[Panel] Aufnahme beendet - Mikrofon-Status zurückgesetzt');
  }
});

// Server Conversion State
const serverAvailable = ref(null); // null = unknown, true/false
const enableServerConversion = ref(true); // FFmpeg Konvertierung aktiviert
const conversionQuality = ref('social'); // FFmpeg Preset
const isConverting = ref(false);
const conversionProgress = ref(0);
const conversionStatus = ref(''); // 'uploading', 'converting', 'completed', 'error'
const conversionError = ref(null);
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

// Timer Functions
function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
  recordingStartTime.value = Date.now();
  recordingElapsedAtPause.value = 0;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    updateTimerDisplay();
  }, 100); // Update every 100ms for smooth display
}

function updateTimerDisplay() {
  if (!recordingStartTime.value) {
    recordingDisplayTime.value = '00:00';
    return;
  }

  const elapsed = (Date.now() - recordingStartTime.value) / 1000 + recordingElapsedAtPause.value;
  recordingDisplayTime.value = formatTime(elapsed);
}

function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Save elapsed time
  if (recordingStartTime.value) {
    recordingElapsedAtPause.value += (Date.now() - recordingStartTime.value) / 1000;
    recordingStartTime.value = null;
  }
}

function resumeTimer() {
  recordingStartTime.value = Date.now();

  timerInterval = setInterval(() => {
    updateTimerDisplay();
  }, 100);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  recordingStartTime.value = null;
  recordingElapsedAtPause.value = 0;
  recordingDisplayTime.value = '00:00';
}

// ✨ NEU: Mikrofon zuschalten (additiv zum Player)
async function toggleMicrophone() {
  isSwitchingSource.value = true;
  try {
    if (window.toggleRecordingMicrophone) {
      const success = await window.toggleRecordingMicrophone(microphoneEnabled.value);
      if (success) {
        console.log('✅ [Panel] Mikrofon', microphoneEnabled.value ? 'ZUGESCHALTET' : 'ABGESCHALTET');
      } else {
        console.error('❌ [Panel] Mikrofon-Toggle fehlgeschlagen');
        microphoneEnabled.value = !microphoneEnabled.value; // Revert
      }
    } else {
      console.error('❌ [Panel] toggleRecordingMicrophone nicht verfügbar');
      microphoneEnabled.value = !microphoneEnabled.value; // Revert
    }
  } catch (error) {
    console.error('❌ [Panel] Fehler beim Mikrofon-Toggle:', error);
    microphoneEnabled.value = !microphoneEnabled.value; // Revert
  } finally {
    isSwitchingSource.value = false;
  }
}

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
      startTimer();
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
      pauseTimer();
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
      resumeTimer();
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
    stopTimer();
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
  conversionError.value = null;
  convertedVideoUrl.value = null;
  convertedFilename.value = null;

  try {
    const result = await convertAndWait(blob, {
      quality: conversionQuality.value,
      onProgress: (progress) => {
        conversionProgress.value = progress;
        console.log('📊 [Panel] Progress:', progress + '%');
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
      conversionProgress.value = 100;
      console.log('✅ [Panel] Konvertierung abgeschlossen:', result.filename);
    }
  } catch (error) {
    console.error('❌ [Panel] Konvertierung fehlgeschlagen:', error);
    conversionStatus.value = 'error';
    conversionError.value = error.message || 'Verbindung zum Server fehlgeschlagen';
  } finally {
    isConverting.value = false;
  }
}

/**
 * Retry failed conversion
 */
function retryConversion() {
  if (recorderStore.lastRecording?.blob) {
    startServerConversion(recorderStore.lastRecording.blob);
  }
}

/**
 * Dismiss conversion progress/error
 * Optionally cleanup server file
 */
async function dismissConversion(cleanup = false) {
  // Cleanup auf Server wenn gewünscht und Datei vorhanden
  if (cleanup && convertedFilename.value) {
    try {
      await cleanupFile(convertedFilename.value);
      console.log('🧹 [Panel] Server-Datei gelöscht:', convertedFilename.value);
    } catch (e) {
      console.warn('⚠️ [Panel] Cleanup fehlgeschlagen:', e);
    }
  }

  conversionStatus.value = '';
  conversionProgress.value = 0;
  conversionError.value = null;
  convertedVideoUrl.value = null;
  convertedFilename.value = null;
}

/**
 * Handle MP4 download click - cleanup after delay and hide UI
 */
function handleDownloadClick() {
  console.log('📥 [Panel] MP4 Download gestartet');

  // Nach Download: Warte kurz und lösche Server-Datei
  setTimeout(async () => {
    if (convertedFilename.value) {
      try {
        await cleanupFile(convertedFilename.value);
        console.log('🧹 [Panel] Server-Datei nach Download gelöscht');
      } catch (e) {
        console.warn('⚠️ [Panel] Auto-Cleanup fehlgeschlagen:', e);
      }
    }

    // UI komplett zurücksetzen - Panel verschwindet
    conversionStatus.value = '';
    conversionProgress.value = 0;
    conversionError.value = null;
    convertedVideoUrl.value = null;
    convertedFilename.value = null;

    console.log('✅ [Panel] Konvertierung abgeschlossen, UI zurückgesetzt');
  }, 2000); // 2 Sekunden Delay für Download-Start
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
  // Cleanup timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
});
</script>

<style scoped>
.recorder-panel {
  background-color: var(--card-bg, #142640);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.2));
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='1.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='12' r='3' fill='white'/%3E%3C/svg%3E");
  background-size: contain;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.8));
}

/* Status Indicator */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 5px;
  background: rgba(201, 152, 77, 0.05);
  border: 1px solid var(--border-color, rgba(201, 152, 77, 0.15));
  transition: all 0.3s ease;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted, #7A8DA0);
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--text-muted, #7A8DA0);
}

.recording-timer {
  font-size: 0.75rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #F44336;
  margin-left: auto;
  padding: 2px 8px;
  background: rgba(244, 67, 54, 0.15);
  border-radius: 4px;
  letter-spacing: 1px;
  min-width: 50px;
  text-align: center;
}

.recording-timer.paused {
  color: #FF9800;
  background: rgba(255, 152, 0, 0.15);
  animation: timerBlink 1s ease-in-out infinite;
}

@keyframes timerBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
  gap: 5px;
  flex-wrap: wrap;
}

.btn {
  flex: 1;
  min-width: 70px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.btn .icon {
  width: 12px;
  height: 12px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-prepare {
  background: rgba(201, 152, 77, 0.2);
  color: var(--accent-tertiary, #f8e1a9);
  border: 1px solid rgba(201, 152, 77, 0.3);
}

.btn-prepare:hover:not(:disabled) {
  background: rgba(201, 152, 77, 0.3);
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

/* ✨ NEU: Audio Source Section */
.audio-source-section {
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
  padding: 8px 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.source-indicator {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.source-indicator.active {
  background: rgba(76, 175, 80, 0.2);
}

.mic-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 10px;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.mic-toggle-row:hover {
  background: var(--btn-hover);
  border-color: rgba(139, 92, 246, 0.3);
}

.mic-toggle-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #8B5CF6;
  cursor: pointer;
}

.mic-toggle-row .toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-primary, #E9E9EB);
  font-weight: 500;
}

.mic-toggle-row .toggle-label .icon {
  width: 16px;
  height: 16px;
  color: #8B5CF6;
}

.source-hint {
  margin: 6px 0 0 0;
  font-size: 10px;
  color: rgba(139, 92, 246, 0.8);
  text-align: center;
  animation: pulse 1s ease-in-out infinite;
}

.source-hint.info {
  color: rgba(255, 193, 7, 0.9);
  animation: none;
  background: rgba(255, 193, 7, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}

/* Control Section (Quality & Upload Mode) */
.control-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 11px;
  color: var(--text-muted);
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
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
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
  background-color: var(--btn-hover);
  border-color: var(--border-color);
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
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
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
  background-color: var(--btn-hover);
  border-color: var(--border-color);
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
  color: var(--text-muted);
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
  color: var(--text-primary);
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
  background: var(--secondary-bg);
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

/* Download Actions Container */
.download-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.download-actions .mp4-download-btn {
  flex: 1;
}

.btn-close-conversion {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
  border: 1px solid rgba(158, 158, 158, 0.3);
  padding: 8px;
  min-width: auto;
  flex: none;
}

.btn-close-conversion:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.2);
  color: #F44336;
  border-color: rgba(244, 67, 54, 0.3);
}

/* Error Actions */
.error-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.error-message {
  font-size: 11px;
  color: #F44336;
  text-align: center;
  padding: 4px 8px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  max-width: 100%;
  word-break: break-word;
}

.btn-retry {
  background: rgba(255, 152, 0, 0.2);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
  width: 100%;
}

.btn-retry:hover:not(:disabled) {
  background: rgba(255, 152, 0, 0.3);
  transform: translateY(-1px);
}

.btn-dismiss {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
  border: 1px solid rgba(158, 158, 158, 0.3);
  width: 100%;
  font-size: 10px;
  padding: 6px 10px;
}

.btn-dismiss:hover:not(:disabled) {
  background: rgba(158, 158, 158, 0.3);
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

/* ═══ Light Theme Overrides ═══ */

/* Panel container: dark bg → white card */
[data-theme='light'] .recorder-panel {
  background-color: #FFFFFF;
  border-color: rgba(1, 79, 153, 0.15);
}

/* Heading text: light → dark blue */
[data-theme='light'] h3 {
  color: #003971;
}

/* Heading icon: white strokes → dark blue strokes */
[data-theme='light'] h3::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23003971' stroke-width='1.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='12' r='3' fill='%23003971'/%3E%3C/svg%3E");
  filter: none;
}

/* Status indicator: gold rgba bg → blue rgba bg */
[data-theme='light'] .status-indicator {
  background: rgba(1, 79, 153, 0.05);
  border-color: rgba(1, 79, 153, 0.15);
}

/* Status dot: muted → light-mode muted */
[data-theme='light'] .status-dot {
  background: #4d6d8e;
}

/* Status text: muted → light-mode muted */
[data-theme='light'] .status-text {
  color: #4d6d8e;
}

/* Recording timer: soften rgba bg for light bg */
[data-theme='light'] .recording-timer {
  background: rgba(244, 67, 54, 0.1);
}

[data-theme='light'] .recording-timer.paused {
  background: rgba(255, 152, 0, 0.1);
}

/* Idle dot: dark grey → lighter grey */
[data-theme='light'] .status-indicator.idle .status-dot {
  background: #aab4be;
}

/* Processing: soften bg for light */
[data-theme='light'] .status-indicator.processing {
  background-color: rgba(255, 193, 7, 0.1);
}

/* Ready: soften bg for light */
[data-theme='light'] .status-indicator.ready {
  background: rgba(76, 175, 80, 0.08);
}

/* Recording: soften bg for light */
[data-theme='light'] .status-indicator.recording {
  background: rgba(244, 67, 54, 0.08);
}

/* Paused: soften bg for light */
[data-theme='light'] .status-indicator.paused {
  background: rgba(255, 152, 0, 0.08);
}

/* Prepare button: gold accent → blue accent */
[data-theme='light'] .btn-prepare {
  background: rgba(1, 79, 153, 0.1);
  color: #014f99;
  border-color: rgba(1, 79, 153, 0.25);
}

[data-theme='light'] .btn-prepare:hover:not(:disabled) {
  background: rgba(1, 79, 153, 0.18);
}

/* Start button: soften green bg for light */
[data-theme='light'] .btn-start {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.25);
}

[data-theme='light'] .btn-start:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.2);
}

/* Pause button: soften orange bg for light */
[data-theme='light'] .btn-pause {
  background: rgba(255, 152, 0, 0.1);
  border-color: rgba(255, 152, 0, 0.25);
}

[data-theme='light'] .btn-pause:hover:not(:disabled) {
  background: rgba(255, 152, 0, 0.2);
}

/* Resume button: soften blue bg for light */
[data-theme='light'] .btn-resume {
  background: rgba(33, 150, 243, 0.1);
  border-color: rgba(33, 150, 243, 0.25);
}

[data-theme='light'] .btn-resume:hover:not(:disabled) {
  background: rgba(33, 150, 243, 0.2);
}

/* Stop button: soften red bg for light */
[data-theme='light'] .btn-stop {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.25);
}

[data-theme='light'] .btn-stop:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.2);
}

/* Reset button: soften grey bg for light */
[data-theme='light'] .btn-reset {
  background: rgba(0, 0, 0, 0.05);
  color: #6b7280;
  border-color: rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .btn-reset:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}

/* Audio source section: soften purple bg for light */
[data-theme='light'] .audio-source-section {
  background: rgba(139, 92, 246, 0.05);
  border-color: rgba(139, 92, 246, 0.15);
}

/* Source indicator: soften green bg for light */
[data-theme='light'] .source-indicator {
  background: rgba(76, 175, 80, 0.12);
}

[data-theme='light'] .source-indicator.active {
  background: rgba(76, 175, 80, 0.12);
}

/* Mic toggle row: white-on-dark → dark-on-light */
[data-theme='light'] .mic-toggle-row {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .mic-toggle-row:hover {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(139, 92, 246, 0.3);
}

[data-theme='light'] .mic-toggle-row input[type="checkbox"] {
  accent-color: #014f99;
}

/* Mic toggle label: light text → dark blue */
[data-theme='light'] .mic-toggle-row .toggle-label {
  color: #003971;
}

/* Mic toggle icon: purple stays but darken slightly */
[data-theme='light'] .mic-toggle-row .toggle-label .icon {
  color: #7c3aed;
}

/* Source hint info: soften amber bg for light */
[data-theme='light'] .source-hint.info {
  color: rgba(180, 130, 0, 0.9);
  background: rgba(255, 193, 7, 0.08);
}

/* Section label: grey → muted blue */
[data-theme='light'] .section-label {
  color: #4d6d8e;
}

/* Quality buttons: dark bg → light bg */
[data-theme='light'] .quality-btn {
  background-color: #f0f0f0;
  color: #003971;
  border-color: #d0d0d0;
}

[data-theme='light'] .quality-btn:hover:not(:disabled) {
  background-color: #e4e4e4;
  border-color: #bbb;
}

/* Quality active: blue accent → primary blue */
[data-theme='light'] .quality-btn.active {
  background-color: #014f99;
  color: #F5F4D6;
  border-color: #014f99;
}

[data-theme='light'] .quality-btn.active:hover {
  background-color: #003971;
}

/* Upload buttons: dark bg → light bg */
[data-theme='light'] .upload-btn {
  background-color: #f0f0f0;
  color: #003971;
  border-color: #d0d0d0;
}

[data-theme='light'] .upload-btn:hover:not(:disabled) {
  background-color: #e4e4e4;
  border-color: #bbb;
}

/* Upload active: blue accent → primary blue */
[data-theme='light'] .upload-btn.active {
  background-color: #014f99;
  color: #F5F4D6;
  border-color: #014f99;
}

[data-theme='light'] .upload-btn.active:hover {
  background-color: #003971;
}

/* Server status unavailable: dark grey → lighter grey */
[data-theme='light'] .server-status.unavailable {
  color: var(--text-muted);
}

/* Toggle checkbox: blue → primary blue */
[data-theme='light'] .toggle-row input[type="checkbox"] {
  accent-color: #014f99;
}

/* Toggle label: light grey → dark blue */
[data-theme='light'] .toggle-label {
  color: #003971;
}

/* Conversion progress: blue rgba bg → lighter blue on white */
[data-theme='light'] .conversion-progress {
  background: rgba(1, 79, 153, 0.05);
  border-color: rgba(1, 79, 153, 0.18);
}

/* Progress label / percent: blue → primary blue */
[data-theme='light'] .progress-label {
  color: #014f99;
}

[data-theme='light'] .progress-percent {
  color: #014f99;
}

/* Progress bar track: white-on-dark → dark-on-light */
[data-theme='light'] .progress-bar {
  background: rgba(0, 0, 0, 0.08);
}

/* Progress fill gradient: bright blue → primary blue */
[data-theme='light'] .progress-fill {
  background: linear-gradient(90deg, #014f99, #3a7cc6);
}

/* MP4 download button: soften shadow for light */
[data-theme='light'] .mp4-download-btn:hover {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

/* Close conversion button: dark grey → light grey */
[data-theme='light'] .btn-close-conversion {
  background: rgba(0, 0, 0, 0.05);
  color: #4d6d8e;
  border-color: rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .btn-close-conversion:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.2);
}

/* Error message: soften red bg for light */
[data-theme='light'] .error-message {
  background: rgba(244, 67, 54, 0.08);
}

/* Retry button: soften orange bg for light */
[data-theme='light'] .btn-retry {
  background: rgba(255, 152, 0, 0.1);
  border-color: rgba(255, 152, 0, 0.25);
}

[data-theme='light'] .btn-retry:hover:not(:disabled) {
  background: rgba(255, 152, 0, 0.2);
}

/* Dismiss button: dark grey → light grey */
[data-theme='light'] .btn-dismiss {
  background: rgba(0, 0, 0, 0.05);
  color: #4d6d8e;
  border-color: rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .btn-dismiss:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}

/* Convert button: soften purple for light */
[data-theme='light'] .btn-convert {
  background: rgba(156, 39, 176, 0.08);
  color: #9C27B0;
  border-color: rgba(156, 39, 176, 0.2);
}

[data-theme='light'] .btn-convert:hover:not(:disabled) {
  background: rgba(156, 39, 176, 0.15);
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
  background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--card-bg) 100%);
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
  border-bottom: 1px solid var(--border-color);
  background: var(--secondary-bg);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: inherit;
}

.modal-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--btn-hover);
  color: var(--text-muted);
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
  background: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;
  cursor: pointer;
}

.cancel-btn:hover {
  background: var(--btn-hover);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.file-info {
  padding: 14px 18px;
  background: var(--secondary-bg);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
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

/* Conversion Overlay - Fullscreen */
.conversion-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(12px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.conversion-modal {
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--secondary-bg) 100%);
  border-radius: 20px;
  padding: 40px 50px;
  text-align: center;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(110, 168, 254, 0.15);
  border: 1px solid var(--border-color);
  max-width: 420px;
  width: 90%;
  animation: slideIn 0.4s ease;
}

.conversion-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, rgba(110, 168, 254, 0.2) 0%, rgba(79, 195, 247, 0.2) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: rotateIcon 2s linear infinite;
}

.conversion-icon svg {
  width: 40px;
  height: 40px;
  color: #6ea8fe;
}

@keyframes rotateIcon {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.conversion-title {
  margin: 0 0 12px 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.conversion-subtitle {
  margin: 0 0 28px 0;
  font-size: 14px;
  color: var(--text-muted);
}

.conversion-progress-bar {
  height: 10px;
  background: var(--secondary-bg);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.conversion-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6ea8fe 0%, #4FC3F7 50%, #6ea8fe 100%);
  background-size: 200% 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.conversion-percent {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #6ea8fe;
  margin-bottom: 20px;
  font-family: 'Courier New', monospace;
}

.conversion-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

@media (max-width: 480px) {
  .conversion-modal {
    padding: 30px 25px;
  }

  .conversion-icon {
    width: 60px;
    height: 60px;
    margin-bottom: 20px;
  }

  .conversion-icon svg {
    width: 30px;
    height: 30px;
  }

  .conversion-title {
    font-size: 18px;
  }

  .conversion-percent {
    font-size: 24px;
  }
}

/* ═══ Light Theme Overrides (Global Styles) ═══ */

/* Results modal overlay: soften for light mode */
[data-theme='light'] .results-modal {
  background: rgba(0, 0, 0, 0.7);
}

/* Modal content: softer shadow for light */
[data-theme='light'] .modal-content {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

/* File info strong: use theme-appropriate accent */
[data-theme='light'] .file-info strong {
  color: #014f99;
}

/* Conversion overlay: soften for light mode */
[data-theme='light'] .conversion-overlay {
  background: rgba(0, 0, 0, 0.75);
}

/* Conversion modal: softer shadow for light */
[data-theme='light'] .conversion-modal {
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25), 0 0 60px rgba(1, 79, 153, 0.1);
}

/* Conversion icon: darker blue for light bg */
[data-theme='light'] .conversion-icon svg {
  color: #014f99;
}

/* Conversion percent: darker blue for light bg */
[data-theme='light'] .conversion-percent {
  color: #014f99;
}

/* Conversion progress bar: softer inset shadow for light */
[data-theme='light'] .conversion-progress-bar {
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Conversion progress fill: theme-appropriate blue gradient */
[data-theme='light'] .conversion-progress-fill {
  background: linear-gradient(90deg, #014f99 0%, #3a7cc6 50%, #014f99 100%);
  background-size: 200% 100%;
}
</style>
