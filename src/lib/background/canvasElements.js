/**
 * Vordergrund-Elemente (Bilder, Videos, Texte, Lauftext) für Canvas-Presets
 * und Beat-Marker erfassen und wiederherstellen.
 *
 * `getCm` liefert den AKTUELLEN CanvasManager (wird auch in asynchronen
 * Lade-Callbacks erneut abgefragt).
 */

const deepClone = (obj) => (obj ? JSON.parse(JSON.stringify(obj)) : null)

const DEFAULT_IMAGE_SETTINGS = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  opacity: 100,
  blur: 0,
  preset: null,
})

/**
 * Erfasst alle Vordergrund-Bilder (multiImageManager) als serialisierbare
 * Liste: Bildquelle, Position/Größe/Rotation, Filter- und Foto-Einstellungen
 * inkl. Bild-Audio-Reaktiv.
 */
function captureCanvasImages(cm) {
  const mgr = cm?.multiImageManager
  if (!mgr?.getAllImages) return []
  return mgr
    .getAllImages()
    .map((img) => ({
      src: img.imageObject?.src || null,
      relX: img.relX,
      relY: img.relY,
      relWidth: img.relWidth,
      relHeight: img.relHeight,
      rotation: img.rotation || 0,
      settings: deepClone(img.settings),
      fotoSettings: deepClone(img.fotoSettings),
    }))
    .filter((i) => i.src)
}

/**
 * Erfasst alle Vordergrund-Videos (videoManager). Hinweis: `src` ist eine
 * Blob-URL und nur innerhalb der laufenden Sitzung gültig.
 */
function captureCanvasVideos(cm) {
  const mgr = cm?.videoManager
  if (!mgr?.getAllVideos) return []
  return mgr
    .getAllVideos()
    .map((v) => ({
      src: v.videoElement?.src || null,
      relX: v.relX,
      relY: v.relY,
      relWidth: v.relWidth,
      relHeight: v.relHeight,
      rotation: v.rotation || 0,
      loop: v.loop ?? true,
      muted: v.muted ?? true,
      playbackRate: v.playbackRate ?? 1.0,
      startTime: v.startTime ?? 0,
      endTime: v.endTime ?? 0,
      settings: deepClone(v.settings),
      fotoSettings: deepClone(v.fotoSettings),
    }))
    .filter((v) => v.src)
}

/**
 * Erfasst alle Texte (textManager) als tiefe Kopie (inkl. Position, Stil,
 * Animation und Text-Audio-Reaktiv). Texte enthalten keine DOM-Referenzen.
 */
function captureCanvasTexts(cm) {
  const tm = cm?.textManager
  if (!tm?.textObjects) return []
  return deepClone(tm.textObjects) || []
}

/** Erfasst den Lauftext (Ticker) inkl. aller Einstellungen und Audio-Reaktiv. */
function captureTicker(tickerStore) {
  try {
    return deepClone(tickerStore.$state)
  } catch {
    return null
  }
}

/**
 * Erfasst alle Vordergrund-Elemente (Bilder, Videos, Texte, Lauftext) im
 * Moment des Speicherns – für Canvas-Presets und Beat-Marker.
 * @param {object|null} cm - CanvasManager
 * @param {{ $state: object }} tickerStore
 */
export function captureCanvasElements(cm, tickerStore) {
  return {
    images: captureCanvasImages(cm),
    videos: captureCanvasVideos(cm),
    texts: captureCanvasTexts(cm),
    ticker: captureTicker(tickerStore),
  }
}

/** Lädt ein Bild (mit CORS-Fallback für Galerie-/Remote-Bilder). */
function loadImageElement(src, onload) {
  const attempt = (useCors) => {
    const img = new Image()
    if (useCors) img.crossOrigin = 'anonymous'
    img.onload = () => onload(img)
    img.onerror = () => {
      if (useCors) attempt(false)
      else console.error('❌ Canvas-Preset: Bild konnte nicht geladen werden:', src)
    }
    img.src = src
  }
  attempt(!String(src).startsWith('data:'))
}

/** Entfernt alle Vordergrund-Elemente (Bilder, Videos, Texte) vom Canvas. */
function clearCanvasElements(cm) {
  if (!cm) return
  cm.multiImageManager?.clear?.()
  cm.videoManager?.clear?.()
  if (cm.textManager) cm.textManager.textObjects = []
  cm.setActiveObject?.(null)
}

function restoreCanvasImages(cm, list) {
  const mgr = cm?.multiImageManager
  if (!mgr?.restoreImage || !Array.isArray(list)) return
  list.forEach((data, index) => {
    if (!data?.src) return
    loadImageElement(data.src, (img) => {
      const imageData = {
        id: Date.now() + Math.random(),
        type: 'image',
        imageObject: img,
        relX: data.relX ?? 0.33,
        relY: data.relY ?? 0.33,
        relWidth: data.relWidth ?? 0.33,
        relHeight: data.relHeight ?? 0.33,
        rotation: data.rotation || 0,
        settings: deepClone(data.settings) || { ...DEFAULT_IMAGE_SETTINGS },
      }
      if (data.fotoSettings) {
        imageData.fotoSettings = deepClone(data.fotoSettings)
      } else if (mgr.fotoManager) {
        mgr.fotoManager.initializeImageSettings(imageData)
      }
      // Ursprüngliche Ebenen-Reihenfolge möglichst erhalten (Index geklemmt).
      mgr.restoreImage(imageData, index)
    })
  })
}

function restoreCanvasVideos(getCm, list) {
  const mgr = getCm()?.videoManager
  if (!mgr?.addVideo || !Array.isArray(list)) return
  for (const data of list) {
    if (!data?.src) continue
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    video.muted = data.muted ?? true
    video.loop = data.loop ?? true
    video.playsInline = true
    video.onloadedmetadata = async () => {
      try {
        const vid = await mgr.addVideo(video, {
          relX: data.relX,
          relY: data.relY,
          relWidth: data.relWidth,
          relHeight: data.relHeight,
          loop: data.loop,
          muted: data.muted,
          playbackRate: data.playbackRate,
          startTime: data.startTime,
          endTime: data.endTime,
        })
        if (vid) {
          if (data.rotation) vid.rotation = data.rotation
          if (data.settings) vid.settings = deepClone(data.settings)
          if (data.fotoSettings) vid.fotoSettings = deepClone(data.fotoSettings)
        }
        getCm()?.redrawCallback?.()
      } catch (e) {
        console.error('❌ Canvas-Preset: Video konnte nicht wiederhergestellt werden:', e)
      }
    }
    video.onerror = () => {
      console.error('❌ Canvas-Preset: Video konnte nicht geladen werden:', data.src)
    }
    video.src = data.src
    video.load()
  }
}

function restoreCanvasTexts(cm, list) {
  const tm = cm?.textManager
  if (!tm || !Array.isArray(list)) return
  const texts = deepClone(list) || []
  // Animations-Zustand zurücksetzen, damit Animationen frisch abgespielt werden.
  texts.forEach((t) => {
    if (t.animation) {
      t.animation._state = { startTime: null, isPlaying: false, currentIndex: 0 }
    }
  })
  tm.textObjects = texts
}

/** Stellt den Lauftext (Ticker) inkl. Ein/Aus-Zustand und Einstellungen wieder her. */
function restoreTicker(tickerStore, data) {
  if (!data) return
  try {
    tickerStore.$patch(data)
  } catch (e) {
    console.warn('⚠️ Canvas-Preset: Lauftext konnte nicht wiederhergestellt werden:', e)
  }
}

/**
 * Stellt alle Canvas-Elemente aus einem Preset wieder her. Vorhandene
 * Vordergrund-Elemente werden zuvor entfernt (die Szene wird ersetzt).
 * @param {() => object|null} getCm
 * @param {{ images?: any[], videos?: any[], texts?: any[], ticker?: object }} elements
 * @param {{ $patch: Function }} tickerStore
 */
export function restoreCanvasElements(getCm, elements, tickerStore) {
  if (!elements) return
  clearCanvasElements(getCm())
  restoreCanvasImages(getCm(), elements.images)
  restoreCanvasVideos(getCm, elements.videos)
  restoreCanvasTexts(getCm(), elements.texts)
  restoreTicker(tickerStore, elements.ticker)
  getCm()?.redrawCallback?.()
  getCm()?.updateUICallback?.()
}
