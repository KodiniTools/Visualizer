/**
 * Beat-Marker „Video“: setzt ein hochgeladenes Video aus dem Video-Panel als
 * Hintergrund und startet es zum Marker-Zeitpunkt von vorne (stumm, in
 * Schleife – wie jeder Video-Hintergrund).
 *
 * Wie beim Hintergrund-Bild-Marker werden Format (Workspace oder Normal) und
 * Audio-Reaktiv vom gerade sichtbaren Hintergrund übernommen (Bild oder
 * Video), ersatzweise aus den beim Speichern gemerkten Vorgaben.
 */
import { captureVideoBackground, type BackgroundCanvasManager } from './backgroundMedia'
import {
  captureBackgroundImageDefaults,
  type BackgroundImageDefaults,
  type BackgroundTarget,
} from './markerBackgroundImage'

const cloneJson = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))

type MaybeCm = BackgroundCanvasManager | null | undefined

/** Eintrag der Video-Galerie (Ausschnitt von GalleryVideo) */
export interface GalleryVideoEntry {
  id: unknown
  name: string
  /** Blob-URL des hochgeladenen Videos */
  src: string
}

/** Im Marker gespeicherter Verweis (kein Videoinhalt) */
export interface MarkerVideoRef {
  galleryId?: unknown
  name?: string
  defaults?: BackgroundImageDefaults | null
  /** false = nur einmal abspielen; fehlt das Feld, läuft das Video in Schleife */
  loop?: boolean
}

/** Läuft das Marker-Video in Schleife? (Standard: ja, auch für alte Marker) */
export const isMarkerVideoLoop = (ref: MarkerVideoRef | null | undefined): boolean =>
  ref?.loop !== false

/**
 * Vorgaben (Ziel + Audio-Reaktiv) des sichtbaren Hintergrunds: zuerst ein
 * Hintergrund-Bild, sonst ein Video-Hintergrund.
 */
export function captureBackgroundMediaDefaults(cm: MaybeCm): BackgroundImageDefaults | null {
  const image = captureBackgroundImageDefaults(cm)
  if (image) return image
  const video = captureVideoBackground(cm)
  if (!video) return null
  const ar = video.settings?.audioReactive
  return {
    target: video.target === 'workspace' ? 'workspace' : 'background',
    audioReactive: ar && typeof ar === 'object' ? cloneJson(ar) : null,
  }
}

/**
 * Sichtbarer Hintergrund vor gespeicherten Vorgaben vor „Normal ohne
 * Audio-Reaktiv“.
 */
export function resolveBackgroundMediaDefaults(
  cm: MaybeCm,
  stored: unknown = null,
): BackgroundImageDefaults {
  const live = captureBackgroundMediaDefaults(cm)
  if (live) return live
  if (stored && typeof stored === 'object') {
    const s = stored as { target?: unknown; audioReactive?: object | null }
    return {
      target: s.target === 'workspace' ? 'workspace' : 'background',
      audioReactive: s.audioReactive ? cloneJson(s.audioReactive) : null,
    }
  }
  return { target: 'background', audioReactive: null }
}

/**
 * Sucht das Galerie-Video eines Markers: per id, sonst per Name (z. B. nach
 * erneutem Hochladen derselben Datei).
 */
export function findGalleryVideo<T extends GalleryVideoEntry>(
  gallery: readonly T[] | null | undefined,
  ref: MarkerVideoRef | null | undefined,
): T | null {
  if (!Array.isArray(gallery) || !ref) return null
  return (
    gallery.find((v) => v.id === ref.galleryId) ||
    (ref.name ? gallery.find((v) => v.name === ref.name) : null) ||
    null
  )
}

/**
 * Legt ein neues Video-Element für den Marker an (das Galerie-Element wird nie
 * wiederverwendet). `onReady` läuft, sobald das erste Bild geladen ist.
 */
export function loadMarkerVideo(
  src: string,
  onReady: (video: HTMLVideoElement) => void,
): HTMLVideoElement {
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.preload = 'auto'
  video.muted = true
  video.loop = true
  video.playsInline = true
  video.onloadeddata = () => onReady(video)
  video.onerror = () => {
    // Beim Freigeben (src = '') feuert ebenfalls ein Fehler – kein Ladefehler.
    if (video.src !== src) return
    console.error('❌ Marker-Video konnte nicht geladen werden:', src)
  }
  video.src = src
  video.load()
  return video
}

/**
 * Setzt ein geladenes Video als Hintergrund mit den übernommenen Vorgaben und
 * startet es von vorne (`loop: false` = nur einmal abspielen). Workspace-Ziel ohne aktiven Workspace fällt auf den
 * normalen Hintergrund zurück. Vorhandene Video-Hintergründe muss der Aufrufer
 * vorher abräumen (releaseVideoBackgrounds).
 * @returns tatsächlich verwendetes Ziel (null ohne CanvasManager/Video)
 */
export function setBackgroundVideoWithDefaults(
  cm: MaybeCm,
  video: HTMLVideoElement | null | undefined,
  defaults: Partial<BackgroundImageDefaults> | null | undefined,
  { loop = true }: { loop?: boolean } = {},
): BackgroundTarget | null {
  if (!cm || !video) return null

  let target: BackgroundTarget
  if (defaults?.target === 'workspace' && cm.workspacePreset) {
    cm.setWorkspaceVideoBackground(video)
    target = 'workspace'
  } else {
    cm.setVideoBackground(video)
    target = 'background'
  }

  // set(Workspace)VideoBackground schaltet immer auf Schleife → danach setzen
  video.loop = loop
  const entry = target === 'workspace' ? cm.workspaceVideoBackground : cm.videoBackground
  if (entry) (entry as { loop?: boolean }).loop = loop
  if (entry && defaults?.audioReactive) {
    if (!entry.fotoSettings) entry.fotoSettings = {}
    entry.fotoSettings.audioReactive = cloneJson(defaults.audioReactive)
  }

  try {
    video.currentTime = 0
  } catch {
    /* ignore */
  }
  Promise.resolve()
    .then(() => video.play())
    .catch(() => {})

  cm.redrawCallback?.()
  cm.updateUICallback?.()
  return target
}
