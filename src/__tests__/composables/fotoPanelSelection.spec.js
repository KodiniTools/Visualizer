// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, toRaw } from 'vue'
import { useCanvasSetup } from '../../composables/useCanvasSetup.js'
import { useCanvasImages } from '../../composables/useCanvasImages.js'
import { registerFotoPanel } from '../../lib/fotoPanelBridge.js'

/**
 * Verhaltenstest: Canvas-Auswahl → Foto-Panel (aktives Bild + Filter laden).
 * Die Panel-Anbindung läuft über registerPanel(), damit die Erwartungen
 * unabhängig davon bleiben, wie das Panel registriert wird.
 */

function registerPanel(controls) {
  return registerFotoPanel(controls)
}

let unregister = () => {}

function makePanel() {
  return { currentActiveImage: ref(null), loadImageSettings: vi.fn() }
}

function setupSelection() {
  const selectedCanvasImageId = ref(null)
  const fotoManager = { updateUIFromSettings: vi.fn() }
  const api = useCanvasSetup({
    audioRef: ref(null),
    managers: {
      canvasManagerInstance: ref(null),
      fotoManagerInstance: ref(fotoManager),
      gridManagerInstance: ref(null),
      multiImageManagerInstance: ref(null),
      videoManagerInstance: ref(null),
    },
    stores: {},
    t: (k) => k,
    getRecordingCanvas: () => null,
    selectedCanvasImageId,
  })
  return { onObjectSelected: api.onObjectSelected, selectedCanvasImageId, fotoManager }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  unregister()
  unregister = () => {}
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('onObjectSelected → Foto-Panel', () => {
  it('Bild: setzt aktives Bild, Auswahl-ID und lädt die Filter', () => {
    const panel = makePanel()
    unregister = registerPanel(panel)
    const { onObjectSelected, selectedCanvasImageId, fotoManager } = setupSelection()
    const img = { type: 'image', id: 'i1' }

    onObjectSelected(img)

    expect(toRaw(panel.currentActiveImage.value)).toBe(img)
    expect(selectedCanvasImageId.value).toBe('i1')
    expect(panel.loadImageSettings).toHaveBeenCalledWith(img)
    expect(fotoManager.updateUIFromSettings).not.toHaveBeenCalled()
  })

  it('kein Bild: setzt aktives Bild und Auswahl-ID zurück, lädt nichts', () => {
    const panel = makePanel()
    panel.currentActiveImage.value = { type: 'image', id: 'old' }
    unregister = registerPanel(panel)
    const { onObjectSelected, selectedCanvasImageId } = setupSelection()
    selectedCanvasImageId.value = 'old'

    onObjectSelected({ type: 'text', id: 't1' })

    expect(panel.currentActiveImage.value).toBeNull()
    expect(selectedCanvasImageId.value).toBeNull()
    expect(panel.loadImageSettings).not.toHaveBeenCalled()
  })

  it('Hintergrund: erst null, im nächsten Tick das Hintergrund-Objekt', () => {
    const panel = makePanel()
    panel.currentActiveImage.value = { type: 'image', id: 'old' }
    unregister = registerPanel(panel)
    const { onObjectSelected, selectedCanvasImageId } = setupSelection()
    selectedCanvasImageId.value = 'old'
    const bg = { type: 'workspace-background' }

    onObjectSelected(bg)
    expect(panel.currentActiveImage.value).toBeNull()
    expect(selectedCanvasImageId.value).toBe('old')
    expect(panel.loadImageSettings).toHaveBeenCalledWith(bg)

    vi.advanceTimersByTime(0)
    expect(toRaw(panel.currentActiveImage.value)).toBe(bg)
  })

  it('Panel noch nicht bereit: wiederholt alle 100 ms, bis es registriert ist', () => {
    const { onObjectSelected } = setupSelection()
    const img = { type: 'image', id: 'i2' }

    onObjectSelected(img)
    vi.advanceTimersByTime(250)

    const panel = makePanel()
    unregister = registerPanel(panel)
    expect(panel.currentActiveImage.value).toBeNull()

    vi.advanceTimersByTime(100)
    expect(toRaw(panel.currentActiveImage.value)).toBe(img)
    expect(panel.loadImageSettings).toHaveBeenCalledTimes(1)
  })
})

describe('selectCanvasImage → Foto-Panel', () => {
  function setupImages() {
    const manager = { setSelectedImage: vi.fn(), getAllImages: () => [] }
    return useCanvasImages({
      multiImageManagerInstance: ref(manager),
      canvasManagerInstance: ref(null),
      t: (k) => k,
    })
  }

  it('setzt das aktive Bild im Panel', () => {
    const panel = makePanel()
    unregister = registerPanel(panel)
    const img = { id: 'c1' }
    setupImages().selectCanvasImage(img)
    expect(toRaw(panel.currentActiveImage.value)).toBe(img)
  })

  it('ohne Panel kein Fehler', () => {
    expect(() => setupImages().selectCanvasImage({ id: 'c2' })).not.toThrow()
  })
})
