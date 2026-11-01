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
    <RecorderStatusIndicator :display-time="recordingDisplayTime" />

    <!-- Controls -->
    <RecorderTransportControls
      :disabled="isProcessing"
      @prepare="handlePrepare"
      @start="handleStart"
      @pause="handlePause"
      @resume="handleResume"
      @stop="handleStop"
      @reset="handleReset"
    />

    <!-- Microphone toggle (during recording) -->
    <RecorderMicSource v-if="recorderStore.isRecording" />

    <!-- Settings (hidden while recording) -->
    <RecorderSettingsPanel v-if="!recorderStore.isRecording" />

    <!-- HQ capturing indicator -->
    <div
      v-if="enableHqExport && recorderStore.isRecording && serverAvailable"
      class="hq-capturing-indicator"
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
      :error-message="hqError"
      @download="saveExport('hq')"
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
      :error-message="gifConversionError"
      :has-retry="true"
      @download="saveExport('gif')"
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
      :disabled="isProcessing"
      @click="startGifConversion(recorderStore.lastRecording.blob)"
    >
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 12h8M12 8v8" />
      </svg>
      {{ t('recorder.convertToGif') }}
    </button>

    <!-- WebM Download -->
    <div v-if="webmBlobUrl && !recorderStore.isRecording" class="control-section webm-section">
      <div class="section-header">
        <span class="section-label">{{ t('recorder.webmExport') }}</span>
      </div>
      <RecorderDownloadActions
        variant="webm"
        :label="t('recorder.downloadWebm')"
        :close-title="t('common.close')"
        @download="saveExport('webm')"
        @dismiss="dismissWebm"
      />
      <p class="webm-info">{{ t('recorder.webmInfo') }}</p>
    </div>

    <!-- MP4 Conversion Progress -->
    <RecorderConversionProgress
      v-if="isConverting || conversionStatus === 'completed' || conversionStatus === 'error'"
      variant="mp4"
      :status="conversionStatus"
      :progress="conversionProgress"
      :download-url="convertedVideoUrl"
      :error-message="conversionError"
      :has-retry="true"
      @download="saveExport('mp4')"
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
      :disabled="isProcessing"
      @click="convertLastRecording"
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
    @cancel="cancelConversion"
  />

  <RecorderResultsModal @close="closeResults" />

  <RecorderSaveDialog
    :open="saveDialog.open"
    :filename="saveDialog.filename"
    :extension="saveDialog.extension || 'mp4'"
    @confirm="confirmSave"
    @cancel="cancelSave"
  />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from '../lib/i18n.js'
import { useRecorderStore } from '../stores/recorderStore.js'
import HelpTooltip from './HelpTooltip.vue'
import RecorderStatusIndicator from './recorder/RecorderStatusIndicator.vue'
import RecorderTransportControls from './recorder/RecorderTransportControls.vue'
import RecorderMicSource from './recorder/RecorderMicSource.vue'
import RecorderDownloadActions from './recorder/RecorderDownloadActions.vue'
import RecorderSettingsPanel from './recorder/RecorderSettingsPanel.vue'
import RecorderConversionProgress from './recorder/RecorderConversionProgress.vue'
import RecorderConversionOverlay from './recorder/RecorderConversionOverlay.vue'
import RecorderResultsModal from './recorder/RecorderResultsModal.vue'
import RecorderSaveDialog from './recorder/RecorderSaveDialog.vue'
import { useRecordingTimer } from '../composables/useRecordingTimer.js'
import { useWebmExport } from '../composables/useWebmExport.js'
import { useServerConversion } from '../composables/useServerConversion.js'
import { useGifConversion } from '../composables/useGifConversion.js'
import { useHqExport } from '../composables/useHqExport.js'
import { useSaveDialog } from '../composables/useSaveDialog.js'
import { useRecorderSettings } from '../composables/recorder/useRecorderSettings.js'
import { useRecorderActions } from '../composables/recorder/useRecorderActions.js'
import { useRecorderExportSave } from '../composables/recorder/useRecorderExportSave.js'
import { useRecordingPreview } from '../composables/recorder/useRecordingPreview.js'

const { t } = useI18n()
const recorderStore = useRecorderStore()

// ── Export-Pipelines ─────────────────────────────────────────────────
const timer = useRecordingTimer()
const webm = useWebmExport()
const conversion = useServerConversion()
const gif = useGifConversion()
const hq = useHqExport()
const { recordingDisplayTime } = timer
const { webmBlobUrl, dismissWebm } = webm
const {
  isConverting,
  conversionProgress,
  conversionStatus,
  conversionError,
  convertedVideoUrl,
  retryConversion,
  cancelConversion,
  dismissConversion,
} = conversion
const {
  enableGifExport,
  isConvertingGif,
  gifConversionProgress,
  gifConversionStatus,
  gifConversionError,
  convertedGifUrl,
  startGifConversion,
  dismissGifConversion,
} = gif
const {
  enableHqExport,
  hqStatus,
  hqProgress,
  hqError,
  hqVideoUrl,
  capturedFrameCount,
  dismissHqExport,
} = hq

// ── Einstellungen, Vorschau, Aktionen ────────────────────────────────
const settings = useRecorderSettings({
  enableGifExport: gif.enableGifExport,
  gifFps: gif.gifFps,
  gifWidth: gif.gifWidth,
  enableHqExport: hq.enableHqExport,
  hqFps: hq.hqFps,
})
const { serverAvailable, enableServerConversion } = settings
const { showResults, closeResults } = useRecordingPreview()
const {
  isProcessing,
  handlePrepare,
  handleStart,
  handlePause,
  handleResume,
  handleStop,
  handleReset,
  convertLastRecording,
} = useRecorderActions({ settings, timer, webm, conversion, gif, hq, showResults })

// ── Speichern (Dialog mit Speicherort + Dateiname) ──────────────────
const {
  dialog: saveDialog,
  requestSave,
  confirm: confirmSave,
  cancel: cancelSave,
} = useSaveDialog()
const { saveExport } = useRecorderExportSave(
  {
    webm: () => ({
      url: webmBlobUrl.value,
      extension: 'webm',
      suffix: '',
      done: webm.handleWebmDownloadClick,
    }),
    mp4: () => ({
      url: convertedVideoUrl.value,
      extension: 'mp4',
      suffix: '',
      done: conversion.handleDownloadClick,
    }),
    gif: () => ({
      url: convertedGifUrl.value,
      extension: 'gif',
      suffix: '',
      done: gif.handleGifDownloadClick,
    }),
    hq: () => ({
      url: hqVideoUrl.value,
      extension: 'mp4',
      suffix: '_hq',
      done: hq.handleHqDownloadClick,
    }),
  },
  requestSave,
)

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(settings.refreshServerAvailability)
onUnmounted(() => {
  timer.destroyTimer()
  dismissWebm()
})
</script>

<style scoped src="./recorder/recorder-section.css"></style>

<style scoped src="./recorder/recorder-buttons.css"></style>

<style scoped>
.recorder-panel {
  background-color: var(--card-bg);
  border-radius: var(--ds-radius-md);
  padding: 10px;
  border: 1px solid var(--border-color);
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
  color: var(--text-primary);
  font-weight: var(--ds-weight-semibold);
  font-size: var(--ds-text-xs);
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
}

.btn-convert {
  background: color-mix(in srgb, var(--ds-link) 20%, transparent);
  color: var(--ds-link);
  border: 1px solid color-mix(in srgb, var(--ds-link) 30%, transparent);
  width: 100%;
}

.btn-convert:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-link) 30%, transparent);
}

.hq-capturing-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ds-text-xs);
  color: var(--ds-warning);
  padding: 4px 8px;
  background: color-mix(in srgb, var(--ds-warning) 8%, transparent);
  border-radius: var(--ds-radius-sm);
  margin: 4px 0;
}

.hq-dot {
  width: 7px;
  height: 7px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-warning);
  animation: pulse 1s infinite;
  flex-shrink: 0;
}

.webm-section {
  border-top: 1px solid var(--ds-border);
  padding-top: 10px;
}

.webm-info {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
  margin: 4px 0 0 0;
  text-align: center;
}

[data-theme='light'] .recorder-panel {
  border-color: var(--border-color);
}

[data-theme='light'] h3::before {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23003971' stroke-width='1.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='12' r='3' fill='%23003971'/%3E%3C/svg%3E");
  filter: none;
}

[data-theme='light'] .btn-convert {
  background: color-mix(in srgb, var(--ds-link) 8%, transparent);
  border-color: color-mix(in srgb, var(--ds-link) 20%, transparent);
}

[data-theme='light'] .btn-convert:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-link) 15%, transparent);
}

[data-theme='light'] .webm-info {
  color: var(--ds-text-2);
}
</style>
