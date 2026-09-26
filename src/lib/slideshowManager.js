import {
  SLIDESHOW_TRANSITION_DEFAULT,
  computeTransitionState,
  isValidTransition,
  resolveTransition,
} from './slideshowTransitions.js'
import {
  SLIDESHOW_BASE_COLOR_DEFAULT,
  normalizeSlideshowBaseColor,
  normalizeSlideshowGradient,
} from './slideshowBaseColor.js'
import { normalizeSlideshowFillAudio } from './slideshowFillAudio.js'

/**
 * SlideshowManager - Orchestriert die Bild-Slideshow auf dem Canvas
 *
 * Funktionen:
 * - Verwaltet eine Queue von Bildern mit Reihenfolge
 * - Steuert fadeIn, Anzeige, fadeOut Timing pro Bild
 * - Wendet Audio-Reaktive Einstellungen automatisch auf eingeblendete Bilder an
 * - Ist beliebig wiederholbar mit neuen Bildern
 * - Alle Animationen laufen über den Canvas-Context (Recorder-kompatibel)
 */
export class SlideshowManager {
  constructor(multiImageManager, fotoManager, callbacks = {}) {
    this.multiImageManager = multiImageManager
    this.fotoManager = fotoManager

    // Callbacks
    this.redrawCallback = callbacks.redrawCallback || (() => {})
    this.onSlideshowComplete = callbacks.onSlideshowComplete || (() => {})
    this.onImageTransition = callbacks.onImageTransition || (() => {})
    // Liefert die Workspace-Bounds in Canvas-Pixeln ({x,y,width,height}) oder null
    this.getWorkspaceBounds = callbacks.getWorkspaceBounds || (() => null)
    // Gemeinsamer Bereich per Maus verschoben (für die Regler im Panel)
    this.onTransformChange = callbacks.onTransformChange || (() => {})
    // Gemerkte Bild-Anpassungen haben sich geändert (für dauerhafte Speicherung)
    // ({ imageConfig, imageObject, adjustments, audioMode }) => void
    this.onImageAdjustmentsChange = callbacks.onImageAdjustmentsChange || (() => {})
    // Eigene Größe/Position eines Bildes geändert (für dauerhafte Speicherung)
    // ({ imageConfig, imageObject, bounds }) => void
    this.onImageBoundsChange = callbacks.onImageBoundsChange || (() => {})
    // Zuletzt angewendete Workspace-Bounds (erkennt Formatwechsel während der Slideshow)
    this._lastWorkspaceKey = null

    // Slideshow State
    this.isActive = false
    this.isPaused = false
    this.currentIndex = 0
    this.startTime = null
    this.pauseTime = null

    // Animation Frame ID für Cleanup
    this.animationFrameId = null

    // Aktuelle Slideshow-Konfiguration
    this.config = {
      images: [], // Array von { imageObject, audioReactiveSettings?, displayDuration? }
      fadeInDuration: 1000, // ms
      displayDuration: 3000, // ms
      fadeOutDuration: 1000, // ms
      loop: false, // Endlos wiederholen
      autoApplyAudioReactive: true,
      defaultAudioReactiveSettings: null, // Wird auf alle Bilder angewendet
      renderBehindVisualizer: false, // Slideshow hinter dem Visualizer rendern
      transition: SLIDESHOW_TRANSITION_DEFAULT, // Übergangsanimation (siehe slideshowTransitions.js)
      // Slideshow als Hintergrund: 'none' | 'canvas' (ganzer Canvas) | 'workspace'
      // (Workspace-Bereich) – Bilder füllen den Bereich (Cover) und liegen unter
      // den übrigen Canvas-Bildern
      backgroundMode: 'none',
      // Farbe der Fläche unter der Slideshow, wenn sie ein Hintergrundbild ersetzt
      backgroundColor: SLIDESHOW_BASE_COLOR_DEFAULT,
      // Eigene Farbe der Workspace-Fläche (Modus 'workspace')
      workspaceColor: SLIDESHOW_BASE_COLOR_DEFAULT,
      // Farbverläufe der Flächen (siehe slideshowBaseColor.js)
      backgroundGradient: normalizeSlideshowGradient(null),
      workspaceGradient: normalizeSlideshowGradient(null),
      // Audio-Reaktive Flächenfarbe (siehe slideshowFillAudio.js)
      backgroundFillAudio: normalizeSlideshowFillAudio(null),
      workspaceFillAudio: normalizeSlideshowFillAudio(null),
    }

    // ✨ NEU: Slideshow Transform-Einstellungen (Position und Größe)
    // Diese werden auf alle Slideshow-Bilder angewendet
    this.transform = {
      relX: 0.1, // X-Position (0-1, relativ zur Canvas-Breite)
      relY: 0.1, // Y-Position (0-1, relativ zur Canvas-Höhe)
      relWidth: 0.8, // Breite (0-1, relativ zur Canvas-Breite)
      relHeight: 0.8, // Höhe (0-1, relativ zur Canvas-Höhe)
    }

    // Aktuell angezeigte Bilder auf dem Canvas (für Cleanup)
    this.activeImages = []

    // Während der Slideshow geänderte Bild-Einstellungen, pro Bild (imageObject)
    // gemerkt – bleiben über Wiederholung, Stoppen und Neustart erhalten.
    // Wert: { fotoSettings, panelAr } (panelAr = Audio-Vorgabe aus dem Panel beim Merken)
    this._imageMemory = new WeakMap()
    // Eigene Position/Größe pro Bild (imageObject → relative Bild-Bounds);
    // ohne Eintrag gilt der gemeinsame Transform-Bereich der Slideshow.
    this._boundsMemory = new WeakMap()
    // Maus-Verschieben: true = ganze Slideshow, false = einzelnes Bild (Shift kehrt um)
    this.moveWholeSlideshow = false
    // Audio-Vorgabe aus dem Panel pro Index für die aktuelle Slideshow (JSON)
    this._panelAr = []
    // Zeitpunkt der letzten Übernahme laufender Bilder in den Speicher
    this._lastLiveSync = 0

    console.log('[SlideshowManager] Initialisiert')
  }

  /**
   * Setzt die Slideshow-Konfiguration
   * @param {Object} config - Konfiguration
   */
  configure(config) {
    // ✨ FIX: Nur definierte Werte überschreiben, undefined-Werte ignorieren
    for (const key of Object.keys(config)) {
      if (config[key] !== undefined) {
        this.config[key] = config[key]
      }
    }
    console.log(
      '[SlideshowManager] Konfiguration aktualisiert, renderBehindVisualizer:',
      this.config.renderBehindVisualizer,
    )
  }

  /**
   * ✨ NEU: Setzt die Transform-Einstellungen (Position und Größe)
   * @param {Object} transform - { relX, relY, relWidth, relHeight }
   */
  setTransform(transform) {
    this.transform = {
      ...this.transform,
      ...transform,
    }
    console.log('[SlideshowManager] Transform aktualisiert:', this.transform)

    // Aktualisiere alle aktiven Bilder mit neuen Transform-Einstellungen
    this._updateActiveImagesTransform()
  }

  /**
   * ✨ NEU: Gibt die aktuellen Transform-Einstellungen zurück
   */
  getTransform() {
    return this._getWorkspaceTransform() ?? { ...this.transform }
  }

  /**
   * Hintergrund-Bereich als relativer Transform: ganzer Canvas (Modus 'canvas')
   * bzw. Workspace-Bereich (Modus 'workspace', nur mit Workspace-Format) –
   * sonst null (freie Position/Größe).
   * @returns {{relX:number, relY:number, relWidth:number, relHeight:number}|null}
   */
  _getWorkspaceTransform() {
    const mode = this.config.backgroundMode
    if (mode !== 'canvas' && mode !== 'workspace') return null
    const canvas = this.multiImageManager.canvas
    if (!canvas || !canvas.width || !canvas.height) return null
    if (mode === 'canvas') return { relX: 0, relY: 0, relWidth: 1, relHeight: 1 }
    let b = null
    try {
      b = this.getWorkspaceBounds()
    } catch (e) {
      console.warn('[SlideshowManager] Workspace-Bounds nicht verfügbar:', e)
    }
    if (!b || !(b.width > 0) || !(b.height > 0)) return null
    return {
      relX: b.x / canvas.width,
      relY: b.y / canvas.height,
      relWidth: b.width / canvas.width,
      relHeight: b.height / canvas.height,
    }
  }

  /** true, wenn die Slideshow gerade als Hintergrund (Canvas/Workspace) läuft. */
  isFittedToWorkspace() {
    return this._getWorkspaceTransform() !== null
  }

  /** Alias mit sprechenderem Namen. */
  isBackground() {
    return this.isFittedToWorkspace()
  }

  /**
   * Ersetzt die Slideshow gerade das Hintergrundbild/-video des Bereichs?
   * Nur solange sie läuft (auch pausiert) und Bilder zeigt – danach erscheint
   * der normale Hintergrund wieder.
   * @param {'canvas'|'workspace'} target
   * @returns {boolean}
   */
  replacesBackground(target) {
    return (
      this.isActive &&
      this.activeImages.length > 0 &&
      (target === 'canvas' || target === 'workspace') &&
      this.config.backgroundMode === target
    )
  }

  /**
   * Farbe der Fläche unter der Slideshow (auch während laufender Slideshow).
   * Ungültige Werte behalten die bisherige Farbe.
   * @param {string} color - #rrggbb
   */
  setBackgroundColor(color) {
    this.config.backgroundColor = normalizeSlideshowBaseColor(color, this.config.backgroundColor)
  }

  /** @returns {string} #rrggbb */
  getBackgroundColor() {
    return this.config.backgroundColor
  }

  /**
   * Farbe der Workspace-Fläche (auch während laufender Slideshow).
   * Ungültige Werte behalten die bisherige Farbe.
   * @param {string} color - #rrggbb
   */
  setWorkspaceColor(color) {
    this.config.workspaceColor = normalizeSlideshowBaseColor(color, this.config.workspaceColor)
  }

  /** @returns {string} #rrggbb */
  getWorkspaceColor() {
    return this.config.workspaceColor
  }

  /**
   * Farbe der Fläche des Bereichs, den die Slideshow ersetzt.
   * @param {'canvas'|'workspace'} target
   * @returns {string}
   */
  getBaseColor(target) {
    return target === 'workspace' ? this.getWorkspaceColor() : this.getBackgroundColor()
  }

  /**
   * Farbverlauf einer Fläche (auch während laufender Slideshow); fehlende
   * Felder behalten ihren bisherigen Wert.
   * @param {'canvas'|'workspace'} target
   * @param {object} gradient - { enabled, color2, type, angle }
   */
  setBaseGradient(target, gradient) {
    const key = target === 'workspace' ? 'workspaceGradient' : 'backgroundGradient'
    this.config[key] = normalizeSlideshowGradient(gradient, this.config[key])
  }

  /**
   * Audio-Reaktive Flächenfarbe (auch während laufender Slideshow); fehlende
   * Felder behalten ihren bisherigen Wert.
   * @param {'canvas'|'workspace'} target
   * @param {object} audio - { enabled, source, brightness, hue }
   */
  setBaseFillAudio(target, audio) {
    const key = target === 'workspace' ? 'workspaceFillAudio' : 'backgroundFillAudio'
    this.config[key] = normalizeSlideshowFillAudio(audio, this.config[key])
  }

  /** @param {'canvas'|'workspace'} target @returns {object} (Kopie) */
  getBaseFillAudio(target) {
    return {
      ...(target === 'workspace'
        ? this.config.workspaceFillAudio
        : this.config.backgroundFillAudio),
    }
  }

  /**
   * @param {'canvas'|'workspace'} target
   * @returns {{ enabled:boolean, color2:string, type:string, angle:number }} (Kopie)
   */
  getBaseGradient(target) {
    const g =
      target === 'workspace' ? this.config.workspaceGradient : this.config.backgroundGradient
    return { ...g, audio: { ...g.audio } }
  }

  /**
   * Slideshow als Hintergrund einsetzen (auch während laufender Slideshow).
   * @param {'none'|'canvas'|'workspace'} mode
   */
  setBackgroundMode(mode) {
    this.config.backgroundMode = ['canvas', 'workspace'].includes(mode) ? mode : 'none'
    this._lastWorkspaceKey = null
    this._updateActiveImagesTransform()
    this._arrangeBackgroundLayer()
  }

  /**
   * Als Hintergrund: Slideshow-Bilder unter alle übrigen Canvas-Bilder legen
   * (ihre Reihenfolge untereinander bleibt erhalten).
   */
  _arrangeBackgroundLayer(imageData = null) {
    if (!this.isBackground()) return
    const list = this.multiImageManager.images
    if (!Array.isArray(list)) return
    const targets = imageData ? [imageData] : [...this.activeImages]
    for (const img of targets) {
      const from = list.indexOf(img)
      if (from === -1) continue
      list.splice(from, 1)
      // hinter das letzte Slideshow-Bild am unteren Ende einfügen
      let to = 0
      while (to < list.length && list[to]?.isSlideshowImage) to++
      list.splice(to, 0, img)
    }
  }

  /**
   * Berechnet Bild-Bounds (relativ) und Clip-Bereich für ein Slideshow-Bild.
   * - Normal: Bild wird seitenverhältnistreu in den Transform-Bereich eingepasst.
   * - Workspace: Bild füllt den Workspace (Cover) und wird auf ihn beschnitten.
   * @returns {{bounds:{relX:number,relY:number,relWidth:number,relHeight:number}, clipRect:Object|null}}
   */
  _computeImageLayout(imageObject) {
    const canvas = this.multiImageManager.canvas
    const imgAspectRatio = imageObject.height / imageObject.width
    const canvasAspectRatio = canvas.height / canvas.width
    const ws = this._getWorkspaceTransform()
    const own = ws ? null : this._boundsMemory.get(imageObject)
    if (own) return { bounds: { ...own }, clipRect: null }
    const area = ws ?? this.transform

    // Seitenverhältnis des Bereichs in relativen Einheiten
    const areaAspect = (area.relHeight / area.relWidth) * canvasAspectRatio
    // Contain: am „engeren“ Maß ausrichten; Cover (Workspace): am „weiteren“
    const fitHeight = ws ? imgAspectRatio < areaAspect : imgAspectRatio > areaAspect

    let relWidth, relHeight
    if (fitHeight) {
      relHeight = area.relHeight
      relWidth = (relHeight * canvasAspectRatio) / imgAspectRatio
    } else {
      relWidth = area.relWidth
      relHeight = (relWidth * imgAspectRatio) / canvasAspectRatio
    }

    return {
      bounds: {
        relX: area.relX + (area.relWidth - relWidth) / 2,
        relY: area.relY + (area.relHeight - relHeight) / 2,
        relWidth,
        relHeight,
      },
      clipRect: ws ? { ...ws } : null,
    }
  }

  /**
   * Auswahl-/Griff-Bereich eines Slideshow-Bildes (relativ): im Workspace-Modus
   * der Workspace, sonst die tatsächlichen Bild-Bounds – so sitzen die
   * Skalierungsgriffe exakt auf dem Bild.
   * @param {object} imageData
   * @returns {{relX:number, relY:number, relWidth:number, relHeight:number}}
   */
  getSelectionBounds(imageData) {
    const ws = this._getWorkspaceTransform()
    if (ws) return ws
    if (!imageData) return { ...this.transform }
    const { relX, relY, relWidth, relHeight } = imageData
    return { relX, relY, relWidth, relHeight }
  }

  /**
   * Übernimmt die aktuelle Position/Größe eines Slideshow-Bildes als dessen
   * eigene Bounds (nach Verschieben/Skalieren mit der Maus).
   * @param {object} imageData
   */
  commitImageBounds(imageData) {
    if (!imageData?.imageObject || this.isFittedToWorkspace()) return
    const { relX, relY, relWidth, relHeight } = imageData
    if (![relX, relY, relWidth, relHeight].every(Number.isFinite)) return
    const bounds = { relX, relY, relWidth, relHeight }
    this._boundsMemory.set(imageData.imageObject, bounds)
    this._notifyBounds(imageData.imageObject, bounds)
  }

  /** Meldet geänderte eigene Bounds eines Bildes (dauerhafte Speicherung). */
  _notifyBounds(imageObject, bounds) {
    const imageConfig = this.config.images.find(
      (cfg) => (cfg?.imageObject || cfg?.img) === imageObject,
    )
    try {
      this.onImageBoundsChange({ imageConfig, imageObject, bounds: bounds ? { ...bounds } : null })
    } catch (e) {
      console.warn('[SlideshowManager] Speichern der Bild-Größe fehlgeschlagen:', e)
    }
  }

  /** Eigene Bounds eines Bildes (Kopie) oder null. */
  getImageBounds(imageObject) {
    const b = imageObject ? this._boundsMemory.get(imageObject) : null
    return b ? { ...b } : null
  }

  /**
   * Setzt/entfernt eigene Bounds eines Bildes (z. B. aus einem Preset) und
   * aktualisiert ein gerade angezeigtes Bild sofort.
   * @param {object} imageObject
   * @param {{relX:number, relY:number, relWidth:number, relHeight:number}|null} bounds
   */
  setImageBounds(imageObject, bounds) {
    if (!imageObject || typeof imageObject !== 'object') return
    const valid =
      bounds && ['relX', 'relY', 'relWidth', 'relHeight'].every((k) => Number.isFinite(bounds[k]))
    if (valid) {
      const { relX, relY, relWidth, relHeight } = bounds
      this._boundsMemory.set(imageObject, { relX, relY, relWidth, relHeight })
    } else {
      this._boundsMemory.delete(imageObject)
    }
    this._updateActiveImagesTransform()
  }

  /**
   * Aktiviert/deaktiviert „An Workspace anpassen“ (auch während laufender Slideshow).
   * @param {boolean} value
   */
  setFitToWorkspace(value) {
    this.setBackgroundMode(value ? 'workspace' : 'none')
  }

  /** Passt aktive Bilder an, wenn sich das Workspace-Format geändert hat. */
  _syncWorkspace() {
    if (this.config.backgroundMode !== 'workspace') return
    const ws = this._getWorkspaceTransform()
    const key = ws ? `${ws.relX}|${ws.relY}|${ws.relWidth}|${ws.relHeight}` : 'none'
    if (key !== this._lastWorkspaceKey) {
      this._lastWorkspaceKey = key
      this._updateActiveImagesTransform()
    }
  }

  /**
   * ✨ NEU: Aktualisiert die Position/Größe aller aktiven Slideshow-Bilder
   */
  _updateActiveImagesTransform() {
    if (!this.isActive || this.activeImages.length === 0) return

    for (const imageData of this.activeImages) {
      if (!imageData.imageObject) continue
      const { bounds, clipRect } = this._computeImageLayout(imageData.imageObject)
      Object.assign(imageData, bounds)
      if (imageData.slideshow) imageData.slideshow.clipRect = clipRect
    }

    this.redrawCallback()
  }

  /**
   * Startet die Slideshow mit den konfigurierten Bildern
   * @param {Array} images - Array von Bild-Objekten { imageObject, name?, audioReactiveSettings? }
   * @param {Object} options - Optionen { fadeInDuration, displayDuration, fadeOutDuration, loop, audioReactiveSettings }
   */
  start(images, options = {}) {
    if (!images || images.length === 0) {
      console.warn('[SlideshowManager] Keine Bilder zum Starten')
      return false
    }

    // Vorherige Slideshow stoppen falls aktiv
    if (this.isActive) {
      this.stop()
    }

    // Konfiguration aktualisieren
    this.configure({
      images: images,
      fadeInDuration: options.fadeInDuration ?? this.config.fadeInDuration,
      displayDuration: options.displayDuration ?? this.config.displayDuration,
      fadeOutDuration: options.fadeOutDuration ?? this.config.fadeOutDuration,
      loop: options.loop ?? this.config.loop,
      autoApplyAudioReactive: options.autoApplyAudioReactive ?? this.config.autoApplyAudioReactive,
      defaultAudioReactiveSettings:
        options.audioReactiveSettings ?? this.config.defaultAudioReactiveSettings,
      renderBehindVisualizer: options.renderBehindVisualizer ?? this.config.renderBehindVisualizer,
      backgroundMode: SlideshowManager.resolveBackgroundMode(options, this.config.backgroundMode),
      backgroundColor: normalizeSlideshowBaseColor(
        options.backgroundColor,
        this.config.backgroundColor,
      ),
      workspaceColor: normalizeSlideshowBaseColor(
        options.workspaceColor,
        this.config.workspaceColor,
      ),
      backgroundGradient: normalizeSlideshowGradient(
        options.backgroundGradient,
        this.config.backgroundGradient,
      ),
      workspaceGradient: normalizeSlideshowGradient(
        options.workspaceGradient,
        this.config.workspaceGradient,
      ),
      backgroundFillAudio: normalizeSlideshowFillAudio(
        options.backgroundFillAudio,
        this.config.backgroundFillAudio,
      ),
      workspaceFillAudio: normalizeSlideshowFillAudio(
        options.workspaceFillAudio,
        this.config.workspaceFillAudio,
      ),
      transition: isValidTransition(options.transition)
        ? options.transition
        : this.config.transition,
    })
    this._lastWorkspaceKey = null
    if (options.moveWholeSlideshow !== undefined) {
      this.setMoveWholeSlideshow(options.moveWholeSlideshow)
    }
    this._panelAr = images.map((cfg) => JSON.stringify(cfg?.audioReactiveSettings ?? null))

    // ✨ Transform-Einstellungen aktualisieren wenn vorhanden
    if (options.transform) {
      this.setTransform(options.transform)
    }

    // State zurücksetzen
    this.currentIndex = 0
    this.isActive = true
    this.isPaused = false
    this.startTime = Date.now()
    this.pauseTime = null
    this.activeImages = []

    console.log(`[SlideshowManager] Starte Slideshow mit ${images.length} Bildern`)
    console.log(
      `[SlideshowManager] Timing: fadeIn=${this.config.fadeInDuration}ms, display=${this.config.displayDuration}ms, fadeOut=${this.config.fadeOutDuration}ms`,
    )

    // Erstes Bild hinzufügen
    this._addNextImage()

    // Animation Loop starten
    this._startAnimationLoop()

    return true
  }

  /**
   * Pausiert die Slideshow
   */
  pause() {
    if (!this.isActive || this.isPaused) return

    this.isPaused = true
    this.pauseTime = Date.now()

    console.log('[SlideshowManager] Pausiert')
  }

  /**
   * Setzt die Slideshow fort
   */
  resume() {
    if (!this.isActive || !this.isPaused) return

    this.isPaused = false
    if (this.pauseTime) {
      // Pause nur auf die aktuell aktiven Bilder anrechnen: deren Startzeit
      // verschieben. Später hinzugefügte Bilder starten mit frischem addedAt.
      // (Früher wurde die gesamte Pausendauer von JEDEM Bild abgezogen – neue
      // Bilder blieben dadurch so lange unsichtbar, wie insgesamt pausiert wurde.)
      const pausedFor = Date.now() - this.pauseTime
      for (const imageData of this.activeImages) {
        if (imageData.slideshow) imageData.slideshow.addedAt += pausedFor
      }
      this.pauseTime = null
    }

    console.log('[SlideshowManager] Fortgesetzt')
  }

  /**
   * Stoppt die Slideshow und entfernt alle Slideshow-Bilder
   */
  stop() {
    this.isActive = false
    this.isPaused = false

    // Animation Loop stoppen
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    // Alle Slideshow-Bilder vom Canvas entfernen
    this._cleanupAllImages()

    console.log('[SlideshowManager] Gestoppt')
  }

  /**
   * Entfernt alle von der Slideshow hinzugefügten Bilder
   */
  _cleanupAllImages() {
    for (const imageData of this.activeImages) {
      if (imageData && imageData.id) {
        // Änderungen auch beim Stoppen behalten
        this._rememberImageSettings(imageData)
        this.multiImageManager.removeImage(imageData.id)
      }
    }
    this.activeImages = []
  }

  /**
   * Fügt das nächste Bild zur Canvas hinzu
   */
  _addNextImage() {
    if (this.currentIndex >= this.config.images.length) {
      if (this.config.loop) {
        this.currentIndex = 0
      } else {
        // Slideshow beendet
        this._onComplete()
        return null
      }
    }

    const imageConfig = this.config.images[this.currentIndex]
    const imageObject = imageConfig.imageObject || imageConfig.img || imageConfig

    if (!imageObject) {
      console.error('[SlideshowManager] Ungültiges Bild an Index:', this.currentIndex)
      this.currentIndex++
      return this._addNextImage()
    }

    // ✨ Debug: Log transform values when adding new image
    console.log('[SlideshowManager] _addNextImage() mit Transform:', JSON.stringify(this.transform))

    // ✨ Bounds basierend auf Transform bzw. Workspace berechnen
    const { bounds, clipRect } = this._computeImageLayout(imageObject)

    // Slideshow-spezifische Eigenschaften – vor dem Hinzufügen erstellt, damit
    // schon der erste Zeichen-Frame das Bild im Startzustand des Übergangs zeigt
    const slideshow = {
      active: true,
      imageIndex: this.currentIndex,
      addedAt: Date.now(),
      // Ein-/Ausblenddauer: eigener Wert des Bildes, sonst Standard
      fadeInDuration: SlideshowManager.resolvePhaseDuration(
        imageConfig?.fadeInDuration,
        this.config.fadeInDuration,
      ),
      fadeOutDuration: SlideshowManager.resolvePhaseDuration(
        imageConfig?.fadeOutDuration,
        this.config.fadeOutDuration,
      ),
      displayDuration: SlideshowManager.resolveDisplayDuration(
        imageConfig,
        this.config.displayDuration,
      ),
      phase: 'fadeIn', // 'fadeIn' | 'display' | 'fadeOut' | 'done'
      opacity: 0,
      // Übergangsanimation (eigene oder globale) und aktueller Zustand
      transition: resolveTransition(imageConfig, this.config.transition),
      transitionState: null,
      clipRect, // relativer Clip-Bereich (Workspace) oder null
    }
    this._applyTransition(slideshow, 'in', 0)

    // isSlideshowImage + slideshow müssen VOR dem ersten redraw gesetzt sein
    // (Selection-Marker, Deckkraft/Übergang)
    const newImage = this.multiImageManager.addImageWithBounds(
      imageObject,
      bounds,
      'none', // Keine Standard-Animation, wir nutzen slideshow
      {
        duration: 0,
        isSlideshowImage: true,
        slideshow,
      },
    )

    if (!newImage) {
      console.error('[SlideshowManager] Konnte Bild nicht hinzufügen')
      this.currentIndex++
      return this._addNextImage()
    }

    // Falls addImageWithBounds die Optionen nicht übernimmt (z. B. ältere Mocks)
    newImage.isSlideshowImage = true
    newImage.slideshow = slideshow

    this._applyImageState(newImage, imageConfig, this.currentIndex)

    console.log(
      `[SlideshowManager] Bild ${this.currentIndex + 1} renderBehindVisualizer:`,
      this.config.renderBehindVisualizer,
    )

    // Zur aktiven Liste hinzufügen
    this.activeImages.push(newImage)
    // Als Hintergrund unter die übrigen Canvas-Bilder legen
    this._arrangeBackgroundLayer(newImage)

    console.log(
      `[SlideshowManager] Bild ${this.currentIndex + 1}/${this.config.images.length} hinzugefügt`,
    )
    this.onImageTransition(this.currentIndex, this.config.images.length, 'fadeIn')

    this.currentIndex++
    return newImage
  }

  /**
   * Setzt Audio-Reaktiv (Panel-Vorgabe), gemerkte Anpassungen und Render-Layer
   * auf ein Slideshow-Bild – beim Einblenden und beim Live-Laden eines Presets.
   */
  _applyImageState(imageData, imageConfig, index) {
    // Audio-Reaktive Einstellungen anwenden
    if (this.config.autoApplyAudioReactive) {
      this._applyAudioReactiveSettings(imageData, imageConfig)
    }

    // Während früherer Durchläufe/Slideshows geänderte Einstellungen übernehmen
    this._restoreImageSettings(imageData, index)

    // ✨ KRITISCH: Render-Layer setzen (vor oder hinter Visualizer)
    // Muss NACH allen anderen fotoSettings-Initialisierungen erfolgen
    if (!imageData.fotoSettings) {
      this.fotoManager.initializeImageSettings(imageData)
    }
    imageData.fotoSettings.renderBehindVisualizer = this.config.renderBehindVisualizer
  }

  /**
   * Übernimmt geänderte Einstellungen (z. B. ein geladenes Preset) in die
   * laufende Slideshow. Reihenfolge und Anzahl der Bilder bleiben; neue Timings
   * gelten ab dem nächsten eingeblendeten Bild.
   * @param {Array} images - wie bei start(), gleiche Reihenfolge
   * @param {Object} options - wie bei start()
   * @returns {boolean}
   */
  applyLiveUpdate(images, options = {}) {
    if (!this.isActive || !Array.isArray(images)) return false
    // Live-Bearbeitung: Änderungen der letzten Momente am angezeigten Bild nicht verlieren
    if (options.preserveLive) this._syncLiveMemory(true)
    if (images.length !== this.config.images.length) {
      console.warn('[SlideshowManager] Live-Update: Bildanzahl passt nicht')
      return false
    }

    // Bildobjekte der laufenden Slideshow beibehalten, nur Vorgaben übernehmen
    const merged = this.config.images.map((cfg, i) => ({
      ...cfg,
      displayDuration: images[i]?.displayDuration,
      audioMode: images[i]?.audioMode,
      audioReactiveSettings: images[i]?.audioReactiveSettings ?? null,
      transition: images[i]?.transition,
      fadeInDuration: images[i]?.fadeInDuration,
      fadeOutDuration: images[i]?.fadeOutDuration,
    }))
    this.configure({
      images: merged,
      fadeInDuration: options.fadeInDuration,
      displayDuration: options.displayDuration,
      fadeOutDuration: options.fadeOutDuration,
      loop: options.loop,
      transition: isValidTransition(options.transition) ? options.transition : undefined,
    })
    this._panelAr = merged.map((cfg) => JSON.stringify(cfg.audioReactiveSettings ?? null))

    if (options.transform) this.setTransform(options.transform)
    if (options.backgroundMode !== undefined || options.fitToWorkspace !== undefined) {
      this.setBackgroundMode(SlideshowManager.resolveBackgroundMode(options, 'none'))
    }
    if (options.backgroundColor !== undefined) this.setBackgroundColor(options.backgroundColor)
    if (options.workspaceColor !== undefined) this.setWorkspaceColor(options.workspaceColor)
    if (options.backgroundGradient !== undefined) {
      this.setBaseGradient('canvas', options.backgroundGradient)
    }
    if (options.workspaceGradient !== undefined) {
      this.setBaseGradient('workspace', options.workspaceGradient)
    }
    if (options.backgroundFillAudio !== undefined) {
      this.setBaseFillAudio('canvas', options.backgroundFillAudio)
    }
    if (options.workspaceFillAudio !== undefined) {
      this.setBaseFillAudio('workspace', options.workspaceFillAudio)
    }
    if (options.moveWholeSlideshow !== undefined) {
      this.setMoveWholeSlideshow(options.moveWholeSlideshow)
    }
    if (options.renderBehindVisualizer !== undefined) {
      this.config.renderBehindVisualizer = options.renderBehindVisualizer
    }

    // Angezeigte Bilder sofort neu aufbauen (Filter/Audio/Größe aus dem Preset)
    for (const imageData of this.activeImages) {
      const index = imageData.slideshow?.imageIndex
      if (!Number.isInteger(index)) continue
      const renderBehind = this.config.renderBehindVisualizer
      imageData.fotoSettings = undefined
      this.fotoManager.initializeImageSettings(imageData)
      this._applyImageState(imageData, merged[index], index)
      imageData.fotoSettings.renderBehindVisualizer = renderBehind
      if (imageData.slideshow) {
        imageData.slideshow.transition = resolveTransition(merged[index], this.config.transition)
        // Live-Bearbeitung: neue Anzeigedauer gilt auch für das angezeigte Bild
        if (options.preserveLive) {
          const ss = imageData.slideshow
          ss.displayDuration = SlideshowManager.resolveDisplayDuration(
            merged[index],
            this.config.displayDuration,
          )
          ss.fadeInDuration = SlideshowManager.resolvePhaseDuration(
            merged[index].fadeInDuration,
            this.config.fadeInDuration,
          )
          ss.fadeOutDuration = SlideshowManager.resolvePhaseDuration(
            merged[index].fadeOutDuration,
            this.config.fadeOutDuration,
          )
        }
      }
    }
    this._lastLiveSync = Date.now()
    this._updateActiveImagesTransform()
    this.redrawCallback()
    return true
  }

  /**
   * Merkt sich die aktuellen Bild-Einstellungen (Filter, Schatten, Rotation,
   * Spiegeln, Kontur, Audio-Reaktiv) eines Slideshow-Bildes – beim Ausblenden
   * und beim Stoppen. Bei Wiederholung und nach einem Neustart erscheint das
   * Bild wieder mit diesen Einstellungen.
   * Nicht übernommen: Render-Layer (steuert die Slideshow) und interne Caches.
   */
  _rememberImageSettings(imageData) {
    const index = imageData.slideshow?.imageIndex
    const imageObject = imageData.imageObject
    const settings = imageData.fotoSettings
    if (!Number.isInteger(index) || !imageObject || typeof imageObject !== 'object' || !settings) {
      return
    }

    const copy = JSON.parse(JSON.stringify(settings))
    delete copy.renderBehindVisualizer
    for (const key of Object.keys(copy)) {
      if (key.startsWith('_')) delete copy[key]
    }
    const audioMode = this.config.images[index]?.audioMode
    this._imageMemory.set(imageObject, {
      fotoSettings: copy,
      panelAr: this._panelAr[index],
      audioMode,
    })
    try {
      this.onImageAdjustmentsChange({
        imageConfig: this.config.images[index],
        imageObject,
        adjustments: copy,
        audioMode,
      })
    } catch (e) {
      console.warn('[SlideshowManager] Speichern der Bild-Anpassungen fehlgeschlagen:', e)
    }
  }

  /**
   * Stellt gemerkte Bild-Einstellungen wieder her. Wurde die Audio-Reaktion des
   * Bildes im Slideshow-Panel seitdem geändert, gilt die neue Panel-Vorgabe
   * (die übrigen gemerkten Einstellungen bleiben).
   */
  _restoreImageSettings(imageData, index) {
    const memory = this._imageMemory.get(imageData.imageObject)
    if (!memory) return
    const copy = JSON.parse(JSON.stringify(memory.fotoSettings))
    // Aus einem Preset geladene Anpassungen (panelAr unbekannt) werden über den
    // Audio-Modus des Panels verglichen, sonst über die aufgelöste Audio-Vorgabe.
    const panelChanged =
      memory.panelAr === undefined
        ? memory.audioMode !== this.config.images[index]?.audioMode
        : memory.panelAr !== this._panelAr[index]
    if (panelChanged) delete copy.audioReactive
    this.fotoManager.initializeImageSettings(imageData)
    Object.assign(imageData.fotoSettings, copy)
    // Alte/unvollständige Audio-Konfiguration vervollständigen
    this.fotoManager.initializeImageSettings(imageData)
  }

  /**
   * Übernimmt die Einstellungen der gerade angezeigten Bilder in den Speicher,
   * damit Änderungen am laufenden Bild sofort gemerkt sind (gedrosselt).
   * @param {boolean} [force=false] - ohne Drosselung
   */
  _syncLiveMemory(force = false) {
    const now = Date.now()
    if (!force && now - this._lastLiveSync < 250) return
    this._lastLiveSync = now
    for (const imageData of this.activeImages) {
      if (imageData.slideshow?.active) this._rememberImageSettings(imageData)
    }
  }

  /**
   * Gemerkte Anpassungen eines Bildes (Kopie) – z. B. zum Speichern im Preset.
   * Läuft das Bild gerade, werden seine aktuellen Einstellungen geliefert.
   * @param {object} imageObject
   * @returns {object|null}
   */
  getImageAdjustments(imageObject) {
    if (this.isActive) this._syncLiveMemory(true)
    const memory = imageObject ? this._imageMemory.get(imageObject) : null
    return memory ? JSON.parse(JSON.stringify(memory.fotoSettings)) : null
  }

  /**
   * Setzt die Anpassungen eines Bildes (z. B. aus einem Preset); null entfernt sie.
   * @param {object} imageObject
   * @param {object|null} fotoSettings
   * @param {string} [audioMode] - Audio-Modus des Panels, zu dem die Audio-Einstellung gehört
   */
  setImageAdjustments(imageObject, fotoSettings, audioMode) {
    if (!imageObject || typeof imageObject !== 'object') return
    if (!fotoSettings || typeof fotoSettings !== 'object') {
      this._imageMemory.delete(imageObject)
      return
    }
    this._imageMemory.set(imageObject, {
      fotoSettings: JSON.parse(JSON.stringify(fotoSettings)),
      panelAr: undefined,
      audioMode,
    })
  }

  /** Verwirft alle gemerkten Bild-Anpassungen (z. B. per „Zurücksetzen“ im Panel). */
  clearImageMemory() {
    this._imageMemory = new WeakMap()
    this._boundsMemory = new WeakMap()
    this._updateActiveImagesTransform()
  }

  /**
   * Wendet Audio-Reaktive Einstellungen auf ein Bild an
   */
  _applyAudioReactiveSettings(imageData, imageConfig) {
    // Prüfe ob das Bild bereits Audio-Reaktive Einstellungen hat
    const hasExistingSettings = imageConfig.audioReactiveSettings
    const defaultSettings = this.config.defaultAudioReactiveSettings

    let settingsToApply = null

    if (hasExistingSettings) {
      settingsToApply = imageConfig.audioReactiveSettings
    } else if (defaultSettings) {
      settingsToApply = defaultSettings
    }

    if (settingsToApply && this.fotoManager) {
      // Stelle sicher dass fotoSettings initialisiert ist
      this.fotoManager.initializeImageSettings(imageData)

      // Kopiere Audio-Reaktive Einstellungen
      imageData.fotoSettings.audioReactive = JSON.parse(JSON.stringify(settingsToApply))

      console.log(
        `[SlideshowManager] Audio-Reaktive Einstellungen auf Bild ${imageData.slideshow.imageIndex + 1} angewendet`,
      )
    }
  }

  /**
   * Hauptanimations-Loop
   */
  _startAnimationLoop() {
    const animate = () => {
      if (!this.isActive) return

      this._syncWorkspace()
      this._syncLiveMemory()
      if (!this.isPaused) {
        this._updateSlideshowState()
      }

      this.redrawCallback()
      this.animationFrameId = requestAnimationFrame(animate)
    }

    this.animationFrameId = requestAnimationFrame(animate)
  }

  /**
   * Aktualisiert den Slideshow-Status aller aktiven Bilder
   */
  _updateSlideshowState() {
    const now = Date.now()
    const imagesToRemove = []
    let needsNextImage = false

    for (const imageData of this.activeImages) {
      if (!imageData.slideshow || !imageData.slideshow.active) continue

      const ss = imageData.slideshow
      const elapsed = Math.max(0, now - ss.addedAt)

      const fadeInEnd = ss.fadeInDuration
      const displayEnd = fadeInEnd + ss.displayDuration
      const fadeOutEnd = displayEnd + ss.fadeOutDuration

      if (elapsed < fadeInEnd) {
        // FadeIn Phase
        ss.phase = 'fadeIn'
        this._applyTransition(ss, 'in', elapsed / ss.fadeInDuration)
      } else if (elapsed < displayEnd) {
        // Display Phase
        if (ss.phase === 'fadeIn') {
          ss.phase = 'display'
          this.onImageTransition(ss.imageIndex, this.config.images.length, 'display')
        }
        this._applyTransition(ss, 'display', 1)

        // Prüfe ob nächstes Bild gestartet werden soll
        // Starte nächstes Bild wenn aktuelles in Display-Phase ist und overlap gewünscht
        // Für einfacheren Flow: starte nächstes wenn dieses in fadeOut geht
      } else if (elapsed < fadeOutEnd) {
        // FadeOut Phase
        // auch wenn die Anzeigephase in einem Frame übersprungen wurde
        // (z. B. Tab im Hintergrund) – sonst würde nie ein nächstes Bild starten
        if (ss.phase !== 'fadeOut') {
          ss.phase = 'fadeOut'
          this.onImageTransition(ss.imageIndex, this.config.images.length, 'fadeOut')
          // Nächstes Bild hinzufügen wenn fadeOut beginnt
          needsNextImage = true
        }
        this._applyTransition(ss, 'out', (elapsed - displayEnd) / ss.fadeOutDuration)
      } else {
        // Animation fertig
        // Falls die Ausblendphase komplett übersprungen wurde: nächstes Bild starten
        if (ss.phase !== 'fadeOut') needsNextImage = true
        ss.phase = 'done'
        ss.opacity = 0
        ss.transitionState = null
        ss.active = false
        imagesToRemove.push(imageData)
      }
    }

    // Fertige Bilder entfernen
    for (const imageData of imagesToRemove) {
      this._rememberImageSettings(imageData)
      this.multiImageManager.removeImage(imageData.id)
      const idx = this.activeImages.indexOf(imageData)
      if (idx !== -1) {
        this.activeImages.splice(idx, 1)
      }
    }

    // Nächstes Bild hinzufügen wenn nötig
    if (needsNextImage && this.isActive) {
      this._addNextImage()
    }
  }

  /**
   * Setzt Übergangszustand + Deckkraft eines Slideshow-Bildes.
   * @param {object} ss - imageData.slideshow
   * @param {'in'|'display'|'out'} phase
   * @param {number} progress - 0–1
   */
  _applyTransition(ss, phase, progress) {
    const state = computeTransitionState(ss.transition, phase, progress)
    ss.transitionState = state
    ss.opacity = state.opacity
  }

  /**
   * Wird aufgerufen wenn die Slideshow komplett durchgelaufen ist
   */
  _onComplete() {
    // Warte bis letztes Bild ausgeblendet ist
    const checkComplete = () => {
      if (this.activeImages.length === 0) {
        this.isActive = false
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId)
          this.animationFrameId = null
        }
        console.log('[SlideshowManager] Slideshow beendet')
        this.onSlideshowComplete()
      } else if (this.isActive) {
        // Noch Bilder aktiv, weiter warten
        setTimeout(checkComplete, 100)
      }
    }

    checkComplete()
  }

  /**
   * Anzeigedauer eines Bildes: eigener Wert (ms) falls gültig, sonst globaler Wert.
   * @param {Object} imageConfig - Eintrag aus config.images
   * @param {number} fallback - Globale Anzeigedauer in ms
   * @returns {number}
   */
  /**
   * Hintergrund-Modus aus Optionen; `fitToWorkspace` (ältere Aufrufer) wird
   * als 'workspace' verstanden.
   */
  static resolveBackgroundMode(options, fallback = 'none') {
    const mode = options?.backgroundMode
    if (['none', 'canvas', 'workspace'].includes(mode)) return mode
    if (options?.fitToWorkspace === true) return 'workspace'
    if (options?.fitToWorkspace === false) return 'none'
    return fallback
  }

  static resolvePhaseDuration(own, fallback) {
    return Number.isFinite(own) && own > 0 ? own : fallback
  }

  static resolveDisplayDuration(imageConfig, fallback) {
    const own = imageConfig?.displayDuration
    return Number.isFinite(own) && own > 0 ? own : fallback
  }

  /**
   * Berechnet die aktuelle Opacity für ein Slideshow-Bild
   * Wird von MultiImageManager.drawImages() verwendet
   */
  static getSlideshowOpacity(imageData) {
    if (!imageData.slideshow || !imageData.slideshow.active) {
      return 1 // Kein Slideshow-Bild, normale Opacity
    }
    return Math.max(0, Math.min(1, imageData.slideshow.opacity))
  }

  /**
   * Prüft ob ein Bild ein aktives Slideshow-Bild ist
   */
  static isSlideshowImage(imageData) {
    return imageData.slideshow && imageData.slideshow.active
  }

  /**
   * ✨ NEU: Setzt die Layer-Einstellung (vor/hinter Visualizer) auch während laufender Slideshow
   */
  setRenderBehindVisualizer(value) {
    console.log('[SlideshowManager] setRenderBehindVisualizer aufgerufen mit:', value)
    this.config.renderBehindVisualizer = value

    // Aktualisiere alle aktiven Bilder
    for (const imageData of this.activeImages) {
      // Stelle sicher, dass fotoSettings existiert
      if (!imageData.fotoSettings) {
        this.fotoManager.initializeImageSettings(imageData)
      }
      imageData.fotoSettings.renderBehindVisualizer = value
      console.log(
        '[SlideshowManager] Bild',
        imageData.id,
        'aktualisiert auf renderBehindVisualizer:',
        value,
      )
    }

    this.redrawCallback()
    console.log(
      '[SlideshowManager] Render-Layer geändert:',
      value ? 'hinter Visualizer' : 'vor Visualizer',
      '- Anzahl aktive Bilder:',
      this.activeImages.length,
    )
  }

  /**
   * ✨ NEU: Gibt das aktive Slideshow-Bild zurück (für Maus-Interaktion)
   * Gibt das Bild mit der höchsten Opacity zurück
   */
  getActiveImage() {
    if (!this.isActive || this.activeImages.length === 0) return null

    // Finde das Bild mit der höchsten Opacity (das sichtbarste)
    let bestImage = null
    let highestOpacity = -1

    for (const imageData of this.activeImages) {
      if (imageData.slideshow && imageData.slideshow.active) {
        const opacity = imageData.slideshow.opacity
        if (opacity > highestOpacity) {
          highestOpacity = opacity
          bestImage = imageData
        }
      }
    }

    return bestImage
  }

  /**
   * ✨ NEU: Prüft ob ein Punkt innerhalb des Slideshow-Transform-Bereichs liegt
   * @param {number} relX - Relative X-Position (0-1)
   * @param {number} relY - Relative Y-Position (0-1)
   * @returns {boolean}
   */
  isPointInTransformArea(relX, relY) {
    const t = this.getTransform()
    return (
      relX >= t.relX &&
      relX <= t.relX + t.relWidth &&
      relY >= t.relY &&
      relY <= t.relY + t.relHeight
    )
  }

  /**
   * ✨ NEU: Verschiebt die Slideshow-Position
   * @param {number} deltaRelX - Relative X-Verschiebung
   * @param {number} deltaRelY - Relative Y-Verschiebung
   */
  moveSlideshow(deltaRelX, deltaRelY) {
    // An den Workspace gebunden → nicht frei verschiebbar
    if (this.isFittedToWorkspace()) return
    const oldX = this.transform.relX
    const oldY = this.transform.relY
    // Neue Position berechnen mit Constraints (gemeinsamer Bereich bleibt im Canvas)
    const newRelX = Math.max(0, Math.min(oldX + deltaRelX, 1 - this.transform.relWidth))
    const newRelY = Math.max(0, Math.min(oldY + deltaRelY, 1 - this.transform.relHeight))
    const appliedX = newRelX - oldX
    const appliedY = newRelY - oldY
    if (appliedX === 0 && appliedY === 0) return

    // Bilder mit eigener Größe/Position um denselben Betrag mitverschieben,
    // damit die Anordnung der ganzen Slideshow erhalten bleibt
    for (const cfg of this.config.images) {
      const imageObject = cfg?.imageObject || cfg?.img
      const own = imageObject ? this._boundsMemory.get(imageObject) : null
      if (own) {
        const moved = { ...own, relX: own.relX + appliedX, relY: own.relY + appliedY }
        this._boundsMemory.set(imageObject, moved)
        this._notifyBounds(imageObject, moved)
      }
    }

    this.setTransform({ relX: newRelX, relY: newRelY })
    this.onTransformChange(this.getTransform())
  }

  /**
   * Maus-Verschieben: ganze Slideshow (true) oder einzelnes Bild (false).
   * @param {boolean} value
   */
  setMoveWholeSlideshow(value) {
    this.moveWholeSlideshow = !!value
  }

  /**
   * ✨ NEU: Skaliert die Slideshow
   * @param {number} scaleMultiplier - Skalierungsfaktor (1 = keine Änderung)
   */
  scaleSlideshow(scaleMultiplier) {
    if (this.isFittedToWorkspace()) return
    const currentWidth = this.transform.relWidth
    const currentHeight = this.transform.relHeight

    // Neue Größe berechnen
    let newWidth = currentWidth * scaleMultiplier
    let newHeight = currentHeight * scaleMultiplier

    // Minimale und maximale Größe
    const minSize = 0.1
    const maxSize = 1.0

    newWidth = Math.max(minSize, Math.min(newWidth, maxSize))
    newHeight = Math.max(minSize, Math.min(newHeight, maxSize))

    // Zentriere die Skalierung um den aktuellen Mittelpunkt
    const centerX = this.transform.relX + currentWidth / 2
    const centerY = this.transform.relY + currentHeight / 2

    let newRelX = centerX - newWidth / 2
    let newRelY = centerY - newHeight / 2

    // Begrenze auf Canvas-Bereich
    newRelX = Math.max(0, Math.min(newRelX, 1 - newWidth))
    newRelY = Math.max(0, Math.min(newRelY, 1 - newHeight))

    this.setTransform({
      relX: newRelX,
      relY: newRelY,
      relWidth: newWidth,
      relHeight: newHeight,
    })
  }

  /**
   * Gibt den aktuellen Status zurück
   */
  getStatus() {
    return {
      isActive: this.isActive,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalImages: this.config.images.length,
      activeImagesCount: this.activeImages.length,
      config: { ...this.config, images: undefined }, // Ohne Bild-Daten
      transform: this.getTransform(),
      backgroundMode: this.config.backgroundMode,
      backgroundColor: this.config.backgroundColor,
      workspaceColor: this.config.workspaceColor,
      backgroundGradient: { ...this.config.backgroundGradient },
      workspaceGradient: { ...this.config.workspaceGradient },
      backgroundFillAudio: { ...this.config.backgroundFillAudio },
      workspaceFillAudio: { ...this.config.workspaceFillAudio },
      fitToWorkspace: this.config.backgroundMode === 'workspace',
      renderBehindVisualizer: this.config.renderBehindVisualizer,
    }
  }
}
