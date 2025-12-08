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
                effects: {
                    hue: { enabled: false, intensity: 80 },
                    brightness: { enabled: false, intensity: 80 },
                    scale: { enabled: false, intensity: 80 },
                    glow: { enabled: false, intensity: 80 },
                    shake: { enabled: false, intensity: 80 },
                    bounce: { enabled: false, intensity: 80 },
                    swing: { enabled: false, intensity: 80 },
                    opacity: { enabled: false, intensity: 80 },
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
     */
    drawText(ctx, textObj, canvasWidth, canvasHeight) {
        if (!textObj.content) return;

        ctx.save();

        // ✨ AUDIO-REAKTIVE WERTE berechnen
        const audioReactive = this.getAudioReactiveValues(textObj.audioReactive);

        // ✨ TRANSPARENZ/DECKKRAFT anwenden (0-100% → 0.0-1.0)
        let baseOpacity = (textObj.opacity !== undefined ? textObj.opacity : 100) / 100;

        // Audio-reaktive Opacity überschreiben
        if (audioReactive && audioReactive.hasEffects && audioReactive.effects.opacity) {
            baseOpacity = audioReactive.effects.opacity.opacity / 100;
        }
        ctx.globalAlpha = baseOpacity;

        // Basis-Position berechnen
        let pixelX = textObj.relX * canvasWidth;
        let pixelY = textObj.relY * canvasHeight;

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

        // ✨ Mehrzeilige Texte unterstützen (Zeilenumbrüche mit \n)
        const lines = textObj.content.split('\n');

        // ✨ DYNAMISCHER ZEILENABSTAND (lineHeightMultiplier: 100-300%)
        const lineHeightMultiplier = (textObj.lineHeightMultiplier || 120) / 100;
        const lineHeight = textObj.fontSize * lineHeightMultiplier;

        // Berechne Start-Y-Position für zentrierte mehrzeilige Texte
        let startY = pixelY;
        if (lines.length > 1) {
            // Wenn textBaseline 'middle' ist, verschiebe nach oben um die halbe Gesamthöhe
            if (textObj.textBaseline === 'middle') {
                startY = pixelY - ((lines.length - 1) * lineHeight) / 2;
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
        const baseLevel = audioLevel / 255;

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
                const normalizedLevel = baseLevel * intensity;

                result.hasEffects = true;
                result.effects[effectName] = this._calculateTextEffectValue(effectName, normalizedLevel);
            }
        }

        return result.hasEffects ? result : null;
    }

    /**
     * ✨ Berechnet den Wert für einen einzelnen Text-Effekt
     */
    _calculateTextEffectValue(effectName, normalizedLevel) {
        switch (effectName) {
            case 'hue':
                // Hue-Rotation: 0-720 Grad (2x Durchlauf für stärkeren Effekt)
                return { hueRotate: normalizedLevel * 720 };
            case 'brightness':
                // Helligkeit: 60-180% basierend auf Audio-Level
                return { brightness: 60 + (normalizedLevel * 120) };
            case 'scale':
                // Skalierung: 1.0-1.5 basierend auf Audio-Level
                return { scale: 1.0 + (normalizedLevel * 0.5) };
            case 'glow':
                // Glow/Shadow: 0-50px basierend auf Audio-Level
                return {
                    glowBlur: normalizedLevel * 50,
                    glowColor: `rgba(139, 92, 246, ${0.5 + normalizedLevel * 0.5})`
                };
            case 'shake':
                // Erschütterung: Zufällige X/Y-Verschiebung bei hohem Audio-Level
                if (normalizedLevel > 0.2) {
                    const shakeIntensity = normalizedLevel * 15;
                    const shakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
                    const shakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
                    return { shakeX, shakeY };
                }
                return { shakeX: 0, shakeY: 0 };
            case 'bounce':
                // Vertikales Hüpfen: Sinuswelle + Audio-Level
                const timeBounce = Date.now() * 0.008;
                const bounceAmount = Math.abs(Math.sin(timeBounce)) * normalizedLevel * 30;
                return { bounceY: -bounceAmount };
            case 'swing':
                // Horizontales Pendeln: Sinuswelle für sanftes Hin-und-Her
                const timeSwing = Date.now() * 0.004;
                const swingAmount = Math.sin(timeSwing) * normalizedLevel * 40;
                return { swingX: swingAmount };
            case 'opacity':
                // Pulsierende Deckkraft: 30-100% basierend auf Audio-Level
                return { opacity: 30 + (normalizedLevel * 70) };
            case 'letterSpacing':
                // Dynamischer Buchstabenabstand: 0-30px basierend auf Audio-Level
                return { letterSpacing: normalizedLevel * 30 };
            case 'strokeWidth':
                // Pulsierende Kontur-Dicke: 0-10px basierend auf Audio-Level
                return { strokeWidth: normalizedLevel * 10 };
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
