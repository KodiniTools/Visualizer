/**
 * ⌨️ Keyboard Shortcuts Manager mit Undo/Redo Support
 * 
 * Verwaltet alle Tastaturkürzel der App
 * Neu: Undo (Ctrl+Z) und Redo (Ctrl+Y / Ctrl+Shift+Z)
 */
export class KeyboardShortcutsWithHistory {
  constructor(historyStore, options = {}) {
    this.historyStore = historyStore;
    this.options = {
      canvasManager: null,
      multiImageManager: null,
      ...options
    };
    
    // Bound handler für cleanup
    this.handleKeyDown = this.handleKeyDown.bind(this);
    
    // Event Listener registrieren
    this.init();
  }

  init() {
    document.addEventListener('keydown', this.handleKeyDown);
    console.log('⌨️ Keyboard Shortcuts mit Undo/Redo initialisiert');
  }

  handleKeyDown(event) {
    // Shortcuts nur wenn kein Input-Feld fokussiert ist
    const isInputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    
    // Undo/Redo funktioniert immer (auch in Input-Feldern)
    if (this.handleUndoRedo(event)) {
      return;
    }

    // Andere Shortcuts nur wenn kein Input fokussiert
    if (isInputFocused) {
      return;
    }

    this.handleOtherShortcuts(event);
  }

  /**
   * 🔄 Undo/Redo Handler
   * Returns true wenn das Event behandelt wurde
   */
  handleUndoRedo(event) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    // Undo: Ctrl+Z (Windows/Linux) oder Cmd+Z (Mac)
    if (modifier && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
      return true;
    }

    // Redo: Ctrl+Y (Windows/Linux) oder Cmd+Shift+Z (Mac) oder Ctrl+Shift+Z
    if (
      (modifier && event.key === 'y') ||
      (modifier && event.shiftKey && event.key === 'z')
    ) {
      event.preventDefault();
      this.redo();
      return true;
    }

    return false;
  }

  /**
   * ↩️ Undo ausführen
   */
  async undo() {
    if (!this.historyStore.canUndo) {
      console.log('⚠️ Undo nicht möglich');
      return;
    }

    console.log('↩️ Undo wird ausgeführt...');
    await this.historyStore.undo();
    
    // Optional: Visual Feedback
    this.showFeedback('Rückgängig');
  }

  /**
   * ↪️ Redo ausführen
   */
  async redo() {
    if (!this.historyStore.canRedo) {
      console.log('⚠️ Redo nicht möglich');
      return;
    }

    console.log('↪️ Redo wird ausgeführt...');
    await this.historyStore.redo();
    
    // Optional: Visual Feedback
    this.showFeedback('Wiederholen');
  }

  /**
   * 🎨 Andere Shortcuts (Beispiele aus deiner App)
   */
  handleOtherShortcuts(event) {
    const { canvasManager, multiImageManager } = this.options;

    // Delete: Ausgewähltes Objekt löschen
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (canvasManager?.selectedObject) {
        event.preventDefault();
        canvasManager.deleteSelectedObject(); // Diese Methode sollte ein Command verwenden
      }
    }

    // Ctrl+A: Alles auswählen
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      event.preventDefault();
      // Implementation hier
    }

    // Ctrl+D: Duplizieren
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      event.preventDefault();
      if (canvasManager?.selectedObject) {
        canvasManager.duplicateSelectedObject(); // Diese Methode sollte ein Command verwenden
      }
    }

    // Pfeiltasten: Objekt verschieben
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      if (canvasManager?.selectedObject) {
        event.preventDefault();
        this.moveSelectedObject(event.key, event.shiftKey ? 10 : 1);
      }
    }
  }

  /**
   * 🎯 Objekt mit Pfeiltasten verschieben
   */
  moveSelectedObject(direction, step) {
    const { canvasManager } = this.options;
    if (!canvasManager?.selectedObject) return;

    const obj = canvasManager.selectedObject;
    const oldX = obj.x;
    const oldY = obj.y;

    switch (direction) {
      case 'ArrowUp': obj.y -= step; break;
      case 'ArrowDown': obj.y += step; break;
      case 'ArrowLeft': obj.x -= step; break;
      case 'ArrowRight': obj.x += step; break;
    }

    // Command für Position-Änderung
    // (Du müsstest hier das ModifyObjectCommand verwenden)
    console.log(`Moved object from (${oldX}, ${oldY}) to (${obj.x}, ${obj.y})`);
  }

  /**
   * 💬 Visual Feedback (Optional)
   */
  showFeedback(message) {
    // Optional: Toast-Nachricht oder ähnliches anzeigen
    console.log(`ℹ️ ${message}`);
    
    // Beispiel für einfaches Feedback:
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      pointer-events: none;
      animation: fadeInOut 1s ease;
    `;
    
    // CSS Animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-10px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.remove();
      style.remove();
    }, 1000);
  }

  /**
   * 🧹 Cleanup
   */
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    console.log('🧹 Keyboard Shortcuts cleanup abgeschlossen');
  }
}
