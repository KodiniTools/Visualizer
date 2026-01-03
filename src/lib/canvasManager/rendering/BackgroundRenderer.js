// BackgroundRenderer.js - Hintergrund-Rendering (Farben, Bilder, Videos, Tiles, Gradienten)

/**
 * BackgroundRenderer - Verantwortlich für das Zeichnen aller Hintergrund-Elemente
 *
 * Funktionen:
 * - Farbhintergrund mit Gradienten
 * - Bild-Hintergrund mit Filtern
 * - Video-Hintergrund
 * - Workspace-Hintergrund
 * - Kachel-Hintergrund (Tiles)
 * - Audio-reaktive Effekte
 */
export class BackgroundRenderer {
    constructor(canvasManager) {
        this.manager = canvasManager;
    }

    /**
     * Zeichnet den kompletten Hintergrund (Farbe, Bild, Video, Tiles)
     */
    drawBackground(ctx) {
        // 1. GLOBAL BACKGROUND (Color or Image with Filters)
        if (typeof this.manager.background === 'string') {
            this._drawColorBackground(ctx);
        } else if (this.manager.background && typeof this.manager.background === 'object') {
            this._drawImageBackground(ctx);
        } else {
            // Fallback: Weißer Hintergrund wenn nichts gesetzt
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        // 1.2 VIDEO-HINTERGRUND zeichnen (über Farb-/Bild-Hintergrund)
        if (this.manager.videoBackground && this.manager.videoBackground.videoElement) {
            this._drawVideoBackground(ctx);
        }

        // 1.5 KACHELN über dem Haupthintergrund zeichnen (falls aktiviert)
        this.drawBackgroundTiles(ctx);

        // 2. WORKSPACE BACKGROUND
        if (this.manager.workspaceBackground && this.manager.workspacePreset) {
            this._drawWorkspaceImageBackground(ctx);
        }

        // 2.5 WORKSPACE-VIDEO-HINTERGRUND zeichnen
        if (this.manager.workspaceVideoBackground && this.manager.workspaceVideoBackground.videoElement && this.manager.workspacePreset) {
            this._drawWorkspaceVideoBackground(ctx);
        }
    }

    /**
     * Zeichnet einen Farbhintergrund mit optionalem Gradient
     */
    _drawColorBackground(ctx) {
        ctx.save();

        // Audio-Reaktive Effekte auf Hintergrundfarbe anwenden
        const bgColorAudioReactive = this.manager._getAudioReactiveValues(this.manager.backgroundColorSettings);
        if (bgColorAudioReactive && bgColorAudioReactive.hasEffects) {
            this.manager._applyAudioReactiveFilters(ctx, bgColorAudioReactive);
        }

        // GRADIENT: Prüfen ob Gradient aktiviert ist
        if (this.manager.gradientSettings && this.manager.gradientSettings.enabled) {
            const w = ctx.canvas.width;
            const h = ctx.canvas.height;
            const centerX = w / 2;
            const centerY = h / 2;
            let gradient;

            // Audio-reaktive Gradient-Werte holen
            let gradientRadius = 1.0;
            let gradientAngle = this.manager.gradientSettings.angle || 0;

            if (bgColorAudioReactive && bgColorAudioReactive.hasEffects) {
                if (bgColorAudioReactive.effects.gradientPulse) {
                    gradientRadius = bgColorAudioReactive.effects.gradientPulse.gradientRadius;
                }
                if (bgColorAudioReactive.effects.gradientRotation) {
                    gradientAngle += bgColorAudioReactive.effects.gradientRotation.gradientAngle;
                }
            }

            if (this.manager.gradientSettings.type === 'radial') {
                // Radialer Gradient vom Zentrum
                const maxRadius = Math.max(w, h) * gradientRadius;
                gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
            } else {
                // Linearer Gradient mit Winkel
                const angleRad = (gradientAngle * Math.PI) / 180;
                const length = Math.max(w, h);
                const dx = Math.cos(angleRad) * length;
                const dy = Math.sin(angleRad) * length;
                gradient = ctx.createLinearGradient(
                    centerX - dx / 2, centerY - dy / 2,
                    centerX + dx / 2, centerY + dy / 2
                );
            }

            gradient.addColorStop(0, this.manager.background);
            gradient.addColorStop(1, this.manager.gradientSettings.color2);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = this.manager.background;
        }

        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    /**
     * Zeichnet einen Bild-Hintergrund
     */
    _drawImageBackground(ctx) {
        ctx.save();

        // Statische Filter vom FotoManager
        if (this.manager.fotoManager && this.manager.background.type === 'background') {
            this.manager.fotoManager.applyFilters(ctx, this.manager.background);
        }

        // Audio-Reaktive Effekte für Hintergrundbild
        const bgAudioReactive = this.manager._getAudioReactiveValues(this.manager.background.fotoSettings?.audioReactive);
        if (bgAudioReactive && bgAudioReactive.hasEffects) {
            this.manager._applyAudioReactiveFilters(ctx, bgAudioReactive);
        }

        const img = this.manager.background.imageObject || this.manager.background;

        // Scale-Effekt für Hintergrundbild
        let drawX = 0, drawY = 0, drawW = ctx.canvas.width, drawH = ctx.canvas.height;
        if (bgAudioReactive && bgAudioReactive.effects.scale) {
            const scale = bgAudioReactive.effects.scale.scale;
            const centerX = ctx.canvas.width / 2;
            const centerY = ctx.canvas.height / 2;
            drawW = ctx.canvas.width * scale;
            drawH = ctx.canvas.height * scale;
            drawX = centerX - drawW / 2;
            drawY = centerY - drawH / 2;
        }

        // FLIP anwenden (Horizontal und/oder Vertikal spiegeln)
        const bgFlipH = this.manager.background.fotoSettings?.flipH || false;
        const bgFlipV = this.manager.background.fotoSettings?.flipV || false;
        if (bgFlipH || bgFlipV) {
            const centerX = drawX + drawW / 2;
            const centerY = drawY + drawH / 2;
            ctx.translate(centerX, centerY);
            ctx.scale(bgFlipH ? -1 : 1, bgFlipV ? -1 : 1);
            ctx.translate(-centerX, -centerY);
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        if (this.manager.fotoManager && this.manager.background.type === 'background') {
            this.manager.fotoManager.resetFilters(ctx);
        }

        ctx.restore();
    }

    /**
     * Zeichnet einen Video-Hintergrund
     */
    _drawVideoBackground(ctx) {
        const video = this.manager.videoBackground.videoElement;
        if (video.readyState < 2) return; // HAVE_CURRENT_DATA

        ctx.save();

        // Filter anwenden
        if (this.manager.fotoManager) {
            this.manager.fotoManager.applyFilters(ctx, this.manager.videoBackground);
        }

        // Audio-Reaktive Effekte
        const vbgAudioReactive = this.manager._getAudioReactiveValues(this.manager.videoBackground.fotoSettings?.audioReactive);
        if (vbgAudioReactive && vbgAudioReactive.hasEffects) {
            this.manager._applyAudioReactiveFilters(ctx, vbgAudioReactive);
        }

        // Video auf gesamten Canvas zeichnen (Cover-Modus)
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = ctx.canvas.width / ctx.canvas.height;

        let drawX = 0, drawY = 0, drawW = ctx.canvas.width, drawH = ctx.canvas.height;

        if (videoAspect > canvasAspect) {
            // Video ist breiter - an Höhe anpassen
            drawH = ctx.canvas.height;
            drawW = drawH * videoAspect;
            drawX = (ctx.canvas.width - drawW) / 2;
        } else {
            // Video ist höher - an Breite anpassen
            drawW = ctx.canvas.width;
            drawH = drawW / videoAspect;
            drawY = (ctx.canvas.height - drawH) / 2;
        }

        // Scale-Effekt
        if (vbgAudioReactive && vbgAudioReactive.effects && vbgAudioReactive.effects.scale) {
            const scale = vbgAudioReactive.effects.scale.scale;
            const centerX = ctx.canvas.width / 2;
            const centerY = ctx.canvas.height / 2;
            drawW *= scale;
            drawH *= scale;
            drawX = centerX - drawW / 2;
            drawY = centerY - drawH / 2;
        }

        ctx.drawImage(video, drawX, drawY, drawW, drawH);

        if (this.manager.fotoManager) {
            this.manager.fotoManager.resetFilters(ctx);
        }

        ctx.restore();
    }

    /**
     * Zeichnet den Workspace-Bild-Hintergrund
     */
    _drawWorkspaceImageBackground(ctx) {
        const workspaceBounds = this.manager.getWorkspaceBounds();
        if (!workspaceBounds) return;

        ctx.save();

        // Statische Filter
        if (this.manager.fotoManager) {
            this.manager.fotoManager.applyFilters(ctx, this.manager.workspaceBackground);
        }

        // Audio-Reaktive Effekte
        const wsAudioReactive = this.manager._getAudioReactiveValues(this.manager.workspaceBackground.fotoSettings?.audioReactive);
        if (wsAudioReactive && wsAudioReactive.hasEffects) {
            this.manager._applyAudioReactiveFilters(ctx, wsAudioReactive);
        }

        const img = this.manager.workspaceBackground.imageObject;

        // Scale-Effekt für Workspace-Hintergrund
        let drawBounds = { ...workspaceBounds };
        if (wsAudioReactive && wsAudioReactive.effects.scale) {
            const scale = wsAudioReactive.effects.scale.scale;
            const centerX = workspaceBounds.x + workspaceBounds.width / 2;
            const centerY = workspaceBounds.y + workspaceBounds.height / 2;
            drawBounds.width = workspaceBounds.width * scale;
            drawBounds.height = workspaceBounds.height * scale;
            drawBounds.x = centerX - drawBounds.width / 2;
            drawBounds.y = centerY - drawBounds.height / 2;
        }

        // FLIP anwenden (Horizontal und/oder Vertikal spiegeln)
        const wsFlipH = this.manager.workspaceBackground.fotoSettings?.flipH || false;
        const wsFlipV = this.manager.workspaceBackground.fotoSettings?.flipV || false;
        if (wsFlipH || wsFlipV) {
            const centerX = drawBounds.x + drawBounds.width / 2;
            const centerY = drawBounds.y + drawBounds.height / 2;
            ctx.translate(centerX, centerY);
            ctx.scale(wsFlipH ? -1 : 1, wsFlipV ? -1 : 1);
            ctx.translate(-centerX, -centerY);
        }

        ctx.drawImage(
            img,
            drawBounds.x,
            drawBounds.y,
            drawBounds.width,
            drawBounds.height
        );

        if (this.manager.fotoManager) {
            this.manager.fotoManager.resetFilters(ctx);
        }

        ctx.restore();
    }

    /**
     * Zeichnet den Workspace-Video-Hintergrund
     */
    _drawWorkspaceVideoBackground(ctx) {
        const video = this.manager.workspaceVideoBackground.videoElement;
        const workspaceBounds = this.manager.getWorkspaceBounds();

        if (video.readyState < 2 || !workspaceBounds) return;

        ctx.save();

        // Filter anwenden
        if (this.manager.fotoManager) {
            this.manager.fotoManager.applyFilters(ctx, this.manager.workspaceVideoBackground);
        }

        // Audio-Reaktive Effekte
        const wsvbgAudioReactive = this.manager._getAudioReactiveValues(this.manager.workspaceVideoBackground.fotoSettings?.audioReactive);
        if (wsvbgAudioReactive && wsvbgAudioReactive.hasEffects) {
            this.manager._applyAudioReactiveFilters(ctx, wsvbgAudioReactive);
        }

        // Video im Workspace-Bereich zeichnen (Cover-Modus)
        const videoAspect = video.videoWidth / video.videoHeight;
        const wsAspect = workspaceBounds.width / workspaceBounds.height;

        let drawX = workspaceBounds.x;
        let drawY = workspaceBounds.y;
        let drawW = workspaceBounds.width;
        let drawH = workspaceBounds.height;

        if (videoAspect > wsAspect) {
            drawH = workspaceBounds.height;
            drawW = drawH * videoAspect;
            drawX = workspaceBounds.x + (workspaceBounds.width - drawW) / 2;
        } else {
            drawW = workspaceBounds.width;
            drawH = drawW / videoAspect;
            drawY = workspaceBounds.y + (workspaceBounds.height - drawH) / 2;
        }

        // Scale-Effekt
        if (wsvbgAudioReactive && wsvbgAudioReactive.effects && wsvbgAudioReactive.effects.scale) {
            const scale = wsvbgAudioReactive.effects.scale.scale;
            const centerX = workspaceBounds.x + workspaceBounds.width / 2;
            const centerY = workspaceBounds.y + workspaceBounds.height / 2;
            drawW *= scale;
            drawH *= scale;
            drawX = centerX - drawW / 2;
            drawY = centerY - drawH / 2;
        }

        // Clip auf Workspace-Bereich
        ctx.beginPath();
        ctx.rect(workspaceBounds.x, workspaceBounds.y, workspaceBounds.width, workspaceBounds.height);
        ctx.clip();

        ctx.drawImage(video, drawX, drawY, drawW, drawH);

        if (this.manager.fotoManager) {
            this.manager.fotoManager.resetFilters(ctx);
        }

        ctx.restore();
    }

    /**
     * Zeichnet Kachel-Hintergrund
     * Wird aufgerufen wenn tilesEnabled im Store aktiviert ist
     */
    drawBackgroundTiles(ctx) {
        if (!this.manager.backgroundTilesStore) return false;

        const store = this.manager.backgroundTilesStore;
        if (!store.tilesEnabled || store.tiles.length === 0) return false;

        const { rows, cols } = store.gridLayout;
        const gap = store.tileGap;
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;

        // Kachelgröße berechnen (mit Lücken)
        const totalGapX = gap * (cols - 1);
        const totalGapY = gap * (rows - 1);
        const tileWidth = (canvasWidth - totalGapX) / cols;
        const tileHeight = (canvasHeight - totalGapY) / rows;

        let tileIndex = 0;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (tileIndex >= store.tiles.length) break;

                const tile = store.tiles[tileIndex];
                const x = col * (tileWidth + gap);
                const y = row * (tileHeight + gap);

                ctx.save();

                // Kachel-Bereich clippen
                ctx.beginPath();
                ctx.rect(x, y, tileWidth, tileHeight);
                ctx.clip();

                // Audio-Reaktive Werte für diese Kachel berechnen
                const audioReactive = this.manager._getAudioReactiveValues(tile.audioReactive);

                // 1. Hintergrundfarbe der Kachel zeichnen
                if (tile.backgroundColor) {
                    ctx.globalAlpha = tile.backgroundOpacity || 1.0;

                    // Audio-Reaktive Effekte auf Hintergrundfarbe anwenden
                    if (audioReactive && audioReactive.hasEffects) {
                        this.manager._applyAudioReactiveFilters(ctx, audioReactive);
                    }

                    ctx.fillStyle = tile.backgroundColor;
                    ctx.fillRect(x, y, tileWidth, tileHeight);

                    // Filter und Alpha zurücksetzen für Bild
                    ctx.filter = 'none';
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 1.0;
                }

                // 2. Bild oder Video der Kachel zeichnen (falls vorhanden)
                const mediaElement = tile.video || tile.image;
                const isVideo = !!tile.video;

                if (mediaElement && (isVideo ? mediaElement.readyState >= 2 : mediaElement.complete)) {
                    const settings = tile.imageSettings || {};

                    // Statische Filter anwenden
                    let filterString = store.getTileImageFilter(tileIndex);

                    // Audio-Reaktive Filter hinzufügen
                    if (audioReactive && audioReactive.hasEffects) {
                        const effects = audioReactive.effects;
                        if (effects.hue) {
                            filterString += ` hue-rotate(${effects.hue.hueRotate}deg)`;
                        }
                        if (effects.brightness) {
                            filterString += ` brightness(${effects.brightness.brightness}%)`;
                        }
                        if (effects.saturation) {
                            filterString += ` saturate(${effects.saturation.saturation}%)`;
                        }
                        if (effects.blur) {
                            filterString += ` blur(${effects.blur.blur}px)`;
                        }
                        if (effects.glow) {
                            ctx.shadowColor = effects.glow.glowColor;
                            ctx.shadowBlur = effects.glow.glowBlur;
                            ctx.shadowOffsetX = 0;
                            ctx.shadowOffsetY = 0;
                        }
                    }

                    if (filterString.trim()) {
                        ctx.filter = filterString.trim();
                    }

                    // Deckkraft
                    ctx.globalAlpha = (settings.opacity || 100) / 100;

                    // Skalierung und Offset (inkl. Audio-reaktive Skalierung)
                    let scale = settings.scale || 1.0;
                    if (audioReactive && audioReactive.effects.scale) {
                        scale *= audioReactive.effects.scale.scale;
                    }
                    const offsetX = settings.offsetX || 0;
                    const offsetY = settings.offsetY || 0;

                    // Media-Aspektratio beibehalten (Cover-Modus)
                    const mediaWidth = isVideo ? mediaElement.videoWidth : mediaElement.width;
                    const mediaHeight = isVideo ? mediaElement.videoHeight : mediaElement.height;
                    const mediaAspect = mediaWidth / mediaHeight;
                    const tileAspect = tileWidth / tileHeight;

                    let drawWidth, drawHeight, drawX, drawY;

                    if (mediaAspect > tileAspect) {
                        // Media ist breiter - Höhe anpassen
                        drawHeight = tileHeight * scale;
                        drawWidth = drawHeight * mediaAspect;
                    } else {
                        // Media ist höher - Breite anpassen
                        drawWidth = tileWidth * scale;
                        drawHeight = drawWidth / mediaAspect;
                    }

                    // Zentrieren mit Offset
                    drawX = x + (tileWidth - drawWidth) / 2 + offsetX;
                    drawY = y + (tileHeight - drawHeight) / 2 + offsetY;

                    ctx.drawImage(mediaElement, drawX, drawY, drawWidth, drawHeight);

                    // Filter zurücksetzen
                    ctx.filter = 'none';
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 1.0;
                }

                ctx.restore();

                // Auswahlrahmen zeichnen wenn Kachel ausgewählt ist
                // NICHT während Recording zeichnen (UI-Element)
                if (!this.manager.isRecording && store.selectedTileIndex === tileIndex) {
                    ctx.save();
                    ctx.strokeStyle = '#6ea8fe';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([8, 4]);
                    ctx.strokeRect(x + 1.5, y + 1.5, tileWidth - 3, tileHeight - 3);
                    ctx.setLineDash([]);

                    // Kachel-Nummer anzeigen
                    ctx.fillStyle = 'rgba(110, 168, 254, 0.9)';
                    ctx.font = 'bold 16px Arial';
                    const label = `Kachel ${tileIndex + 1}`;
                    const textWidth = ctx.measureText(label).width;
                    ctx.fillRect(x + 5, y + 5, textWidth + 12, 24);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(label, x + 11, y + 22);
                    ctx.restore();
                }

                tileIndex++;
            }
        }

        return true; // Kacheln wurden gezeichnet
    }

    /**
     * Prüft ob ein Punkt innerhalb einer Kachel liegt
     * Gibt den Kachel-Index zurück oder -1
     */
    getTileAtPosition(x, y) {
        if (!this.manager.backgroundTilesStore) return -1;

        const store = this.manager.backgroundTilesStore;
        if (!store.tilesEnabled || store.tiles.length === 0) return -1;

        const { rows, cols } = store.gridLayout;
        const gap = store.tileGap;
        const canvasWidth = this.manager.canvas.width;
        const canvasHeight = this.manager.canvas.height;

        const totalGapX = gap * (cols - 1);
        const totalGapY = gap * (rows - 1);
        const tileWidth = (canvasWidth - totalGapX) / cols;
        const tileHeight = (canvasHeight - totalGapY) / rows;

        let tileIndex = 0;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (tileIndex >= store.tiles.length) return -1;

                const tileX = col * (tileWidth + gap);
                const tileY = row * (tileHeight + gap);

                if (x >= tileX && x < tileX + tileWidth &&
                    y >= tileY && y < tileY + tileHeight) {
                    return tileIndex;
                }

                tileIndex++;
            }
        }

        return -1;
    }
}
