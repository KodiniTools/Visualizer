import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import {
  createImageGalleryPart,
  createPlaylistPart,
  createVideoGalleryPart,
} from '../../../lib/project/galleryParts'
import type { GalleryImage } from '../../../composables/useImageGallery'
import type { GalleryVideo } from '../../../composables/videoPanel/useVideoGallery'
import type { PlaylistTrack, PlayMode } from '../../../stores/playerStore'

const fakeImg = (src: string, width = 4, height = 3) =>
  ({ src, width, height }) as unknown as HTMLImageElement

describe('galleryParts', () => {
  it('Bild-Galerie: IDs und volle Dateinamen bleiben erhalten', async () => {
    const gallery = {
      imageGallery: ref<GalleryImage[]>([
        {
          id: 7.5,
          img: fakeImg('data:image/png;base64,AA'),
          name: 'ein-sehr-langer-dat...',
          fileName: 'ein-sehr-langer-dateiname.png',
          dimensions: '4×3',
          size: '1 KB',
        },
      ]),
      selectedImageIndex: ref<number | null>(null),
      selectedImageIndices: ref(new Set<number>()),
    }
    const part = createImageGalleryPart(gallery, {
      load: async (src) => (src.includes('kaputt') ? Promise.reject(new Error()) : fakeImg(src)),
    })
    const snap = part.capture()
    expect(snap.images[0]).toEqual({
      id: 7.5,
      fileName: 'ein-sehr-langer-dateiname.png',
      size: '1 KB',
      src: 'data:image/png;base64,AA',
    })

    gallery.imageGallery.value = []
    await part.apply({ images: [...snap.images, { ...snap.images[0]!, id: 8, src: 'kaputt' }] })
    expect(gallery.imageGallery.value).toHaveLength(1)
    expect(gallery.imageGallery.value[0]).toMatchObject({
      id: 7.5,
      fileName: 'ein-sehr-langer-dateiname.png',
      name: 'ein-sehr-langer-d...',
      dimensions: '4×3',
    })
    expect(gallery.selectedImageIndex.value).toBe(0)
  })

  it('Video-Galerie: liefert Dateien direkt und stellt Einträge mit ID wieder her', async () => {
    const file = new File(['v'], 'clip.webm', { type: 'video/webm' })
    const gallery = {
      videoGallery: ref<GalleryVideo[]>([
        { id: 3, name: 'clip', src: 'blob:a', file } as unknown as GalleryVideo,
      ]),
      selectedVideoIndex: ref<number | null>(0),
      clearAllVideos: vi.fn(function (this: void) {
        gallery.videoGallery.value = []
      }),
    }
    const video = { duration: 12, videoWidth: 640, videoHeight: 360 } as HTMLVideoElement
    const part = createVideoGalleryPart(gallery, {
      loadMeta: async () => video,
      loadBlob: async () => new Blob(['v'], { type: 'video/webm' }),
    })
    expect([...part.blobs!()]).toEqual([['blob:a', file]])
    const snap = part.capture()
    await part.apply({ ...snap, videos: [{ ...snap.videos[0]!, src: 'blob:neu' }] })
    expect(gallery.clearAllVideos).toHaveBeenCalled()
    expect(gallery.videoGallery.value[0]).toMatchObject({
      id: 3,
      name: 'clip',
      src: 'blob:neu',
      duration: 12,
      width: 640,
    })
    expect(gallery.videoGallery.value[0]!.file.type).toBe('video/webm')
    expect(gallery.selectedVideoIndex.value).toBe(0)
  })

  it('Playlist: Tracks, Modus und Position', () => {
    const store = {
      playlist: [
        { name: 'a.mp3', url: 'blob:1' },
        { name: 'Stille', url: 'blob:2', silent: true },
      ] as PlaylistTrack[],
      currentTrackIndex: 1,
      playMode: 'repeat-all' as PlayMode,
      clearPlaylist: vi.fn(() => {
        store.playlist = []
      }),
      loadTrack: vi.fn(),
    }
    const part = createPlaylistPart(store)
    const snap = part.capture()
    part.apply({ ...snap, currentTrackIndex: 9 })
    expect(store.clearPlaylist).toHaveBeenCalled()
    expect(store.playlist).toEqual(snap.tracks)
    expect(store.playMode).toBe('repeat-all')
    expect(store.currentTrackIndex).toBe(0)
    expect(store.loadTrack).toHaveBeenCalledWith(0)
  })
})
