/**
 * 🎯 Base Command Class
 * 
 * Alle Commands erben von dieser Klasse und implementieren:
 * - execute(): Führt die Aktion aus
 * - undo(): Macht die Aktion rückgängig
 * 
 * Optional:
 * - merge(): Kombiniert mehrere ähnliche Commands (z.B. mehrere Textänderungen)
 */
export class Command {
  constructor(name = 'Unnamed Command') {
    this.name = name;
    this.timestamp = Date.now();
  }

  /**
   * Führt das Command aus
   * Muss von Unterklassen implementiert werden
   */
  async execute() {
    throw new Error('execute() muss implementiert werden');
  }

  /**
   * Macht das Command rückgängig
   * Muss von Unterklassen implementiert werden
   */
  async undo() {
    throw new Error('undo() muss implementiert werden');
  }

  /**
   * Optional: Merge-Logik für ähnliche Commands
   * Gibt true zurück wenn Commands gemerged wurden
   */
  merge(otherCommand) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 BEISPIEL-COMMANDS für deine App
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🖼️ Command: Objekt zum Canvas hinzufügen
 * Verwendet für: Bilder, Texte, Shapes
 */
export class AddObjectCommand extends Command {
  constructor(canvasManager, object) {
    super('Objekt hinzufügen');
    this.canvasManager = canvasManager;
    this.object = object;
  }

  async execute() {
    // Objekt zum Canvas hinzufügen
    this.canvasManager.addObject(this.object);
  }

  async undo() {
    // Objekt vom Canvas entfernen
    this.canvasManager.removeObject(this.object);
  }
}

/**
 * 🗑️ Command: Objekt vom Canvas entfernen
 */
export class DeleteObjectCommand extends Command {
  constructor(canvasManager, object) {
    super('Objekt löschen');
    this.canvasManager = canvasManager;
    this.object = object;
    // Index merken für korrektes Undo
    this.objectIndex = canvasManager.getObjects().indexOf(object);
  }

  async execute() {
    this.canvasManager.removeObject(this.object);
  }

  async undo() {
    // Objekt an ursprünglicher Position wiederherstellen
    this.canvasManager.insertObjectAt(this.object, this.objectIndex);
  }
}

/**
 * 🎨 Command: Objekteigenschaften ändern
 * Verwendet für: Position, Größe, Farbe, etc.
 */
export class ModifyObjectCommand extends Command {
  constructor(object, propertyName, newValue, oldValue) {
    super(`${propertyName} ändern`);
    this.object = object;
    this.propertyName = propertyName;
    this.newValue = newValue;
    this.oldValue = oldValue;
  }

  async execute() {
    this.object[this.propertyName] = this.newValue;
  }

  async undo() {
    this.object[this.propertyName] = this.oldValue;
  }

  // Merge-Logik: Mehrere Änderungen derselben Property zusammenfassen
  merge(otherCommand) {
    if (
      otherCommand instanceof ModifyObjectCommand &&
      otherCommand.object === this.object &&
      otherCommand.propertyName === this.propertyName &&
      Date.now() - this.timestamp < 500 // Innerhalb 500ms
    ) {
      // Nur den newValue aktualisieren, oldValue beibehalten
      this.newValue = otherCommand.newValue;
      this.timestamp = otherCommand.timestamp;
      return true;
    }
    return false;
  }
}

/**
 * 📝 Command: Text ändern
 * Spezialisiert für TextManager
 */
export class ChangeTextCommand extends Command {
  constructor(textStore, textId, newText, oldText) {
    super('Text ändern');
    this.textStore = textStore;
    this.textId = textId;
    this.newText = newText;
    this.oldText = oldText;
  }

  async execute() {
    const textItem = this.textStore.texts.find(t => t.id === this.textId);
    if (textItem) {
      textItem.text = this.newText;
    }
  }

  async undo() {
    const textItem = this.textStore.texts.find(t => t.id === this.textId);
    if (textItem) {
      textItem.text = this.oldText;
    }
  }

  // Merge-Logik: Mehrere Textänderungen zusammenfassen
  merge(otherCommand) {
    if (
      otherCommand instanceof ChangeTextCommand &&
      otherCommand.textId === this.textId &&
      Date.now() - this.timestamp < 1000 // Innerhalb 1 Sekunde
    ) {
      this.newText = otherCommand.newText;
      this.timestamp = otherCommand.timestamp;
      return true;
    }
    return false;
  }
}

/**
 * 🔄 Command: Mehrere Commands als Gruppe
 * Nützlich für komplexe Operationen die aus mehreren Schritten bestehen
 */
export class CompositeCommand extends Command {
  constructor(name, commands = []) {
    super(name);
    this.commands = commands;
  }

  addCommand(command) {
    this.commands.push(command);
  }

  async execute() {
    // Alle Commands in Reihenfolge ausführen
    for (const command of this.commands) {
      await command.execute();
    }
  }

  async undo() {
    // Alle Commands in umgekehrter Reihenfolge rückgängig machen
    for (let i = this.commands.length - 1; i >= 0; i--) {
      await this.commands[i].undo();
    }
  }
}

/**
 * 📸 Command: Vollständiger State-Snapshot
 * Fallback wenn Command Pattern zu komplex ist
 * Speicherintensiv, aber sicher
 */
export class StateSnapshotCommand extends Command {
  constructor(name, getStateFunc, setStateFunc) {
    super(name);
    this.getStateFunc = getStateFunc;
    this.setStateFunc = setStateFunc;
    
    // State vor der Änderung speichern
    this.beforeState = this.captureState();
    this.afterState = null;
  }

  captureState() {
    return JSON.parse(JSON.stringify(this.getStateFunc()));
  }

  completeExecution() {
    // State nach der Änderung speichern
    this.afterState = this.captureState();
  }

  async execute() {
    if (this.afterState) {
      this.setStateFunc(this.afterState);
    }
  }

  async undo() {
    this.setStateFunc(this.beforeState);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛠️ HELPER: Command ausführen und zur History hinzufügen
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Führt ein Command aus und fügt es zur History hinzu
 * 
 * @param {Command} command - Das auszuführende Command
 * @param {Object} historyStore - Der History Store
 */
export async function executeCommand(command, historyStore) {
  try {
    await command.execute();
    
    // Versuche mit letztem Command zu mergen
    if (historyStore.history.length > 0 && historyStore.currentIndex >= 0) {
      const lastCommand = historyStore.history[historyStore.currentIndex];
      if (lastCommand.merge && lastCommand.merge(command)) {
        console.log('🔗 Command gemerged mit vorherigem:', command.name);
        return;
      }
    }
    
    historyStore.addCommand(command);
  } catch (error) {
    console.error('❌ Command-Ausführung fehlgeschlagen:', error);
    throw error;
  }
}
