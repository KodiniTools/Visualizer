// Spulen: Nach einem Sprung (während der Wiedergabe oder in der Pause mit
// anschließendem Fortsetzen) zeigt der Canvas den Stand, als wäre der Track
// von vorn gelaufen – Bilder und Texte mit laufender Anzeigedauer sind zu
// sehen, ihre Animationen stehen an der passenden Stelle.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { stub } from '../helpers/canvasStubs'
import { useBeatMarkers } from '../../composables/useBeatMarkers'
import { usePlayerStore } from '../../stores/playerStore'
import { useBeatMarkerStore } from '../../stores/beatMarkerStore'
import { useMarkerTransitionStore } from '../../stores/markerTransitionStore'
import { useVisualizerStore } from '../../stores/visualizerStore'
import { TextManager } from '../../lib/textManager'
import { getFadeOpacity } from '../../lib/textManager/animation/fade'
import { getDisplayOpacity } from '../../lib/textManager/animation/displayOpacity'
import { MultiImageManager, type CanvasImage } from '../../lib/multiImageManager'
import {
  createImageAnimation,
  getImageAnimationTransform,
} from '../../lib/canvasObjects/imageAnimation'
import type { TextObject } from '../../lib/textManager/types'

const Host = defineComponent({
  setup() {
    return useBeatMarkers(() => {})
  },
  template: '<div />',
})

const CANVAS = { width: 1000, height: 500 }

let wrapper: VueWrapper<InstanceType<typeof Host>> | null
let playerStore: ReturnType<typeof usePlayerStore>
let markerStore: ReturnType<typeof useBeatMarkerStore>
let tm: TextManager
let text: TextObject
let mim: MultiImageManager
let image: CanvasImage

/** Bild mit Einblenden (1 s) und 14,6 s Anzeigedauer – wie im Fehlerbericht */
function timedFade(displayDuration = 14600) {
  const anim = createImageAnimation()
  Object.assign(anim.fade, {
    enabled: true,
    direction: 'in',
    duration: 1000,
    easing: 'linear',
    permanent: false,
    displayDuration,
  })
  return anim
}

const imageOpacity = () => getImageAnimationTransform(image, CANVAS).opacity
const textVisible = () =>
  (text.opacity ?? 0) > 0 && getFadeOpacity(text).opacity * getDisplayOpacity(text) > 0

async function seekPaused(time: number) {
  playerStore.isPlaying = false
  await nextTick()
  playerStore.audioRef!.currentTime = time
  playerStore.currentTime = time
  await nextTick()
}

async function play() {
  playerStore.isPlaying = true
  await nextTick()
}

async function startPlaybackAtZero() {
  playerStore.audioRef!.currentTime = 0
  playerStore.currentTime = 0
  await play()
}

beforeEach(async () => {
  setActivePinia(createPinia())
  localStorage.clear()
  playerStore = usePlayerStore()
  markerStore = useBeatMarkerStore()
  useMarkerTransitionStore().enabled = false
  playerStore.duration = 300
  playerStore.audioRef = stub({ currentTime: 0 })

  tm = new TextManager({})
  text = tm.add('Dinko Ramić')
  text.id = 1
  text.opacity = 100
  Object.assign(text.animation!.fade!, {
    enabled: true,
    direction: 'in',
    duration: 1000,
    easing: 'linear',
    permanent: false,
    displayDuration: 5000,
  })

  const managerRef = ref(
    new MultiImageManager(stub({ width: 1000, height: 500 }), { redrawCallback: () => {} }),
  )
  mim = managerRef.value as MultiImageManager
  image = mim.addImage(stub({ width: 10, height: 10 }), { timedAnimation: timedFade() })!

  wrapper = mount(Host, {
    global: {
      provide: {
        canvasManager: ref({ textManager: tm, redrawCallback: () => {} }),
        multiImageManager: managerRef,
      },
    },
  })
  await nextTick()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('Beat-Marker nach dem Spulen', () => {
  it('Bild mit laufender Anzeigedauer ist nach Spulen + Abspielen zu sehen', async () => {
    markerStore.addMarker(18, { imageId: image.id })
    markerStore.addMarker(24.77, { textId: 1 }) // späterer Marker ohne Bild
    await seekPaused(25)
    await play()
    expect(mim.isMarkerHidden(image.id)).toBe(false)
    // 7 s nach dem Marker: Eingang (1 s) vorbei, Anzeigedauer (14,6 s) läuft
    expect(imageOpacity()).toBe(1)
  })

  it('Bild, dessen Anzeigedauer an der Zielposition abgelaufen ist, bleibt unsichtbar', async () => {
    markerStore.addMarker(18, { imageId: image.id })
    await seekPaused(40)
    await play()
    expect(imageOpacity()).toBe(0)
  })

  it('Einblenden steht nach dem Spulen an der passenden Stelle', async () => {
    markerStore.addMarker(10, { imageId: image.id })
    await seekPaused(10.5)
    await play()
    expect(imageOpacity()).toBeGreaterThan(0.4)
    expect(imageOpacity()).toBeLessThan(0.6)
  })

  it('Bilder späterer Marker bleiben bis zu ihrem Marker ausgeblendet', async () => {
    markerStore.addMarker(30, { imageId: image.id })
    await seekPaused(25)
    await play()
    expect(mim.isMarkerHidden(image.id)).toBe(true)
  })

  it('Sprung während der Wiedergabe stellt Bild und Text der Zielposition her', async () => {
    markerStore.addMarker(5, { textId: 1 })
    markerStore.addMarker(18, { imageId: image.id })
    await startPlaybackAtZero()
    expect(text.opacity).toBe(0)
    expect(mim.isMarkerHidden(image.id)).toBe(true)

    playerStore.currentTime = 20
    await nextTick()
    expect(mim.isMarkerHidden(image.id)).toBe(false)
    expect(imageOpacity()).toBe(1)
    // Text (Marker bei 5 s, 1 s + 5 s + 1 s) ist bei 20 s schon ausgelaufen
    expect(textVisible()).toBe(false)

    playerStore.currentTime = 7
    await nextTick()
    expect(textVisible()).toBe(true)
    expect(mim.isMarkerHidden(image.id)).toBe(true)
  })

  it('Text mit eigener Anzeigedauer bleibt neben einem späteren Text stehen', async () => {
    const other = tm.add('Snovi moji')
    other.id = 2
    other.opacity = 100
    markerStore.addMarker(5, { textId: 1 })
    markerStore.addMarker(8, { textId: 2 })
    await seekPaused(9)
    await play()
    expect(textVisible()).toBe(true)
    expect(other.opacity).toBe(100)
  })

  it('übernimmt nach dem Spulen in der Pause Visualizer des letzten Markers', async () => {
    const viz = useVisualizerStore()
    viz.selectVisualizer('bars')
    markerStore.addMarker(5, { visualizer: 'waveform', visualizerVisible: true })
    markerStore.addMarker(60, { visualizerVisible: false })
    await seekPaused(30)
    await play()
    expect(viz.selectedVisualizer).toBe('waveform')
    expect(viz.showVisualizer).toBe(true)

    await seekPaused(70)
    await play()
    expect(viz.showVisualizer).toBe(false)
  })

  it('reines Fortsetzen ohne Spulen lässt die Szene unverändert', async () => {
    const viz = useVisualizerStore()
    markerStore.addMarker(5, { visualizer: 'waveform', visualizerVisible: true })
    await startPlaybackAtZero()
    await seekPaused(30)
    await play()
    playerStore.isPlaying = false
    await nextTick()
    // In der Pause bearbeitet der Nutzer die Szene
    viz.selectVisualizer('bars')
    await play()
    expect(viz.selectedVisualizer).toBe('bars')
  })
})
