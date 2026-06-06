import { ref } from 'vue'

export function useWebmExport() {
  const webmBlobUrl = ref(null)
  const webmFilename = ref(null)

  function prepareWebmDownload(blob) {
    if (webmBlobUrl.value) URL.revokeObjectURL(webmBlobUrl.value)
    webmBlobUrl.value = URL.createObjectURL(blob)
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    webmFilename.value = `visualizer_${ts}.webm`
  }

  function handleWebmDownloadClick() {
    setTimeout(dismissWebm, 2000)
  }

  function dismissWebm() {
    if (webmBlobUrl.value) URL.revokeObjectURL(webmBlobUrl.value)
    webmBlobUrl.value = null
    webmFilename.value = null
  }

  return { webmBlobUrl, webmFilename, prepareWebmDownload, handleWebmDownloadClick, dismissWebm }
}
