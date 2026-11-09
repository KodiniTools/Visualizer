import type { Ref } from 'vue'
import type { VideoManager, VideoObject } from '../../lib/videoManager'
import type { GalleryVideoEntry } from '../../lib/background/markerBackgroundVideo'
import { videoDisplaySeconds } from '../../lib/markerDuration'

/** Dropdown-Wert für ein hochgeladenes Video, das der Marker neu platziert */
export const CANVAS_VIDEO_GALLERY_PREFIX = 'gallery:'

/** Felder der Marker-Aktion für ein Video auf dem Canvas */
export interface MarkerCanvasVideoAction {
  /** Canvas-Video (VideoManager), das zum Marker-Zeitpunkt erscheint */
  canvasVideoId?: VideoObject['id'] | null
  canvasVideoLabel?: string | null
}

/** Platzieren eines Galerie-Videos (aus dem Video-Panel) */
export interface CanvasVideoPlacement {
  /**
   * Legt ein Galerie-Video mit den Platzierungs-Einstellungen des
   * Video-Panels auf den Canvas (ohne es auszuwählen oder zu starten).
   */
  place: (
    entry: GalleryVideoEntry,
    options: { select: boolean },
  ) => Promise<VideoObject | null | undefined>
  /** Einstellung „Wiederholen“ im Video-Panel (für die Dauer vor dem Speichern) */
  loop?: Ref<boolean>
  /** Video-Ton mit der Aufnahme verbinden (vor dem Abspielen) */
  connectAudio?: (video: VideoObject) => void
}

interface Options {
  videoManager: Ref<VideoManager | null | undefined>
  videoGallery: Ref<GalleryVideoEntry[]>
  /** Aktionen aller Marker */
  markerActions: () => (MarkerCanvasVideoAction | null | undefined)[]
  /** Läuft die Wiedergabe? (einmal laufende Videos verschwinden nach dem Ende) */
  isPlaying: () => boolean
  placement?: CanvasVideoPlacement | null
  /** Anzeigename „Video 2 — clip“ */
  formatLabel: (layer: number, name: string) => string
}

const isSetId = (v: unknown): v is VideoObject['id'] => v !== '' && v !== null && v !== undefined

/**
 * Beat-Marker „Video auf Canvas“: Ein Video aus dem VideoManager erscheint
 * erst zum Marker-Zeitpunkt, mit seiner Einblend-Animation und von vorn.
 *
 * Regeln wie bei platzierten Bildern (siehe useBeatMarkers):
 * - Wiedergabe ab 0:00 → alle zugewiesenen Videos bis zu ihrem Marker
 *   ausblenden (pausiert).
 * - Ein späterer Marker blendet Marker-Videos in Schleife aus; ein einmal
 *   laufendes Video läuft zu Ende und verschwindet dann selbst.
 * - Pause/Stopp → alle wieder sichtbar und bearbeitbar (pausiert).
 * - Spulen → alle Marker bis zur Position nachspielen, Videos an der
 *   passenden Stelle fortsetzen.
 */
export function useMarkerCanvasVideos({
  videoManager,
  videoGallery,
  markerActions,
  isPlaying,
  placement,
  formatLabel,
}: Options) {
  /** Canvas-Videos mit Ebene (wie in „Videos auf Canvas“) */
  const placedVideos = () =>
    (videoManager.value?.getAllVideos() ?? []).map((video, i) => ({ video, layer: i + 1 }))

  const findVideo = (id: unknown): VideoObject | null =>
    isSetId(id) ? (videoManager.value?.videos.find((v) => v.id === id) ?? null) : null

  /** Canvas-Videos für das Marker-Dropdown */
  const getMarkerCanvasVideos = () =>
    placedVideos().map(({ video, layer }) => ({
      id: video.id,
      layer,
      name: video.name ?? '',
      loop: video.loop,
    }))

  /** Hochgeladene Videos, die der Marker beim Speichern neu platziert */
  const getMarkerVideoGallery = () =>
    videoGallery.value.map((v, i) => ({
      value: `${CANVAS_VIDEO_GALLERY_PREFIX}${String(v.id)}`,
      number: i + 1,
      name: v.name,
    }))

  /** Galerie-Eintrag zu einem Dropdown-Wert `gallery:<id>` (sonst null) */
  const galleryEntryOf = (value: unknown): GalleryVideoEntry | null => {
    if (typeof value !== 'string' || !value.startsWith(CANVAS_VIDEO_GALLERY_PREFIX)) return null
    const id = value.slice(CANVAS_VIDEO_GALLERY_PREFIX.length)
    return videoGallery.value.find((v) => String(v.id) === id) ?? null
  }

  /** Anzeigename eines Canvas-Videos (null = nicht mehr auf dem Canvas) */
  const canvasVideoLabel = (id: unknown): string | null => {
    const entry = placedVideos().find(({ video }) => video.id === id)
    return entry ? formatLabel(entry.layer, entry.video.name ?? '') : null
  }

  /** Auswahl beim Bearbeiten: gelöschte Videos ergeben eine leere Auswahl */
  const editSelection = (id: unknown): VideoObject['id'] | '' =>
    findVideo(id) ? (id as VideoObject['id']) : ''

  /**
   * Löst die Dropdown-Auswahl auf. Ein vorhandenes Canvas-Video wird direkt
   * verwendet; ein Galerie-Eintrag wird jetzt mit den Platzierungs-
   * Einstellungen des Video-Panels angelegt (asynchron, `pending`).
   */
  const resolveSelection = (
    value: unknown,
  ): { id: VideoObject['id'] | null; pending: Promise<VideoObject | null> | null } => {
    const entry = galleryEntryOf(value)
    if (entry) {
      if (!placement) return { id: null, pending: null }
      const pending = placement
        .place(entry, { select: false })
        .then((video) => video ?? null)
        .catch(() => null)
      return { id: null, pending }
    }
    return { id: findVideo(value) ? (value as VideoObject['id']) : null, pending: null }
  }

  /** IDs aller Canvas-Videos, die einem Marker zugewiesen sind */
  const referencedIds = () => {
    const ids = new Set<VideoObject['id']>()
    for (const action of markerActions()) {
      const id = action?.canvasVideoId
      if (isSetId(id)) ids.add(id)
    }
    return ids
  }

  // Einmal laufende Marker-Videos verschwinden nach ihrem Ende (nur während
  // der Wiedergabe; bei Pause ist alles sichtbar).
  const endedHandlers = new WeakMap<HTMLVideoElement, () => void>()
  const watchEnd = (video: VideoObject) => {
    const el = video.videoElement
    if (!el || endedHandlers.has(el)) return
    const onEnded = () => {
      const vm = videoManager.value
      if (!vm || video.loop || !isPlaying() || !referencedIds().has(video.id)) return
      vm.setMarkerHidden(video.id, true)
      vm.redrawCallback()
    }
    endedHandlers.set(el, onEnded)
    el.addEventListener('ended', onEnded)
  }

  /** Wiedergabe-Start: zugewiesene Videos bis zu ihrem Marker ausblenden. */
  const activate = () => {
    const vm = videoManager.value
    if (!vm) return
    for (const id of referencedIds()) vm.setMarkerHidden(id, true)
    vm.redrawCallback()
  }

  /** Pause/Stopp: Marker-Videos wieder zeigen und anhalten. */
  const restore = () => {
    const vm = videoManager.value
    if (!vm) return
    for (const id of referencedIds()) {
      if (findVideo(id)?.isPlaying) vm.pauseVideo(id)
    }
    vm.clearMarkerHidden()
  }

  /** Videos einblenden, die keinem Marker mehr zugewiesen sind. */
  const reconcile = () => {
    const vm = videoManager.value
    if (!vm) return
    const ids = referencedIds()
    for (const id of vm.markerHiddenIds) {
      if (!ids.has(id)) vm.setMarkerHidden(id, false)
    }
    vm.redrawCallback()
  }

  /** Neu zugewiesenes Video bis zu seinem Marker ausblenden (läuft die Wiedergabe schon). */
  const hideUntilMarker = (id: VideoObject['id']) => videoManager.value?.setMarkerHidden(id, true)

  /**
   * Video-Aktion eines ausgelösten Markers: Das zugewiesene Video erscheint
   * und startet von vorn (mit Einblend-Animation). Andere Marker-Videos in
   * Schleife werden ausgeblendet; einmal laufende laufen zu Ende.
   * @param restart - false beim Nachspielen (Spulen): nur Sichtbarkeit setzen
   * @returns ID des eingeblendeten Videos (null = keins)
   */
  const apply = (action: MarkerCanvasVideoAction | null | undefined, restart = true) => {
    const vm = videoManager.value
    if (!vm) return null
    const vid = findVideo(action?.canvasVideoId) ? (action?.canvasVideoId ?? null) : null
    for (const id of referencedIds()) {
      if (id === vid) {
        vm.setMarkerHidden(id, false)
        continue
      }
      const video = findVideo(id)
      // Einmal laufendes Video endet von selbst (siehe watchEnd)
      if (video && !vm.isMarkerHidden(id) && !video.loop) continue
      vm.setMarkerHidden(id, true)
    }
    if (vid !== null && restart) {
      const video = findVideo(vid) as VideoObject
      watchEnd(video)
      if (!video.muted) placement?.connectAudio?.(video)
      vm.playVideoFrom(vid, 0)
    } else {
      vm.redrawCallback()
    }
    return vid
  }

  /**
   * Nach dem Nachspielen (Spulen/Fortsetzen): sichtbare Marker-Videos an der
   * Stelle fortsetzen, an der sie beim Abspielen von vorn wären. Einmal
   * laufende Videos, deren Ende schon erreicht ist, bleiben ausgeblendet.
   * @param triggeredAt - letzter Auslöse-Zeitpunkt je Video
   */
  const seek = (time: number, triggeredAt: Map<VideoObject['id'], number>) => {
    const vm = videoManager.value
    if (!vm) return
    for (const [id, at] of triggeredAt) {
      const video = findVideo(id)
      if (!video || vm.isMarkerHidden(id)) continue
      const offset = time - at
      const duration = video.videoElement?.duration
      if (!video.loop && duration && Number.isFinite(duration) && offset >= duration) {
        vm.setMarkerHidden(id, true)
        continue
      }
      watchEnd(video)
      if (!video.muted) placement?.connectAudio?.(video)
      vm.playVideoFrom(id, offset)
    }
    vm.redrawCallback()
  }

  /** Anzeigedauer eines Canvas-Videos (null = dauerhaft) */
  const displaySeconds = (video: VideoObject) =>
    videoDisplaySeconds(video.loop, video.videoElement?.duration || video.duration)

  /** Dauer im Formular: vorhandenes Canvas-Video oder neu zu platzierendes Galerie-Video */
  const pendingDisplaySeconds = (value: unknown): { found: boolean; seconds: number | null } => {
    const entry = galleryEntryOf(value)
    if (entry) {
      return {
        found: true,
        seconds: videoDisplaySeconds(placement?.loop?.value ?? true, entry.duration),
      }
    }
    const video = findVideo(value)
    return video ? { found: true, seconds: displaySeconds(video) } : { found: false, seconds: null }
  }

  return {
    getMarkerCanvasVideos,
    getMarkerVideoGallery,
    getMarkerCanvasVideo: findVideo,
    canvasVideoLabel,
    editSelection,
    resolveSelection,
    referencedIds,
    activate,
    restore,
    reconcile,
    hideUntilMarker,
    apply,
    seek,
    displaySeconds,
    pendingDisplaySeconds,
  }
}
