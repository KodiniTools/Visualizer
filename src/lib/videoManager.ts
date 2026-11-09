/**
 * VideoManager - Verwaltet MP4-Videos auf dem Canvas
 * Arbeitet parallel zum MultiImageManager und nutzt FotoManager für Filter
 *
 * Videos werden als HTMLVideoElement gehalten und Frame-by-Frame auf Canvas gezeichnet
 */
import { EFFECT_NAMES } from './audio/AudioReactiveEffects'
import { computeAudioReactiveValues, type AudioReactiveValues } from './audio/audioReactiveEngine'
import {
  createAudioReactiveConfig,
  ensureAudioReactiveConfig,
  type AudioReactiveConfig,
} from './audio/audioReactiveConfig'
import {
  applyAudioReactiveFilters,
  applyAudioReactiveTransform,
  drawAudioReactiveOverlays,
  drawMediaWithAudioReactive,
} from './canvasManager/rendering/audioReactiveDraw'
import {
  findResizeHandleAt,
  getDeleteButtonBounds,
  getResizeHandles,
  isPointInRect,
  type Rect,
} from './canvasObjects/geometry'
import {
  getEntranceTransform,
  type EntranceAnimationState,
  type EntranceTransform,
} from './canvasObjects/entranceAnimation'
import { moveToBack, moveToFront } from './canvasObjects/zOrder'
import { getAudioAnalysisData } from './audio/audioAnalysisData'
import type { FotoImageObject, FotoManager, FotoSettings } from './fotoManager'

/** Einfache Filter (Fallback ohne FotoManager) */
export interface VideoBasicSettings {
  brightness: number
  contrast: number
  saturation: number
  opacity: number
  blur: number
  preset: string | null
  [key: string]: unknown
}

export interface VideoAnimation extends EntranceAnimationState {
  type: string
  active: boolean
  startTime: number
  duration: number
  progress: number
}

/** Video-Objekt auf dem Canvas */
export interface VideoObject extends FotoImageObject {
  id: number | string
  type: 'video'
  videoElement: HTMLVideoElement
  relX: number
  relY: number
  relWidth: number
  relHeight: number
  duration: number
  loop: boolean
  muted: boolean
  playbackRate: number
  startTime: number
  endTime: number
  isPlaying: boolean
  imageObject: unknown
  settings?: VideoBasicSettings
  animation: VideoAnimation
  /** Name des hochgeladenen Videos (für Listen und Beat-Marker; optional) */
  name?: string
}

export interface VideoAddOptions {
  relX?: number
  relY?: number
  relWidth?: number
  relHeight?: number
  loop?: boolean
  muted?: boolean
  playbackRate?: number
  startTime?: number
  endTime?: number
  /** Name der Einblend-Animation */
  animation?: string
  animationDuration?: number
  /** Dauer der Einblend-Animation (addVideoWithBounds) */
  duration?: number
  /** Name des hochgeladenen Videos */
  name?: string
  /** false = neues Video nicht auswählen (z. B. vom Beat-Marker angelegt) */
  select?: boolean
}

export interface VideoBounds {
  relX: number
  relY: number
  relWidth: number
  relHeight: number
}

export interface VideoManagerCallbacks {
  redrawCallback?: () => void
  onVideoSelected?: (video: VideoObject | null) => void
  onVideoChanged?: () => void
  fotoManager?: FotoManager | null
  audioElement?: HTMLMediaElement | null
}

type VideoAudioReactive = AudioReactiveValues | null

export class VideoManager {
  canvas: HTMLCanvasElement
  videos: VideoObject[]
  selectedVideo: VideoObject | null
  redrawCallback: () => void
  onVideoSelected: (video: VideoObject | null) => void
  onVideoChanged: () => void
  fotoManager: FotoManager | null
  audioElement: HTMLMediaElement | null
  syncWithAudio: boolean
  isPlaying: boolean
  globalPlaybackRate: number
  /**
   * Von Beat-Markern bis zu ihrem Zeitpunkt ausgeblendete Videos (reiner
   * Laufzeit-Zustand, nicht im Verlauf). Ausgeblendete Videos werden weder
   * gezeichnet noch per Klick ausgewählt.
   */
  markerHiddenIds: Set<VideoObject['id']>

  constructor(canvas: HTMLCanvasElement, callbacks: VideoManagerCallbacks = {}) {
    this.canvas = canvas
    this.videos = []
    this.selectedVideo = null

    // Callbacks
    this.redrawCallback = callbacks.redrawCallback || (() => {})
    this.onVideoSelected = callbacks.onVideoSelected || (() => {})
    this.onVideoChanged = callbacks.onVideoChanged || (() => {})

    // FotoManager Referenz (für Filter)
    this.fotoManager = callbacks.fotoManager || null

    // Audio-Synchronisation
    this.audioElement = callbacks.audioElement || null
    this.syncWithAudio = false

    // Playback-Status
    this.isPlaying = false
    this.globalPlaybackRate = 1.0
    this.markerHiddenIds = new Set()

    console.log('✅ VideoManager initialisiert')
  }

  /**
   * ✅ KRITISCHER FIX: Aktualisiert die Canvas-Referenz
   * Wird aufgerufen, wenn das DOM-Canvas sich vom gespeicherten Canvas unterscheidet
   * (z.B. nach einem direkten Page-Refresh)
   */
  updateCanvas(newCanvas: HTMLCanvasElement | null | undefined): boolean {
    if (newCanvas && newCanvas !== this.canvas) {
      console.log('[VideoManager] Canvas-Referenz aktualisiert')
      this.canvas = newCanvas
      return true
    }
    return false
  }

  /**
   * Setzt das Audio-Element für Synchronisation
   */
  setAudioElement(audioElement: HTMLMediaElement | null): void {
    this.audioElement = audioElement
  }

  /**
   * Aktiviert/Deaktiviert Audio-Synchronisation
   */
  setSyncWithAudio(sync: boolean): void {
    this.syncWithAudio = sync
    if (sync && this.audioElement) {
      this.syncAllVideosToAudio()
    }
  }

  /**
   * Synchronisiert alle Videos mit dem Audio
   */
  syncAllVideosToAudio(): void {
    if (!this.audioElement) return

    const audioTime = this.audioElement.currentTime
    this.videos.forEach((videoData) => {
      if (videoData.videoElement && !videoData.videoElement.paused) {
        const videoDuration = videoData.videoElement.duration
        if (videoDuration && isFinite(videoDuration)) {
          // Video loopen wenn kürzer als Audio
          const videoTime = audioTime % videoDuration
          if (Math.abs(videoData.videoElement.currentTime - videoTime) > 0.1) {
            videoData.videoElement.currentTime = videoTime
          }
        }
      }
    })
  }

  /**
   * Initialisiert Filter-Einstellungen für ein Video (kompatibel mit FotoManager)
   */
  initializeVideoSettings<T extends FotoImageObject & { settings?: VideoBasicSettings }>(
    videoData: T,
  ): T {
    if (!videoData.fotoSettings) {
      videoData.fotoSettings = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        opacity: 100,
        blur: 0,
        hueRotate: 0,
        grayscale: 0,
        sepia: 0,
        invert: 0,
        shadowColor: '#000000',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
        borderWidth: 0,
        borderColor: '#ffffff',
        borderOpacity: 100,
        // Identische Struktur wie bei Canvas-Bildern (Master inkl. Easing/Beat-
        // Boost/Phase/Gain, alle Effekte mit eigener Quelle)
        audioReactive: createAudioReactiveConfig(EFFECT_NAMES),
      } as FotoSettings
    }

    // Alte/unvollständige Audio-Konfigurationen (z. B. aus Presets) vervollständigen
    const fotoSettings = videoData.fotoSettings as FotoSettings
    fotoSettings.audioReactive = ensureAudioReactiveConfig(fotoSettings.audioReactive)

    if (!videoData.settings) {
      videoData.settings = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        opacity: 100,
        blur: 0,
        preset: null,
      }
    }

    return videoData
  }

  /**
   * Fügt ein neues Video zum Canvas hinzu
   * @param {HTMLVideoElement} videoElement - Das Video-Element
   * @param {Object} options - Optionale Einstellungen (bounds, loop, muted, etc.)
   */
  addVideo(
    videoElement: HTMLVideoElement | null | undefined,
    options: VideoAddOptions = {},
  ): VideoObject | null | Promise<VideoObject> {
    if (!videoElement) {
      console.error('❌ Kein Video zum Hinzufügen übergeben')
      return null
    }

    // Sicherstellen, dass Video-Metadaten geladen sind
    if (videoElement.readyState < 1) {
      console.warn('⚠️ Video-Metadaten noch nicht geladen, warte...')
      return new Promise<VideoObject>((resolve) => {
        videoElement.addEventListener(
          'loadedmetadata',
          () => {
            resolve(this._createVideoObject(videoElement, options))
          },
          { once: true },
        )
      })
    }

    return this._createVideoObject(videoElement, options)
  }

  /**
   * Erstellt das Video-Objekt und fügt es zur Liste hinzu
   */
  _createVideoObject(videoElement: HTMLVideoElement, options: VideoAddOptions = {}): VideoObject {
    const videoWidth = videoElement.videoWidth || 640
    const videoHeight = videoElement.videoHeight || 360

    // Berechne initiale Größe (1/3 der Canvas-Breite, wie bei Bildern)
    const initialRelWidth = options.relWidth || 1 / 3
    const videoAspectRatio = videoHeight / videoWidth
    const canvasAspectRatio = this.canvas.height / this.canvas.width
    const initialRelHeight =
      options.relHeight || (initialRelWidth * videoAspectRatio) / canvasAspectRatio

    // Position (zentriert oder aus Options)
    const relX = options.relX !== undefined ? options.relX : (1 - initialRelWidth) / 2
    const relY = options.relY !== undefined ? options.relY : (1 - initialRelHeight) / 2

    const newVideo: VideoObject = {
      id: Date.now() + Math.random(),
      type: 'video',
      videoElement: videoElement,
      relX: relX,
      relY: relY,
      relWidth: initialRelWidth,
      relHeight: initialRelHeight,
      // Video-spezifische Eigenschaften
      duration: videoElement.duration || 0,
      loop: options.loop !== undefined ? options.loop : true,
      muted: options.muted !== undefined ? options.muted : true, // Standard: Stumm
      playbackRate: options.playbackRate || 1.0,
      startTime: options.startTime || 0,
      endTime: options.endTime || videoElement.duration || 0,
      isPlaying: false,
      ...(options.name ? { name: options.name } : {}),
      // Für Canvas-Bild-Kompatibilität
      imageObject: null, // Wird für Thumbnail verwendet
      // Filter-Einstellungen
      settings: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        opacity: 100,
        blur: 0,
        preset: null,
      },
      // Animation (wie bei Bildern)
      animation: {
        type: options.animation || 'none',
        // falsy-Wert (undefined/'') bleibt wie bisher erhalten
        active: (options.animation && options.animation !== 'none') as boolean,
        startTime: Date.now(),
        duration: options.animationDuration || 500,
        progress: 0,
      },
    }

    // FotoSettings initialisieren
    this.initializeVideoSettings(newVideo)

    // Video-Einstellungen anwenden
    videoElement.loop = newVideo.loop
    videoElement.muted = newVideo.muted
    videoElement.playbackRate = newVideo.playbackRate

    // CORS für Canvas-Rendering
    videoElement.crossOrigin = 'anonymous'

    this.videos.push(newVideo)
    if (options.select !== false) this.setSelectedVideo(newVideo)

    console.log(
      '✅ Video hinzugefügt:',
      newVideo.id,
      `${videoWidth}x${videoHeight}`,
      `Dauer: ${newVideo.duration.toFixed(1)}s`,
      'Anzahl Videos:',
      this.videos.length,
    )

    this.redrawCallback()
    this.onVideoChanged()

    // Animation starten wenn nötig
    if (newVideo.animation.active) {
      this._startAnimation(newVideo)
    }

    return newVideo
  }

  /**
   * Fügt ein Video mit benutzerdefinierten Bounds hinzu
   */
  addVideoWithBounds(
    videoElement: HTMLVideoElement | null | undefined,
    bounds: VideoBounds,
    animation = 'none',
    options: VideoAddOptions = {},
  ): VideoObject | null | Promise<VideoObject> {
    const fullOptions = {
      ...options,
      relX: bounds.relX,
      relY: bounds.relY,
      relWidth: bounds.relWidth,
      relHeight: bounds.relHeight,
      animation: animation,
      animationDuration: options.duration || 500,
    }

    return this.addVideo(videoElement, fullOptions)
  }

  /**
   * Startet die Eintritts-Animation für ein Video
   */
  _startAnimation(videoData: VideoObject): void {
    if (!videoData.animation || !videoData.animation.active) return

    const animate = () => {
      if (!videoData.animation || !videoData.animation.active) return

      const elapsed = Date.now() - videoData.animation.startTime
      const duration = videoData.animation.duration
      const progress = Math.min(elapsed / duration, 1)
      videoData.animation.progress = progress

      this.redrawCallback()

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        videoData.animation.active = false
        console.log('✅ Video-Animation beendet:', videoData.id)
      }
    }

    requestAnimationFrame(animate)
  }

  /**
   * Transform der Einblend-Animation (siehe canvasObjects/entranceAnimation.js)
   */
  getAnimationTransform(videoData: VideoObject): EntranceTransform {
    return getEntranceTransform(videoData.animation, this.canvas)
  }

  /**
   * Entfernt ein Video vom Canvas
   * @param {string|number} videoId - ID des Videos
   * @param {Object} [options]
   * @param {boolean} [options.destroyElement=true] - Wenn false, bleibt das
   *   HTMLVideoElement erhalten (nur pausiert), damit das Video später
   *   wiederhergestellt werden kann (Undo). Wird für die Undo-fähige Löschung
   *   verwendet.
   */
  removeVideo(videoId: VideoObject['id'], { destroyElement = true } = {}): boolean {
    const index = this.videos.findIndex((v) => v.id === videoId)
    if (index === -1) return false

    const video = this.videos[index] as VideoObject // index !== -1

    // Video-Element stoppen (und optional vollständig aufräumen)
    if (video.videoElement) {
      video.videoElement.pause()
      if (destroyElement) {
        video.videoElement.src = ''
        video.videoElement.load()
      }
    }

    this.videos.splice(index, 1)
    this.markerHiddenIds.delete(videoId)

    if (this.selectedVideo && this.selectedVideo.id === videoId) {
      this.selectedVideo = null
      this.onVideoSelected(null)
    }

    console.log('🗑️ Video entfernt:', videoId, 'Verbleibende Videos:', this.videos.length)

    this.redrawCallback()
    this.onVideoChanged()

    return true
  }

  /**
   * ↩️ Stellt ein zuvor entferntes Video wieder her
   * Voraussetzung: Das Video wurde mit `removeVideo(id, { destroyElement: false })`
   * entfernt, sodass das HTMLVideoElement noch intakt ist.
   * @param {Object} videoData - Das wiederherzustellende Video-Objekt
   * @param {number} [index] - Ursprünglicher Index in der Ebenen-Reihenfolge
   * @returns {boolean} true wenn erfolgreich
   */
  restoreVideo(videoData: VideoObject | null | undefined, index?: number): boolean {
    if (!videoData) return false
    // Doppelte Wiederherstellung verhindern
    if (this.videos.some((v) => v.id === videoData.id)) return false

    if (typeof index === 'number' && index >= 0 && index <= this.videos.length) {
      this.videos.splice(index, 0, videoData)
    } else {
      this.videos.push(videoData)
    }

    // Wiedergabe fortsetzen, falls global gerade abgespielt wird
    if (videoData.videoElement && this.isPlaying) {
      videoData.videoElement.play().catch(() => {})
    }

    console.log('↩️ Video wiederhergestellt:', videoData.id, 'Videos gesamt:', this.videos.length)

    this.redrawCallback()
    this.onVideoChanged()

    return true
  }

  /**
   * Setzt das aktuell ausgewählte Video
   */
  setSelectedVideo(video: VideoObject | null): void {
    if (this.selectedVideo && video && this.selectedVideo.id === video.id) {
      return
    }

    this.selectedVideo = video
    this.onVideoSelected(video)
    this.redrawCallback()
  }

  /**
   * Gibt das ausgewählte Video zurück
   */
  getSelectedVideo(): VideoObject | null {
    return this.selectedVideo
  }

  /**
   * Gibt alle Videos zurück
   */
  getAllVideos(): VideoObject[] {
    return this.videos
  }

  /**
   * Startet die Wiedergabe eines Videos
   * ✅ VERBESSERT: Besseres Error-Handling und sofortige State-Updates
   */
  playVideo(videoId: VideoObject['id']): boolean {
    const video = this.videos.find((v) => v.id === videoId)
    if (!video || !video.videoElement) {
      console.warn('❌ Video nicht gefunden oder kein videoElement:', videoId)
      return false
    }

    // ✅ Sofort State setzen für bessere UI-Reaktivität
    video.isPlaying = true

    // ✅ Video abspielen
    const playPromise = video.videoElement.play()

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('▶️ Video gestartet:', videoId)
          this.redrawCallback()
        })
        .catch((err) => {
          // Bei Fehler State zurücksetzen
          video.isPlaying = false
          console.error('❌ Video-Wiedergabe fehlgeschlagen:', err.message)

          // ✅ Bei Autoplay-Policy: User muss erst interagieren
          if (err.name === 'NotAllowedError') {
            console.warn('⚠️ Autoplay blockiert - User-Interaktion erforderlich')
          }
          this.redrawCallback()
        })
    }

    this.redrawCallback()
    return true
  }

  /**
   * Pausiert ein Video
   * ✅ VERBESSERT: Callback für UI-Update
   */
  pauseVideo(videoId: VideoObject['id']): boolean {
    const video = this.videos.find((v) => v.id === videoId)
    if (!video || !video.videoElement) return false

    video.videoElement.pause()
    video.isPlaying = false
    console.log('⏸️ Video pausiert:', videoId)

    this.redrawCallback()
    return true
  }

  /**
   * Startet alle Videos
   * ✅ VERBESSERT: Callback für UI-Update
   */
  playAll(): void {
    this.videos.forEach((video) => {
      if (video.videoElement) {
        video.isPlaying = true
        video.videoElement.play().catch((err) => {
          video.isPlaying = false
          console.warn('Video play fehlgeschlagen:', err.message)
        })
      }
    })
    this.isPlaying = true
    this.redrawCallback()
  }

  /**
   * Pausiert alle Videos
   * ✅ VERBESSERT: Callback für UI-Update
   */
  pauseAll(): void {
    this.videos.forEach((video) => {
      if (video.videoElement) {
        video.videoElement.pause()
        video.isPlaying = false
      }
    })
    this.isPlaying = false
    this.redrawCallback()
  }

  /**
   * Setzt alle Videos auf eine bestimmte Zeit
   */
  seekAll(time: number): void {
    this.videos.forEach((video) => {
      if (video.videoElement) {
        const duration = video.videoElement.duration
        if (duration && isFinite(duration)) {
          video.videoElement.currentTime = video.loop ? time % duration : Math.min(time, duration)
        }
      }
    })
  }

  /**
   * Berechnet die Bounds eines Videos
   * ✅ KRITISCHER FIX: Akzeptiert optionalen Canvas-Parameter für korrekte Dimensionen
   */
  getVideoBounds(
    videoData: VideoObject | null | undefined,
    canvasOverride: HTMLCanvasElement | null = null,
  ): Rect | null {
    if (!videoData || videoData.type !== 'video') return null

    // ✅ FIX: Verwende übergebenen Canvas wenn vorhanden, sonst this.canvas
    const targetCanvas = canvasOverride || this.canvas
    if (!targetCanvas || targetCanvas.width === 0 || targetCanvas.height === 0) {
      return null
    }

    return {
      x: videoData.relX * targetCanvas.width,
      y: videoData.relY * targetCanvas.height,
      width: videoData.relWidth * targetCanvas.width,
      height: videoData.relHeight * targetCanvas.height,
    }
  }

  /**
   * Zeichnet alle Videos auf den Canvas
   */
  drawVideos(ctx: CanvasRenderingContext2D | null | undefined): void {
    if (!ctx || this.videos.length === 0) return

    // Audio-Synchronisation wenn aktiviert
    if (this.syncWithAudio && this.audioElement && !this.audioElement.paused) {
      this.syncAllVideosToAudio()
    }

    this.videos.forEach((videoData) => {
      if (this.markerHiddenIds.has(videoData.id)) return
      this._drawSingleVideo(ctx, videoData)
    })
  }

  /**
   * Zeichnet ein einzelnes Video
   */
  _drawSingleVideo(ctx: CanvasRenderingContext2D, videoData: VideoObject): void {
    if (!videoData.videoElement) return

    const video = videoData.videoElement

    // Prüfe ob Video bereit ist zum Zeichnen
    if (video.readyState < 2) return // HAVE_CURRENT_DATA oder höher

    // ✅ FIX: Verwende ctx.canvas für korrekte Dimensionen
    const bounds = this.getVideoBounds(videoData, ctx.canvas)
    if (!bounds) return

    // Animation-Transform berechnen
    const animTransform = this.getAnimationTransform(videoData)

    ctx.save()

    // Animation: Opacity
    if (animTransform.opacity < 1) {
      ctx.globalAlpha = animTransform.opacity
    }

    // Filter anwenden (via FotoManager wenn verfügbar)
    if (this.fotoManager && videoData.fotoSettings) {
      this.fotoManager.applyFilters(ctx, videoData)
    } else if (videoData.settings) {
      this._applyBasicFilters(ctx, videoData)
    }

    // Audio-Reaktive Effekte (identisch zu MultiImageManager)
    const audioReactive = this._getAudioReactiveValues(videoData.fotoSettings?.audioReactive)
    if (audioReactive && audioReactive.hasEffects) {
      this._applyAudioReactiveFilters(ctx, audioReactive)
    }

    // Rotation anwenden
    // (audio-reaktive Rotation wird weiter unten in der gemeinsamen Transformation angewendet)
    const totalRotation = videoData.fotoSettings?.rotation || 0

    if (totalRotation !== 0) {
      const centerX = bounds.x + bounds.width / 2
      const centerY = bounds.y + bounds.height / 2
      ctx.translate(centerX, centerY)
      ctx.rotate((totalRotation * Math.PI) / 180)
      ctx.translate(-centerX, -centerY)
    }

    // Flip anwenden
    const flipH = videoData.fotoSettings?.flipH || false
    const flipV = videoData.fotoSettings?.flipV || false
    if (flipH || flipV) {
      const centerX = bounds.x + bounds.width / 2
      const centerY = bounds.y + bounds.height / 2
      ctx.translate(centerX, centerY)
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
      ctx.translate(-centerX, -centerY)
    }

    // Draw-Bounds für Position (inkl. Animation)
    const drawBounds = { ...bounds }

    // Animation: Translate
    if (animTransform.translateX !== 0 || animTransform.translateY !== 0) {
      drawBounds.x += animTransform.translateX
      drawBounds.y += animTransform.translateY
    }

    // Animation: Scale
    if (animTransform.scale !== 1) {
      const centerX = drawBounds.x + drawBounds.width / 2
      const centerY = drawBounds.y + drawBounds.height / 2
      const newWidth = drawBounds.width * animTransform.scale
      const newHeight = drawBounds.height * animTransform.scale
      drawBounds.x = centerX - newWidth / 2
      drawBounds.y = centerY - newHeight / 2
      drawBounds.width = newWidth
      drawBounds.height = newHeight
    }

    // Audio-reaktive Geometrie (Skalierung aller scale-Effekte, Beat-Flip, Skew,
    // Perspektive, Bewegungspfade) um das Videozentrum – gemeinsamer Helfer
    if (audioReactive?.hasEffects) {
      applyAudioReactiveTransform(
        ctx,
        audioReactive,
        drawBounds.x + drawBounds.width / 2,
        drawBounds.y + drawBounds.height / 2,
      )
    }

    // Video auf Canvas zeichnen (mit chromatischer Aberration, falls aktiv)
    try {
      drawMediaWithAudioReactive(
        ctx,
        audioReactive,
        video,
        drawBounds.x,
        drawBounds.y,
        drawBounds.width,
        drawBounds.height,
      )
      // Overlay-Effekte (audio-reaktive Kontur, Vignette-Puls) über dem Video
      drawAudioReactiveOverlays(
        ctx,
        audioReactive,
        drawBounds.x,
        drawBounds.y,
        drawBounds.width,
        drawBounds.height,
      )
    } catch (e) {
      console.warn('[VideoManager] Video render error:', e)
    }

    ctx.restore()
  }

  /**
   * Wendet einfache Filter an (Fallback ohne FotoManager)
   */
  _applyBasicFilters(ctx: CanvasRenderingContext2D, videoData: VideoObject): void {
    if (!videoData.settings) return

    const s = videoData.settings
    let filterString = `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%)`

    if (s.blur > 0) {
      filterString += ` blur(${s.blur}px)`
    }

    ctx.filter = filterString
    ctx.globalAlpha = s.opacity / 100
  }

  /**
   * Berechnet Audio-Reaktive Werte – gemeinsame Engine mit Bildern/Hintergrund
   */
  _getAudioReactiveValues(
    audioSettings: AudioReactiveConfig | null | undefined,
  ): VideoAudioReactive {
    return computeAudioReactiveValues(audioSettings, audioSettings, getAudioAnalysisData())
  }

  /**
   * Wendet Audio-Reaktive Filter/Glow/Strobe an – gemeinsamer Helfer
   */
  _applyAudioReactiveFilters(
    ctx: CanvasRenderingContext2D,
    audioReactive: VideoAudioReactive,
  ): void {
    applyAudioReactiveFilters(ctx, audioReactive)
  }

  /**
   * Zeichnet interaktive Elemente (Rahmen, Handles) für ausgewähltes Video
   */
  drawInteractiveElements(ctx: CanvasRenderingContext2D): void {
    if (!this.selectedVideo || this.selectedVideo.type !== 'video') return
    if (this.markerHiddenIds.has(this.selectedVideo.id)) return

    const bounds = this.getVideoBounds(this.selectedVideo)
    if (!bounds) return

    ctx.save()

    // Rahmen
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.9)' // Violett für Videos (anders als Bilder)
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
    ctx.setLineDash([])

    // Video-Icon in der Ecke
    ctx.fillStyle = 'rgba(139, 92, 246, 0.9)'
    ctx.beginPath()
    ctx.moveTo(bounds.x + 10, bounds.y + 8)
    ctx.lineTo(bounds.x + 10, bounds.y + 22)
    ctx.lineTo(bounds.x + 22, bounds.y + 15)
    ctx.closePath()
    ctx.fill()

    // Skalierungs-Handles
    const handles = this.getResizeHandles(bounds)
    ctx.fillStyle = 'rgba(139, 92, 246, 0.9)'
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1

    for (const key in handles) {
      const handle = handles[key] as Rect
      ctx.fillRect(handle.x, handle.y, handle.width, handle.height)
      ctx.strokeRect(handle.x, handle.y, handle.width, handle.height)
    }

    // Löschbutton
    const deleteButton = this.getDeleteButtonBounds(bounds)
    ctx.fillStyle = 'rgba(255, 69, 58, 0.95)'
    ctx.beginPath()
    ctx.arc(
      deleteButton.x + deleteButton.width / 2,
      deleteButton.y + deleteButton.height / 2,
      deleteButton.width / 2,
      0,
      Math.PI * 2,
    )
    ctx.fill()
    ctx.stroke()

    // X-Symbol
    const padding = 6
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(deleteButton.x + padding, deleteButton.y + padding)
    ctx.lineTo(
      deleteButton.x + deleteButton.width - padding,
      deleteButton.y + deleteButton.height - padding,
    )
    ctx.moveTo(deleteButton.x + deleteButton.width - padding, deleteButton.y + padding)
    ctx.lineTo(deleteButton.x + padding, deleteButton.y + deleteButton.height - padding)
    ctx.stroke()

    ctx.restore()
  }

  // ══════════════════ Beat-Marker ══════════════════

  /**
   * Blendet ein Video für Beat-Marker aus bzw. ein. Ausblenden pausiert es;
   * Einblenden startet es nicht (das übernimmt `restartVideo`).
   */
  setMarkerHidden(videoId: VideoObject['id'], hidden: boolean): void {
    if (hidden) {
      this.markerHiddenIds.add(videoId)
      const video = this.videos.find((v) => v.id === videoId)
      if (video?.videoElement && !video.videoElement.paused) {
        video.videoElement.pause()
        video.isPlaying = false
      }
    } else {
      this.markerHiddenIds.delete(videoId)
    }
  }

  isMarkerHidden(videoId: VideoObject['id']): boolean {
    return this.markerHiddenIds.has(videoId)
  }

  /** Alle von Markern ausgeblendeten Videos wieder einblenden. */
  clearMarkerHidden(): void {
    if (this.markerHiddenIds.size === 0) return
    this.markerHiddenIds.clear()
    this.redrawCallback()
  }

  /**
   * Spielt ein Video ab einer Position: Einblend-Animation an der passenden
   * Stelle (`offsetSeconds` nach dem Start), Video bei derselben Position
   * (in Schleife modulo Länge). Ist ein einmal laufendes Video schon zu Ende,
   * bleibt es auf dem letzten Bild stehen.
   * @returns false ohne Video, sonst true
   */
  playVideoFrom(videoId: VideoObject['id'], offsetSeconds = 0): boolean {
    const video = this.videos.find((v) => v.id === videoId)
    if (!video?.videoElement) return false
    const el = video.videoElement
    const offset = Math.max(0, Number.isFinite(offsetSeconds) ? offsetSeconds : 0)

    // Einblend-Animation (wie beim Platzieren) an der Stelle `offset` aufsetzen
    const anim = video.animation
    if (anim && anim.type && anim.type !== 'none') {
      const elapsedMs = offset * 1000
      anim.startTime = Date.now() - elapsedMs
      anim.progress = Math.min(elapsedMs / (anim.duration || 1), 1)
      const wasActive = anim.active
      anim.active = anim.progress < 1
      if (anim.active && !wasActive) this._startAnimation(video)
    }

    const duration = el.duration
    let position = offset
    if (duration && isFinite(duration)) {
      position = video.loop ? offset % duration : Math.min(offset, duration)
    }
    try {
      el.currentTime = position
    } catch {
      /* Metadaten noch nicht geladen */
    }

    const ended = !video.loop && !!duration && isFinite(duration) && offset >= duration
    if (ended) {
      el.pause()
      video.isPlaying = false
    } else {
      this.playVideo(videoId)
    }
    this.redrawCallback()
    return true
  }

  getResizeHandles(bounds: Rect): Record<string, Rect> {
    return getResizeHandles(bounds)
  }

  /**
   * Berechnet die Position des Löschbuttons
   */
  getDeleteButtonBounds(objectBounds: Rect): Rect {
    return getDeleteButtonBounds(objectBounds)
  }

  /**
   * Findet Video an Position
   */
  findVideoAt(x: number, y: number): VideoObject | null {
    for (let i = this.videos.length - 1; i >= 0; i--) {
      const video = this.videos[i] as VideoObject
      if (this.markerHiddenIds.has(video.id)) continue // unsichtbar → nicht anklickbar
      const bounds = this.getVideoBounds(video)

      if (bounds && this.isPointInRect(x, y, bounds)) {
        return video
      }
    }
    return null
  }

  /**
   * Prüft ob ein Punkt in einem Rechteck liegt
   */
  isPointInRect(x: number, y: number, rect: Rect): boolean {
    return isPointInRect(x, y, rect)
  }

  /**
   * Findet ein Handle an einer bestimmten Position
   */
  findHandleAt(x: number, y: number) {
    if (!this.selectedVideo || this.selectedVideo.type !== 'video') return null

    const bounds = this.getVideoBounds(this.selectedVideo)
    return bounds ? findResizeHandleAt(x, y, bounds) : null
  }

  /**
   * Prüft ob Punkt auf Löschbutton liegt
   */
  isPointOnDeleteButton(x: number, y: number): boolean {
    if (!this.selectedVideo || this.selectedVideo.type !== 'video') return false

    const bounds = this.getVideoBounds(this.selectedVideo)
    if (!bounds) return false

    const deleteButton = this.getDeleteButtonBounds(bounds)
    return this.isPointInRect(x, y, deleteButton)
  }

  /**
   * Aktualisiert Video-Filter
   */
  updateVideoFilter(videoId: VideoObject['id'], filterProperty: string, value: unknown): boolean {
    const video = this.videos.find((v) => v.id === videoId)
    if (!video || !video.settings) return false

    video.settings[filterProperty] = value
    this.redrawCallback()

    return true
  }

  /**
   * Vorbereitung für Recording
   */
  prepareForRecording(ctx: CanvasRenderingContext2D | null | undefined): void {
    if (!ctx) return

    console.log('[VideoManager] 🧹 Preparing for recording...')

    // Alle Videos starten für Recording
    this.videos.forEach((video) => {
      if (video.videoElement) {
        video.videoElement.currentTime = 0
      }
    })

    console.log(`[VideoManager] ✅ Ready for recording (${this.videos.length} videos)`)
  }

  /**
   * Cleanup nach Recording
   */
  cleanupAfterRecording(): void {
    console.log('[VideoManager] 🧹 Cleanup after recording...')
    console.log(`[VideoManager] ✅ Cleanup complete`)
  }

  /**
   * Z-Index Steuerung
   */
  getVideoIndex(video: VideoObject | null | undefined): number {
    if (!video) return -1
    return this.videos.findIndex((v) => v.id === video.id)
  }

  getVideoCount(): number {
    return this.videos.length
  }
  /**
   * Bringt ein Video ganz nach vorne
   * @returns {boolean} true wenn erfolgreich
   */
  bringToFront(video?: VideoObject | null): boolean {
    if (!video) video = this.selectedVideo
    if (!video) return false

    if (!moveToFront(this.videos, this.getVideoIndex(video), video)) return false

    this.redrawCallback()
    this.onVideoChanged()
    return true
  }
  /**
   * Bringt ein Video ganz nach hinten
   * @returns {boolean} true wenn erfolgreich
   */
  sendToBack(video?: VideoObject | null): boolean {
    if (!video) video = this.selectedVideo
    if (!video) return false

    if (!moveToBack(this.videos, this.getVideoIndex(video), video)) return false

    this.redrawCallback()
    this.onVideoChanged()
    return true
  }

  /**
   * Räumt alle Videos auf
   */
  clear(): void {
    this.videos.forEach((video) => {
      if (video.videoElement) {
        video.videoElement.pause()
        video.videoElement.src = ''
      }
    })

    this.videos = []
    this.markerHiddenIds.clear()
    this.selectedVideo = null
    this.onVideoSelected(null)
    this.redrawCallback()
    this.onVideoChanged()
  }
}
