import { ref } from 'vue'

export function useWebmExport() {
  const webmBlobUrl = ref<string | null>(null)
  const webmFilename = ref<string | null>(null)

  function prepareWebmDownload(blob: Blob): void {
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
