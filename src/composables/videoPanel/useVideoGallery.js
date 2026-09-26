import { ref } from 'vue'
import { createVideoElement } from './videoElements.js'

const VALID_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']

/**
 * Galerie hochgeladener Videos (Blob-URLs): Upload per Dialog oder Drop,
 * Auswahl, Löschen. Blob-URLs werden beim Entfernen freigegeben.
 */
export function useVideoGallery() {
  const fileInputRef = ref(null)
  const videoGallery = ref([])
  const selectedVideoIndex = ref(null)

  function triggerFileInput() {
    fileInputRef.value?.click()
  }

  function handleDrop(e) {
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      processVideoFile(files[0])
    }
  }

  function handleVideoUpload(e) {
    const file = e.target.files?.[0]
    if (file) {
      processVideoFile(file)
    }
    // Eingabe zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }

  function processVideoFile(file) {
    if (!VALID_VIDEO_TYPES.includes(file.type)) {
      console.error('Ungültiger Video-Typ:', file.type)
      return
    }

    const url = URL.createObjectURL(file)
    // Nur Metadaten laden (Dauer, Größe)
    const video = createVideoElement(url, { preload: 'metadata' })

    video.onloadedmetadata = () => {
      const videoData = {
        id: Date.now() + Math.random(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        src: url,
        file: file,
        videoElement: video,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      }

      videoGallery.value.push(videoData)
      selectedVideoIndex.value = videoGallery.value.length - 1

      console.log(
        '✅ Video geladen:',
        videoData.name,
        `${videoData.width}x${videoData.height}`,
        `${videoData.duration.toFixed(1)}s`,
      )
    }

    video.onerror = () => {
      console.error('❌ Fehler beim Laden des Videos:', file.name)
      URL.revokeObjectURL(url)
    }

    video.load()
  }

  function generateThumbnail(event, index) {
    // Zum ersten Frame springen, damit ein Vorschaubild erscheint
    event.target.currentTime = 0.1
  }

  function selectVideo(index) {
    selectedVideoIndex.value = index
  }

  function deleteVideo(index) {
    const video = videoGallery.value[index]
    if (video.src) {
      URL.revokeObjectURL(video.src)
    }
    videoGallery.value.splice(index, 1)

    if (selectedVideoIndex.value === index) {
      selectedVideoIndex.value = videoGallery.value.length > 0 ? 0 : null
    } else if (selectedVideoIndex.value > index) {
      selectedVideoIndex.value--
    }
  }

  function clearAllVideos() {
    videoGallery.value.forEach((video) => {
      if (video.src) {
        URL.revokeObjectURL(video.src)
      }
    })
    videoGallery.value = []
    selectedVideoIndex.value = null
  }

  /** Ausgewähltes Galerie-Video (null ohne Auswahl). */
  function selectedVideo() {
    if (selectedVideoIndex.value === null) return null
    return videoGallery.value[selectedVideoIndex.value] || null
  }

  return {
    fileInputRef,
    videoGallery,
    selectedVideoIndex,
    triggerFileInput,
    handleDrop,
    handleVideoUpload,
    processVideoFile,
    generateThumbnail,
    selectVideo,
    deleteVideo,
    clearAllVideos,
    selectedVideo,
  }
}
