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
            color: options.color || '#ffffff',
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
            rotation: options.rotation || 0
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
     */
    drawText(ctx, textObj, canvasWidth, canvasHeight) {
        if (!textObj.content) return;
        
        ctx.save();
        
        // ✨ TRANSPARENZ/DECKKRAFT anwenden (0-100% → 0.0-1.0)
        ctx.globalAlpha = (textObj.opacity || 100) / 100;
        
        const pixelX = textObj.relX * canvasWidth;
        const pixelY = textObj.relY * canvasHeight;
        
        // Rotation anwenden
        if (textObj.rotation !== 0) {
            ctx.translate(pixelX, pixelY);
            ctx.rotate((textObj.rotation * Math.PI) / 180);
            ctx.translate(-pixelX, -pixelY);
        }
        
        this.applyTextStyle(ctx, textObj);
        
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
            
            // ✨ KONTUR zeichnen (wenn aktiviert)
            if (textObj.stroke.enabled) {
                ctx.strokeText(line, pixelX, yPos);
            }
            
            // Text füllen
            ctx.fillText(line, pixelX, yPos);
        });
        
        // 🔧 WICHTIG: Schatten explizit zurücksetzen VOR restore()
        // Verhindert "Schatten-Lecks" auf nachfolgende Canvas-Elemente
        this.resetShadow(ctx);
        
        ctx.restore();
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
