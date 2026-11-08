// @vitest-environment jsdom
// Bedienung per Tastatur in der Player-Leiste: Titel in der Playlist,
// Marker-Zeiten im Beat-Marker-Popover und der Fortschrittsbalken sind
// fokussierbar und reagieren auf Enter bzw. Pfeiltasten.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, provide, ref, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PlaylistPopover from '../../components/sticky-player-bar/PlaylistPopover.vue'
import BeatMarkerPopover from '../../components/sticky-player-bar/BeatMarkerPopover.vue'
import PlayerBarControls from '../../components/sticky-player-bar/PlayerBarControls.vue'
import { useBeatMarkers } from '../../composables/useBeatMarkers.js'
import { usePlayerPopover } from '../../composables/usePlayerPopover.js'
import { usePlayerStore } from '../../stores/playerStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import de from '../../lib/i18n/de'

const P = de.player
const popoverStub = { closePopover: vi.fn(), cascadeOffset: () => ({ x: 0, y: 0 }) }
let wrapper
let player

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  player = usePlayerStore()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Playlist – Titel per Tastatur', () => {
  it('Titel sind Knöpfe und spielen den Titel ab', async () => {
    player.playlist.push({ name: 'a.mp3', url: 'a' }, { name: 'b.mp3', url: 'b' })
    const playTrackAt = vi.fn()
    wrapper = mount(PlaylistPopover, {
      attachTo: document.body,
      global: {
        provide: {
          playerBar: {
            popover: popoverStub,
            playlist: {
              draggedTrackIndex: ref(null),
              dragOverTrackIndex: ref(null),
              playTrackAt,
              handleDragStart: vi.fn(),
              handleDragEnd: vi.fn(),
              handleDragOver: vi.fn(),
              handleDragLeave: vi.fn(),
              handleDrop: vi.fn(),
              removeTrack: vi.fn(),
              clearAllTracks: vi.fn(),
            },
          },
        },
      },
    })
    await nextTick()
    const track = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === 'b.mp3',
    )
    expect(track, 'Titel als Knopf').toBeTruthy()
    expect(track.type).toBe('button')
    track.click()
    expect(playTrackAt).toHaveBeenCalledWith(1)
  })
})

describe('Beat-Marker – Zeit per Tastatur', () => {
  it('Marker-Zeit ist ein Knopf mit Namen und springt dorthin', async () => {
    const markers = useBeatMarkerStore()
    markers.addMarker(5, {}, 'A')
    player.duration = 60
    const seek = vi.spyOn(player, 'seekTo').mockImplementation(() => {})
    const Host = defineComponent({
      setup() {
        provide('playerBar', { popover: popoverStub, markers: useBeatMarkers(() => {}) })
        return () => h(BeatMarkerPopover)
      },
    })
    wrapper = mount(Host, {
      attachTo: document.body,
      global: { provide: { canvasManager: ref(null) } },
    })
    await flushPromises()
    const jump = [...document.body.querySelectorAll('button')].find((b) =>
      b.getAttribute('aria-label')?.startsWith(P.jumpToMarker.split('{time}')[0]),
    )
    expect(jump, 'Marker-Zeit als Knopf').toBeTruthy()
    expect(jump.getAttribute('aria-label')).toBe(
      P.jumpToMarker.replace('{time}', jump.textContent.trim()),
    )
    jump.click()
    expect(seek).toHaveBeenCalledWith(5)
  })
})

describe('Fortschrittsbalken per Tastatur', () => {
  async function mountBar() {
    wrapper = mount(PlayerBarControls, {
      attachTo: document.body,
      global: {
        provide: {
          playerBar: {
            popover: usePlayerPopover(),
            playMode: { cyclePlayMode: vi.fn(), playModeLabel: 'Modus' },
            markers: { getMarkerPosition: () => 0, seekToMarker: vi.fn() },
          },
        },
      },
    })
    await nextTick()
    return document.body.querySelector('[role="slider"]')
  }
  const key = (el, k) => {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
    el.dispatchEvent(event)
    return event
  }

  it('ist ein fokussierbarer Schieberegler mit Position', async () => {
    player.duration = 125
    player.currentTime = 61
    const slider = await mountBar()
    expect(slider.getAttribute('aria-label')).toBe(P.seekPosition)
    expect(slider.tabIndex).toBe(0)
    expect(slider.getAttribute('aria-valuemax')).toBe('125')
    expect(slider.getAttribute('aria-valuenow')).toBe('61')
    expect(slider.getAttribute('aria-valuetext')).toBe('1:01 / 2:05')
  })

  it('Pfeile springen 5 s, Pos1/Ende an Anfang/Ende, ohne globale Kürzel', async () => {
    player.audioRef = {}
    player.duration = 100
    player.currentTime = 50
    const seek = vi.spyOn(player, 'seekTo').mockImplementation(() => {})
    const slider = await mountBar()
    const outside = vi.fn()
    document.addEventListener('keydown', outside)
    try {
      expect(key(slider, 'ArrowRight').defaultPrevented).toBe(true)
      key(slider, 'ArrowLeft')
      key(slider, 'Home')
      key(slider, 'End')
      expect(seek.mock.calls.map((c) => c[0])).toEqual([55, 45, 0, 100])
      expect(outside).not.toHaveBeenCalled()
      player.currentTime = 98
      key(slider, 'ArrowUp')
      expect(seek).toHaveBeenLastCalledWith(100)
      key(slider, 'Tab')
      expect(seek).toHaveBeenCalledTimes(5)
    } finally {
      document.removeEventListener('keydown', outside)
    }
  })

  it('ohne geladenen Titel passiert nichts', async () => {
    const seek = vi.spyOn(player, 'seekTo')
    const slider = await mountBar()
    key(slider, 'ArrowRight')
    expect(seek).not.toHaveBeenCalled()
  })
})
