/**
 * Bild- und Video-Hintergründe erfassen/anwenden (für Canvas-Presets und
 * Beat-Marker-Snapshots).
 *
 * `getCm` liefert den AKTUELLEN CanvasManager. Er wird auch in asynchronen
 * Lade-Callbacks erneut abgefragt, weil sich der Manager bis dahin ändern kann.
 */

const cloneJson = (obj) => JSON.parse(JSON.stringify(obj))

/**
 * Erfasst einen aktuell gesetzten Bild-Hintergrund (z.B. Galeriebild) als
 * serialisierbares Objekt: Ziel (Haupt- oder Workspace-Hintergrund),
 * Bildquelle + Foto-Einstellungen inkl. Bild-Audio-Reaktiv
 * (fotoSettings.audioReactive).
 * @returns {{ target: string, src: string, settings: object|null } | null}
 */
export function captureImageBackground(cm) {
  if (!cm) return null

  // Workspace-Hintergrund hat Vorrang, wenn ein Workspace aktiv ist
  const wsBg = cm.workspaceBackground
  if (wsBg && wsBg.imageObject?.src) {
    return {
      target: 'workspace',
      src: wsBg.imageObject.src,
      settings: wsBg.fotoSettings ? cloneJson(wsBg.fotoSettings) : null,
    }
  }

  const bg = cm.background
  if (bg && typeof bg === 'object' && bg.imageObject?.src) {
    return {
      target: 'background',
      src: bg.imageObject.src,
      settings: bg.fotoSettings ? cloneJson(bg.fotoSettings) : null,
    }
  }
  return null
}

/**
 * Lädt ein Bild aus einer Quelle und setzt es als Haupt- oder Workspace-
 * Hintergrund inkl. der gespeicherten Foto-Einstellungen (Audio-Reaktiv,
 * Flip, Position, ...). Bei CORS-Fehler erneuter Versuch ohne CORS.
 * @param {() => object|null} getCm
 * @param {{ target?: string, src: string, settings: object|null }} imageData
 */
export function applyImageBackground(getCm, imageData) {
  if (!getCm() || !imageData?.src) return

  const setImage = (img) => {
    const cm = getCm()
    if (!cm) return
    if (imageData.target === 'workspace' && cm.workspacePreset) {
      cm.setWorkspaceBackground(img)
      const wsBg = cm.workspaceBackground
      if (imageData.settings && wsBg) {
        wsBg.fotoSettings = cloneJson(imageData.settings)
      }
    } else {
      cm.setBackground(img)
      const bg = cm.background
      if (imageData.settings && bg && typeof bg === 'object') {
        bg.fotoSettings = cloneJson(imageData.settings)
      }
    }
    cm.redrawCallback?.()
    cm.updateUICallback?.()
    console.log(
      `🖼️ Bild-Hintergrund aus Preset angewendet (${imageData.target || 'background'}):`,
      imageData.src,
    )
  }

  const load = (useCors) => {
    const img = new Image()
    if (useCors) img.crossOrigin = 'anonymous'
    img.onload = () => setImage(img)
    img.onerror = () => {
      if (useCors) {
        // Fallback: erneut ohne CORS versuchen (z.B. bei Cache-/CORS-Konflikt)
        console.warn('⚠️ Hintergrundbild via CORS fehlgeschlagen – erneuter Versuch ohne CORS')
        load(false)
      } else {
        console.error('❌ Hintergrundbild konnte nicht geladen werden:', imageData.src)
      }
    }
    img.src = imageData.src
  }

  load(true)
}

/**
 * Erfasst einen aktuell gesetzten Video-Hintergrund als serialisierbares
 * Objekt: Ziel (Haupt- oder Workspace-Hintergrund), Videoquelle, Wiedergabe-
 * Optionen (muted/loop) sowie die Foto-Einstellungen inkl. Bild-Audio-Reaktiv
 * (fotoSettings.audioReactive).
 *
 * Hinweis: `src` ist i.d.R. eine Blob-URL des hochgeladenen Videos und nur
 * innerhalb der laufenden Sitzung gültig (nicht über einen Reload hinaus).
 * @returns {{ target: string, src: string, muted: boolean, loop: boolean, settings: object|null } | null}
 */
export function captureVideoBackground(cm) {
  if (!cm) return null

  // Workspace-Video-Hintergrund hat Vorrang, wenn ein Workspace aktiv ist
  const wsVid = cm.workspaceVideoBackground
  if (wsVid && wsVid.videoElement?.src) {
    return {
      target: 'workspace',
      src: wsVid.videoElement.src,
      muted: wsVid.videoElement.muted ?? true,
      loop: wsVid.videoElement.loop ?? true,
      settings: wsVid.fotoSettings ? cloneJson(wsVid.fotoSettings) : null,
    }
  }

  const vid = cm.videoBackground
  if (vid && vid.videoElement?.src) {
    return {
      target: 'background',
      src: vid.videoElement.src,
      muted: vid.videoElement.muted ?? true,
      loop: vid.videoElement.loop ?? true,
      settings: vid.fotoSettings ? cloneJson(vid.fotoSettings) : null,
    }
  }
  return null
}

/**
 * Stoppt einen Video-Hintergrund (`videoBackground` oder
 * `workspaceVideoBackground`) und entfernt ihn vom Canvas.
 * @param {object} cm
 * @param {'videoBackground'|'workspaceVideoBackground'} key
 * @param {{ safe?: boolean }} [options] - safe: Fehler beim Pausieren ignorieren
 * @returns {boolean} true, wenn ein Video entfernt wurde
 */
export function removeVideoBackground(cm, key, { safe = false } = {}) {
  if (!cm[key]) return false
  const v = cm[key].videoElement
  if (v) {
    if (safe) {
      try {
        v.pause()
      } catch {
        /* ignore */
      }
    } else {
      v.pause()
    }
    v.src = ''
  }
  cm[key] = null
  return true
}

/**
 * Entfernt evtl. vorhandene Video-Hintergründe vom Canvas (pausiert das Video
 * und löst die Quelle). Wird beim Anwenden eines Presets ohne Video benötigt,
 * damit ein laufendes Video nicht bestehen bleibt.
 */
export function clearCanvasVideoBackgrounds(cm) {
  if (!cm) return
  for (const key of ['videoBackground', 'workspaceVideoBackground']) {
    removeVideoBackground(cm, key, { safe: true })
  }
}

/**
 * Lädt ein Video aus einer Quelle und setzt es als Haupt- oder Workspace-
 * Video-Hintergrund inkl. der gespeicherten Foto-Einstellungen (Audio-Reaktiv,
 * Flip, Position, ...).
 * @param {() => object|null} getCm
 * @param {{ target?: string, src: string, muted?: boolean, loop?: boolean, settings: object|null }} videoData
 * @param {{ autoplay?: boolean }} [options] - autoplay: Video sofort von vorne
 *   abspielen (z.B. wenn ein Beat-Marker das Preset anwendet).
 */
export function applyVideoBackground(getCm, videoData, { autoplay = false } = {}) {
  if (!getCm() || !videoData?.src) return

  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.preload = 'auto'
  video.muted = videoData.muted ?? true
  video.loop = videoData.loop ?? true
  video.volume = 1
  video.playsInline = true

  video.onloadeddata = () => {
    const cm = getCm()
    if (!cm) return
    if (videoData.target === 'workspace' && cm.workspacePreset) {
      cm.setWorkspaceVideoBackground(video)
      const wsVid = cm.workspaceVideoBackground
      if (videoData.settings && wsVid) {
        wsVid.fotoSettings = cloneJson(videoData.settings)
      }
    } else {
      cm.setVideoBackground(video)
      const vid = cm.videoBackground
      if (videoData.settings && vid) {
        vid.fotoSettings = cloneJson(videoData.settings)
      }
    }
    // Video-Audio (falls nicht stumm) mit der Aufnahme verbinden
    if (!video.muted && window.connectVideoToRecording) {
      window.connectVideoToRecording(video, video.volume)
    }
    // Beim Anwenden über einen Beat-Marker: Video von vorne automatisch starten.
    if (autoplay) {
      try {
        video.currentTime = 0
      } catch {
        /* ignore */
      }
      video.play().catch(() => {})
    }
    cm.redrawCallback?.()
    cm.updateUICallback?.()
    console.log(
      `🎬 Video-Hintergrund aus Preset angewendet (${videoData.target || 'background'}):`,
      videoData.src,
    )
  }
  video.onerror = () => {
    console.error('❌ Video-Hintergrund konnte nicht geladen werden:', videoData.src)
  }
  video.src = videoData.src
  video.load()
}
