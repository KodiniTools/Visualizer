// SelectionManager.js - Objekt-Auswahl und -Verwaltung

/**
 * SelectionManager - Verantwortlich für Objekt-Auswahl und Hit-Detection
 *
 * Funktionen:
 * - Objekt-Auswahl und -Deselektierung
 * - Hit-Detection (getObjectAtPos)
 * - Resize-Handles Berechnung
 * - Delete-Button Berechnung
 * - Text/Image Selection Bounds
 */
export class SelectionManager {
    constructor(canvasManager) {
        this.manager = canvasManager;
        this.HANDLE_SIZE = 10;
        this.HANDLE_HIT_TOLERANCE = 4; // Extra pixels for easier handle targeting
    }

    /**
     * Setzt das aktive Objekt
     */
    setActiveObject(obj) {
        const previousActive = this.manager.activeObject;
        this.manager.activeObject = obj;

        // Text-Objekte immer an die oberste Ebene verschieben
        if (obj && obj.type === 'text' && this.manager.textManager) {
            this.manager.textManager.moveToTop(obj);
        }

        // Synchronisiere MultiImageManager Auswahl
        if (this.manager.multiImageManager) {
            if (obj && obj.type === 'image') {
                this.manager.multiImageManager.setSelectedImage(obj);
            } else {
                this.manager.multiImageManager.setSelectedImage(null);
            }
        }

        // FIX: Für Hintergrund-Typen IMMER den Callback aufrufen
        const isBackgroundType = obj && (
            obj.type === 'workspace-background' ||
            obj.type === 'background' ||
            obj.type === 'video-background' ||
            obj.type === 'workspace-video-background'
        );

        if (obj !== previousActive || isBackgroundType) {
            if (this.manager.onSelectionChange) {
                this.manager.onSelectionChange(obj);
            }
            this.manager._notifySelectionListeners(obj);
        }
    }

    /**
     * Prüft NUR ob ein Text-Objekt an der Position liegt
     */
    getTextAtPos(x, y) {
        if (this.manager.textManager && this.manager.textManager.textObjects) {
            for (let i = this.manager.textManager.textObjects.length - 1; i >= 0; i--) {
                const textObj = this.manager.textManager.textObjects[i];
                const bounds = this.manager.getObjectBounds(textObj);
                if (bounds && this.isPointInRect(x, y, bounds)) {
                    return textObj;
                }
            }
        }
        return null;
    }

    /**
     * Findet das Objekt an der gegebenen Position
     */
    getObjectAtPos(x, y) {
        // Text-Objekte haben HÖCHSTE Priorität - müssen IMMER anklickbar sein
        if (this.manager.textManager && this.manager.textManager.textObjects) {
            for (let i = this.manager.textManager.textObjects.length - 1; i >= 0; i--) {
                const textObj = this.manager.textManager.textObjects[i];
                const bounds = this.manager.getObjectBounds(textObj);
                if (bounds && this.isPointInRect(x, y, bounds)) {
                    return textObj;
                }
            }
        }

        // Dann Videos prüfen (über Bildern, unter Text)
        if (this.manager.videoManager) {
            const videos = this.manager.videoManager.getAllVideos();
            for (let i = videos.length - 1; i >= 0; i--) {
                const videoData = videos[i];
                const bounds = this.manager.getObjectBounds(videoData);
                if (bounds && this.isPointInRect(x, y, bounds)) {
                    return videoData;
                }
            }
        }

        // Dann Bilder prüfen (über Hintergründen)
        if (this.manager.multiImageManager) {
            const images = this.manager.multiImageManager.getAllImages();
            for (let i = images.length - 1; i >= 0; i--) {
                const imgData = images[i];
                const bounds = this.manager.getObjectBounds(imgData);
                if (bounds && this.isPointInRect(x, y, bounds)) {
                    return imgData;
                }
            }
        }

        // Dann Workspace-Hintergrund prüfen
        if (this.manager.workspaceBackground && this.manager.workspacePreset) {
            const workspaceBounds = this.manager.getWorkspaceBounds();
            if (workspaceBounds && this.isPointInRect(x, y, workspaceBounds)) {
                return this.manager.workspaceBackground;
            }
        }

        // Zuletzt globaler Hintergrund
        if (this.manager.background && typeof this.manager.background === 'object') {
            return this.manager.background;
        }

        return null;
    }

    /**
     * Prüft ob ein Punkt innerhalb eines Rechtecks liegt
     */
    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    }

    /**
     * Berechnet alle Resize-Handles für ein Objekt
     */
    getResizeHandles(bounds) {
        const { x, y, width, height } = bounds;
        const hs = this.HANDLE_SIZE;
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
     * Prüft ob ein Punkt auf einem Resize-Handle liegt
     */
    getHandleAtPos(bounds, x, y) {
        const handles = this.getResizeHandles(bounds);
        const tolerance = this.HANDLE_HIT_TOLERANCE;

        // Corner handles first (higher priority)
        const cornerHandles = ['resize-tl', 'resize-tr', 'resize-bl', 'resize-br'];
        for (const key of cornerHandles) {
            if (this._isPointInHandleWithTolerance(x, y, handles[key], tolerance)) {
                return key;
            }
        }

        // Then edge handles
        const edgeHandles = ['resize-t', 'resize-b', 'resize-l', 'resize-r'];
        for (const key of edgeHandles) {
            if (this._isPointInHandleWithTolerance(x, y, handles[key], tolerance)) {
                return key;
            }
        }

        return null;
    }

    /**
     * Point-in-handle check with extra tolerance
     */
    _isPointInHandleWithTolerance(x, y, handle, tolerance) {
        return x >= handle.x - tolerance &&
            x <= handle.x + handle.width + tolerance &&
            y >= handle.y - tolerance &&
            y <= handle.y + handle.height + tolerance;
    }

    /**
     * Berechnet die Position des Delete-Buttons
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
     * Gibt die normalisierten Bounds des Text-Auswahl-Rechtecks zurück
     */
    getTextSelectionBounds() {
        if (!this.manager.textSelectionRect) return null;

        const rect = this.manager.textSelectionRect;
        const x = Math.min(rect.startX, rect.endX);
        const y = Math.min(rect.startY, rect.endY);
        const width = Math.abs(rect.endX - rect.startX);
        const height = Math.abs(rect.endY - rect.startY);

        // Mindestgröße prüfen (mindestens 30x30 Pixel)
        if (width < 30 || height < 30) return null;

        return {
            x,
            y,
            width,
            height,
            // Relative Werte für Canvas-unabhängige Positionierung
            relX: x / this.manager.canvas.width,
            relY: y / this.manager.canvas.height,
            relWidth: width / this.manager.canvas.width,
            relHeight: height / this.manager.canvas.height,
            // Zentrum für Text-Positionierung
            centerX: x + width / 2,
            centerY: y + height / 2,
            relCenterX: (x + width / 2) / this.manager.canvas.width,
            relCenterY: (y + height / 2) / this.manager.canvas.height
        };
    }

    /**
     * Gibt die normalisierten Bounds des Bild-Auswahl-Rechtecks zurück
     */
    getImageSelectionBounds() {
        if (!this.manager.imageSelectionRect) return null;

        const rect = this.manager.imageSelectionRect;
        const x = Math.min(rect.startX, rect.endX);
        const y = Math.min(rect.startY, rect.endY);
        const width = Math.abs(rect.endX - rect.startX);
        const height = Math.abs(rect.endY - rect.startY);

        // Mindestgröße prüfen (mindestens 30x30 Pixel)
        if (width < 30 || height < 30) return null;

        return {
            x,
            y,
            width,
            height,
            // Relative Werte für Canvas-unabhängige Positionierung
            relX: x / this.manager.canvas.width,
            relY: y / this.manager.canvas.height,
            relWidth: width / this.manager.canvas.width,
            relHeight: height / this.manager.canvas.height,
            // Zentrum für Bild-Positionierung
            centerX: x + width / 2,
            centerY: y + height / 2,
            relCenterX: (x + width / 2) / this.manager.canvas.width,
            relCenterY: (y + height / 2) / this.manager.canvas.height,
            // Animation
            animation: this.manager.pendingImageAnimation || 'none'
        };
    }
}
