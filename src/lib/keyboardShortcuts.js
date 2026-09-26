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

import { SHORTCUT_LIST, findShortcutRule, shortcutContext } from './keyboard/shortcutRules.js'
import { moveObject, resizeImageObject } from './keyboard/objectTransforms.js'

export class KeyboardShortcuts {
  constructor(stores, managers) {
    this.playerStore = stores.playerStore
    this.recorderStore = stores.recorderStore
    this.gridStore = stores.gridStore
    this.historyStore = stores.historyStore || null
    this.canvasManager = managers.canvasManager
    this.multiImageManager = managers.multiImageManager

    this.isEnabled = true
    this.copiedObject = null

    // Bind methods
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleKeyUp = this.handleKeyUp.bind(this)

    console.log('⌨️ [KeyboardShortcuts] Initialisiert')
  }

  /**
   * Aktiviert Keyboard Shortcuts
   */
  enable() {
    document.addEventListener('keydown', this.handleKeyDown)
    document.addEventListener('keyup', this.handleKeyUp)
    this.isEnabled = true
    console.log('✅ [KeyboardShortcuts] Aktiviert')
  }

  /**
   * Deaktiviert Keyboard Shortcuts
   */
  disable() {
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('keyup', this.handleKeyUp)
    this.isEnabled = false
    console.log('⏸️ [KeyboardShortcuts] Deaktiviert')
  }

  /**
   * Prüft ob Shortcuts ignoriert werden sollen
   * (z.B. wenn User in Input-Feld tippt)
   */
  shouldIgnoreShortcut(event) {
    const target = event.target
    const tagName = target.tagName.toLowerCase()

    // Ignoriere Shortcuts wenn in Input-Feldern getippt wird
    if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
      return true
    }

    // Ignoriere wenn Text-Editing aktiv ist
    if (this.canvasManager?.isEditingText) {
      return true
    }

    return false
  }

  /**
   * Haupt-Event-Handler: erste passende Regel aus SHORTCUT_RULES ausführen
   * (Reihenfolge und Bedingungen siehe keyboard/shortcutRules.js).
   */
  handleKeyDown(event) {
    if (!this.isEnabled || this.shouldIgnoreShortcut(event)) {
      return
    }
    const ctx = shortcutContext(event, this)
    findShortcutRule(ctx)?.run(this, ctx, event)
  }

  handleKeyUp(event) {
    // Platzhalter für Key-Up Events (falls später benötigt)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎵 PLAYER ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  togglePlayPause() {
    if (this.playerStore.isPlaying) {
      this.playerStore.pause()
      console.log('⏸️ [Shortcut] Pause')
    } else {
      this.playerStore.play()
      console.log('▶️ [Shortcut] Play')
    }
  }

  toggleMute() {
    this.playerStore.toggleMute()
    console.log('🔇 [Shortcut] Mute toggled:', this.playerStore.isMuted)
  }

  previousTrack() {
    this.playerStore.previousTrack()
    console.log('⏮️ [Shortcut] Previous Track')
  }

  nextTrack() {
    this.playerStore.nextTrack()
    console.log('⏭️ [Shortcut] Next Track')
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎨 OBJECT MANIPULATION ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  deleteSelectedObject() {
    if (!this.canvasManager?.activeObject) return

    this.canvasManager.deleteActiveObject()
    console.log('🗑️ [Shortcut] Object deleted')
  }

  duplicateSelectedObject() {
    const obj = this.canvasManager?.activeObject
    if (!obj) return

    if (obj.type === 'text') {
      // Dupliziere Text
      this.canvasManager.addText(obj.text, {
        relX: obj.relX + 0.05, // Leicht versetzt
        relY: obj.relY + 0.05,
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        color: obj.color,
        align: obj.align,
        fontWeight: obj.fontWeight,
        fontStyle: obj.fontStyle,
        textDecoration: obj.textDecoration,
        shadow: obj.shadow ? { ...obj.shadow } : null,
      })
      console.log('📋 [Shortcut] Text duplicated')
    } else if (obj.type === 'image') {
      // Dupliziere Bild
      this.multiImageManager?.addImage({
        ...obj,
        id: Date.now() + '_dup',
        relX: obj.relX + 0.05,
        relY: obj.relY + 0.05,
      })
      console.log('📋 [Shortcut] Image duplicated')
    }
  }

  copySelectedObject() {
    const obj = this.canvasManager?.activeObject
    if (!obj) return

    // Tiefe Kopie des Objekts
    this.copiedObject = JSON.parse(JSON.stringify(obj))
    console.log('📋 [Shortcut] Object copied:', obj.type)
  }

  pasteObject() {
    if (!this.copiedObject) return

    if (this.copiedObject.type === 'text') {
      this.canvasManager.addText(this.copiedObject.text, {
        ...this.copiedObject,
        relX: this.copiedObject.relX + 0.05,
        relY: this.copiedObject.relY + 0.05,
      })
      console.log('📄 [Shortcut] Text pasted')
    } else if (this.copiedObject.type === 'image') {
      this.multiImageManager?.addImage({
        ...this.copiedObject,
        id: Date.now() + '_paste',
        relX: this.copiedObject.relX + 0.05,
        relY: this.copiedObject.relY + 0.05,
      })
      console.log('📄 [Shortcut] Image pasted')
    }
  }

  moveSelectedObject(direction, fast = false) {
    const obj = this.canvasManager?.activeObject
    if (!obj || obj.type === 'background' || obj.type === 'workspace-background') return

    const canvas = this.canvasManager?.canvas
    if (!canvas) return

    moveObject(obj, direction, canvas, fast)
    this.canvasManager.redrawCallback?.()
    console.log(`➡️ [Shortcut] Object moved ${direction} (${fast ? 'fast' : 'normal'})`)
  }

  resizeSelectedObject(direction, fast = false) {
    const obj = this.canvasManager?.activeObject
    if (!obj || obj.type !== 'image') return // Nur Bilder

    const canvas = this.canvasManager?.canvas
    if (!canvas) return

    resizeImageObject(obj, direction, canvas, fast)
    this.canvasManager.redrawCallback?.()
    console.log(`🔲 [Shortcut] Object resized ${direction} (${fast ? 'fast' : 'normal'})`)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎬 RECORDING ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async prepareRecording() {
    try {
      await this.recorderStore.prepareRecording()
      console.log('🎬 [Shortcut] Recording prepared')
    } catch (error) {
      console.error('❌ [Shortcut] Prepare failed:', error)
    }
  }

  async toggleRecording() {
    if (this.recorderStore.isRecording) {
      await this.recorderStore.stopRecording()
      console.log('⏹️ [Shortcut] Recording stopped')
    } else if (this.recorderStore.isPrepared) {
      await this.recorderStore.startRecording()
      console.log('🔴 [Shortcut] Recording started')
    } else {
      console.warn('⚠️ [Shortcut] Recording not prepared! Press P first.')
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 👁️ VIEW ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  toggleGrid() {
    this.gridStore.toggle()
    console.log('📐 [Shortcut] Grid toggled:', this.gridStore.isVisible)
  }

  deselectAll() {
    if (this.canvasManager?.activeObject) {
      this.canvasManager.setActiveObject(null)
      console.log('🔘 [Shortcut] All deselected')
    }
  }

  showHelp() {
    // Emittiere Event für App.vue um Help-Panel zu öffnen
    window.dispatchEvent(new CustomEvent('toggleKeyboardHelp'))
    console.log('❓ [Shortcut] Help toggled')
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ↩️ UNDO/REDO ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  undo() {
    if (!this.historyStore) {
      console.warn('↩️ [Shortcut] Undo nicht verfügbar (kein History-Store)')
      return
    }
    this.historyStore.undo()
    console.log('↩️ [Shortcut] Undo')
  }

  redo() {
    if (!this.historyStore) {
      console.warn('↪️ [Shortcut] Redo nicht verfügbar (kein History-Store)')
      return
    }
    this.historyStore.redo()
    console.log('↪️ [Shortcut] Redo')
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📋 HELP & INFO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Gibt Liste aller verfügbaren Shortcuts zurück
   */
  getShortcutList() {
    // Eigene Kopie je Aufruf (Aufrufer dürfen sie verändern)
    return Object.fromEntries(
      Object.entries(SHORTCUT_LIST).map(([category, keys]) => [category, { ...keys }]),
    )
  }

  /**
   * Loggt alle verfügbaren Shortcuts in die Console
   */
  printShortcuts() {
    const shortcuts = this.getShortcutList()
    console.log('⌨️ Keyboard Shortcuts:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    for (const [category, keys] of Object.entries(shortcuts)) {
      console.log(`\n${category}:`)
      for (const [key, description] of Object.entries(keys)) {
        console.log(`  ${key.padEnd(25)} - ${description}`)
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }

  /**
   * Cleanup beim Beenden
   */
  destroy() {
    this.disable()
    console.log('🧹 [KeyboardShortcuts] Destroyed')
  }
}
