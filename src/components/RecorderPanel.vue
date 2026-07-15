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

    <!-- Status -->
    <div class="status-indicator" :class="statusClass">
      <div class="status-dot"></div>
      <span class="status-text">{{ statusText }}</span>
      <span
        v-if="recorderStore.isRecording"
        class="recording-timer"
        :class="{ paused: recorderStore.isPaused }"
      >
        {{ recordingDisplayTime }}
      </span>
    </div>

    <!-- Controls -->
    <div class="recorder-controls">
      <button
        v-if="!recorderStore.isPrepared && !recorderStore.isRecording"
        class="btn btn-prepare"
        @click="handlePrepare"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h8M12 8v8" />
        </svg>
        {{ t('recorder.prepare') }}
      </button>

      <button
        v-if="recorderStore.isPrepared && !recorderStore.isRecording"
        class="btn btn-start"
        @click="handleStart"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8" />
        </svg>
        {{ t('recorder.start') }}
      </button>

      <button
        v-if="recorderStore.isRecording && !recorderStore.isPaused"
        class="btn btn-pause"
        @click="handlePause"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
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
          <path d="M8 5v14l11-7z" />
        </svg>
        {{ t('recorder.resume') }}
      </button>

      <button
        v-if="recorderStore.isRecording"
        class="btn btn-stop"
        @click="handleStop"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
        {{ t('recorder.stop') }}
      </button>

      <button
        v-if="recorderStore.isPrepared && !recorderStore.isRecording"
        class="btn btn-reset"
        @click="handleReset"
        :disabled="isProcessing"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        {{ t('recorder.reset') }}
      </button>
    </div>

    <!-- Microphone toggle (during recording) -->
    <div class="control-section audio-source-section" v-if="recorderStore.isRecording">
      <div class="section-header">
        <span class="section-label">{{ t('recorder.audioSource') }}</span>
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
        />
        <span class="toggle-label">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          {{ t('recorder.addMicrophone') }}
        </span>
      </label>
      <p class="source-hint" v-if="isSwitchingSource">{{ t('recorder.activatingMicrophone') }}</p>
      <p class="source-hint info" v-else-if="microphoneEnabled">{{ t('recorder.micOnlyHint') }}</p>
    </div>

    <!-- Settings (hidden while recording) -->
    <RecorderSettingsPanel v-if="!recorderStore.isRecording" />

    <!-- HQ capturing indicator -->
    <div
      class="hq-capturing-indicator"
      v-if="enableHqExport && recorderStore.isRecording && serverAvailable"
    >
      <span class="hq-dot"></span>
      {{ t('recorder.hqCapturing') }}: {{ capturedFrameCount }} frames
    </div>

    <!-- HQ Conversion Progress -->
    <RecorderConversionProgress
      v-if="
        hqStatus === 'uploading' ||
        hqStatus === 'assembling' ||
        hqStatus === 'completed' ||
        hqStatus === 'error'
      "
      variant="hq"
      :status="hqStatus"
      :progress="hqProgress"
      :download-url="hqVideoUrl"
      :download-filename="hqFilename"
      :error-message="hqError"
      @download="handleHqDownloadClick"
      @dismiss="dismissHqExport(true)"
      @dismiss-error="dismissHqExport()"
    />

    <!-- GIF Conversion Progress -->
    <RecorderConversionProgress
      v-if="
        isConvertingGif || gifConversionStatus === 'completed' || gifConversionStatus === 'error'
      "
      variant="gif"
      :status="gifConversionStatus"
      :progress="gifConversionProgress"
      :download-url="convertedGifUrl"
      :download-filename="convertedGifFilename"
      :error-message="gifConversionError"
      :has-retry="true"
      @download="handleGifDownloadClick"
      @dismiss="dismissGifConversion(true)"
      @dismiss-error="dismissGifConversion()"
      @retry="startGifConversion(recorderStore.lastRecording?.blob)"
    />

    <!-- Manual GIF Button -->
    <button
      v-if="
        recorderStore.lastRecording &&
        !isConvertingGif &&
        serverAvailable &&
        enableGifExport &&
        !enableServerConversion &&
        gifConversionStatus !== 'completed'
      "
      class="btn btn-convert"
      @click="startGifConversion(recorderStore.lastRecording.blob)"
      :disabled="isProcessing"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 12h8M12 8v8" />
      </svg>
      {{ t('recorder.convertToGif') }}
    </button>

    <!-- WebM Download -->
    <div class="control-section webm-section" v-if="webmBlobUrl && !recorderStore.isRecording">
      <div class="section-header">
        <span class="section-label">{{ t('recorder.webmExport') }}</span>
      </div>
      <div class="download-actions">
        <a
          :href="webmBlobUrl"
          :download="webmFilename"
          class="mp4-download-btn webm-download-btn"
          @click="handleWebmDownloadClick"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {{ t('recorder.downloadWebm') }}
        </a>
        <button class="btn-close-conversion" @click="dismissWebm" :title="t('common.close')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <p class="webm-info">{{ t('recorder.webmInfo') }}</p>
    </div>

    <!-- MP4 Conversion Progress -->
    <RecorderConversionProgress
      v-if="isConverting || conversionStatus === 'completed' || conversionStatus === 'error'"
      variant="mp4"
      :status="conversionStatus"
      :progress="conversionProgress"
      :download-url="convertedVideoUrl"
      :download-filename="convertedFilename"
      :error-message="conversionError"
      :has-retry="true"
      @download="handleDownloadClick"
      @dismiss="dismissConversion(true)"
      @dismiss-error="dismissConversion()"
      @retry="retryConversion"
    />

    <!-- Manual MP4 Convert Button -->
    <button
      v-if="
        recorderStore.lastRecording &&
        !isConverting &&
        serverAvailable &&
        !enableServerConversion &&
        conversionStatus !== 'completed'
      "
      class="btn btn-convert"
      @click="convertLastRecording"
      :disabled="isProcessing"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M23 4v6h-6" />
        <path d="M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
        <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
      </svg>
      {{ t('recorder.convertToMp4') }}
    </button>
  </div>

  <RecorderConversionOverlay
    :is-converting="isConverting"
    :status="conversionStatus"
    :progress="conversionProgress"
  />

  <RecorderResultsModal @close="closeResults" />
</template>

<script setup>
import { ref, computed, provide, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useRecorderStore } from '../stores/recorderStore.js'
import HelpTooltip from './HelpTooltip.vue'
import RecorderSettingsPanel from './recorder/RecorderSettingsPanel.vue'
import RecorderConversionProgress from './recorder/RecorderConversionProgress.vue'
import RecorderConversionOverlay from './recorder/RecorderConversionOverlay.vue'
import RecorderResultsModal from './recorder/RecorderResultsModal.vue'
import { checkServerHealth } from '../lib/videoApi.js'
import { useRecordingTimer } from '../composables/useRecordingTimer.js'
import { useMicrophoneToggle } from '../composables/useMicrophoneToggle.js'
import { useWebmExport } from '../composables/useWebmExport.js'
import { useServerConversion } from '../composables/useServerConversion.js'
import { useGifConversion } from '../composables/useGifConversion.js'
import { useHqExport } from '../composables/useHqExport.js'

const { t } = useI18n()
const recorderStore = useRecorderStore()

// ── Base State ───────────────────────────────────────────────────────
const selectedQuality = ref(8_000_000)
const uploadMode = ref('auto')
const isProcessing = ref(false)
const serverAvailable = ref(null)
const enableServerConversion = ref(true)
const conversionQuality = ref('social')

// ── Composables ──────────────────────────────────────────────────────
const { recordingDisplayTime, startTimer, pauseTimer, resumeTimer, stopTimer, destroyTimer } =
  useRecordingTimer()
const { microphoneEnabled, isSwitchingSource, toggleMicrophone } = useMicrophoneToggle()
const { webmBlobUrl, webmFilename, prepareWebmDownload, handleWebmDownloadClick, dismissWebm } =
  useWebmExport()
const {
  isConverting,
  conversionProgress,
  conversionStatus,
  conversionError,
  convertedVideoUrl,
  convertedFilename,
  startServerConversion,
  retryConversion,
  dismissConversion,
  handleDownloadClick,
} = useServerConversion()
const {
  enableGifExport,
  gifFps,
  gifWidth,
  isConvertingGif,
  gifConversionProgress,
  gifConversionStatus,
  gifConversionError,
  convertedGifUrl,
  convertedGifFilename,
  startGifConversion,
  dismissGifConversion,
  handleGifDownloadClick,
} = useGifConversion()
const {
  enableHqExport,
  hqFps,
  hqSessionId,
  hqStatus,
  hqProgress,
  hqError,
  hqVideoUrl,
  hqFilename,
  capturedFrameCount,
  startHqCapture,
  finishHqExport,
  dismissHqExport,
  handleHqDownloadClick,
} = useHqExport()

// ── Quality Presets ──────────────────────────────────────────────────
const qualityPresets = [
  { value: 2_000_000, label: 'Low' },
  { value: 5_000_000, label: 'Med' },
  { value: 8_000_000, label: 'High' },
  { value: 15_000_000, label: 'V.High' },
  { value: 25_000_000, label: 'Ultra' },
  { value: 40_000_000, label: '4K' },
  { value: 60_000_000, label: '4K+' },
  { value: 80_000_000, label: 'Max' },
]
const conversionPresets = computed(() => [
  { value: 'preview', label: 'Preview', desc: t('recorder.conversionPreviewDesc') },
  { value: 'medium', label: 'Medium', desc: t('recorder.conversionMediumDesc') },
  { value: 'social', label: 'Social', desc: t('recorder.conversionSocialDesc') },
  { value: 'high', label: 'High', desc: t('recorder.conversionHighDesc') },
  { value: 'highest', label: 'Highest', desc: t('recorder.conversionHighestDesc') },
])

// ── Provide settings to RecorderSettingsPanel ────────────────────────
provide('recorderSettings', {
  selectedQuality,
  qualityPresets,
  selectQuality,
  uploadMode,
  selectUploadMode,
  serverAvailable,
  enableServerConversion,
  conversionQuality,
  conversionPresets,
  enableGifExport,
  gifFps,
  gifWidth,
  enableHqExport,
  hqFps,
})

// ── Computed ─────────────────────────────────────────────────────────
const statusClass = computed(() => {
  if (recorderStore.statusType === 'processing') return 'status-indicator processing'
  if (recorderStore.isPaused) return 'status-indicator paused'
  if (recorderStore.isRecording) return 'status-indicator recording'
  if (recorderStore.isPrepared) return 'status-indicator ready'
  return 'status-indicator idle'
})
const statusText = computed(() => {
  if (recorderStore.statusType === 'processing') return t('recorder.status.processing')
  if (recorderStore.isPaused) return t('recorder.status.paused')
  if (recorderStore.isRecording) return t('recorder.status.recording')
  if (recorderStore.isPrepared) return t('recorder.status.ready')
  return t('recorder.status.idle')
})

// ── Actions ───────────────────────────────────────────────────────────
function selectQuality(value) {
  selectedQuality.value = value
  recorderStore.setRecordingQuality(value)
}
function selectUploadMode(mode) {
  uploadMode.value = mode
  recorderStore.setUploadMode(mode)
}

async function handlePrepare() {
  if (isProcessing.value) return
  isProcessing.value = true
  try {
    await recorderStore.prepareRecording({ quality: selectedQuality.value })
  } finally {
    isProcessing.value = false
  }
}
async function handleStart() {
  if (isProcessing.value) return
  isProcessing.value = true
  try {
    const success = await recorderStore.startRecording()
    if (success) {
      startTimer()
      if (enableHqExport.value && serverAvailable.value) startHqCapture()
    }
  } finally {
    isProcessing.value = false
  }
}
function handlePause() {
  if (isProcessing.value) return
  isProcessing.value = true
  try {
    if (recorderStore.pauseRecording()) pauseTimer()
  } finally {
    isProcessing.value = false
  }
}
function handleResume() {
  if (isProcessing.value) return
  isProcessing.value = true
  try {
    if (recorderStore.resumeRecording()) resumeTimer()
  } finally {
    isProcessing.value = false
  }
}
async function handleStop() {
  if (isProcessing.value) return
  isProcessing.value = true
  try {
    stopTimer()
    const blob = await recorderStore.stopRecording()
    if (blob) {
      prepareWebmDownload(blob)
      showResults(blob)
      if (enableHqExport.value && serverAvailable.value && hqSessionId.value) finishHqExport(blob)
      if (enableServerConversion.value && serverAvailable.value)
        await startServerConversion(blob, conversionQuality.value)
      if (enableGifExport.value && serverAvailable.value) startGifConversion(blob)
    }
  } finally {
    isProcessing.value = false
  }
}
function handleReset() {
  if (isProcessing.value) return
  isProcessing.value = true
  try {
    recorderStore.resetRecorder()
  } finally {
    isProcessing.value = false
  }
}
async function convertLastRecording() {
  if (recorderStore.lastRecording?.blob) {
    await startServerConversion(recorderStore.lastRecording.blob, conversionQuality.value)
  }
}
// Own object URL for the preview <video>, independent of the WebM download
// section's URL lifecycle (which gets revoked on download/dismiss).
let previewObjectUrl = null

function showResults(blob) {
  const modal = document.getElementById('results-panel')
  const video = document.getElementById('preview')
  if (!modal || !video) return
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
  previewObjectUrl = URL.createObjectURL(blob)
  video.src = previewObjectUrl
  // .results-modal is a flex-centered overlay (inline style starts as none).
  modal.style.display = 'flex'
}

function closeResults() {
  const modal = document.getElementById('results-panel')
  if (modal) {
    modal.style.display = 'none'
    const video = document.getElementById('preview')
    if (video) {
      video.pause()
      video.src = ''
    }
  }
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = null
  }
}
function handleKeydown(e) {
  if (e.key === 'Escape') closeResults()
}

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)
  try {
    const health = await checkServerHealth()
    serverAvailable.value = health.available
    if (health.available) console.log('✅ [Panel] FFmpeg Backend verfügbar')
  } catch {
    serverAvailable.value = false
  }
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  destroyTimer()
  dismissWebm()
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = null
  }
})
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
  color: var(--text-primary, #e9e9eb);
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
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.8));
}

/* Status */
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
  background: var(--text-muted, #7a8da0);
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--text-muted, #7a8da0);
}

.recording-timer {
  font-size: 0.75rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #f44336;
  margin-left: auto;
  padding: 2px 8px;
  background: rgba(244, 67, 54, 0.15);
  border-radius: 4px;
  letter-spacing: 1px;
  min-width: 50px;
  text-align: center;
}

.recording-timer.paused {
  color: #ff9800;
  background: rgba(255, 152, 0, 0.15);
  animation: timerBlink 1s ease-in-out infinite;
}

@keyframes timerBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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
  background-color: #ffc107;
  animation: processingPulse 1.5s ease-in-out infinite;
}

@keyframes processingPulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.1);
  }
}

.status-indicator.ready {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
}
.status-indicator.ready .status-dot {
  background: #4caf50;
}
.status-indicator.ready .status-text {
  color: #4caf50;
}

.status-indicator.recording {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.3);
}
.status-indicator.recording .status-dot {
  background: #f44336;
}
.status-indicator.recording .status-text {
  color: #f44336;
}

.status-indicator.paused {
  background: rgba(255, 152, 0, 0.1);
  border-color: rgba(255, 152, 0, 0.3);
}
.status-indicator.paused .status-dot {
  background: #ff9800;
  animation: none;
}
.status-indicator.paused .status-text {
  color: #ff9800;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

/* Controls */
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
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}
.btn-start:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.3);
  transform: translateY(-1px);
}

.btn-pause {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}
.btn-pause:hover:not(:disabled) {
  background: rgba(255, 152, 0, 0.3);
  transform: translateY(-1px);
}

.btn-resume {
  background: rgba(33, 150, 243, 0.2);
  color: #2196f3;
  border: 1px solid rgba(33, 150, 243, 0.3);
}
.btn-resume:hover:not(:disabled) {
  background: rgba(33, 150, 243, 0.3);
  transform: translateY(-1px);
}

.btn-stop {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
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

.btn-convert {
  background: rgba(156, 39, 176, 0.2);
  color: #ce93d8;
  border: 1px solid rgba(156, 39, 176, 0.3);
  width: 100%;
}
.btn-convert:hover:not(:disabled) {
  background: rgba(156, 39, 176, 0.3);
  transform: translateY(-1px);
}

/* Audio source (mic) section */
.audio-source-section {
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
  padding: 8px 10px;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.source-indicator {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
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

.mic-toggle-row input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: #8b5cf6;
  cursor: pointer;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-primary, #e9e9eb);
  font-weight: 500;
}

.toggle-label .icon {
  width: 16px;
  height: 16px;
  color: #8b5cf6;
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

/* HQ indicator */
.hq-capturing-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(255, 200, 0, 0.85);
  padding: 4px 8px;
  background: rgba(255, 200, 0, 0.08);
  border-radius: 6px;
  margin: 4px 0;
}

.hq-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ffc800;
  animation: pulse 1s infinite;
  flex-shrink: 0;
}

/* WebM section */
.webm-section {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 10px;
}

.download-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mp4-download-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
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
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.webm-download-btn {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  margin-top: 6px;
}
.webm-download-btn:hover {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
}

.webm-info {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin: 4px 0 0 0;
  text-align: center;
}

.btn-close-conversion {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
  border: 1px solid rgba(158, 158, 158, 0.3);
  padding: 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-close-conversion:hover {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border-color: rgba(244, 67, 54, 0.3);
}

.icon {
  width: 12px;
  height: 12px;
}

@media (max-width: 768px) {
  .recorder-controls {
    flex-direction: column;
  }
  .btn {
    min-width: auto;
  }
}

/* Light Theme */
[data-theme='light'] .recorder-panel {
  background-color: #ffffff;
  border-color: rgba(1, 79, 153, 0.15);
}
[data-theme='light'] h3 {
  color: #003971;
}
[data-theme='light'] h3::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23003971' stroke-width='1.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='12' r='3' fill='%23003971'/%3E%3C/svg%3E");
  filter: none;
}
[data-theme='light'] .status-indicator {
  background: rgba(1, 79, 153, 0.05);
  border-color: rgba(1, 79, 153, 0.15);
}
[data-theme='light'] .status-dot {
  background: #4d6d8e;
}
[data-theme='light'] .status-text {
  color: #4d6d8e;
}
[data-theme='light'] .recording-timer {
  background: rgba(244, 67, 54, 0.1);
}
[data-theme='light'] .recording-timer.paused {
  background: rgba(255, 152, 0, 0.1);
}
[data-theme='light'] .status-indicator.idle .status-dot {
  background: #aab4be;
}
[data-theme='light'] .status-indicator.processing {
  background-color: rgba(255, 193, 7, 0.1);
}
[data-theme='light'] .status-indicator.ready {
  background: rgba(76, 175, 80, 0.08);
}
[data-theme='light'] .status-indicator.recording {
  background: rgba(244, 67, 54, 0.08);
}
[data-theme='light'] .status-indicator.paused {
  background: rgba(255, 152, 0, 0.08);
}
[data-theme='light'] .btn-prepare {
  background: rgba(1, 79, 153, 0.1);
  color: #014f99;
  border-color: rgba(1, 79, 153, 0.25);
}
[data-theme='light'] .btn-prepare:hover:not(:disabled) {
  background: rgba(1, 79, 153, 0.18);
}
[data-theme='light'] .btn-start {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.25);
}
[data-theme='light'] .btn-start:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.2);
}
[data-theme='light'] .btn-pause {
  background: rgba(255, 152, 0, 0.1);
  border-color: rgba(255, 152, 0, 0.25);
}
[data-theme='light'] .btn-pause:hover:not(:disabled) {
  background: rgba(255, 152, 0, 0.2);
}
[data-theme='light'] .btn-resume {
  background: rgba(33, 150, 243, 0.1);
  border-color: rgba(33, 150, 243, 0.25);
}
[data-theme='light'] .btn-resume:hover:not(:disabled) {
  background: rgba(33, 150, 243, 0.2);
}
[data-theme='light'] .btn-stop {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.25);
}
[data-theme='light'] .btn-stop:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.2);
}
[data-theme='light'] .btn-reset {
  background: rgba(0, 0, 0, 0.05);
  color: #6b7280;
  border-color: rgba(0, 0, 0, 0.12);
}
[data-theme='light'] .btn-reset:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}
[data-theme='light'] .btn-convert {
  background: rgba(156, 39, 176, 0.08);
  color: #9c27b0;
  border-color: rgba(156, 39, 176, 0.2);
}
[data-theme='light'] .btn-convert:hover:not(:disabled) {
  background: rgba(156, 39, 176, 0.15);
}
[data-theme='light'] .audio-source-section {
  background: rgba(139, 92, 246, 0.05);
  border-color: rgba(139, 92, 246, 0.15);
}
[data-theme='light'] .source-indicator {
  background: rgba(76, 175, 80, 0.12);
}
[data-theme='light'] .mic-toggle-row {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.1);
}
[data-theme='light'] .mic-toggle-row:hover {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(139, 92, 246, 0.3);
}
[data-theme='light'] .mic-toggle-row input[type='checkbox'] {
  accent-color: #014f99;
}
[data-theme='light'] .toggle-label {
  color: #003971;
}
[data-theme='light'] .toggle-label .icon {
  color: #7c3aed;
}
[data-theme='light'] .source-hint.info {
  color: rgba(180, 130, 0, 0.9);
  background: rgba(255, 193, 7, 0.08);
}
[data-theme='light'] .section-label {
  color: #4d6d8e;
}
[data-theme='light'] .webm-download-btn {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
}
[data-theme='light'] .webm-info {
  color: rgba(0, 0, 0, 0.4);
}
[data-theme='light'] .btn-close-conversion {
  background: rgba(0, 0, 0, 0.05);
  color: #4d6d8e;
  border-color: rgba(0, 0, 0, 0.12);
}
[data-theme='light'] .btn-close-conversion:hover {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.2);
}
</style>
