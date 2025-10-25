import { defineStore } from 'pinia';

/**
 * 📜 History Store - Verwaltet Undo/Redo Commands
 * 
 * Konzept: Command Pattern
 * - Jede Aktion wird als Command-Objekt gespeichert
 * - Commands können vorwärts (execute) und rückwärts (undo) ausgeführt werden
 * - History-Stack ermöglicht Navigation durch Änderungen
 */
export const useHistoryStore = defineStore('history', {
  state: () => ({
    // Command History - Array aller ausgeführten Commands
    history: [],
    
    // Aktueller Index in der History
    // -1 = keine Aktionen, 0 = erste Aktion, etc.
    currentIndex: -1,
    
    // Maximale History-Größe (verhindert Speicherprobleme)
    maxHistorySize: 50,
    
    // Flag: Blockiert History-Aufzeichnung während Undo/Redo
    isUndoRedoInProgress: false
  }),

  getters: {
    /**
     * Kann Undo ausgeführt werden?
     * True wenn wir nicht am Anfang der History sind
     */
    canUndo: (state) => state.currentIndex >= 0,

    /**
     * Kann Redo ausgeführt werden?
     * True wenn wir nicht am Ende der History sind
     */
    canRedo: (state) => state.currentIndex < state.history.length - 1,

    /**
     * Anzahl möglicher Undo-Schritte
     */
    undoCount: (state) => state.currentIndex + 1,

    /**
     * Anzahl möglicher Redo-Schritte
     */
    redoCount: (state) => state.history.length - state.currentIndex - 1
  },

  actions: {
    /**
     * 📝 Fügt ein neues Command zur History hinzu
     * 
     * @param {Object} command - Command-Objekt mit execute() und undo() Methoden
     */
    addCommand(command) {
      // Während Undo/Redo keine Commands aufzeichnen
      if (this.isUndoRedoInProgress) {
        return;
      }

      // Wenn wir nicht am Ende sind, schneide alles nach currentIndex ab
      // (Branch der History wird verworfen wenn neue Aktion kommt)
      if (this.currentIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.currentIndex + 1);
      }

      // Command hinzufügen
      this.history.push(command);
      this.currentIndex++;

      // History-Größe begrenzen (FIFO - First In First Out)
      if (this.history.length > this.maxHistorySize) {
        this.history.shift(); // Ältestes Element entfernen
        this.currentIndex--;
      }

      console.log('📝 Command hinzugefügt:', command.name || 'Unnamed', 
                  `(${this.currentIndex + 1}/${this.history.length})`);
    },

    /**
     * ↩️ Macht die letzte Aktion rückgängig
     */
    async undo() {
      if (!this.canUndo) {
        console.warn('⚠️ Undo nicht möglich - am Anfang der History');
        return;
      }

      this.isUndoRedoInProgress = true;

      try {
        const command = this.history[this.currentIndex];
        console.log('↩️ Undo:', command.name || 'Unnamed');
        
        // Command rückgängig machen
        await command.undo();
        
        this.currentIndex--;
      } catch (error) {
        console.error('❌ Undo fehlgeschlagen:', error);
      } finally {
        this.isUndoRedoInProgress = false;
      }
    },

    /**
     * ↪️ Wiederholt die letzte rückgängig gemachte Aktion
     */
    async redo() {
      if (!this.canRedo) {
        console.warn('⚠️ Redo nicht möglich - am Ende der History');
        return;
      }

      this.isUndoRedoInProgress = true;

      try {
        this.currentIndex++;
        const command = this.history[this.currentIndex];
        console.log('↪️ Redo:', command.name || 'Unnamed');
        
        // Command erneut ausführen
        await command.execute();
      } catch (error) {
        console.error('❌ Redo fehlgeschlagen:', error);
        this.currentIndex--; // Bei Fehler Index zurücksetzen
      } finally {
        this.isUndoRedoInProgress = false;
      }
    },

    /**
     * 🗑️ Löscht die komplette History
     */
    clear() {
      this.history = [];
      this.currentIndex = -1;
      console.log('🗑️ History gelöscht');
    },

    /**
     * 📊 Gibt History-Info für Debugging aus
     */
    debugHistory() {
      console.log('📊 History Debug Info:');
      console.log(`   Aktuelle Position: ${this.currentIndex + 1}/${this.history.length}`);
      console.log(`   Kann Undo: ${this.canUndo}`);
      console.log(`   Kann Redo: ${this.canRedo}`);
      console.log('   Commands:', this.history.map((cmd, i) => 
        `${i === this.currentIndex ? '→' : ' '} ${i}: ${cmd.name || 'Unnamed'}`
      ).join('\n   '));
    }
  }
});
