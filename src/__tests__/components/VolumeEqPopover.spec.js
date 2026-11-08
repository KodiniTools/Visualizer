// @vitest-environment jsdom
// Lautstärke-/EQ-Popover: Werte anzeigen, Stummschalten, Regler melden
// Änderungen an usePlayerVolumeEq, Schließen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import VolumeEqPopover from '../../components/sticky-player-bar/VolumeEqPopover.vue'
import { usePlayerPopover } from '../../composables/usePlayerPopover.js'
import { usePlayerStore } from '../../stores/playerStore'
import de from '../../lib/i18n/de'

const P = de.player
let wrapper
let player
let popover
let volumeEq

beforeEach(() => {
  setActivePinia(createPinia())
  player = usePlayerStore()
  popover = usePlayerPopover()
  popover.openPopover('volume')
  volumeEq = {
    volume: ref(80),
    bass: ref(3),
    treble: ref(-2),
    updateVolume: vi.fn(),
    updateBass: vi.fn(),
    updateTreble: vi.fn(),
  }
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

async function mountPopover() {
  wrapper = mount(VolumeEqPopover, {
    global: { provide: { playerBar: { popover, volumeEq } } },
  })
  await nextTick()
  return wrapper
}

const ranges = () => wrapper.findAll('input[type="range"]')

describe('VolumeEqPopover', () => {
  it('zeigt Lautstärke, Bass und Höhen mit Vorzeichen', async () => {
    await mountPopover()
    const text = wrapper.text()
    expect(text).toContain(`${P.volume}: 80%`)
    expect(text).toContain(`${P.bass}: +3 dB`)
    expect(text).toContain(`${P.treble}: -2 dB`)
    expect(ranges()).toHaveLength(3)
  })

  it('Stumm-Knopf schaltet den Player und zeigt den Zustand', async () => {
    const toggle = vi.spyOn(player, 'toggleMute').mockImplementation(() => {
      player.isMuted = !player.isMuted
    })
    await mountPopover()
    const btn = wrapper.find(`button[title="${P.mute}"]`)
    expect(btn.attributes('aria-pressed')).toBe('false')
    await btn.trigger('click')
    expect(toggle).toHaveBeenCalled()
    expect(wrapper.text()).toContain(P.muted)
    expect(wrapper.find(`button[title="${P.unmute}"]`).attributes('aria-pressed')).toBe('true')
  })

  it('Regler schreiben den Wert und melden ihn weiter', async () => {
    await mountPopover()
    const [vol, bass, treble] = ranges()
    await vol.setValue('40')
    await bass.setValue('-6')
    await treble.setValue('9')
    expect(volumeEq.volume.value).toBe(40)
    expect(volumeEq.bass.value).toBe(-6)
    expect(volumeEq.treble.value).toBe(9)
    expect(volumeEq.updateVolume).toHaveBeenCalled()
    expect(volumeEq.updateBass).toHaveBeenCalled()
    expect(volumeEq.updateTreble).toHaveBeenCalled()
  })

  it('Schließen schließt nur dieses Popover', async () => {
    popover.openPopover('playlist')
    await mountPopover()
    await wrapper.find(`button[title="${de.common.close}"]`).trigger('click')
    expect(popover.isOpen('volume')).toBe(false)
    expect(popover.isOpen('playlist')).toBe(true)
  })
})
