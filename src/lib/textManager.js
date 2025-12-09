/**
 * TextManager - Verwaltet Text-Objekte auf dem Canvas
 * Unterstützt: Schriftarten, Größen, Farben, Stile und SCHATTEN
 * ✅ FIXED: Präzise Textmarkierung mit Schatten-, Stroke- und letterSpacing-Unterstützung
 * ✨ NEU: Einblend-Animationen (Fade, Typewriter, Bounce, Slide)
 * ✨ NEU: Karaoke-Style Wort-für-Wort Hervorhebung
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

            // ✨ NEU: EINBLEND-ANIMATION
            animation: {
                type: options.animationType || 'none',  // 'none', 'fade', 'typewriter', 'bounce', 'slide'
                duration: options.animationDuration || 1000,  // ms
                delay: options.animationDelay || 0,  // ms Verzögerung vor Start
                direction: options.animationDirection || 'left',  // Für slide: 'left', 'right', 'top', 'bottom'
                startTime: null,  // Wird beim Start gesetzt
                isPlaying: false,
                hasPlayed: false,  // Einmal-Animation abgeschlossen
                loop: options.animationLoop || false,  // Animation wiederholen
                easing: options.animationEasing || 'easeOut'  // 'linear', 'easeIn', 'easeOut', 'easeInOut', 'bounce'
            },

            // ✨ NEU: KARAOKE-MODUS
            karaoke: {
                enabled: options.karaokeEnabled || false,
                wordsPerSecond: options.karaokeSpeed || 2,  // Wörter pro Sekunde
                highlightColor: options.karaokeHighlightColor || '#ffff00',
                startTime: null,  // Wird beim Start gesetzt
                currentWordIndex: 0,
                isPlaying: false
            },

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
                    glow: { enabled: false, intensity: 80 },
                    shake: { enabled: false, intensity: 80 },
                    bounce: { enabled: false, intensity: 80 },
                    swing: { enabled: false, intensity: 80 },
                    opacity: { enabled: false, intensity: 80, minimum: 0, ease: false },
                    letterSpacing: { enabled: false, intensity: 80 },
                    strokeWidth: { enabled: false, intensity: 80 }
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
     * Zeichnet einen einzelnen Text (mit Unterstützung für mehrzeilige Texte)
     * ✨ ERWEITERT: Unterstützt jetzt Audio-Reaktive Effekte
     * ✨ NEU: Einblend-Animationen und Karaoke-Modus
     */
    drawText(ctx, textObj, canvasWidth, canvasHeight) {
        if (!textObj.content) return;

        ctx.save();

        // ✨ ANIMATIONS-WERTE berechnen
        const animValues = this.calculateAnimationValues(textObj, canvasWidth, canvasHeight);

        // Überspringe das Zeichnen wenn Opacity 0 ist (Animation noch nicht gestartet)
        if (animValues.opacity <= 0) {
            ctx.restore();
            return;
        }

        // ✨ AUDIO-REAKTIVE WERTE berechnen
        const audioReactive = this.getAudioReactiveValues(textObj.audioReactive);

        // ✨ TRANSPARENZ/DECKKRAFT anwenden (0-100% → 0.0-1.0)
        let baseOpacity = (textObj.opacity !== undefined ? textObj.opacity : 100) / 100;

        // Audio-reaktive Opacity moduliert den Basis-Wert (statt ihn zu überschreiben)
        if (audioReactive && audioReactive.hasEffects && audioReactive.effects.opacity) {
            const audioModulation = audioReactive.effects.opacity.opacity / 100;
            baseOpacity = baseOpacity * audioModulation;
        }

        // ✨ Animations-Opacity multiplizieren
        baseOpacity = baseOpacity * animValues.opacity;
        ctx.globalAlpha = baseOpacity;

        // Basis-Position berechnen
        let pixelX = textObj.relX * canvasWidth;
        let pixelY = textObj.relY * canvasHeight;

        // ✨ Animations-Offset hinzufügen
        pixelX += animValues.offsetX;
        pixelY += animValues.offsetY;

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

        // ✨ Animations-Scale anwenden
        if (animValues.scale !== 1) {
            ctx.translate(pixelX, pixelY);
            ctx.scale(animValues.scale, animValues.scale);
            ctx.translate(-pixelX, -pixelY);
        }

        // Rotation anwenden
        const totalRotation = textObj.rotation || 0;
        if (totalRotation !== 0) {
            ctx.translate(pixelX, pixelY);
            ctx.rotate((totalRotation * Math.PI) / 180);
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

        // ✨ DYNAMISCHER ZEILENABSTAND (lineHeightMultiplier: 100-300%)
        const lineHeightMultiplier = (textObj.lineHeightMultiplier || 120) / 100;
        const lineHeight = textObj.fontSize * lineHeightMultiplier;

        // ✨ KARAOKE-MODUS: Zeichne mit Wort-für-Wort Hervorhebung
        if (textObj.karaoke && textObj.karaoke.enabled && textObj.karaoke.isPlaying) {
            this.drawKaraokeText(ctx, textObj, pixelX, pixelY, lineHeight);
            this.resetShadow(ctx);
            ctx.filter = 'none';
            ctx.restore();
            return;
        }

        // ✨ Mehrzeilige Texte unterstützen (Zeilenumbrüche mit \n)
        const lines = textObj.content.split('\n');

        // Berechne Start-Y-Position für zentrierte mehrzeilige Texte
        let startY = pixelY;
        if (lines.length > 1) {
            if (textObj.textBaseline === 'middle') {
                startY = pixelY - ((lines.length - 1) * lineHeight) / 2;
            }
        }

        // ✨ TYPEWRITER-ANIMATION: Zeichen-für-Zeichen
        if (animValues.visibleChars >= 0) {
            let charCount = 0;
            let currentLine = '';

            lines.forEach((line, lineIndex) => {
                const yPos = startY + (lineIndex * lineHeight);
                currentLine = '';

                for (let i = 0; i < line.length; i++) {
                    if (charCount < animValues.visibleChars) {
                        currentLine += line[i];
                        charCount++;
                    } else {
                        break;
                    }
                }

                if (currentLine.length > 0) {
                    // Kontur zeichnen
                    const hasStroke = textObj.stroke.enabled ||
                        (audioReactive && audioReactive.hasEffects && audioReactive.effects.strokeWidth);
                    if (hasStroke) {
                        ctx.strokeText(currentLine, pixelX, yPos);
                    }
                    // Text füllen
                    ctx.fillText(currentLine, pixelX, yPos);
                }

                // Zeile abgeschlossen (Zeilenumbruch zählt als Zeichen)
                charCount++;
            });
        } else {
            // Normal: Zeichne jede Zeile
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
     */
    draw(ctx, canvasWidth, canvasHeight) {
        this.textObjects.forEach(textObj => {
            this.drawText(ctx, textObj, canvasWidth, canvasHeight);
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

    // ═══════════════════════════════════════════════════════════════════
    // ✨ TEXT-ANIMATIONEN (Einblend-Effekte)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * ✨ Startet eine Animation für ein Text-Objekt
     */
    startAnimation(textObj) {
        if (!textObj || !textObj.animation) return;

        textObj.animation.startTime = Date.now();
        textObj.animation.isPlaying = true;
        textObj.animation.hasPlayed = false;
        console.log('🎬 [TextManager] Animation gestartet:', textObj.animation.type);
    }

    /**
     * ✨ Stoppt eine Animation
     */
    stopAnimation(textObj) {
        if (!textObj || !textObj.animation) return;

        textObj.animation.isPlaying = false;
        textObj.animation.startTime = null;
    }

    /**
     * ✨ Setzt eine Animation zurück
     */
    resetAnimation(textObj) {
        if (!textObj || !textObj.animation) return;

        textObj.animation.startTime = null;
        textObj.animation.isPlaying = false;
        textObj.animation.hasPlayed = false;
    }

    /**
     * ✨ Startet alle Animationen (für Recording-Start)
     */
    startAllAnimations() {
        this.textObjects.forEach(textObj => {
            if (textObj.animation && textObj.animation.type !== 'none') {
                this.startAnimation(textObj);
            }
            if (textObj.karaoke && textObj.karaoke.enabled) {
                this.startKaraoke(textObj);
            }
        });
    }

    /**
     * ✨ Stoppt alle Animationen
     */
    stopAllAnimations() {
        this.textObjects.forEach(textObj => {
            this.stopAnimation(textObj);
            this.stopKaraoke(textObj);
        });
    }

    /**
     * ✨ Berechnet den Animations-Fortschritt (0-1)
     */
    getAnimationProgress(textObj) {
        if (!textObj || !textObj.animation || !textObj.animation.startTime) {
            return textObj?.animation?.hasPlayed ? 1 : 0;
        }

        const now = Date.now();
        const elapsed = now - textObj.animation.startTime - (textObj.animation.delay || 0);

        if (elapsed < 0) return 0;  // Noch in der Verzögerungsphase

        const progress = Math.min(1, elapsed / textObj.animation.duration);

        // Animation beendet?
        if (progress >= 1) {
            if (textObj.animation.loop) {
                // Loop: Zurücksetzen
                textObj.animation.startTime = now;
                return 0;
            } else {
                textObj.animation.isPlaying = false;
                textObj.animation.hasPlayed = true;
            }
        }

        return progress;
    }

    /**
     * ✨ Easing-Funktionen für flüssige Animationen
     */
    applyEasing(progress, easing) {
        switch (easing) {
            case 'linear':
                return progress;
            case 'easeIn':
                return progress * progress;
            case 'easeOut':
                return 1 - Math.pow(1 - progress, 2);
            case 'easeInOut':
                return progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            case 'bounce':
                if (progress < 1 / 2.75) {
                    return 7.5625 * progress * progress;
                } else if (progress < 2 / 2.75) {
                    const p = progress - 1.5 / 2.75;
                    return 7.5625 * p * p + 0.75;
                } else if (progress < 2.5 / 2.75) {
                    const p = progress - 2.25 / 2.75;
                    return 7.5625 * p * p + 0.9375;
                } else {
                    const p = progress - 2.625 / 2.75;
                    return 7.5625 * p * p + 0.984375;
                }
            case 'elastic':
                if (progress === 0 || progress === 1) return progress;
                return Math.pow(2, -10 * progress) * Math.sin((progress - 0.1) * 5 * Math.PI) + 1;
            default:
                return progress;
        }
    }

    /**
     * ✨ Berechnet Animations-Werte basierend auf Typ und Fortschritt
     */
    calculateAnimationValues(textObj, canvasWidth, canvasHeight) {
        const anim = textObj.animation;
        if (!anim || anim.type === 'none') {
            return { opacity: 1, offsetX: 0, offsetY: 0, scale: 1, visibleChars: -1 };
        }

        const rawProgress = this.getAnimationProgress(textObj);
        const progress = this.applyEasing(rawProgress, anim.easing);

        switch (anim.type) {
            case 'fade':
                return {
                    opacity: progress,
                    offsetX: 0,
                    offsetY: 0,
                    scale: 1,
                    visibleChars: -1
                };

            case 'typewriter':
                const totalChars = textObj.content.replace(/\n/g, '').length;
                const visibleChars = Math.floor(totalChars * progress);
                return {
                    opacity: 1,
                    offsetX: 0,
                    offsetY: 0,
                    scale: 1,
                    visibleChars: visibleChars
                };

            case 'bounce':
                // Einfallen von oben mit Bounce
                const bounceOffset = (1 - progress) * canvasHeight * 0.5;
                return {
                    opacity: Math.min(1, progress * 2),
                    offsetX: 0,
                    offsetY: -bounceOffset,
                    scale: 1,
                    visibleChars: -1
                };

            case 'slide':
                let slideX = 0, slideY = 0;
                const slideDistance = canvasWidth * 0.3;

                switch (anim.direction) {
                    case 'left':
                        slideX = -(1 - progress) * slideDistance;
                        break;
                    case 'right':
                        slideX = (1 - progress) * slideDistance;
                        break;
                    case 'top':
                        slideY = -(1 - progress) * (canvasHeight * 0.3);
                        break;
                    case 'bottom':
                        slideY = (1 - progress) * (canvasHeight * 0.3);
                        break;
                }
                return {
                    opacity: progress,
                    offsetX: slideX,
                    offsetY: slideY,
                    scale: 1,
                    visibleChars: -1
                };

            case 'scale':
                return {
                    opacity: 1,
                    offsetX: 0,
                    offsetY: 0,
                    scale: progress,
                    visibleChars: -1
                };

            case 'zoom':
                // Von groß nach normal
                const zoomScale = 1 + (1 - progress) * 0.5;
                return {
                    opacity: progress,
                    offsetX: 0,
                    offsetY: 0,
                    scale: zoomScale,
                    visibleChars: -1
                };

            default:
                return { opacity: 1, offsetX: 0, offsetY: 0, scale: 1, visibleChars: -1 };
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ✨ KARAOKE-MODUS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * ✨ Startet den Karaoke-Modus für ein Text-Objekt
     */
    startKaraoke(textObj) {
        if (!textObj || !textObj.karaoke) return;

        textObj.karaoke.startTime = Date.now();
        textObj.karaoke.isPlaying = true;
        textObj.karaoke.currentWordIndex = 0;
        console.log('🎤 [TextManager] Karaoke gestartet');
    }

    /**
     * ✨ Stoppt den Karaoke-Modus
     */
    stopKaraoke(textObj) {
        if (!textObj || !textObj.karaoke) return;

        textObj.karaoke.isPlaying = false;
        textObj.karaoke.startTime = null;
    }

    /**
     * ✨ Berechnet den aktuellen Wort-Index für Karaoke
     */
    getKaraokeWordIndex(textObj) {
        if (!textObj || !textObj.karaoke || !textObj.karaoke.startTime) {
            return -1;
        }

        const elapsed = (Date.now() - textObj.karaoke.startTime) / 1000;  // Sekunden
        const wordsPerSecond = textObj.karaoke.wordsPerSecond || 2;
        const words = textObj.content.split(/\s+/);
        const wordIndex = Math.floor(elapsed * wordsPerSecond);

        return Math.min(wordIndex, words.length - 1);
    }

    /**
     * ✨ Zeichnet Text mit Karaoke-Hervorhebung (Wort für Wort)
     */
    drawKaraokeText(ctx, textObj, pixelX, pixelY, lineHeight) {
        if (!textObj.karaoke || !textObj.karaoke.enabled) return false;

        const currentWordIndex = this.getKaraokeWordIndex(textObj);
        if (currentWordIndex < 0) return false;

        const words = textObj.content.split(/\s+/);
        const highlightColor = textObj.karaoke.highlightColor || '#ffff00';
        const normalColor = textObj.color;

        // Berechne die Position für jedes Wort
        let currentX = pixelX;
        const spaceWidth = ctx.measureText(' ').width;

        // Bei zentriertem Text: Berechne Gesamtbreite zuerst
        if (textObj.textAlign === 'center') {
            const totalWidth = ctx.measureText(textObj.content).width;
            currentX = pixelX - totalWidth / 2;
        } else if (textObj.textAlign === 'right') {
            const totalWidth = ctx.measureText(textObj.content).width;
            currentX = pixelX - totalWidth;
        }

        // Zeichne jedes Wort einzeln
        words.forEach((word, index) => {
            // Setze Farbe basierend auf Index
            if (index <= currentWordIndex) {
                ctx.fillStyle = highlightColor;
                // Optional: Glow für hervorgehobene Wörter
                ctx.shadowColor = highlightColor;
                ctx.shadowBlur = 10;
            } else {
                ctx.fillStyle = normalColor;
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }

            // Zeichne das Wort
            ctx.fillText(word, currentX, pixelY);

            // Berechne Position für nächstes Wort
            currentX += ctx.measureText(word).width + spaceWidth;
        });

        // Schatten zurücksetzen
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        return true;  // Karaoke wurde gezeichnet
    }
}
