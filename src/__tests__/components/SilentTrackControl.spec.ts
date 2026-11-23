// @vitest-environment jsdom
// „Ohne Track abspielen“: Stille in wählbarer Länge in die Playlist legen.
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SilentTrackControl from '../../components/SilentTrackControl.vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import { useToastStore } from '../../stores/toastStore'
import de from '../../lib/i18n/de'

let wrapper: VueWrapper
let addSilentTrack: MockInstance<ReturnType<typeof usePlayerStore>['addSilentTrack']>
let success: MockInstance

const mountControl = (props: { compact?: boolean } = {}) => {
  wrapper = mount(SilentTrackControl, { props, attachTo: document.body })
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  const player = usePlayerStore()
  addSilentTrack = vi
    .spyOn(player, 'addSilentTrack')
    .mockImplementation((_s, name) => ({ name, url: 'blob:s', silent: true }))
  success = vi.spyOn(useToastStore(), 'success')
})

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const input = () => wrapper.get<HTMLInputElement>('[data-testid="silent-track-duration"]')
const addButton = () => wrapper.get('[data-testid="silent-track-add"]')
const feedback = () => wrapper.find('[data-testid="silent-track-feedback"]')

describe('SilentTrackControl', () => {
  it('Audio-Panel: ohne Titel und Beschreibung, freies Eingabefeld statt fester Auswahl', () => {
    mountControl()
    expect(wrapper.text()).not.toContain(de.silentTrack.title)
    expect(wrapper.find('.silent-track__title').exists()).toBe(false)
    expect(wrapper.find('select').exists()).toBe(false)
    expect(input().element.value).toBe('2:00')
    expect(feedback().text()).toBe(de.silentTrack.durationHint.replace('{max}', '3:00:00'))
  })

  it('kompakt (Playlist-Popover): Titel, aber ohne Hinweistexte', () => {
    mountControl({ compact: true })
    expect(wrapper.text()).toContain(de.silentTrack.title)
    expect(feedback().exists()).toBe(false)
    expect(input().attributes('aria-describedby')).toBeUndefined()
  })

  it('fügt Stille mit Standardlänge 2:00 hinzu und meldet es', async () => {
    mountControl()
    await addButton().trigger('click')
    expect(addSilentTrack).toHaveBeenCalledWith(120, 'Stille (2:00)')
    expect(success).toHaveBeenCalledWith(de.silentTrack.added.replace('{name}', 'Stille (2:00)'))
  })

  it.each([
    ['4:37', 277, '4:37'],
    ['0:07', 7, '0:07'],
    ['90:00', 5400, '1:30:00'],
    ['1:15:00', 4500, '1:15:00'],
    ['7', 420, '7:00'],
    ['2,5', 150, '2:30'],
    ['3:00:00', 10800, '3:00:00'],
  ])('nimmt die frei eingegebene Länge „%s“', async (text, seconds, label) => {
    mountControl()
    await input().setValue(text)
    await addButton().trigger('click')
    expect(addSilentTrack).toHaveBeenCalledWith(seconds, `Stille (${label})`)
    // Eingabe wird auf das hinzugefügte Format gebracht
    expect(input().element.value).toBe(label)
  })

  it('Enter im Feld fügt hinzu', async () => {
    mountControl()
    await input().setValue('0:45')
    await input().trigger('keydown', { key: 'Enter' })
    expect(addSilentTrack).toHaveBeenCalledWith(45, 'Stille (0:45)')
  })

  it.each([
    ['abc', de.silentTrack.durationInvalid],
    ['1:75', de.silentTrack.durationInvalid],
    ['0:00', de.silentTrack.durationTooShort],
    ['3:00:01', de.silentTrack.durationTooLong.replace('{max}', '3:00:00')],
  ])('ungültige Eingabe „%s“: Fehler, Button aus, nichts hinzugefügt', async (text, message) => {
    mountControl()
    await input().setValue(text)
    expect(feedback().text()).toBe(message)
    expect(feedback().attributes('role')).toBe('alert')
    expect(input().attributes('aria-invalid')).toBe('true')
    expect(input().attributes('aria-describedby')).toBe(feedback().attributes('id'))
    expect(addButton().attributes('disabled')).toBeDefined()
    await input().trigger('keydown', { key: 'Enter' })
    expect(addSilentTrack).not.toHaveBeenCalled()
  })

  it('kompakt zeigt Fehler trotzdem an', async () => {
    mountControl({ compact: true })
    await input().setValue('x')
    expect(feedback().text()).toBe(de.silentTrack.durationInvalid)
  })

  it('leeres Feld: Button aus, kein Fehlertext', async () => {
    mountControl()
    await input().setValue('  ')
    expect(addButton().attributes('disabled')).toBeDefined()
    expect(feedback().text()).toBe(de.silentTrack.durationHint.replace('{max}', '3:00:00'))
  })

  it('schlägt eine Länge vor, die alle Marker abdeckt', async () => {
    const markers = useBeatMarkerStore()
    markers.addMarker(95)
    mountControl()
    expect(input().element.value).toBe('2:00')
    wrapper.unmount()
    markers.addMarker(200)
    mountControl()
    expect(input().element.value).toBe('5:00')
    await addButton().trigger('click')
    expect(addSilentTrack).toHaveBeenLastCalledWith(300, 'Stille (5:00)')
  })

  it('ohne Erfolg (Store lehnt ab) keine Erfolgsmeldung, Eingabe bleibt', async () => {
    addSilentTrack.mockReturnValue(null)
    mountControl()
    await input().setValue('5')
    await addButton().trigger('click')
    expect(success).not.toHaveBeenCalled()
    expect(input().element.value).toBe('5')
  })
})
