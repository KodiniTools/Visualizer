/**
 * MultiImageManager - Verwaltet mehrere Bilder auf dem Canvas
 * Arbeitet eng mit CanvasManager zusammen
 */
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
    
    /**
     * ✨ Berechnet Audio-Reaktive Effekt-Werte basierend auf den aktuellen Audio-Daten
     */
    getAudioReactiveValues(audioSettings) {
        if (!audioSettings || !audioSettings.enabled) {
            return null;
        }

        const audioData = window.audioAnalysisData;
        if (!audioData) return null;

        // Audio-Level basierend auf gewählter Quelle holen
        const source = audioSettings.source || 'bass';
        const smoothing = audioSettings.smoothing || 50;
        let audioLevel = 0;

        // Wähle zwischen geglätteten und rohen Werten basierend auf Smoothing
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
        }

        // Normalisiere auf 0-1 und wende Intensität an
        const intensity = (audioSettings.intensity || 80) / 100;
        const normalizedLevel = (audioLevel / 255) * intensity;

        // Berechne effektspezifische Werte
        const effect = audioSettings.effect || 'hue';
        const result = { effect, level: normalizedLevel };

        switch (effect) {
            case 'hue':
                // Hue-Rotation: 0-360 Grad basierend auf Audio-Level
                result.hueRotate = normalizedLevel * 360;
                break;
            case 'brightness':
                // Helligkeit: 80-150% basierend auf Audio-Level
                result.brightness = 80 + (normalizedLevel * 70);
                break;
            case 'saturation':
                // Sättigung: 50-200% basierend auf Audio-Level
                result.saturation = 50 + (normalizedLevel * 150);
                break;
            case 'scale':
                // Skalierung: 1.0-1.3 basierend auf Audio-Level
                result.scale = 1.0 + (normalizedLevel * 0.3);
                break;
            case 'glow':
                // Glow/Shadow: 0-30px basierend auf Audio-Level
                result.glowBlur = normalizedLevel * 30;
                result.glowColor = `rgba(139, 92, 246, ${0.3 + normalizedLevel * 0.7})`;
                break;
        }

        return result;
    }

    /**
     * Zeichnet alle Bilder auf den Canvas
     * ✅ OPTIMIERT: Reduziert Canvas-Context Overhead für Recording
     * ✨ ERWEITERT: Unterstützt jetzt Filter, Schatten und Rotation vom FotoManager
     * ✨ NEU: Audio-Reaktive Effekte
     */
    drawImages(ctx) {
        if (!ctx || this.images.length === 0) return;

        // ✅ OPTIMIZATION: Batch-Rendering mit weniger save/restore calls
        this.images.forEach(imgData => {
            const bounds = this.getImageBounds(imgData);
            if (!bounds) return;

            // ✨ Audio-Reaktive Werte berechnen
            const audioReactive = this.getAudioReactiveValues(imgData.fotoSettings?.audioReactive);

            // ✅ FIX: Minimale save/restore - nur wenn Filter/Rotation/Flip/Kontur/AudioReaktiv verwendet werden
            const needsContext = (imgData.fotoSettings &&
                (imgData.fotoSettings.rotation !== 0 ||
                 imgData.fotoSettings.flipH ||
                 imgData.fotoSettings.flipV ||
                 imgData.fotoSettings.opacity !== 100 ||
                 imgData.fotoSettings.shadowBlur > 0 ||
                 imgData.fotoSettings.borderWidth > 0 ||
                 audioReactive !== null));
            
            if (needsContext) {
                ctx.save();
            }
            
            // ✨ Nutze FotoManager für Filter + Schatten (wenn verfügbar)
            if (this.fotoManager && imgData.fotoSettings) {
                this.fotoManager.applyFilters(ctx, imgData);
            } else if (imgData.settings) {
                // Fallback: Alte Filter-Methode
                this.applyFilters(ctx, imgData);
            }

            // ✨ AUDIO-REAKTIV: Zusätzliche Filter basierend auf Audio
            if (audioReactive) {
                // Hole aktuelle Filter-String
                let currentFilter = ctx.filter || 'none';
                if (currentFilter === 'none') currentFilter = '';

                switch (audioReactive.effect) {
                    case 'hue':
                        // Hue-Rotation hinzufügen
                        currentFilter += ` hue-rotate(${audioReactive.hueRotate}deg)`;
                        break;
                    case 'brightness':
                        // Helligkeit hinzufügen
                        currentFilter += ` brightness(${audioReactive.brightness}%)`;
                        break;
                    case 'saturation':
                        // Sättigung hinzufügen
                        currentFilter += ` saturate(${audioReactive.saturation}%)`;
                        break;
                    case 'glow':
                        // Glow als Shadow-Effekt
                        ctx.shadowColor = audioReactive.glowColor;
                        ctx.shadowBlur = audioReactive.glowBlur;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                        break;
                }

                if (currentFilter.trim()) {
                    ctx.filter = currentFilter.trim();
                }
            }

            // ✨ ROTATION anwenden (wenn vorhanden)
            const rotation = imgData.fotoSettings?.rotation || 0;
            if (rotation !== 0) {
                // Berechne Zentrum des Bildes
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;

                // Verschiebe zum Zentrum, rotiere, verschiebe zurück
                ctx.translate(centerX, centerY);
                ctx.rotate((rotation * Math.PI) / 180);
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

            // ✨ AUDIO-REAKTIV: Scale-Effekt (pulsieren)
            let drawBounds = bounds;
            if (audioReactive && audioReactive.effect === 'scale') {
                const scale = audioReactive.scale;
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;
                const newWidth = bounds.width * scale;
                const newHeight = bounds.height * scale;
                drawBounds = {
                    x: centerX - newWidth / 2,
                    y: centerY - newHeight / 2,
                    width: newWidth,
                    height: newHeight
                };
            }

            // ✨ BILDKONTUR: Prüfen ob Kontur gezeichnet werden soll
            const borderWidth = imgData.fotoSettings?.borderWidth || 0;

            if (borderWidth > 0) {
                // Mit Kontur: _drawImageOutline zeichnet sowohl Kontur als auch Bild
                const borderColor = imgData.fotoSettings?.borderColor || '#ffffff';
                const borderOpacity = (imgData.fotoSettings?.borderOpacity ?? 100) / 100;

                // Zeichne Kontur um die sichtbare Form des Bildes (inklusive Bild darüber)
                // Filter werden in _drawImageOutline auf das Originalbild angewendet
                this._drawImageOutline(ctx, imgData, drawBounds, borderWidth, borderColor, borderOpacity);
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

            // ✨ Filter + Schatten zurücksetzen (wenn FotoManager verwendet wurde)
            if (this.fotoManager && imgData.fotoSettings) {
                this.fotoManager.resetFilters(ctx);
            } else if (imgData.settings) {
                // Reset filters
                ctx.filter = 'none';
                ctx.globalAlpha = 1.0;
            }
            
            if (needsContext) {
                ctx.restore();
            }
        });
    }
    
    /**
     * Zeichnet interaktive Elemente (Rahmen, Handles, Löschbutton)
     */
    drawInteractiveElements(ctx) {
        if (!this.selectedImage || this.selectedImage.type !== 'image') return;
        
        const bounds = this.getImageBounds(this.selectedImage);
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
     */
    getImageBounds(imgData) {
        if (!imgData || imgData.type !== 'image') return null;
        
        return {
            x: imgData.relX * this.canvas.width,
            y: imgData.relY * this.canvas.height,
            width: imgData.relWidth * this.canvas.width,
            height: imgData.relHeight * this.canvas.height
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
     * ✨ Zeichnet eine Kontur um die sichtbare Form eines Bildes (unterstützt Transparenz)
     * Verwendet einen Outline-Effekt durch mehrfaches Zeichnen mit Offset
     * HINWEIS: Rotation wird bereits im aufrufenden Context angewendet
     * @param {Object} imgData - Das Bildobjekt mit imageObject und fotoSettings
     * @param {number} borderOpacity - Deckkraft der Kontur (0-1)
     */
    _drawImageOutline(ctx, imgData, bounds, borderWidth, borderColor, borderOpacity = 1) {
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
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

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
