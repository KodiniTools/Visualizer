// canvasManager.js - Fassade mit Konstruktor und Kern-API
//
// Die Methoden sind nach Themen in canvasManager/methods/ aufgeteilt und werden
// unten per applyMethods() auf CanvasManager.prototype übertragen – die
// öffentliche API bleibt dieselbe:
// - methods/selectionMethods.js - Auswahl, Mehrfachauswahl, Hit-Tests/Bounds
// - methods/workspaceMethods.js - Workspace-Presets
// - methods/contentMethods.js - Texte, Bilder, Objekt-Eigenschaften
// - methods/backgroundMethods.js - Bild-Hintergrund (Canvas/Workspace)
// - methods/videoBackgroundMethods.js - Video-Hintergrund
// - methods/backgroundSettingsMethods.js - Audio-Reaktiv/Verlauf/Kacheln
// - methods/stateMethods.js - Zurücksetzen, Zustand
// - methods/deletionMethods.js - Löschen mit Undo
// - methods/renderingDelegates.js - Zeichnen, Recording
// - methods/interactionDelegates.js - Drag & Drop, Maus
// - methods/selectionModeMethods.js - Text-/Bild-Auswahlmodus
//
// Weitere Bausteine:
// - rendering/BackgroundRenderer.js - Hintergrund-Rendering
// - rendering/SceneRenderer.js - Szenen-Rendering
// - rendering/UIRenderer.js - UI-Elemente Rendering
// - interaction/MouseHandler.js - Maus-Events
// - interaction/SelectionManager.js - Objekt-Auswahl
// - interaction/DragDropHandler.js - Drag & Drop
// - recording/CanvasPool.js - Canvas-Pooling
// - recording/RecordingRenderer.js - Recording-Rendering

import { BackgroundRenderer, SceneRenderer, UIRenderer } from './canvasManager/rendering/index.js'
import {
  MouseHandler,
  SelectionManager,
  DragDropHandler,
} from './canvasManager/interaction/index.js'
import { RecordingRenderer } from './canvasManager/recording/index.js'
import {
  applyMethods,
  SelectionMethods,
  WorkspaceMethods,
  ContentMethods,
  BackgroundMethods,
  VideoBackgroundMethods,
  BackgroundSettingsMethods,
  StateMethods,
  DeletionMethods,
  RenderingDelegates,
  InteractionDelegates,
  SelectionModeMethods,
} from './canvasManager/methods/index.js'

/**
 * CanvasManager - Orchestrator für alle Canvas-Operationen
 *
 * Diese Klasse koordiniert die verschiedenen Module und stellt
 * die öffentliche API für die Anwendung bereit.
 */
export class CanvasManager {
  constructor(canvas, dependencies) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    // Dependencies
    this.redrawCallback = dependencies.redrawCallback || dependencies.redraw
    this.onSelectionChange = dependencies.onObjectSelected
    this.updateUICallback = dependencies.onStateChange
    this.onTextEditStart = dependencies.onTextDoubleClick
    // Wird nach dem Löschen eines Canvas-Objekts (Text/Bild/Video) aufgerufen
    // und stellt undo()/redo()-Hooks für die History + Undo-Toast bereit
    this.onObjectDeleted = dependencies.onObjectDeleted
    this.textManager = dependencies.textManager
    this.gridManager = dependencies.gridManager
    this.fotoManager = dependencies.fotoManager
    this.multiImageManager = dependencies.multiImageManager
    this.videoManager = dependencies.videoManager

    // State
    this.background = '#ffffff'
    this.workspaceBackground = null
    this.videoBackground = null
    this.workspaceVideoBackground = null
    this.backgroundColorSettings = null
    this.backgroundTilesStore = null

    // Gradient-Einstellungen für Hintergrund
    this.gradientSettings = {
      enabled: false,
      color2: '#000000',
      type: 'radial',
      angle: 0,
    }

    this.activeObject = null
    this.hoveredObject = null
    this.currentAction = null
    this.dragStartPos = { x: 0, y: 0 }
    this.isEditingText = false
    this.isRecording = false

    // Multi-selection: array of text objects selected alongside activeObject
    this.selectedObjects = []

    // Text-Rechteck-Auswahl-Modus
    this.textSelectionMode = false
    this.textSelectionRect = null
    this.onTextSelectionComplete = null

    // Text-Positions-Vorschau
    this.textPositionPreview = null

    // Bild-Bereichsauswahl-Modus
    this.imageSelectionMode = false
    this.imageSelectionRect = null
    this.onImageSelectionComplete = null
    this.pendingImageAnimation = null

    // Cached bounds for drag operations
    this._cachedBounds = null

    this._selectionListeners = []

    // Social Media Presets
    this.socialMediaPresets = {
      tiktok: { width: 1080, height: 1920, name: 'TikTok (9:16)' },
      'instagram-story': { width: 1080, height: 1920, name: 'Instagram Story (9:16)' },
      'instagram-post': { width: 1080, height: 1080, name: 'Instagram Post (1:1)' },
      'instagram-reel': { width: 1080, height: 1920, name: 'Instagram Reel (9:16)' },
      'youtube-short': { width: 1080, height: 1920, name: 'YouTube Short (9:16)' },
      'youtube-video': { width: 1920, height: 1080, name: 'YouTube Video (16:9)' },
      'facebook-post': { width: 1200, height: 630, name: 'Facebook Post (1.91:1)' },
      'twitter-video': { width: 1280, height: 720, name: 'X/Twitter Video (16:9)' },
      'linkedin-video': { width: 1920, height: 1080, name: 'LinkedIn Video (16:9)' },
    }
    this.workspacePreset = null
    this.showWorkspaceOutline = false

    // Initialize modules
    this.backgroundRenderer = new BackgroundRenderer(this)
    this.sceneRenderer = new SceneRenderer(this)
    this.uiRenderer = new UIRenderer(this)
    this.mouseHandler = new MouseHandler(this)
    this.selectionManager = new SelectionManager(this)
    this.dragDropHandler = new DragDropHandler(this)
    this.recordingRenderer = new RecordingRenderer(this)

    // FotoManager callback setup
    if (this.fotoManager) {
      this.fotoManager.getActiveImage = () => this.getActiveImage()
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC API - Diese Methoden werden von der Anwendung verwendet
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Aktualisiert die Canvas-Referenz
   */
  updateCanvas(newCanvas) {
    if (newCanvas && newCanvas !== this.canvas) {
      console.log('[CanvasManager] Canvas-Referenz aktualisiert')
      this.canvas = newCanvas
      this.ctx = newCanvas.getContext('2d')

      if (this.multiImageManager && typeof this.multiImageManager.updateCanvas === 'function') {
        this.multiImageManager.updateCanvas(newCanvas)
      }
      if (this.videoManager && typeof this.videoManager.updateCanvas === 'function') {
        this.videoManager.updateCanvas(newCanvas)
      }
      if (this.gridManager && typeof this.gridManager.updateCanvas === 'function') {
        this.gridManager.updateCanvas(newCanvas)
      }

      return true
    }
    return false
  }

  /**
   * Initialisiert Event-Handler
   */
  setupInteractionHandlers() {
    this.mouseHandler.setupInteractionHandlers()
  }

  /**
   * ✨ Wandelt ein Pointer-/Drag-Event in relative Canvas-Koordinaten (0..1) um.
   * Nutzt exakt dieselbe Berechnung wie die Maus-Interaktion und berücksichtigt
   * damit das CSS-Sizing (object-fit: contain / Letterboxing) korrekt.
   * Nützlich z.B. für Drag & Drop aus der Galerie auf den Canvas.
   * @param {MouseEvent|DragEvent} e - Event mit clientX/clientY
   * @returns {{relX: number, relY: number}}
   */
  getRelativePositionFromEvent(e) {
    const { x, y } = this.mouseHandler.getMousePos(e)
    return {
      relX: x / this.canvas.width,
      relY: y / this.canvas.height,
    }
  }
}

// Methoden-Gruppen auf den Prototyp übertragen (siehe canvasManager/methods/)
applyMethods(
  CanvasManager,
  SelectionMethods,
  WorkspaceMethods,
  ContentMethods,
  BackgroundMethods,
  VideoBackgroundMethods,
  BackgroundSettingsMethods,
  StateMethods,
  DeletionMethods,
  RenderingDelegates,
  InteractionDelegates,
  SelectionModeMethods,
)
