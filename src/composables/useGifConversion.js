import { ref } from 'vue'
import { convertGifAndWait, cleanupFile } from '../lib/videoApi.js'

export function useGifConversion() {
  const enableGifExport = ref(false)
  const gifFps = ref(15)
  const gifWidth = ref(480)
  const isConvertingGif = ref(false)
  const gifConversionProgress = ref(0)
  const gifConversionStatus = ref('')
  const gifConversionError = ref(null)
  const convertedGifUrl = ref(null)
  const convertedGifFilename = ref(null)

  async function startGifConversion(blob) {
    if (!blob || isConvertingGif.value) return
    isConvertingGif.value = true
    gifConversionProgress.value = 0
    gifConversionStatus.value = 'uploading'
    gifConversionError.value = null
    convertedGifUrl.value = null
    convertedGifFilename.value = null

    try {
      const result = await convertGifAndWait(blob, {
        fps: gifFps.value,
        width: gifWidth.value,
        colors: 256,
        onProgress: (p) => {
          gifConversionProgress.value = p
        },
        onStatusChange: (s) => {
          gifConversionStatus.value = s
        },
      })
      if (result.success) {
        convertedGifUrl.value = result.fileUrl
        convertedGifFilename.value = result.filename
        gifConversionStatus.value = 'completed'
        gifConversionProgress.value = 100
      }
    } catch (error) {
      gifConversionStatus.value = 'error'
      gifConversionError.value = error.message || 'GIF-Erstellung fehlgeschlagen'
    } finally {
      isConvertingGif.value = false
    }
  }

  async function dismissGifConversion(cleanup = false) {
    if (cleanup && convertedGifFilename.value) {
      await cleanupFile(convertedGifFilename.value).catch(() => {})
    }
    gifConversionStatus.value = ''
    gifConversionProgress.value = 0
    gifConversionError.value = null
    convertedGifUrl.value = null
    convertedGifFilename.value = null
  }

  function handleGifDownloadClick() {
    setTimeout(async () => {
      if (convertedGifFilename.value) await cleanupFile(convertedGifFilename.value).catch(() => {})
      gifConversionStatus.value = ''
      gifConversionProgress.value = 0
      convertedGifUrl.value = null
      convertedGifFilename.value = null
    }, 2000)
  }

  return {
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
  }
}
