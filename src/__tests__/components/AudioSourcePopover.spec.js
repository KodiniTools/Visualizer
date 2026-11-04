// @vitest-environment jsdom
// Audio-Quellen-Popover (Player-Leiste): Quelle Player/Mikrofon wählen,
// Mikrofon-Status, Geräteauswahl bei mehreren Eingängen, Schließen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import AudioSourcePopover from '../../components/sticky-player-bar/AudioSourcePopover.vue'
import { usePlayerPopover } from '../../composables/usePlayerPopover.js'
import { useAudioSourceStore } from '../../stores/audioSourceStore.js'
import { setLocale } from '../../lib/i18n.js'
import de from '../../lib/i18n/de.js'
import en from '../../lib/i18n/en.js'

const P = de.player
let wrapper
let store
let popover
let audioSource

beforeEach(() => {
  setActivePinia(createPinia())
  store = useAudioSourceStore()
  popover = usePlayerPopover()
  popover.openPopover('audio')
  audioSource = {
    selectedDevice: ref('default'),
    selectSource: vi.fn(),
    changeDevice: vi.fn(),
  }
})

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  await setLocale('de')
})

async function mountPopover() {
  wrapper = mount(AudioSourcePopover, {
    global: { provide: { playerBar: { popover, audioSource } } },
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

const root = () => wrapper.element
const button = (label) =>
  [...root().querySelectorAll('button')].find((b) => b.textContent.trim() === label)

const devices = [
  { deviceId: 'default', label: 'Standard' },
  { deviceId: 'usb', label: 'USB-Mikrofon' },
]

describe('AudioSourcePopover', () => {
  it('zeigt Player und Mikrofon; Player ist aktiv', async () => {
    await mountPopover()
    expect(wrapper.text()).toContain(P.audioSource)
    expect(button(P.player).classList.contains('active')).toBe(true)
    expect(button(P.microphone).classList.contains('active')).toBe(false)
    expect(root().querySelector('select')).toBeNull()
  })

  it('Klick wählt die Quelle', async () => {
    await mountPopover()
    button(P.microphone).click()
    expect(audioSource.selectSource).toHaveBeenCalledWith('microphone')
    button(P.player).click()
    expect(audioSource.selectSource).toHaveBeenCalledWith('player')
  })

  it('Mikrofon: Status, Fehler und Geräteauswahl', async () => {
    store.sourceType = 'microphone'
    store.isMicrophoneActive = true
    store.audioInputDevices = devices
    await mountPopover()
    expect(button(P.microphone).classList.contains('active')).toBe(true)
    expect(wrapper.text()).toContain(P.microphoneListening)
    expect(wrapper.text()).toContain(P.selectDevice)

    const select = root().querySelector('select')
    expect([...select.options].map((o) => [o.value, o.textContent.trim()])).toEqual([
      ['default', 'Standard'],
      ['usb', 'USB-Mikrofon'],
    ])
    select.value = 'usb'
    select.dispatchEvent(new Event('change'))
    await nextTick()
    expect(audioSource.selectedDevice.value).toBe('usb')
    expect(audioSource.changeDevice).toHaveBeenCalled()

    store.isMicrophoneActive = false
    store.errorMessage = 'Kein Mikrofon gefunden'
    await nextTick()
    expect(wrapper.text()).toContain('Kein Mikrofon gefunden')
  })

  it('Geräteauswahl erst ab zwei Eingängen', async () => {
    store.sourceType = 'microphone'
    store.audioInputDevices = devices.slice(0, 1)
    await mountPopover()
    expect(root().querySelector('select')).toBeNull()
  })

  it('Schließen-Knopf schließt das Popover', async () => {
    await mountPopover()
    root().querySelector('.spb-popover-close').click()
    expect(popover.isOpen('audio')).toBe(false)
  })
})

describe('AudioSourcePopover – Ui-Bausteine und Sprache', () => {
  it('Quellen-Knöpfe melden ihren Zustand, Gerät hat ein Label', async () => {
    store.sourceType = 'microphone'
    store.audioInputDevices = devices
    await mountPopover()
    expect(button(P.microphone).getAttribute('aria-pressed')).toBe('true')
    expect(button(P.player).getAttribute('aria-pressed')).toBe('false')
    expect(button(P.player).getAttribute('type')).toBe('button')
    const select = root().querySelector('select')
    expect(document.querySelector(`label[for="${select.id}"]`).textContent.trim()).toBe(
      P.selectDevice,
    )
  })

  it('Texte folgen der Sprache', async () => {
    await setLocale('en')
    await mountPopover()
    expect(button(en.player.player)).toBeTruthy()
    expect(button(en.player.microphone)).toBeTruthy()
    expect(wrapper.text()).toContain(en.player.audioSource)
  })
})
