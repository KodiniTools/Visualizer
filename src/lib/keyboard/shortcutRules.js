/**
 * Tastenkürzel als Regel-Tabelle. Die Regeln werden in dieser Reihenfolge
 * geprüft, die ERSTE passende gewinnt – die Reihenfolge ist Teil des
 * Verhaltens (z. B. Pfeiltasten: ohne Auswahl Titelwechsel, mit Auswahl
 * Objekt verschieben).
 *
 * Eine Regel: { when(ctx): boolean, run(shortcuts, ctx, event): void }
 */

/** Buchstaben/Zeichen, die als Kürzel dienen und NICHT den Texteditor öffnen. */
const SHORTCUT_CHARS = ['m', 'r', 'p', 'g', '?', ' ']

const ARROWS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright']

/**
 * Zustand eines Tastendrucks für die Regeln.
 * @param {KeyboardEvent} event
 * @param {{ canvasManager?: object, copiedObject: object|null }} shortcuts
 */
export function shortcutContext(event, shortcuts) {
  return {
    rawKey: event.key,
    key: event.key.toLowerCase(),
    ctrl: event.ctrlKey || event.metaKey, // metaKey = Cmd auf dem Mac
    shift: event.shiftKey,
    alt: event.altKey,
    hasSelection: !!shortcuts.canvasManager?.activeObject,
    hasCopy: !!shortcuts.copiedObject,
  }
}

/** Regel, die preventDefault() aufruft und dann die Aktion ausführt. */
function rule(when, action) {
  return {
    when,
    run(shortcuts, ctx, event) {
      event.preventDefault()
      action(shortcuts, ctx)
    },
  }
}

/** Taste ohne Strg/Cmd und ohne Shift. */
const plain = (key) => (c) => c.key === key && !c.ctrl && !c.shift

export const SHORTCUT_RULES = [
  // ✨ Texteingabe: einzelnes druckbares Zeichen ohne Modifikator und ohne
  // Auswahl öffnet den Texteditor mit diesem Zeichen. MUSS vor den Kürzeln stehen.
  {
    when: (c) =>
      !c.ctrl &&
      !c.alt &&
      !c.shift &&
      c.rawKey.length === 1 &&
      !c.hasSelection &&
      !SHORTCUT_CHARS.includes(c.key),
    run(shortcuts, ctx, event) {
      window.dispatchEvent(
        new CustomEvent('openTextEditorWithChar', { detail: { char: ctx.rawKey } }),
      )
      event.preventDefault()
    },
  },

  // 🎵 Player
  rule(
    (c) => c.key === ' ',
    (s) => s.togglePlayPause(),
  ),
  // M (ohne Zusatztaste) setzt einen Beat-Marker (useBeatMarkers) – daher hier
  // nur Umschalt+M für Stummschalten, sonst lösten beide Aktionen gleichzeitig aus
  rule(
    (c) => c.key === 'm' && c.shift && !c.ctrl && !c.alt,
    (s) => s.toggleMute(),
  ),
  // Pfeil links/rechts ohne Auswahl = vorheriger/nächster Titel
  rule(
    (c) => c.key === 'arrowleft' && !c.hasSelection,
    (s) => s.previousTrack(),
  ),
  rule(
    (c) => c.key === 'arrowright' && !c.hasSelection,
    (s) => s.nextTrack(),
  ),

  // 🎨 Objekte
  rule(
    (c) => (c.key === 'delete' || c.key === 'backspace') && c.hasSelection,
    (s) => s.deleteSelectedObject(),
  ),
  rule(
    (c) => c.key === 'd' && c.ctrl && c.hasSelection,
    (s) => s.duplicateSelectedObject(),
  ),
  rule(
    (c) => c.key === 'c' && c.ctrl && c.hasSelection,
    (s) => s.copySelectedObject(),
  ),
  rule(
    (c) => c.key === 'v' && c.ctrl && c.hasCopy,
    (s) => s.pasteObject(),
  ),
  // Pfeile mit Auswahl: verschieben, mit Strg/Cmd Größe ändern; Shift = große Schritte
  rule(
    (c) => c.hasSelection && ARROWS.includes(c.key),
    (s, c) => {
      if (c.ctrl) s.resizeSelectedObject(c.key, c.shift)
      else s.moveSelectedObject(c.key, c.shift)
    },
  ),

  // 🎬 Aufnahme
  rule(plain('r'), (s) => s.toggleRecording()),
  rule(plain('p'), (s) => s.prepareRecording()),

  // 👁️ Ansicht
  rule(plain('g'), (s) => s.toggleGrid()),
  rule(
    (c) => c.key === 'escape',
    (s) => s.deselectAll(),
  ),
  rule(plain('?'), (s) => s.showHelp()),

  // ↩️ Rückgängig / Wiederholen
  rule(
    (c) => c.key === 'z' && c.ctrl && !c.shift,
    (s) => s.undo(),
  ),
  rule(
    (c) => (c.key === 'z' && c.ctrl && c.shift) || (c.key === 'y' && c.ctrl),
    (s) => s.redo(),
  ),
]

/**
 * Erste passende Regel für einen Tastendruck (oder undefined).
 * @param {ReturnType<typeof shortcutContext>} ctx
 */
export function findShortcutRule(ctx) {
  return SHORTCUT_RULES.find((r) => r.when(ctx))
}

/** Liste aller Kürzel für Hilfe/Konsole (nach Kategorie). */
export const SHORTCUT_LIST = Object.freeze({
  Player: {
    Space: 'Play/Pause',
    M: 'Add beat marker',
    'Shift+M': 'Mute/Unmute',
    '←/→': 'Previous/Next Track (when no object selected)',
  },
  'Object Manipulation': {
    'Delete/Backspace': 'Delete selected object',
    'Ctrl+D': 'Duplicate selected object',
    'Ctrl+C': 'Copy selected object',
    'Ctrl+V': 'Paste copied object',
    '↑/↓/←/→': 'Move selected object (5px)',
    'Shift+↑/↓/←/→': 'Move selected object (20px)',
    'Ctrl+↑/↓/←/→': 'Resize selected object (5px)',
    'Ctrl+Shift+↑/↓/←/→': 'Resize selected object (20px)',
  },
  Recording: {
    P: 'Prepare Recording',
    R: 'Start/Stop Recording',
  },
  View: {
    G: 'Toggle Grid',
    Escape: 'Deselect all',
    '?': 'Show Keyboard Shortcuts Help',
  },
  Editing: {
    'Ctrl+Z': 'Undo',
    'Ctrl+Shift+Z / Ctrl+Y': 'Redo',
  },
})
