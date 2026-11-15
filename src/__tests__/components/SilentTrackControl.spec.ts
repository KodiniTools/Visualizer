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

describe('SilentTrackControl', () => {
  it('zeigt Titel, Hinweis und alle Längen', () => {
    mountControl()
    expect(wrapper.text()).toContain(de.silentTrack.title)
    expect(wrapper.text()).toContain(de.silentTrack.hint)
    const labels = wrapper.findAll('option').map((o) => o.text())
    expect(labels).toEqual([
      '0:30',
      '1:00',
      '2:00',
      '3:00',
      '5:00',
      '10:00',
      '15:00',
      '20:00',
      '30:00',
      '1:00:00',
    ])
  })

  it('kompakt (Playlist-Popover): ohne Hinweistext', () => {
    mountControl({ compact: true })
    expect(wrapper.text()).toContain(de.silentTrack.title)
    expect(wrapper.text()).not.toContain(de.silentTrack.hint)
  })

  it('fügt Stille mit Standardlänge 2:00 hinzu und meldet es', async () => {
    mountControl()
    await wrapper.find('[data-testid="silent-track-add"]').trigger('click')
    expect(addSilentTrack).toHaveBeenCalledWith(120, 'Stille (2:00)')
    expect(success).toHaveBeenCalledWith(de.silentTrack.added.replace('{name}', 'Stille (2:00)'))
  })

  it('nimmt die gewählte Länge', async () => {
    mountControl()
    await wrapper.find('select').setValue('600')
    await wrapper.find('[data-testid="silent-track-add"]').trigger('click')
    expect(addSilentTrack).toHaveBeenCalledWith(600, 'Stille (10:00)')
  })

  it('schlägt eine Länge vor, die alle Marker abdeckt', async () => {
    const markers = useBeatMarkerStore()
    markers.addMarker(95)
    mountControl()
    await wrapper.find('[data-testid="silent-track-add"]').trigger('click')
    expect(addSilentTrack).toHaveBeenCalledWith(120, 'Stille (2:00)')
    wrapper.unmount()
    markers.addMarker(200)
    mountControl()
    await wrapper.find('[data-testid="silent-track-add"]').trigger('click')
    expect(addSilentTrack).toHaveBeenLastCalledWith(300, 'Stille (5:00)')
  })

  it('ohne Erfolg (ungültige Länge) keine Erfolgsmeldung', async () => {
    addSilentTrack.mockReturnValue(null)
    mountControl()
    await wrapper.find('[data-testid="silent-track-add"]').trigger('click')
    expect(success).not.toHaveBeenCalled()
  })
})
