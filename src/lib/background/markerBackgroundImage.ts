/**
 * Beat-Marker „Hintergrund-Bild“: setzt ein Bild aus der eigenen Bildgalerie
 * als Hintergrund und übernimmt dabei vom vorherigen Hintergrund-Bild
 *  - das Canvas-Format (Ziel): Workspace- oder normaler Hintergrund,
 *  - die Audio-Reaktiv-Einstellungen (fotoSettings.audioReactive).
 *
 * „Vorheriges Bild“ ist das Hintergrund-Bild, das beim Auslösen gerade zu
 * sehen ist. Gibt es keins (z. B. Farb-Hintergrund), gelten die Vorgaben, die
 * beim Speichern des Markers vom damaligen Hintergrund-Bild gemerkt wurden.
 */
import {
  captureImageBackground,
  clearCanvasVideoBackgrounds,
  removeVideoBackground,
  type BackgroundCanvasManager,
  type ImageBackgroundEntry,
  type VideoBackgroundEntry,
} from './backgroundMedia'

const cloneJson = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))

type MaybeCm = BackgroundCanvasManager | null | undefined
export type BackgroundTarget = 'workspace' | 'background'

export interface BackgroundImageDefaults {
  target: BackgroundTarget
  audioReactive: object | null
}

export interface BaseBackground {
  background: BackgroundCanvasManager['background']
  workspaceBackground: ImageBackgroundEntry | null
  /** Video-Hintergründe von vorher (werden nur pausiert, nicht freigegeben) */
  videoBackground?: VideoBackgroundEntry | null
  workspaceVideoBackground?: VideoBackgroundEntry | null
  /** Liefen die Videos beim Erfassen? (wird beim Wiederherstellen fortgesetzt) */
  videoPlaying?: Partial<Record<VideoKey, boolean>>
}

type VideoKey = 'videoBackground' | 'workspaceVideoBackground'
const VIDEO_KEYS: readonly VideoKey[] = ['videoBackground', 'workspaceVideoBackground']

export interface GalleryImageEntry {
  id: unknown
  name: string
  img: HTMLImageElement
}

/**
 * Vorgaben (Ziel + Audio-Reaktiv) des aktuell gesetzten Hintergrund-Bildes.
 * @param {object|null} cm - CanvasManager
 * @returns {{ target: 'workspace'|'background', audioReactive: object|null } | null}
 */
export function captureBackgroundImageDefaults(cm: MaybeCm): BackgroundImageDefaults | null {
  const current = captureImageBackground(cm)
  if (!current) return null
  return {
    target: current.target === 'workspace' ? 'workspace' : 'background',
    audioReactive: current.settings?.audioReactive
      ? cloneJson(current.settings.audioReactive as object)
      : null,
  }
}

/**
 * Wählt die zu übernehmenden Vorgaben: zuerst das gerade sichtbare
 * Hintergrund-Bild, sonst die im Marker gespeicherten Vorgaben, sonst
 * normaler Hintergrund ohne Audio-Reaktiv.
 * @param {object|null} cm
 * @param {object|null} [stored] - action.backgroundImage.defaults
 */
export function resolveBackgroundImageDefaults(
  cm: MaybeCm,
  stored: unknown = null,
): BackgroundImageDefaults {
  const live = captureBackgroundImageDefaults(cm)
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
 * Setzt ein Bild-Element als Hintergrund mit den übernommenen Vorgaben.
 * Workspace-Ziel ohne aktiven Workspace fällt auf den normalen Hintergrund
 * zurück. Laufende Video-Hintergründe werden entfernt (sie lägen sonst über
 * dem Bild).
 * @param {object|null} cm - CanvasManager
 * @param {HTMLImageElement} img
 * @param {{ target: string, audioReactive: object|null }} defaults
 * @returns {'workspace'|'background'|null} tatsächlich verwendetes Ziel
 */
export function setBackgroundImageWithDefaults(
  cm: MaybeCm,
  img: HTMLImageElement | null | undefined,
  defaults: Partial<BackgroundImageDefaults> | null | undefined,
): BackgroundTarget | null {
  if (!cm || !img) return null
  clearCanvasVideoBackgrounds(cm)

  const useWorkspace = defaults?.target === 'workspace' && !!cm.workspacePreset
  let target: BackgroundTarget
  if (useWorkspace && cm.setWorkspaceBackground(img)) {
    target = 'workspace'
  } else {
    cm.setBackground(img)
    target = 'background'
  }

  const bg = target === 'workspace' ? cm.workspaceBackground : cm.background
  if (bg && typeof bg === 'object' && defaults?.audioReactive) {
    if (!bg.fotoSettings) bg.fotoSettings = {}
    bg.fotoSettings.audioReactive = cloneJson(defaults.audioReactive)
  }
  cm.redrawCallback?.()
  cm.updateUICallback?.()
  return target
}

/**
 * Sucht das Galerie-Bild eines Markers: per id, sonst per Name (z. B. nach
 * erneutem Hochladen derselben Datei).
 * @param {Array<{ id: any, name: string, img: HTMLImageElement }>} gallery
 * @param {{ galleryId?: any, name?: string }} ref
 */
export function findGalleryImage(
  gallery: GalleryImageEntry[] | null | undefined,
  ref: { galleryId?: unknown; name?: string } | null | undefined,
): GalleryImageEntry | null {
  if (!Array.isArray(gallery) || !ref) return null
  return (
    gallery.find((g) => g.id === ref.galleryId) ||
    (ref.name ? gallery.find((g) => g.name === ref.name) : null) ||
    null
  )
}

/**
 * Merkt sich den Hintergrund, der vor dem ersten Hintergrund-Bild- bzw.
 * Video-Marker zu sehen war (Bild-/Video-Objekte bzw. Farb-String unverändert,
 * inkl. Foto-Settings und Wiedergabe-Zustand der Videos).
 * @param {object|null} cm - CanvasManager
 * @returns {{ background: any, workspaceBackground: any } | null}
 */
export function captureBaseBackground(cm: MaybeCm): BaseBackground | null {
  if (!cm) return null
  const videoPlaying: Partial<Record<VideoKey, boolean>> = {}
  for (const key of VIDEO_KEYS) {
    const el = cm[key]?.videoElement
    if (el) videoPlaying[key] = !el.paused
  }
  return {
    background: cm.background ?? null,
    workspaceBackground: cm.workspaceBackground ?? null,
    videoBackground: cm.videoBackground ?? null,
    workspaceVideoBackground: cm.workspaceVideoBackground ?? null,
    videoPlaying,
  }
}

/**
 * Räumt die Video-Hintergründe vor einem neuen Marker-Hintergrund ab: Videos
 * aus der gemerkten Basis werden nur pausiert und abgehängt (sie kommen beim
 * Wiederherstellen zurück), alle anderen (z. B. Marker-Videos) werden gestoppt
 * und freigegeben.
 * @param {object|null} cm - CanvasManager
 * @param {object|null} base - captureBaseBackground-Ergebnis
 */
export function releaseVideoBackgrounds(
  cm: MaybeCm,
  base: BaseBackground | null | undefined,
): void {
  if (!cm) return
  for (const key of VIDEO_KEYS) {
    const entry = cm[key]
    if (!entry) continue
    if (base && entry === base[key]) {
      try {
        entry.videoElement?.pause()
      } catch {
        /* ignore */
      }
      cm[key] = null
    } else {
      removeVideoBackground(cm, key, { safe: true })
    }
  }
}

/**
 * Gibt die Videos einer nicht mehr benötigten Basis frei, sofern sie nicht
 * gerade auf dem Canvas liegen (z. B. wenn ein Hintergrund-Preset die Basis
 * ersetzt).
 */
export function discardBaseBackground(cm: MaybeCm, base: BaseBackground | null | undefined): void {
  if (!base) return
  for (const key of VIDEO_KEYS) {
    const entry = base[key]
    if (!entry || (cm && (cm.videoBackground === entry || cm.workspaceVideoBackground === entry)))
      continue
    const el = entry.videoElement
    if (!el) continue
    try {
      el.pause()
    } catch {
      /* ignore */
    }
    el.src = ''
  }
}

/**
 * Stellt den mit captureBaseBackground gemerkten Hintergrund wieder her.
 * @param {object|null} cm - CanvasManager
 * @param {{ background: any, workspaceBackground: any } | null} base
 * @returns {boolean} true, wenn etwas wiederhergestellt wurde
 */
export function restoreBaseBackground(
  cm: MaybeCm,
  base: BaseBackground | null | undefined,
): boolean {
  if (!cm || !base) return false
  // Marker-Videos stoppen und freigeben, Basis-Videos wieder einhängen
  for (const key of VIDEO_KEYS) {
    const baseEntry = base[key] ?? null
    if (cm[key] && cm[key] !== baseEntry) removeVideoBackground(cm, key, { safe: true })
    cm[key] = baseEntry
    if (baseEntry?.videoElement && base.videoPlaying?.[key]) {
      Promise.resolve()
        .then(() => baseEntry.videoElement?.play())
        .catch(() => {})
    }
  }
  cm.background = base.background
  cm.workspaceBackground = base.workspaceBackground
  cm.activeObject = null
  cm.redrawCallback?.()
  cm.updateUICallback?.()
  return true
}
