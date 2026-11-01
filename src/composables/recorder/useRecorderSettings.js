// Aufnahme-Einstellungen des RecorderPanels: Qualität, Bildrate, Upload-Modus,
// Server-Konvertierung. Stellt sie per provide('recorderSettings') dem
// RecorderSettingsPanel bereit (Schlüssel und Form unverändert).
import { ref, computed, provide } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useRecorderStore } from '../../stores/recorderStore.js'
import { checkServerHealth } from '../../lib/videoApi.js'

export const RECORDER_QUALITY_PRESETS = [
  { value: 2_000_000, label: 'Low' },
  { value: 5_000_000, label: 'Med' },
  { value: 8_000_000, label: 'High' },
  { value: 15_000_000, label: 'V.High' },
  { value: 25_000_000, label: 'Ultra' },
  { value: 40_000_000, label: '4K' },
  { value: 60_000_000, label: '4K+' },
  { value: 80_000_000, label: 'Max' },
]

// 30 fps ist der sichere Standard; 60 fps ist für moderne Hardware zuschaltbar.
export const RECORDER_FRAME_RATE_PRESETS = [
  { value: 30, label: '30' },
  { value: 60, label: '60' },
]

/**
 * @param {object} exportOptions GIF-/HQ-Refs aus useGifConversion/useHqExport,
 *   die das Einstellungs-Panel mit bearbeitet.
 * @param {import('vue').Ref<boolean>} exportOptions.enableGifExport
 * @param {import('vue').Ref<number>} exportOptions.gifFps
 * @param {import('vue').Ref<number>} exportOptions.gifWidth
 * @param {import('vue').Ref<boolean>} exportOptions.enableHqExport
 * @param {import('vue').Ref<number>} exportOptions.hqFps
 */
export function useRecorderSettings({ enableGifExport, gifFps, gifWidth, enableHqExport, hqFps }) {
  const { t } = useI18n()
  const recorderStore = useRecorderStore()

  const selectedQuality = ref(8_000_000)
  const recordingFps = ref(30)
  const uploadMode = ref('auto')
  const serverAvailable = ref(null)
  const enableServerConversion = ref(true)
  const conversionQuality = ref('social')

  const conversionPresets = computed(() => [
    { value: 'preview', label: 'Preview', desc: t('recorder.conversionPreviewDesc') },
    { value: 'medium', label: 'Medium', desc: t('recorder.conversionMediumDesc') },
    { value: 'social', label: 'Social', desc: t('recorder.conversionSocialDesc') },
    { value: 'high', label: 'High', desc: t('recorder.conversionHighDesc') },
    { value: 'highest', label: 'Highest', desc: t('recorder.conversionHighestDesc') },
  ])

  function selectQuality(value) {
    selectedQuality.value = value
    recorderStore.setRecordingQuality(value)
  }
  function selectUploadMode(mode) {
    uploadMode.value = mode
    recorderStore.setUploadMode(mode)
  }
  function selectFrameRate(value) {
    recordingFps.value = value
    recorderStore.setRecordingFrameRate(value)
  }

  /** Fragt das FFmpeg-Backend ab; Fehler zählen als „nicht erreichbar“. */
  async function refreshServerAvailability() {
    try {
      const health = await checkServerHealth()
      serverAvailable.value = health.available
      if (health.available) console.log('✅ [Panel] FFmpeg Backend verfügbar')
    } catch {
      serverAvailable.value = false
    }
  }

  provide('recorderSettings', {
    selectedQuality,
    qualityPresets: RECORDER_QUALITY_PRESETS,
    selectQuality,
    recordingFps,
    frameRatePresets: RECORDER_FRAME_RATE_PRESETS,
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
  })

  return {
    selectedQuality,
    recordingFps,
    uploadMode,
    serverAvailable,
    enableServerConversion,
    conversionQuality,
    refreshServerAvailability,
  }
}
