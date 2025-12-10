/**
 * TextManager - Verwaltet Text-Objekte auf dem Canvas
 * Unterstützt: Schriftarten, Größen, Farben, Stile und SCHATTEN
 * ✅ FIXED: Präzise Textmarkierung mit Schatten-, Stroke- und letterSpacing-Unterstützung
 */
export class TextManager {
    constructor(textStore) {
        this.textStore = textStore;
        this.textObjects = [];
    }

    /**
     * Fügt ein neues Text-Objekt hinzu
     */
    add(text, options = {}) {
        const newText = {
            id: Date.now() + Math.random(),
            type: 'text',
            content: text || 'Neuer Text',
            
            // Position (relativ zum Canvas)
            relX: options.relX || 0.5,
            relY: options.relY || 0.5,
            
            // Schrift-Eigenschaften
            fontSize: options.fontSize || 48,
            fontFamily: options.fontFamily || 'Arial',
            fontWeight: options.fontWeight || 'normal',
            fontStyle: options.fontStyle || 'normal',
            color: options.color || '#ff0000',
            textAlign: options.textAlign || 'center',
            textBaseline: options.textBaseline || 'middle',
            
            // ✨ TRANSPARENZ/DECKKRAFT (0-100%)
            opacity: options.opacity !== undefined ? options.opacity : 100,
            
            // ✨ BUCHSTABENABSTAND (-20 bis +50px)
            letterSpacing: options.letterSpacing || 0,
            
            // ✨ ZEILENABSTAND (100% - 300%)
            lineHeightMultiplier: options.lineHeightMultiplier || 120,
            
            // ✨ SCHATTEN-EIGENSCHAFTEN
            shadow: {
                color: options.shadowColor || '#000000',
                blur: options.shadowBlur || 0,
                offsetX: options.shadowOffsetX || 0,
                offsetY: options.shadowOffsetY || 0
            },
            
            // ✨ KONTUR/OUTLINE
            stroke: {
                enabled: options.strokeEnabled || false,
                color: options.strokeColor || '#000000',
                width: options.strokeWidth || 2
            },

            // Rotation
            rotation: options.rotation || 0,

            // ✨ AUDIO-REAKTIVE EFFEKTE (standardmäßig aktiviert für bessere UX)
            audioReactive: {
                enabled: options.audioReactiveEnabled !== undefined ? options.audioReactiveEnabled : true,
                source: options.audioReactiveSource || 'bass',  // 'bass', 'mid', 'treble', 'volume'
                smoothing: options.audioReactiveSmoothing || 50,  // 0-100%
                threshold: 0,   // ✨ NEU: Ignoriert leise Signale (0-50%)
                attack: 90,     // ✨ NEU: Wie schnell der Effekt anspricht (10-100%)
                release: 50,    // ✨ NEU: Wie langsam der Effekt abklingt (10-100%)
                effects: {
                    hue: { enabled: false, intensity: 80 },
                    brightness: { enabled: false, intensity: 80 },
                    scale: { enabled: false, intensity: 80 },
                    glow: { enabled: false, intensity: 80 },
                    shake: { enabled: false, intensity: 80 },
                    bounce: { enabled: false, intensity: 80 },
                    swing: { enabled: false, intensity: 80 },
                    opacity: { enabled: false, intensity: 80, minimum: 0, ease: false },
                    letterSpacing: { enabled: false, intensity: 80 },
                    strokeWidth: { enabled: false, intensity: 80 }
                }
            },

            // ✨ TEXT-ANIMATION (Typewriter, Fade, Scale, etc.)
            animation: {
                type: 'none',  // 'none', 'typewriter', 'fade', 'scale'
                typewriter: {
                    enabled: false,
                    speed: 50,           // ms pro Buchstabe
                    startDelay: 0,       // Verzögerung vor Start (ms)
                    loop: false,         // Animation wiederholen
                    loopDelay: 1000,     // Pause zwischen Wiederholungen (ms)
                    showCursor: true,    // Blinkender Cursor
                    cursorChar: '|'      // Cursor-Zeichen
                },
                // ✨ Fade-Einblendung
                fade: {
                    enabled: false,
                    duration: 1000,      // Dauer der Einblendung (ms)
                    startDelay: 0,       // Verzögerung vor Start (ms)
                    direction: 'in',     // 'in' = einblenden, 'out' = ausblenden, 'inOut' = ein- und ausblenden
                    loop: false,         // Animation wiederholen
                    loopDelay: 1000,     // Pause zwischen Wiederholungen (ms)
                    easing: 'ease'       // 'linear', 'ease', 'easeIn', 'easeOut'
                },
                // ✨ NEU: Scale-Animation (Eingangs-Skalierung)
                scale: {
                    enabled: false,
                    duration: 1000,      // Dauer der Animation (ms)
                    startDelay: 0,       // Verzögerung vor Start (ms)
                    startScale: 0,       // Start-Skalierung (0 = unsichtbar, 1 = normal, 2 = doppelt)
                    endScale: 1,         // End-Skalierung
                    direction: 'in',     // 'in' = reinzoomen, 'out' = rauszoomen, 'inOut' = rein und raus
                    loop: false,         // Animation wiederholen
                    loopDelay: 1000,     // Pause zwischen Wiederholungen (ms)
                    easing: 'ease'       // 'linear', 'ease', 'easeIn', 'easeOut'
                },
                // ✨ NEU: Slide-Animation (Hereingleiten)
                slide: {
                    enabled: false,
                    duration: 1000,      // Dauer der Animation (ms)
                    startDelay: 0,       // Verzögerung vor Start (ms)
                    from: 'left',        // 'left', 'right', 'top', 'bottom'
                    distance: 100,       // Distanz in Prozent des Canvas (100 = vom Rand)
                    direction: 'in',     // 'in' = hereinfahren, 'out' = herausfahren, 'inOut' = rein und raus
                    loop: false,         // Animation wiederholen
                    loopDelay: 1000,     // Pause zwischen Wiederholungen (ms)
                    easing: 'ease'       // 'linear', 'ease', 'easeIn', 'easeOut'
                },
                // Interner State (wird zur Laufzeit gesetzt)
                _state: {
                    startTime: null,     // Wann die Animation gestartet wurde
                    isPlaying: false,    // Läuft die Animation gerade?
                    currentIndex: 0      // Aktueller Buchstaben-Index (für Typewriter)
                }
            }
        };
        
        this.textObjects.push(newText);
        
        return newText;
    }

    /**
     * Löscht ein Text-Objekt
     */
    delete(textObject) {
        const index = this.textObjects.findIndex(t => t.id === textObject.id);
        if (index !== -1) {
            this.textObjects.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Findet ein Text-Objekt an einer bestimmten Position
     */
    findObjectAt(x, y, targetCanvas) {
        // Von hinten nach vorne durchgehen (oberste Ebene zuerst)
        for (let i = this.textObjects.length - 1; i >= 0; i--) {
            const textObj = this.textObjects[i];
            const bounds = this.getObjectBounds(textObj, targetCanvas);
            
            if (bounds && this.isPointInRect(x, y, bounds)) {
                return textObj;
            }
        }
        return null;
    }

    /**
     * ✅ FIXED: Berechnet die PRÄZISEN Bounds (Begrenzungsrahmen) eines Text-Objekts
     * Berücksichtigt: Schatten, Stroke, letterSpacing, mehrzeilige Texte
     */
    getObjectBounds(textObj, targetCanvas) {
        if (!textObj || textObj.type !== 'text') return null;
        
        const ctx = targetCanvas.getContext('2d');
        
        // Speichere original Context-State
        ctx.save();
        
        // Wende Text-Style an (ohne Schatten für saubere Messung)
        this.applyTextStyleForMeasurement(ctx, textObj);
        
        // Teile Text in Zeilen auf
        const lines = textObj.content.split('\n');
        
        // ✨ DYNAMISCHER ZEILENABSTAND
        const lineHeightMultiplier = (textObj.lineHeightMultiplier || 120) / 100;
        const lineHeight = textObj.fontSize * lineHeightMultiplier;
        
        // Finde die breiteste Zeile
        let maxWidth = 0;
        lines.forEach(line => {
            const metrics = ctx.measureText(line);
            // ✅ FIX: letterSpacing addiert sich über alle Zeichen
            // Bei positivem letterSpacing wird Text breiter, bei negativem schmaler
            const letterSpacingExtra = (textObj.letterSpacing || 0) * Math.max(0, line.length - 1);
            const totalWidth = metrics.width + letterSpacingExtra;
            
            if (totalWidth > maxWidth) {
                maxWidth = totalWidth;
            }
        });
        
        // Restore Context
        ctx.restore();
        
        // Basis-Dimensionen
        let textWidth = maxWidth;
        let textHeight = lineHeight * lines.length;
        
        // ✅ FIX: Stroke-Breite einrechnen (erweitert Text nach allen Seiten)
        const strokeWidth = textObj.stroke.enabled ? (textObj.stroke.width || 0) : 0;
        textWidth += strokeWidth * 2;
        textHeight += strokeWidth * 2;
        
        // ✅ FIX: Schatten-Ausdehnung berechnen
        // Schatten kann den Text in alle Richtungen erweitern
        const shadowBlur = textObj.shadow.blur || 0;
        const shadowOffsetX = textObj.shadow.offsetX || 0;
        const shadowOffsetY = textObj.shadow.offsetY || 0;
        
        // Schatten-Blur erzeugt eine Ausdehnung in alle Richtungen
        // Schatten-Offset verschiebt den Schatten
        const shadowLeft = Math.max(0, shadowBlur - shadowOffsetX);
        const shadowRight = Math.max(0, shadowBlur + shadowOffsetX);
        const shadowTop = Math.max(0, shadowBlur - shadowOffsetY);
        const shadowBottom = Math.max(0, shadowBlur + shadowOffsetY);
        
        // Position in Pixel umrechnen
        const pixelX = textObj.relX * targetCanvas.width;
        const pixelY = textObj.relY * targetCanvas.height;
        
        // Bounds basierend auf Alignment berechnen (ohne Schatten/Stroke)
        let baseX, baseY;
        
        switch (textObj.textAlign) {
            case 'left':
                baseX = pixelX;
                break;
            case 'right':
                baseX = pixelX - maxWidth;
                break;
            case 'center':
            default:
                baseX = pixelX - maxWidth / 2;
                break;
        }
        
        switch (textObj.textBaseline) {
            case 'top':
                baseY = pixelY;
                break;
            case 'bottom':
                baseY = pixelY - (lineHeight * lines.length);
                break;
            case 'middle':
            default:
                baseY = pixelY - (lineHeight * lines.length) / 2;
                break;
        }
        
        // ✅ FIX: Minimales Padding für Klickbarkeit (relativ zur Schriftgröße)
        // Kleiner als vorher (10px), aber immer noch nutzbar
        const basePadding = Math.max(3, textObj.fontSize * 0.05);
        
        // ✅ FIX: Finale Bounds mit Stroke, Schatten UND Padding
        return {
            x: baseX - strokeWidth - shadowLeft - basePadding,
            y: baseY - strokeWidth - shadowTop - basePadding,
            width: maxWidth + strokeWidth * 2 + shadowLeft + shadowRight + basePadding * 2,
            height: lineHeight * lines.length + strokeWidth * 2 + shadowTop + shadowBottom + basePadding * 2
        };
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
     * ✅ Wendet Text-Stil für MESSUNG an (OHNE Schatten)
     */
    applyTextStyleForMeasurement(ctx, textObj) {
        ctx.font = `${textObj.fontStyle} ${textObj.fontWeight} ${textObj.fontSize}px ${textObj.fontFamily}`;
        ctx.textAlign = textObj.textAlign;
        ctx.textBaseline = textObj.textBaseline;
        
        // letterSpacing für Messung
        if (textObj.letterSpacing !== undefined && textObj.letterSpacing !== 0) {
            ctx.letterSpacing = `${textObj.letterSpacing}px`;
        } else {
            ctx.letterSpacing = '0px';
        }
        
        // Schatten explizit NICHT setzen für saubere Messung
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    /**
     * Wendet Text-Stil auf den Context an (für Zeichnen)
     */
    applyTextStyle(ctx, textObj) {
        ctx.font = `${textObj.fontStyle} ${textObj.fontWeight} ${textObj.fontSize}px ${textObj.fontFamily}`;
        ctx.fillStyle = textObj.color;
        ctx.textAlign = textObj.textAlign;
        ctx.textBaseline = textObj.textBaseline;
        
        // ✨ BUCHSTABENABSTAND anwenden
        if (textObj.letterSpacing !== undefined && textObj.letterSpacing !== 0) {
            ctx.letterSpacing = `${textObj.letterSpacing}px`;
        } else {
            ctx.letterSpacing = '0px';
        }
        
        // ✨ SCHATTEN anwenden
        if (textObj.shadow.blur > 0 || textObj.shadow.offsetX !== 0 || textObj.shadow.offsetY !== 0) {
            ctx.shadowColor = textObj.shadow.color;
            ctx.shadowBlur = textObj.shadow.blur;
            ctx.shadowOffsetX = textObj.shadow.offsetX;
            ctx.shadowOffsetY = textObj.shadow.offsetY;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // Kontur vorbereiten
        if (textObj.stroke.enabled) {
            ctx.strokeStyle = textObj.stroke.color;
            ctx.lineWidth = textObj.stroke.width;
            ctx.lineJoin = 'round';
        }
    }

    /**
     * 🔧 Setzt ALLE Schatten-Eigenschaften explizit zurück
     * Verhindert "Schatten-Lecks" auf nachfolgende Canvas-Elemente
     */
    resetShadow(ctx) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    /**
     * ✨ NEU: Berechnet den sichtbaren Text für Typewriter-Animation
     * Gibt den anzuzeigenden Text und Cursor-Info zurück
     */
    _getTypewriterText(textObj) {
        const animation = textObj.animation;

        // Wenn keine Animation oder Typewriter nicht aktiviert
        if (!animation || !animation.typewriter || !animation.typewriter.enabled) {
            return { text: textObj.content, showCursor: false, isComplete: true };
        }

        const tw = animation.typewriter;
        const state = animation._state;
        const fullText = textObj.content;
        const now = Date.now();

        // Animation starten wenn noch nicht gestartet
        if (!state.isPlaying && !state.startTime) {
            state.startTime = now + (tw.startDelay || 0);
            state.isPlaying = true;
            state.currentIndex = 0;
        }

        // Noch in der Start-Verzögerung?
        if (now < state.startTime) {
            return {
                text: '',
                showCursor: tw.showCursor,
                cursorChar: tw.cursorChar || '|',
                isComplete: false
            };
        }

        // Berechne wie viele Buchstaben sichtbar sein sollten
        const elapsed = now - state.startTime;
        const speed = tw.speed || 50;
        const targetIndex = Math.floor(elapsed / speed);

        // Alle Buchstaben angezeigt?
        if (targetIndex >= fullText.length) {
            // Animation komplett
            if (tw.loop) {
                // Nach loopDelay neu starten
                const completionTime = state.startTime + (fullText.length * speed);
                const timeSinceComplete = now - completionTime;

                if (timeSinceComplete >= (tw.loopDelay || 1000)) {
                    // Neustart
                    state.startTime = now;
                    state.currentIndex = 0;
                    return {
                        text: '',
                        showCursor: tw.showCursor,
                        cursorChar: tw.cursorChar || '|',
                        isComplete: false
                    };
                }
            }

            // Fertig - zeige vollen Text
            state.isPlaying = false;
            return {
                text: fullText,
                showCursor: tw.showCursor && tw.loop, // Cursor nur bei Loop weiter anzeigen
                cursorChar: tw.cursorChar || '|',
                isComplete: true
            };
        }

        // Teiltext anzeigen
        state.currentIndex = targetIndex;
        const visibleText = fullText.substring(0, targetIndex + 1);

        return {
            text: visibleText,
            showCursor: tw.showCursor,
            cursorChar: tw.cursorChar || '|',
            isComplete: false
        };
    }

    /**
     * ✨ NEU: Startet die Typewriter-Animation neu
     */
    restartTypewriter(textObj) {
        if (!textObj || !textObj.animation) return;

        const state = textObj.animation._state;
        state.startTime = null;
        state.isPlaying = false;
        state.currentIndex = 0;
    }

    /**
     * ✨ NEU: Berechnet die Opacity für Fade-Animation
     * Gibt einen Wert zwischen 0 und 1 zurück
     */
    _getFadeOpacity(textObj) {
        const animation = textObj.animation;

        // Wenn keine Animation oder Fade nicht aktiviert
        if (!animation || !animation.fade || !animation.fade.enabled) {
            return { opacity: 1, isComplete: true };
        }

        const fade = animation.fade;
        // ✅ DEFENSIVE: _state initialisieren falls nicht vorhanden
        if (!animation._state) {
            animation._state = { startTime: null, isPlaying: false, currentIndex: 0 };
        }
        const state = animation._state;
        const now = Date.now();

        // Animation starten wenn noch nicht gestartet
        if (!state.fadeStartTime) {
            state.fadeStartTime = now + (fade.startDelay || 0);
            state.fadePhase = 'waiting'; // 'waiting', 'fadeIn', 'visible', 'fadeOut', 'hidden'
        }

        // Noch in der Start-Verzögerung?
        if (now < state.fadeStartTime) {
            return {
                opacity: fade.direction === 'out' ? 1 : 0,
                isComplete: false
            };
        }

        const elapsed = now - state.fadeStartTime;
        const duration = fade.duration || 1000;

        // Easing-Funktion anwenden
        const applyEasing = (t, easing) => {
            switch (easing) {
                case 'linear':
                    return t;
                case 'easeIn':
                    return t * t;
                case 'easeOut':
                    return 1 - (1 - t) * (1 - t);
                case 'ease':
                default:
                    // Ease-In-Out
                    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            }
        };

        let opacity = 1;
        let isComplete = false;

        switch (fade.direction) {
            case 'in':
                // Einblenden: 0 → 1
                if (elapsed >= duration) {
                    opacity = 1;
                    isComplete = true;
                } else {
                    const progress = elapsed / duration;
                    opacity = applyEasing(progress, fade.easing);
                }
                break;

            case 'out':
                // Ausblenden: 1 → 0
                if (elapsed >= duration) {
                    opacity = 0;
                    isComplete = true;
                } else {
                    const progress = elapsed / duration;
                    opacity = 1 - applyEasing(progress, fade.easing);
                }
                break;

            case 'inOut':
                // Ein- und Ausblenden: 0 → 1 → 0
                const totalDuration = duration * 2;
                if (elapsed >= totalDuration) {
                    opacity = 0;
                    isComplete = true;
                } else if (elapsed < duration) {
                    // Einblenden
                    const progress = elapsed / duration;
                    opacity = applyEasing(progress, fade.easing);
                } else {
                    // Ausblenden
                    const progress = (elapsed - duration) / duration;
                    opacity = 1 - applyEasing(progress, fade.easing);
                }
                break;
        }

        // Loop-Handling
        if (isComplete && fade.loop) {
            const loopDelay = fade.loopDelay || 1000;
            const completionTime = state.fadeStartTime + (fade.direction === 'inOut' ? duration * 2 : duration);
            const timeSinceComplete = now - completionTime;

            if (timeSinceComplete >= loopDelay) {
                // Neustart
                state.fadeStartTime = now;
                return {
                    opacity: fade.direction === 'out' ? 1 : 0,
                    isComplete: false
                };
            }
        }

        return { opacity, isComplete };
    }

    /**
     * ✨ NEU: Startet die Fade-Animation neu
     */
    restartFade(textObj) {
        if (!textObj || !textObj.animation) return;

        const state = textObj.animation._state;
        state.fadeStartTime = null;
        state.fadePhase = null;
    }

    /**
     * ✨ NEU: Berechnet den Scale-Wert für Scale-Animation
     * Gibt einen Wert zurück (z.B. 0.5, 1.0, 2.0)
     */
    _getScaleValue(textObj) {
        const animation = textObj.animation;

        // Wenn keine Animation oder Scale nicht aktiviert
        if (!animation || !animation.scale || !animation.scale.enabled) {
            return { scale: 1, isComplete: true };
        }

        const scaleAnim = animation.scale;
        // ✅ DEFENSIVE: _state initialisieren falls nicht vorhanden
        if (!animation._state) {
            animation._state = { startTime: null, isPlaying: false, currentIndex: 0 };
        }
        const state = animation._state;
        const now = Date.now();

        // Animation starten wenn noch nicht gestartet
        if (!state.scaleStartTime) {
            state.scaleStartTime = now + (scaleAnim.startDelay || 0);
        }

        // Noch in der Start-Verzögerung?
        if (now < state.scaleStartTime) {
            const startScale = scaleAnim.direction === 'out' ? scaleAnim.endScale : scaleAnim.startScale;
            return {
                scale: startScale,
                isComplete: false
            };
        }

        const elapsed = now - state.scaleStartTime;
        const duration = scaleAnim.duration || 1000;

        // Easing-Funktion anwenden
        const applyEasing = (t, easing) => {
            switch (easing) {
                case 'linear':
                    return t;
                case 'easeIn':
                    return t * t;
                case 'easeOut':
                    return 1 - (1 - t) * (1 - t);
                case 'ease':
                default:
                    // Ease-In-Out
                    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            }
        };

        const startScale = scaleAnim.startScale !== undefined ? scaleAnim.startScale : 0;
        const endScale = scaleAnim.endScale !== undefined ? scaleAnim.endScale : 1;
        let scale = endScale;
        let isComplete = false;

        switch (scaleAnim.direction) {
            case 'in':
                // Reinzoomen: startScale → endScale
                if (elapsed >= duration) {
                    scale = endScale;
                    isComplete = true;
                } else {
                    const progress = elapsed / duration;
                    const easedProgress = applyEasing(progress, scaleAnim.easing);
                    scale = startScale + (endScale - startScale) * easedProgress;
                }
                break;

            case 'out':
                // Rauszoomen: endScale → startScale
                if (elapsed >= duration) {
                    scale = startScale;
                    isComplete = true;
                } else {
                    const progress = elapsed / duration;
                    const easedProgress = applyEasing(progress, scaleAnim.easing);
                    scale = endScale - (endScale - startScale) * easedProgress;
                }
                break;

            case 'inOut':
                // Rein und Raus: startScale → endScale → startScale
                const totalDuration = duration * 2;
                if (elapsed >= totalDuration) {
                    scale = startScale;
                    isComplete = true;
                } else if (elapsed < duration) {
                    // Reinzoomen
                    const progress = elapsed / duration;
                    const easedProgress = applyEasing(progress, scaleAnim.easing);
                    scale = startScale + (endScale - startScale) * easedProgress;
                } else {
                    // Rauszoomen
                    const progress = (elapsed - duration) / duration;
                    const easedProgress = applyEasing(progress, scaleAnim.easing);
                    scale = endScale - (endScale - startScale) * easedProgress;
                }
                break;
        }

        // Loop-Handling
        if (isComplete && scaleAnim.loop) {
            const loopDelay = scaleAnim.loopDelay || 1000;
            const completionTime = state.scaleStartTime + (scaleAnim.direction === 'inOut' ? duration * 2 : duration);
            const timeSinceComplete = now - completionTime;

            if (timeSinceComplete >= loopDelay) {
                // Neustart
                state.scaleStartTime = now;
                return {
                    scale: scaleAnim.direction === 'out' ? endScale : startScale,
                    isComplete: false
                };
            }
        }

        return { scale, isComplete };
    }

    /**
     * ✨ NEU: Startet die Scale-Animation neu
     */
    restartScale(textObj) {
        if (!textObj || !textObj.animation) return;

        const state = textObj.animation._state;
        state.scaleStartTime = null;
    }

    /**
     * ✨ NEU: Berechnet den Slide-Offset für Slide-Animation
     * Gibt X und Y Offset in Pixeln zurück
     */
    _getSlideOffset(textObj, canvasWidth, canvasHeight) {
        const animation = textObj.animation;

        // Wenn keine Animation oder Slide nicht aktiviert
        if (!animation || !animation.slide || !animation.slide.enabled) {
            return { offsetX: 0, offsetY: 0, isComplete: true };
        }

        const slide = animation.slide;
        // ✅ DEFENSIVE: _state initialisieren falls nicht vorhanden
        if (!animation._state) {
            animation._state = { startTime: null, isPlaying: false, currentIndex: 0 };
        }
        const state = animation._state;
        const now = Date.now();

        // Animation starten wenn noch nicht gestartet
        if (!state.slideStartTime) {
            state.slideStartTime = now + (slide.startDelay || 0);
        }

        // Berechne die maximale Distanz basierend auf der Richtung
        const distancePercent = slide.distance || 100;
        let maxOffsetX = 0;
        let maxOffsetY = 0;

        switch (slide.from) {
            case 'left':
                maxOffsetX = -(canvasWidth * distancePercent / 100);
                break;
            case 'right':
                maxOffsetX = canvasWidth * distancePercent / 100;
                break;
            case 'top':
                maxOffsetY = -(canvasHeight * distancePercent / 100);
                break;
            case 'bottom':
                maxOffsetY = canvasHeight * distancePercent / 100;
                break;
        }

        // Noch in der Start-Verzögerung?
        if (now < state.slideStartTime) {
            if (slide.direction === 'out') {
                return { offsetX: 0, offsetY: 0, isComplete: false };
            }
            return { offsetX: maxOffsetX, offsetY: maxOffsetY, isComplete: false };
        }

        const elapsed = now - state.slideStartTime;
        const duration = slide.duration || 1000;

        // Easing-Funktion anwenden
        const applyEasing = (t, easing) => {
            switch (easing) {
                case 'linear':
                    return t;
                case 'easeIn':
                    return t * t;
                case 'easeOut':
                    return 1 - (1 - t) * (1 - t);
                case 'ease':
                default:
                    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            }
        };

        let offsetX = 0;
        let offsetY = 0;
        let isComplete = false;

        switch (slide.direction) {
            case 'in':
                // Hereinfahren: von außen → zur Position
                if (elapsed >= duration) {
                    offsetX = 0;
                    offsetY = 0;
                    isComplete = true;
                } else {
                    const progress = elapsed / duration;
                    const easedProgress = applyEasing(progress, slide.easing);
                    offsetX = maxOffsetX * (1 - easedProgress);
                    offsetY = maxOffsetY * (1 - easedProgress);
                }
                break;

            case 'out':
                // Herausfahren: von Position → nach außen
                if (elapsed >= duration) {
                    offsetX = maxOffsetX;
                    offsetY = maxOffsetY;
                    isComplete = true;
                } else {
                    const progress = elapsed / duration;
                    const easedProgress = applyEasing(progress, slide.easing);
                    offsetX = maxOffsetX * easedProgress;
                    offsetY = maxOffsetY * easedProgress;
                }
                break;

            case 'inOut':
                // Rein und Raus: von außen → Position → nach außen
                const totalDuration = duration * 2;
                if (elapsed >= totalDuration) {
                    offsetX = maxOffsetX;
                    offsetY = maxOffsetY;
                    isComplete = true;
                } else if (elapsed < duration) {
                    // Hereinfahren
                    const progress = elapsed / duration;
                    const easedProgress = applyEasing(progress, slide.easing);
                    offsetX = maxOffsetX * (1 - easedProgress);
                    offsetY = maxOffsetY * (1 - easedProgress);
                } else {
                    // Herausfahren
                    const progress = (elapsed - duration) / duration;
                    const easedProgress = applyEasing(progress, slide.easing);
                    offsetX = maxOffsetX * easedProgress;
                    offsetY = maxOffsetY * easedProgress;
                }
                break;
        }

        // Loop-Handling
        if (isComplete && slide.loop) {
            const loopDelay = slide.loopDelay || 1000;
            const completionTime = state.slideStartTime + (slide.direction === 'inOut' ? duration * 2 : duration);
            const timeSinceComplete = now - completionTime;

            if (timeSinceComplete >= loopDelay) {
                // Neustart
                state.slideStartTime = now;
                if (slide.direction === 'out') {
                    return { offsetX: 0, offsetY: 0, isComplete: false };
                }
                return { offsetX: maxOffsetX, offsetY: maxOffsetY, isComplete: false };
            }
        }

        return { offsetX, offsetY, isComplete };
    }

    /**
     * ✨ NEU: Startet die Slide-Animation neu
     */
    restartSlide(textObj) {
        if (!textObj || !textObj.animation) return;

        const state = textObj.animation._state;
        state.slideStartTime = null;
    }

    /**
     * Zeichnet einen einzelnen Text (mit Unterstützung für mehrzeilige Texte)
     * ✨ ERWEITERT: Unterstützt jetzt Audio-Reaktive Effekte und Typewriter-Animation
     */
    drawText(ctx, textObj, canvasWidth, canvasHeight) {
        if (!textObj.content) return;

        ctx.save();

        // ✨ AUDIO-REAKTIVE WERTE berechnen
        const audioReactive = this.getAudioReactiveValues(textObj.audioReactive);

        // ✨ TRANSPARENZ/DECKKRAFT anwenden (0-100% → 0.0-1.0)
        let baseOpacity = (textObj.opacity !== undefined ? textObj.opacity : 100) / 100;

        // Audio-reaktive Opacity moduliert den Basis-Wert (statt ihn zu überschreiben)
        if (audioReactive && audioReactive.hasEffects && audioReactive.effects.opacity) {
            // audioReactive.effects.opacity.opacity ist 30-100, moduliert den Slider-Wert
            const audioModulation = audioReactive.effects.opacity.opacity / 100;
            baseOpacity = baseOpacity * audioModulation;
        }

        // ✨ FADE-ANIMATION: Opacity aus Fade-Effekt anwenden
        const fadeResult = this._getFadeOpacity(textObj);
        baseOpacity = baseOpacity * fadeResult.opacity;

        ctx.globalAlpha = baseOpacity;

        // Basis-Position berechnen
        let pixelX = textObj.relX * canvasWidth;
        let pixelY = textObj.relY * canvasHeight;

        // ✨ SLIDE-ANIMATION: Position-Offset aus Slide-Effekt anwenden
        const slideResult = this._getSlideOffset(textObj, canvasWidth, canvasHeight);
        pixelX += slideResult.offsetX;
        pixelY += slideResult.offsetY;

        // ✨ AUDIO-REAKTIV: Shake-Effekt (Erschütterung)
        if (audioReactive && audioReactive.hasEffects && audioReactive.effects.shake) {
            const shake = audioReactive.effects.shake;
            pixelX += shake.shakeX || 0;
            pixelY += shake.shakeY || 0;
        }

        // ✨ AUDIO-REAKTIV: Bounce-Effekt (Hüpfen)
        if (audioReactive && audioReactive.hasEffects && audioReactive.effects.bounce) {
            const bounce = audioReactive.effects.bounce;
            pixelY += bounce.bounceY || 0;
        }

        // ✨ AUDIO-REAKTIV: Swing-Effekt (Horizontales Pendeln)
        if (audioReactive && audioReactive.hasEffects && audioReactive.effects.swing) {
            const swing = audioReactive.effects.swing;
            pixelX += swing.swingX || 0;
        }

        // ✨ AUDIO-REAKTIV: Scale-Effekt (pulsieren)
        let scale = 1.0;
        if (audioReactive && audioReactive.hasEffects && audioReactive.effects.scale) {
            scale = audioReactive.effects.scale.scale;
        }

        // ✨ SCALE-ANIMATION: Scale aus Animation anwenden
        const scaleResult = this._getScaleValue(textObj);
        scale = scale * scaleResult.scale;

        // Rotation + Scale anwenden
        const totalRotation = textObj.rotation || 0;
        if (totalRotation !== 0 || scale !== 1.0) {
            ctx.translate(pixelX, pixelY);
            if (totalRotation !== 0) {
                ctx.rotate((totalRotation * Math.PI) / 180);
            }
            if (scale !== 1.0) {
                ctx.scale(scale, scale);
            }
            ctx.translate(-pixelX, -pixelY);
        }

        // ✨ AUDIO-REAKTIV: Filter anwenden (Hue, Brightness)
        let filterString = '';
        if (audioReactive && audioReactive.hasEffects) {
            const effects = audioReactive.effects;

            // Hue-Rotation
            if (effects.hue) {
                filterString += `hue-rotate(${effects.hue.hueRotate}deg) `;
            }

            // Helligkeit
            if (effects.brightness) {
                filterString += `brightness(${effects.brightness.brightness}%) `;
            }
        }
        if (filterString) {
            ctx.filter = filterString.trim();
        }

        // ✨ AUDIO-REAKTIV: Glow-Effekt (überschreibt statischen Schatten temporär)
        let useAudioGlow = false;
        if (audioReactive && audioReactive.hasEffects && audioReactive.effects.glow) {
            useAudioGlow = true;
        }

        // Text-Stil anwenden (mit Audio-Reaktiven Überschreibungen)
        this.applyTextStyleWithAudio(ctx, textObj, audioReactive, useAudioGlow);

        // ✨ TYPEWRITER-ANIMATION: Hole den sichtbaren Text
        const typewriterResult = this._getTypewriterText(textObj);
        const displayContent = typewriterResult.text;

        // ✨ Mehrzeilige Texte unterstützen (Zeilenumbrüche mit \n)
        const lines = displayContent.split('\n');

        // ✨ DYNAMISCHER ZEILENABSTAND (lineHeightMultiplier: 100-300%)
        const lineHeightMultiplier = (textObj.lineHeightMultiplier || 120) / 100;
        const lineHeight = textObj.fontSize * lineHeightMultiplier;

        // Für Positionsberechnung: Verwende Original-Content für konsistente Positionierung
        const originalLines = textObj.content.split('\n');

        // Berechne Start-Y-Position für zentrierte mehrzeilige Texte
        let startY = pixelY;
        if (originalLines.length > 1) {
            // Wenn textBaseline 'middle' ist, verschiebe nach oben um die halbe Gesamthöhe
            if (textObj.textBaseline === 'middle') {
                startY = pixelY - ((originalLines.length - 1) * lineHeight) / 2;
            }
        }

        // Zeichne jede Zeile einzeln
        lines.forEach((line, index) => {
            const yPos = startY + (index * lineHeight);

            // ✨ KONTUR zeichnen (wenn aktiviert oder audio-reaktiv)
            const hasStroke = textObj.stroke.enabled ||
                (audioReactive && audioReactive.hasEffects && audioReactive.effects.strokeWidth);
            if (hasStroke) {
                ctx.strokeText(line, pixelX, yPos);
            }

            // Text füllen
            ctx.fillText(line, pixelX, yPos);
        });

        // ✨ TYPEWRITER: Cursor zeichnen
        if (typewriterResult.showCursor && !typewriterResult.isComplete) {
            const lastLineIndex = lines.length - 1;
            const lastLine = lines[lastLineIndex] || '';
            const yPos = startY + (lastLineIndex * lineHeight);

            // Cursor-Position berechnen (nach dem letzten Zeichen)
            const lastLineWidth = ctx.measureText(lastLine).width;
            const letterSpacingExtra = (textObj.letterSpacing || 0) * Math.max(0, lastLine.length);

            let cursorX = pixelX;
            // Position basierend auf textAlign
            switch (textObj.textAlign) {
                case 'left':
                    cursorX = pixelX + lastLineWidth + letterSpacingExtra;
                    break;
                case 'right':
                    cursorX = pixelX;
                    break;
                case 'center':
                default:
                    cursorX = pixelX + (lastLineWidth + letterSpacingExtra) / 2;
                    break;
            }

            // Blinkender Cursor (500ms Intervall)
            const cursorVisible = Math.floor(Date.now() / 500) % 2 === 0;
            if (cursorVisible) {
                const cursorChar = typewriterResult.cursorChar || '|';
                ctx.fillText(cursorChar, cursorX, yPos);
            }
        }

        // 🔧 WICHTIG: Schatten und Filter explizit zurücksetzen VOR restore()
        this.resetShadow(ctx);
        ctx.filter = 'none';

        ctx.restore();
    }

    /**
     * ✨ NEU: Wendet Text-Stil mit Audio-Reaktiven Überschreibungen an
     */
    applyTextStyleWithAudio(ctx, textObj, audioReactive, useAudioGlow) {
        ctx.font = `${textObj.fontStyle} ${textObj.fontWeight} ${textObj.fontSize}px ${textObj.fontFamily}`;
        ctx.fillStyle = textObj.color;
        ctx.textAlign = textObj.textAlign;
        ctx.textBaseline = textObj.textBaseline;

        // ✨ BUCHSTABENABSTAND (statisch + audio-reaktiv)
        let letterSpacing = textObj.letterSpacing || 0;
        if (audioReactive && audioReactive.hasEffects && audioReactive.effects.letterSpacing) {
            letterSpacing += audioReactive.effects.letterSpacing.letterSpacing;
        }
        ctx.letterSpacing = `${letterSpacing}px`;

        // ✨ SCHATTEN / GLOW
        if (useAudioGlow && audioReactive.effects.glow) {
            // Audio-reaktiver Glow überschreibt statischen Schatten
            const glow = audioReactive.effects.glow;
            ctx.shadowColor = glow.glowColor;
            ctx.shadowBlur = glow.glowBlur;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else if (textObj.shadow.blur > 0 || textObj.shadow.offsetX !== 0 || textObj.shadow.offsetY !== 0) {
            // Statischer Schatten
            ctx.shadowColor = textObj.shadow.color;
            ctx.shadowBlur = textObj.shadow.blur;
            ctx.shadowOffsetX = textObj.shadow.offsetX;
            ctx.shadowOffsetY = textObj.shadow.offsetY;
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // ✨ KONTUR (statisch + audio-reaktiv)
        let strokeWidth = textObj.stroke.width || 2;
        let strokeEnabled = textObj.stroke.enabled;

        if (audioReactive && audioReactive.hasEffects && audioReactive.effects.strokeWidth) {
            // Audio-reaktive Kontur aktivieren und Breite setzen
            strokeEnabled = true;
            strokeWidth = Math.max(strokeWidth, audioReactive.effects.strokeWidth.strokeWidth);
        }

        if (strokeEnabled) {
            ctx.strokeStyle = textObj.stroke.color;
            ctx.lineWidth = strokeWidth;
            ctx.lineJoin = 'round';
        }
    }

    /**
     * Zeichnet alle Text-Objekte
     */
    drawAll(ctx) {
        this.textObjects.forEach(textObj => {
            this.drawText(ctx, textObj, ctx.canvas.width, ctx.canvas.height);
        });
    }

    /**
     * Alternative draw-Methode (für Kompatibilität mit älterem Code)
     * ✅ CRITICAL FIX: Error Handling hinzugefügt um Recording nicht zu brechen
     */
    draw(ctx, canvasWidth, canvasHeight) {
        this.textObjects.forEach(textObj => {
            try {
                this.drawText(ctx, textObj, canvasWidth, canvasHeight);
            } catch (error) {
                console.error('❌ [TextManager] Fehler beim Zeichnen von Text:', error);
                // Versuche den Canvas-State wiederherzustellen falls ctx.save() aufgerufen wurde
                try { ctx.restore(); } catch (e) { /* ignore */ }
            }
        });
    }

    /**
     * Aktualisiert eine Eigenschaft eines Text-Objekts
     */
    updateProperty(textObj, property, value) {
        if (!textObj) return;
        
        // Schatten-Eigenschaften
        if (property.startsWith('shadow.')) {
            const shadowProp = property.split('.')[1];
            textObj.shadow[shadowProp] = value;
        }
        // Kontur-Eigenschaften
        else if (property.startsWith('stroke.')) {
            const strokeProp = property.split('.')[1];
            textObj.stroke[strokeProp] = value;
        }
        // Normale Eigenschaften
        else {
            textObj[property] = value;
        }
    }

    /**
     * Gibt alle Text-Objekte zurück
     */
    getAllTexts() {
        return this.textObjects;
    }

    /**
     * Räumt alle Texte auf
     */
    clear() {
        this.textObjects = [];
    }

    // ═══════════════════════════════════════════════════════════════════
    // ✨ AUDIO-REAKTIVE EFFEKTE FÜR TEXT
    // ═══════════════════════════════════════════════════════════════════

    /**
     * ✨ Berechnet Audio-Reaktive Effekt-Werte basierend auf den aktuellen Audio-Daten
     * Unterstützt MEHRERE Effekte gleichzeitig
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
            case 'dynamic':
                // ✨ Dynamischer Modus: Gewichtete Mischung aller Frequenzbänder
                // basierend auf ihrer aktuellen Energie
                const bass = useSmooth ? audioData.smoothBass : audioData.bass;
                const mid = useSmooth ? audioData.smoothMid : audioData.mid;
                const treble = useSmooth ? audioData.smoothTreble : audioData.treble;

                // Gesamtenergie berechnen (mit Minimum um Division durch 0 zu vermeiden)
                const totalEnergy = Math.max(bass + mid + treble, 1);

                // Gewichte basierend auf aktueller Energie jedes Bands
                const bassWeight = bass / totalEnergy;
                const midWeight = mid / totalEnergy;
                const trebleWeight = treble / totalEnergy;

                // Gewichtete Mischung - die dominante Frequenz trägt am meisten bei
                let rawLevel = (bass * bassWeight) + (mid * midWeight) + (treble * trebleWeight);

                // ✨ Soft Compression: Verhindert konstantes Peaking bei lauter Musik (z.B. Techno)
                // Wurzelkurve erweitert den dynamischen Bereich - leise Teile werden verstärkt,
                // laute Teile werden komprimiert
                const normalized = rawLevel / 255;
                const compressed = Math.pow(normalized, 0.7); // 0.7 = sanfte Kompression
                audioLevel = compressed * 255 * 0.85; // 0.85 = leichte Dämpfung
                break;
        }

        // Basis Audio-Level normalisiert auf 0-1
        let baseLevel = audioLevel / 255;

        // ✨ NEU: Threshold anwenden (ignoriert leise Signale)
        const threshold = (audioSettings.threshold || 0) / 100;
        if (baseLevel < threshold) {
            baseLevel = 0;
        } else {
            // Skaliere den verbleibenden Bereich auf 0-1
            baseLevel = (baseLevel - threshold) / (1 - threshold);
        }

        // ✨ NEU: Attack/Release für smoothere Übergänge
        const attack = (audioSettings.attack || 90) / 100;
        const release = (audioSettings.release || 50) / 100;

        // Speichere letzten Level pro audioSettings (einfaches Caching)
        if (!this._lastAudioLevels) this._lastAudioLevels = new WeakMap();
        const lastLevel = this._lastAudioLevels.get(audioSettings) || 0;

        let smoothedLevel;
        if (baseLevel > lastLevel) {
            // Attack: schneller Anstieg
            smoothedLevel = lastLevel + (baseLevel - lastLevel) * attack;
        } else {
            // Release: langsameres Abklingen
            smoothedLevel = lastLevel + (baseLevel - lastLevel) * release;
        }
        this._lastAudioLevels.set(audioSettings, smoothedLevel);

        // Ergebnis-Objekt für alle aktivierten Effekte
        const result = {
            hasEffects: false,
            effects: {}
        };

        // Prüfe welche Effekte aktiviert sind
        const effects = audioSettings.effects;
        if (!effects) return null;

        // Berechne Werte für jeden aktivierten Effekt
        for (const [effectName, effectConfig] of Object.entries(effects)) {
            if (effectConfig && effectConfig.enabled) {
                const intensity = (effectConfig.intensity || 80) / 100;
                const normalizedLevel = smoothedLevel * intensity;

                result.hasEffects = true;
                result.effects[effectName] = this._calculateTextEffectValue(effectName, normalizedLevel, effectConfig);
            }
        }

        return result.hasEffects ? result : null;
    }

    /**
     * ✨ Berechnet den Wert für einen einzelnen Text-Effekt
     * @param {string} effectName - Name des Effekts
     * @param {number} normalizedLevel - Audio-Level normalisiert (0-1)
     * @param {object} effectConfig - Konfiguration des Effekts (enthält minimum, ease, etc.)
     */
    _calculateTextEffectValue(effectName, normalizedLevel, effectConfig = {}) {
        // ✨ NEU: Ease-Kurve anwenden (Ease-Out für natürlichere Animation)
        let level = normalizedLevel;
        if (effectConfig.ease) {
            // Ease-Out Cubic: schneller Start, sanftes Ende
            level = 1 - Math.pow(1 - normalizedLevel, 3);
        }

        switch (effectName) {
            case 'hue':
                // Hue-Rotation: 0-720 Grad (2x Durchlauf für stärkeren Effekt)
                return { hueRotate: level * 720 };
            case 'brightness':
                // Helligkeit: 60-180% basierend auf Audio-Level
                return { brightness: 60 + (level * 120) };
            case 'scale':
                // Skalierung: 1.0-1.5 basierend auf Audio-Level
                return { scale: 1.0 + (level * 0.5) };
            case 'glow':
                // Glow/Shadow: 0-50px basierend auf Audio-Level
                return {
                    glowBlur: level * 50,
                    glowColor: `rgba(139, 92, 246, ${0.5 + level * 0.5})`
                };
            case 'shake':
                // Erschütterung: Zufällige X/Y-Verschiebung bei hohem Audio-Level
                if (level > 0.2) {
                    const shakeIntensity = level * 15;
                    const shakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
                    const shakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
                    return { shakeX, shakeY };
                }
                return { shakeX: 0, shakeY: 0 };
            case 'bounce':
                // Vertikales Hüpfen: Sinuswelle + Audio-Level
                const timeBounce = Date.now() * 0.008;
                const bounceAmount = Math.abs(Math.sin(timeBounce)) * level * 30;
                return { bounceY: -bounceAmount };
            case 'swing':
                // Horizontales Pendeln: Sinuswelle für sanftes Hin-und-Her
                const timeSwing = Date.now() * 0.004;
                const swingAmount = Math.sin(timeSwing) * level * 40;
                return { swingX: swingAmount };
            case 'opacity':
                // ✨ NEU: Minimum-Wert für Opacity unterstützen
                const minimum = effectConfig.minimum || 0;
                // Opacity geht von minimum bis 100% basierend auf Audio-Level
                const opacityRange = 100 - minimum;
                return { opacity: minimum + (level * opacityRange) };
            case 'letterSpacing':
                // Dynamischer Buchstabenabstand: 0-30px basierend auf Audio-Level
                return { letterSpacing: level * 30 };
            case 'strokeWidth':
                // Pulsierende Kontur-Dicke: 0-10px basierend auf Audio-Level
                return { strokeWidth: level * 10 };
            default:
                return {};
        }
    }

    /**
     * ✨ NEU: Verschiebt ein Text-Objekt an die oberste Ebene (z-index)
     * Damit ist der Text immer anklickbar und sichtbar
     */
    moveToTop(textObj) {
        if (!textObj) return;

        const index = this.textObjects.findIndex(t => t.id === textObj.id);
        if (index === -1) return;

        // Entferne das Objekt aus der aktuellen Position
        this.textObjects.splice(index, 1);

        // Füge es am Ende hinzu (oberste Ebene)
        this.textObjects.push(textObj);
    }
}
