import { ref } from 'vue'
import { createVideoElement } from './videoElements'

const VALID_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']

/** Hochgeladenes Video der Galerie */
export interface GalleryVideo {
  id: number
  name: string
  /** Blob-URL */
  src: string
  file: File
  videoElement: HTMLVideoElement
  duration: number
  width: number
  height: number
}

/**
 * Galerie hochgeladener Videos (Blob-URLs): Upload per Dialog oder Drop,
 * Auswahl, Löschen. Blob-URLs werden beim Entfernen freigegeben.
 */
export function useVideoGallery() {
  const fileInputRef = ref<HTMLInputElement | null>(null)
  const videoGallery = ref<GalleryVideo[]>([])
  const selectedVideoIndex = ref<number | null>(null)

  function triggerFileInput() {
    fileInputRef.value?.click()
  }

  function handleDrop(e: DragEvent) {
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      processVideoFile(files[0] as File)
    }
  }

  function handleVideoUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      processVideoFile(file)
    }
    // Eingabe zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }

  function processVideoFile(file: File) {
    if (!VALID_VIDEO_TYPES.includes(file.type)) {
      console.error('Ungültiger Video-Typ:', file.type)
      return
    }

    const url = URL.createObjectURL(file)
    // Nur Metadaten laden (Dauer, Größe)
    const video = createVideoElement(url, { preload: 'metadata' })

    video.onloadedmetadata = () => {
      const videoData: GalleryVideo = {
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

  function generateThumbnail(event: Event, _index?: number) {
    // Zum ersten Frame springen, damit ein Vorschaubild erscheint
    ;(event.target as HTMLVideoElement).currentTime = 0.1
  }

  function selectVideo(index: number) {
    selectedVideoIndex.value = index
  }

  function deleteVideo(index: number) {
    const video = videoGallery.value[index] as GalleryVideo
    if (video.src) {
      URL.revokeObjectURL(video.src)
    }
    videoGallery.value.splice(index, 1)

    if (selectedVideoIndex.value === index) {
      selectedVideoIndex.value = videoGallery.value.length > 0 ? 0 : null
    } else if (selectedVideoIndex.value !== null && selectedVideoIndex.value > index) {
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
