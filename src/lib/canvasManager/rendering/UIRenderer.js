// UIRenderer.js - UI-Elemente Rendering (Auswahlrahmen, Handles, etc.)

/**
 * UIRenderer - Verantwortlich für das Zeichnen aller UI-Elemente
 *
 * Funktionen:
 * - Interaktive Elemente (Auswahlrahmen, Hover-Effekte)
 * - Resize-Handles
 * - Delete-Button
 * - Text-Auswahl-Rechteck
 * - Bild-Auswahl-Rechteck
 * - Text-Positions-Vorschau
 */
export class UIRenderer {
    constructor(canvasManager) {
        this.manager = canvasManager;
    }

    /**
     * Zeichnet alle interaktiven UI-Elemente
     */
    drawInteractiveElements(ctx) {
        if (this.manager.isEditingText) return;

        const targetObject = this.manager.activeObject || this.manager.hoveredObject;
        if (!targetObject) return;

        if (targetObject.type === 'background') {
            this._drawBackgroundSelection(ctx);
            return;
        }

        if (targetObject.type === 'workspace-background') {
            this._drawWorkspaceBackgroundSelection(ctx);
            return;
        }

        const bounds = this.manager.getObjectBounds(targetObject);
        if (!bounds) return;

        ctx.save();

        const isHovered = (this.manager.hoveredObject === targetObject);
        const isActive = (this.manager.activeObject === targetObject);

        if (isActive) {
            ctx.strokeStyle = 'rgba(110, 168, 254, 0.9)';
            ctx.lineWidth = 2;
        } else if (isHovered) {
            ctx.strokeStyle = 'rgba(110, 168, 254, 0.5)';
            ctx.lineWidth = 1;
        }

        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

        if (isActive && !this.manager.isEditingText) {
            this.drawResizeHandles(ctx, bounds);
            this.drawDeleteButton(ctx, bounds);
        }

        ctx.restore();
    }

    /**
     * Zeichnet Auswahl-Markierung für globalen Hintergrund
     */
    _drawBackgroundSelection(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(110, 168, 254, 0.9)';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(2, 2, ctx.canvas.width - 4, ctx.canvas.height - 4);
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(110, 168, 254, 0.9)';
        ctx.font = 'bold 14px Arial';
        const label = 'Globaler Hintergrund (anklicken für Filter)';
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(10, 10, textWidth + 20, 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, 20, 30);
        ctx.restore();
    }

    /**
     * Zeichnet Auswahl-Markierung für Workspace-Hintergrund
     */
    _drawWorkspaceBackgroundSelection(ctx) {
        const workspaceBounds = this.manager.getWorkspaceBounds();
        if (!workspaceBounds) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(138, 43, 226, 0.9)';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(
            workspaceBounds.x,
            workspaceBounds.y,
            workspaceBounds.width,
            workspaceBounds.height
        );
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(138, 43, 226, 0.9)';
        ctx.font = 'bold 14px Arial';
        const label = 'Workspace-Hintergrund (anklicken für Filter)';
        const textWidth = ctx.measureText(label).width;
        const labelX = workspaceBounds.x + 10;
        const labelY = workspaceBounds.y + 10;
        ctx.fillRect(labelX, labelY, textWidth + 20, 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, labelX + 10, labelY + 20);
        ctx.restore();
    }

    /**
     * Zeichnet Resize-Handles um ein Objekt
     */
    drawResizeHandles(ctx, bounds) {
        const handles = this.manager.selectionManager.getResizeHandles(bounds);
        ctx.fillStyle = '#6ea8fe';
        for (const key in handles) {
            const h = handles[key];
            ctx.fillRect(h.x, h.y, h.width, h.height);
        }
    }

    /**
     * Zeichnet den Delete-Button
     */
    drawDeleteButton(ctx, objectBounds) {
        const deleteBtn = this.manager.selectionManager.getDeleteButtonBounds(objectBounds);

        ctx.save();
        ctx.fillStyle = '#dc3545';
        ctx.beginPath();
        ctx.arc(deleteBtn.x + deleteBtn.width / 2, deleteBtn.y + deleteBtn.height / 2, deleteBtn.width / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const centerX = deleteBtn.x + deleteBtn.width / 2;
        const centerY = deleteBtn.y + deleteBtn.height / 2;
        const size = 6;
        ctx.beginPath();
        ctx.moveTo(centerX - size / 2, centerY - size / 2);
        ctx.lineTo(centerX + size / 2, centerY + size / 2);
        ctx.moveTo(centerX + size / 2, centerY - size / 2);
        ctx.lineTo(centerX - size / 2, centerY + size / 2);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Zeichnet das Text-Auswahl-Rechteck während und nach der Auswahl
     */
    drawTextSelectionRect(ctx) {
        if (!this.manager.textSelectionRect) return;

        const rect = this.manager.textSelectionRect;
        const x = Math.min(rect.startX, rect.endX);
        const y = Math.min(rect.startY, rect.endY);
        const width = Math.abs(rect.endX - rect.startX);
        const height = Math.abs(rect.endY - rect.startY);

        // Mindestgröße für sichtbare Vorschau
        if (width < 5 || height < 5) return;

        ctx.save();

        // Halbtransparenter Hintergrund
        ctx.fillStyle = 'rgba(110, 168, 254, 0.15)';
        ctx.fillRect(x, y, width, height);

        // Gestrichelter Rahmen
        ctx.strokeStyle = '#6ea8fe';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(x, y, width, height);

        // Größenanzeige
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(110, 168, 254, 0.95)';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = `${Math.round(width)} × ${Math.round(height)} px`;
        const labelPadding = 6;
        const labelWidth = ctx.measureText(label).width + labelPadding * 2;
        const labelHeight = 20;
        const labelX = x + width / 2 - labelWidth / 2;
        const labelY = y + height / 2 - labelHeight / 2;

        // Label-Hintergrund
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

        // Label-Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + width / 2, y + height / 2);

        // Ecken-Markierungen
        ctx.fillStyle = '#6ea8fe';
        const cornerSize = 8;

        // Oben-Links
        ctx.fillRect(x - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize);
        // Oben-Rechts
        ctx.fillRect(x + width - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize);
        // Unten-Links
        ctx.fillRect(x - cornerSize / 2, y + height - cornerSize / 2, cornerSize, cornerSize);
        // Unten-Rechts
        ctx.fillRect(x + width - cornerSize / 2, y + height - cornerSize / 2, cornerSize, cornerSize);

        ctx.restore();
    }

    /**
     * Zeichnet das Bild-Auswahl-Rechteck
     */
    drawImageSelectionRect(ctx) {
        if (!this.manager.imageSelectionRect) return;

        const rect = this.manager.imageSelectionRect;
        const x = Math.min(rect.startX, rect.endX);
        const y = Math.min(rect.startY, rect.endY);
        const width = Math.abs(rect.endX - rect.startX);
        const height = Math.abs(rect.endY - rect.startY);

        // Mindestgröße für sichtbare Vorschau
        if (width < 5 || height < 5) return;

        ctx.save();

        // Halbtransparenter Hintergrund (grünlich für Bilder)
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.fillRect(x, y, width, height);

        // Gestrichelter Rahmen (grün)
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(x, y, width, height);

        // Größenanzeige
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.95)';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = `📷 ${Math.round(width)} × ${Math.round(height)} px`;
        const labelPadding = 6;
        const labelWidth = ctx.measureText(label).width + labelPadding * 2;
        const labelHeight = 20;
        const labelX = x + width / 2 - labelWidth / 2;
        const labelY = y + height / 2 - labelHeight / 2;

        // Label-Hintergrund
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

        // Label-Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + width / 2, y + height / 2);

        // Animations-Hinweis wenn gesetzt
        if (this.manager.pendingImageAnimation && this.manager.pendingImageAnimation !== 'none') {
            const animLabel = this._getAnimationLabel(this.manager.pendingImageAnimation);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
            const animWidth = ctx.measureText(animLabel).width + 12;
            ctx.fillRect(x + width / 2 - animWidth / 2, labelY + labelHeight + 5, animWidth, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.fillText(animLabel, x + width / 2, labelY + labelHeight + 14);
        }

        // Ecken-Markierungen
        ctx.fillStyle = '#22c55e';
        const cornerSize = 8;

        // Oben-Links
        ctx.fillRect(x - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize);
        // Oben-Rechts
        ctx.fillRect(x + width - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize);
        // Unten-Links
        ctx.fillRect(x - cornerSize / 2, y + height - cornerSize / 2, cornerSize, cornerSize);
        // Unten-Rechts
        ctx.fillRect(x + width - cornerSize / 2, y + height - cornerSize / 2, cornerSize, cornerSize);

        ctx.restore();
    }

    /**
     * Zeichnet die Text-Positions-Vorschau als Fadenkreuz
     */
    drawTextPositionPreview(ctx) {
        if (!this.manager.textPositionPreview) return;

        const x = this.manager.textPositionPreview.relX * this.manager.canvas.width;
        const y = this.manager.textPositionPreview.relY * this.manager.canvas.height;

        ctx.save();

        // Fadenkreuz-Größe
        const size = 40;
        const innerSize = 10;

        // Äußeres Fadenkreuz (gestrichelt)
        ctx.strokeStyle = '#6ea8fe';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);

        // Horizontale Linie
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x - innerSize, y);
        ctx.moveTo(x + innerSize, y);
        ctx.lineTo(x + size, y);
        ctx.stroke();

        // Vertikale Linie
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y - innerSize);
        ctx.moveTo(x, y + innerSize);
        ctx.lineTo(x, y + size);
        ctx.stroke();

        // Innerer Kreis
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, innerSize, 0, Math.PI * 2);
        ctx.stroke();

        // Mittelpunkt
        ctx.fillStyle = '#6ea8fe';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Position als Label
        ctx.fillStyle = 'rgba(110, 168, 254, 0.9)';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = `${Math.round(x)} × ${Math.round(y)} px`;
        const labelWidth = ctx.measureText(label).width + 12;
        ctx.fillRect(x - labelWidth / 2, y + size + 5, labelWidth, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x, y + size + 10);

        ctx.restore();
    }

    /**
     * Hilfsfunktion: Gibt einen lesbaren Namen für die Animation zurück
     */
    _getAnimationLabel(animation) {
        const labels = {
            'none': '',
            'fade': '✨ Einblenden',
            'slideLeft': '← Gleiten Links',
            'slideRight': '→ Gleiten Rechts',
            'slideUp': '↑ Gleiten Hoch',
            'slideDown': '↓ Gleiten Runter',
            'zoom': '🔍 Zoom',
            'bounce': '⬆️ Hüpfen',
            'spin': '🔄 Drehen',
            'elastic': '🎯 Elastisch'
        };
        return labels[animation] || animation;
    }
}
