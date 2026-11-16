import { onUnmounted } from 'vue'
import { projectParts } from '../lib/project/projectParts'
import {
  createImageGalleryPart,
  createPlaylistPart,
  createVideoGalleryPart,
} from '../lib/project/galleryParts'
import { useImageGallery } from './useImageGallery'
import { usePlayerStore } from '../stores/playerStore'
import { createVideoElement } from './videoPanel/videoElements'
import type { VideoGalleryTarget } from '../lib/project/galleryParts'

/** Lädt nur die Metadaten eines Videos (wie beim Upload in die Galerie). */
function loadVideoMeta(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = createVideoElement(src, { preload: 'metadata' })
    video.onloadedmetadata = () => resolve(video)
    video.onerror = () => reject(new Error('Video nicht ladbar'))
    video.load()
  })
}

/**
 * Meldet Bild-Galerie, Video-Galerie und Playlist als Projekt-Teile an.
 * Aufruf einmal in der immer gemounteten Player-Leiste, die die
 * Video-Galerie besitzt.
 */
export function useProjectSetup({ videoGallery }: { videoGallery: VideoGalleryTarget }) {
  const unregister = [
    projectParts.register('imageGallery', createImageGalleryPart(useImageGallery())),
    projectParts.register(
      'videoGallery',
      createVideoGalleryPart(videoGallery, { loadMeta: loadVideoMeta }),
    ),
    projectParts.register('playlist', createPlaylistPart(usePlayerStore())),
  ]
  onUnmounted(() => unregister.forEach((fn) => fn()))
}
