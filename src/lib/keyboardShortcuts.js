// keyboardShortcuts.js - Keyboard Shortcut System für Music Visualizer

/**
 * Keyboard Shortcuts Manager
 * Handles all keyboard shortcuts for the application
 * 
 * Features:
 * - Player controls (Space, M, Arrow Keys)
 * - Object manipulation (Delete, Duplicate, Copy/Paste, Move, Resize)
 * - Recording controls (R, P)
 * - View controls (G for grid, Escape to deselect)
 * - Smart context detection (ignores shortcuts when typing in inputs)
 */

export class KeyboardShortcuts {
  constructor(stores, managers) {
    this.playerStore = stores.playerStore;
    this.recorderStore = stores.recorderStore;
    this.gridStore = stores.gridStore;
    this.canvasManager = managers.canvasManager;
    this.multiImageManager = managers.multiImageManager;
    
    this.isEnabled = true;
    this.copiedObject = null;
    
    // Bind methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    
    console.log('⌨️ [KeyboardShortcuts] Initialisiert');
  }

  /**
   * Aktiviert Keyboard Shortcuts
   */
  enable() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    this.isEnabled = true;
    console.log('✅ [KeyboardShortcuts] Aktiviert');
  }

  /**
   * Deaktiviert Keyboard Shortcuts
   */
  disable() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.isEnabled = false;
    console.log('⏸️ [KeyboardShortcuts] Deaktiviert');
  }

  /**
   * Prüft ob Shortcuts ignoriert werden sollen
   * (z.B. wenn User in Input-Feld tippt)
   */
  shouldIgnoreShortcut(event) {
    const target = event.target;
    const tagName = target.tagName.toLowerCase();
    
    // Ignoriere Shortcuts wenn in Input-Feldern getippt wird
    if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
      return true;
    }
    
    // Ignoriere wenn Text-Editing aktiv ist
    if (this.canvasManager?.isEditingText) {
      return true;
    }
    
    return false;
  }

  /**
   * Haupt-Event-Handler für Keyboard Events
   */
  handleKeyDown(event) {
    if (!this.isEnabled || this.shouldIgnoreShortcut(event)) {
      return;
    }

    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey; // metaKey = Cmd auf Mac
    const shift = event.shiftKey;
    const alt = event.altKey;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ✨ TEXT INPUT: Öffne Texteditor bei Buchstabeneingabe
    // WICHTIG: Muss VOR den Shortcut-Checks kommen!
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Shortcut-Buchstaben, die NICHT den Texteditor öffnen sollen
    const shortcutKeys = ['m', 'r', 'p', 'g', '?', ' '];

    // Wenn ein einzelnes druckbares Zeichen eingegeben wird (ohne Modifier)
    // und kein Objekt ausgewählt ist UND es kein Shortcut-Buchstabe ist
    if (!ctrl && !alt && !shift && event.key.length === 1 &&
        !this.canvasManager?.activeObject && !shortcutKeys.includes(key)) {

      // Dispatch Event zum Öffnen des Texteditors mit dem eingegebenen Zeichen
      window.dispatchEvent(new CustomEvent('openTextEditorWithChar', {
        detail: { char: event.key }
      }));
      event.preventDefault();
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎵 PLAYER CONTROLS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Space = Play/Pause
    if (key === ' ') {
      event.preventDefault();
      this.togglePlayPause();
      return;
    }

    // M = Mute/Unmute
    if (key === 'm' && !ctrl && !shift) {
      event.preventDefault();
      this.toggleMute();
      return;
    }

    // Arrow Left/Right = Previous/Next Track (wenn kein Objekt selektiert)
    if ((key === 'arrowleft' || key === 'arrowright') && !this.canvasManager?.activeObject) {
      if (key === 'arrowleft') {
        event.preventDefault();
        this.previousTrack();
      } else {
        event.preventDefault();
        this.nextTrack();
      }
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎨 OBJECT MANIPULATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Delete/Backspace = Delete selected object
    if ((key === 'delete' || key === 'backspace') && this.canvasManager?.activeObject) {
      event.preventDefault();
      this.deleteSelectedObject();
      return;
    }

    // Ctrl+D = Duplicate
    if (key === 'd' && ctrl && this.canvasManager?.activeObject) {
      event.preventDefault();
      this.duplicateSelectedObject();
      return;
    }

    // Ctrl+C = Copy
    if (key === 'c' && ctrl && this.canvasManager?.activeObject) {
      event.preventDefault();
      this.copySelectedObject();
      return;
    }

    // Ctrl+V = Paste
    if (key === 'v' && ctrl && this.copiedObject) {
      event.preventDefault();
      this.pasteObject();
      return;
    }

    // Arrow Keys = Move selected object
    if (this.canvasManager?.activeObject && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
      
      if (ctrl) {
        // Ctrl+Arrow = Resize
        this.resizeSelectedObject(key, shift);
      } else {
        // Arrow = Move
        this.moveSelectedObject(key, shift);
      }
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎬 RECORDING CONTROLS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // R = Start/Stop Recording
    if (key === 'r' && !ctrl && !shift) {
      event.preventDefault();
      this.toggleRecording();
      return;
    }

    // P = Prepare Recording
    if (key === 'p' && !ctrl && !shift) {
      event.preventDefault();
      this.prepareRecording();
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 👁️ VIEW CONTROLS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // G = Toggle Grid
    if (key === 'g' && !ctrl && !shift) {
      event.preventDefault();
      this.toggleGrid();
      return;
    }

    // Escape = Deselect all
    if (key === 'escape') {
      event.preventDefault();
      this.deselectAll();
      return;
    }

    // ? = Show Shortcuts Help
    if (key === '?' && !ctrl && !shift) {
      event.preventDefault();
      this.showHelp();
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ↩️ UNDO/REDO (Placeholder für später)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Ctrl+Z = Undo
    if (key === 'z' && ctrl && !shift) {
      event.preventDefault();
      this.undo();
      return;
    }

    // Ctrl+Shift+Z or Ctrl+Y = Redo
    if ((key === 'z' && ctrl && shift) || (key === 'y' && ctrl)) {
      event.preventDefault();
      this.redo();
      return;
    }
  }

  handleKeyUp(event) {
    // Platzhalter für Key-Up Events (falls später benötigt)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎵 PLAYER ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  togglePlayPause() {
    if (this.playerStore.isPlaying) {
      this.playerStore.pause();
      console.log('⏸️ [Shortcut] Pause');
    } else {
      this.playerStore.play();
      console.log('▶️ [Shortcut] Play');
    }
  }

  toggleMute() {
    this.playerStore.toggleMute();
    console.log('🔇 [Shortcut] Mute toggled:', this.playerStore.isMuted);
  }

  previousTrack() {
    this.playerStore.previousTrack();
    console.log('⏮️ [Shortcut] Previous Track');
  }

  nextTrack() {
    this.playerStore.nextTrack();
    console.log('⏭️ [Shortcut] Next Track');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎨 OBJECT MANIPULATION ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  deleteSelectedObject() {
    if (!this.canvasManager?.activeObject) return;
    
    this.canvasManager.deleteActiveObject();
    console.log('🗑️ [Shortcut] Object deleted');
  }

  duplicateSelectedObject() {
    const obj = this.canvasManager?.activeObject;
    if (!obj) return;

    if (obj.type === 'text') {
      // Dupliziere Text
      const newText = this.canvasManager.addText(obj.text, {
        relX: obj.relX + 0.05, // Leicht versetzt
        relY: obj.relY + 0.05,
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        color: obj.color,
        align: obj.align,
        fontWeight: obj.fontWeight,
        fontStyle: obj.fontStyle,
        textDecoration: obj.textDecoration,
        shadow: obj.shadow ? { ...obj.shadow } : null
      });
      console.log('📋 [Shortcut] Text duplicated');
    } else if (obj.type === 'image') {
      // Dupliziere Bild
      this.multiImageManager?.addImage({
        ...obj,
        id: Date.now() + '_dup',
        relX: obj.relX + 0.05,
        relY: obj.relY + 0.05
      });
      console.log('📋 [Shortcut] Image duplicated');
    }
  }

  copySelectedObject() {
    const obj = this.canvasManager?.activeObject;
    if (!obj) return;

    // Tiefe Kopie des Objekts
    this.copiedObject = JSON.parse(JSON.stringify(obj));
    console.log('📋 [Shortcut] Object copied:', obj.type);
  }

  pasteObject() {
    if (!this.copiedObject) return;

    if (this.copiedObject.type === 'text') {
      this.canvasManager.addText(this.copiedObject.text, {
        ...this.copiedObject,
        relX: this.copiedObject.relX + 0.05,
        relY: this.copiedObject.relY + 0.05
      });
      console.log('📄 [Shortcut] Text pasted');
    } else if (this.copiedObject.type === 'image') {
      this.multiImageManager?.addImage({
        ...this.copiedObject,
        id: Date.now() + '_paste',
        relX: this.copiedObject.relX + 0.05,
        relY: this.copiedObject.relY + 0.05
      });
      console.log('📄 [Shortcut] Image pasted');
    }
  }

  moveSelectedObject(direction, fast = false) {
    const obj = this.canvasManager?.activeObject;
    if (!obj || obj.type === 'background' || obj.type === 'workspace-background') return;

    // Canvas-Dimensionen holen
    const canvas = this.canvasManager?.canvas;
    if (!canvas) return;

    // Bewegungsschritt in Pixel
    const step = fast ? 20 : 5;
    
    // In relative Koordinaten umrechnen
    const relStepX = step / canvas.width;
    const relStepY = step / canvas.height;

    switch (direction) {
      case 'arrowup':
        obj.relY -= relStepY;
        break;
      case 'arrowdown':
        obj.relY += relStepY;
        break;
      case 'arrowleft':
        obj.relX -= relStepX;
        break;
      case 'arrowright':
        obj.relX += relStepX;
        break;
    }

    // Redraw triggern
    if (this.canvasManager.redrawCallback) {
      this.canvasManager.redrawCallback();
    }

    console.log(`➡️ [Shortcut] Object moved ${direction} (${fast ? 'fast' : 'normal'})`);
  }

  resizeSelectedObject(direction, fast = false) {
    const obj = this.canvasManager?.activeObject;
    if (!obj || obj.type !== 'image') return; // Nur Bilder resizen

    // Canvas-Dimensionen holen
    const canvas = this.canvasManager?.canvas;
    if (!canvas) return;

    // Größenänderung in Pixel
    const step = fast ? 20 : 5;
    
    // In relative Koordinaten umrechnen
    const relStepX = step / canvas.width;
    const relStepY = step / canvas.height;

    // Aspect Ratio beibehalten
    const aspectRatio = obj.imageObject.width / obj.imageObject.height;

    switch (direction) {
      case 'arrowup':
        // Verkleinern (Höhe)
        obj.relHeight -= relStepY;
        obj.relWidth = obj.relHeight * aspectRatio;
        break;
      case 'arrowdown':
        // Vergrößern (Höhe)
        obj.relHeight += relStepY;
        obj.relWidth = obj.relHeight * aspectRatio;
        break;
      case 'arrowleft':
        // Verkleinern (Breite)
        obj.relWidth -= relStepX;
        obj.relHeight = obj.relWidth / aspectRatio;
        break;
      case 'arrowright':
        // Vergrößern (Breite)
        obj.relWidth += relStepX;
        obj.relHeight = obj.relWidth / aspectRatio;
        break;
    }

    // Minimale Größe (10px)
    const minSize = 10 / Math.min(canvas.width, canvas.height);
    if (obj.relWidth < minSize) obj.relWidth = minSize;
    if (obj.relHeight < minSize) obj.relHeight = minSize;

    // Redraw triggern
    if (this.canvasManager.redrawCallback) {
      this.canvasManager.redrawCallback();
    }

    console.log(`🔲 [Shortcut] Object resized ${direction} (${fast ? 'fast' : 'normal'})`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎬 RECORDING ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async prepareRecording() {
    try {
      await this.recorderStore.prepareRecording();
      console.log('🎬 [Shortcut] Recording prepared');
    } catch (error) {
      console.error('❌ [Shortcut] Prepare failed:', error);
    }
  }

  async toggleRecording() {
    if (this.recorderStore.isRecording) {
      await this.recorderStore.stopRecording();
      console.log('⏹️ [Shortcut] Recording stopped');
    } else if (this.recorderStore.isPrepared) {
      await this.recorderStore.startRecording();
      console.log('🔴 [Shortcut] Recording started');
    } else {
      console.warn('⚠️ [Shortcut] Recording not prepared! Press P first.');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 👁️ VIEW ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  toggleGrid() {
    this.gridStore.toggle();
    console.log('📐 [Shortcut] Grid toggled:', this.gridStore.isVisible);
  }

  deselectAll() {
    if (this.canvasManager?.activeObject) {
      this.canvasManager.setActiveObject(null);
      console.log('🔘 [Shortcut] All deselected');
    }
  }

  showHelp() {
    // Emittiere Event für App.vue um Help-Panel zu öffnen
    window.dispatchEvent(new CustomEvent('toggleKeyboardHelp'));
    console.log('❓ [Shortcut] Help toggled');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ↩️ UNDO/REDO ACTIONS (Placeholder)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  undo() {
    console.log('↩️ [Shortcut] Undo (not implemented yet)');
    // TODO: Implementiere Undo-System
  }

  redo() {
    console.log('↪️ [Shortcut] Redo (not implemented yet)');
    // TODO: Implementiere Redo-System
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📋 HELP & INFO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Gibt Liste aller verfügbaren Shortcuts zurück
   */
  getShortcutList() {
    return {
      'Player': {
        'Space': 'Play/Pause',
        'M': 'Mute/Unmute',
        '←/→': 'Previous/Next Track (when no object selected)'
      },
      'Object Manipulation': {
        'Delete/Backspace': 'Delete selected object',
        'Ctrl+D': 'Duplicate selected object',
        'Ctrl+C': 'Copy selected object',
        'Ctrl+V': 'Paste copied object',
        '↑/↓/←/→': 'Move selected object (5px)',
        'Shift+↑/↓/←/→': 'Move selected object (20px)',
        'Ctrl+↑/↓/←/→': 'Resize selected object (5px)',
        'Ctrl+Shift+↑/↓/←/→': 'Resize selected object (20px)'
      },
      'Recording': {
        'P': 'Prepare Recording',
        'R': 'Start/Stop Recording'
      },
      'View': {
        'G': 'Toggle Grid',
        'Escape': 'Deselect all',
        '?': 'Show Keyboard Shortcuts Help'
      },
      'Editing': {
        'Ctrl+Z': 'Undo (coming soon)',
        'Ctrl+Shift+Z': 'Redo (coming soon)'
      }
    };
  }

  /**
   * Loggt alle verfügbaren Shortcuts in die Console
   */
  printShortcuts() {
    const shortcuts = this.getShortcutList();
    console.log('⌨️ Keyboard Shortcuts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const [category, keys] of Object.entries(shortcuts)) {
      console.log(`\n${category}:`);
      for (const [key, description] of Object.entries(keys)) {
        console.log(`  ${key.padEnd(25)} - ${description}`);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * Cleanup beim Beenden
   */
  destroy() {
    this.disable();
    console.log('🧹 [KeyboardShortcuts] Destroyed');
  }
}
