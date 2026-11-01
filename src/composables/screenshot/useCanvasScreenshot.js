// Screenshot der Canvas über die Render-Schleife (lib/canvasScreenshotBridge.js):
// Format/Qualität, Aufnahme, Vorschau-Metadaten und Freigabe der Blob-URL.
import { ref, computed, onBeforeUnmount } from 'vue'
import { useI18n } from '../../lib/i18n.js'
import { useToastStore } from '../../stores/toastStore.js'
import { getCanvasScreenshot } from '../../lib/canvasScreenshotBridge.js'

export const SCREENSHOT_FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
]

/**
 * Dateigröße für die Anzeige (B, KB mit 1, MB mit 2 Nachkommastellen).
 * @param {number} bytes
 * @returns {string}
 */
export function formatScreenshotSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/**
 * Dateiname `screenshot_<B>x<H>_<Zeitstempel>.<ext>`; `jpeg` wird zu `.jpg`.
 * @param {string} format
 * @param {number} width
 * @param {number} height
 * @param {Date} [now]
 * @returns {string}
 */
export function screenshotFileName(format, width, height, now = new Date()) {
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const extension = format === 'jpeg' ? 'jpg' : format
  return `screenshot_${width}x${height}_${timestamp}.${extension}`
}

/**
 * Liest die Bildmaße einer Blob-URL. Lehnt ab, wenn das Bild nicht dekodiert
 * werden kann (sonst bliebe die Aufnahme dauerhaft „in Bearbeitung“).
 * @param {string} url
 * @returns {Promise<{ width: number, height: number }>}
 */
export function loadImageSize(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = () => reject(new Error('Screenshot image could not be decoded'))
    img.src = url
  })
}

export function useCanvasScreenshot() {
  const { t } = useI18n()
  const toastStore = useToastStore()

  const selectedFormat = ref('png')
  const quality = ref(90)
  const isProcessing = ref(false)
  const previewUrl = ref(null)
  const fileName = ref('')
  const fileSize = ref('')
  const fileDimensions = ref('')
  const showFullscreenPreview = ref(false)

  const formatLabel = computed(() => {
    const format = SCREENSHOT_FORMATS.find((f) => f.value === selectedFormat.value)
    return format ? format.label : selectedFormat.value.toUpperCase()
  })

  function revokePreview() {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
  }

  async function takeScreenshot() {
    const takeCanvasScreenshot = getCanvasScreenshot()
    if (!takeCanvasScreenshot) {
      console.error('[ScreenshotPanel] takeCanvasScreenshot function not available')
      toastStore.error(t('screenshot.canvasNotFound'))
      return
    }

    isProcessing.value = true
    try {
      revokePreview()
      const blob = await takeCanvasScreenshot(`image/${selectedFormat.value}`, quality.value / 100)
      if (!blob) throw new Error('Failed to create screenshot')

      previewUrl.value = URL.createObjectURL(blob)
      const { width, height } = await loadImageSize(previewUrl.value)

      fileName.value = screenshotFileName(selectedFormat.value, width, height)
      fileSize.value = formatScreenshotSize(blob.size)
      fileDimensions.value = `${width} x ${height}`

      toastStore.success(t('screenshot.captureSuccess'))
    } catch (error) {
      console.error('[ScreenshotPanel] Error taking screenshot:', error)
      revokePreview()
      toastStore.error(t('screenshot.captureError'))
    } finally {
      isProcessing.value = false
    }
  }

  function handleDownload() {
    toastStore.success(t('screenshot.downloadStarted'))
  }

  function clearPreview() {
    revokePreview()
    fileName.value = ''
    fileSize.value = ''
    fileDimensions.value = ''
    showFullscreenPreview.value = false
  }

  function openFullscreenPreview() {
    showFullscreenPreview.value = true
  }

  function closeFullscreenPreview() {
    showFullscreenPreview.value = false
  }

  onBeforeUnmount(revokePreview)

  return {
    formats: SCREENSHOT_FORMATS,
    selectedFormat,
    quality,
    isProcessing,
    previewUrl,
    fileName,
    fileSize,
    fileDimensions,
    formatLabel,
    showFullscreenPreview,
    takeScreenshot,
    handleDownload,
    clearPreview,
    openFullscreenPreview,
    closeFullscreenPreview,
  }
}
