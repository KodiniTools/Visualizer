/**
 * VideoManager - Verwaltet MP4-Videos auf dem Canvas
 * Arbeitet parallel zum MultiImageManager und nutzt FotoManager für Filter
 *
 * Videos werden als HTMLVideoElement gehalten und Frame-by-Frame auf Canvas gezeichnet
 */
export class VideoManager {
    constructor(canvas, callbacks = {}) {
        this.canvas = canvas;
        this.videos = [];
        this.selectedVideo = null;

        // Callbacks
        this.redrawCallback = callbacks.redrawCallback || (() => {});
        this.onVideoSelected = callbacks.onVideoSelected || (() => {});
        this.onVideoChanged = callbacks.onVideoChanged || (() => {});

        // FotoManager Referenz (für Filter)
        this.fotoManager = callbacks.fotoManager || null;

        // Audio-Synchronisation
        this.audioElement = callbacks.audioElement || null;
        this.syncWithAudio = false;

        // Playback-Status
        this.isPlaying = false;
        this.globalPlaybackRate = 1.0;

        console.log('✅ VideoManager initialisiert');
    }

    /**
     * ✅ KRITISCHER FIX: Aktualisiert die Canvas-Referenz
     * Wird aufgerufen, wenn das DOM-Canvas sich vom gespeicherten Canvas unterscheidet
     * (z.B. nach einem direkten Page-Refresh)
     */
    updateCanvas(newCanvas) {
        if (newCanvas && newCanvas !== this.canvas) {
            console.log('[VideoManager] Canvas-Referenz aktualisiert');
            this.canvas = newCanvas;
            return true;
        }
        return false;
    }

    /**
     * Setzt das Audio-Element für Synchronisation
     */
    setAudioElement(audioElement) {
        this.audioElement = audioElement;
    }

    /**
     * Aktiviert/Deaktiviert Audio-Synchronisation
     */
    setSyncWithAudio(sync) {
        this.syncWithAudio = sync;
        if (sync && this.audioElement) {
            this.syncAllVideosToAudio();
        }
    }

    /**
     * Synchronisiert alle Videos mit dem Audio
     */
    syncAllVideosToAudio() {
        if (!this.audioElement) return;

        const audioTime = this.audioElement.currentTime;
        this.videos.forEach(videoData => {
            if (videoData.videoElement && !videoData.videoElement.paused) {
                const videoDuration = videoData.videoElement.duration;
                if (videoDuration && isFinite(videoDuration)) {
                    // Video loopen wenn kürzer als Audio
                    const videoTime = audioTime % videoDuration;
                    if (Math.abs(videoData.videoElement.currentTime - videoTime) > 0.1) {
                        videoData.videoElement.currentTime = videoTime;
                    }
                }
            }
        });
    }

    /**
     * Initialisiert Filter-Einstellungen für ein Video (kompatibel mit FotoManager)
     */
    initializeVideoSettings(videoData) {
        if (!videoData.fotoSettings) {
            videoData.fotoSettings = {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                opacity: 100,
                blur: 0,
                hueRotate: 0,
                grayscale: 0,
                sepia: 0,
                invert: 0,
                shadowColor: '#000000',
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                rotation: 0,
                flipH: false,
                flipV: false,
                borderWidth: 0,
                borderColor: '#ffffff',
                borderOpacity: 100,
                audioReactive: {
                    enabled: false,
                    effects: {
                        hue: { enabled: false, intensity: 80 },
                        brightness: { enabled: false, intensity: 80 },
                        saturation: { enabled: false, intensity: 80 },
                        scale: { enabled: false, intensity: 80 },
                        glow: { enabled: false, intensity: 80 },
                        border: { enabled: false, intensity: 80 },
                        blur: { enabled: false, intensity: 50 },
                        rotation: { enabled: false, intensity: 50 },
                        shake: { enabled: false, intensity: 50 },
                        bounce: { enabled: false, intensity: 50 },
                        swing: { enabled: false, intensity: 50 },
                        orbit: { enabled: false, intensity: 50 }
                    },
                    source: 'bass',
                    smoothing: 50
                }
            };
        }

        if (!videoData.settings) {
            videoData.settings = {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                opacity: 100,
                blur: 0,
                preset: null
            };
        }

        return videoData;
    }

    /**
     * Fügt ein neues Video zum Canvas hinzu
     * @param {HTMLVideoElement} videoElement - Das Video-Element
     * @param {Object} options - Optionale Einstellungen (bounds, loop, muted, etc.)
     */
    addVideo(videoElement, options = {}) {
        if (!videoElement) {
            console.error('❌ Kein Video zum Hinzufügen übergeben');
            return null;
        }

        // Sicherstellen, dass Video-Metadaten geladen sind
        if (videoElement.readyState < 1) {
            console.warn('⚠️ Video-Metadaten noch nicht geladen, warte...');
            return new Promise((resolve) => {
                videoElement.addEventListener('loadedmetadata', () => {
                    resolve(this._createVideoObject(videoElement, options));
                }, { once: true });
            });
        }

        return this._createVideoObject(videoElement, options);
    }

    /**
     * Erstellt das Video-Objekt und fügt es zur Liste hinzu
     */
    _createVideoObject(videoElement, options = {}) {
        const videoWidth = videoElement.videoWidth || 640;
        const videoHeight = videoElement.videoHeight || 360;

        // Berechne initiale Größe (1/3 der Canvas-Breite, wie bei Bildern)
        const initialRelWidth = options.relWidth || 1 / 3;
        const videoAspectRatio = videoHeight / videoWidth;
        const canvasAspectRatio = this.canvas.height / this.canvas.width;
        const initialRelHeight = options.relHeight || (initialRelWidth * videoAspectRatio / canvasAspectRatio);

        // Position (zentriert oder aus Options)
        const relX = options.relX !== undefined ? options.relX : (1 - initialRelWidth) / 2;
        const relY = options.relY !== undefined ? options.relY : (1 - initialRelHeight) / 2;

        const newVideo = {
            id: Date.now() + Math.random(),
            type: 'video',
            videoElement: videoElement,
            relX: relX,
            relY: relY,
            relWidth: initialRelWidth,
            relHeight: initialRelHeight,
            // Video-spezifische Eigenschaften
            duration: videoElement.duration || 0,
            loop: options.loop !== undefined ? options.loop : true,
            muted: options.muted !== undefined ? options.muted : true, // Standard: Stumm
            playbackRate: options.playbackRate || 1.0,
            startTime: options.startTime || 0,
            endTime: options.endTime || videoElement.duration || 0,
            isPlaying: false,
            // Für Canvas-Bild-Kompatibilität
            imageObject: null, // Wird für Thumbnail verwendet
            // Filter-Einstellungen
            settings: {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                opacity: 100,
                blur: 0,
                preset: null
            },
            // Animation (wie bei Bildern)
            animation: {
                type: options.animation || 'none',
                active: options.animation && options.animation !== 'none',
                startTime: Date.now(),
                duration: options.animationDuration || 500,
                progress: 0
            }
        };

        // FotoSettings initialisieren
        this.initializeVideoSettings(newVideo);

        // Video-Einstellungen anwenden
        videoElement.loop = newVideo.loop;
        videoElement.muted = newVideo.muted;
        videoElement.playbackRate = newVideo.playbackRate;

        // CORS für Canvas-Rendering
        videoElement.crossOrigin = 'anonymous';

        this.videos.push(newVideo);
        this.setSelectedVideo(newVideo);

        console.log('✅ Video hinzugefügt:', newVideo.id,
            `${videoWidth}x${videoHeight}`,
            `Dauer: ${newVideo.duration.toFixed(1)}s`,
            'Anzahl Videos:', this.videos.length);

        this.redrawCallback();
        this.onVideoChanged();

        // Animation starten wenn nötig
        if (newVideo.animation.active) {
            this._startAnimation(newVideo);
        }

        return newVideo;
    }

    /**
     * Fügt ein Video mit benutzerdefinierten Bounds hinzu
     */
    addVideoWithBounds(videoElement, bounds, animation = 'none', options = {}) {
        const fullOptions = {
            ...options,
            relX: bounds.relX,
            relY: bounds.relY,
            relWidth: bounds.relWidth,
            relHeight: bounds.relHeight,
            animation: animation,
            animationDuration: options.duration || 500
        };

        return this.addVideo(videoElement, fullOptions);
    }

    /**
     * Startet die Eintritts-Animation für ein Video
     */
    _startAnimation(videoData) {
        if (!videoData.animation || !videoData.animation.active) return;

        const animate = () => {
            if (!videoData.animation || !videoData.animation.active) return;

            const elapsed = Date.now() - videoData.animation.startTime;
            const duration = videoData.animation.duration;
            const progress = Math.min(elapsed / duration, 1);
            videoData.animation.progress = progress;

            this.redrawCallback();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                videoData.animation.active = false;
                console.log('✅ Video-Animation beendet:', videoData.id);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Berechnet die Animations-Transformation
     */
    getAnimationTransform(videoData) {
        if (!videoData.animation || !videoData.animation.active) {
            return { opacity: 1, translateX: 0, translateY: 0, scale: 1, rotation: 0 };
        }

        const progress = videoData.animation.progress;
        const eased = this._easeOutCubic(progress);
        const type = videoData.animation.type;

        switch (type) {
            case 'fade':
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

    _easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    _easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }

    _easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }

    /**
     * Entfernt ein Video vom Canvas
     */
    removeVideo(videoId) {
        const index = this.videos.findIndex(v => v.id === videoId);
        if (index === -1) return false;

        const video = this.videos[index];

        // Video-Element stoppen und aufräumen
        if (video.videoElement) {
            video.videoElement.pause();
            video.videoElement.src = '';
            video.videoElement.load();
        }

        this.videos.splice(index, 1);

        if (this.selectedVideo && this.selectedVideo.id === videoId) {
            this.selectedVideo = null;
            this.onVideoSelected(null);
        }

        console.log('🗑️ Video entfernt:', videoId, 'Verbleibende Videos:', this.videos.length);

        this.redrawCallback();
        this.onVideoChanged();

        return true;
    }

    /**
     * Setzt das aktuell ausgewählte Video
     */
    setSelectedVideo(video) {
        if (this.selectedVideo && video && this.selectedVideo.id === video.id) {
            return;
        }

        this.selectedVideo = video;
        this.onVideoSelected(video);
        this.redrawCallback();
    }

    /**
     * Gibt das ausgewählte Video zurück
     */
    getSelectedVideo() {
        return this.selectedVideo;
    }

    /**
     * Gibt alle Videos zurück
     */
    getAllVideos() {
        return this.videos;
    }

    /**
     * Startet die Wiedergabe eines Videos
     */
    playVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video || !video.videoElement) return false;

        video.videoElement.play().then(() => {
            video.isPlaying = true;
            console.log('▶️ Video gestartet:', videoId);
        }).catch(err => {
            console.error('❌ Video-Wiedergabe fehlgeschlagen:', err);
        });

        return true;
    }

    /**
     * Pausiert ein Video
     */
    pauseVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video || !video.videoElement) return false;

        video.videoElement.pause();
        video.isPlaying = false;
        console.log('⏸️ Video pausiert:', videoId);

        return true;
    }

    /**
     * Startet alle Videos
     */
    playAll() {
        this.videos.forEach(video => {
            if (video.videoElement) {
                video.videoElement.play().catch(() => {});
                video.isPlaying = true;
            }
        });
        this.isPlaying = true;
    }

    /**
     * Pausiert alle Videos
     */
    pauseAll() {
        this.videos.forEach(video => {
            if (video.videoElement) {
                video.videoElement.pause();
                video.isPlaying = false;
            }
        });
        this.isPlaying = false;
    }

    /**
     * Setzt alle Videos auf eine bestimmte Zeit
     */
    seekAll(time) {
        this.videos.forEach(video => {
            if (video.videoElement) {
                const duration = video.videoElement.duration;
                if (duration && isFinite(duration)) {
                    video.videoElement.currentTime = video.loop ? (time % duration) : Math.min(time, duration);
                }
            }
        });
    }

    /**
     * Berechnet die Bounds eines Videos
     */
    getVideoBounds(videoData) {
        if (!videoData || videoData.type !== 'video') return null;

        return {
            x: videoData.relX * this.canvas.width,
            y: videoData.relY * this.canvas.height,
            width: videoData.relWidth * this.canvas.width,
            height: videoData.relHeight * this.canvas.height
        };
    }

    /**
     * Zeichnet alle Videos auf den Canvas
     */
    drawVideos(ctx) {
        if (!ctx || this.videos.length === 0) return;

        // Audio-Synchronisation wenn aktiviert
        if (this.syncWithAudio && this.audioElement && !this.audioElement.paused) {
            this.syncAllVideosToAudio();
        }

        this.videos.forEach(videoData => {
            this._drawSingleVideo(ctx, videoData);
        });
    }

    /**
     * Zeichnet ein einzelnes Video
     */
    _drawSingleVideo(ctx, videoData) {
        if (!videoData.videoElement) return;

        const video = videoData.videoElement;

        // Prüfe ob Video bereit ist zum Zeichnen
        if (video.readyState < 2) return; // HAVE_CURRENT_DATA oder höher

        const bounds = this.getVideoBounds(videoData);
        if (!bounds) return;

        // Animation-Transform berechnen
        const animTransform = this.getAnimationTransform(videoData);

        ctx.save();

        // Animation: Opacity
        if (animTransform.opacity < 1) {
            ctx.globalAlpha = animTransform.opacity;
        }

        // Filter anwenden (via FotoManager wenn verfügbar)
        if (this.fotoManager && videoData.fotoSettings) {
            this.fotoManager.applyFilters(ctx, videoData);
        } else if (videoData.settings) {
            this._applyBasicFilters(ctx, videoData);
        }

        // Audio-Reaktive Effekte (identisch zu MultiImageManager)
        const audioReactive = this._getAudioReactiveValues(videoData.fotoSettings?.audioReactive);
        if (audioReactive && audioReactive.hasEffects) {
            this._applyAudioReactiveFilters(ctx, audioReactive);
        }

        // Rotation anwenden
        let totalRotation = videoData.fotoSettings?.rotation || 0;
        if (audioReactive?.hasEffects && audioReactive.effects.rotation) {
            totalRotation += audioReactive.effects.rotation.rotation;
        }

        if (totalRotation !== 0) {
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((totalRotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
        }

        // Flip anwenden
        const flipH = videoData.fotoSettings?.flipH || false;
        const flipV = videoData.fotoSettings?.flipV || false;
        if (flipH || flipV) {
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            ctx.translate(centerX, centerY);
            ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
            ctx.translate(-centerX, -centerY);
        }

        // Draw-Bounds für Position (inkl. Animation)
        let drawBounds = { ...bounds };

        // Animation: Translate
        if (animTransform.translateX !== 0 || animTransform.translateY !== 0) {
            drawBounds.x += animTransform.translateX;
            drawBounds.y += animTransform.translateY;
        }

        // Animation: Scale
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

        // Audio-reaktive Bewegungseffekte
        if (audioReactive?.hasEffects) {
            if (audioReactive.effects.shake) {
                drawBounds.x += audioReactive.effects.shake.shakeX || 0;
                drawBounds.y += audioReactive.effects.shake.shakeY || 0;
            }
            if (audioReactive.effects.bounce) {
                drawBounds.y += audioReactive.effects.bounce.bounceY || 0;
            }
            if (audioReactive.effects.swing) {
                drawBounds.x += audioReactive.effects.swing.swingX || 0;
            }
            if (audioReactive.effects.orbit) {
                drawBounds.x += audioReactive.effects.orbit.orbitX || 0;
                drawBounds.y += audioReactive.effects.orbit.orbitY || 0;
            }
            if (audioReactive.effects.scale) {
                const scaleFactor = audioReactive.effects.scale.scale || 1.0;
                const centerX = drawBounds.x + drawBounds.width / 2;
                const centerY = drawBounds.y + drawBounds.height / 2;
                const newWidth = drawBounds.width * scaleFactor;
                const newHeight = drawBounds.height * scaleFactor;
                drawBounds.x = centerX - newWidth / 2;
                drawBounds.y = centerY - newHeight / 2;
                drawBounds.width = newWidth;
                drawBounds.height = newHeight;
            }
        }

        // Video auf Canvas zeichnen
        try {
            ctx.drawImage(
                video,
                drawBounds.x,
                drawBounds.y,
                drawBounds.width,
                drawBounds.height
            );
        } catch (e) {
            console.warn('[VideoManager] Video render error:', e);
        }

        ctx.restore();
    }

    /**
     * Wendet einfache Filter an (Fallback ohne FotoManager)
     */
    _applyBasicFilters(ctx, videoData) {
        if (!videoData.settings) return;

        const s = videoData.settings;
        let filterString = `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%)`;

        if (s.blur > 0) {
            filterString += ` blur(${s.blur}px)`;
        }

        ctx.filter = filterString;
        ctx.globalAlpha = s.opacity / 100;
    }

    /**
     * Berechnet Audio-Reaktive Werte (kompatibel mit MultiImageManager)
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
                let rawLevel = (bass * bass / totalEnergy) + (mid * mid / totalEnergy) + (treble * treble / totalEnergy);
                const normalized = rawLevel / 255;
                audioLevel = Math.pow(normalized, 0.7) * 255 * 0.85;
                break;
        }

        const baseLevel = audioLevel / 255;
        const result = { hasEffects: false, effects: {} };

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
     * Berechnet einzelne Effekt-Werte
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
                return { glowBlur: normalizedLevel * 50, glowColor: `rgba(139, 92, 246, ${0.5 + normalizedLevel * 0.5})` };
            case 'border':
                return { borderWidth: normalizedLevel * 20, borderOpacity: 0.5 + (normalizedLevel * 0.5), borderGlow: normalizedLevel * 30 };
            case 'blur':
                return { blur: normalizedLevel * 10 };
            case 'rotation':
                const timeRot = Date.now() * 0.005;
                return { rotation: Math.sin(timeRot) * normalizedLevel * 15 };
            case 'shake':
                if (normalizedLevel > 0.2) {
                    const shakeIntensity = normalizedLevel * 15;
                    return { shakeX: (Math.random() - 0.5) * 2 * shakeIntensity, shakeY: (Math.random() - 0.5) * 2 * shakeIntensity };
                }
                return { shakeX: 0, shakeY: 0 };
            case 'bounce':
                const timeBounce = Date.now() * 0.008;
                return { bounceY: -Math.abs(Math.sin(timeBounce)) * normalizedLevel * 30 };
            case 'swing':
                const timeSwing = Date.now() * 0.004;
                return { swingX: Math.sin(timeSwing) * normalizedLevel * 40 };
            case 'orbit':
                const timeOrbit = Date.now() * 0.003;
                const orbitRadius = normalizedLevel * 25;
                return { orbitX: Math.cos(timeOrbit) * orbitRadius, orbitY: Math.sin(timeOrbit) * orbitRadius };
            default:
                return {};
        }
    }

    /**
     * Wendet Audio-Reaktive Filter auf Context an
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

        if (currentFilter.trim()) {
            ctx.filter = currentFilter.trim();
        }
    }

    /**
     * Zeichnet interaktive Elemente (Rahmen, Handles) für ausgewähltes Video
     */
    drawInteractiveElements(ctx) {
        if (!this.selectedVideo || this.selectedVideo.type !== 'video') return;

        const bounds = this.getVideoBounds(this.selectedVideo);
        if (!bounds) return;

        ctx.save();

        // Rahmen
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.9)'; // Violett für Videos (anders als Bilder)
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.setLineDash([]);

        // Video-Icon in der Ecke
        ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
        ctx.beginPath();
        ctx.moveTo(bounds.x + 10, bounds.y + 8);
        ctx.lineTo(bounds.x + 10, bounds.y + 22);
        ctx.lineTo(bounds.x + 22, bounds.y + 15);
        ctx.closePath();
        ctx.fill();

        // Skalierungs-Handles
        const handles = this.getResizeHandles(bounds);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;

        for (const key in handles) {
            const handle = handles[key];
            ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
            ctx.strokeRect(handle.x, handle.y, handle.width, handle.height);
        }

        // Löschbutton
        const deleteButton = this.getDeleteButtonBounds(bounds);
        ctx.fillStyle = 'rgba(255, 69, 58, 0.95)';
        ctx.beginPath();
        ctx.arc(deleteButton.x + deleteButton.width / 2, deleteButton.y + deleteButton.height / 2, deleteButton.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // X-Symbol
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
     * Berechnet Resize-Handles
     */
    getResizeHandles(bounds) {
        const hs = 10;
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
     * Berechnet Löschbutton-Position
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
     * Findet Video an Position
     */
    findVideoAt(x, y) {
        for (let i = this.videos.length - 1; i >= 0; i--) {
            const video = this.videos[i];
            const bounds = this.getVideoBounds(video);

            if (bounds && this.isPointInRect(x, y, bounds)) {
                return video;
            }
        }
        return null;
    }

    /**
     * Prüft ob Punkt in Rechteck liegt
     */
    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    }

    /**
     * Findet Handle an Position
     */
    findHandleAt(x, y) {
        if (!this.selectedVideo || this.selectedVideo.type !== 'video') return null;

        const bounds = this.getVideoBounds(this.selectedVideo);
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
     * Prüft ob Punkt auf Löschbutton liegt
     */
    isPointOnDeleteButton(x, y) {
        if (!this.selectedVideo || this.selectedVideo.type !== 'video') return false;

        const bounds = this.getVideoBounds(this.selectedVideo);
        if (!bounds) return false;

        const deleteButton = this.getDeleteButtonBounds(bounds);
        return this.isPointInRect(x, y, deleteButton);
    }

    /**
     * Aktualisiert Video-Filter
     */
    updateVideoFilter(videoId, filterProperty, value) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video || !video.settings) return false;

        video.settings[filterProperty] = value;
        this.redrawCallback();

        return true;
    }

    /**
     * Vorbereitung für Recording
     */
    prepareForRecording(ctx) {
        if (!ctx) return;

        console.log('[VideoManager] 🧹 Preparing for recording...');

        // Alle Videos starten für Recording
        this.videos.forEach(video => {
            if (video.videoElement) {
                video.videoElement.currentTime = 0;
            }
        });

        console.log(`[VideoManager] ✅ Ready for recording (${this.videos.length} videos)`);
    }

    /**
     * Cleanup nach Recording
     */
    cleanupAfterRecording() {
        console.log('[VideoManager] 🧹 Cleanup after recording...');
        console.log(`[VideoManager] ✅ Cleanup complete`);
    }

    /**
     * Z-Index Steuerung
     */
    getVideoIndex(video) {
        if (!video) return -1;
        return this.videos.findIndex(v => v.id === video.id);
    }

    getVideoCount() {
        return this.videos.length;
    }

    bringToFront(video) {
        if (!video) video = this.selectedVideo;
        if (!video) return false;

        const index = this.getVideoIndex(video);
        if (index === -1 || index === this.videos.length - 1) return false;

        this.videos.splice(index, 1);
        this.videos.push(video);

        this.redrawCallback();
        this.onVideoChanged();
        return true;
    }

    sendToBack(video) {
        if (!video) video = this.selectedVideo;
        if (!video) return false;

        const index = this.getVideoIndex(video);
        if (index === -1 || index === 0) return false;

        this.videos.splice(index, 1);
        this.videos.unshift(video);

        this.redrawCallback();
        this.onVideoChanged();
        return true;
    }

    /**
     * Räumt alle Videos auf
     */
    clear() {
        this.videos.forEach(video => {
            if (video.videoElement) {
                video.videoElement.pause();
                video.videoElement.src = '';
            }
        });

        this.videos = [];
        this.selectedVideo = null;
        this.onVideoSelected(null);
        this.redrawCallback();
        this.onVideoChanged();
    }
}
