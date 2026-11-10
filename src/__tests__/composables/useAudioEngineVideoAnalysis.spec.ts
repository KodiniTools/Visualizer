// @vitest-environment jsdom
/**
 * Audio-Engine: Video-Ton kann in den Analyser gehen. Player und Video laufen
 * über je einen Gain zum Analyser; audioSourceStore.analysisInput schaltet sie.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAudioEngine } from '../../composables/useAudioEngine'
import { useAudioSourceStore } from '../../stores/audioSourceStore'

interface FakeNode {
  kind: string
  gain: { value: number }
  targets: FakeNode[]
  connect: (n: FakeNode) => FakeNode
  disconnect: () => void
}

function node(kind: string): FakeNode {
  const n: FakeNode = {
    kind,
    gain: { value: 1 },
    targets: [],
    connect(t) {
      n.targets.push(t)
      return t
    },
    disconnect() {
      n.targets = []
    },
  }
  return n
}

let analyser: FakeNode
class FakeAudioContext {
  state = 'running'
  destination = node('destination')
  resume = vi.fn(async () => {})
  close = vi.fn(async () => {})
  createAnalyser() {
    analyser = node('analyser')
    return analyser
  }
  createGain() {
    return node('gain')
  }
  createBiquadFilter() {
    return { ...node('biquad'), type: '', frequency: { value: 0 } }
  }
  createMediaElementSource() {
    return node('mediaSource')
  }
  createMediaStreamDestination() {
    return { ...node('streamDest'), stream: {} }
  }
}

/** Gains, die direkt in den Analyser führen */
const analyserFeeds = (nodes: FakeNode[]) => nodes.filter((n) => n.targets.includes(analyser))

function reaches(from: FakeNode, to: FakeNode, seen = new Set<FakeNode>()): boolean {
  if (from === to) return true
  if (seen.has(from)) return false
  seen.add(from)
  return from.targets.some((t) => t.gain.value > 0 && reaches(t, to, seen))
}

function fakeVideo(opts: Partial<HTMLVideoElement> = {}) {
  return { paused: false, ended: false, muted: false, ...opts } as HTMLVideoElement
}

let created: FakeNode[]
let store: ReturnType<typeof useAudioSourceStore>

beforeEach(() => {
  setActivePinia(createPinia())
  store = useAudioSourceStore()
  created = []
  const origGain = FakeAudioContext.prototype.createGain
  const origSource = FakeAudioContext.prototype.createMediaElementSource
  vi.spyOn(FakeAudioContext.prototype, 'createGain').mockImplementation(function (
    this: FakeAudioContext,
  ) {
    const n = origGain.call(this)
    created.push(n)
    return n
  })
  vi.spyOn(FakeAudioContext.prototype, 'createMediaElementSource').mockImplementation(function (
    this: FakeAudioContext,
  ) {
    const n = origSource.call(this)
    created.push(n)
    return n
  })
  vi.stubGlobal('AudioContext', FakeAudioContext)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function setupEngine() {
  const engine = useAudioEngine({
    audioRef: ref({} as HTMLAudioElement),
    audioSourceStore: store,
  })
  engine.setupAudioContext()
  engine.registerEngine()
  const playerSource = created.find((n) => n.kind === 'mediaSource') as FakeNode
  return { engine, playerSource }
}

/** Video-Quelle (MediaElementSource) des zuletzt verbundenen Videos */
const lastVideoSource = () => created.filter((n) => n.kind === 'mediaSource').at(-1) as FakeNode

describe('useAudioEngine – Video-Ton in der Analyse', () => {
  it('Standard: nur der Player speist den Analyser', () => {
    const { playerSource } = setupEngine()
    // Zwei Eingänge (Player-Gain, Video-Gain), Video-Gain ist zu
    const feeds = analyserFeeds(created)
    expect(feeds).toHaveLength(2)
    expect(feeds.map((n) => n.gain.value).sort()).toEqual([0, 1])
    expect(reaches(playerSource, analyser)).toBe(true)
  })

  it('Player / Video / Mix schalten die Eingänge des Analysers', async () => {
    const { playerSource } = setupEngine()
    const { getAudioEngine } = await import('../../lib/audioEngineBridge')
    getAudioEngine()!.connectVideoToRecording(fakeVideo(), 1)
    const videoSource = lastVideoSource()
    expect(videoSource).not.toBe(playerSource)

    expect(reaches(playerSource, analyser)).toBe(true)
    expect(reaches(videoSource, analyser)).toBe(false)

    store.setAnalysisInput('video')
    await nextTick()
    expect(reaches(playerSource, analyser)).toBe(false)
    expect(reaches(videoSource, analyser)).toBe(true)

    store.setAnalysisInput('mix')
    await nextTick()
    expect(reaches(playerSource, analyser)).toBe(true)
    expect(reaches(videoSource, analyser)).toBe(true)
  })

  it('Video-Lautstärke 0 oder Trennen nimmt das Video aus der Analyse', async () => {
    setupEngine()
    const { getAudioEngine } = await import('../../lib/audioEngineBridge')
    const api = getAudioEngine()!
    const video = fakeVideo()
    api.connectVideoToRecording(video, 1)
    const videoSource = lastVideoSource()
    store.setAnalysisInput('video')
    await nextTick()

    api.setVideoVolume(video, 0)
    expect(reaches(videoSource, analyser)).toBe(false)
    api.setVideoVolume(video, 0.5)
    expect(reaches(videoSource, analyser)).toBe(true)

    api.disconnectVideoFromRecording(video)
    expect(reaches(videoSource, analyser)).toBe(false)
  })

  it('isVideoAudioPlaying: nur hörbare, laufende Videos zählen', async () => {
    const { engine } = setupEngine()
    const { getAudioEngine } = await import('../../lib/audioEngineBridge')
    const api = getAudioEngine()!
    expect(engine.isVideoAudioPlaying()).toBe(false)

    const video = fakeVideo({ paused: true })
    api.connectVideoToRecording(video, 1)
    expect(engine.isVideoAudioPlaying()).toBe(false)

    Object.assign(video, { paused: false })
    expect(engine.isVideoAudioPlaying()).toBe(true)

    Object.assign(video, { muted: true })
    expect(engine.isVideoAudioPlaying()).toBe(false)

    Object.assign(video, { muted: false, ended: true })
    expect(engine.isVideoAudioPlaying()).toBe(false)

    Object.assign(video, { ended: false })
    api.setVideoVolume(video, 0)
    expect(engine.isVideoAudioPlaying()).toBe(false)
  })
})
