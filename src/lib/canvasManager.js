// canvasManager.js - Refactored mit modularer Architektur
//
// Die Funktionalität wurde in folgende Module aufgeteilt:
// - rendering/BackgroundRenderer.js - Hintergrund-Rendering
// - rendering/SceneRenderer.js - Szenen-Rendering
// - rendering/UIRenderer.js - UI-Elemente Rendering
// - interaction/MouseHandler.js - Maus-Events
// - interaction/SelectionManager.js - Objekt-Auswahl
// - interaction/DragDropHandler.js - Drag & Drop
// - recording/CanvasPool.js - Canvas-Pooling
// - recording/RecordingRenderer.js - Recording-Rendering

import { BackgroundRenderer, SceneRenderer, UIRenderer } from './canvasManager/rendering/index.js';
import { MouseHandler, SelectionManager, DragDropHandler } from './canvasManager/interaction/index.js';
import { RecordingRenderer } from './canvasManager/recording/index.js';

/**
 * CanvasManager - Orchestrator für alle Canvas-Operationen
 *
 * Diese Klasse koordiniert die verschiedenen Module und stellt
 * die öffentliche API für die Anwendung bereit.
 */
export class CanvasManager {
    constructor(canvas, dependencies) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Dependencies
        this.redrawCallback = dependencies.redrawCallback || dependencies.redraw;
        this.onSelectionChange = dependencies.onObjectSelected;
        this.updateUICallback = dependencies.onStateChange;
        this.onTextEditStart = dependencies.onTextDoubleClick;
        this.textManager = dependencies.textManager;
        this.gridManager = dependencies.gridManager;
        this.fotoManager = dependencies.fotoManager;
        this.multiImageManager = dependencies.multiImageManager;
        this.videoManager = dependencies.videoManager;

        // State
        this.background = '#ffffff';
        this.workspaceBackground = null;
        this.videoBackground = null;
        this.workspaceVideoBackground = null;
        this.backgroundColorSettings = null;
        this.backgroundTilesStore = null;

        // Gradient-Einstellungen für Hintergrund
        this.gradientSettings = {
            enabled: false,
            color2: '#000000',
            type: 'radial',
            angle: 0
        };

        this.activeObject = null;
        this.hoveredObject = null;
        this.currentAction = null;
        this.dragStartPos = { x: 0, y: 0 };
        this.isEditingText = false;
        this.isRecording = false;

        // Text-Rechteck-Auswahl-Modus
        this.textSelectionMode = false;
        this.textSelectionRect = null;
        this.onTextSelectionComplete = null;

        // Text-Positions-Vorschau
        this.textPositionPreview = null;

        // Bild-Bereichsauswahl-Modus
        this.imageSelectionMode = false;
        this.imageSelectionRect = null;
        this.onImageSelectionComplete = null;
        this.pendingImageAnimation = null;

        // Cached bounds for drag operations
        this._cachedBounds = null;

        this._selectionListeners = [];

        // Social Media Presets
        this.socialMediaPresets = {
            'tiktok': { width: 1080, height: 1920, name: 'TikTok (9:16)' },
            'instagram-story': { width: 1080, height: 1920, name: 'Instagram Story (9:16)' },
            'instagram-post': { width: 1080, height: 1080, name: 'Instagram Post (1:1)' },
            'instagram-reel': { width: 1080, height: 1920, name: 'Instagram Reel (9:16)' },
            'youtube-short': { width: 1080, height: 1920, name: 'YouTube Short (9:16)' },
            'youtube-video': { width: 1920, height: 1080, name: 'YouTube Video (16:9)' },
            'facebook-post': { width: 1200, height: 630, name: 'Facebook Post (1.91:1)' },
            'twitter-video': { width: 1280, height: 720, name: 'X/Twitter Video (16:9)' },
            'linkedin-video': { width: 1920, height: 1080, name: 'LinkedIn Video (16:9)' }
        };
        this.workspacePreset = null;
        this.showWorkspaceOutline = false;

        // Initialize modules
        this.backgroundRenderer = new BackgroundRenderer(this);
        this.sceneRenderer = new SceneRenderer(this);
        this.uiRenderer = new UIRenderer(this);
        this.mouseHandler = new MouseHandler(this);
        this.selectionManager = new SelectionManager(this);
        this.dragDropHandler = new DragDropHandler(this);
        this.recordingRenderer = new RecordingRenderer(this);

        // FotoManager callback setup
        if (this.fotoManager) {
            this.fotoManager.getActiveImage = () => this.getActiveImage();
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
            console.log('[CanvasManager] Canvas-Referenz aktualisiert');
            this.canvas = newCanvas;
            this.ctx = newCanvas.getContext('2d');

            if (this.multiImageManager && typeof this.multiImageManager.updateCanvas === 'function') {
                this.multiImageManager.updateCanvas(newCanvas);
            }
            if (this.videoManager && typeof this.videoManager.updateCanvas === 'function') {
                this.videoManager.updateCanvas(newCanvas);
            }
            if (this.gridManager && typeof this.gridManager.updateCanvas === 'function') {
                this.gridManager.updateCanvas(newCanvas);
            }

            return true;
        }
        return false;
    }

    /**
     * Initialisiert Event-Handler
     */
    setupInteractionHandlers() {
        this.mouseHandler.setupInteractionHandlers();
    }

    /**
     * Selection Listener registrieren
     */
    onSelectionChanged(callback) {
        this._selectionListeners.push(callback);
    }

    _notifySelectionListeners(obj) {
        this._selectionListeners.forEach(listener => listener(obj));
    }

    // ═══════════════════════════════════════════════════════════════════
    // WORKSPACE PRESETS
    // ═══════════════════════════════════════════════════════════════════

    setWorkspacePreset(presetKey) {
        if (this.socialMediaPresets[presetKey]) {
            this.workspacePreset = this.socialMediaPresets[presetKey];
            this.showWorkspaceOutline = true;
        } else {
            this.workspacePreset = null;
            this.showWorkspaceOutline = false;
            this.workspaceBackground = null;
        }
        this.redrawCallback();
    }

    toggleWorkspaceOutline() {
        this.showWorkspaceOutline = !this.showWorkspaceOutline;
        this.redrawCallback();
        return this.showWorkspaceOutline;
    }

    getWorkspaceBounds() {
        if (!this.workspacePreset) return null;

        const canvasAspectRatio = this.canvas.width / this.canvas.height;
        const workspaceAspectRatio = this.workspacePreset.width / this.workspacePreset.height;

        let workspaceWidth, workspaceHeight;

        if (workspaceAspectRatio > canvasAspectRatio) {
            workspaceWidth = this.canvas.width * 0.9;
            workspaceHeight = workspaceWidth / workspaceAspectRatio;
        } else {
            workspaceHeight = this.canvas.height * 0.9;
            workspaceWidth = workspaceHeight * workspaceAspectRatio;
        }

        const x = (this.canvas.width - workspaceWidth) / 2;
        const y = (this.canvas.height - workspaceHeight) / 2;

        return { x, y, width: workspaceWidth, height: workspaceHeight };
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEXT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    setEditing(isEditing) {
        this.isEditingText = isEditing;
        if (!isEditing && this.activeObject) {
            const currentActive = this.activeObject;
            this.activeObject = null;
            this.setActiveObject(currentActive);
        } else if (isEditing) {
            this.onSelectionChange(null);
        }
        this.redrawCallback();
    }

    addText(text, options = {}) {
        if (!this.textManager) {
            return null;
        }
        const newTextObject = this.textManager.add(text, options);

        if (newTextObject && (!newTextObject.relWidth || !newTextObject.relHeight)) {
            this.calculateTextBounds(newTextObject);
        }

        this.setActiveObject(newTextObject);
        this.redrawCallback();
        return newTextObject;
    }

    calculateTextBounds(textObj) {
        if (!textObj || textObj.type !== 'text') return;

        const ctx = this.canvas.getContext('2d');
        ctx.save();

        let actualFontSize = textObj.fontSize;
        if (actualFontSize <= 1) {
            actualFontSize = actualFontSize * this.canvas.height;
        }

        ctx.font = `${textObj.fontWeight || 400} ${actualFontSize}px ${textObj.fontFamily || 'Arial'}`;
        const metrics = ctx.measureText(textObj.text);
        ctx.restore();

        const width = metrics.width;
        const height = actualFontSize * 1.2;

        textObj.relWidth = width / this.canvas.width;
        textObj.relHeight = height / this.canvas.height;
    }

    // ═══════════════════════════════════════════════════════════════════
    // IMAGE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    getActiveImage() {
        if (this.activeObject) {
            if (this.activeObject.type === 'image') {
                return this.activeObject;
            }
            if (this.activeObject.type === 'background' || this.activeObject.type === 'workspace-background') {
                return this.activeObject;
            }
        }
        return null;
    }

    addImage(imageObject) {
        if (!this.multiImageManager) {
            return;
        }

        const newImage = this.multiImageManager.addImage(imageObject);
        if (newImage) {
            this.setActiveObject(newImage);
            this.redrawCallback();
            this.updateUICallback();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // BACKGROUND MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    setBackground(backgroundObject) {
        if (typeof backgroundObject === 'string') {
            this.background = backgroundObject;
        }
        else if (backgroundObject && typeof backgroundObject === 'object') {
            this.background = {
                id: Date.now() + '_bg',
                type: 'background',
                imageObject: backgroundObject
            };

            if (this.fotoManager) {
                this.fotoManager.initializeImageSettings(this.background);
            }
        }
        else {
            this.background = null;
        }

        this.activeObject = null;
        this.redrawCallback();
        this.updateUICallback();
    }

    setWorkspaceBackground(imageObject) {
        if (!this.workspacePreset) {
            return false;
        }

        this.workspaceBackground = {
            id: Date.now() + '_wsbg',
            type: 'workspace-background',
            imageObject: imageObject
        };

        if (this.fotoManager) {
            this.fotoManager.initializeImageSettings(this.workspaceBackground);
        }

        this.activeObject = null;
        this.redrawCallback();
        this.updateUICallback();
        return true;
    }

    updateBackgroundFlip(flipH, flipV) {
        if (!this.background || typeof this.background !== 'object') {
            console.warn('⚠️ Kein Bild-Hintergrund vorhanden');
            return false;
        }

        if (!this.background.fotoSettings) {
            if (this.fotoManager) {
                this.fotoManager.initializeImageSettings(this.background);
            }
        }

        this.background.fotoSettings.flipH = flipH;
        this.background.fotoSettings.flipV = flipV;

        this.redrawCallback();
        return true;
    }

    updateWorkspaceBackgroundFlip(flipH, flipV) {
        if (!this.workspaceBackground) {
            console.warn('⚠️ Kein Workspace-Hintergrund vorhanden');
            return false;
        }

        if (!this.workspaceBackground.fotoSettings) {
            if (this.fotoManager) {
                this.fotoManager.initializeImageSettings(this.workspaceBackground);
            }
        }

        this.workspaceBackground.fotoSettings.flipH = flipH;
        this.workspaceBackground.fotoSettings.flipV = flipV;

        this.redrawCallback();
        return true;
    }

    replaceBackground(newImageObject) {
        if (!newImageObject) {
            console.error('❌ Kein neues Bild zum Ersetzen übergeben');
            return null;
        }

        if (!this.background || typeof this.background !== 'object') {
            console.warn('⚠️ Kein Bild-Hintergrund vorhanden zum Ersetzen');
            return null;
        }

        const oldSettings = this.background.fotoSettings ? { ...this.background.fotoSettings } : null;
        const oldAudioReactive = oldSettings?.audioReactive ? JSON.parse(JSON.stringify(oldSettings.audioReactive)) : null;
        const oldFlipH = oldSettings?.flipH || false;
        const oldFlipV = oldSettings?.flipV || false;
        const oldWidth = this.background.imageObject?.naturalWidth || 0;
        const oldHeight = this.background.imageObject?.naturalHeight || 0;

        this.background.imageObject = newImageObject;

        if (this.fotoManager) {
            this.fotoManager.initializeImageSettings(this.background);
        }

        if (oldAudioReactive && this.background.fotoSettings) {
            this.background.fotoSettings.audioReactive = oldAudioReactive;
        }

        if (this.background.fotoSettings) {
            this.background.fotoSettings.flipH = oldFlipH;
            this.background.fotoSettings.flipV = oldFlipV;
        }

        console.log('🔄 Hintergrund ersetzt:',
            `Alt: ${oldWidth}x${oldHeight}`,
            `Neu: ${newImageObject.naturalWidth}x${newImageObject.naturalHeight}`,
            'Audio-Reactive übernommen:', !!oldAudioReactive);

        this.redrawCallback();
        this.updateUICallback();

        return this.background;
    }

    replaceWorkspaceBackground(newImageObject) {
        if (!newImageObject) {
            console.error('❌ Kein neues Bild zum Ersetzen übergeben');
            return null;
        }

        if (!this.workspaceBackground) {
            console.warn('⚠️ Kein Workspace-Hintergrund vorhanden zum Ersetzen');
            return null;
        }

        const oldSettings = this.workspaceBackground.fotoSettings ? { ...this.workspaceBackground.fotoSettings } : null;
        const oldAudioReactive = oldSettings?.audioReactive ? JSON.parse(JSON.stringify(oldSettings.audioReactive)) : null;
        const oldFlipH = oldSettings?.flipH || false;
        const oldFlipV = oldSettings?.flipV || false;
        const oldWidth = this.workspaceBackground.imageObject?.naturalWidth || 0;
        const oldHeight = this.workspaceBackground.imageObject?.naturalHeight || 0;

        this.workspaceBackground.imageObject = newImageObject;

        if (this.fotoManager) {
            this.fotoManager.initializeImageSettings(this.workspaceBackground);
        }

        if (oldAudioReactive && this.workspaceBackground.fotoSettings) {
            this.workspaceBackground.fotoSettings.audioReactive = oldAudioReactive;
        }

        if (this.workspaceBackground.fotoSettings) {
            this.workspaceBackground.fotoSettings.flipH = oldFlipH;
            this.workspaceBackground.fotoSettings.flipV = oldFlipV;
        }

        console.log('🔄 Workspace-Hintergrund ersetzt:',
            `Alt: ${oldWidth}x${oldHeight}`,
            `Neu: ${newImageObject.naturalWidth}x${newImageObject.naturalHeight}`,
            'Audio-Reactive übernommen:', !!oldAudioReactive);

        this.redrawCallback();
        this.updateUICallback();

        return this.workspaceBackground;
    }

    // ═══════════════════════════════════════════════════════════════════
    // VIDEO BACKGROUND MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    setVideoBackground(videoElement) {
        if (!videoElement) {
            this.videoBackground = null;
            this.redrawCallback();
            this.updateUICallback();
            return;
        }

        this.videoBackground = {
            id: Date.now() + '_vbg',
            type: 'video-background',
            videoElement: videoElement,
            loop: true,
            muted: true
        };

        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.crossOrigin = 'anonymous';

        if (this.fotoManager) {
            this.fotoManager.initializeImageSettings(this.videoBackground);
        }

        if (typeof this.background === 'object') {
            this.background = '#ffffff';
        }

        this.activeObject = null;
        this.redrawCallback();
        this.updateUICallback();

        console.log('✅ Video als Hintergrund gesetzt');
    }

    setWorkspaceVideoBackground(videoElement) {
        if (!this.workspacePreset) {
            console.warn('Kein Workspace-Preset ausgewählt');
            return false;
        }

        if (!videoElement) {
            this.workspaceVideoBackground = null;
            this.redrawCallback();
            this.updateUICallback();
            return true;
        }

        this.workspaceVideoBackground = {
            id: Date.now() + '_wsvbg',
            type: 'workspace-video-background',
            videoElement: videoElement,
            loop: true,
            muted: true
        };

        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.crossOrigin = 'anonymous';

        if (this.fotoManager) {
            this.fotoManager.initializeImageSettings(this.workspaceVideoBackground);
        }

        this.workspaceBackground = null;
        this.activeObject = null;
        this.redrawCallback();
        this.updateUICallback();

        console.log('✅ Video als Workspace-Hintergrund gesetzt');
        return true;
    }

    getVideoBackground() {
        return this.videoBackground;
    }

    getWorkspaceVideoBackground() {
        return this.workspaceVideoBackground;
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUDIO REACTIVE & GRADIENT SETTINGS
    // ═══════════════════════════════════════════════════════════════════

    setBackgroundColorAudioReactive(settings) {
        this.backgroundColorSettings = settings;
    }

    getBackgroundColorAudioReactive() {
        return this.backgroundColorSettings;
    }

    setGradientSettings(settings) {
        this.gradientSettings = { ...this.gradientSettings, ...settings };
    }

    getGradientSettings() {
        return this.gradientSettings;
    }

    setBackgroundTilesStore(store) {
        this.backgroundTilesStore = store;
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUDIO REACTIVE HELPERS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Berechnet Audio-Reaktive Werte für Hintergründe
     */
    _getAudioReactiveValues(audioSettings) {
        if (!audioSettings || !audioSettings.enabled) {
            return null;
        }

        const audioData = window.audioAnalysisData;
        if (!audioData) return null;

        const source = audioSettings.source || 'bass';
        const smoothing = audioSettings.smoothing || 50;
        let audioLevel = 0;

        const useSmooth = smoothing > 30;

        switch (source) {
            case 'bass':
                audioLevel = useSmooth ? audioData.smoothBass : audioData.bass;
                break;
            case 'mid':
                audioLevel = useSmooth ? audioData.smoothMid : audioData.mid;
                break;
            case 'treble':
                audioLevel = useSmooth ? audioData.smoothTreble : audioData.treble;
                break;
            case 'volume':
                audioLevel = useSmooth ? audioData.smoothVolume : audioData.volume;
                break;
            case 'dynamic':
                const bass = useSmooth ? audioData.smoothBass : audioData.bass;
                const mid = useSmooth ? audioData.smoothMid : audioData.mid;
                const treble = useSmooth ? audioData.smoothTreble : audioData.treble;

                const totalEnergy = Math.max(bass + mid + treble, 1);

                const bassWeight = bass / totalEnergy;
                const midWeight = mid / totalEnergy;
                const trebleWeight = treble / totalEnergy;

                let rawLevel = (bass * bassWeight) + (mid * midWeight) + (treble * trebleWeight);

                const normalized = rawLevel / 255;
                const compressed = Math.pow(normalized, 0.7);
                audioLevel = compressed * 255 * 0.85;
                break;
        }

        const baseLevel = audioLevel / 255;

        const result = {
            hasEffects: false,
            effects: {}
        };

        const effects = audioSettings.effects;
        if (!effects) return null;

        for (const [effectName, effectConfig] of Object.entries(effects)) {
            if (effectConfig && effectConfig.enabled) {
                const intensity = (effectConfig.intensity || 80) / 100;
                const normalizedLevel = baseLevel * intensity;

                result.hasEffects = true;
                result.effects[effectName] = this._calculateEffectValue(effectName, normalizedLevel);
            }
        }

        return result.hasEffects ? result : null;
    }

    /**
     * Berechnet den Wert für einen einzelnen Effekt
     */
    _calculateEffectValue(effectName, normalizedLevel) {
        switch (effectName) {
            case 'hue':
                return { hueRotate: normalizedLevel * 720 };
            case 'brightness':
                return { brightness: 60 + (normalizedLevel * 120) };
            case 'saturation':
                return { saturation: 30 + (normalizedLevel * 220) };
            case 'scale':
                return { scale: 1.0 + (normalizedLevel * 0.5) };
            case 'glow':
                return {
                    glowBlur: normalizedLevel * 50,
                    glowColor: `rgba(139, 92, 246, ${0.5 + normalizedLevel * 0.5})`
                };
            case 'border':
                return {
                    borderWidth: normalizedLevel * 20,
                    borderOpacity: 0.5 + (normalizedLevel * 0.5),
                    borderGlow: normalizedLevel * 30
                };
            case 'blur':
                return { blur: normalizedLevel * 15 };
            case 'gradientPulse':
                return { gradientRadius: 0.3 + (normalizedLevel * 0.7) };
            case 'gradientRotation':
                const timeGrad = Date.now() * 0.002;
                return { gradientAngle: (Math.sin(timeGrad) * normalizedLevel * 180) };
            case 'contrast':
                return { contrast: 80 + (normalizedLevel * 120) };
            case 'grayscale':
                return { grayscale: normalizedLevel * 100 };
            case 'sepia':
                return { sepia: normalizedLevel * 100 };
            case 'invert':
                const invertLevel = Math.pow(normalizedLevel, 1.5) * 100;
                return { invert: invertLevel };
            case 'skew':
                const timeSkew = Date.now() * 0.004;
                const skewAmount = normalizedLevel * 15;
                return {
                    skewX: Math.sin(timeSkew) * skewAmount,
                    skewY: Math.cos(timeSkew * 0.7) * skewAmount * 0.5
                };
            case 'strobe':
                if (normalizedLevel > 0.6) {
                    const strobeFlash = 0.8 + Math.random() * 0.2;
                    return { strobeOpacity: strobeFlash, strobeBrightness: 150 + normalizedLevel * 100 };
                } else if (normalizedLevel > 0.3) {
                    return { strobeOpacity: 0.7 + normalizedLevel * 0.3, strobeBrightness: 100 };
                }
                return { strobeOpacity: 1, strobeBrightness: 100 };
            case 'chromatic':
                const chromaticOffset = normalizedLevel * 8;
                return {
                    chromaticOffset,
                    chromaticR: { x: chromaticOffset, y: 0 },
                    chromaticG: { x: 0, y: 0 },
                    chromaticB: { x: -chromaticOffset, y: 0 }
                };
            case 'perspective':
                const timePerspective = Date.now() * 0.002;
                const perspectiveAmount = normalizedLevel * 25;
                return {
                    perspectiveRotateX: Math.sin(timePerspective) * perspectiveAmount,
                    perspectiveRotateY: Math.cos(timePerspective * 0.8) * perspectiveAmount * 0.7
                };
            default:
                return {};
        }
    }

    /**
     * Wendet Audio-Reaktive Effekte auf Canvas-Filter an
     */
    _applyAudioReactiveFilters(ctx, audioReactive) {
        if (!audioReactive || !audioReactive.hasEffects) return;

        let currentFilter = ctx.filter || 'none';
        if (currentFilter === 'none') currentFilter = '';

        const effects = audioReactive.effects;

        if (effects.hue) {
            currentFilter += ` hue-rotate(${effects.hue.hueRotate}deg)`;
        }
        if (effects.brightness) {
            currentFilter += ` brightness(${effects.brightness.brightness}%)`;
        }
        if (effects.saturation) {
            currentFilter += ` saturate(${effects.saturation.saturation}%)`;
        }
        if (effects.blur) {
            currentFilter += ` blur(${effects.blur.blur}px)`;
        }
        if (effects.glow) {
            ctx.shadowColor = effects.glow.glowColor;
            ctx.shadowBlur = effects.glow.glowBlur;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        if (effects.contrast) {
            currentFilter += ` contrast(${effects.contrast.contrast}%)`;
        }
        if (effects.grayscale) {
            currentFilter += ` grayscale(${effects.grayscale.grayscale}%)`;
        }
        if (effects.sepia) {
            currentFilter += ` sepia(${effects.sepia.sepia}%)`;
        }
        if (effects.invert) {
            currentFilter += ` invert(${effects.invert.invert}%)`;
        }
        if (effects.strobe && effects.strobe.strobeBrightness !== 100) {
            currentFilter += ` brightness(${effects.strobe.strobeBrightness}%)`;
        }
        if (effects.strobe && effects.strobe.strobeOpacity !== undefined && effects.strobe.strobeOpacity !== 1) {
            ctx.globalAlpha = ctx.globalAlpha * effects.strobe.strobeOpacity;
        }

        if (currentFilter.trim()) {
            ctx.filter = currentFilter.trim();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // OBJECT PROPERTY UPDATES
    // ═══════════════════════════════════════════════════════════════════

    updateActiveObjectProperty(property, value) {
        if (!this.activeObject) return;

        if (this.activeObject.type === 'text') {
            if (property.includes('.')) {
                const [mainProp, subProp] = property.split('.');
                if (this.activeObject[mainProp]) {
                    this.activeObject[mainProp][subProp] = value;
                }
            } else {
                this.activeObject[property] = value;
            }

            const boundsAffectingProps = ['text', 'fontSize', 'fontFamily', 'fontWeight'];
            if (boundsAffectingProps.includes(property) || property.includes('.')) {
                this.calculateTextBounds(this.activeObject);
            }
        }

        this.redrawCallback();
    }

    updateActiveFotoProperty(property, value) {
        if (!this.activeObject || this.activeObject.type !== 'image') return;

        if (this.fotoManager) {
            this.fotoManager.updateSetting(this.activeObject, property, value);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    reset() {
        if (this.multiImageManager) {
            this.multiImageManager.clear();
        }
        if (this.textManager && this.textManager.textObjects) {
            this.textManager.textObjects = [];
        }

        if (this.videoManager) {
            this.videoManager.clear();
        }

        this.background = null;
        this.workspaceBackground = null;

        if (this.videoBackground) {
            const video = this.videoBackground.videoElement;
            if (video) {
                video.pause();
                video.src = '';
            }
            this.videoBackground = null;
        }

        if (this.workspaceVideoBackground) {
            const wsVideo = this.workspaceVideoBackground.videoElement;
            if (wsVideo) {
                wsVideo.pause();
                wsVideo.src = '';
            }
            this.workspaceVideoBackground = null;
        }

        this.setActiveObject(null);

        // Cleanup recording resources
        this.recordingRenderer.cleanupAfterRecording();

        this.redrawCallback();
        this.updateUICallback();
    }

    destroy() {
        this.mouseHandler.destroy();

        this.activeObject = null;
        this.hoveredObject = null;
        this.currentAction = null;
        this._cachedBounds = null;

        this.recordingRenderer.cleanupAfterRecording();

        console.log('[CanvasManager] ✅ Destroyed and cleaned up');
    }

    deleteActiveObject() {
        if (!this.activeObject) return;

        if (this.activeObject.type === 'image' && this.multiImageManager) {
            this.multiImageManager.removeImage(this.activeObject.id);
        } else if (this.activeObject.type === 'video' && this.videoManager) {
            this.videoManager.removeVideo(this.activeObject.id);
        } else if (this.activeObject.type === 'text') {
            if (this.textManager) {
                this.textManager.delete(this.activeObject);
            }
        } else if (this.activeObject.type === 'background') {
            this.background = null;
        } else if (this.activeObject.type === 'workspace-background') {
            this.workspaceBackground = null;
        }

        this.setActiveObject(null);
        this.redrawCallback();
        this.updateUICallback();
    }

    removeImageBySource(imageObjectToRemove) {
        if (!imageObjectToRemove) return;

        if (this.background && this.background.imageObject === imageObjectToRemove) {
            this.background = null;
        }

        if (this.workspaceBackground && this.workspaceBackground.imageObject === imageObjectToRemove) {
            this.workspaceBackground = null;
        }

        if (this.multiImageManager) {
            const images = this.multiImageManager.getAllImages();
            const imagesToRemove = images.filter(imgData => imgData.imageObject === imageObjectToRemove);
            imagesToRemove.forEach(img => {
                this.multiImageManager.removeImage(img.id);
            });
        }

        if (this.activeObject && this.activeObject.type === 'image' && this.activeObject.imageObject === imageObjectToRemove) {
            this.setActiveObject(null);
        }

        this.redrawCallback?.();
        this.updateUICallback?.();
    }

    getCanvasState() {
        const images = this.multiImageManager ? this.multiImageManager.getAllImages() : [];
        const videos = this.videoManager ? this.videoManager.getAllVideos() : [];
        return {
            images: images,
            videos: videos,
            background: this.background,
            workspaceBackground: this.workspaceBackground,
            textObjects: this.textManager && this.textManager.textObjects ? this.textManager.textObjects : [],
        };
    }

    isCanvasEmpty() {
        const isBgEmpty = !this.background || this.background === '#ffffff';
        const isWorkspaceBgEmpty = !this.workspaceBackground;
        const isVideoBgEmpty = !this.videoBackground;
        const isWsVideoBgEmpty = !this.workspaceVideoBackground;
        const imageCount = this.multiImageManager ? this.multiImageManager.getAllImages().length : 0;
        const videoCount = this.videoManager ? this.videoManager.getAllVideos().length : 0;
        const textCount = (this.textManager && this.textManager.textObjects) ? this.textManager.textObjects.length : 0;
        return imageCount === 0 && videoCount === 0 && textCount === 0 &&
            isBgEmpty && isWorkspaceBgEmpty && isVideoBgEmpty && isWsVideoBgEmpty;
    }

    // ═══════════════════════════════════════════════════════════════════
    // DRAWING (delegiert an SceneRenderer)
    // ═══════════════════════════════════════════════════════════════════

    draw(targetCtx) {
        this.sceneRenderer.draw(targetCtx);
    }

    drawScene(ctx) {
        this.sceneRenderer.drawScene(ctx);
    }

    drawWorkspaceOutline(ctx) {
        this.sceneRenderer.drawWorkspaceOutline(ctx);
    }

    drawFadedTextMarkers(ctx) {
        this.sceneRenderer.drawFadedTextMarkers(ctx);
    }

    drawInteractiveElements(ctx) {
        this.uiRenderer.drawInteractiveElements(ctx);
    }

    drawResizeHandles(ctx, bounds) {
        this.uiRenderer.drawResizeHandles(ctx, bounds);
    }

    drawDeleteButton(ctx, bounds) {
        this.uiRenderer.drawDeleteButton(ctx, bounds);
    }

    // ═══════════════════════════════════════════════════════════════════
    // BACKGROUND TILES (delegiert an BackgroundRenderer)
    // ═══════════════════════════════════════════════════════════════════

    drawBackgroundTiles(ctx) {
        return this.backgroundRenderer.drawBackgroundTiles(ctx);
    }

    getTileAtPosition(x, y) {
        return this.backgroundRenderer.getTileAtPosition(x, y);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SELECTION (delegiert an SelectionManager)
    // ═══════════════════════════════════════════════════════════════════

    setActiveObject(obj) {
        this.selectionManager.setActiveObject(obj);
    }

    getObjectAtPos(x, y) {
        return this.selectionManager.getObjectAtPos(x, y);
    }

    getTextAtPos(x, y) {
        return this.selectionManager.getTextAtPos(x, y);
    }

    getObjectBounds(obj) {
        if (!obj) return null;

        if (obj.type === 'text') {
            if (this.textManager && this.textManager.getObjectBounds) {
                return this.textManager.getObjectBounds(obj, this.canvas);
            }
            return null;
        }

        if (obj.type === 'image') {
            return {
                x: obj.relX * this.canvas.width,
                y: obj.relY * this.canvas.height,
                width: obj.relWidth * this.canvas.width,
                height: obj.relHeight * this.canvas.height
            };
        }

        if (obj.type === 'video') {
            return {
                x: obj.relX * this.canvas.width,
                y: obj.relY * this.canvas.height,
                width: obj.relWidth * this.canvas.width,
                height: obj.relHeight * this.canvas.height
            };
        }

        return null;
    }

    isPointInRect(x, y, rect) {
        return this.selectionManager.isPointInRect(x, y, rect);
    }

    getResizeHandles(bounds) {
        return this.selectionManager.getResizeHandles(bounds);
    }

    getHandleAtPos(bounds, x, y) {
        return this.selectionManager.getHandleAtPos(bounds, x, y);
    }

    getDeleteButtonBounds(objectBounds) {
        return this.selectionManager.getDeleteButtonBounds(objectBounds);
    }

    // ═══════════════════════════════════════════════════════════════════
    // DRAG & DROP (delegiert an DragDropHandler)
    // ═══════════════════════════════════════════════════════════════════

    moveObject(obj, dx, dy) {
        this.dragDropHandler.moveObject(obj, dx, dy);
    }

    resizeText(obj, dx, dy) {
        this.dragDropHandler.resizeText(obj, dx, dy);
    }

    resizeImage(obj, dx, dy) {
        this.dragDropHandler.resizeImage(obj, dx, dy);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MOUSE (delegiert an MouseHandler)
    // ═══════════════════════════════════════════════════════════════════

    getMousePos(e) {
        return this.mouseHandler.getMousePos(e);
    }

    onMouseDown(e) {
        this.mouseHandler.onMouseDown(e);
    }

    onMouseMove(e) {
        this.mouseHandler.onMouseMove(e);
    }

    onMouseUp(e) {
        this.mouseHandler.onMouseUp(e);
    }

    onDoubleClick(e) {
        this.mouseHandler.onDoubleClick(e);
    }

    onMouseLeave(e) {
        this.mouseHandler.onMouseLeave(e);
    }

    onWindowMouseUp(e) {
        this.mouseHandler.onWindowMouseUp(e);
    }

    onWindowMouseMove(e) {
        this.mouseHandler.onWindowMouseMove(e);
    }

    _startDragListeners() {
        this.mouseHandler._startDragListeners();
    }

    _stopDragListeners() {
        this.mouseHandler._stopDragListeners();
    }

    _endDrag() {
        this.mouseHandler._endDrag();
    }

    _updateResizeCursor(handleKey) {
        this.mouseHandler._updateResizeCursor(handleKey);
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEXT SELECTION MODE
    // ═══════════════════════════════════════════════════════════════════

    startTextSelectionMode(callback) {
        this.textSelectionMode = true;
        this.textSelectionRect = null;
        this.onTextSelectionComplete = callback;
        this.canvas.style.cursor = 'crosshair';

        this.setActiveObject(null);
        this.redrawCallback();

        console.log('[CanvasManager] ✨ Text-Auswahl-Modus aktiviert');
    }

    cancelTextSelectionMode() {
        this.textSelectionMode = false;
        this.textSelectionRect = null;
        this.onTextSelectionComplete = null;
        this.canvas.style.cursor = 'default';
        this.redrawCallback();

        console.log('[CanvasManager] ✨ Text-Auswahl-Modus beendet');
    }

    drawTextSelectionRect(ctx) {
        this.uiRenderer.drawTextSelectionRect(ctx);
    }

    getTextSelectionBounds() {
        return this.selectionManager.getTextSelectionBounds();
    }

    setTextPositionPreview(relX, relY) {
        if (relX === null || relY === null) {
            this.textPositionPreview = null;
        } else {
            this.textPositionPreview = { relX, relY };
        }
    }

    clearTextPositionPreview() {
        this.textPositionPreview = null;
    }

    drawTextPositionPreview(ctx) {
        this.uiRenderer.drawTextPositionPreview(ctx);
    }

    // ═══════════════════════════════════════════════════════════════════
    // IMAGE SELECTION MODE
    // ═══════════════════════════════════════════════════════════════════

    startImageSelectionMode(callback, animation = 'none') {
        this.imageSelectionMode = true;
        this.imageSelectionRect = null;
        this.onImageSelectionComplete = callback;
        this.pendingImageAnimation = animation;
        this.canvas.style.cursor = 'crosshair';

        this.setActiveObject(null);
        this.redrawCallback();

        console.log('[CanvasManager] ✨ Bild-Bereichsauswahl-Modus aktiviert mit Animation:', animation);
    }

    cancelImageSelectionMode() {
        this.imageSelectionMode = false;
        this.imageSelectionRect = null;
        this.onImageSelectionComplete = null;
        this.pendingImageAnimation = null;
        this.canvas.style.cursor = 'default';
        this.redrawCallback();

        console.log('[CanvasManager] ✨ Bild-Bereichsauswahl-Modus beendet');
    }

    drawImageSelectionRect(ctx) {
        this.uiRenderer.drawImageSelectionRect(ctx);
    }

    getImageSelectionBounds() {
        return this.selectionManager.getImageSelectionBounds();
    }

    setImageAnimation(animation) {
        this.pendingImageAnimation = animation;
        console.log('[CanvasManager] Animation gesetzt:', animation);
    }

    getImageAnimation() {
        return this.pendingImageAnimation || 'none';
    }

    // ═══════════════════════════════════════════════════════════════════
    // RECORDING (delegiert an RecordingRenderer)
    // ═══════════════════════════════════════════════════════════════════

    prepareForRecording(targetCanvas) {
        return this.recordingRenderer.prepareForRecording(targetCanvas);
    }

    drawForRecording(ctx, visualizerCallback = null) {
        this.recordingRenderer.drawForRecording(ctx, visualizerCallback);
    }

    cleanupAfterRecording() {
        this.recordingRenderer.cleanupAfterRecording();
    }

    // Legacy compatibility - diese werden intern von den Modulen verwendet
    _initCanvasPool(width, height) {
        this.recordingRenderer.canvasPool.init(width, height);
    }

    _cleanupCanvasPool() {
        this.recordingRenderer.canvasPool.cleanup();
    }

    get _canvasPool() {
        return this.recordingRenderer.canvasPool._pool;
    }

    get HANDLE_SIZE() {
        return this.selectionManager.HANDLE_SIZE;
    }
}
