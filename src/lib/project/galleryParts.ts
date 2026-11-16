/**
 * Projekt-Teile für Bild-Galerie, Video-Galerie und Playlist.
 *
 * Beat-Marker verweisen per `galleryId` (Ersatz: Name) auf Galerie-Einträge
 * und per URL (Ersatz: Name) auf Playlist-Tracks. Deshalb werden IDs und
 * Namen unverändert wiederhergestellt; die URLs passt projectAssets an.
 */
import type { Ref } from 'vue'
import type { ProjectPart } from './projectParts'
import type { GalleryImage } from '../../composables/useImageGallery'
import type { GalleryVideo } from '../../composables/videoPanel/useVideoGallery'
import type { PlaylistTrack, PlayMode } from '../../stores/playerStore'

// ── Bild-Galerie ────────────────────────────────────────────────────────────

export interface ImageGallerySnapshot {
  images: { id: number; fileName: string; size: string; src: string }[]
}

export interface ImageGalleryTarget {
  imageGallery: Ref<GalleryImage[]>
  selectedImageIndex: Ref<number | null>
  selectedImageIndices: Ref<Set<number>>
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Bild nicht ladbar'))
    img.src = src
  })
}

const shorten = (name: string) => (name.length > 20 ? name.substring(0, 17) + '...' : name)

export function createImageGalleryPart(
  gallery: ImageGalleryTarget,
  { load = loadImage }: { load?: (src: string) => Promise<HTMLImageElement> } = {},
): ProjectPart<ImageGallerySnapshot> {
  return {
    order: 10,
    capture: () => ({
      images: gallery.imageGallery.value
        .filter((entry) => typeof entry.img?.src === 'string' && entry.img.src !== '')
        .map((entry) => ({
          id: entry.id,
          fileName: entry.fileName || entry.name,
          size: entry.size,
          src: entry.img.src,
        })),
    }),
    async apply(snapshot) {
      const list = Array.isArray(snapshot?.images) ? snapshot.images : []
      const loaded = await Promise.all(
        list.map(async (item): Promise<GalleryImage | null> => {
          try {
            const img = await load(item.src)
            const name = String(item.fileName || 'Bild')
            return {
              id: item.id,
              img,
              name: shorten(name),
              fileName: name,
              dimensions: `${img.width}×${img.height}`,
              size: String(item.size ?? ''),
            }
          } catch {
            console.warn('⚠️ [Projekt] Galerie-Bild nicht ladbar:', item.fileName)
            return null
          }
        }),
      )
      gallery.imageGallery.value = loaded.filter((e): e is GalleryImage => e !== null)
      const hasImages = gallery.imageGallery.value.length > 0
      gallery.selectedImageIndex.value = hasImages ? 0 : null
      gallery.selectedImageIndices.value = new Set(hasImages ? [0] : [])
    },
  }
}

// ── Video-Galerie ───────────────────────────────────────────────────────────

export interface VideoGallerySnapshot {
  videos: { id: number; name: string; src: string; type: string }[]
  selectedIndex: number | null
}

export interface VideoGalleryTarget {
  videoGallery: Ref<GalleryVideo[]>
  selectedVideoIndex: Ref<number | null>
  clearAllVideos(): void
}

/** Lädt die Metadaten eines Videos (Dauer, Größe). */
export type VideoMetaLoader = (src: string) => Promise<HTMLVideoElement>

export function createVideoGalleryPart(
  gallery: VideoGalleryTarget,
  {
    loadMeta,
    loadBlob = async (src: string) => (await fetch(src)).blob(),
  }: { loadMeta: VideoMetaLoader; loadBlob?: (src: string) => Promise<Blob> },
): ProjectPart<VideoGallerySnapshot> {
  return {
    order: 20,
    capture: () => ({
      videos: gallery.videoGallery.value.map((v) => ({
        id: v.id,
        name: v.name,
        src: v.src,
        type: v.file?.type || '',
      })),
      selectedIndex: gallery.selectedVideoIndex.value,
    }),
    *blobs() {
      for (const v of gallery.videoGallery.value) {
        if (v.file && v.src) yield [v.src, v.file] as const
      }
    },
    async apply(snapshot) {
      const list = Array.isArray(snapshot?.videos) ? snapshot.videos : []
      const restored = await Promise.all(
        list.map(async (item): Promise<GalleryVideo | null> => {
          try {
            const [video, blob] = await Promise.all([loadMeta(item.src), loadBlob(item.src)])
            return {
              id: item.id,
              name: item.name,
              src: item.src,
              file: new File([blob], item.name, { type: item.type || blob.type }),
              videoElement: video,
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
            }
          } catch {
            console.warn('⚠️ [Projekt] Galerie-Video nicht ladbar:', item.name)
            return null
          }
        }),
      )
      gallery.clearAllVideos()
      gallery.videoGallery.value = restored.filter((v): v is GalleryVideo => v !== null)
      const index = snapshot?.selectedIndex
      gallery.selectedVideoIndex.value =
        typeof index === 'number' && index >= 0 && index < gallery.videoGallery.value.length
          ? index
          : gallery.videoGallery.value.length > 0
            ? 0
            : null
    },
  }
}

// ── Playlist ────────────────────────────────────────────────────────────────

export interface PlaylistSnapshot {
  tracks: PlaylistTrack[]
  currentTrackIndex: number
  playMode: PlayMode
}

export interface PlaylistTarget {
  playlist: PlaylistTrack[]
  currentTrackIndex: number
  playMode: PlayMode
  clearPlaylist(): void
  loadTrack(index: number): void
}

const PLAY_MODES: readonly PlayMode[] = ['none', 'sequence', 'repeat-one', 'repeat-all', 'shuffle']

export function createPlaylistPart(store: PlaylistTarget): ProjectPart<PlaylistSnapshot> {
  return {
    order: 30,
    capture: () => ({
      tracks: store.playlist.map((t) => ({
        name: t.name,
        url: t.url,
        ...(t.silent ? { silent: true } : {}),
      })),
      currentTrackIndex: store.currentTrackIndex,
      playMode: store.playMode,
    }),
    apply(snapshot) {
      const tracks = (Array.isArray(snapshot?.tracks) ? snapshot.tracks : []).filter(
        (t) => typeof t?.url === 'string' && t.url !== '',
      )
      store.clearPlaylist()
      store.playlist = tracks.map((t) => ({
        name: String(t.name ?? ''),
        url: t.url,
        ...(t.silent ? { silent: true } : {}),
      }))
      if (PLAY_MODES.includes(snapshot?.playMode)) store.playMode = snapshot.playMode
      const index = snapshot?.currentTrackIndex
      store.currentTrackIndex =
        Number.isInteger(index) && index >= 0 && index < tracks.length ? index : 0
      if (tracks.length > 0) store.loadTrack(store.currentTrackIndex)
    },
  }
}
