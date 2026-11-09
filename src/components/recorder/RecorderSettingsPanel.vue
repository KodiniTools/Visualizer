<template>
  <!-- Video-Qualität -->
  <div class="control-section">
    <span class="section-label">{{ t('recorder.videoQuality') }}</span>
    <UiSegmentedControl
      v-model="qualityModel"
      :options="qualityOptions"
      :label="t('recorder.videoQuality')"
      class="quality-grid"
      size="sm"
      wrap
    />
  </div>

  <!-- Aufnahme-Bildrate -->
  <div class="control-section">
    <span class="section-label">{{ t('recorder.recordingFps') }}</span>
    <UiSegmentedControl
      v-model="fpsModel"
      :options="fpsOptions"
      :label="t('recorder.recordingFps')"
      size="sm"
    />
    <p class="extra-info">
      {{
        recordingFps === 60 ? t('recorder.recordingFps60Info') : t('recorder.recordingFps30Info')
      }}
    </p>
  </div>

  <!-- Upload-Modus -->
  <div class="control-section">
    <span class="section-label">{{ t('recorder.uploadMode') }}</span>
    <UiSegmentedControl
      v-model="uploadModel"
      :options="uploadOptions"
      :label="t('recorder.uploadMode')"
      size="sm"
    />
  </div>

  <!-- MP4-Konvertierung -->
  <div class="control-section">
    <div class="section-header">
      <span class="section-label">{{ t('recorder.mp4Conversion') }}</span>
      <span v-bind="statusAttrs" />
    </div>
    <UiSwitch
      v-model="enableServerConversion"
      :label="t('recorder.autoConvert')"
      :disabled="!serverAvailable"
    />
    <template v-if="enableServerConversion && serverAvailable">
      <UiSegmentedControl
        v-model="conversionQuality"
        :options="conversionOptions"
        :label="t('recorder.mp4Conversion')"
        size="sm"
      />
      <p v-if="conversionDesc" class="extra-info">{{ conversionDesc }}</p>
    </template>
  </div>

  <!-- GIF-Export -->
  <div class="control-section">
    <div class="section-header">
      <span class="section-label">{{ t('recorder.gifExport') }}</span>
      <span v-bind="statusAttrs" />
    </div>
    <UiSwitch
      v-model="enableGifExport"
      :label="t('recorder.gifAutoCreate')"
      :disabled="!serverAvailable"
    />
    <div v-if="enableGifExport && serverAvailable" class="export-options">
      <div class="export-option-row">
        <span class="export-option-label">{{ t('recorder.gifFps') }}</span>
        <UiSegmentedControl
          v-model="gifFpsModel"
          :options="GIF_FPS_OPTIONS"
          :label="t('recorder.gifFps')"
          size="sm"
        />
      </div>
      <div class="export-option-row">
        <span class="export-option-label">{{ t('recorder.gifWidth') }}</span>
        <UiSegmentedControl
          v-model="gifWidthModel"
          :options="GIF_WIDTH_OPTIONS"
          :label="t('recorder.gifWidth')"
          size="sm"
        />
      </div>
    </div>
  </div>

  <!-- HQ-Frame-Export -->
  <div class="control-section">
    <div class="section-header">
      <span class="section-label">{{ t('recorder.hqExport') }}</span>
      <span v-bind="statusAttrs" />
    </div>
    <UiSwitch
      v-model="enableHqExport"
      :label="t('recorder.hqAutoCreate')"
      :disabled="!serverAvailable"
    />
    <div v-if="enableHqExport && serverAvailable" class="export-options">
      <div class="export-option-row">
        <span class="export-option-label">{{ t('recorder.hqFps') }}</span>
        <UiSegmentedControl
          v-model="hqFpsModel"
          :options="HQ_FPS_OPTIONS"
          :label="t('recorder.hqFps')"
          size="sm"
        />
      </div>
      <p class="extra-info">{{ t('recorder.hqInfo') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Aufnahme-Einstellungen (Qualität, Bildrate, Upload, Server-Exporte).
 * Zustand kommt per inject('recorderSettings') aus useRecorderSettings.
 */
import { computed, inject } from 'vue'
import type { Ref } from 'vue'
import type { UploadMode } from '../../stores/recorderStore'
import type { RecorderSettingsApi } from '../../composables/recorder/useRecorderSettings'
import { useI18n } from '../../lib/i18n'
import UiSegmentedControl from '../ui/UiSegmentedControl.vue'
import UiSwitch from '../ui/UiSwitch.vue'

const { t } = useI18n()

const {
  selectedQuality,
  qualityPresets,
  selectQuality,
  recordingFps,
  frameRatePresets,
  selectFrameRate,
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
} = inject('recorderSettings') as RecorderSettingsApi

const UPLOAD_MODES = ['auto', 'server', 'direct']
const toOptions = (values: number[]) => values.map((v) => ({ value: String(v), label: String(v) }))
const GIF_FPS_OPTIONS = toOptions([10, 15, 20])
const GIF_WIDTH_OPTIONS = toOptions([320, 480, 640])
const HQ_FPS_OPTIONS = toOptions([24, 30, 60])

/**
 * UiSegmentedControl arbeitet mit Strings; die Einstellungen sind Zahlen.
 * @param write - eigener Setter (z. B. mit Store-Aufruf)
 */
function numberModel(
  source: Ref<number>,
  write: (v: number) => void = (v) => {
    source.value = v
  },
) {
  return computed({
    get: () => String(source.value),
    set: (v: string) => write(Number(v)),
  })
}

const qualityModel = numberModel(selectedQuality, selectQuality)
const fpsModel = numberModel(recordingFps, selectFrameRate)
const gifFpsModel = numberModel(gifFps)
const gifWidthModel = numberModel(gifWidth)
const hqFpsModel = numberModel(hqFps)

const uploadModel = computed({
  get: () => uploadMode.value,
  set: (v: string) => selectUploadMode(v as UploadMode),
})

const qualityOptions = qualityPresets.map((p) => ({ value: String(p.value), label: p.label }))
const fpsOptions = frameRatePresets.map((p) => ({
  value: String(p.value),
  label: `${p.label} fps`,
}))
const uploadOptions = computed(() =>
  UPLOAD_MODES.map((m) => ({ value: m, label: t(`recorder.uploadModes.${m}`) })),
)
const conversionOptions = computed(() =>
  conversionPresets.value.map((p) => ({ value: p.value, label: p.label })),
)
/** Beschreibung der gewählten MP4-Stufe (vorher nur als Tooltip). */
const conversionDesc = computed(
  () => conversionPresets.value.find((p) => p.value === conversionQuality.value)?.desc ?? '',
)

/** Server-Status als Punkt; Name für Screenreader und Tooltip. */
const statusAttrs = computed(() => {
  const label = serverAvailable.value
    ? t('recorder.serverAvailable')
    : t('recorder.serverUnavailable')
  return {
    class: [
      'server-status',
      { available: serverAvailable.value, unavailable: serverAvailable.value === false },
    ],
    role: 'img',
    'aria-label': label,
    title: label,
  }
})
</script>

<style scoped src="./recorder-section.css"></style>

<style scoped>
/* Optionen füllen die Breite gleichmäßig; Qualität in zwei Reihen à vier */
.control-section :deep(.ui-segmented__option) {
  flex: 1 1 0;
}

.quality-grid :deep(.ui-segmented__option) {
  flex: 1 1 22%;
}

.server-status {
  width: 8px;
  height: 8px;
  border-radius: var(--ds-radius-full);
  background-color: var(--ds-text-3);
  transition: background-color var(--ds-duration-slow) var(--ds-ease);
}

.server-status.available {
  background-color: var(--ds-success);
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2);
  background: var(--ds-surface-2);
  border-radius: var(--ds-radius-sm);
}

.export-option-row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
}

.export-option-row > :last-child {
  flex: 1;
}

.export-option-label {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  min-width: 48px;
}

.extra-info {
  font-size: var(--ds-text-xs);
  color: var(--ds-text-2);
  margin: 0;
  text-align: center;
}
</style>
