/**
 * History-Segmente für Canvas-Objekte: Texte, Bilder, Videos.
 *
 * Grundsätze
 * - Objekte werden über ihre `id` identifiziert und beim Wiederherstellen
 *   IN-PLACE gepatcht. Auswahl, Panels, WeakMaps (Audio-Hüllkurven) und die
 *   Lösch-Closures halten Referenzen auf diese Objekte.
 * - Entfernte Objekte bleiben in einem Pool (id → Objekt) und werden bei
 *   Undo/Redo samt ihrem Bild-/Video-Element wiederverwendet.
 * - Laufzeitfelder (Animation, Filter-Caches, Slideshow-Bilder, DOM-Elemente)
 *   stehen nicht im Snapshot.
 */
import { mediaRegistry, loadImageElement } from '../mediaRegistry.js'
import { assignDeep, clone } from './storeSegments.js'

/**
 * Kopie von fotoSettings ohne interne Cache-Felder (`_cachedFilterKey` …),
 * die der Renderer pro Frame schreibt.
 */
export function cleanFotoSettings(fotoSettings) {
  if (!fotoSettings) return null
  const out = clone(fotoSettings)
  for (const key of Object.keys(out)) {
    if (key.startsWith('_')) delete out[key]
  }
  return out
}

/** fotoSettings in-place übernehmen (Objekt-Identität von audioReactive bleibt). */
export function applyFotoSettings(target, snapFotoSettings) {
  if (!snapFotoSettings) return
  if (target.fotoSettings && typeof target.fotoSettings === 'object') {
    assignDeep(target.fotoSettings, snapFotoSettings)
  } else {
    target.fotoSettings = clone(snapFotoSettings)
  }
}

export function videoSourceOf(videoElement) {
  if (!videoElement) return null
  return videoElement.getAttribute?.('src') || videoElement.currentSrc || videoElement.src || null
}

function isLiveVideo(videoElement) {
  return Boolean(videoElement && videoSourceOf(videoElement))
}

/**
 * Erzeugt ein Video-Element neu (nur nötig, wenn das alte zerstört wurde,
 * z. B. durch Reset mit `src = ''`).
 */
export function recreateVideoElement(src, { loop = true, muted = true, playbackRate = 1 } = {}) {
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.playsInline = true
  video.loop = loop
  video.muted = muted
  video.playbackRate = playbackRate
  video.src = src
  mediaRegistry.remember(src, video)
  return video
}

/** Hebt die Auswahl auf, wenn das aktive Objekt nicht mehr existiert. */
function dropStaleSelection(cm, type, liveIds) {
  if (!cm) return
  const active = cm.activeObject
  if (active && active.type === type && !liveIds.has(active.id)) {
    if (typeof cm.setActiveObject === 'function') cm.setActiveObject(null)
    else cm.activeObject = null
  }
  if (Array.isArray(cm.selectedObjects) && cm.selectedObjects.length) {
    const kept = cm.selectedObjects.filter((o) => o.type !== type || liveIds.has(o.id))
    if (kept.length !== cm.selectedObjects.length) cm.selectedObjects = kept
  }
}

/** Stabiler Vergleich für gemischte IDs (Zahl oder String). */
function compareIds(a, b) {
  const ta = typeof a
  const tb = typeof b
  if (ta !== tb) return ta < tb ? -1 : 1
  return a < b ? -1 : a > b ? 1 : 0
}

// ── Texte ───────────────────────────────────────────────────────────────────

// relWidth/relHeight werden bei Auswahl/Resize neu berechnet (nur Basis für
// Resize-Verhältnisse) → nicht vergleichen, sonst entstehen Phantom-Schritte.
const TEXT_RUNTIME_KEYS = ['relWidth', 'relHeight']

function captureText(textObj) {
  const snap = clone(textObj)
  for (const key of TEXT_RUNTIME_KEYS) delete snap[key]
  if (snap.animation) delete snap.animation._state
  return snap
}

/**
 * @param {() => any} getCanvasManager
 * @param {Object} [opts]
 * @param {(snap: Object) => Object} [opts.createText] - erzeugt ein neues Text-Objekt
 *   (Fallback, falls ein Objekt weder live noch im Pool existiert)
 */
export function createTextsSegment(getCanvasManager, { createText } = {}) {
  const pool = new Map()

  return {
    label: 'texts',
    order: 70,
    capture() {
      const tm = getCanvasManager()?.textManager
      if (!tm) return null
      // Sortiert nach ID: Die Auswahl eines Textes verschiebt ihn nach oben
      // (moveToTop) – reine Auswahl soll keinen Verlaufsschritt erzeugen.
      const texts = [...tm.textObjects]
      for (const t of texts) pool.set(t.id, t)
      return texts.sort((a, b) => compareIds(a.id, b.id)).map(captureText)
    },
    apply(snapshot) {
      const cm = getCanvasManager()
      const tm = cm?.textManager
      if (!tm || !Array.isArray(snapshot)) return

      const liveById = new Map(tm.textObjects.map((t) => [t.id, t]))
      const wanted = new Set(snapshot.map((s) => s.id))
      const restored = []

      for (const snap of snapshot) {
        let obj = liveById.get(snap.id) ?? pool.get(snap.id)
        if (!obj) {
          obj = createText ? createText(snap) : { ...clone(snap) }
        }
        const runtimeState = obj.animation?._state
        for (const [key, value] of Object.entries(snap)) {
          if (value && typeof value === 'object' && !Array.isArray(value) && obj[key]) {
            assignDeep(obj[key], value)
          } else {
            obj[key] = clone(value)
          }
        }
        if (runtimeState && obj.animation) obj.animation._state = runtimeState
        pool.set(obj.id, obj)
        if (!liveById.has(snap.id)) restored.push(obj)
      }

      // Bestehende Reihenfolge (Ebenen) beibehalten, Entferntes raus,
      // Wiederhergestelltes oben anfügen.
      const next = tm.textObjects.filter((t) => wanted.has(t.id)).concat(restored)
      tm.textObjects.splice(0, tm.textObjects.length, ...next)

      dropStaleSelection(cm, 'text', wanted)
    },
  }
}

// ── Bilder ──────────────────────────────────────────────────────────────────

function captureImage(img) {
  const src = img.imageObject?.src || null
  return {
    id: img.id,
    type: img.type || 'image',
    media: src ? mediaRegistry.remember(src, img.imageObject) : null,
    relX: img.relX,
    relY: img.relY,
    relWidth: img.relWidth,
    relHeight: img.relHeight,
    settings: clone(img.settings ?? null),
    fotoSettings: cleanFotoSettings(img.fotoSettings),
  }
}

async function ensureImageElement(obj, mediaKey) {
  const src = mediaRegistry.resolve(mediaKey)
  if (!src) return
  if (obj.imageObject && obj.imageObject.src === src) return
  try {
    obj.imageObject = await loadImageElement(src)
  } catch (error) {
    console.warn('⚠️ [History] Bild konnte nicht wiederhergestellt werden:', error)
  }
}

export function createImagesSegment(getCanvasManager) {
  const pool = new Map()

  return {
    label: 'images',
    order: 50,
    capture() {
      const mgr = getCanvasManager()?.multiImageManager
      if (!mgr) return null
      // Slideshow-Bilder werden zeitgesteuert ein-/ausgeblendet → ignorieren
      return mgr.images
        .filter((img) => !img.isSlideshowImage)
        .map((img) => {
          pool.set(img.id, img)
          return captureImage(img)
        })
    },
    async apply(snapshot) {
      const cm = getCanvasManager()
      const mgr = cm?.multiImageManager
      if (!mgr || !Array.isArray(snapshot)) return

      const liveById = new Map(mgr.images.map((img) => [img.id, img]))
      const result = []

      for (const snap of snapshot) {
        let obj = liveById.get(snap.id) ?? pool.get(snap.id)
        if (!obj) obj = { id: snap.id, type: snap.type, imageObject: null }
        await ensureImageElement(obj, snap.media)
        if (!obj.imageObject) continue
        obj.relX = snap.relX
        obj.relY = snap.relY
        obj.relWidth = snap.relWidth
        obj.relHeight = snap.relHeight
        if (snap.settings) {
          if (obj.settings) assignDeep(obj.settings, snap.settings)
          else obj.settings = clone(snap.settings)
        }
        applyFotoSettings(obj, snap.fotoSettings)
        // Eintritts-Animation eines wiederhergestellten Bildes nicht erneut abspielen
        if (obj.animation?.active) obj.animation.active = false
        pool.set(obj.id, obj)
        result.push(obj)
      }

      // Slideshow-Bilder (zeitgesteuert, nicht im Snapshot) bleiben erhalten –
      // wie beim Hinzufügen durch die Slideshow oben auf dem Stapel.
      result.push(...mgr.images.filter((img) => img.isSlideshowImage))

      mgr.images.splice(0, mgr.images.length, ...result)

      const liveIds = new Set(result.map((img) => img.id))
      if (mgr.selectedImage && !liveIds.has(mgr.selectedImage.id)) {
        mgr.selectedImage = null
        mgr.onImageSelected?.(null)
      }
      dropStaleSelection(cm, 'image', liveIds)
      mgr.onImageChanged?.()
    },
  }
}

// ── Videos ──────────────────────────────────────────────────────────────────

function captureVideo(video) {
  const src = videoSourceOf(video.videoElement)
  return {
    id: video.id,
    media: src ? mediaRegistry.remember(src, video.videoElement) : null,
    relX: video.relX,
    relY: video.relY,
    relWidth: video.relWidth,
    relHeight: video.relHeight,
    playbackRate: video.playbackRate,
    startTime: video.startTime,
    endTime: video.endTime,
    settings: clone(video.settings ?? null),
    fotoSettings: cleanFotoSettings(video.fotoSettings),
  }
}

export function createVideosSegment(getCanvasManager) {
  const pool = new Map()

  return {
    label: 'videos',
    order: 60,
    capture() {
      const mgr = getCanvasManager()?.videoManager
      if (!mgr) return null
      return mgr.videos.map((video) => {
        pool.set(video.id, video)
        return captureVideo(video)
      })
    },
    apply(snapshot) {
      const cm = getCanvasManager()
      const mgr = cm?.videoManager
      if (!mgr || !Array.isArray(snapshot)) return

      const liveById = new Map(mgr.videos.map((v) => [v.id, v]))
      const wanted = new Set(snapshot.map((s) => s.id))
      const result = []

      // Entfernte Videos nur anhalten – das Element bleibt für ein Redo erhalten
      for (const video of mgr.videos) {
        if (!wanted.has(video.id)) video.videoElement?.pause?.()
      }

      for (const snap of snapshot) {
        const obj = liveById.get(snap.id) ?? pool.get(snap.id)
        if (!obj) continue // ohne Element kein sinnvolles Wiederherstellen
        const wasLive = liveById.has(snap.id)

        if (!isLiveVideo(obj.videoElement)) {
          const src = mediaRegistry.resolve(snap.media)
          if (!src) continue
          obj.videoElement = recreateVideoElement(src, {
            loop: obj.loop,
            muted: obj.muted,
            playbackRate: snap.playbackRate,
          })
        }

        obj.relX = snap.relX
        obj.relY = snap.relY
        obj.relWidth = snap.relWidth
        obj.relHeight = snap.relHeight
        obj.playbackRate = snap.playbackRate
        obj.startTime = snap.startTime
        obj.endTime = snap.endTime
        if (obj.videoElement && typeof snap.playbackRate === 'number') {
          obj.videoElement.playbackRate = snap.playbackRate
        }
        if (snap.settings) {
          if (obj.settings) assignDeep(obj.settings, snap.settings)
          else obj.settings = clone(snap.settings)
        }
        applyFotoSettings(obj, snap.fotoSettings)
        if (!wasLive && mgr.isPlaying) obj.videoElement?.play?.().catch(() => {})
        pool.set(obj.id, obj)
        result.push(obj)
      }

      mgr.videos.splice(0, mgr.videos.length, ...result)

      const liveIds = new Set(result.map((v) => v.id))
      if (mgr.selectedVideo && !liveIds.has(mgr.selectedVideo.id)) {
        mgr.selectedVideo = null
        mgr.onVideoSelected?.(null)
      }
      dropStaleSelection(cm, 'video', liveIds)
      mgr.onVideoChanged?.()
    },
  }
}
