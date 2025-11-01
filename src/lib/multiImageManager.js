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
        
        // Bringe das ausgewählte Bild nach vorne (ans Ende des Arrays)
        if (image && image.type === 'image') {
            const index = this.images.findIndex(img => img.id === image.id);
            if (index !== -1 && index !== this.images.length - 1) {
                this.images.splice(index, 1);
                this.images.push(image);
            }
        }
        
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
     * Zeichnet alle Bilder auf den Canvas
     * ✅ OPTIMIERT: Reduziert Canvas-Context Overhead für Recording
     * ✨ ERWEITERT: Unterstützt jetzt Filter, Schatten und Rotation vom FotoManager
     */
    drawImages(ctx) {
        if (!ctx || this.images.length === 0) return;
        
        // ✅ OPTIMIZATION: Batch-Rendering mit weniger save/restore calls
        this.images.forEach(imgData => {
            const bounds = this.getImageBounds(imgData);
            if (!bounds) return;
            
            // ✅ FIX: Minimale save/restore - nur wenn Filter/Rotation verwendet werden
            const needsContext = (imgData.fotoSettings && 
                (imgData.fotoSettings.rotation !== 0 || 
                 imgData.fotoSettings.opacity !== 100 ||
                 imgData.fotoSettings.shadowBlur > 0));
            
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
            
            // ✅ CRITICAL: Direkt zeichnen ohne zusätzliche Kopien
            try {
                ctx.drawImage(
                    imgData.imageObject, 
                    bounds.x, 
                    bounds.y, 
                    bounds.width, 
                    bounds.height
                );
            } catch (e) {
                console.warn('[MultiImageManager] Image render error:', e);
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

        // ✅ CRITICAL: Aggressive Canvas-Context reset
        // Löscht alle gecachten Image-Referenzen und Canvas-States
        ctx.save();

        // Reset ALL context properties to defaults
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        ctx.globalAlpha = 1.0; // Reset opacity
        ctx.globalCompositeOperation = 'source-over'; // Reset blend mode
        ctx.filter = 'none'; // Reset filters
        ctx.shadowBlur = 0; // Reset shadows
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowColor = 'transparent';

        // Clear canvas completely
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // ✅ NEW: Fill with black to ensure clean state
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.restore();

        // Force garbage collection hint
        if (typeof gc !== 'undefined') {
            try {
                gc(); // Only works with --expose-gc flag
            } catch (e) {
                // Ignore - gc not available
            }
        }

        console.log(`[MultiImageManager] ✅ Ready for recording (${this.images.length} images)`);
    }
    
    /**
     * ✅ CRITICAL FIX: Cleanup nach Recording
     *
     * Problem: HTMLImageElement werden vom Browser decoded und gecacht
     * Nach 2 Aufnahmen (2 × 450 Frames × N Bilder = 900+ drawImage-Calls pro Bild)
     * ist der Browser-Speicher für decoded Bitmaps erschöpft
     *
     * Lösung: Force Browser, Image-Decode-Cache freizugeben durch src-Reset
     */
    cleanupAfterRecording() {
        console.log('[MultiImageManager] 🧹 Cleanup after recording...');

        // ✅ CRITICAL: Force Browser, decoded Image-Bitmaps freizugeben
        // Trick: Setze src temporär auf leeren String, dann wieder zurück
        // Dies zwingt Browser, den internen Decode-Cache zu leeren
        this.images.forEach(imgData => {
            if (imgData.imageObject && imgData.imageObject.src) {
                const originalSrc = imgData.imageObject.src;

                // Temporär src entfernen (gibt decoded Bitmap frei)
                imgData.imageObject.src = '';

                // Sofort wieder setzen (re-decode erfolgt on-demand beim nächsten draw)
                // Da die Data-URL/Blob-URL noch im Speicher ist, ist das schnell
                imgData.imageObject.src = originalSrc;

                console.log(`[MultiImageManager] 🔄 Image ${imgData.id} Cache geleert`);
            }
        });

        // Force garbage collection hint
        // Dies hilft dem Browser, gecachte decoded Image-Bitmaps freizugeben
        if (typeof gc !== 'undefined') {
            try {
                gc(); // Only works with --expose-gc flag
            } catch (e) {
                // Ignore - gc not available
            }
        }

        console.log(`[MultiImageManager] ✅ Cleanup complete (${this.images.length} images cache cleared)`);
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
}
