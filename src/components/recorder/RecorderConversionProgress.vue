<template>
  <div
    class="conversion-progress"
    :class="{
      'gif-conversion-progress': variant === 'gif',
      'hq-conversion-progress': variant === 'hq',
    }"
  >
    <div class="progress-header">
      <span class="progress-label">{{ currentLabel }}</span>
      <span class="progress-percent">{{ progress }}%</span>
    </div>
    <div class="progress-bar">
      <div
        class="progress-fill"
        :class="{
          'gif-fill': variant === 'gif',
          'hq-fill': variant === 'hq',
          completed: status === 'completed',
          error: status === 'error',
        }"
        :style="{ width: progress + '%' }"
      ></div>
    </div>

    <!-- Download -->
    <div v-if="downloadUrl && status === 'completed'" class="download-actions">
      <a
        :href="downloadUrl"
        :download="downloadFilename"
        class="mp4-download-btn"
        :class="{
          'gif-download-btn': variant === 'gif',
          'hq-download-btn': variant === 'hq',
        }"
        @click="$emit('download')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {{ downloadLabel }}
      </a>
      <button
        class="btn-close-conversion"
        @click="$emit('dismiss')"
        :title="t('recorder.closeAndDelete')"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Error -->
    <div v-if="status === 'error'" class="error-actions">
      <span class="error-message">{{ errorMessage || t('recorder.unknownError') }}</span>
      <button v-if="hasRetry" class="btn btn-retry" @click="$emit('retry')">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
          <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
        </svg>
        {{ t('recorder.retry') }}
      </button>
      <button class="btn btn-dismiss" @click="$emit('dismissError')">
        {{ t('common.close') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../lib/i18n.js'

const { t } = useI18n()

const props = defineProps({
  variant: { type: String, required: true }, // 'mp4' | 'gif' | 'hq'
  status: { type: String, required: true },
  progress: { type: Number, default: 0 },
  downloadUrl: { type: String, default: null },
  downloadFilename: { type: String, default: null },
  errorMessage: { type: String, default: null },
  hasRetry: { type: Boolean, default: false },
})

defineEmits(['download', 'dismiss', 'dismissError', 'retry'])

const downloadLabel = computed(
  () =>
    ({
      mp4: t('recorder.downloadMp4'),
      gif: t('recorder.downloadGif'),
      hq: t('recorder.downloadHq'),
    })[props.variant],
)

const currentLabel = computed(() => {
  const s = props.status
  if (props.variant === 'hq') {
    return s === 'uploading'
      ? t('recorder.hqUploading')
      : s === 'assembling'
        ? t('recorder.hqAssembling')
        : s === 'completed'
          ? t('recorder.hqCompleted')
          : t('recorder.hqError')
  }
  if (props.variant === 'gif') {
    return s === 'uploading'
      ? t('recorder.uploading')
      : s === 'converting'
        ? t('recorder.gifConverting')
        : s === 'completed'
          ? t('recorder.gifCompleted')
          : s === 'error'
            ? t('recorder.gifError')
            : t('recorder.processing')
  }
  return s === 'uploading'
    ? t('recorder.uploading')
    : s === 'converting'
      ? t('recorder.converting')
      : s === 'completed'
        ? t('recorder.completed')
        : s === 'error'
          ? t('recorder.conversionError')
          : t('recorder.processing')
})
</script>

<style scoped>
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
  background: linear-gradient(90deg, #6ea8fe, #4fc3f7);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill.completed {
  background: linear-gradient(90deg, #4caf50, #66bb6a);
}

.progress-fill.error {
  background: linear-gradient(90deg, #f44336, #e57373);
}

/* Download */
.mp4-download-btn {
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
  background: linear-gradient(135deg, #45a049 0%, #4caf50 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.download-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.download-actions .mp4-download-btn {
  flex: 1;
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

/* Error */
.error-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.error-message {
  font-size: 11px;
  color: #f44336;
  text-align: center;
  padding: 4px 8px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  max-width: 100%;
  word-break: break-word;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: none;
  border-radius: 5px;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 6px 10px;
  width: 100%;
}

.btn .icon {
  width: 12px;
  height: 12px;
}

.btn-retry {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.btn-retry:hover {
  background: rgba(255, 152, 0, 0.3);
  transform: translateY(-1px);
}

.btn-dismiss {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
  border: 1px solid rgba(158, 158, 158, 0.3);
  font-size: 10px;
}

.btn-dismiss:hover {
  background: rgba(158, 158, 158, 0.3);
}

/* GIF variant */
.gif-conversion-progress {
  border-color: rgba(74, 222, 128, 0.25);
  background-color: rgba(74, 222, 128, 0.04);
}

.gif-fill {
  background: linear-gradient(90deg, #22c55e 0%, #4ade80 50%, #22c55e 100%) !important;
  background-size: 200% 100% !important;
}

.gif-fill.completed {
  background: #22c55e !important;
  animation: none !important;
}

.gif-download-btn {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
}

.gif-download-btn:hover {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
}

/* HQ variant */
.hq-conversion-progress {
  border: 1px solid rgba(234, 179, 8, 0.2);
  background: rgba(234, 179, 8, 0.05);
}

.hq-fill {
  background: linear-gradient(90deg, #ca8a04, #eab308) !important;
}

.hq-fill.completed {
  background: linear-gradient(90deg, #16a34a, #22c55e) !important;
}

.hq-download-btn {
  background: linear-gradient(135deg, #ca8a04 0%, #a16207 100%) !important;
}

.hq-download-btn:hover {
  background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%) !important;
}

/* Light Theme */
[data-theme='light'] .conversion-progress {
  background: rgba(1, 79, 153, 0.05);
  border-color: rgba(1, 79, 153, 0.18);
}

[data-theme='light'] .progress-label,
[data-theme='light'] .progress-percent {
  color: #014f99;
}

[data-theme='light'] .progress-bar {
  background: rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .progress-fill {
  background: linear-gradient(90deg, #014f99, #3a7cc6);
}

[data-theme='light'] .mp4-download-btn:hover {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
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

[data-theme='light'] .error-message {
  background: rgba(244, 67, 54, 0.08);
}

[data-theme='light'] .btn-retry {
  background: rgba(255, 152, 0, 0.1);
  border-color: rgba(255, 152, 0, 0.25);
}

[data-theme='light'] .btn-retry:hover {
  background: rgba(255, 152, 0, 0.2);
}

[data-theme='light'] .btn-dismiss {
  background: rgba(0, 0, 0, 0.05);
  color: #4d6d8e;
  border-color: rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .btn-dismiss:hover {
  background: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .gif-conversion-progress {
  border-color: rgba(34, 197, 94, 0.3);
  background-color: rgba(34, 197, 94, 0.05);
}

[data-theme='light'] .gif-download-btn {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
}

[data-theme='light'] .hq-conversion-progress {
  border-color: rgba(202, 138, 4, 0.3);
  background: rgba(202, 138, 4, 0.06);
}

[data-theme='light'] .hq-download-btn {
  background: linear-gradient(135deg, #ca8a04 0%, #a16207 100%) !important;
}
</style>
