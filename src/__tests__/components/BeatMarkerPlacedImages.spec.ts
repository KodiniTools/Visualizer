import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { fakeImage, stub } from '../helpers/canvasStubs'
import { useBeatMarkers } from '../../composables/useBeatMarkers'
import { useImageGallery } from '../../composables/useImageGallery'
import { usePlayerStore } from '../../stores/playerStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore'
import { MultiImageManager, type CanvasImage } from '../../lib/multiImageManager'
import {
  createImageAnimation,
  getImageAnimationTransform,
} from '../../lib/canvasObjects/imageAnimation'
import { IMAGE_ANIMATION_KEY } from '../../lib/imagePlacementSettings'

const Host = defineComponent({
  setup() {
    return useBeatMarkers(() => {})
  },
  template: '<div />',
})

const CANVAS = stub<HTMLCanvasElement>({ width: 1000, height: 500 })

type HostVm = InstanceType<typeof Host>

let wrapper: VueWrapper<HostVm> | null
let vm: HostVm
let playerStore: ReturnType<typeof usePlayerStore>
let markerStore: ReturnType<typeof useBeatMarkerStore>
let mim: MultiImageManager
let galleryImg: HTMLImageElement
let first: CanvasImage
let second: CanvasImage

function frame(time: number) {
  playerStore.audioRef!.currentTime = time
  playerStore.notifyFrame()
}

async function startPlaybackAtZero() {
  playerStore.audioRef!.currentTime = 0
  playerStore.currentTime = 0
  playerStore.isPlaying = true
  await nextTick()
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = stub({ currentTime: 0 })

  const { imageGallery } = useImageGallery()
  // Echtes <img> wie in der Galerie (Vue macht es nicht reaktiv)
  galleryImg = document.createElement('img')
  galleryImg.width = 100
  galleryImg.height = 100
  imageGallery.value = [stub({ id: 7, img: galleryImg, name: 'sonne.png', size: '1 KB' })]

  // Manager wie in der App in einer Vue-Ref (Render-Loop sieht Proxys)
  const managerRef = ref(new MultiImageManager(CANVAS, { redrawCallback: () => {} }))
  mim = managerRef.value
  const anim = createImageAnimation()
  anim.fade.enabled = true
  first = mim.addImage(galleryImg, { timedAnimation: anim })!
  second = mim.addImage(fakeImage({ width: 50, height: 80, src: 'data:y' }))!
  mim.setSelectedImage(null)

  wrapper = mount(Host, {
    global: { provide: { canvasManager: ref(null), multiImageManager: managerRef } },
  })
  vm = wrapper.vm
  await nextTick()
})

afterEach(() => {
  wrapper?.unmount()
  useImageGallery().imageGallery.value = []
})

describe('Beat-Marker mit platzierten Bildern', () => {
  it('bietet platzierte Bilder (Ebene, Galerie-Name, Animation) und die Galerie an', () => {
    expect(vm.getMarkerCanvasImages()).toEqual([
      { id: first.id, layer: 1, name: 'sonne.png', animated: true },
      { id: second.id, layer: 2, name: '', animated: false },
    ])
    expect(vm.getMarkerImageGallery()).toEqual([
      { value: 'gallery:7', number: 1, name: 'sonne.png' },
    ])
  })

  it('Slideshow-Bilder stehen nicht zur Auswahl', () => {
    mim.images[1]!.isSlideshowImage = true
    expect(vm.getMarkerCanvasImages().map((i) => i.id)).toEqual([first.id])
  })

  it('speichert das gewählte Bild samt Bezeichnung und lädt es beim Bearbeiten', () => {
    vm.addMarkerAtCurrentTime()
    vm.newMarkerImageId = first.id
    vm.confirmAddMarker()
    const marker = markerStore.markers.at(-1)
    expect(marker!.action.imageId).toBe(first.id)
    expect(marker!.action.imageLabel).toBe('Ebene 1 — sonne.png')
    expect(vm.newMarkerImageId).toBe('')

    vm.startEditMarker(marker!)
    expect(vm.newMarkerImageId).toBe(first.id)
  })

  it('beim Bearbeiten eines Markers mit gelöschtem Bild bleibt die Auswahl leer', () => {
    const marker = markerStore.addMarker(4, { imageId: 12345 })
    vm.startEditMarker(marker)
    expect(vm.newMarkerImageId).toBe('')
  })

  it('ein Galerie-Eintrag platziert das Bild mit der „Animation beim Hinzufügen“', () => {
    const saved = createImageAnimation()
    saved.slide.enabled = true
    localStorage.setItem(IMAGE_ANIMATION_KEY, JSON.stringify(saved))

    vm.addMarkerAtCurrentTime()
    vm.newMarkerImageId = 'gallery:7'
    vm.confirmAddMarker()

    expect(mim.images).toHaveLength(3)
    const placed = mim.images[2]
    expect(placed!.imageObject).toBe(galleryImg)
    expect(placed!.timedAnimation!.slide.enabled).toBe(true)
    expect(mim.getSelectedImage()).toBeNull()
    const marker = markerStore.markers.at(-1)
    expect(marker!.action.imageId).toBe(placed!.id)
    expect(marker!.action.imageLabel).toBe('Ebene 3 — sonne.png')
  })

  it('Galerie-Eintrag: die im Marker-Formular geänderte Animation wird übernommen', () => {
    vm.addMarkerAtCurrentTime()
    expect(vm.newMarkerPlacedImageAnimation.fade.enabled).toBe(false) // Vorgabe: alles aus
    vm.newMarkerPlacedImageAnimation.scale.enabled = true
    vm.newMarkerImageId = 'gallery:7'
    vm.confirmAddMarker()
    expect(mim.images[2]!.timedAnimation!.scale.enabled).toBe(true)
  })

  it('getMarkerCanvasImage liefert das Bild selbst (Animation im Formular bearbeitbar)', () => {
    const img = vm.getMarkerCanvasImage(first.id)
    expect(img!.id).toBe(first.id)
    img!.timedAnimation!.slide.enabled = true
    expect(mim.images[0]!.timedAnimation!.slide.enabled).toBe(true)
    expect(vm.getMarkerCanvasImage('gallery:7')).toBeNull()
    expect(vm.getMarkerCanvasImage('')).toBeNull()
  })

  it('blendet zugewiesene Bilder beim Start aus und zum Marker-Zeitpunkt ein', async () => {
    markerStore.addMarker(5, { imageId: first.id })
    markerStore.addMarker(8, { imageId: second.id })
    await startPlaybackAtZero()
    expect(mim.isMarkerHidden(first.id)).toBe(true)
    expect(mim.isMarkerHidden(second.id)).toBe(true)

    frame(4.99)
    frame(5.01)
    expect(mim.isMarkerHidden(first.id)).toBe(false)
    expect(mim.isMarkerHidden(second.id)).toBe(true)

    frame(7.99)
    frame(8.01)
    expect(mim.isMarkerHidden(first.id)).toBe(true)
    expect(mim.isMarkerHidden(second.id)).toBe(false)
  })

  it('ausgeblendete Bilder werden nicht gezeichnet und sind nicht anklickbar', async () => {
    markerStore.addMarker(5, { imageId: first.id })
    await startPlaybackAtZero()
    const drawn: CanvasImage['id'][] = []
    mim._drawImage = (_ctx, img) => drawn.push(img.id)
    mim.drawImages(stub({ canvas: CANVAS }))
    expect(drawn).toEqual([second.id])

    const b = mim.getImageBounds(mim.images[0])
    const hit = mim.findImageAt(b!.x + 1, b!.y + 1)
    expect(hit?.id).not.toBe(first.id)
  })

  it('zum Marker-Zeitpunkt starten die Animationen des Bildes von vorn', async () => {
    markerStore.addMarker(5, { imageId: first.id })
    const T = 1_000_000
    // Animation ist längst durchgelaufen
    getImageAnimationTransform(mim.images[0], CANVAS, T)
    expect(getImageAnimationTransform(mim.images[0], CANVAS, T + 10_000).opacity).toBe(1)

    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    // Erster Frame nach dem Marker beginnt bei 0 (Einblenden von vorn)
    expect(getImageAnimationTransform(mim.images[0], CANVAS, T + 20_000).opacity).toBe(0)
  })

  it('ein Marker ohne Bild blendet das Bild des vorherigen Markers aus', async () => {
    markerStore.addMarker(5, { imageId: first.id })
    markerStore.addMarker(8, { visualizer: null })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    expect(mim.isMarkerHidden(first.id)).toBe(false)
    frame(7.99)
    frame(8.01)
    expect(mim.isMarkerHidden(first.id)).toBe(true)
    // Bilder ohne Marker-Zuweisung bleiben sichtbar
    expect(mim.isMarkerHidden(second.id)).toBe(false)
  })

  it('blendet das Bild wieder ein, wenn sein Marker gelöscht oder Marker deaktiviert werden', async () => {
    const marker = markerStore.addMarker(5, { imageId: first.id })
    markerStore.addMarker(9, { imageId: second.id })
    await startPlaybackAtZero()
    vm.removeMarker(marker.id)
    expect(mim.isMarkerHidden(first.id)).toBe(false)
    expect(mim.isMarkerHidden(second.id)).toBe(true)

    markerStore.toggleEnabled()
    await nextTick()
    expect(mim.isMarkerHidden(second.id)).toBe(false)
  })

  it('beim Verlassen werden alle Bilder wieder eingeblendet', async () => {
    markerStore.addMarker(5, { imageId: first.id })
    await startPlaybackAtZero()
    wrapper!.unmount()
    wrapper = null
    expect(mim.isMarkerHidden(first.id)).toBe(false)
  })
})

describe('MultiImageManager: Marker-Ausblendung', () => {
  it('restartImageAnimations startet auch den Einblend-Effekt der Platzierung neu', () => {
    const mgr = new MultiImageManager(CANVAS, { redrawCallback: () => {} })
    const img = mgr.addImageWithBounds(
      fakeImage({ width: 10, height: 10 }),
      { relX: 0, relY: 0, relWidth: 0.2, relHeight: 0.2 },
      'fade',
      { duration: 500 },
    )
    img!.animation!.active = false
    img!.animation!.progress = 1
    expect(mgr.restartImageAnimations(img!.id)).toBe(true)
    expect(img!.animation).toMatchObject({ active: true, progress: 0 })
    expect(mgr.restartImageAnimations('fehlt')).toBe(false)
  })

  it('clear() vergisst ausgeblendete Bilder', () => {
    const mgr = new MultiImageManager(CANVAS, { redrawCallback: () => {} })
    const img = mgr.addImage(fakeImage({ width: 10, height: 10 }))
    mgr.setMarkerHidden(img!.id, true)
    mgr.clear()
    expect(mgr.markerHiddenIds.size).toBe(0)
  })
})

describe('Bilder mit eigener Anzeigedauer', () => {
  /** Ersetzt die Animation des ersten Bildes: Einblenden mit Anzeigedauer */
  function timedFirst(overrides: { loop?: boolean; permanent?: boolean } = {}) {
    const anim = createImageAnimation()
    anim.fade.enabled = true
    anim.fade.permanent = overrides.permanent ?? false
    anim.fade.loop = overrides.loop ?? false
    mim.images[0]!.timedAnimation = anim
  }

  async function reachSecondMarker() {
    markerStore.addMarker(5, { imageId: first.id })
    markerStore.addMarker(8, { imageId: second.id })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    expect(mim.isMarkerHidden(first.id)).toBe(false)
    frame(7.99)
    frame(8.01)
  }

  it('der nächste Bild-Marker blendet ein Bild mit Anzeigedauer nicht aus', async () => {
    timedFirst()
    await reachSecondMarker()
    // Beide Bilder gleichzeitig sichtbar; das erste endet mit seiner Animation
    expect(mim.isMarkerHidden(first.id)).toBe(false)
    expect(mim.isMarkerHidden(second.id)).toBe(false)
  })

  it('auch ein Marker ohne Bild lässt es nach seiner Anzeigedauer auslaufen', async () => {
    timedFirst()
    markerStore.addMarker(5, { imageId: first.id })
    markerStore.addMarker(8, { visualizer: null })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    frame(7.99)
    frame(8.01)
    expect(mim.isMarkerHidden(first.id)).toBe(false)
  })

  it('permanente Bilder und Bilder mit Loop werden weiterhin abgelöst', async () => {
    timedFirst({ loop: true })
    await reachSecondMarker()
    expect(mim.isMarkerHidden(first.id)).toBe(true)
    expect(mim.isMarkerHidden(second.id)).toBe(false)
  })

  it('ein noch nicht erschienenes Bild mit Anzeigedauer bleibt ausgeblendet', async () => {
    timedFirst()
    markerStore.addMarker(5, { imageId: second.id })
    markerStore.addMarker(8, { imageId: first.id })
    await startPlaybackAtZero()
    frame(4.99)
    frame(5.01)
    expect(mim.isMarkerHidden(first.id)).toBe(true)
    expect(mim.isMarkerHidden(second.id)).toBe(false)
  })
})
