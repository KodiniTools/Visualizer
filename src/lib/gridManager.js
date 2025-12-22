// gridManager.js - Grid-Overlay System für Canvas

export class GridManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isVisible = false;
        this.gridSize = 50; // Standard-Rastergröße in Pixeln
        this.gridColor = 'rgba(255, 255, 255, 0.3)';
        this.snapToGrid = false;
        this.snapTolerance = 10; // Pixel-Toleranz für Snap-to-Grid
    }

    /**
     * ✅ KRITISCHER FIX: Aktualisiert die Canvas-Referenz
     * Wird aufgerufen, wenn das DOM-Canvas sich vom gespeicherten Canvas unterscheidet
     * (z.B. nach einem direkten Page-Refresh)
     */
    updateCanvas(newCanvas) {
        if (newCanvas && newCanvas !== this.canvas) {
            console.log('[GridManager] Canvas-Referenz aktualisiert');
            this.canvas = newCanvas;
            return true;
        }
        return false;
    }

    /**
     * Zeichnet das Raster über den Canvas-Inhalt
     * Wird als letztes gezeichnet, damit es über allem liegt
     */
    drawGrid(ctx) {
        if (!this.isVisible) return;

        const { width, height } = this.canvas;
        
        ctx.save();
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]); // Gestrichelte Linien
        ctx.globalCompositeOperation = 'source-over';

        // Vertikale Linien
        for (let x = this.gridSize; x < width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0); // +0.5 für scharfe Linien
            ctx.lineTo(x + 0.5, height);
            ctx.stroke();
        }

        // Horizontale Linien
        for (let y = this.gridSize; y < height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(width, y + 0.5);
            ctx.stroke();
        }

        // Reset drawing state
        ctx.setLineDash([]);
        ctx.restore();
    }

    /**
     * Snap-to-Grid Funktionalität
     * Gibt die nächstgelegenen Grid-Koordinaten zurück
     */
    snapToGridPoint(x, y) {
        if (!this.snapToGrid) return { x, y };

        const snappedX = Math.round(x / this.gridSize) * this.gridSize;
        const snappedY = Math.round(y / this.gridSize) * this.gridSize;

        // Nur snappen wenn in Toleranz
        const deltaX = Math.abs(x - snappedX);
        const deltaY = Math.abs(y - snappedY);

        return {
            x: deltaX <= this.snapTolerance ? snappedX : x,
            y: deltaY <= this.snapTolerance ? snappedY : y
        };
    }

    /**
     * Relative Position für Objekte mit Grid-Snap
     * Konvertiert absolute Pixel zu relativen Canvas-Koordinaten
     */
    getRelativePosition(x, y) {
        const snapped = this.snapToGridPoint(x, y);
        return {
            relX: snapped.x / this.canvas.width,
            relY: snapped.y / this.canvas.height
        };
    }

    /**
     * Grid-Sichtbarkeit umschalten
     */
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        return this.isVisible;
    }

    /**
     * Grid ein-/ausblenden
     */
    setVisibility(visible) {
        this.isVisible = visible;
    }

    /**
     * Grid-Größe ändern
     */
    setGridSize(size) {
        this.gridSize = Math.max(10, Math.min(200, size)); // Begrenzt auf 10-200px
    }

    /**
     * Grid-Farbe mit Transparenz ändern (optimiert)
     */
    setGridColor(color, opacity = 0.3) {
        // Opacity-Wert normalisieren (0-100 zu 0-1 oder direkt 0-1)
        let normalizedOpacity = opacity;
        if (opacity > 1) {
            normalizedOpacity = opacity / 100; // 0-100 zu 0-1 konvertieren
        }
        
        // Wert begrenzen
        normalizedOpacity = Math.max(0.1, Math.min(1.0, normalizedOpacity));
        
        if (color.startsWith('#')) {
            // Hex zu RGBA konvertieren
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            this.gridColor = `rgba(${r}, ${g}, ${b}, ${normalizedOpacity})`;
        } else {
            this.gridColor = color;
        }
        
        return normalizedOpacity; // Rückgabe für UI-Sync
    }

    /**
     * Snap-to-Grid aktivieren/deaktivieren
     */
    setSnapToGrid(enabled) {
        this.snapToGrid = enabled;
    }

    /**
     * Snap-Toleranz einstellen
     */
    setSnapTolerance(tolerance) {
        this.snapTolerance = Math.max(5, Math.min(50, tolerance));
    }

    /**
     * Grid-Einstellungen als Objekt zurückgeben
     */
    getSettings() {
        return {
            isVisible: this.isVisible,
            gridSize: this.gridSize,
            gridColor: this.gridColor,
            snapToGrid: this.snapToGrid,
            snapTolerance: this.snapTolerance
        };
    }

    /**
     * Berechnet die nächsten Grid-Linien für visuelles Feedback
     */
    getNearestGridLines(x, y) {
        const gridX = Math.round(x / this.gridSize) * this.gridSize;
        const gridY = Math.round(y / this.gridSize) * this.gridSize;
        
        return {
            vertical: gridX,
            horizontal: gridY,
            distanceX: Math.abs(x - gridX),
            distanceY: Math.abs(y - gridY)
        };
    }

    /**
     * Prüft ob ein Punkt nah genug am Grid ist für Snap
     */
    isNearGrid(x, y) {
        const { distanceX, distanceY } = this.getNearestGridLines(x, y);
        return distanceX <= this.snapTolerance || distanceY <= this.snapTolerance;
    }
}