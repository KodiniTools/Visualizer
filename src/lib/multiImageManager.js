/**
 * MultiImageManager - Verwaltet mehrere Bilder auf dem Canvas
 * Arbeitet eng mit CanvasManager zusammen
 * ✨ Verwendet modularisierte Audio-Verarbeitung
 */

import {
    applyEasing,
    getAudioLevel,
    applyBeatBoost,
    applyPhaseOffset,
    calculateEffectValue
} from './audio/index.js';

export class MultiImageManager {
    constructor(canvas, callbacks = {}) {
        this.canvas = canvas;
        this.images = [];
        this.selectedImage = null;
        
        // Callbacks
        this.redrawCallback = callbacks.redrawCallback || (() => {});
        this.onImageSelected = callbacks.onImageSelected || (() => {});
        this.onImageChanged = callbacks.onImageChanged || (() => {});
        
        // ✨ FotoManager Referenz (für Filter + Schatten)
        this.fotoManager = callbacks.fotoManager || null;
        
        console.log('✅ MultiImageManager initialisiert');
    }

    /**
     * ✅ KRITISCHER FIX: Aktualisiert die Canvas-Referenz
     * Wird aufgerufen, wenn das DOM-Canvas sich vom gespeicherten Canvas unterscheidet
     * (z.B. nach einem direkten Page-Refresh)
     */
    updateCanvas(newCanvas) {
        if (newCanvas && newCanvas !== this.canvas) {
            console.log('[MultiImageManager] Canvas-Referenz aktualisiert');
            this.canvas = newCanvas;
            return true;
        }
        return false;
    }
    
    /**
     * Initialisiert Filter-Einstellungen für ein Bild (für FotoManager-Kompatibilität)
     */
    initializeImageSettings(imageData) {
        if (!imageData.settings) {
            imageData.settings = {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                opacity: 100,
                blur: 0,
                preset: null
            };
        }
        return imageData;
    }
    
    /**
     * Aktualisiert eine einzelne Einstellung für ein Bild (für FotoManager-Kompatibilität)
     * WICHTIG: Ruft KEINEN redrawCallback auf, um Endlosschleifen zu vermeiden
     */
    updateSetting(imageData, property, value) {
        if (!imageData || !imageData.settings) return false;
        
        imageData.settings[property] = value;
        // KEIN redrawCallback hier! Der FotoManager ruft den Redraw selbst auf
        
        return true;
    }
    
    /**
     * Fügt ein neues Bild zum Canvas hinzu
     */
    addImage(imageObject) {
        if (!imageObject) {
            console.error('❌ Kein Bild zum Hinzufügen übergeben');
            return null;
        }
        
        const img = imageObject;
        
        // Berechne initiale Größe (1/3 der Canvas-Breite)
        const initialRelWidth = 1 / 3;
        const imgAspectRatio = img.height / img.width;
        const canvasAspectRatio = this.canvas.height / this.canvas.width;
        const initialRelHeight = initialRelWidth * imgAspectRatio / canvasAspectRatio;
        
        // Erstelle Bild-Objekt mit FotoManager-kompatibler Filter-Struktur
        const newImage = {
            id: Date.now() + Math.random(), // Eindeutige ID
            type: 'image',
            imageObject: img,
            relX: (1 - initialRelWidth) / 2, // Zentriert
            relY: (1 - initialRelHeight) / 2, // Zentriert
            relWidth: initialRelWidth,
            relHeight: initialRelHeight,
            // Filter-Einstellungen (kompatibel mit FotoManager)
            settings: {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                opacity: 100,
                blur: 0,
                preset: null
            }
        };
        
        // ✨ Initialisiere fotoSettings (für FotoManager Filter + Schatten)
        if (this.fotoManager) {
            this.fotoManager.initializeImageSettings(newImage);
        }
        
        this.images.push(newImage);
        this.setSelectedImage(newImage);

        console.log('✅ Bild hinzugefügt:', newImage.id, 'Anzahl Bilder:', this.images.length);

        this.redrawCallback();
        this.onImageChanged();

        return newImage;
    }

    /**
     * ✨ NEU: Fügt ein Bild mit benutzerdefinierten Bounds und Animation hinzu
     * @param {HTMLImageElement} imageObject - Das Bildobjekt
     * @param {Object} bounds - Die Ziel-Bounds { relX, relY, relWidth, relHeight }
     * @param {string} animation - Die Eintritts-Animation ('none', 'fade', 'slideLeft', 'slideRight', 'slideUp', 'slideDown', 'zoom', 'bounce', 'spin', 'elastic')
     * @param {Object} options - Optionen { duration: Animationsdauer in ms, scale: Skalierungsfaktor, isSlideshowImage: boolean }
     */
    addImageWithBounds(imageObject, bounds, animation = 'none', options = {}) {
        if (!imageObject) {
            console.error('❌ Kein Bild zum Hinzufügen übergeben');
            return null;
        }

        // Extrahiere Optionen mit Standardwerten
        const duration = options.duration || 500;
        const isSlideshowImage = options.isSlideshowImage || false;

        // Berechne Bild-Seitenverhältnis
        const imgAspectRatio = imageObject.height / imageObject.width;
        const canvasAspectRatio = this.canvas.height / this.canvas.width;

        // Berechne relative Höhe basierend auf der Breite und dem Seitenverhältnis
        let finalRelWidth = bounds.relWidth;
        let finalRelHeight = bounds.relWidth * imgAspectRatio / canvasAspectRatio;

        // Wenn die Höhe größer ist als die Bounds, passe die Breite an
        if (finalRelHeight > bounds.relHeight) {
            finalRelHeight = bounds.relHeight;
            finalRelWidth = bounds.relHeight * canvasAspectRatio / imgAspectRatio;
        }

        // Zentriere das Bild innerhalb der Bounds
        const finalRelX = bounds.relX + (bounds.relWidth - finalRelWidth) / 2;
        const finalRelY = bounds.relY + (bounds.relHeight - finalRelHeight) / 2;

        // Erstelle Bild-Objekt
        const newImage = {
            id: Date.now() + Math.random(),
            type: 'image',
            imageObject: imageObject,
            relX: finalRelX,
            relY: finalRelY,
            relWidth: finalRelWidth,
            relHeight: finalRelHeight,
            settings: {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                opacity: 100,
                blur: 0,
                preset: null
            },
            // ✨ Animations-Status
            animation: {
                type: animation,
                active: animation !== 'none',
                startTime: Date.now(),
                duration: duration,
                progress: 0
            },
            // ✨ FIX: isSlideshowImage Flag SOFORT setzen, BEVOR setSelectedImage() aufgerufen wird
            // Dies stellt sicher, dass Selection-Marker die korrekten Transform-Bounds verwenden
            isSlideshowImage: isSlideshowImage
        };

        // Initialisiere fotoSettings
        if (this.fotoManager) {
            this.fotoManager.initializeImageSettings(newImage);
        }

        this.images.push(newImage);
        this.setSelectedImage(newImage);

        console.log('✅ Bild mit Bounds hinzugefügt:', newImage.id, 'Animation:', animation, 'Dauer:', duration, 'ms', 'isSlideshowImage:', isSlideshowImage);

        // Starte Animation wenn nötig
        if (animation !== 'none') {
            this._startAnimation(newImage);
        }

        this.redrawCallback();
        this.onImageChanged();

        return newImage;
    }

    /**
     * ✨ NEU: Startet die Eintritts-Animation für ein Bild
     */
    _startAnimation(imageData) {
        if (!imageData.animation || !imageData.animation.active) return;

        console.log('🎬 Animation gestartet:', {
            type: imageData.animation.type,
            duration: imageData.animation.duration,
            startTime: imageData.animation.startTime
        });

        const animate = () => {
            if (!imageData.animation || !imageData.animation.active) return;

            const elapsed = Date.now() - imageData.animation.startTime;
            const duration = imageData.animation.duration;
            const progress = Math.min(elapsed / duration, 1);
            imageData.animation.progress = progress;

            this.redrawCallback();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Animation beendet
                imageData.animation.active = false;
                console.log('✅ Animation beendet für Bild:', imageData.id, 'nach', elapsed, 'ms');
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * ✨ NEU: Berechnet die Animations-Transformation für ein Bild
     * Gibt { opacity, translateX, translateY, scale, rotation } zurück
     */
    getAnimationTransform(imageData) {
        if (!imageData.animation || !imageData.animation.active) {
            return { opacity: 1, translateX: 0, translateY: 0, scale: 1, rotation: 0 };
        }

        const progress = imageData.animation.progress;
        const eased = this._easeOutCubic(progress);
        const type = imageData.animation.type;

        switch (type) {
            case 'fade':
                // Linear für gleichmäßiges Einblenden über die gesamte Dauer
                return { opacity: progress, translateX: 0, translateY: 0, scale: 1, rotation: 0 };

            case 'slideLeft':
                return { opacity: eased, translateX: (1 - eased) * this.canvas.width * 0.3, translateY: 0, scale: 1, rotation: 0 };

            case 'slideRight':
                return { opacity: eased, translateX: (eased - 1) * this.canvas.width * 0.3, translateY: 0, scale: 1, rotation: 0 };

            case 'slideUp':
                return { opacity: eased, translateX: 0, translateY: (1 - eased) * this.canvas.height * 0.3, scale: 1, rotation: 0 };

            case 'slideDown':
                return { opacity: eased, translateX: 0, translateY: (eased - 1) * this.canvas.height * 0.3, scale: 1, rotation: 0 };

            case 'zoom':
                return { opacity: eased, translateX: 0, translateY: 0, scale: 0.3 + eased * 0.7, rotation: 0 };

            case 'bounce':
                const bounceEase = this._easeOutBounce(progress);
                return { opacity: 1, translateX: 0, translateY: (1 - bounceEase) * -this.canvas.height * 0.2, scale: 1, rotation: 0 };

            case 'spin':
                return { opacity: eased, translateX: 0, translateY: 0, scale: eased, rotation: (1 - eased) * 360 };

            case 'elastic':
                const elasticEase = this._easeOutElastic(progress);
                return { opacity: 1, translateX: 0, translateY: 0, scale: elasticEase, rotation: 0 };

            default:
                return { opacity: 1, translateX: 0, translateY: 0, scale: 1, rotation: 0 };
        }
    }

    /**
     * ✨ Easing-Funktionen für sanfte Animationen
     */
    _easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    _easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }

    _easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;

        return t === 0
            ? 0
            : t === 1
            ? 1
            : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }

    /**
     * Entfernt ein Bild vom Canvas
     */
    removeImage(imageId) {
        const index = this.images.findIndex(img => img.id === imageId);
        if (index === -1) return false;
        
        this.images.splice(index, 1);
        
        if (this.selectedImage && this.selectedImage.id === imageId) {
            this.selectedImage = null;
            this.onImageSelected(null);
        }
        
        console.log('🗑️ Bild entfernt:', imageId, 'Verbleibende Bilder:', this.images.length);
        
        this.redrawCallback();
        this.onImageChanged();
        
        return true;
    }
    
    /**
     * Setzt das aktuell ausgewählte Bild
     */
    setSelectedImage(image) {
        if (this.selectedImage && image && this.selectedImage.id === image.id) {
            return; // Bereits ausgewählt
        }

        this.selectedImage = image;

        // Ebenenreihenfolge wird NICHT automatisch geändert
        // Der Benutzer kann explizit die Ebenensteuerung verwenden

        this.onImageSelected(image);
        this.redrawCallback();
    }
    
    /**
     * Gibt das aktuell ausgewählte Bild zurück
     */
    getSelectedImage() {
        return this.selectedImage;
    }
    
    /**
     * Gibt alle Bilder zurück
     */
    getAllImages() {
        return this.images;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ✨ EASING-FUNKTIONEN für geschmeidigere Audio-Reaktionen
    // ✅ Delegiert an modulares Audio-System
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Wendet eine Easing-Funktion auf einen Wert an (0-1)
     * ✅ Verwendet jetzt das modulare EasingFunctions-Modul
     */
    _applyEasing(value, easingType = 'linear') {
        return applyEasing(value, easingType);
    }

    /**
     * ✨ Berechnet den Audio-Level für eine bestimmte Quelle
     * ✅ Verwendet jetzt das modulare AudioLevelCalculator-Modul
     * @param {string} source - 'bass', 'mid', 'treble', 'volume', 'dynamic'
     * @param {object} audioData - Die Audio-Analyse-Daten
     * @param {boolean} useSmooth - Ob geglättete Werte verwendet werden sollen
     * @returns {number} Audio-Level (0-255)
     */
    _getAudioLevelForSource(source, audioData, useSmooth) {
        return getAudioLevel(source, audioData, useSmooth);
    }

    /**
     * ✨ Berechnet Audio-Reaktive Effekt-Werte basierend auf den aktuellen Audio-Daten
     * ✅ Unterstützt MEHRERE Effekte gleichzeitig
     * ✅ Easing-Funktionen für geschmeidigere Übergänge
     * ✅ Delay/Phasenversatz für Kaskaden-Effekte
     * ✅ Beat-Boost für dramatischere Effekte bei Beats
     * ✅ NEU: Individuelle Audio-Quelle pro Effekt
     * ✅ Verwendet modulares Audio-System
     */
    getAudioReactiveValues(audioSettings) {
        if (!audioSettings || !audioSettings.enabled) {
            return null;
        }

        const audioData = window.audioAnalysisData;
        if (!audioData) return null;

        // Globale Einstellungen
        const globalSource = audioSettings.source || 'bass';
        const smoothing = audioSettings.smoothing || 50;
        const easing = audioSettings.easing || 'linear';
        const phase = audioSettings.phase || 0;
        const beatBoost = audioSettings.beatBoost ?? 1.0;
        const useSmooth = smoothing > 30;

        // Ergebnis-Objekt für alle aktivierten Effekte
        const result = {
            hasEffects: false,
            effects: {}
        };

        // ✨ NEUE STRUKTUR: Prüfe welche Effekte aktiviert sind
        const effects = audioSettings.effects;
        if (!effects) {
            // Fallback für alte Struktur (einzelner Effekt)
            let audioLevel = this._getAudioLevelForSource(globalSource, audioData, useSmooth);

            // Beat-Boost anwenden (modulare Funktion)
            audioLevel = applyBeatBoost(audioLevel, audioData, beatBoost);

            // Phasenversatz anwenden (modulare Funktion)
            audioLevel = applyPhaseOffset(audioLevel, phase);

            let baseLevel = this._applyEasing(audioLevel / 255, easing);
            const effect = audioSettings.effect || 'hue';
            const intensity = (audioSettings.intensity || 80) / 100;

            result.hasEffects = true;
            result.effects[effect] = this._calculateEffectValue(effect, baseLevel * intensity);
            return result;
        }

        // Berechne Werte für jeden aktivierten Effekt
        for (const [effectName, effectConfig] of Object.entries(effects)) {
            if (effectConfig && effectConfig.enabled) {
                // ✨ NEU: Verwende individuelle Quelle oder globale Quelle
                const effectSource = effectConfig.source || globalSource;

                // Audio-Level für diese spezifische Quelle berechnen
                let audioLevel = this._getAudioLevelForSource(effectSource, audioData, useSmooth);

                // Beat-Boost anwenden (modulare Funktion)
                audioLevel = applyBeatBoost(audioLevel, audioData, beatBoost);

                // Phasenversatz anwenden (modulare Funktion)
                audioLevel = applyPhaseOffset(audioLevel, phase);

                // Normalisieren, Easing anwenden, Intensität
                let baseLevel = this._applyEasing(audioLevel / 255, easing);
                const intensity = (effectConfig.intensity || 80) / 100;
                const normalizedLevel = baseLevel * intensity;

                result.hasEffects = true;
                result.effects[effectName] = this._calculateEffectValue(effectName, normalizedLevel);
            }
        }

        return result.hasEffects ? result : null;
    }

    /**
     * ✨ Berechnet den Wert für einen einzelnen Effekt
     * ✅ Verwendet jetzt das modulare AudioReactiveEffects-Modul
     */
    _calculateEffectValue(effectName, normalizedLevel) {
        return calculateEffectValue(effectName, normalizedLevel);
    }

    /**
     * Zeichnet alle Bilder auf den Canvas
     * ✅ OPTIMIERT: Reduziert Canvas-Context Overhead für Recording
     * ✨ ERWEITERT: Unterstützt jetzt Filter, Schatten und Rotation vom FotoManager
     * ✨ NEU: Audio-Reaktive Effekte
     * ✨ NEU: Layer-Filter für Visualizer-Unterstützung
     * @param {CanvasRenderingContext2D} ctx - Canvas-Kontext
     * @param {Object} options - Optionen
     * @param {boolean|null} options.behindVisualizer - null=alle, true=nur hinter Visualizer, false=nur vor Visualizer
     */
    drawImages(ctx, options = {}) {
        if (!ctx || this.images.length === 0) return;

        // ✅ KRITISCHER FIX: Verwende ctx.canvas für Bounds-Berechnung
        // Dies stellt sicher, dass wir die Dimensionen des TATSÄCHLICH sichtbaren Canvas verwenden
        const renderCanvas = ctx.canvas;

        // ✨ Filter Bilder basierend auf Layer-Einstellung
        const { behindVisualizer = null } = options;
        let imagesToDraw = this.images;

        if (behindVisualizer !== null) {
            imagesToDraw = this.images.filter(imgData => {
                const renderBehind = imgData.fotoSettings?.renderBehindVisualizer || false;
                return renderBehind === behindVisualizer;
            });
        }

        // ✅ OPTIMIZATION: Batch-Rendering mit weniger save/restore calls
        imagesToDraw.forEach(imgData => {
            // ✨ forceImageBounds=true damit die tatsächlichen Bild-Koordinaten verwendet werden
            const bounds = this.getImageBounds(imgData, renderCanvas, true);
            if (!bounds) return;

            // ✨ Audio-Reaktive Werte berechnen
            const audioReactive = this.getAudioReactiveValues(imgData.fotoSettings?.audioReactive);

            // ✨ Eintritts-Animation Transformation berechnen
            const animTransform = this.getAnimationTransform(imgData);

            // ✅ FIX: IMMER save/restore für jedes Bild um Filter-Leakage zu verhindern
            ctx.save();

            // ✨ Eintritts-Animation anwenden (Opacity)
            if (animTransform.opacity < 1) {
                ctx.globalAlpha = animTransform.opacity;
            }

            // ✨ SLIDESHOW: Slideshow-Opacity anwenden (für Ein-/Ausblend-Animationen)
            if (imgData.slideshow && imgData.slideshow.active) {
                const slideshowOpacity = Math.max(0, Math.min(1, imgData.slideshow.opacity));
                ctx.globalAlpha = ctx.globalAlpha * slideshowOpacity;
            }

            // ✨ Nutze FotoManager für Filter + Schatten (wenn verfügbar)
            if (this.fotoManager && imgData.fotoSettings) {
                this.fotoManager.applyFilters(ctx, imgData);
            } else if (imgData.settings) {
                // Fallback: Alte Filter-Methode
                this.applyFilters(ctx, imgData);
            }

            // ✨ AUDIO-REAKTIV: Zusätzliche Filter basierend auf Audio (MEHRERE EFFEKTE)
            if (audioReactive && audioReactive.hasEffects) {
                // Hole aktuelle Filter-String
                let currentFilter = ctx.filter || 'none';
                if (currentFilter === 'none') currentFilter = '';

                const effects = audioReactive.effects;

                // Hue-Rotation
                if (effects.hue) {
                    currentFilter += ` hue-rotate(${effects.hue.hueRotate}deg)`;
                }

                // Helligkeit
                if (effects.brightness) {
                    currentFilter += ` brightness(${effects.brightness.brightness}%)`;
                }

                // Sättigung
                if (effects.saturation) {
                    currentFilter += ` saturate(${effects.saturation.saturation}%)`;
                }

                // Blur (Unschärfe)
                if (effects.blur) {
                    currentFilter += ` blur(${effects.blur.blur}px)`;
                }

                // ✨ NEU: Kontrast
                if (effects.contrast) {
                    currentFilter += ` contrast(${effects.contrast.contrast}%)`;
                }

                // ✨ NEU: Graustufen
                if (effects.grayscale) {
                    currentFilter += ` grayscale(${effects.grayscale.grayscale}%)`;
                }

                // ✨ NEU: Sepia
                if (effects.sepia) {
                    currentFilter += ` sepia(${effects.sepia.sepia}%)`;
                }

                // ✨ NEU: Invertieren
                if (effects.invert) {
                    currentFilter += ` invert(${effects.invert.invert}%)`;
                }

                // ✨ NEU: Strobe Helligkeit (zusätzlicher Brightness-Boost bei Peaks)
                if (effects.strobe && effects.strobe.strobeBrightness !== 100) {
                    currentFilter += ` brightness(${effects.strobe.strobeBrightness}%)`;
                }

                // Glow als Shadow-Effekt
                if (effects.glow) {
                    ctx.shadowColor = effects.glow.glowColor;
                    ctx.shadowBlur = effects.glow.glowBlur;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                }

                if (currentFilter.trim()) {
                    ctx.filter = currentFilter.trim();
                }
            }

            // ✨ ROTATION anwenden (statisch + audio-reaktiv)
            let totalRotation = imgData.fotoSettings?.rotation || 0;

            // Audio-reaktive Rotation hinzufügen
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.rotation) {
                totalRotation += audioReactive.effects.rotation.rotation;
            }

            if (totalRotation !== 0) {
                // Berechne Zentrum des Bildes
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;

                // Verschiebe zum Zentrum, rotiere, verschiebe zurück
                ctx.translate(centerX, centerY);
                ctx.rotate((totalRotation * Math.PI) / 180);
                ctx.translate(-centerX, -centerY);
            }

            // ✨ FLIP anwenden (Horizontal und/oder Vertikal spiegeln)
            const flipH = imgData.fotoSettings?.flipH || false;
            const flipV = imgData.fotoSettings?.flipV || false;
            if (flipH || flipV) {
                // Berechne Zentrum des Bildes
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;

                // Verschiebe zum Zentrum, spiegeln, verschiebe zurück
                ctx.translate(centerX, centerY);
                ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                ctx.translate(-centerX, -centerY);
            }

            // ✨ AUDIO-REAKTIV: Bewegungseffekte - drawBounds für Position
            let drawBounds = { ...bounds };

            // ✨ EINTRITTS-ANIMATION: Translate-Effekte
            if (animTransform.translateX !== 0 || animTransform.translateY !== 0) {
                drawBounds.x += animTransform.translateX;
                drawBounds.y += animTransform.translateY;
            }

            // ✨ EINTRITTS-ANIMATION: Scale-Effekt
            if (animTransform.scale !== 1) {
                const centerX = drawBounds.x + drawBounds.width / 2;
                const centerY = drawBounds.y + drawBounds.height / 2;
                const newWidth = drawBounds.width * animTransform.scale;
                const newHeight = drawBounds.height * animTransform.scale;
                drawBounds.x = centerX - newWidth / 2;
                drawBounds.y = centerY - newHeight / 2;
                drawBounds.width = newWidth;
                drawBounds.height = newHeight;
            }

            // ✨ EINTRITTS-ANIMATION: Rotation-Effekt
            if (animTransform.rotation !== 0) {
                const centerX = drawBounds.x + drawBounds.width / 2;
                const centerY = drawBounds.y + drawBounds.height / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate((animTransform.rotation * Math.PI) / 180);
                ctx.translate(-centerX, -centerY);
            }

            // ✨ AUDIO-REAKTIV: Shake-Effekt (Erschütterung)
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.shake) {
                const shake = audioReactive.effects.shake;
                drawBounds.x += shake.shakeX || 0;
                drawBounds.y += shake.shakeY || 0;
            }

            // ✨ AUDIO-REAKTIV: Bounce-Effekt (Hüpfen)
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.bounce) {
                const bounce = audioReactive.effects.bounce;
                drawBounds.y += bounce.bounceY || 0;
            }

            // ✨ AUDIO-REAKTIV: Swing-Effekt (Horizontales Pendeln)
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.swing) {
                const swing = audioReactive.effects.swing;
                drawBounds.x += swing.swingX || 0;
            }

            // ✨ AUDIO-REAKTIV: Orbit-Effekt (Kreisbewegung)
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.orbit) {
                const orbit = audioReactive.effects.orbit;
                drawBounds.x += orbit.orbitX || 0;
                drawBounds.y += orbit.orbitY || 0;
            }

            // ✨ AUDIO-REAKTIV: Figure8-Effekt (Achter-Bewegung)
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.figure8) {
                const figure8 = audioReactive.effects.figure8;
                drawBounds.x += figure8.figure8X || 0;
                drawBounds.y += figure8.figure8Y || 0;
            }

            // ✨ AUDIO-REAKTIV: Wave-Effekt (Sinuswelle)
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.wave) {
                const wave = audioReactive.effects.wave;
                drawBounds.x += wave.waveX || 0;
                drawBounds.y += wave.waveY || 0;
            }

            // ✨ AUDIO-REAKTIV: Spiral-Effekt (Spirale)
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.spiral) {
                const spiral = audioReactive.effects.spiral;
                drawBounds.x += spiral.spiralX || 0;
                drawBounds.y += spiral.spiralY || 0;
            }

            // ✨ AUDIO-REAKTIV: Float-Effekt (Schweben)
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.float) {
                const float = audioReactive.effects.float;
                drawBounds.x += float.floatX || 0;
                drawBounds.y += float.floatY || 0;
            }

            // ✨ NEU: AUDIO-REAKTIV: Skew-Effekt (Verzerrung)
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.skew) {
                const skew = audioReactive.effects.skew;
                const centerX = drawBounds.x + drawBounds.width / 2;
                const centerY = drawBounds.y + drawBounds.height / 2;
                ctx.translate(centerX, centerY);
                // CSS skew in Radians: tan(angle) für die Transformationsmatrix
                const skewXRad = (skew.skewX || 0) * Math.PI / 180;
                const skewYRad = (skew.skewY || 0) * Math.PI / 180;
                ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
                ctx.translate(-centerX, -centerY);
            }

            // ✨ NEU: AUDIO-REAKTIV: Perspective-Effekt (3D-Kipp)
            // Hinweis: Canvas 2D unterstützt keine echte 3D-Perspektive,
            // daher simulieren wir den Effekt durch Kombination von Skalierung und Scherung
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.perspective) {
                const persp = audioReactive.effects.perspective;
                const centerX = drawBounds.x + drawBounds.width / 2;
                const centerY = drawBounds.y + drawBounds.height / 2;

                // Simulierte Perspektive durch asymmetrische Skalierung
                const rotX = (persp.perspectiveRotateX || 0) * Math.PI / 180;
                const rotY = (persp.perspectiveRotateY || 0) * Math.PI / 180;

                // Skalierungsfaktoren basierend auf "Neigung"
                const scaleXFactor = 1 - Math.abs(Math.sin(rotY)) * 0.15;
                const scaleYFactor = 1 - Math.abs(Math.sin(rotX)) * 0.15;

                ctx.translate(centerX, centerY);
                ctx.scale(scaleXFactor, scaleYFactor);
                // Leichte Scherung für Pseudo-3D-Effekt
                ctx.transform(1, Math.sin(rotX) * 0.1, Math.sin(rotY) * 0.1, 1, 0, 0);
                ctx.translate(-centerX, -centerY);
            }

            // ✨ NEU: AUDIO-REAKTIV: Strobe-Opacity-Effekt
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.strobe) {
                const strobe = audioReactive.effects.strobe;
                if (strobe.strobeOpacity !== undefined && strobe.strobeOpacity !== 1) {
                    ctx.globalAlpha = ctx.globalAlpha * strobe.strobeOpacity;
                }
            }

            // ✨ AUDIO-REAKTIV: Scale-Effekt (Pulsieren)
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.scale) {
                const scaleFactor = audioReactive.effects.scale.scale || 1.0;
                // Skaliere vom Zentrum aus
                const centerX = drawBounds.x + drawBounds.width / 2;
                const centerY = drawBounds.y + drawBounds.height / 2;
                const newWidth = drawBounds.width * scaleFactor;
                const newHeight = drawBounds.height * scaleFactor;
                drawBounds.x = centerX - newWidth / 2;
                drawBounds.y = centerY - newHeight / 2;
                drawBounds.width = newWidth;
                drawBounds.height = newHeight;
            }

            // ✨ BILDKONTUR: Prüfen ob Kontur gezeichnet werden soll
            // Statische Kontur-Einstellungen
            let borderWidth = imgData.fotoSettings?.borderWidth || 0;
            let borderColor = imgData.fotoSettings?.borderColor || '#ffffff';
            let borderOpacity = (imgData.fotoSettings?.borderOpacity ?? 100) / 100;
            let borderGlow = 0;

            // ✨ AUDIO-REAKTIVE BILDKONTUR: Überschreibt/erweitert statische Werte
            if (audioReactive && audioReactive.hasEffects && audioReactive.effects.border) {
                const audioBorder = audioReactive.effects.border;
                // Audio-reaktive Breite addieren zur statischen Breite (oder nur Audio wenn keine statische)
                borderWidth = Math.max(borderWidth, audioBorder.borderWidth);
                // Audio-reaktive Opazität überschreibt wenn aktiv
                borderOpacity = Math.max(borderOpacity, audioBorder.borderOpacity);
                // Leuchten um die Kontur
                borderGlow = audioBorder.borderGlow;
            }

            // ✨ NEU: Chromatische Aberration - zeichnet RGB-Kanäle mit Verschiebung
            const hasChromaticEffect = audioReactive && audioReactive.hasEffects &&
                                       audioReactive.effects.chromatic &&
                                       audioReactive.effects.chromatic.chromaticOffset > 0.5;

            if (hasChromaticEffect && borderWidth === 0) {
                // Chromatische Aberration: Bild in RGB-Kanälen mit Offset zeichnen
                const chromatic = audioReactive.effects.chromatic;
                const offset = chromatic.chromaticOffset;

                try {
                    // Speichere aktuellen Filter
                    const currentFilter = ctx.filter;
                    const currentAlpha = ctx.globalAlpha;

                    // Rot-Kanal (nach rechts verschoben)
                    ctx.globalCompositeOperation = 'screen';
                    ctx.filter = `${currentFilter} saturate(0%) brightness(100%) sepia(100%) hue-rotate(-50deg) saturate(600%)`;
                    ctx.globalAlpha = currentAlpha * 0.8;
                    ctx.drawImage(imgData.imageObject,
                        drawBounds.x + offset, drawBounds.y,
                        drawBounds.width, drawBounds.height);

                    // Grün-Kanal (mittig)
                    ctx.filter = `${currentFilter} saturate(0%) brightness(100%) sepia(100%) hue-rotate(50deg) saturate(600%)`;
                    ctx.globalAlpha = currentAlpha * 0.8;
                    ctx.drawImage(imgData.imageObject,
                        drawBounds.x, drawBounds.y,
                        drawBounds.width, drawBounds.height);

                    // Blau-Kanal (nach links verschoben)
                    ctx.filter = `${currentFilter} saturate(0%) brightness(100%) sepia(100%) hue-rotate(170deg) saturate(600%)`;
                    ctx.globalAlpha = currentAlpha * 0.8;
                    ctx.drawImage(imgData.imageObject,
                        drawBounds.x - offset, drawBounds.y,
                        drawBounds.width, drawBounds.height);

                    // Original darüber für Farbtreue
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.filter = currentFilter;
                    ctx.globalAlpha = currentAlpha * 0.4;
                    ctx.drawImage(imgData.imageObject,
                        drawBounds.x, drawBounds.y,
                        drawBounds.width, drawBounds.height);

                    // Reset
                    ctx.globalAlpha = currentAlpha;
                    ctx.globalCompositeOperation = 'source-over';
                } catch (e) {
                    console.warn('[MultiImageManager] Chromatic effect error:', e);
                }
            } else if (borderWidth > 0) {
                // Mit Kontur: _drawImageOutline zeichnet sowohl Kontur als auch Bild
                // Zeichne Kontur um die sichtbare Form des Bildes (inklusive Bild darüber)
                // Filter werden in _drawImageOutline auf das Originalbild angewendet
                this._drawImageOutline(ctx, imgData, drawBounds, borderWidth, borderColor, borderOpacity, borderGlow);
            } else {
                // Ohne Kontur: Bild normal zeichnen
                try {
                    ctx.drawImage(
                        imgData.imageObject,
                        drawBounds.x,
                        drawBounds.y,
                        drawBounds.width,
                        drawBounds.height
                    );
                } catch (e) {
                    console.warn('[MultiImageManager] Image render error:', e);
                }
            }

            // ✅ FIX: ctx.restore() stellt alle Filter/Transformationen wieder her
            ctx.restore();
        });
    }
    
    /**
     * Zeichnet interaktive Elemente (Rahmen, Handles, Löschbutton)
     */
    drawInteractiveElements(ctx) {
        if (!this.selectedImage || this.selectedImage.type !== 'image') return;

        // ✨ NEU: Für Slideshow-Bilder die Slideshow-Transform-Bounds verwenden
        let bounds;
        if (this.selectedImage.isSlideshowImage && window.slideshowManager) {
            const transform = window.slideshowManager.getTransform();
            bounds = {
                x: transform.relX * this.canvas.width,
                y: transform.relY * this.canvas.height,
                width: transform.relWidth * this.canvas.width,
                height: transform.relHeight * this.canvas.height
            };
        } else {
            bounds = this.getImageBounds(this.selectedImage);
        }
        if (!bounds) return;
        
        ctx.save();
        
        // Rahmen zeichnen
        ctx.strokeStyle = 'rgba(110, 168, 254, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.setLineDash([]);
        
        // Skalierungs-Handles zeichnen
        const handles = this.getResizeHandles(bounds);
        ctx.fillStyle = 'rgba(110, 168, 254, 0.9)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        
        for (const key in handles) {
            const handle = handles[key];
            ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
            ctx.strokeRect(handle.x, handle.y, handle.width, handle.height);
        }
        
        // Löschbutton zeichnen
        const deleteButton = this.getDeleteButtonBounds(bounds);
        ctx.fillStyle = 'rgba(255, 69, 58, 0.95)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.arc(
            deleteButton.x + deleteButton.width / 2, 
            deleteButton.y + deleteButton.height / 2, 
            deleteButton.width / 2, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
        
        // X-Symbol zeichnen
        const padding = 6;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(deleteButton.x + padding, deleteButton.y + padding);
        ctx.lineTo(deleteButton.x + deleteButton.width - padding, deleteButton.y + deleteButton.height - padding);
        ctx.moveTo(deleteButton.x + deleteButton.width - padding, deleteButton.y + padding);
        ctx.lineTo(deleteButton.x + padding, deleteButton.y + deleteButton.height - padding);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Berechnet die Bounds eines Bildes
     * ✅ KRITISCHER FIX: Akzeptiert optionalen Canvas-Parameter für korrekte Dimensionen
     * ✨ NEU: Für Slideshow-Bilder werden die Slideshow-Transform-Bounds zurückgegeben
     * @param {Object} imgData - Bild-Daten
     * @param {HTMLCanvasElement} canvasOverride - Optionaler Canvas für Dimensionen (z.B. ctx.canvas)
     * @param {boolean} forceImageBounds - Wenn true, werden immer die Bild-Bounds verwendet (für Rendering)
     */
    getImageBounds(imgData, canvasOverride = null, forceImageBounds = false) {
        if (!imgData || imgData.type !== 'image') return null;

        // ✅ FIX: Verwende übergebenen Canvas wenn vorhanden, sonst this.canvas
        const targetCanvas = canvasOverride || this.canvas;
        if (!targetCanvas || targetCanvas.width === 0 || targetCanvas.height === 0) {
            console.warn('[MultiImageManager] Canvas hat ungültige Dimensionen:',
                         targetCanvas?.width, 'x', targetCanvas?.height);
            return null;
        }

        // ✨ NEU: Für Slideshow-Bilder die Slideshow-Transform-Bounds verwenden (für Selection)
        if (!forceImageBounds && imgData.isSlideshowImage && window.slideshowManager) {
            const transform = window.slideshowManager.getTransform();
            return {
                x: transform.relX * targetCanvas.width,
                y: transform.relY * targetCanvas.height,
                width: transform.relWidth * targetCanvas.width,
                height: transform.relHeight * targetCanvas.height
            };
        }

        return {
            x: imgData.relX * targetCanvas.width,
            y: imgData.relY * targetCanvas.height,
            width: imgData.relWidth * targetCanvas.width,
            height: imgData.relHeight * targetCanvas.height
        };
    }
    
    /**
     * Berechnet die Skalierungs-Handles
     */
    getResizeHandles(bounds) {
        const hs = 10; // Handle size
        const { x, y, width, height } = bounds;
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        return {
            'resize-tl': { x: x - hs / 2, y: y - hs / 2, width: hs, height: hs },
            'resize-tr': { x: x + width - hs / 2, y: y - hs / 2, width: hs, height: hs },
            'resize-bl': { x: x - hs / 2, y: y + height - hs / 2, width: hs, height: hs },
            'resize-br': { x: x + width - hs / 2, y: y + height - hs / 2, width: hs, height: hs },
            'resize-t': { x: centerX - hs / 2, y: y - hs / 2, width: hs, height: hs },
            'resize-b': { x: centerX - hs / 2, y: y + height - hs / 2, width: hs, height: hs },
            'resize-l': { x: x - hs / 2, y: centerY - hs / 2, width: hs, height: hs },
            'resize-r': { x: x + width - hs / 2, y: centerY - hs / 2, width: hs, height: hs }
        };
    }
    
    /**
     * Berechnet die Position des Löschbuttons
     */
    getDeleteButtonBounds(objectBounds) {
        const size = 20;
        const offset = size / 2;
        return {
            x: objectBounds.x + objectBounds.width - offset,
            y: objectBounds.y - offset,
            width: size,
            height: size
        };
    }
    
    /**
     * Findet ein Bild an einer bestimmten Position
     */
    findImageAt(x, y) {
        // Von hinten nach vorne (oberste Ebene zuerst)
        for (let i = this.images.length - 1; i >= 0; i--) {
            const img = this.images[i];
            const bounds = this.getImageBounds(img);
            
            if (bounds && this.isPointInRect(x, y, bounds)) {
                return img;
            }
        }
        
        return null;
    }
    
    /**
     * Prüft ob ein Punkt in einem Rechteck liegt
     */
    isPointInRect(x, y, rect) {
        return x >= rect.x && 
               x <= rect.x + rect.width && 
               y >= rect.y && 
               y <= rect.y + rect.height;
    }
    
    /**
     * Findet ein Handle an einer bestimmten Position
     */
    findHandleAt(x, y) {
        if (!this.selectedImage || this.selectedImage.type !== 'image') return null;
        
        const bounds = this.getImageBounds(this.selectedImage);
        if (!bounds) return null;
        
        const handles = this.getResizeHandles(bounds);
        
        for (const key in handles) {
            if (this.isPointInRect(x, y, handles[key])) {
                return key;
            }
        }
        
        return null;
    }
    
    /**
     * Prüft ob ein Punkt auf dem Löschbutton liegt
     */
    isPointOnDeleteButton(x, y) {
        if (!this.selectedImage || this.selectedImage.type !== 'image') return false;
        
        const bounds = this.getImageBounds(this.selectedImage);
        if (!bounds) return false;
        
        const deleteButton = this.getDeleteButtonBounds(bounds);
        return this.isPointInRect(x, y, deleteButton);
    }
    
    /**
     * Wendet Filter auf den Kontext an
     */
    applyFilters(ctx, imgData) {
        if (!imgData.settings) return;
        
        const s = imgData.settings;
        let filterString = `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%)`;
        
        if (s.blur > 0) {
            filterString += ` blur(${s.blur}px)`;
        }
        
        ctx.filter = filterString;
        ctx.globalAlpha = s.opacity / 100;
    }
    
    /**
     * Aktualisiert die Filter-Einstellungen eines Bildes
     */
    updateImageFilter(imageId, filterProperty, value) {
        const image = this.images.find(img => img.id === imageId);
        if (!image || !image.settings) return false;
        
        image.settings[filterProperty] = value;
        this.redrawCallback();
        
        return true;
    }
    
    /**
     * ✅ CRITICAL FIX: Bereitet MultiImageManager für Recording vor
     * 
     * Problem: Canvas-Context cached Image-Referenzen zwischen Aufnahmen
     * Bei 3. Aufnahme: Memory-Overflow durch zu viele cached Images
     * 
     * Lösung: Force Canvas-Context reset vor jeder Aufnahme
     */
    prepareForRecording(ctx) {
        if (!ctx) return;

        console.log('[MultiImageManager] 🧹 Preparing for recording...');

        // Reset context to clean state
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowColor = 'transparent';
        ctx.restore();

        // Force garbage collection hint
        if (typeof gc !== 'undefined') {
            try {
                gc();
            } catch (e) {
                // Ignore
            }
        }

        console.log(`[MultiImageManager] ✅ Ready for recording (${this.images.length} images)`);
    }
    
    /**
     * ✅ Cleanup nach Recording
     */
    cleanupAfterRecording() {
        console.log('[MultiImageManager] 🧹 Cleanup after recording...');

        // Keine Images löschen - nur GC-Hint
        // Die Bilder bleiben für nächste Aufnahme verfügbar

        // Force garbage collection hint
        if (typeof gc !== 'undefined') {
            try {
                gc();
            } catch (e) {
                // Ignore - gc not available
            }
        }

        console.log(`[MultiImageManager] ✅ Cleanup complete`);
    }
    
    /**
     * Räumt alle Bilder auf
     */
    clear() {
        this.images = [];
        this.selectedImage = null;
        this.onImageSelected(null);
        this.redrawCallback();
        this.onImageChanged();
    }

    // ═══════════════════════════════════════════════════════════════════
    // ✨ Z-INDEX / EBENEN-STEUERUNG
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Gibt den Index eines Bildes im Array zurück
     * @returns {number} Index oder -1 wenn nicht gefunden
     */
    getImageIndex(image) {
        if (!image) return -1;
        return this.images.findIndex(img => img.id === image.id);
    }

    /**
     * Gibt die Anzahl der Bilder zurück
     */
    getImageCount() {
        return this.images.length;
    }

    /**
     * Bringt ein Bild ganz nach vorne (oberste Ebene)
     * @param {Object} image - Das Bild-Objekt
     * @returns {boolean} true wenn erfolgreich
     */
    bringToFront(image) {
        if (!image) image = this.selectedImage;
        if (!image) return false;

        const index = this.getImageIndex(image);
        if (index === -1) return false;

        // Bereits ganz vorne?
        if (index === this.images.length - 1) return false;

        // Entferne und füge am Ende hinzu
        this.images.splice(index, 1);
        this.images.push(image);

        console.log('⬆️ Bild nach ganz vorne gebracht:', image.id);
        this.redrawCallback();
        this.onImageChanged();
        return true;
    }

    /**
     * Schickt ein Bild ganz nach hinten (unterste Ebene)
     * @param {Object} image - Das Bild-Objekt
     * @returns {boolean} true wenn erfolgreich
     */
    sendToBack(image) {
        if (!image) image = this.selectedImage;
        if (!image) return false;

        const index = this.getImageIndex(image);
        if (index === -1) return false;

        // Bereits ganz hinten?
        if (index === 0) return false;

        // Entferne und füge am Anfang hinzu
        this.images.splice(index, 1);
        this.images.unshift(image);

        console.log('⬇️ Bild nach ganz hinten geschickt:', image.id);
        this.redrawCallback();
        this.onImageChanged();
        return true;
    }

    /**
     * Verschiebt ein Bild eine Ebene nach oben
     * @param {Object} image - Das Bild-Objekt
     * @returns {boolean} true wenn erfolgreich
     */
    moveUp(image) {
        if (!image) image = this.selectedImage;
        if (!image) return false;

        const index = this.getImageIndex(image);
        if (index === -1) return false;

        // Bereits ganz oben?
        if (index === this.images.length - 1) return false;

        // Tausche mit dem nächsten Bild
        [this.images[index], this.images[index + 1]] = [this.images[index + 1], this.images[index]];

        console.log('↑ Bild eine Ebene nach oben:', image.id);
        this.redrawCallback();
        this.onImageChanged();
        return true;
    }

    /**
     * Verschiebt ein Bild eine Ebene nach unten
     * @param {Object} image - Das Bild-Objekt
     * @returns {boolean} true wenn erfolgreich
     */
    moveDown(image) {
        if (!image) image = this.selectedImage;
        if (!image) return false;

        const index = this.getImageIndex(image);
        if (index === -1) return false;

        // Bereits ganz unten?
        if (index === 0) return false;

        // Tausche mit dem vorherigen Bild
        [this.images[index], this.images[index - 1]] = [this.images[index - 1], this.images[index]];

        console.log('↓ Bild eine Ebene nach unten:', image.id);
        this.redrawCallback();
        this.onImageChanged();
        return true;
    }

    /**
     * ✨ Verschiebt ein Bild von einer Position zu einer anderen (für Drag & Drop)
     * @param {number} fromIndex - Ursprünglicher Index des Bildes
     * @param {number} toIndex - Zielindex für das Bild
     * @returns {boolean} true wenn erfolgreich
     */
    reorderImage(fromIndex, toIndex) {
        // Validierung
        if (fromIndex < 0 || fromIndex >= this.images.length) return false;
        if (toIndex < 0 || toIndex >= this.images.length) return false;
        if (fromIndex === toIndex) return false;

        // Entferne das Bild von der ursprünglichen Position
        const [movedImage] = this.images.splice(fromIndex, 1);

        // Füge es an der neuen Position ein
        this.images.splice(toIndex, 0, movedImage);

        console.log('🔀 Bild neu angeordnet:', movedImage.id, `von Ebene ${fromIndex + 1} nach ${toIndex + 1}`);
        this.redrawCallback();
        this.onImageChanged();
        return true;
    }

    /**
     * ✨ NEU: Ersetzt das Bild eines bestehenden Canvas-Elements
     * Behält Position, Größe, Filter und Einstellungen bei
     * @param {number|string} imageId - ID des zu ersetzenden Bildes
     * @param {HTMLImageElement} newImageObject - Das neue Bild
     * @returns {Object|null} Das aktualisierte Bildobjekt oder null bei Fehler
     */
    replaceImage(imageId, newImageObject) {
        if (!newImageObject) {
            console.error('❌ Kein neues Bild zum Ersetzen übergeben');
            return null;
        }

        const image = this.images.find(img => img.id === imageId);
        if (!image) {
            console.error('❌ Bild mit ID nicht gefunden:', imageId);
            return null;
        }

        // Altes Bild merken für Log
        const oldWidth = image.imageObject?.naturalWidth || 0;
        const oldHeight = image.imageObject?.naturalHeight || 0;

        // Neues Bild setzen - alle anderen Eigenschaften bleiben erhalten
        image.imageObject = newImageObject;

        console.log('🔄 Bild ersetzt:', imageId,
            `Alt: ${oldWidth}x${oldHeight}`,
            `Neu: ${newImageObject.naturalWidth}x${newImageObject.naturalHeight}`);

        this.redrawCallback();
        this.onImageChanged();

        return image;
    }

    /**
     * ✨ Zeichnet eine Kontur um die sichtbare Form eines Bildes (unterstützt Transparenz)
     * Verwendet einen Outline-Effekt durch mehrfaches Zeichnen mit Offset
     * HINWEIS: Rotation wird bereits im aufrufenden Context angewendet
     * @param {Object} imgData - Das Bildobjekt mit imageObject und fotoSettings
     * @param {number} borderOpacity - Deckkraft der Kontur (0-1)
     * @param {number} borderGlow - Audio-reaktives Leuchten um die Kontur (0-50px)
     */
    _drawImageOutline(ctx, imgData, bounds, borderWidth, borderColor, borderOpacity = 1, borderGlow = 0) {
        const imageObject = imgData.imageObject;
        if (!imageObject || borderWidth <= 0) return;

        // Erstelle temporäres Canvas für die Farbmaske
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.ceil(bounds.width + borderWidth * 2);
        tempCanvas.height = Math.ceil(bounds.height + borderWidth * 2);
        const tempCtx = tempCanvas.getContext('2d');

        // Zeichne das Bild auf das temporäre Canvas (zentriert mit Platz für Kontur)
        tempCtx.drawImage(
            imageObject,
            borderWidth,
            borderWidth,
            bounds.width,
            bounds.height
        );

        // Wende Konturfarbe auf die sichtbaren Pixel an
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = borderColor;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // 8 Richtungen für gleichmäßige Kontur (N, NE, E, SE, S, SW, W, NW)
        const directions = [
            [0, -1],   // N
            [1, -1],   // NE
            [1, 0],    // E
            [1, 1],    // SE
            [0, 1],    // S
            [-1, 1],   // SW
            [-1, 0],   // W
            [-1, -1]   // NW
        ];

        // ✨ Filter zurücksetzen für saubere Kontur-Zeichnung
        ctx.filter = 'none';
        ctx.globalAlpha = borderOpacity;

        // ✨ AUDIO-REAKTIVER GLOW: Leuchteffekt um die Kontur
        if (borderGlow > 0) {
            ctx.shadowColor = borderColor;
            ctx.shadowBlur = borderGlow;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Für dickere Konturen: Mehrere Schichten zeichnen
        const steps = Math.ceil(borderWidth / 2);
        for (let step = 1; step <= steps; step++) {
            const offset = step * 2;
            for (const [dx, dy] of directions) {
                ctx.drawImage(
                    tempCanvas,
                    bounds.x - borderWidth + (dx * offset),
                    bounds.y - borderWidth + (dy * offset)
                );
            }
        }

        // ✨ Glow zurücksetzen vor dem Original-Bild
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // ✨ Filter wieder anwenden für das Original-Bild
        if (this.fotoManager && imgData.fotoSettings) {
            this.fotoManager.applyFilters(ctx, imgData);
        }

        // Original-Bild mit Filtern zeichnen (über der Kontur)
        ctx.drawImage(imageObject, bounds.x, bounds.y, bounds.width, bounds.height);

        // ✨ Filter zurücksetzen nach dem Zeichnen
        if (this.fotoManager && imgData.fotoSettings) {
            this.fotoManager.resetFilters(ctx);
        }
    }
}
