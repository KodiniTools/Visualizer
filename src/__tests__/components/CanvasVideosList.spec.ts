// @vitest-environment jsdom
// Charakterisierung der Canvas-Videoliste im Video-Panel. Zugriff über
// sichtbare Texte, Labels und Titel statt CSS-Klassen, damit die Tests den
// Wechsel auf die Ui-Bausteine unverändert überstehen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import CanvasVideosList from '../../components/video-panel/CanvasVideosList.vue'
import SliderField from '../../components/ui/SliderField.vue'
import de from '../../lib/i18n/de'

const V = de.videoPanel
let wrapper: VueWrapper | null
let vp: ReturnType<typeof makePanel>

type FakeVideo = { id: string; isPlaying: boolean; current?: number; duration?: number }

function makePanel(videos: FakeVideo[]) {
  const canvasVideos = ref(videos)
  const selectedCanvasVideo = ref<FakeVideo | null>(null)
  const tick = ref(0)
  return {
    canvasVideos,
    selectedCanvasVideo,
    selectedVideoCurrentTime: ref(12),
    selectedVideoDuration: ref(60),
    selectedVideoVolume: ref(0.5),
    selectedVideoBehindVisualizer: ref(false),
    videoBoundsApi: { getCanvas: () => null },
    setVideoBehindVisualizer: vi.fn(),
    videoLoop: ref(true),
    videoMuted: ref(false),
    videoBehindVisualizer: ref(false),
    isVideoActive: (v: FakeVideo) => selectedCanvasVideo.value === v,
    selectCanvasVideo: vi.fn((v: FakeVideo) => {
      selectedCanvasVideo.value = v
    }),
    togglePlayVideo: vi.fn(),
    removeCanvasVideo: vi.fn(),
    playAllVideos: vi.fn(),
    pauseAllVideos: vi.fn(),
    formatTime: (s: number) =>
      `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`,
    seekToTime: vi.fn(),
    seekBackward: vi.fn(),
    seekForward: vi.fn(),
    updateVideoVolume: vi.fn(),
    // Liest `tick` wie das Original, damit die Anzeige mitläuft
    tick,
    videoPlaybackTime: (v: FakeVideo) => {
      void tick.value
      return { current: v.current ?? 0, duration: v.duration ?? 0 }
    },
  }
}

function mountList(
  videos: FakeVideo[] = [
    { id: 'a', isPlaying: false },
    { id: 'b', isPlaying: true },
  ],
) {
  vp = makePanel(videos)
  wrapper = mount(CanvasVideosList, {
    attachTo: document.body,
    global: {
      provide: { videoPanel: vp },
      stubs: { VideoAudioReactive: true, PositionSizeControls: true },
    },
  })
  return wrapper
}

const body = () => document.body

/** Knöpfe, deren Text, Titel oder aria-label einem der Namen entspricht. */
function buttons(...names: string[]) {
  return [...body().querySelectorAll('button')].filter((b) =>
    names.some(
      (n) =>
        b.textContent!.replace(/\s+/g, ' ').trim() === n ||
        b.getAttribute('title') === n ||
        b.getAttribute('aria-label') === n,
    ),
  )
}

async function clickLabel(text: string) {
  const label = [...body().querySelectorAll('label')].find((l) => l.textContent!.trim() === text)
  expect(label, `Label „${text}“`).toBeTruthy()
  label!.click()
  await flushPromises()
}

/** Innerstes Element mit Name und beiden Knöpfen eines Videos = die Zeile. */
function row(name: string) {
  const candidates = [...body().querySelectorAll<HTMLElement>('*')].filter(
    (el) => el.textContent!.includes(name) && el.querySelectorAll('button').length === 2,
  )
  return candidates[candidates.length - 1]
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('Canvas-Videoliste', () => {
  it('ohne Videos wird nichts angezeigt', () => {
    mountList([])
    expect(body().textContent).not.toContain(V.canvasVideosTitle)
  })

  it('listet die Videos mit Nummer und Namen', () => {
    mountList()
    expect(body().textContent).toContain(V.canvasVideosTitle)
    expect(body().textContent).toContain(`${V.videoLabel} 1`)
    expect(body().textContent).toContain(`${V.videoLabel} 2`)
  })

  it('Abspielen/Pause und Entfernen je Video, ohne die Zeile auszuwählen', async () => {
    mountList()
    const play = buttons('Play', de.videoPanel.play ?? 'Play')
    const pause = buttons('Pause', de.videoPanel.pause ?? 'Pause')
    expect(play).toHaveLength(1)
    expect(pause).toHaveLength(1)
    play[0]!.click()
    expect(vp.togglePlayVideo).toHaveBeenCalledWith(vp.canvasVideos.value[0])
    const remove = buttons(de.common.remove)
    expect(remove).toHaveLength(2)
    remove[1]!.click()
    expect(vp.removeCanvasVideo).toHaveBeenCalledWith(vp.canvasVideos.value[1])
    expect(vp.selectCanvasVideo).not.toHaveBeenCalled()
  })

  it('Klick auf eine Zeile wählt das Video und zeigt die Steuerung', async () => {
    mountList()
    expect(body().textContent).not.toContain(V.videoControl)
    expect(body().textContent).toContain(V.audioTargetHint)
    const target = row(`${V.videoLabel} 2`)
    expect(target).toBeTruthy()
    target!.click()
    await flushPromises()
    expect(vp.selectCanvasVideo).toHaveBeenCalledWith(vp.canvasVideos.value[1])
    expect(body().textContent).toContain(V.videoControl)
    expect(body().textContent).toContain('0:12 / 1:00')
    expect(body().textContent).not.toContain(V.audioTargetHint)
  })

  it('Alle abspielen / Alle pausieren', () => {
    mountList()
    buttons(V.playAll)[0]!.click()
    buttons(V.pauseAll)[0]!.click()
    expect(vp.playAllVideos).toHaveBeenCalledTimes(1)
    expect(vp.pauseAllVideos).toHaveBeenCalledTimes(1)
  })

  it('Wiederholen und Stumm schalten die Einstellungen', async () => {
    mountList()
    await clickLabel(V.loop)
    expect(vp.videoLoop.value).toBe(false)
    await clickLabel(V.muted)
    expect(vp.videoMuted.value).toBe(true)
  })

  it('Spulen ±5 s, Zeit-Regler und Lautstärke', async () => {
    mountList()
    vp.selectedCanvasVideo.value = vp.canvasVideos.value[0]!
    await flushPromises()
    buttons('-5s', de.videoPanel.seekBack5 ?? '-5s')[0]!.click()
    buttons('+5s', de.videoPanel.seekForward5 ?? '+5s')[0]!.click()
    expect(vp.seekBackward).toHaveBeenCalledWith(vp.canvasVideos.value[0], 5)
    expect(vp.seekForward).toHaveBeenCalledWith(vp.canvasVideos.value[0], 5)

    const sliders = wrapper!.findAllComponents(SliderField)
    expect(sliders).toHaveLength(2)
    sliders[0]!.vm.$emit('update:modelValue', 30)
    expect(vp.seekToTime).toHaveBeenCalledWith(vp.canvasVideos.value[0], 30)
    sliders[1]!.vm.$emit('update:modelValue', 0.8)
    expect(vp.updateVideoVolume).toHaveBeenCalledWith(0.8)
    expect(body().textContent).toContain(V.volume)
    expect(body().textContent).toContain('50%')
    expect(body().textContent).toContain(V.audioRecordHint)
  })
})

describe('Canvas-Videoliste – Videodauer', () => {
  it('zeigt je Video Position / Gesamtdauer', () => {
    mountList([
      { id: 'a', isPlaying: false, current: 0, duration: 90 },
      { id: 'b', isPlaying: true, current: 65, duration: 3725 },
    ])
    const times = [...body().querySelectorAll('[title]')].filter(
      (el) => el.getAttribute('title') === V.videoTimeTitle,
    )
    expect(times.map((el) => el.textContent!.trim())).toEqual(['0:00 / 1:30', '1:05 / 62:05'])
  })

  it('unbekannte Dauer (Metadaten fehlen) zeigt 0:00', () => {
    mountList([{ id: 'a', isPlaying: false }])
    expect(row(`${V.videoLabel} 1`)!.textContent).toContain('0:00 / 0:00')
  })

  it('läuft während der Wiedergabe mit', async () => {
    const videos = [{ id: 'a', isPlaying: true, current: 1, duration: 30 }]
    mountList(videos)
    expect(row(`${V.videoLabel} 1`)!.textContent).toContain('0:01 / 0:30')
    videos[0]!.current = 14
    vp.tick.value++
    await flushPromises()
    expect(row(`${V.videoLabel} 1`)!.textContent).toContain('0:14 / 0:30')
  })
})

describe('Canvas-Videoliste – Position & Größe', () => {
  it('erst mit ausgewähltem Video; bekommt Video und Bounds-API', async () => {
    mountList()
    expect(wrapper!.findComponent({ name: 'PositionSizeControls' }).exists()).toBe(false)
    vp.selectedCanvasVideo.value = vp.canvasVideos.value[1]!
    await flushPromises()
    const psc = wrapper!.findComponent({ name: 'PositionSizeControls' })
    expect(psc.exists()).toBe(true)
    expect(psc.props('image')).toEqual(vp.canvasVideos.value[1])
    expect(psc.props('api')).toBe(vp.videoBoundsApi)
  })
})

describe('Canvas-Videoliste – hinter dem Visualizer rendern', () => {
  const ALL = de.foto.renderBehindVisualizer
  const ONE = V.selectedBehindVisualizer

  it('gemeinsamer Schalter für alle Videos ist immer sichtbar – auch ohne Auswahl', async () => {
    mountList()
    expect(vp.selectedCanvasVideo.value).toBeNull()
    expect(body().textContent).toContain(ALL)
    expect(body().textContent).not.toContain(ONE)
    for (const expected of [true, false, true]) {
      await clickLabel(ALL)
      expect(vp.videoBehindVisualizer.value).toBe(expected)
    }
  })

  it('zeigt den Stand des gemeinsamen Schalters', async () => {
    mountList()
    vp.videoBehindVisualizer.value = true
    await flushPromises()
    const label = [...body().querySelectorAll('label')].find((l) => l.textContent!.trim() === ALL)
    const sw = document.getElementById(label!.htmlFor)!
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('Schalter „nur dieses Video“ erst mit Auswahl; zeigt und setzt die Ebene', async () => {
    mountList()
    vp.selectedCanvasVideo.value = vp.canvasVideos.value[0]!
    await flushPromises()
    expect(body().textContent).toContain(ONE)
    await clickLabel(ONE)
    expect(vp.setVideoBehindVisualizer).toHaveBeenCalledWith(true)
    expect(vp.videoBehindVisualizer.value).toBe(false) // gemeinsamer Schalter unberührt

    vp.selectedVideoBehindVisualizer.value = true
    await flushPromises()
    const sw = [...body().querySelectorAll('[role="switch"]')].at(-1)!
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })
})

describe('Canvas-Videoliste – Ui-Bausteine', () => {
  it('Schalter, Icon-Buttons mit Labels, Lautstärke als Slider-Zeile', async () => {
    mountList()
    vp.selectedCanvasVideo.value = vp.canvasVideos.value[0]!
    await flushPromises()
    const switches = [...body().querySelectorAll('[role="switch"]')]
    expect(switches.map((s) => s.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ])
    expect(body().querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
    for (const label of [V.play, V.pause, V.seekBack5, V.seekForward5]) {
      expect(buttons(label).length, label).toBeGreaterThan(0)
    }
    // keine Emoji-Symbole mehr als Knopfbeschriftung
    expect(body().textContent).not.toMatch(/[▶⏸⏪⏩✕]/)
  })
})
