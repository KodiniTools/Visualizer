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
import { captureImageBackground, clearCanvasVideoBackgrounds } from './backgroundMedia.js'

const cloneJson = (obj) => JSON.parse(JSON.stringify(obj))

/**
 * Vorgaben (Ziel + Audio-Reaktiv) des aktuell gesetzten Hintergrund-Bildes.
 * @param {object|null} cm - CanvasManager
 * @returns {{ target: 'workspace'|'background', audioReactive: object|null } | null}
 */
export function captureBackgroundImageDefaults(cm) {
  const current = captureImageBackground(cm)
  if (!current) return null
  return {
    target: current.target === 'workspace' ? 'workspace' : 'background',
    audioReactive: current.settings?.audioReactive
      ? cloneJson(current.settings.audioReactive)
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
export function resolveBackgroundImageDefaults(cm, stored = null) {
  const live = captureBackgroundImageDefaults(cm)
  if (live) return live
  if (stored && typeof stored === 'object') {
    return {
      target: stored.target === 'workspace' ? 'workspace' : 'background',
      audioReactive: stored.audioReactive ? cloneJson(stored.audioReactive) : null,
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
export function setBackgroundImageWithDefaults(cm, img, defaults) {
  if (!cm || !img) return null
  clearCanvasVideoBackgrounds(cm)

  const useWorkspace = defaults?.target === 'workspace' && !!cm.workspacePreset
  let target = null
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
export function findGalleryImage(gallery, ref) {
  if (!Array.isArray(gallery) || !ref) return null
  return (
    gallery.find((g) => g.id === ref.galleryId) ||
    (ref.name ? gallery.find((g) => g.name === ref.name) : null) ||
    null
  )
}
