// MouseHandler.js - Maus-Event-Handling

/**
 * MouseHandler - Verantwortlich für alle Maus-Events
 *
 * Funktionen:
 * - mousedown, mousemove, mouseup, dblclick Events
 * - Maus-Position-Berechnung
 * - Window-Level Event-Handling für Drag außerhalb des Canvas
 * - Cursor-Updates
 */
export class MouseHandler {
    constructor(canvasManager) {
        this.manager = canvasManager;

        // Bound handlers for cleanup
        this._boundWindowMouseUp = null;
        this._boundWindowMouseMove = null;
    }

    /**
     * Initialisiert alle Event-Listener
     */
    setupInteractionHandlers() {
        this.manager.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.manager.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.manager.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.manager.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

        // Reliability: Handle mouse leaving canvas during drag
        this.manager.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));

        // Reliability: Create bound handlers for window-level events
        this._boundWindowMouseUp = (e) => this.onWindowMouseUp(e);
        this._boundWindowMouseMove = (e) => this.onWindowMouseMove(e);
    }

    /**
     * Mouse Down Event
     */
    onMouseDown(e) {
        if (this.manager.isEditingText) return;
        const { x, y } = this.getMousePos(e);

        // Text-Rechteck-Auswahl-Modus: Starte Rechteck-Zeichnung
        if (this.manager.textSelectionMode) {
            this.manager.textSelectionRect = {
                startX: x,
                startY: y,
                endX: x,
                endY: y
            };
            this.manager.currentAction = 'text-selection';
            this._startDragListeners();
            this.manager.redrawCallback();
            return;
        }

        // Bild-Bereichsauswahl-Modus: Starte Rechteck-Zeichnung
        if (this.manager.imageSelectionMode) {
            this.manager.imageSelectionRect = {
                startX: x,
                startY: y,
                endX: x,
                endY: y
            };
            this.manager.currentAction = 'image-selection';
            this._startDragListeners();
            this.manager.redrawCallback();
            return;
        }

        if (this.manager.activeObject) {
            const bounds = this.manager.getObjectBounds(this.manager.activeObject);
            if (bounds) {
                const deleteBtn = this.manager.selectionManager.getDeleteButtonBounds(bounds);
                if (this.manager.selectionManager.isPointInRect(x, y, deleteBtn)) {
                    this.manager.deleteActiveObject();
                    return;
                }

                const handleKey = this.manager.selectionManager.getHandleAtPos(bounds, x, y);
                if (handleKey) {
                    this.manager.currentAction = handleKey;
                    this.manager.dragStartPos = { x, y };
                    // Reliability: Cache bounds and add window listeners for drag outside canvas
                    this.manager._cachedBounds = bounds;
                    this._startDragListeners();
                    // Precision: Update cursor for active resize handle
                    this._updateResizeCursor(handleKey);
                    return;
                }

                if (this.manager.selectionManager.isPointInRect(x, y, bounds)) {
                    // FIX: Prüfe ob ein Text-Objekt mit höherer Priorität an dieser Position liegt
                    const textAtPos = this.manager.selectionManager.getTextAtPos(x, y);
                    if (textAtPos && this.manager.activeObject !== textAtPos) {
                        // Text gefunden - wechsle zu diesem Text-Objekt
                        this.manager.setActiveObject(textAtPos);
                        this.manager.currentAction = 'move';
                        this.manager.dragStartPos = { x, y };
                        this._startDragListeners();
                        this.manager.canvas.style.cursor = 'grabbing';
                        return;
                    }

                    this.manager.currentAction = 'move';
                    this.manager.dragStartPos = { x, y };
                    // Reliability: Add window listeners for drag outside canvas
                    this._startDragListeners();
                    this.manager.canvas.style.cursor = 'grabbing';
                    return;
                }
            }
        }

        const clickedObject = this.manager.selectionManager.getObjectAtPos(x, y);
        if (clickedObject) {
            this.manager.setActiveObject(clickedObject);
            this.manager.currentAction = 'move';
            this.manager.dragStartPos = { x, y };
            // Reliability: Add window listeners for drag outside canvas
            this._startDragListeners();
            this.manager.canvas.style.cursor = 'grabbing';
            // Kachel-Auswahl aufheben wenn ein Objekt ausgewählt wird
            if (this.manager.backgroundTilesStore && this.manager.backgroundTilesStore.tilesEnabled) {
                this.manager.backgroundTilesStore.selectTile(-1);
            }
        } else {
            this.manager.setActiveObject(null);

            // NEU: Prüfen ob eine Kachel angeklickt wurde
            if (this.manager.backgroundTilesStore && this.manager.backgroundTilesStore.tilesEnabled) {
                const tileIndex = this.manager.backgroundRenderer.getTileAtPosition(x, y);
                if (tileIndex >= 0) {
                    this.manager.backgroundTilesStore.selectTile(tileIndex);
                } else {
                    this.manager.backgroundTilesStore.selectTile(-1);
                }
            }
        }

        this.manager.redrawCallback();
    }

    /**
     * Mouse Move Event
     */
    onMouseMove(e) {
        if (this.manager.isEditingText) return;
        const { x, y } = this.getMousePos(e);

        // Text-Rechteck-Auswahl-Modus: Aktualisiere Rechteck während des Ziehens
        if (this.manager.currentAction === 'text-selection' && this.manager.textSelectionRect) {
            this.manager.textSelectionRect.endX = x;
            this.manager.textSelectionRect.endY = y;
            this.manager.redrawCallback();
            return;
        }

        // Bild-Bereichsauswahl-Modus: Aktualisiere Rechteck während des Ziehens
        if (this.manager.currentAction === 'image-selection' && this.manager.imageSelectionRect) {
            this.manager.imageSelectionRect.endX = x;
            this.manager.imageSelectionRect.endY = y;
            this.manager.redrawCallback();
            return;
        }

        if (this.manager.currentAction) {
            if (!this.manager.activeObject) return;

            const dx = x - this.manager.dragStartPos.x;
            const dy = y - this.manager.dragStartPos.y;

            // Performance: Skip tiny movements to reduce redraws
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

            if (this.manager.currentAction === 'move') {
                this.manager.dragDropHandler.moveObject(this.manager.activeObject, dx, dy);
            } else if (this.manager.currentAction.startsWith('resize-')) {
                if (this.manager.activeObject.type === 'text') {
                    this.manager.dragDropHandler.resizeText(this.manager.activeObject, dx, dy);
                } else {
                    this.manager.dragDropHandler.resizeImage(this.manager.activeObject, dx, dy);
                }
            }

            this.manager.dragStartPos = { x, y };
            this.manager.redrawCallback();
            return;
        }

        // Precision: Check for handle hover first when object is active
        if (this.manager.activeObject) {
            const bounds = this.manager.getObjectBounds(this.manager.activeObject);
            if (bounds) {
                const handleKey = this.manager.selectionManager.getHandleAtPos(bounds, x, y);
                if (handleKey) {
                    this._updateResizeCursor(handleKey);
                    return;
                }
            }
        }

        const hoveredObj = this.manager.selectionManager.getObjectAtPos(x, y);
        if (hoveredObj !== this.manager.hoveredObject) {
            this.manager.hoveredObject = hoveredObj;
            this.manager.redrawCallback();
        }

        if (hoveredObj || this.manager.activeObject) {
            this.manager.canvas.style.cursor = 'pointer';
        } else {
            // NEU: Cursor ändern wenn über einer Kachel gehovert wird
            if (this.manager.backgroundTilesStore && this.manager.backgroundTilesStore.tilesEnabled) {
                const tileIndex = this.manager.backgroundRenderer.getTileAtPosition(x, y);
                if (tileIndex >= 0) {
                    this.manager.canvas.style.cursor = 'pointer';
                    return;
                }
            }
            this.manager.canvas.style.cursor = 'default';
        }
    }

    /**
     * Mouse Up Event
     */
    onMouseUp(e) {
        // Text-Rechteck-Auswahl-Modus: Beende Auswahl und rufe Callback auf
        if (this.manager.currentAction === 'text-selection') {
            const bounds = this.manager.selectionManager.getTextSelectionBounds();

            if (bounds && this.manager.onTextSelectionComplete) {
                // Callback mit den Auswahl-Bounds aufrufen
                this.manager.onTextSelectionComplete(bounds);
            }

            // Modus beenden - textSelectionRect bleibt für Visualisierung
            this._stopDragListeners();
            this.manager.currentAction = null;
            this.manager.textSelectionMode = false;
            this.manager.canvas.style.cursor = 'default';
            this.manager.redrawCallback();
            return;
        }

        // Bild-Bereichsauswahl-Modus: Beende Auswahl und rufe Callback auf
        if (this.manager.currentAction === 'image-selection') {
            const bounds = this.manager.selectionManager.getImageSelectionBounds();

            if (bounds && this.manager.onImageSelectionComplete) {
                // Callback mit den Auswahl-Bounds und Animation aufrufen
                this.manager.onImageSelectionComplete(bounds);
            }

            // Modus beenden - imageSelectionRect wird gelöscht
            this._stopDragListeners();
            this.manager.currentAction = null;
            this.manager.imageSelectionMode = false;
            this.manager.imageSelectionRect = null;
            this.manager.canvas.style.cursor = 'default';
            this.manager.redrawCallback();
            return;
        }

        this._endDrag();
    }

    /**
     * Mouse Leave Event - Handle mouse leaving canvas during drag
     */
    onMouseLeave(e) {
        // Don't cancel action - window listeners will handle it
        // Just update visual feedback if not dragging
        if (!this.manager.currentAction) {
            this.manager.hoveredObject = null;
            this.manager.canvas.style.cursor = 'default';
            this.manager.redrawCallback();
        }
    }

    /**
     * Window-level mouseup ensures drag ends even outside canvas
     */
    onWindowMouseUp(e) {
        // Text-Rechteck-Auswahl-Modus: Beende Auswahl und rufe Callback auf
        if (this.manager.currentAction === 'text-selection') {
            const bounds = this.manager.selectionManager.getTextSelectionBounds();

            if (bounds && this.manager.onTextSelectionComplete) {
                this.manager.onTextSelectionComplete(bounds);
            }

            this._stopDragListeners();
            this.manager.currentAction = null;
            this.manager.textSelectionMode = false;
            this.manager.canvas.style.cursor = 'default';
            this.manager.redrawCallback();
            return;
        }

        // Bild-Bereichsauswahl-Modus: Beende Auswahl und rufe Callback auf
        if (this.manager.currentAction === 'image-selection') {
            const bounds = this.manager.selectionManager.getImageSelectionBounds();

            if (bounds && this.manager.onImageSelectionComplete) {
                this.manager.onImageSelectionComplete(bounds);
            }

            this._stopDragListeners();
            this.manager.currentAction = null;
            this.manager.imageSelectionMode = false;
            this.manager.imageSelectionRect = null;
            this.manager.canvas.style.cursor = 'default';
            this.manager.redrawCallback();
            return;
        }

        this._endDrag();
    }

    /**
     * Window-level mousemove allows drag to continue outside canvas
     */
    onWindowMouseMove(e) {
        // Text-Rechteck-Auswahl: Auch außerhalb des Canvas aktualisieren
        if (this.manager.currentAction === 'text-selection' && this.manager.textSelectionRect) {
            const { x, y } = this.getMousePos(e);
            this.manager.textSelectionRect.endX = x;
            this.manager.textSelectionRect.endY = y;
            this.manager.redrawCallback();
            return;
        }

        // Bild-Bereichsauswahl: Auch außerhalb des Canvas aktualisieren
        if (this.manager.currentAction === 'image-selection' && this.manager.imageSelectionRect) {
            const { x, y } = this.getMousePos(e);
            this.manager.imageSelectionRect.endX = x;
            this.manager.imageSelectionRect.endY = y;
            this.manager.redrawCallback();
            return;
        }

        if (!this.manager.currentAction || !this.manager.activeObject) return;

        const { x, y } = this.getMousePos(e);
        const dx = x - this.manager.dragStartPos.x;
        const dy = y - this.manager.dragStartPos.y;

        // Performance: Skip tiny movements
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

        if (this.manager.currentAction === 'move') {
            this.manager.dragDropHandler.moveObject(this.manager.activeObject, dx, dy);
        } else if (this.manager.currentAction.startsWith('resize-')) {
            if (this.manager.activeObject.type === 'text') {
                this.manager.dragDropHandler.resizeText(this.manager.activeObject, dx, dy);
            } else {
                this.manager.dragDropHandler.resizeImage(this.manager.activeObject, dx, dy);
            }
        }

        this.manager.dragStartPos = { x, y };
        this.manager.redrawCallback();
    }

    /**
     * Double Click Event
     */
    onDoubleClick(e) {
        if (this.manager.isEditingText) return;
        const { x, y } = this.getMousePos(e);
        const clickedObj = this.manager.selectionManager.getObjectAtPos(x, y);

        if (clickedObj && clickedObj.type === 'text') {
            if (this.manager.onTextEditStart) {
                this.manager.onTextEditStart(clickedObj);
            }
        }
    }

    /**
     * Berechnet die Mausposition relativ zum Canvas
     */
    getMousePos(e) {
        const rect = this.manager.canvas.getBoundingClientRect();

        const canvasAspect = this.manager.canvas.width / this.manager.canvas.height;
        const rectAspect = rect.width / rect.height;

        let renderWidth, renderHeight, offsetX, offsetY;

        if (rectAspect > canvasAspect) {
            renderHeight = rect.height;
            renderWidth = renderHeight * canvasAspect;
            offsetX = (rect.width - renderWidth) / 2;
            offsetY = 0;
        } else {
            renderWidth = rect.width;
            renderHeight = renderWidth / canvasAspect;
            offsetX = 0;
            offsetY = (rect.height - renderHeight) / 2;
        }

        const x = ((e.clientX - rect.left - offsetX) / renderWidth) * this.manager.canvas.width;
        const y = ((e.clientY - rect.top - offsetY) / renderHeight) * this.manager.canvas.height;

        return { x, y };
    }

    /**
     * Start listening to window-level events during drag
     */
    _startDragListeners() {
        window.addEventListener('mouseup', this._boundWindowMouseUp);
        window.addEventListener('mousemove', this._boundWindowMouseMove);
    }

    /**
     * Stop listening to window-level events
     */
    _stopDragListeners() {
        window.removeEventListener('mouseup', this._boundWindowMouseUp);
        window.removeEventListener('mousemove', this._boundWindowMouseMove);
        this.manager._cachedBounds = null;
    }

    /**
     * Central method to end drag operations cleanly
     */
    _endDrag() {
        // ✨ NEU: Auswahl aufheben wenn ein Slideshow-Bild verschoben/skaliert wurde
        // um veraltete Markierungen zu vermeiden
        if (this.manager.activeObject && this.manager.activeObject.isSlideshowImage) {
            if (this.manager.multiImageManager) {
                this.manager.multiImageManager.setSelectedImage(null);
            }
            this.manager.activeObject = null;
        }

        if (this.manager.currentAction) {
            this._stopDragListeners();
        }
        this.manager.currentAction = null;
        this.manager.canvas.style.cursor = 'default';
    }

    /**
     * Update cursor to indicate resize direction
     */
    _updateResizeCursor(handleKey) {
        const cursorMap = {
            'resize-tl': 'nwse-resize',
            'resize-br': 'nwse-resize',
            'resize-tr': 'nesw-resize',
            'resize-bl': 'nesw-resize',
            'resize-t': 'ns-resize',
            'resize-b': 'ns-resize',
            'resize-l': 'ew-resize',
            'resize-r': 'ew-resize'
        };
        this.manager.canvas.style.cursor = cursorMap[handleKey] || 'pointer';
    }

    /**
     * Cleanup method for component unmount
     */
    destroy() {
        this._stopDragListeners();
    }
}
