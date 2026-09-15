import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useBeatMarkers } from '../../composables/useBeatMarkers.js'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore.js'

// useBeatMarkers braucht einen Komponentenkontext (inject, onMounted).
// Der Wrapper stellt die Composable-API über wrapper.vm bereit.
const Host = defineComponent({
  setup() {
    return useBeatMarkers(() => {})
  },
  template: '<div />',
})

let wrapper
let vm
let playerStore
let markerStore

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  playerStore.duration = 300
  wrapper = mount(Host, { global: { provide: { canvasManager: ref(null) } } })
  vm = wrapper.vm
})

afterEach(() => wrapper?.unmount())

describe('Beat-Marker Zeit mit Hundertsteln', () => {
  it('zeigt die Zeit beim Bearbeiten mit Hundertsteln an', () => {
    const marker = markerStore.addMarker(18.37, {}, 'Drop 1')
    vm.startEditMarker(marker)
    expect(vm.pendingMarkerTimeInput).toBe('0:18.37')
  })

  it('übernimmt Texteingaben mit Hundertsteln und normalisiert die Anzeige', () => {
    vm.addMarkerAtCurrentTime()
    vm.pendingMarkerTimeInput = '1:30,25'
    vm.updateMarkerTimeFromInput()
    expect(vm.pendingMarkerTimeInput).toBe('1:30.25')

    vm.confirmAddMarker()
    expect(markerStore.markers.at(-1).time).toBe(90.25)
  })

  it('schrittet standardmäßig in 0,01 s und speichert den Wert exakt', () => {
    vm.addMarkerAtCurrentTime() // currentTime = 0
    expect(vm.markerTimeStep).toBe(0.01)

    for (let i = 0; i < 3; i++) vm.stepMarkerTime(1)
    expect(vm.pendingMarkerTimeInput).toBe('0:00.03')

    vm.confirmAddMarker()
    expect(markerStore.markers.at(-1).time).toBe(0.03)
  })

  it('nutzt die gewählte Schrittweite (schnell = 1 s, mittel = 0,1 s)', () => {
    vm.addMarkerAtCurrentTime()
    vm.markerTimeStep = 1
    vm.stepMarkerTime(1)
    vm.stepMarkerTime(1)
    expect(vm.pendingMarkerTimeInput).toBe('0:02.00')

    vm.markerTimeStep = 0.1
    vm.stepMarkerTime(-1)
    expect(vm.pendingMarkerTimeInput).toBe('0:01.90')
  })

  it('begrenzt auf 0 und auf die Trackdauer', () => {
    vm.addMarkerAtCurrentTime()
    vm.stepMarkerTime(-1)
    expect(vm.pendingMarkerTimeInput).toBe('0:00.00')

    vm.pendingMarkerTimeInput = '99:99'
    vm.updateMarkerTimeFromInput()
    expect(vm.pendingMarkerTimeInput).toBe('5:00.00')
    vm.stepMarkerTime(1)
    expect(vm.pendingMarkerTimeInput).toBe('5:00.00')
  })

  it('akkumuliert viele Schritte ohne Float-Drift', () => {
    vm.addMarkerAtCurrentTime()
    for (let i = 0; i < 137; i++) vm.stepMarkerTime(1)
    expect(vm.pendingMarkerTimeInput).toBe('0:01.37')
  })
})
