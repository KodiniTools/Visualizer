<template>
  <section class="control-section offline-section" :aria-label="t('recorder.offline.title')">
    <div class="section-header">
      <span class="section-label">{{ t('recorder.offline.title') }}</span>
    </div>
    <p class="offline-info">{{ t('recorder.offline.info') }}</p>

    <template v-if="status === 'completed'">
      <p class="offline-done">{{ t('recorder.offline.completed') }}</p>
      <RecorderDownloadActions
        variant="mp4"
        :label="t('recorder.offline.download')"
        :close-title="t('recorder.closeAndDelete')"
        @download="emit('download')"
        @dismiss="emit('dismiss')"
      />
    </template>
    <UiButton
      v-else
      class="offline-start"
      variant="secondary"
      size="sm"
      block
      :disabled="!canStart"
      @click="emit('start')"
    >
      <template #icon>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5" />
        </svg>
      </template>
      {{ t('recorder.offline.start') }}
    </UiButton>
    <p v-if="hint" class="offline-hint">{{ hint }}</p>

    <div v-if="status === 'error'" class="offline-error">
      <UiCallout type="danger" :title="t('recorder.offline.errorTitle')">
        {{ errorMessage }}
      </UiCallout>
      <UiButton variant="ghost" size="sm" @click="emit('dismiss')">
        {{ t('common.close') }}
      </UiButton>
    </div>

    <UiDialog
      :open="running"
      :title="t('recorder.offline.dialogTitle')"
      :description="t('recorder.offline.dialogDescription')"
      :close-label="t('recorder.offline.cancel')"
      @close="emit('cancel')"
    >
      <div class="offline-progress">
        <div class="offline-progress__row">
          <span class="offline-progress__label">{{ stepLabel }}</span>
          <span class="offline-progress__percent">{{ progress }}%</span>
        </div>
        <div
          class="offline-progress__bar"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="progress"
          :aria-label="t('recorder.offline.dialogTitle')"
        >
          <div class="offline-progress__fill" :style="{ width: progress + '%' }"></div>
        </div>
        <div v-if="status === 'rendering'" class="offline-progress__row offline-progress__meta">
          <span>{{ positionLabel }}</span>
          <span v-if="speed > 0">{{ speedLabel }}</span>
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="emit('cancel')">
          {{ t('recorder.offline.cancel') }}
        </UiButton>
      </template>
    </UiDialog>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../lib/i18n'
import { UiButton, UiCallout, UiDialog } from '../ui'
import RecorderDownloadActions from './RecorderDownloadActions.vue'
import { formatTime } from '../../utils/formatTime'
import { MAX_OFFLINE_SECONDS } from '../../lib/offlineExport/frameTiming'
import type { OfflineStatus } from '../../composables/recorder/useOfflineExport'
import type { OfflineExportErrorCode } from '../../lib/offlineExport/errors'

/**
 * Offline-Export im Recorder: Start-Knopf, Fortschritt im modalen Dialog
 * (sperrt die Bearbeitung, solange gerendert wird), Ergebnis zum Speichern.
 * Zustand und Ablauf kommen aus useOfflineExport (RecorderPanel).
 */
const props = withDefaults(
  defineProps<{
    status: OfflineStatus
    canStart: boolean
    isSupported: boolean
    hasTrack: boolean
    progress?: number
    frame?: number
    totalFrames?: number
    renderedSeconds?: number
    totalSeconds?: number
    speed?: number
    errorCode?: OfflineExportErrorCode | null
  }>(),
  {
    progress: 0,
    frame: 0,
    totalFrames: 0,
    renderedSeconds: 0,
    totalSeconds: 0,
    speed: 0,
    errorCode: null,
  },
)

const emit = defineEmits<{ start: []; cancel: []; download: []; dismiss: [] }>()

const { t } = useI18n()

const running = computed(
  () =>
    props.status === 'preparing' || props.status === 'rendering' || props.status === 'finalizing',
)

const hint = computed(() => {
  if (!props.isSupported) return t('recorder.offline.errorUnsupported')
  if (!props.hasTrack && props.status !== 'error') return t('recorder.offline.errorNoTrack')
  return ''
})

const ERROR_KEYS: Record<OfflineExportErrorCode, string> = {
  unsupported: 'recorder.offline.errorUnsupported',
  'no-track': 'recorder.offline.errorNoTrack',
  'too-long': 'recorder.offline.errorTooLong',
  microphone: 'recorder.offline.errorMicrophone',
  decode: 'recorder.offline.errorDecode',
  render: 'recorder.offline.errorRender',
  busy: 'recorder.offline.errorBusy',
}

const errorMessage = computed(() =>
  t(ERROR_KEYS[props.errorCode ?? 'render']).replace('{max}', String(MAX_OFFLINE_SECONDS / 60)),
)

const stepLabel = computed(() => {
  if (props.status === 'preparing') return t('recorder.offline.preparing')
  if (props.status === 'finalizing') return t('recorder.offline.finalizing')
  return t('recorder.offline.rendering')
    .replace('{frame}', String(props.frame))
    .replace('{total}', String(props.totalFrames))
})

const positionLabel = computed(() =>
  t('recorder.offline.position')
    .replace('{done}', formatTime(props.renderedSeconds))
    .replace('{total}', formatTime(props.totalSeconds)),
)

const speedLabel = computed(() =>
  t('recorder.offline.speed').replace('{speed}', props.speed.toFixed(1)),
)
</script>

<style scoped src="./recorder-section.css"></style>

<style scoped>
.offline-section {
  border-top: 1px solid var(--ds-border);
  padding-top: 10px;
}

.offline-info,
.offline-hint {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
  margin: 0;
  line-height: var(--ds-leading);
}

.offline-hint {
  color: var(--ds-text-2);
}

.offline-done {
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-success);
  margin: 0;
}

.offline-error {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--ds-space-2);
}

.offline-error :deep(.ui-callout) {
  align-self: stretch;
}

.offline-progress {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
}

.offline-progress__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--ds-text-sm);
  color: var(--ds-text);
}

.offline-progress__percent {
  font-weight: var(--ds-weight-semibold);
  font-variant-numeric: tabular-nums;
}

.offline-progress__meta {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-3);
  font-variant-numeric: tabular-nums;
}

.offline-progress__bar {
  height: 6px;
  background: var(--ds-surface-2);
  border-radius: var(--ds-radius-full);
  overflow: hidden;
}

.offline-progress__fill {
  height: 100%;
  background: var(--ds-accent);
  border-radius: var(--ds-radius-full);
  transition: width var(--ds-duration) var(--ds-ease);
}
</style>
