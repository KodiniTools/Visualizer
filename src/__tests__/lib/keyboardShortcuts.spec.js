// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KeyboardShortcuts } from '../../lib/keyboardShortcuts.js'

/**
 * Verhaltenstest für KeyboardShortcuts.
 *
 * 1. Zuordnungstabelle: Für jede Kombination aus Taste × Modifikatoren ×
 *    Zustand (Auswahl, Zwischenablage) wird protokolliert, welche Aktion
 *    ausgelöst wird und ob preventDefault() aufgerufen wird. Der Snapshot
 *    sichert die Priorität der Regeln (erste passende Regel gewinnt).
 * 2. Aktionen: Wirkung der einzelnen Aktionen auf Stores/Manager.
 */

const ACTIONS = [
  'togglePlayPause',
  'toggleMute',
  'previousTrack',
  'nextTrack',
  'deleteSelectedObject',
  'duplicateSelectedObject',
  'copySelectedObject',
  'pasteObject',
  'moveSelectedObject',
  'resizeSelectedObject',
  'toggleRecording',
  'prepareRecording',
  'toggleGrid',
  'deselectAll',
  'showHelp',
  'undo',
  'redo',
]

const KEYS = [
  'a',
  'A',
  'm',
  'M',
  'r',
  'p',
  'g',
  '?',
  ' ',
  'd',
  'c',
  'v',
  'z',
  'Z',
  'y',
  '1',
  'ä',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Delete',
  'Backspace',
  'Escape',
  'Enter',
  'Tab',
]

const MODIFIERS = {
  none: {},
  ctrl: { ctrlKey: true },
  meta: { metaKey: true },
  shift: { shiftKey: true },
  alt: { altKey: true },
  'ctrl+shift': { ctrlKey: true, shiftKey: true },
  'ctrl+alt': { ctrlKey: true, altKey: true },
}

const STATES = {
  leer: { activeObject: null, copied: null },
  text: { activeObject: { type: 'text' }, copied: null },
  bild: { activeObject: { type: 'image' }, copied: null },
  'leer+kopie': { activeObject: null, copied: { type: 'text' } },
  'bild+kopie': { activeObject: { type: 'image' }, copied: { type: 'image' } },
}

function makeEvent(key, mods = {}, target = { tagName: 'DIV', isContentEditable: false }) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
    target,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true
    },
  }
}

function makeShortcuts(canvasOverrides = {}) {
  const calls = []
  const rec =
    (name) =>
    (...args) =>
      calls.push(`${name}(${args.map((a) => JSON.stringify(a)).join(', ')})`)
  const stores = {
    playerStore: {
      isPlaying: false,
      isMuted: false,
      togglePlayPause: rec('player.togglePlayPause'),
      toggleMute: rec('player.toggleMute'),
      prevTrack: rec('player.prevTrack'),
      nextTrack: rec('player.nextTrack'),
    },
    recorderStore: {
      isRecording: false,
      isPrepared: false,
      prepareRecording: vi.fn(async () => calls.push('recorder.prepare')),
      startRecording: vi.fn(async () => calls.push('recorder.start')),
      stopRecording: vi.fn(async () => calls.push('recorder.stop')),
    },
    gridStore: { isVisible: false, toggle: rec('grid.toggle') },
    historyStore: { undo: rec('history.undo'), redo: rec('history.redo') },
  }
  const canvasManager = {
    activeObject: null,
    isEditingText: false,
    canvas: { width: 1000, height: 500 },
    deleteActiveObject: rec('cm.deleteActiveObject'),
    addText: rec('cm.addText'),
    setActiveObject: rec('cm.setActiveObject'),
    redrawCallback: rec('cm.redraw'),
    ...canvasOverrides,
  }
  const multiImageManager = { addImage: rec('mim.addImage') }
  const ks = new KeyboardShortcuts(stores, { canvasManager, multiImageManager })
  return { ks, calls, stores, canvasManager, multiImageManager }
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('KeyboardShortcuts – Zuordnung Taste → Aktion', () => {
  it('vollständige Tabelle (Taste × Modifikatoren × Zustand)', () => {
    const rows = []
    for (const [stateName, state] of Object.entries(STATES)) {
      for (const [modName, mods] of Object.entries(MODIFIERS)) {
        for (const key of KEYS) {
          const { ks, canvasManager } = makeShortcuts({ activeObject: state.activeObject })
          ks.copiedObject = state.copied
          const hit = []
          for (const name of ACTIONS) {
            vi.spyOn(ks, name).mockImplementation((...args) => {
              hit.push(`${name}(${args.map((a) => JSON.stringify(a)).join(', ')})`)
            })
          }
          const textEvents = []
          const onText = (e) => textEvents.push(`openTextEditorWithChar(${e.detail.char})`)
          window.addEventListener('openTextEditorWithChar', onText)
          const event = makeEvent(key, mods)
          ks.handleKeyDown(event)
          window.removeEventListener('openTextEditorWithChar', onText)
          void canvasManager
          const result = [...textEvents, ...hit].join(' ') || '–'
          rows.push(
            `${stateName.padEnd(10)} ${modName.padEnd(10)} ${JSON.stringify(key).padEnd(12)} → ${result}${event.defaultPrevented ? ' [prevent]' : ''}`,
          )
        }
      }
    }
    expect(rows).toMatchSnapshot()
  })

  it('ignoriert Eingabefelder, contenteditable, Text-Bearbeitung und deaktivierten Zustand', () => {
    const targets = [
      { tagName: 'INPUT' },
      { tagName: 'TEXTAREA' },
      { tagName: 'DIV', isContentEditable: true },
    ]
    for (const target of targets) {
      const { ks, calls } = makeShortcuts()
      const event = makeEvent(' ', {}, target)
      ks.handleKeyDown(event)
      expect(calls).toEqual([])
      expect(event.defaultPrevented).toBe(false)
    }
    const editing = makeShortcuts({ isEditingText: true })
    editing.ks.handleKeyDown(makeEvent(' '))
    expect(editing.calls).toEqual([])

    const disabled = makeShortcuts()
    disabled.ks.isEnabled = false
    disabled.ks.handleKeyDown(makeEvent(' '))
    expect(disabled.calls).toEqual([])
  })

  it('enable/disable registrieren die Listener am document', () => {
    const { ks, calls } = makeShortcuts()
    ks.enable()
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))
    expect(calls).toEqual(['grid.toggle()'])
    ks.destroy()
    expect(ks.isEnabled).toBe(false)
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))
    expect(calls).toEqual(['grid.toggle()'])
  })
})

describe('KeyboardShortcuts – Aktionen', () => {
  it('Player', () => {
    const { ks, calls, stores } = makeShortcuts()
    ks.togglePlayPause()
    stores.playerStore.isPlaying = true
    ks.togglePlayPause()
    ks.toggleMute()
    ks.previousTrack()
    ks.nextTrack()
    expect(calls).toEqual([
      'player.togglePlayPause()',
      'player.togglePlayPause()',
      'player.toggleMute()',
      'player.prevTrack()',
      'player.nextTrack()',
    ])
  })

  it('Player-Aktionen rufen nur Funktionen, die der echte Player-Store hat', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    const { usePlayerStore } = await import('../../stores/playerStore.js')
    setActivePinia(createPinia())
    const playerStore = usePlayerStore()
    const ks = new KeyboardShortcuts({ playerStore, gridStore: {} }, { canvasManager: null })
    // ohne Titel: kein Fehler (vorher: „play/previousTrack/toggleMute is not a function“)
    expect(() => ks.togglePlayPause()).not.toThrow()
    expect(() => ks.previousTrack()).not.toThrow()
    expect(() => ks.nextTrack()).not.toThrow()
    expect(() => ks.toggleMute()).not.toThrow()
    expect(playerStore.isMuted).toBe(true)
    ks.toggleMute()
    expect(playerStore.isMuted).toBe(false)
  })

  it('Löschen, Auswahl aufheben (nur mit Auswahl)', () => {
    const { ks, calls, canvasManager } = makeShortcuts()
    ks.deleteSelectedObject()
    ks.deselectAll()
    expect(calls).toEqual([])
    canvasManager.activeObject = { type: 'text' }
    ks.deleteSelectedObject()
    ks.deselectAll()
    expect(calls).toEqual(['cm.deleteActiveObject()', 'cm.setActiveObject(null)'])
  })

  it('Duplizieren und Kopieren/Einfügen (Text + Bild)', () => {
    vi.spyOn(Date, 'now').mockReturnValue(777)
    const text = {
      type: 'text',
      text: 'Hallo',
      relX: 0.1,
      relY: 0.2,
      fontSize: 30,
      fontFamily: 'Arial',
      color: '#fff',
      align: 'center',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none',
      shadow: { blur: 2 },
      extra: 'x',
    }
    const image = { type: 'image', id: 5, relX: 0.3, relY: 0.4, relWidth: 0.2, src: 'a.png' }
    const { ks, calls, canvasManager } = makeShortcuts({ activeObject: text })
    ks.duplicateSelectedObject()
    ks.copySelectedObject()
    text.relX = 0.9 // Kopie ist unabhängig vom Original
    ks.pasteObject()
    canvasManager.activeObject = image
    ks.duplicateSelectedObject()
    ks.copySelectedObject()
    ks.pasteObject()
    canvasManager.activeObject = { type: 'video' }
    ks.duplicateSelectedObject()
    canvasManager.activeObject = null
    ks.duplicateSelectedObject()
    ks.copySelectedObject()
    ks.copiedObject = null
    ks.pasteObject()
    expect(calls).toMatchSnapshot()
  })

  it('Verschieben (5/20 px) – nicht für Hintergründe', () => {
    const { ks, calls, canvasManager } = makeShortcuts()
    const obj = { type: 'text', relX: 0.5, relY: 0.5 }
    canvasManager.activeObject = obj
    for (const dir of ['arrowup', 'arrowdown', 'arrowleft', 'arrowright']) {
      ks.moveSelectedObject(dir)
      ks.moveSelectedObject(dir, true)
    }
    ks.moveSelectedObject('arrowup', true)
    expect(obj.relX).toBeCloseTo(0.5)
    expect(obj.relY).toBeCloseTo(0.5 - 20 / 500)
    for (const type of ['background', 'workspace-background']) {
      canvasManager.activeObject = { type, relX: 0, relY: 0 }
      ks.moveSelectedObject('arrowdown')
      expect(canvasManager.activeObject.relY).toBe(0)
    }
    canvasManager.activeObject = obj
    canvasManager.canvas = null
    ks.moveSelectedObject('arrowdown')
    expect(calls.filter((c) => c === 'cm.redraw()')).toHaveLength(9)
  })

  it('Größe ändern mit Seitenverhältnis und Mindestgröße – nur Bilder', () => {
    const { ks, calls, canvasManager } = makeShortcuts()
    const img = {
      type: 'image',
      relWidth: 0.2,
      relHeight: 0.1,
      imageObject: { width: 400, height: 100 },
    }
    canvasManager.activeObject = img
    const snaps = []
    for (const [dir, fast] of [
      ['arrowdown', false],
      ['arrowup', true],
      ['arrowright', false],
      ['arrowleft', true],
    ]) {
      ks.resizeSelectedObject(dir, fast)
      snaps.push([img.relWidth, img.relHeight].map((v) => Math.round(v * 1e6) / 1e6))
    }
    // Mindestgröße 10 px
    for (let i = 0; i < 40; i++) ks.resizeSelectedObject('arrowleft', true)
    snaps.push([img.relWidth, img.relHeight].map((v) => Math.round(v * 1e6) / 1e6))
    expect(snaps).toMatchSnapshot()

    const text = { type: 'text', relWidth: 0.2, relHeight: 0.1 }
    canvasManager.activeObject = text
    ks.resizeSelectedObject('arrowdown')
    expect(text.relHeight).toBe(0.1)
    expect(calls.filter((c) => c === 'cm.redraw()')).toHaveLength(44)
  })

  it('Aufnahme vorbereiten/starten/stoppen', async () => {
    const { ks, calls, stores } = makeShortcuts()
    await ks.toggleRecording()
    expect(console.warn).toHaveBeenCalled()
    await ks.prepareRecording()
    stores.recorderStore.isPrepared = true
    await ks.toggleRecording()
    stores.recorderStore.isRecording = true
    await ks.toggleRecording()
    stores.recorderStore.prepareRecording.mockRejectedValueOnce(new Error('nein'))
    await ks.prepareRecording()
    expect(console.error).toHaveBeenCalled()
    expect(calls).toEqual(['recorder.prepare', 'recorder.start', 'recorder.stop'])
  })

  it('Raster, Hilfe, Undo/Redo (auch ohne History-Store)', () => {
    const { ks, calls } = makeShortcuts()
    const help = vi.fn()
    window.addEventListener('toggleKeyboardHelp', help)
    ks.toggleGrid()
    ks.showHelp()
    ks.undo()
    ks.redo()
    window.removeEventListener('toggleKeyboardHelp', help)
    expect(help).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['grid.toggle()', 'history.undo()', 'history.redo()'])

    ks.historyStore = null
    ks.undo()
    ks.redo()
    expect(console.warn).toHaveBeenCalledTimes(2)
  })

  it('Shortcut-Liste und Konsolenausgabe', () => {
    const { ks } = makeShortcuts()
    expect(ks.getShortcutList()).toMatchSnapshot()
    ks.printShortcuts()
    expect(console.log.mock.calls.map((c) => c.join(' '))).toMatchSnapshot()
  })
})

describe('KeyboardShortcuts – Shortcut-Liste', () => {
  it('liefert je Aufruf eine eigene, veränderbare Kopie', () => {
    const { ks } = makeShortcuts()
    const a = ks.getShortcutList()
    a.Player.Space = 'geändert'
    a.Neu = {}
    expect(ks.getShortcutList().Player.Space).toBe('Play/Pause')
    expect(ks.getShortcutList().Neu).toBeUndefined()
  })
})
