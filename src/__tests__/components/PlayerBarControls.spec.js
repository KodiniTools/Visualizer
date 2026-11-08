// @vitest-environment jsdom
// Charakterisierung der Player-Leiste: Transport (Zurück, Play/Pause, Stop,
// Vorwärts, Wiedergabemodus), Undo/Redo, Popover-Knöpfe mit aktivem Zustand,
// Stumm- und Aufnahme-Zustand. Zugriff über Titel und Rollen, damit die Tests
// den Wechsel auf die Ui-Bausteine überstehen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PlayerBarControls from '../../components/sticky-player-bar/PlayerBarControls.vue'
import { usePlayerPopover } from '../../composables/usePlayerPopover.js'
import { usePlayerStore } from '../../stores/playerStore'
import { useHistoryStore } from '../../stores/historyStore'
import { useRecorderStore } from '../../stores/recorderStore'
import { useI18n } from '../../lib/i18n'
import de from '../../lib/i18n/de'
import en from '../../lib/i18n/en'

const P = de.player
let wrapper
let player
let popover
let cyclePlayMode

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  player = usePlayerStore()
  popover = usePlayerPopover()
  popover.closePopover?.()
  cyclePlayMode = vi.fn()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  popover.closePopover?.()
  document.body.innerHTML = ''
})

async function mountBar() {
  wrapper = mount(PlayerBarControls, {
    attachTo: document.body,
    global: {
      provide: {
        playerBar: {
          popover,
          playMode: { cyclePlayMode, playModeLabel: 'Modus' },
          markers: { getMarkerPosition: () => 0, seekToMarker: vi.fn() },
        },
      },
    },
  })
  await nextTick()
  return wrapper
}

const root = () => wrapper.element
const byTitle = (title) => [...root().querySelectorAll('button')].find((b) => b.title === title)
const byTitleStart = (start) =>
  [...root().querySelectorAll('button')].find((b) => b.title.startsWith(start))
/** Popover-Knopf gilt als offen: Klasse „active“ oder aria-pressed. */
const isActive = (btn) =>
  btn.classList.contains('active') || btn.getAttribute('aria-pressed') === 'true'

describe('Player-Leiste – Transport', () => {
  it('ohne Titel deaktiviert, mit Titel aktiv und an den Store gebunden', async () => {
    await mountBar()
    for (const key of ['prev', 'play', 'stop', 'next']) {
      expect(byTitle(P[key]).disabled, key).toBe(true)
    }
    expect(root().textContent).toContain(P.noTrackLoaded)

    player.playlist.push({ name: 'Song A', url: 'blob:a' })
    await nextTick()
    expect(root().textContent).toContain('Song A')
    const spies = {
      prev: vi.spyOn(player, 'prevTrack').mockImplementation(() => {}),
      play: vi.spyOn(player, 'togglePlayPause').mockImplementation(() => {}),
      stop: vi.spyOn(player, 'stopPlayer').mockImplementation(() => {}),
      next: vi.spyOn(player, 'nextTrack').mockImplementation(() => {}),
    }
    for (const key of Object.keys(spies)) {
      byTitle(P[key]).click()
      expect(spies[key], key).toHaveBeenCalledTimes(1)
    }
  })

  it('Play wird zu Pause, Wiedergabemodus schaltet weiter', async () => {
    player.playlist.push({ name: 'Song A', url: 'blob:a' })
    player.isPlaying = true
    await mountBar()
    expect(byTitle(P.pause)).toBeTruthy()
    expect(byTitle(P.play)).toBeFalsy()

    const mode = byTitle('Modus')
    expect(isActive(mode)).toBe(false)
    mode.click()
    expect(cyclePlayMode).toHaveBeenCalledTimes(1)
    player.playMode = 'repeat-all'
    await nextTick()
    expect(isActive(byTitle('Modus'))).toBe(true)
  })
})

describe('Player-Leiste – Verlauf', () => {
  it('Undo/Redo nur aktiv, wenn es einen Schritt gibt', async () => {
    const history = useHistoryStore()
    await mountBar()
    const undo = root().querySelector('[data-testid="history-undo"]')
    const redo = root().querySelector('[data-testid="history-redo"]')
    expect(undo.disabled).toBe(true)
    expect(redo.disabled).toBe(true)
    expect(undo.getAttribute('aria-label')).toContain(de.history.undo)
    expect(undo.title).toContain(de.history.undoShortcut)
    expect(redo.getAttribute('aria-label')).toContain(de.history.redo)

    const spy = vi.spyOn(history, 'undo').mockImplementation(() => {})
    history.$patch({ history: [{ type: 'test', undo() {}, redo() {} }], currentIndex: 0 })
    await nextTick()
    expect(undo.disabled).toBe(false)
    undo.click()
    expect(spy).toHaveBeenCalled()
  })
})

describe('Player-Leiste – Popover-Knöpfe', () => {
  it('jeder Knopf schaltet sein Popover und zeigt den offenen Zustand', async () => {
    await mountBar()
    const cases = [
      ['openAudioSource', 'audio'],
      ['openMarkers', 'markers'],
      ['openPlaylist', 'playlist'],
      ['openVisualizer', 'visualizer'],
      ['openRecorder', 'recorder'],
    ]
    for (const [key, id] of cases) {
      const btn = byTitle(P[key])
      expect(btn, key).toBeTruthy()
      btn.click()
      await nextTick()
      expect(popover.isOpen(id), key).toBe(true)
      expect(isActive(byTitle(P[key])), key).toBe(true)
    }
    byTitle(P.openRecorder).click()
    await nextTick()
    expect(popover.isOpen('recorder')).toBe(false)
    expect(isActive(byTitle(P.openRecorder))).toBe(false)
  })

  it('Stumm im Titel, Zähler für Marker und Playlist, Aufnahme-Punkt', async () => {
    player.isMuted = true
    player.playlist.push({ name: 'A', url: 'blob:a' }, { name: 'B', url: 'blob:b' })
    useRecorderStore().isRecording = true
    await mountBar()
    const volume = byTitleStart(P.openVolume)
    expect(volume.title).toBe(`${P.openVolume} (${P.muted})`)
    expect(byTitle(P.openPlaylist).textContent.trim()).toBe('2')
    expect(byTitle(P.openRecorder).querySelector('.spb-rec-dot')).toBeTruthy()
  })

  it('Texte folgen der Sprache', async () => {
    const { setLocale } = useI18n()
    await setLocale('en')
    try {
      await mountBar()
      expect(byTitle(en.player.openPlaylist)).toBeTruthy()
      expect(byTitle(en.player.prev)).toBeTruthy()
      expect(root().textContent).toContain(en.player.noTrackLoaded)
    } finally {
      await setLocale('de')
    }
  })
})

describe('Player-Leiste – Ui-Bausteine', () => {
  it('alle Knöpfe sind UiIconButtons, offene Popover mit aria-pressed', async () => {
    await mountBar()
    const buttons = [...root().querySelectorAll('button')]
    expect(buttons.length).toBeGreaterThan(20)
    for (const b of buttons) {
      expect(b.classList.contains('ui-icon-button'), b.title).toBe(true)
      expect(b.getAttribute('aria-label'), b.title).toBeTruthy()
    }
    const playlist = byTitle(P.openPlaylist)
    expect(playlist.getAttribute('aria-pressed')).toBe('false')
    playlist.click()
    await nextTick()
    expect(byTitle(P.openPlaylist).getAttribute('aria-pressed')).toBe('true')
  })
})
