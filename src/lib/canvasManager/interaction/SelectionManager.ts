// SelectionManager.js - Objekt-Auswahl und -Verwaltung

/**
 * SelectionManager - Verantwortlich für Objekt-Auswahl und Hit-Detection
 *
 * Funktionen:
 * - Objekt-Auswahl und -Deselektierung
 * - Hit-Detection (getObjectAtPos)
 * - Resize-Handles Berechnung
 * - Delete-Button Berechnung
 * - Text/Image Selection Bounds
 */
import { isBackgroundReplacedBySlideshow } from '../rendering/BackgroundRenderer'
import { getResizeHandles, isPointInRect } from '../../canvasObjects/geometry'
import type { Rect } from '../../canvasObjects/geometry'
import type { CanvasManager, CanvasObject, CanvasTextObject } from '../../canvasManager'
import type { CanvasImage } from '../../multiImageManager'
import type { VideoObject } from '../../videoManager'

/** Aufgezogener Auswahlbereich (Pixel und relativ zum Canvas) */
export interface SelectionAreaBounds extends Rect {
  relX: number
  relY: number
  relWidth: number
  relHeight: number
  centerX: number
  centerY: number
  relCenterX: number
  relCenterY: number
}

export interface ImageSelectionAreaBounds extends SelectionAreaBounds {
  animation: string
}

export type ResizeHandleKey =
  | 'resize-tl'
  | 'resize-tr'
  | 'resize-bl'
  | 'resize-br'
  | 'resize-t'
  | 'resize-b'
  | 'resize-l'
  | 'resize-r'

export class SelectionManager {
  manager: CanvasManager
  HANDLE_SIZE: number
  HANDLE_HIT_TOLERANCE: number

  constructor(canvasManager: CanvasManager) {
    this.manager = canvasManager
    this.HANDLE_SIZE = 10
    this.HANDLE_HIT_TOLERANCE = 4 // Extra pixels for easier handle targeting
  }

  /**
   * Setzt das aktive Objekt
   */
  /**
   * Liegt ein Bild-Objekt noch auf dem Canvas? (Vergleich per ID – robust
   * gegenüber reaktiven Proxys). Andere Objekt-Typen gelten als vorhanden.
   */
  isObjectOnCanvas(obj: CanvasObject | null | undefined): boolean {
    if (!obj || obj.type !== 'image') return true
    const images = this.manager.multiImageManager?.images
    if (!Array.isArray(images)) return true
    return images.some((img) => img.id === obj.id)
  }

  /**
   * Entfernt Verweise auf Bilder, die nicht mehr auf dem Canvas liegen (z. B.
   * ausgeblendete Slideshow-Bilder), aus aktiver, Hover- und Mehrfachauswahl –
   * sonst bleiben ihre Markierungen an der alten Stelle stehen.
   * @returns {boolean} true, wenn etwas entfernt wurde
   */
  pruneRemovedObjects(): boolean {
    const m = this.manager
    let changed = false
    if (m.activeObject && !this.isObjectOnCanvas(m.activeObject)) {
      m.activeObject = null
      m._cachedBounds = null
      changed = true
    }
    if (m.hoveredObject && !this.isObjectOnCanvas(m.hoveredObject)) {
      m.hoveredObject = null
      changed = true
    }
    if (m.selectedObjects?.length) {
      const kept = m.selectedObjects.filter((obj) => this.isObjectOnCanvas(obj))
      if (kept.length !== m.selectedObjects.length) {
        m.selectedObjects = kept
        changed = true
      }
    }
    return changed
  }

  setActiveObject(obj: CanvasObject | null): void {
    const previousActive = this.manager.activeObject
    this.manager.activeObject = obj
    // Normal click always clears multi-selection
    this.manager.selectedObjects = []

    // Text-Objekte immer an die oberste Ebene verschieben
    if (obj && obj.type === 'text' && this.manager.textManager) {
      this.manager.textManager.moveToTop(obj)
    }

    // Synchronisiere MultiImageManager Auswahl
    if (this.manager.multiImageManager) {
      if (obj && obj.type === 'image') {
        this.manager.multiImageManager.setSelectedImage(obj)
      } else {
        this.manager.multiImageManager.setSelectedImage(null)
      }
    }

    // FIX: Für Hintergrund-Typen IMMER den Callback aufrufen
    const isBackgroundType =
      obj &&
      (obj.type === 'workspace-background' ||
        obj.type === 'background' ||
        obj.type === 'video-background' ||
        obj.type === 'workspace-video-background')

    if (obj !== previousActive || isBackgroundType) {
      if (this.manager.onSelectionChange) {
        this.manager.onSelectionChange(obj)
      }
      this.manager._notifySelectionListeners(obj)
    }
  }

  /**
   * Prüft NUR ob ein Text-Objekt an der Position liegt
   */
  getTextAtPos(x: number, y: number): CanvasObject | null {
    if (this.manager.textManager && this.manager.textManager.textObjects) {
      for (let i = this.manager.textManager.textObjects.length - 1; i >= 0; i--) {
        const textObj = this.manager.textManager.textObjects[i] as CanvasTextObject // i < length
        if (textObj.offCanvas) continue
        const bounds = this.manager.getObjectBounds(textObj)
        if (bounds && this.isPointInRect(x, y, bounds)) {
          return textObj
        }
      }
    }
    return null
  }

  /**
   * Findet das Objekt an der gegebenen Position
   */
  getObjectAtPos(x: number, y: number): CanvasObject | null {
    // Text-Objekte haben HÖCHSTE Priorität - müssen IMMER anklickbar sein
    if (this.manager.textManager && this.manager.textManager.textObjects) {
      for (let i = this.manager.textManager.textObjects.length - 1; i >= 0; i--) {
        const textObj = this.manager.textManager.textObjects[i] as CanvasTextObject // i < length
        if (textObj.offCanvas) continue
        const bounds = this.manager.getObjectBounds(textObj)
        if (bounds && this.isPointInRect(x, y, bounds)) {
          return textObj
        }
      }
    }

    // Dann Videos prüfen (über Bildern, unter Text)
    if (this.manager.videoManager) {
      const videos = this.manager.videoManager.getAllVideos()
      for (let i = videos.length - 1; i >= 0; i--) {
        const videoData = videos[i] as VideoObject // i < length
        // Vom Beat-Marker ausgeblendet → unsichtbar, nicht anklickbar
        if (this.manager.videoManager.isMarkerHidden?.(videoData.id)) continue
        const bounds = this.manager.getObjectBounds(videoData)
        if (bounds && this.isPointInRect(x, y, bounds)) {
          return videoData
        }
      }
    }

    // Dann Bilder prüfen (über Hintergründen)
    if (this.manager.multiImageManager) {
      const images = this.manager.multiImageManager.getAllImages()
      for (let i = images.length - 1; i >= 0; i--) {
        const imgData = images[i] as CanvasImage // i < length
        const bounds = this.manager.getObjectBounds(imgData)
        if (bounds && this.isPointInRect(x, y, bounds)) {
          return imgData
        }
      }
    }

    // Dann Workspace-Hintergrund prüfen
    if (
      this.manager.workspaceBackground &&
      this.manager.workspacePreset &&
      !isBackgroundReplacedBySlideshow('workspace')
    ) {
      const workspaceBounds = this.manager.getWorkspaceBounds()
      if (workspaceBounds && this.isPointInRect(x, y, workspaceBounds)) {
        return this.manager.workspaceBackground
      }
    }

    // Zuletzt globaler Hintergrund (nicht, solange die Slideshow ihn ersetzt)
    if (
      this.manager.background &&
      typeof this.manager.background === 'object' &&
      !isBackgroundReplacedBySlideshow('canvas')
    ) {
      return this.manager.background
    }

    return null
  }

  /**
   * Prüft ob ein Punkt innerhalb eines Rechtecks liegt
   */
  isPointInRect(x: number, y: number, rect: Rect): boolean {
    return isPointInRect(x, y, rect)
  }

  /**
   * Berechnet alle Resize-Handles für ein Objekt
   */
  getResizeHandles(bounds: Rect): Record<ResizeHandleKey, Rect> {
    return getResizeHandles(bounds, this.HANDLE_SIZE)
  }

  /**
   * Prüft ob ein Punkt auf einem Resize-Handle liegt
   */
  getHandleAtPos(bounds: Rect, x: number, y: number): ResizeHandleKey | null {
    const handles = this.getResizeHandles(bounds)
    const tolerance = this.HANDLE_HIT_TOLERANCE

    // Corner handles first (higher priority)
    const cornerHandles: ResizeHandleKey[] = ['resize-tl', 'resize-tr', 'resize-bl', 'resize-br']
    for (const key of cornerHandles) {
      if (this._isPointInHandleWithTolerance(x, y, handles[key], tolerance)) {
        return key
      }
    }

    // Then edge handles
    const edgeHandles: ResizeHandleKey[] = ['resize-t', 'resize-b', 'resize-l', 'resize-r']
    for (const key of edgeHandles) {
      if (this._isPointInHandleWithTolerance(x, y, handles[key], tolerance)) {
        return key
      }
    }

    return null
  }

  /**
   * Point-in-handle check with extra tolerance
   */
  _isPointInHandleWithTolerance(x: number, y: number, handle: Rect, tolerance: number): boolean {
    return (
      x >= handle.x - tolerance &&
      x <= handle.x + handle.width + tolerance &&
      y >= handle.y - tolerance &&
      y <= handle.y + handle.height + tolerance
    )
  }

  /**
   * Berechnet die Position des Delete-Buttons
   */
  getDeleteButtonBounds(objectBounds: Rect): Rect {
    const size = 20
    const offset = size / 2
    return {
      x: objectBounds.x + objectBounds.width - offset,
      y: objectBounds.y - offset,
      width: size,
      height: size,
    }
  }

  /**
   * Gibt die normalisierten Bounds des Text-Auswahl-Rechtecks zurück
   */
  getTextSelectionBounds(): SelectionAreaBounds | null {
    if (!this.manager.textSelectionRect) return null

    const rect = this.manager.textSelectionRect
    const x = Math.min(rect.startX, rect.endX)
    const y = Math.min(rect.startY, rect.endY)
    const width = Math.abs(rect.endX - rect.startX)
    const height = Math.abs(rect.endY - rect.startY)

    // Mindestgröße prüfen (mindestens 30x30 Pixel)
    if (width < 30 || height < 30) return null

    return {
      x,
      y,
      width,
      height,
      // Relative Werte für Canvas-unabhängige Positionierung
      relX: x / this.manager.canvas.width,
      relY: y / this.manager.canvas.height,
      relWidth: width / this.manager.canvas.width,
      relHeight: height / this.manager.canvas.height,
      // Zentrum für Text-Positionierung
      centerX: x + width / 2,
      centerY: y + height / 2,
      relCenterX: (x + width / 2) / this.manager.canvas.width,
      relCenterY: (y + height / 2) / this.manager.canvas.height,
    }
  }

  /**
   * Gibt die normalisierten Bounds des Bild-Auswahl-Rechtecks zurück
   */
  getImageSelectionBounds(): ImageSelectionAreaBounds | null {
    if (!this.manager.imageSelectionRect) return null

    const rect = this.manager.imageSelectionRect
    const x = Math.min(rect.startX, rect.endX)
    const y = Math.min(rect.startY, rect.endY)
    const width = Math.abs(rect.endX - rect.startX)
    const height = Math.abs(rect.endY - rect.startY)

    // Mindestgröße prüfen (mindestens 30x30 Pixel)
    if (width < 30 || height < 30) return null

    return {
      x,
      y,
      width,
      height,
      // Relative Werte für Canvas-unabhängige Positionierung
      relX: x / this.manager.canvas.width,
      relY: y / this.manager.canvas.height,
      relWidth: width / this.manager.canvas.width,
      relHeight: height / this.manager.canvas.height,
      // Zentrum für Bild-Positionierung
      centerX: x + width / 2,
      centerY: y + height / 2,
      relCenterX: (x + width / 2) / this.manager.canvas.width,
      relCenterY: (y + height / 2) / this.manager.canvas.height,
      // Animation
      animation: this.manager.pendingImageAnimation || 'none',
    }
  }
}
