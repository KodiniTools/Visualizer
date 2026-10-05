/**
 * Taste M: setzt nur einen Beat-Marker (öffnet ihn mit der aktuellen Zeit) –
 * vorher löste sie zusätzlich das (nicht vorhandene) Stummschalten aus.
 * Umschalt+M schaltet stumm, ohne Marker.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBeatMarkers } from '../../composables/useBeatMarkers.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore.js'
import { KeyboardShortcuts } from '../../lib/keyboardShortcuts.js'

const openMarkers = vi.fn()
const Host = defineComponent({
  setup: () => useBeatMarkers(openMarkers),
  template: '<div />',
})

let wrapper
let shortcuts
let playerStore

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  openMarkers.mockClear()
  setActivePinia(createPinia())
  localStorage.clear()
  playerStore = usePlayerStore()
  useMarkerTransitionStore().enabled = false
  playerStore.playlist = [{ name: 'track.mp3', url: 'blob:x' }]
  playerStore.duration = 120
  playerStore.audioRef = { currentTime: 12.5 }
  playerStore.currentTime = 12.5
  wrapper = mount(Host, {
    attachTo: document.body,
    global: { provide: { canvasManager: ref(null) } },
  })
  shortcuts = new KeyboardShortcuts({ playerStore, gridStore: {} }, { canvasManager: null })
  shortcuts.enable()
  await nextTick()
})

afterEach(() => {
  shortcuts.disable()
  wrapper?.unmount()
  vi.restoreAllMocks()
})

const press = (key, mods = {}) =>
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...mods }))

describe('Taste M', () => {
  it('M öffnet den neuen Marker (aktuelle Zeit) und schaltet NICHT stumm', () => {
    press('m')
    expect(openMarkers).toHaveBeenCalledTimes(1)
    expect(playerStore.isMuted).toBe(false)
  })

  it('M bei Feststelltaste (großes M ohne Umschalt) setzt ebenfalls einen Marker', () => {
    press('M')
    expect(openMarkers).toHaveBeenCalledTimes(1)
    expect(playerStore.isMuted).toBe(false)
  })

  it('Umschalt+M schaltet stumm und setzt keinen Marker', () => {
    press('M', { shiftKey: true })
    expect(playerStore.isMuted).toBe(true)
    expect(openMarkers).not.toHaveBeenCalled()
  })

  it('Umschalt+M zweimal schaltet den Ton wieder ein', () => {
    press('M', { shiftKey: true })
    press('M', { shiftKey: true })
    expect(playerStore.isMuted).toBe(false)
  })

  it('Strg/Alt/Cmd+M lösen nichts aus', () => {
    press('m', { ctrlKey: true })
    press('m', { altKey: true })
    press('m', { metaKey: true })
    expect(openMarkers).not.toHaveBeenCalled()
    expect(playerStore.isMuted).toBe(false)
  })

  it('in Eingabefeldern weder Marker noch Stumm', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'M', shiftKey: true, bubbles: true }))
    expect(openMarkers).not.toHaveBeenCalled()
    expect(playerStore.isMuted).toBe(false)
    input.remove()
  })
})
