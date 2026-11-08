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

import {
  SHORTCUT_LIST,
  findShortcutRule,
  shortcutContext,
  type ShortcutHandlers,
} from './keyboard/shortcutRules'
import { moveObject, resizeImageObject, type RelObject } from './keyboard/objectTransforms'

type Loose = Record<string, unknown>

/** Markiertes Canvas-Objekt (Text, Bild, Hintergrund …) */
export type ShortcutObject = RelObject & { type?: string } & Loose

/** Benötigte Store-Ausschnitte */
export interface ShortcutStores {
  playerStore: {
    togglePlayPause(): unknown
    toggleMute(): unknown
    prevTrack(): unknown
    nextTrack(): unknown
    isMuted?: boolean
  }
  recorderStore: {
    isRecording: boolean
    isPrepared: boolean
    prepareRecording(): unknown
    startRecording(): unknown
    stopRecording(): unknown
  }
  gridStore: { toggleGrid(): unknown; isVisible?: boolean }
  historyStore?: { undo(): unknown; redo(): unknown } | null
}

/** Benötigte Manager-Ausschnitte */
export interface ShortcutManagers {
  canvasManager: {
    activeObject?: ShortcutObject | null
    isEditingText?: boolean
    canvas?: { width: number; height: number } | null
    redrawCallback?: (() => void) | null
    deleteActiveObject(): unknown
    addText(text: unknown, options: Loose): unknown
    setActiveObject(obj: null): unknown
  }
  multiImageManager?: { addImage(image: Loose): unknown } | null
}

export class KeyboardShortcuts implements ShortcutHandlers {
  playerStore: ShortcutStores['playerStore']
  recorderStore: ShortcutStores['recorderStore']
  gridStore: ShortcutStores['gridStore']
  historyStore: NonNullable<ShortcutStores['historyStore']> | null
  canvasManager: ShortcutManagers['canvasManager']
  multiImageManager: ShortcutManagers['multiImageManager']
  isEnabled: boolean
  copiedObject: ShortcutObject | null

  constructor(stores: ShortcutStores, managers: ShortcutManagers) {
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
  enable(): void {
    document.addEventListener('keydown', this.handleKeyDown)
    document.addEventListener('keyup', this.handleKeyUp)
    this.isEnabled = true
    console.log('✅ [KeyboardShortcuts] Aktiviert')
  }

  /**
   * Deaktiviert Keyboard Shortcuts
   */
  disable(): void {
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('keyup', this.handleKeyUp)
    this.isEnabled = false
    console.log('⏸️ [KeyboardShortcuts] Deaktiviert')
  }

  /**
   * Prüft ob Shortcuts ignoriert werden sollen
   * (z.B. wenn User in Input-Feld tippt)
   */
  shouldIgnoreShortcut(event: KeyboardEvent): boolean {
    // Tastatur-Events kommen von Elementen
    const target = event.target as HTMLElement
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
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled || this.shouldIgnoreShortcut(event)) {
      return
    }
    const ctx = shortcutContext(event, this)
    findShortcutRule(ctx)?.run(this, ctx, event)
  }

  handleKeyUp(event: KeyboardEvent): void {
    // Platzhalter für Key-Up Events (falls später benötigt)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎵 PLAYER ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  togglePlayPause(): void {
    this.playerStore.togglePlayPause()
    console.log('⏯️ [Shortcut] Play/Pause')
  }

  toggleMute(): void {
    this.playerStore.toggleMute()
    console.log('🔇 [Shortcut] Mute toggled:', this.playerStore.isMuted)
  }

  previousTrack(): void {
    this.playerStore.prevTrack()
    console.log('⏮️ [Shortcut] Previous Track')
  }

  nextTrack(): void {
    this.playerStore.nextTrack()
    console.log('⏭️ [Shortcut] Next Track')
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎨 OBJECT MANIPULATION ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  deleteSelectedObject(): void {
    if (!this.canvasManager?.activeObject) return

    this.canvasManager.deleteActiveObject()
    console.log('🗑️ [Shortcut] Object deleted')
  }

  duplicateSelectedObject(): void {
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

  copySelectedObject(): void {
    const obj = this.canvasManager?.activeObject
    if (!obj) return

    // Tiefe Kopie des Objekts
    this.copiedObject = JSON.parse(JSON.stringify(obj))
    console.log('📋 [Shortcut] Object copied:', obj.type)
  }

  pasteObject(): void {
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

  moveSelectedObject(direction: string, fast = false): void {
    const obj = this.canvasManager?.activeObject
    if (!obj || obj.type === 'background' || obj.type === 'workspace-background') return

    const canvas = this.canvasManager?.canvas
    if (!canvas) return

    moveObject(obj, direction, canvas, fast)
    this.canvasManager.redrawCallback?.()
    console.log(`➡️ [Shortcut] Object moved ${direction} (${fast ? 'fast' : 'normal'})`)
  }

  resizeSelectedObject(direction: string, fast = false): void {
    const obj = this.canvasManager?.activeObject
    if (!obj || obj.type !== 'image') return // Nur Bilder

    const canvas = this.canvasManager?.canvas
    if (!canvas) return

    // Bilder haben immer ein imageObject
    resizeImageObject(
      obj as ShortcutObject & { imageObject: { width: number; height: number } },
      direction,
      canvas,
      fast,
    )
    this.canvasManager.redrawCallback?.()
    console.log(`🔲 [Shortcut] Object resized ${direction} (${fast ? 'fast' : 'normal'})`)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎬 RECORDING ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async prepareRecording(): Promise<void> {
    try {
      await this.recorderStore.prepareRecording()
      console.log('🎬 [Shortcut] Recording prepared')
    } catch (error) {
      console.error('❌ [Shortcut] Prepare failed:', error)
    }
  }

  async toggleRecording(): Promise<void> {
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

  toggleGrid(): void {
    this.gridStore.toggleGrid()
    console.log('📐 [Shortcut] Grid toggled:', this.gridStore.isVisible)
  }

  deselectAll(): void {
    if (this.canvasManager?.activeObject) {
      this.canvasManager.setActiveObject(null)
      console.log('🔘 [Shortcut] All deselected')
    }
  }

  showHelp(): void {
    // Emittiere Event für App.vue um Help-Panel zu öffnen
    window.dispatchEvent(new CustomEvent('toggleKeyboardHelp'))
    console.log('❓ [Shortcut] Help toggled')
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ↩️ UNDO/REDO ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  undo(): void {
    if (!this.historyStore) {
      console.warn('↩️ [Shortcut] Undo nicht verfügbar (kein History-Store)')
      return
    }
    this.historyStore.undo()
    console.log('↩️ [Shortcut] Undo')
  }

  redo(): void {
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
  getShortcutList(): Record<string, Record<string, string>> {
    // Eigene Kopie je Aufruf (Aufrufer dürfen sie verändern)
    return Object.fromEntries(
      Object.entries(SHORTCUT_LIST).map(([category, keys]) => [category, { ...keys }]),
    )
  }

  /**
   * Loggt alle verfügbaren Shortcuts in die Console
   */
  printShortcuts(): void {
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
  destroy(): void {
    this.disable()
    console.log('🧹 [KeyboardShortcuts] Destroyed')
  }
}
