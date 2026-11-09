import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, provide, ref, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { stub } from '../helpers/canvasStubs'
import { useBeatMarkers } from '../../composables/useBeatMarkers'
import BeatMarkerPopover from '../../components/sticky-player-bar/BeatMarkerPopover.vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import { useShapeStore } from '../../stores/shapeStore'
import { MultiImageManager } from '../../lib/multiImageManager'
import { createImageAnimation } from '../../lib/canvasObjects/imageAnimation'
import type { GalleryVideoEntry } from '../../lib/background/markerBackgroundVideo'

const videoGallery = ref<GalleryVideoEntry[]>([])

const Host = defineComponent({
  setup() {
    return useBeatMarkers(() => {}, { videoGallery })
  },
  template: '<div />',
})

type HostVm = InstanceType<typeof Host>

const timedFade = (displayDuration: number) => ({
  enabled: true,
  permanent: false,
  direction: 'inOut',
  duration: 1000,
  startDelay: 0,
  displayDuration,
})

let wrapper: VueWrapper<HostVm> | null
let vm: HostVm
let markerStore: ReturnType<typeof useBeatMarkerStore>
let mim: MultiImageManager
let textObjects: Record<string, unknown>[]

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  const playerStore = usePlayerStore()
  playerStore.duration = 300
  playerStore.audioRef = stub({ currentTime: 0 })
  markerStore = useBeatMarkerStore()
  videoGallery.value = [{ id: 1, name: 'clip', src: 'blob:clip', duration: 12 }]

  textObjects = [
    { id: 1, content: 'Hallo', animation: { fade: timedFade(3000) } },
    { id: 2, content: 'Bleibt', animation: { fade: { ...timedFade(3000), permanent: true } } },
  ]
  const managerRef = ref(
    new MultiImageManager(stub<HTMLCanvasElement>({ width: 1000, height: 500 }), {
      redrawCallback: () => {},
    }),
  )
  mim = managerRef.value

  wrapper = mount(Host, {
    global: {
      provide: {
        canvasManager: ref({ textManager: { textObjects, markerRevealedIds: new Set() } }),
        multiImageManager: managerRef,
      },
    },
  })
  vm = wrapper.vm
  await nextTick()
})

afterEach(() => {
  wrapper?.unmount()
  videoGallery.value = []
})

describe('Gesamtdauer der Beat-Drop-Marker', () => {
  it('Marker ohne Elemente hat keine Dauer', () => {
    const marker = markerStore.addMarker(2, { visualizer: 'bars' })
    expect(vm.getMarkerDuration(marker)).toEqual({ seconds: null, hasPermanent: false, count: 0 })
  })

  it('nimmt das Element mit der längsten Anzeigedauer (Text vs. Bild)', () => {
    const anim = createImageAnimation()
    Object.assign(anim.fade, timedFade(6000))
    const img = mim.addImage(document.createElement('img'), { timedAnimation: anim })!
    const marker = markerStore.addMarker(4, { textId: 1, imageId: img.id })
    // Text: 1 + 3 + 1 = 5 s, Bild: 1 + 6 + 1 = 8 s
    expect(vm.getMarkerDuration(marker)).toEqual({ seconds: 8, hasPermanent: false, count: 2 })
  })

  it('kennzeichnet dauerhafte Elemente (permanenter Text, Form ohne Ausblenden)', () => {
    const shape = useShapeStore().addShape('ellipse', 1000, 500)!
    const marker = markerStore.addMarker(4, { textId: 2, shapeId: shape.id })
    expect(vm.getMarkerDuration(marker)).toEqual({ seconds: null, hasPermanent: true, count: 2 })

    // Form mit „Ausblenden“ ist begrenzt (Verzögerung + Dauer)
    shape.animation = { type: 'fadeOut', duration: 2, intensity: 100, delay: 7 }
    expect(vm.getMarkerDuration(marker)).toEqual({ seconds: 9, hasPermanent: true, count: 2 })
  })

  it('einmal abgespieltes Video zählt mit seiner Länge, Schleife ist dauerhaft', () => {
    const once = markerStore.addMarker(4, {
      textId: 1,
      video: { galleryId: 1, name: 'clip', loop: false },
    })
    expect(vm.getMarkerDuration(once)).toEqual({ seconds: 12, hasPermanent: false, count: 2 })
    const loop = markerStore.addMarker(8, { video: { galleryId: 1, name: 'clip' } })
    expect(vm.getMarkerDuration(loop).hasPermanent).toBe(true)
  })

  it('gelöschte Elemente zählen nicht', () => {
    const marker = markerStore.addMarker(4, { textId: 99, imageId: 12345 })
    expect(vm.getMarkerDuration(marker).count).toBe(0)
  })

  it('Formular: rechnet mit der aktuellen Auswahl vor dem Speichern', () => {
    vm.addMarkerAtCurrentTime()
    expect(vm.getPendingMarkerDuration().count).toBe(0)
    vm.newMarkerTextId = 1
    expect(vm.getPendingMarkerDuration().seconds).toBe(5)
    // Neues Galerie-Bild mit Animation aus dem Formular
    Object.assign(vm.newMarkerPlacedImageAnimation.fade, timedFade(10000))
    vm.newMarkerImageId = 'gallery:1'
    expect(vm.getPendingMarkerDuration().seconds).toBe(12)
    vm.newMarkerVideoId = 1
    vm.newMarkerVideoLoop = false
    expect(vm.getPendingMarkerDuration()).toEqual({ seconds: 12, hasPermanent: false, count: 3 })
    vm.newMarkerVideoLoop = true
    expect(vm.getPendingMarkerDuration().hasPermanent).toBe(true)
  })
})

describe('Gesamtdauer im Marker-Popover', () => {
  const PopoverHost = defineComponent({
    setup() {
      provide('playerBar', {
        popover: { closePopover: () => {}, cascadeOffset: () => ({ x: 0, y: 0 }) },
        markers: useBeatMarkers(() => {}, { videoGallery }),
      })
      return () => h(BeatMarkerPopover)
    },
  })

  const mountPopover = () =>
    mount(PopoverHost, {
      global: {
        provide: {
          canvasManager: ref({ textManager: { textObjects, markerRevealedIds: new Set() } }),
          multiImageManager: ref(mim),
        },
      },
    })

  it('Liste: Chip mit Dauer, Ende im Titel; dauerhaft wird benannt', async () => {
    markerStore.addMarker(4, { textId: 1 })
    markerStore.addMarker(20, { textId: 2 })
    markerStore.addMarker(30, { visualizer: 'bars' })
    const popover = mountPopover()
    await nextTick()
    const chips = popover.findAll('.marker-action-duration')
    expect(chips.map((c) => c.text())).toEqual(['⏱5.00s', '⏱dauerhaft'])
    expect(chips[0]!.attributes('title')).toContain('Ende 0:09.00')
    popover.unmount()
  })

  it('Formular: zeigt Dauer und Ende ab der Markerzeit', async () => {
    const popover = mountPopover()
    markerStore.addMarker(10, { textId: 1, shapeId: null })
    await nextTick()
    await popover.find('.marker-label').trigger('click')
    await nextTick()
    const line = popover.find('.marker-duration')
    expect(line.find('.marker-duration-value').text()).toBe('5.00 s')
    expect(line.find('.marker-duration-end').text()).toBe('· Ende 0:15.00')
    expect(line.attributes('title')).toContain('Längste Anzeigedauer')
    popover.unmount()
  })
})
