// Vorschau der fertigen Aufnahme im Ergebnis-Modal (#results-panel / #preview).
// Eigene Object-URL, unabhängig vom WebM-Download (der seine URL beim
// Herunterladen/Schließen freigibt). Escape schließt; Unmount räumt auf.
import { onMounted, onUnmounted } from 'vue'

export function useRecordingPreview() {
  let previewObjectUrl = null

  function releaseUrl() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl)
      previewObjectUrl = null
    }
  }

  /** @param {Blob} blob */
  function showResults(blob) {
    const modal = document.getElementById('results-panel')
    const video = document.getElementById('preview')
    if (!modal || !video) return
    releaseUrl()
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
    releaseUrl()
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') closeResults()
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown))
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    releaseUrl()
  })

  return { showResults, closeResults }
}
