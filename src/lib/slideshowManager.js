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
        this.multiImageManager = multiImageManager;
        this.fotoManager = fotoManager;

        // Callbacks
        this.redrawCallback = callbacks.redrawCallback || (() => {});
        this.onSlideshowComplete = callbacks.onSlideshowComplete || (() => {});
        this.onImageTransition = callbacks.onImageTransition || (() => {});

        // Slideshow State
        this.isActive = false;
        this.isPaused = false;
        this.currentIndex = 0;
        this.startTime = null;
        this.pauseTime = null;
        this.pausedDuration = 0;

        // Animation Frame ID für Cleanup
        this.animationFrameId = null;

        // Aktuelle Slideshow-Konfiguration
        this.config = {
            images: [],           // Array von { imageObject, audioReactiveSettings }
            fadeInDuration: 1000, // ms
            displayDuration: 3000, // ms
            fadeOutDuration: 1000, // ms
            loop: false,          // Endlos wiederholen
            autoApplyAudioReactive: true,
            defaultAudioReactiveSettings: null // Wird auf alle Bilder angewendet
        };

        // Aktuell angezeigte Bilder auf dem Canvas (für Cleanup)
        this.activeImages = [];

        console.log('[SlideshowManager] Initialisiert');
    }

    /**
     * Setzt die Slideshow-Konfiguration
     * @param {Object} config - Konfiguration
     */
    configure(config) {
        this.config = {
            ...this.config,
            ...config
        };
        console.log('[SlideshowManager] Konfiguration aktualisiert:', this.config);
    }

    /**
     * Startet die Slideshow mit den konfigurierten Bildern
     * @param {Array} images - Array von Bild-Objekten { imageObject, name?, audioReactiveSettings? }
     * @param {Object} options - Optionen { fadeInDuration, displayDuration, fadeOutDuration, loop, audioReactiveSettings }
     */
    start(images, options = {}) {
        if (!images || images.length === 0) {
            console.warn('[SlideshowManager] Keine Bilder zum Starten');
            return false;
        }

        // Vorherige Slideshow stoppen falls aktiv
        if (this.isActive) {
            this.stop();
        }

        // Konfiguration aktualisieren
        this.configure({
            images: images,
            fadeInDuration: options.fadeInDuration ?? this.config.fadeInDuration,
            displayDuration: options.displayDuration ?? this.config.displayDuration,
            fadeOutDuration: options.fadeOutDuration ?? this.config.fadeOutDuration,
            loop: options.loop ?? this.config.loop,
            autoApplyAudioReactive: options.autoApplyAudioReactive ?? this.config.autoApplyAudioReactive,
            defaultAudioReactiveSettings: options.audioReactiveSettings ?? this.config.defaultAudioReactiveSettings
        });

        // State zurücksetzen
        this.currentIndex = 0;
        this.isActive = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.pausedDuration = 0;
        this.activeImages = [];

        console.log(`[SlideshowManager] Starte Slideshow mit ${images.length} Bildern`);
        console.log(`[SlideshowManager] Timing: fadeIn=${this.config.fadeInDuration}ms, display=${this.config.displayDuration}ms, fadeOut=${this.config.fadeOutDuration}ms`);

        // Erstes Bild hinzufügen
        this._addNextImage();

        // Animation Loop starten
        this._startAnimationLoop();

        return true;
    }

    /**
     * Pausiert die Slideshow
     */
    pause() {
        if (!this.isActive || this.isPaused) return;

        this.isPaused = true;
        this.pauseTime = Date.now();

        console.log('[SlideshowManager] Pausiert');
    }

    /**
     * Setzt die Slideshow fort
     */
    resume() {
        if (!this.isActive || !this.isPaused) return;

        this.isPaused = false;
        if (this.pauseTime) {
            this.pausedDuration += Date.now() - this.pauseTime;
            this.pauseTime = null;
        }

        console.log('[SlideshowManager] Fortgesetzt');
    }

    /**
     * Stoppt die Slideshow und entfernt alle Slideshow-Bilder
     */
    stop() {
        this.isActive = false;
        this.isPaused = false;

        // Animation Loop stoppen
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Alle Slideshow-Bilder vom Canvas entfernen
        this._cleanupAllImages();

        console.log('[SlideshowManager] Gestoppt');
    }

    /**
     * Entfernt alle von der Slideshow hinzugefügten Bilder
     */
    _cleanupAllImages() {
        for (const imageData of this.activeImages) {
            if (imageData && imageData.id) {
                this.multiImageManager.removeImage(imageData.id);
            }
        }
        this.activeImages = [];
    }

    /**
     * Fügt das nächste Bild zur Canvas hinzu
     */
    _addNextImage() {
        if (this.currentIndex >= this.config.images.length) {
            if (this.config.loop) {
                this.currentIndex = 0;
            } else {
                // Slideshow beendet
                this._onComplete();
                return null;
            }
        }

        const imageConfig = this.config.images[this.currentIndex];
        const imageObject = imageConfig.imageObject || imageConfig.img || imageConfig;

        if (!imageObject) {
            console.error('[SlideshowManager] Ungültiges Bild an Index:', this.currentIndex);
            this.currentIndex++;
            return this._addNextImage();
        }

        // Berechne Canvas-zentrierte Bounds (Vollbild oder angepasst)
        const canvas = this.multiImageManager.canvas;
        const imgAspectRatio = imageObject.height / imageObject.width;
        const canvasAspectRatio = canvas.height / canvas.width;

        let relWidth, relHeight;
        if (imgAspectRatio > canvasAspectRatio) {
            // Bild ist höher - an Höhe anpassen
            relHeight = 0.8;
            relWidth = relHeight * canvasAspectRatio / imgAspectRatio;
        } else {
            // Bild ist breiter - an Breite anpassen
            relWidth = 0.8;
            relHeight = relWidth * imgAspectRatio / canvasAspectRatio;
        }

        const bounds = {
            relX: (1 - relWidth) / 2,
            relY: (1 - relHeight) / 2,
            relWidth: relWidth,
            relHeight: relHeight
        };

        // Bild mit Slideshow-Animation hinzufügen
        const newImage = this.multiImageManager.addImageWithBounds(
            imageObject,
            bounds,
            'none', // Keine Standard-Animation, wir nutzen slideshow
            { duration: 0 }
        );

        if (!newImage) {
            console.error('[SlideshowManager] Konnte Bild nicht hinzufügen');
            this.currentIndex++;
            return this._addNextImage();
        }

        // Slideshow-spezifische Eigenschaften setzen
        const now = Date.now();
        newImage.slideshow = {
            active: true,
            imageIndex: this.currentIndex,
            addedAt: now,
            fadeInDuration: this.config.fadeInDuration,
            displayDuration: this.config.displayDuration,
            fadeOutDuration: this.config.fadeOutDuration,
            phase: 'fadeIn', // 'fadeIn' | 'display' | 'fadeOut' | 'done'
            opacity: 0
        };

        // Audio-Reaktive Einstellungen anwenden
        if (this.config.autoApplyAudioReactive) {
            this._applyAudioReactiveSettings(newImage, imageConfig);
        }

        // Zur aktiven Liste hinzufügen
        this.activeImages.push(newImage);

        console.log(`[SlideshowManager] Bild ${this.currentIndex + 1}/${this.config.images.length} hinzugefügt`);
        this.onImageTransition(this.currentIndex, this.config.images.length, 'fadeIn');

        this.currentIndex++;
        return newImage;
    }

    /**
     * Wendet Audio-Reaktive Einstellungen auf ein Bild an
     */
    _applyAudioReactiveSettings(imageData, imageConfig) {
        // Prüfe ob das Bild bereits Audio-Reaktive Einstellungen hat
        const hasExistingSettings = imageConfig.audioReactiveSettings;
        const defaultSettings = this.config.defaultAudioReactiveSettings;

        let settingsToApply = null;

        if (hasExistingSettings) {
            settingsToApply = imageConfig.audioReactiveSettings;
        } else if (defaultSettings) {
            settingsToApply = defaultSettings;
        }

        if (settingsToApply && this.fotoManager) {
            // Stelle sicher dass fotoSettings initialisiert ist
            this.fotoManager.initializeImageSettings(imageData);

            // Kopiere Audio-Reaktive Einstellungen
            imageData.fotoSettings.audioReactive = JSON.parse(JSON.stringify(settingsToApply));

            console.log(`[SlideshowManager] Audio-Reaktive Einstellungen auf Bild ${imageData.slideshow.imageIndex + 1} angewendet`);
        }
    }

    /**
     * Hauptanimations-Loop
     */
    _startAnimationLoop() {
        const animate = () => {
            if (!this.isActive) return;

            if (!this.isPaused) {
                this._updateSlideshowState();
            }

            this.redrawCallback();
            this.animationFrameId = requestAnimationFrame(animate);
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    /**
     * Aktualisiert den Slideshow-Status aller aktiven Bilder
     */
    _updateSlideshowState() {
        const now = Date.now();
        const imagesToRemove = [];
        let needsNextImage = false;

        for (const imageData of this.activeImages) {
            if (!imageData.slideshow || !imageData.slideshow.active) continue;

            const ss = imageData.slideshow;
            const elapsed = now - ss.addedAt - this.pausedDuration;

            const fadeInEnd = ss.fadeInDuration;
            const displayEnd = fadeInEnd + ss.displayDuration;
            const fadeOutEnd = displayEnd + ss.fadeOutDuration;

            if (elapsed < fadeInEnd) {
                // FadeIn Phase
                ss.phase = 'fadeIn';
                ss.opacity = elapsed / ss.fadeInDuration;
            } else if (elapsed < displayEnd) {
                // Display Phase
                if (ss.phase === 'fadeIn') {
                    ss.phase = 'display';
                    this.onImageTransition(ss.imageIndex, this.config.images.length, 'display');
                }
                ss.opacity = 1;

                // Prüfe ob nächstes Bild gestartet werden soll
                // Starte nächstes Bild wenn aktuelles in Display-Phase ist und overlap gewünscht
                // Für einfacheren Flow: starte nächstes wenn dieses in fadeOut geht
            } else if (elapsed < fadeOutEnd) {
                // FadeOut Phase
                if (ss.phase === 'display') {
                    ss.phase = 'fadeOut';
                    this.onImageTransition(ss.imageIndex, this.config.images.length, 'fadeOut');
                    // Nächstes Bild hinzufügen wenn fadeOut beginnt
                    needsNextImage = true;
                }
                ss.opacity = 1 - ((elapsed - displayEnd) / ss.fadeOutDuration);
            } else {
                // Animation fertig
                ss.phase = 'done';
                ss.opacity = 0;
                ss.active = false;
                imagesToRemove.push(imageData);
            }
        }

        // Fertige Bilder entfernen
        for (const imageData of imagesToRemove) {
            this.multiImageManager.removeImage(imageData.id);
            const idx = this.activeImages.indexOf(imageData);
            if (idx !== -1) {
                this.activeImages.splice(idx, 1);
            }
        }

        // Nächstes Bild hinzufügen wenn nötig
        if (needsNextImage && this.isActive) {
            this._addNextImage();
        }
    }

    /**
     * Wird aufgerufen wenn die Slideshow komplett durchgelaufen ist
     */
    _onComplete() {
        // Warte bis letztes Bild ausgeblendet ist
        const checkComplete = () => {
            if (this.activeImages.length === 0) {
                this.isActive = false;
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
                console.log('[SlideshowManager] Slideshow beendet');
                this.onSlideshowComplete();
            } else if (this.isActive) {
                // Noch Bilder aktiv, weiter warten
                setTimeout(checkComplete, 100);
            }
        };

        checkComplete();
    }

    /**
     * Berechnet die aktuelle Opacity für ein Slideshow-Bild
     * Wird von MultiImageManager.drawImages() verwendet
     */
    static getSlideshowOpacity(imageData) {
        if (!imageData.slideshow || !imageData.slideshow.active) {
            return 1; // Kein Slideshow-Bild, normale Opacity
        }
        return Math.max(0, Math.min(1, imageData.slideshow.opacity));
    }

    /**
     * Prüft ob ein Bild ein aktives Slideshow-Bild ist
     */
    static isSlideshowImage(imageData) {
        return imageData.slideshow && imageData.slideshow.active;
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
            config: { ...this.config, images: undefined } // Ohne Bild-Daten
        };
    }
}
