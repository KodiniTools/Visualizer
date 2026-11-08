// BackgroundRenderer.js - Hintergrund-Rendering (Farben, Bilder, Videos, Tiles, Gradienten)

/**
 * BackgroundRenderer - Verantwortlich für das Zeichnen aller Hintergrund-Elemente
 *
 * Funktionen:
 * - Farbhintergrund mit Gradienten
 * - Bild-Hintergrund mit Filtern
 * - Video-Hintergrund
 * - Workspace-Hintergrund
 * - Kachel-Hintergrund (Tiles)
 * - Audio-reaktive Effekte
 */
import {
  applyAudioReactiveTransform,
  drawAudioReactiveOverlays,
  drawMediaWithAudioReactive,
} from './audioReactiveDraw'
import { SLIDESHOW_BASE_COLOR_DEFAULT } from '../../slideshowBaseColor'
import { computeSlideshowGradientAudio } from '../../slideshowGradientAudio'
import { applySlideshowFillAudio, computeSlideshowFillAudio } from '../../slideshowFillAudio'
import { computeSlideshowImageFillAudio, drawSlideshowImageFill } from '../../slideshowImageFill'
import { getSlideshowManager } from '../../slideshowManagerBridge'
import { getAudioAnalysisData } from '../../audio/audioAnalysisData'
import type { EffectValues } from '../../audio/AudioReactiveEffects'
import type { AudioReactiveValues, EngineAudioSettings } from '../../audio/audioReactiveEngine'
import type { Rect } from '../../canvasObjects/geometry'
import {
  getImageAnimationTransform,
  hasImageAnimation,
  type ImageAnimationTarget,
} from '../../canvasObjects/imageAnimation'
import type { FotoImageObject, FotoManager } from '../../fotoManager'
import type { SlideshowGradient } from '../../slideshowBaseColor'
import type { SlideshowGradientAudioDeform } from '../../slideshowGradientAudio'
import type { BackgroundTile, TileImageSettings } from '../../../stores/backgroundTilesStore'

type Ctx = CanvasRenderingContext2D

/** Effektwerte inkl. der Gradient-Effekte des Farb-Hintergrunds */
export interface BackgroundEffectValues extends EffectValues {
  gradientRadius?: number
  gradientAngle?: number
}

export type BackgroundAudioReactive = AudioReactiveValues<BackgroundEffectValues> | null

/** Bild-Hintergrund (Objekt mit imageObject oder direkt das Bild) */
/**
 * Animation eines Bild-Hintergrunds (wie bei Texten/Bildern, siehe
 * canvasObjects/imageAnimation): multipliziert die Deckkraft in den Kontext
 * (nach den Filtern, die globalAlpha setzen) und liefert die verschobenen/
 * skalierten Zeichen-Bounds. Ohne aktive Animation unverändert.
 */
export function applyBackgroundAnimation(
  ctx: Ctx,
  target: ImageAnimationTarget,
  bounds: Rect,
  now = Date.now(),
): Rect {
  if (!hasImageAnimation(target.timedAnimation)) return bounds
  const anim = getImageAnimationTransform(target, ctx.canvas, now)
  ctx.globalAlpha *= Math.max(0, Math.min(1, anim.opacity))
  const width = bounds.width * anim.scale
  const height = bounds.height * anim.scale
  return {
    x: bounds.x + (bounds.width - width) / 2 + anim.translateX,
    y: bounds.y + (bounds.height - height) / 2 + anim.translateY,
    width,
    height,
  }
}

export type BackgroundImageObject = FotoImageObject & { imageObject?: CanvasImageSource }

export type VideoBackgroundObject = FotoImageObject & { videoElement: HTMLVideoElement }

export interface GradientSettings {
  enabled?: boolean
  type?: string
  angle?: number
  color2: string
}

/** Benötigter Ausschnitt des backgroundTilesStore */
export interface BackgroundTilesStoreLike {
  tilesEnabled: boolean
  tiles: BackgroundTile[]
  gridLayout: { rows: number; cols: number }
  tileGap: number
  selectedTileIndex: number | null
  getTileImageFilter(index: number): string
}

/** Benötigter Ausschnitt des CanvasManagers */
export interface BackgroundRendererManager {
  canvas: HTMLCanvasElement
  background?: string | BackgroundImageObject | null
  /** Zuletzt eingestellte Hintergrundfarbe (Grundfläche unter animierten Bildern) */
  backgroundColor?: string
  backgroundColorSettings?: EngineAudioSettings | null
  gradientSettings?: GradientSettings | null
  videoBackground?: VideoBackgroundObject | null
  workspaceBackground?: (FotoImageObject & { imageObject: CanvasImageSource }) | null
  workspaceVideoBackground?: VideoBackgroundObject | null
  workspacePreset?: object | null
  fotoManager?: FotoManager | null
  backgroundTilesStore?: BackgroundTilesStoreLike | null
  isRecording?: boolean
  getWorkspaceBounds(): Rect | null | undefined
  _getAudioReactiveValues(settings: EngineAudioSettings | null | undefined): BackgroundAudioReactive
  _applyAudioReactiveFilters(ctx: Ctx, audioReactive: BackgroundAudioReactive): void
}

/**
 * Ersetzt die laufende Slideshow gerade den Canvas- bzw. Workspace-Hintergrund?
 * (Dann wird das Hintergrundbild/-video weder gezeichnet noch per Klick gewählt.)
 * @param {'canvas'|'workspace'} target
 * @returns {boolean}
 */
export function isBackgroundReplacedBySlideshow(target: string): boolean {
  const slideshow = getSlideshowManager()
  return Boolean(slideshow?.replacesBackground?.(target))
}

/**
 * Farbe der Fläche unter der Slideshow (siehe slideshowBaseColor.js).
 * @param {'canvas'|'workspace'} target
 */
function getSlideshowBaseColor(target: string): string {
  const slideshow = getSlideshowManager()
  const color =
    typeof slideshow?.getBaseColor === 'function'
      ? slideshow.getBaseColor(target)
      : slideshow?.getBackgroundColor?.()
  return color || SLIDESHOW_BASE_COLOR_DEFAULT
}

/**
 * Farbverlauf der Fläche oder null (aus).
 * @param {'canvas'|'workspace'} target
 */
function getSlideshowBaseGradient(target: string): SlideshowGradient | null {
  const slideshow = getSlideshowManager()
  const gradient = slideshow?.getBaseGradient?.(target)
  return gradient?.enabled ? gradient : null
}

/**
 * Audio-Reaktive Farbeinstellung der Fläche oder null (aus).
 * @param {'canvas'|'workspace'} target
 */
function getSlideshowFillAudio(target: string) {
  const slideshow = getSlideshowManager()
  const audio = slideshow?.getBaseFillAudio?.(target)
  return audio?.enabled ? audio : null
}

/**
 * Füllung für einen Bereich: Farbe oder Farbverlauf (color → color2).
 * Linear: Winkel in Grad (0 = links→rechts, 90 = oben→unten), über die
 * Diagonale des Bereichs; radial: vom Mittelpunkt bis in die Ecken.
 * Audio-Reaktiv (`audio`, siehe slideshowGradientAudio.js): `extent` skaliert
 * die Ausdehnung, `angleOffset` dreht den linearen Verlauf, `centerShift`
 * lässt den radialen Mittelpunkt kreisen.
 * @returns {string|CanvasGradient}
 */
export function createSlideshowBaseFill(
  ctx: Ctx,
  area: Rect,
  color: string,
  gradient: SlideshowGradient | null | undefined,
  audio: SlideshowGradientAudioDeform | null = null,
): string | CanvasGradient {
  if (!gradient?.enabled || typeof ctx.createLinearGradient !== 'function') return color
  const half = Math.hypot(area.width, area.height) / 2
  const extent = Math.max(0.05, audio?.extent ?? 1)
  let cx = area.x + area.width / 2
  let cy = area.y + area.height / 2
  let fill: CanvasGradient
  if (gradient.type === 'radial') {
    const shift = (audio?.centerShift ?? 0) * half
    if (shift) {
      // shift ≠ 0 nur mit audio
      cx += Math.cos(audio?.shiftAngle || 0) * shift
      cy += Math.sin(audio?.shiftAngle || 0) * shift
    }
    fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, half * extent)
  } else {
    const deg = (Number(gradient.angle) || 0) + (audio?.angleOffset ?? 0)
    const rad = (deg * Math.PI) / 180
    const dx = Math.cos(rad) * half * extent
    const dy = Math.sin(rad) * half * extent
    fill = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy)
  }
  fill.addColorStop(0, color)
  fill.addColorStop(1, gradient.color2)
  return fill
}

export class BackgroundRenderer {
  manager: BackgroundRendererManager

  constructor(canvasManager: BackgroundRendererManager) {
    this.manager = canvasManager
  }

  /** Geometrische Effekte um (cx, cy) – siehe audioReactiveDraw.js */
  _applyAudioReactiveTransform(
    ctx: Ctx,
    audioReactive: BackgroundAudioReactive,
    cx: number,
    cy: number,
  ): boolean {
    return applyAudioReactiveTransform(ctx, audioReactive, cx, cy)
  }

  /** Overlay-Effekte (Kontur, Vignette) – siehe audioReactiveDraw.js */
  _drawAudioReactiveOverlays(
    ctx: Ctx,
    audioReactive: BackgroundAudioReactive,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    drawAudioReactiveOverlays(ctx, audioReactive, x, y, w, h)
  }

  /**
   * Zeichnet den kompletten Hintergrund (Farbe, Bild, Video, Tiles)
   */
  drawBackground(ctx: Ctx): void {
    // Läuft die Slideshow als Canvas-/Workspace-Hintergrund, ERSETZT sie das
    // jeweilige Hintergrundbild/-video (statt es nur zu verdecken)
    const slideshowReplacesCanvas = this._slideshowReplacesBackground('canvas')
    const slideshowReplacesWorkspace = this._slideshowReplacesBackground('workspace')
    const hasCanvasVideo = Boolean(this.manager.videoBackground?.videoElement)

    // 1. GLOBAL BACKGROUND (Color or Image with Filters)
    if (slideshowReplacesCanvas) {
      // Canvas-Modus: die Fläche der Slideshow (Farbe/Verlauf/Bild) ersetzt den
      // ganzen Canvas-Hintergrund – Farbe, Farbverlauf, Bild und Video
      this._drawSlideshowBase(ctx)
    } else if (typeof this.manager.background === 'string') {
      this._drawColorBackground(ctx)
    } else if (this.manager.background && typeof this.manager.background === 'object') {
      this._drawImageBackground(ctx)
    } else {
      // Fallback: Weißer Hintergrund wenn nichts gesetzt
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    }

    // 1.2 VIDEO-HINTERGRUND zeichnen (über Farb-/Bild-Hintergrund)
    if (!slideshowReplacesCanvas && hasCanvasVideo) {
      this._drawVideoBackground(ctx)
    }

    // 1.5 KACHELN über dem Haupthintergrund zeichnen (falls aktiviert)
    this.drawBackgroundTiles(ctx)

    const hasWorkspaceImage = Boolean(
      this.manager.workspaceBackground && this.manager.workspacePreset,
    )
    const hasWorkspaceVideo = Boolean(
      this.manager.workspaceVideoBackground?.videoElement && this.manager.workspacePreset,
    )

    // 2. Workspace-Modus: eigene Fläche im Workspace-Bereich (ersetzt ein
    // Workspace-Bild/-Video; auch ohne solches, damit die gewählte Farbe gilt)
    if (slideshowReplacesWorkspace && this.manager.workspacePreset) {
      this._drawSlideshowBase(ctx, this.manager.getWorkspaceBounds?.() ?? null, 'workspace')
    }

    // 2.1 WORKSPACE BACKGROUND
    if (!slideshowReplacesWorkspace && hasWorkspaceImage) {
      this._drawWorkspaceImageBackground(ctx)
    }

    // 2.5 WORKSPACE-VIDEO-HINTERGRUND zeichnen
    if (!slideshowReplacesWorkspace && hasWorkspaceVideo) {
      this._drawWorkspaceVideoBackground(ctx)
    }
  }

  /**
   * Ersetzt die laufende Slideshow gerade den Hintergrund dieses Bereichs?
   * @param {'canvas'|'workspace'} target
   * @returns {boolean}
   */
  _slideshowReplacesBackground(target: string): boolean {
    return isBackgroundReplacedBySlideshow(target)
  }

  /**
   * Fläche (einstellbare Farbe der Slideshow) anstelle des ersetzten
   * Hintergrundbildes – sichtbar während der Übergänge und neben Bildern mit
   * abweichendem Seitenverhältnis.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x:number,y:number,width:number,height:number}|null} [rect] - Standard: ganzer Canvas
   * @param {'canvas'|'workspace'} [target] - bestimmt die Farbe
   */
  _drawSlideshowBase(ctx: Ctx, rect?: Rect | null, target = 'canvas'): void {
    const area =
      rect === undefined ? { x: 0, y: 0, width: ctx.canvas.width, height: ctx.canvas.height } : rect
    if (!area) return
    ctx.save()
    const audioData = getAudioAnalysisData()
    let gradient = getSlideshowBaseGradient(target)
    const audio = gradient?.audio?.enabled
      ? computeSlideshowGradientAudio(gradient.audio, target, audioData)
      : null
    // Audio-Reaktive Farbe: wirkt auf die Flächenfarbe (und die 2. Verlaufsfarbe)
    let color = getSlideshowBaseColor(target)
    const fillAudio = getSlideshowFillAudio(target)
    if (fillAudio) {
      const change = computeSlideshowFillAudio(fillAudio, target, audioData)
      color = applySlideshowFillAudio(color, change)
      if (gradient)
        gradient = { ...gradient, color2: applySlideshowFillAudio(gradient.color2, change) }
    }
    ctx.fillStyle = createSlideshowBaseFill(ctx, area, color, gradient, audio)
    ctx.fillRect(area.x, area.y, area.width, area.height)
    ctx.restore()

    // Eigenes Bild über Farbe/Verlauf (Ränder bei „Einpassen“ in Flächenfarbe)
    const slideshow = getSlideshowManager()
    const baseImage = slideshow?.getBaseImage?.(target)
    if (baseImage) {
      const change = baseImage.fill.audio?.enabled
        ? computeSlideshowImageFillAudio(baseImage.fill.audio, target, audioData)
        : null
      drawSlideshowImageFill(ctx, area, baseImage.image, baseImage.fill, change)
    }
  }

  /**
   * Zeichnet einen Farbhintergrund mit optionalem Gradient
   */
  _drawColorBackground(ctx: Ctx, color = this.manager.background as string): void {
    ctx.save()
    const canvasW = ctx.canvas.width
    const canvasH = ctx.canvas.height

    // Audio-Reaktive Effekte auf Hintergrundfarbe anwenden (Filter + Geometrie,
    // identischer Effektsatz wie bei Canvas-Bildern)
    const bgColorAudioReactive = this.manager._getAudioReactiveValues(
      this.manager.backgroundColorSettings,
    )
    let transformed = false
    if (bgColorAudioReactive && bgColorAudioReactive.hasEffects) {
      this.manager._applyAudioReactiveFilters(ctx, bgColorAudioReactive)
      transformed = this._applyAudioReactiveTransform(
        ctx,
        bgColorAudioReactive,
        canvasW / 2,
        canvasH / 2,
      )
    }

    // GRADIENT: Prüfen ob Gradient aktiviert ist
    if (this.manager.gradientSettings && this.manager.gradientSettings.enabled) {
      const w = ctx.canvas.width
      const h = ctx.canvas.height
      const centerX = w / 2
      const centerY = h / 2
      let gradient: CanvasGradient

      // Audio-reaktive Gradient-Werte holen
      let gradientRadius = 1.0
      let gradientAngle = this.manager.gradientSettings.angle || 0

      if (bgColorAudioReactive && bgColorAudioReactive.hasEffects) {
        if (bgColorAudioReactive.effects.gradientPulse) {
          gradientRadius = bgColorAudioReactive.effects.gradientPulse.gradientRadius as number
        }
        if (bgColorAudioReactive.effects.gradientRotation) {
          gradientAngle += bgColorAudioReactive.effects.gradientRotation.gradientAngle as number
        }
      }

      if (this.manager.gradientSettings.type === 'radial') {
        // Radialer Gradient vom Zentrum
        const maxRadius = Math.max(w, h) * gradientRadius
        gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius)
      } else {
        // Linearer Gradient mit Winkel
        const angleRad = (gradientAngle * Math.PI) / 180
        const length = Math.max(w, h)
        const dx = Math.cos(angleRad) * length
        const dy = Math.sin(angleRad) * length
        gradient = ctx.createLinearGradient(
          centerX - dx / 2,
          centerY - dy / 2,
          centerX + dx / 2,
          centerY + dy / 2,
        )
      }

      // nur bei Farb-Hintergrund (string) aufgerufen
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, this.manager.gradientSettings.color2)
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = color
    }

    if (transformed) {
      // Bei Verschiebung/Rotation/Skalierung eine deutlich größere Fläche füllen,
      // damit an den Rändern keine Lücken entstehen.
      ctx.fillRect(-canvasW, -canvasH, canvasW * 3, canvasH * 3)
    } else {
      ctx.fillRect(0, 0, canvasW, canvasH)
    }
    ctx.restore()

    // Overlay-Effekte (Kontur, Vignette) in Canvas-Koordinaten über dem Hintergrund
    this._drawAudioReactiveOverlays(ctx, bgColorAudioReactive, 0, 0, canvasW, canvasH)
  }

  /**
   * Zeichnet einen Bild-Hintergrund
   */
  _drawImageBackground(ctx: Ctx): void {
    // nur bei Bild-Hintergrund (Objekt) aufgerufen
    const background = this.manager.background as BackgroundImageObject
    // Animiertes Hintergrundbild: freie Fläche in der eingestellten
    // Hintergrundfarbe (inkl. Verlauf), wie ohne Bild
    if (hasImageAnimation((background as ImageAnimationTarget).timedAnimation)) {
      this._drawColorBackground(ctx, this.manager.backgroundColor || '#ffffff')
    }
    ctx.save()

    // Statische Filter vom FotoManager
    if (this.manager.fotoManager && background.type === 'background') {
      this.manager.fotoManager.applyFilters(ctx, background)
    }

    // Audio-Reaktive Effekte für Hintergrundbild
    const bgAudioReactive = this.manager._getAudioReactiveValues(
      background.fotoSettings?.audioReactive,
    )
    if (bgAudioReactive && bgAudioReactive.hasEffects) {
      this.manager._applyAudioReactiveFilters(ctx, bgAudioReactive)
    }

    const img = (background.imageObject || background) as CanvasImageSource

    // Scale-Effekt für Hintergrundbild
    let drawX = 0,
      drawY = 0,
      drawW = ctx.canvas.width,
      drawH = ctx.canvas.height
    if (bgAudioReactive && bgAudioReactive.effects.scale) {
      const scale = bgAudioReactive.effects.scale.scale as number
      const centerX = ctx.canvas.width / 2
      const centerY = ctx.canvas.height / 2
      drawW = ctx.canvas.width * scale
      drawH = ctx.canvas.height * scale
      drawX = centerX - drawW / 2
      drawY = centerY - drawH / 2
    }

    // Animation (Fade/Scale/Slide wie bei Bildern)
    ;({
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    } = applyBackgroundAnimation(ctx, background as ImageAnimationTarget, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    }))

    // FLIP anwenden (Horizontal und/oder Vertikal spiegeln)
    const bgFlipH = background.fotoSettings?.flipH || false
    const bgFlipV = background.fotoSettings?.flipV || false
    if (bgFlipH || bgFlipV) {
      const centerX = drawX + drawW / 2
      const centerY = drawY + drawH / 2
      ctx.translate(centerX, centerY)
      ctx.scale(bgFlipH ? -1 : 1, bgFlipV ? -1 : 1)
      ctx.translate(-centerX, -centerY)
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH)

    if (this.manager.fotoManager && background.type === 'background') {
      this.manager.fotoManager.resetFilters(ctx)
    }

    ctx.restore()
  }

  /**
   * Zeichnet einen Video-Hintergrund
   */
  _drawVideoBackground(ctx: Ctx): void {
    // nur mit Video-Hintergrund aufgerufen
    const videoBackground = this.manager.videoBackground as VideoBackgroundObject
    const video = videoBackground.videoElement
    if (video.readyState < 2) return // HAVE_CURRENT_DATA

    ctx.save()

    // Filter anwenden
    if (this.manager.fotoManager) {
      this.manager.fotoManager.applyFilters(ctx, videoBackground)
    }

    // Audio-Reaktive Effekte
    const vbgAudioReactive = this.manager._getAudioReactiveValues(
      videoBackground.fotoSettings?.audioReactive,
    )
    if (vbgAudioReactive && vbgAudioReactive.hasEffects) {
      this.manager._applyAudioReactiveFilters(ctx, vbgAudioReactive)
    }

    // Video auf gesamten Canvas zeichnen (Cover-Modus)
    const videoAspect = video.videoWidth / video.videoHeight
    const canvasAspect = ctx.canvas.width / ctx.canvas.height

    let drawX = 0,
      drawY = 0,
      drawW = ctx.canvas.width,
      drawH = ctx.canvas.height

    if (videoAspect > canvasAspect) {
      // Video ist breiter - an Höhe anpassen
      drawH = ctx.canvas.height
      drawW = drawH * videoAspect
      drawX = (ctx.canvas.width - drawW) / 2
    } else {
      // Video ist höher - an Breite anpassen
      drawW = ctx.canvas.width
      drawH = drawW / videoAspect
      drawY = (ctx.canvas.height - drawH) / 2
    }

    // Geometrische Effekte (Skalierung, Rotation, Beat-Flip, Skew, Bewegung …)
    // um das Canvas-Zentrum – identischer Effektsatz wie bei Canvas-Bildern
    this._applyAudioReactiveTransform(
      ctx,
      vbgAudioReactive,
      ctx.canvas.width / 2,
      ctx.canvas.height / 2,
    )

    drawMediaWithAudioReactive(ctx, vbgAudioReactive, video, drawX, drawY, drawW, drawH)

    if (this.manager.fotoManager) {
      this.manager.fotoManager.resetFilters(ctx)
    }

    ctx.restore()

    // Overlay-Effekte (Kontur, Vignette) in Canvas-Koordinaten
    this._drawAudioReactiveOverlays(
      ctx,
      vbgAudioReactive,
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
    )
  }

  /**
   * Zeichnet den Workspace-Bild-Hintergrund
   */
  _drawWorkspaceImageBackground(ctx: Ctx): void {
    // nur mit Workspace-Bild aufgerufen
    const workspaceBackground = this.manager.workspaceBackground as FotoImageObject & {
      imageObject: CanvasImageSource
    }
    const workspaceBounds = this.manager.getWorkspaceBounds()
    if (!workspaceBounds) return

    ctx.save()

    // Statische Filter
    if (this.manager.fotoManager) {
      this.manager.fotoManager.applyFilters(ctx, workspaceBackground)
    }

    // Audio-Reaktive Effekte
    const wsAudioReactive = this.manager._getAudioReactiveValues(
      workspaceBackground.fotoSettings?.audioReactive,
    )
    if (wsAudioReactive && wsAudioReactive.hasEffects) {
      this.manager._applyAudioReactiveFilters(ctx, wsAudioReactive)
    }

    const img = workspaceBackground.imageObject

    // Scale-Effekt für Workspace-Hintergrund
    let drawBounds = { ...workspaceBounds }
    if (wsAudioReactive && wsAudioReactive.effects.scale) {
      const scale = wsAudioReactive.effects.scale.scale as number
      const centerX = workspaceBounds.x + workspaceBounds.width / 2
      const centerY = workspaceBounds.y + workspaceBounds.height / 2
      drawBounds.width = workspaceBounds.width * scale
      drawBounds.height = workspaceBounds.height * scale
      drawBounds.x = centerX - drawBounds.width / 2
      drawBounds.y = centerY - drawBounds.height / 2
    }

    // Animation (Fade/Scale/Slide wie bei Bildern), auf den Workspace begrenzt
    const wsTarget = workspaceBackground as ImageAnimationTarget
    if (hasImageAnimation(wsTarget.timedAnimation)) {
      ctx.beginPath()
      ctx.rect(workspaceBounds.x, workspaceBounds.y, workspaceBounds.width, workspaceBounds.height)
      ctx.clip()
      drawBounds = applyBackgroundAnimation(ctx, wsTarget, drawBounds)
    }

    // FLIP anwenden (Horizontal und/oder Vertikal spiegeln)
    const wsFlipH = workspaceBackground.fotoSettings?.flipH || false
    const wsFlipV = workspaceBackground.fotoSettings?.flipV || false
    if (wsFlipH || wsFlipV) {
      const centerX = drawBounds.x + drawBounds.width / 2
      const centerY = drawBounds.y + drawBounds.height / 2
      ctx.translate(centerX, centerY)
      ctx.scale(wsFlipH ? -1 : 1, wsFlipV ? -1 : 1)
      ctx.translate(-centerX, -centerY)
    }

    ctx.drawImage(img, drawBounds.x, drawBounds.y, drawBounds.width, drawBounds.height)

    if (this.manager.fotoManager) {
      this.manager.fotoManager.resetFilters(ctx)
    }

    ctx.restore()
  }

  /**
   * Zeichnet den Workspace-Video-Hintergrund
   */
  _drawWorkspaceVideoBackground(ctx: Ctx): void {
    // nur mit Workspace-Video aufgerufen
    const wsVideoBackground = this.manager.workspaceVideoBackground as VideoBackgroundObject
    const video = wsVideoBackground.videoElement
    const workspaceBounds = this.manager.getWorkspaceBounds()

    if (video.readyState < 2 || !workspaceBounds) return

    ctx.save()

    // Filter anwenden
    if (this.manager.fotoManager) {
      this.manager.fotoManager.applyFilters(ctx, wsVideoBackground)
    }

    // Audio-Reaktive Effekte
    const wsvbgAudioReactive = this.manager._getAudioReactiveValues(
      wsVideoBackground.fotoSettings?.audioReactive,
    )
    if (wsvbgAudioReactive && wsvbgAudioReactive.hasEffects) {
      this.manager._applyAudioReactiveFilters(ctx, wsvbgAudioReactive)
    }

    // Video im Workspace-Bereich zeichnen (Cover-Modus)
    const videoAspect = video.videoWidth / video.videoHeight
    const wsAspect = workspaceBounds.width / workspaceBounds.height

    let drawX = workspaceBounds.x
    let drawY = workspaceBounds.y
    let drawW = workspaceBounds.width
    let drawH = workspaceBounds.height

    if (videoAspect > wsAspect) {
      drawH = workspaceBounds.height
      drawW = drawH * videoAspect
      drawX = workspaceBounds.x + (workspaceBounds.width - drawW) / 2
    } else {
      drawW = workspaceBounds.width
      drawH = drawW / videoAspect
      drawY = workspaceBounds.y + (workspaceBounds.height - drawH) / 2
    }

    // Clip auf Workspace-Bereich
    ctx.beginPath()
    ctx.rect(workspaceBounds.x, workspaceBounds.y, workspaceBounds.width, workspaceBounds.height)
    ctx.clip()

    // Geometrische Effekte um das Workspace-Zentrum
    this._applyAudioReactiveTransform(
      ctx,
      wsvbgAudioReactive,
      workspaceBounds.x + workspaceBounds.width / 2,
      workspaceBounds.y + workspaceBounds.height / 2,
    )

    drawMediaWithAudioReactive(ctx, wsvbgAudioReactive, video, drawX, drawY, drawW, drawH)

    if (this.manager.fotoManager) {
      this.manager.fotoManager.resetFilters(ctx)
    }

    // Overlay-Effekte innerhalb des Workspace-Clips
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    this._drawAudioReactiveOverlays(
      ctx,
      wsvbgAudioReactive,
      workspaceBounds.x,
      workspaceBounds.y,
      workspaceBounds.width,
      workspaceBounds.height,
    )

    ctx.restore()
  }

  /**
   * Zeichnet Kachel-Hintergrund
   * Wird aufgerufen wenn tilesEnabled im Store aktiviert ist
   */
  drawBackgroundTiles(ctx: Ctx): boolean {
    if (!this.manager.backgroundTilesStore) return false

    const store = this.manager.backgroundTilesStore
    if (!store.tilesEnabled || store.tiles.length === 0) return false

    const { rows, cols } = store.gridLayout
    const gap = store.tileGap
    const canvasWidth = ctx.canvas.width
    const canvasHeight = ctx.canvas.height

    // Kachelgröße berechnen (mit Lücken)
    const totalGapX = gap * (cols - 1)
    const totalGapY = gap * (rows - 1)
    const tileWidth = (canvasWidth - totalGapX) / cols
    const tileHeight = (canvasHeight - totalGapY) / rows

    let tileIndex = 0

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (tileIndex >= store.tiles.length) break

        const tile = store.tiles[tileIndex] as BackgroundTile // tileIndex < tiles.length
        const x = col * (tileWidth + gap)
        const y = row * (tileHeight + gap)

        ctx.save()

        // Kachel-Bereich clippen
        ctx.beginPath()
        ctx.rect(x, y, tileWidth, tileHeight)
        ctx.clip()

        // Audio-Reaktive Werte für diese Kachel berechnen
        const audioReactive = this.manager._getAudioReactiveValues(tile.audioReactive)

        // 1. Hintergrundfarbe der Kachel zeichnen
        if (tile.backgroundColor) {
          ctx.globalAlpha = tile.backgroundOpacity || 1.0

          // Audio-Reaktive Effekte auf Hintergrundfarbe anwenden
          if (audioReactive && audioReactive.hasEffects) {
            this.manager._applyAudioReactiveFilters(ctx, audioReactive)
          }

          ctx.fillStyle = tile.backgroundColor
          ctx.fillRect(x, y, tileWidth, tileHeight)

          // Filter und Alpha zurücksetzen für Bild
          ctx.filter = 'none'
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1.0
        }

        // 2. Bild oder Video der Kachel zeichnen (falls vorhanden)
        const mediaElement = tile.video || tile.image
        const isVideo = !!tile.video

        if (
          mediaElement &&
          (isVideo
            ? (mediaElement as HTMLVideoElement).readyState >= 2
            : (mediaElement as HTMLImageElement).complete)
        ) {
          const settings: Partial<TileImageSettings> = tile.imageSettings || {}

          // Statische Filter anwenden
          const filterString = store.getTileImageFilter(tileIndex)
          if (filterString.trim()) {
            ctx.filter = filterString.trim()
          }

          // Deckkraft
          ctx.globalAlpha = (settings.opacity || 100) / 100

          // Audio-Reaktive Effekte – derselbe Effektsatz wie bei Canvas-Bildern:
          // Filter (inkl. Strobe/Farb-Strobe/Glow) + Geometrie (Skalierung,
          // Rotation, Beat-Flip, Skew, Perspektive, Bewegung) um das Kachelzentrum.
          if (audioReactive && audioReactive.hasEffects) {
            this.manager._applyAudioReactiveFilters(ctx, audioReactive)
            this._applyAudioReactiveTransform(
              ctx,
              audioReactive,
              x + tileWidth / 2,
              y + tileHeight / 2,
            )
          }

          // Skalierung und Offset (audio-reaktive Skalierung steckt in der Transformation)
          const scale = settings.scale || 1.0
          const offsetX = settings.offsetX || 0
          const offsetY = settings.offsetY || 0

          // Media-Aspektratio beibehalten (Cover-Modus)
          const mediaWidth = isVideo
            ? (mediaElement as HTMLVideoElement).videoWidth
            : (mediaElement as HTMLImageElement).width
          const mediaHeight = isVideo
            ? (mediaElement as HTMLVideoElement).videoHeight
            : (mediaElement as HTMLImageElement).height
          const mediaAspect = mediaWidth / mediaHeight
          const tileAspect = tileWidth / tileHeight

          let drawWidth: number, drawHeight: number

          if (mediaAspect > tileAspect) {
            // Media ist breiter - Höhe anpassen
            drawHeight = tileHeight * scale
            drawWidth = drawHeight * mediaAspect
          } else {
            // Media ist höher - Breite anpassen
            drawWidth = tileWidth * scale
            drawHeight = drawWidth / mediaAspect
          }

          // Zentrieren mit Offset
          const drawX = x + (tileWidth - drawWidth) / 2 + offsetX
          const drawY = y + (tileHeight - drawHeight) / 2 + offsetY

          drawMediaWithAudioReactive(
            ctx,
            audioReactive,
            mediaElement,
            drawX,
            drawY,
            drawWidth,
            drawHeight,
          )

          // Filter zurücksetzen
          ctx.filter = 'none'
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1.0
        }

        ctx.restore()

        // Overlay-Effekte (audio-reaktive Kontur, Vignette-Puls) innerhalb der Kachel
        if (audioReactive && audioReactive.hasEffects) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(x, y, tileWidth, tileHeight)
          ctx.clip()
          this._drawAudioReactiveOverlays(ctx, audioReactive, x, y, tileWidth, tileHeight)
          ctx.restore()
        }

        // Auswahlrahmen zeichnen wenn Kachel ausgewählt ist
        // NICHT während Recording zeichnen (UI-Element)
        if (!this.manager.isRecording && store.selectedTileIndex === tileIndex) {
          ctx.save()
          ctx.strokeStyle = '#6ea8fe'
          ctx.lineWidth = 3
          ctx.setLineDash([8, 4])
          ctx.strokeRect(x + 1.5, y + 1.5, tileWidth - 3, tileHeight - 3)
          ctx.setLineDash([])

          // Kachel-Nummer anzeigen
          ctx.fillStyle = 'rgba(110, 168, 254, 0.9)'
          ctx.font = 'bold 16px Arial'
          const label = `Kachel ${tileIndex + 1}`
          const textWidth = ctx.measureText(label).width
          ctx.fillRect(x + 5, y + 5, textWidth + 12, 24)
          ctx.fillStyle = '#ffffff'
          ctx.fillText(label, x + 11, y + 22)
          ctx.restore()
        }

        tileIndex++
      }
    }

    return true // Kacheln wurden gezeichnet
  }

  /**
   * Prüft ob ein Punkt innerhalb einer Kachel liegt
   * Gibt den Kachel-Index zurück oder -1
   */
  getTileAtPosition(x: number, y: number): number {
    if (!this.manager.backgroundTilesStore) return -1

    const store = this.manager.backgroundTilesStore
    if (!store.tilesEnabled || store.tiles.length === 0) return -1

    const { rows, cols } = store.gridLayout
    const gap = store.tileGap
    const canvasWidth = this.manager.canvas.width
    const canvasHeight = this.manager.canvas.height

    const totalGapX = gap * (cols - 1)
    const totalGapY = gap * (rows - 1)
    const tileWidth = (canvasWidth - totalGapX) / cols
    const tileHeight = (canvasHeight - totalGapY) / rows

    let tileIndex = 0

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (tileIndex >= store.tiles.length) return -1

        const tileX = col * (tileWidth + gap)
        const tileY = row * (tileHeight + gap)

        if (x >= tileX && x < tileX + tileWidth && y >= tileY && y < tileY + tileHeight) {
          return tileIndex
        }

        tileIndex++
      }
    }

    return -1
  }
}
