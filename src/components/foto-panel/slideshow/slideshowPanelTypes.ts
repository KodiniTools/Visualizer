/**
 * Gemeinsame Typen des Slideshow-Panels (SlideshowPanel.vue) und seiner
 * Composables in `slideshow/`.
 */
import type { SlideshowSourceImage } from '../../../lib/slideshowSources'
import type { RelBounds } from '../../../lib/slideshowTransitions'
import type { SlideshowAdjustmentsApi } from '../slideshowAdjustmentsApi'
import type { SlideshowGradient } from '../../../lib/slideshowBaseColor'
import type { SlideshowFillAudio } from '../../../lib/slideshowFillAudio'
import type { SlideshowImageFill } from '../../../lib/slideshowImageFill'

/** Bild-Einstellungen öffnen (Klick auf ein Bild der Leiste, pausiert) */
export interface SlideshowEditRequest {
  index: number
  nonce: number
}

/** Props des Slideshow-Panels */
export interface SlideshowPanelProps {
  images: SlideshowSourceImage[]
  hasSavedSettings?: boolean
  isActive?: boolean
  isPaused?: boolean
  currentImageIndex?: number
  totalImages?: number
  currentPhase?: string
  hasWorkspace?: boolean
  /** Gemerkte Bild-Anpassungen/-Größen (siehe createSlideshowAdjustmentsApi) */
  adjustmentsApi?: SlideshowAdjustmentsApi | null
  /** Gemeinsamer Bereich wurde per Maus verschoben */
  externalTransform?: RelBounds | null
  editImageRequest?: SlideshowEditRequest | null
  /** Erhöht sich bei jeder Änderung eigener Bild-Bounds (Maus, Positionsregler) */
  boundsRevision?: number
}

/** Ereignisse des Slideshow-Panels */
export type SlideshowPanelEvent =
  | 'start'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'order-changed'
  | 'render-layer-change'
  | 'transform-change'
  | 'background-mode-change'
  | 'background-color-change'
  | 'workspace-color-change'
  | 'base-gradient-change'
  | 'base-fill-audio-change'
  | 'base-image-change'
  | 'reset-image-adjustments'
  | 'live-update'
  | 'move-mode-change'
  | 'visibility-change'

/** Emit-Funktion des Slideshow-Panels, wie sie die Composables nutzen */
export type SlideshowPanelEmit = (event: SlideshowPanelEvent, ...args: unknown[]) => void

/** Bild-Eintrag der Start-/Live-Update-Konfiguration (siehe payloadFor) */
export interface SlideshowRunImage extends SlideshowSourceImage {
  displayDuration?: number
  audioMode?: string
  audioSource?: string | null
  transition?: string
  fadeInDuration?: number
  fadeOutDuration?: number
}

/** Start-/Live-Update-Konfiguration des Slideshow-Panels (buildPayload) */
export interface SlideshowRunConfig {
  images: SlideshowRunImage[]
  fadeInDuration: number
  displayDuration: number
  fadeOutDuration: number
  applyAudioReactive: boolean
  loop: boolean
  renderBehindVisualizer: boolean
  backgroundMode: string
  fitToWorkspace: boolean
  backgroundColor: string
  workspaceColor: string
  backgroundGradient: SlideshowGradient
  workspaceGradient: SlideshowGradient
  backgroundFillAudio: SlideshowFillAudio
  workspaceFillAudio: SlideshowFillAudio
  backgroundImageFill: SlideshowImageFill
  workspaceImageFill: SlideshowImageFill
  backgroundImageObject: HTMLImageElement | null
  workspaceImageObject: HTMLImageElement | null
  moveWholeSlideshow: boolean
  transition: string
  transform: RelBounds
  /** Live-Bearbeitung eines Bildes: aktuelle Anpassungen vorher übernehmen */
  preserveLive?: boolean
}
