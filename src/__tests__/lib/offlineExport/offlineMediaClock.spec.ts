import { describe, it, expect, vi, afterEach } from 'vitest'
import { installOfflineMediaClock } from '../../../lib/offlineExport/offlineMediaClock'
import type { FrameSource, OfflineMediaClock } from '../../../lib/offlineExport/offlineMediaClock'

/**
 * Attrappe eines Video-Elements: echtes Verhalten (paused/currentTime/play…)
 * steckt im Prototyp, wie bei HTMLMediaElement; die Uhr überschreibt es.
 */
class FakeVideoBase extends EventTarget {
  _paused = true
  _time = 0
  _ended = false
  _src = ''
  duration = 3
  loop = false
  muted = false
  volume = 1
  playbackRate = 1
  readyState = 4
  realPlays = 0
  get paused() {
    return this._paused
  }
  get ended() {
    return this._ended
  }
  get currentTime() {
    return this._time
  }
  set currentTime(t: number) {
    this._time = t
  }
  get src() {
    return this._src
  }
  set src(v: string) {
    this._src = v
    this.readyState = 0
  }
  get currentSrc() {
    return this._src
  }
  getAttribute(name: string) {
    return name === 'src' ? this._src : null
  }
  play() {
    this.realPlays++
    this._paused = false
    return Promise.resolve()
  }
  pause() {
    this._paused = true
  }
  load() {}
}
class FakeVideo extends FakeVideoBase {}

class FakeContext2D {
  drawn: unknown[] = []
  drawImage(image: unknown) {
    this.drawn.push(image)
  }
}

let clock: OfflineMediaClock | null = null
afterEach(() => {
  clock?.restore()
  clock = null
})

function setup() {
  const frameAt = vi.fn(async (t: number) => ({ frame: t }) as unknown as CanvasImageSource)
  const close = vi.fn()
  const createFrameSource = vi.fn(async (): Promise<FrameSource> => ({ frameAt, close }))
  clock = installOfflineMediaClock({
    createFrameSource,
    videoProto: FakeVideo.prototype,
    drawProtos: [FakeContext2D.prototype],
    macrotask: () => Promise.resolve(),
  })
  return { clock, frameAt, close, createFrameSource }
}

const video = (props: Partial<FakeVideo> = {}) => Object.assign(new FakeVideo(), props)

describe('offlineMediaClock', () => {
  it('übernimmt laufende Videos: echtes Element angehalten, virtuell ab 0 s', () => {
    const el = video()
    void el.play()
    el._time = 1.7
    const { clock } = setup()
    clock.adopt([el as unknown as HTMLVideoElement], { restart: true })

    expect(el._paused).toBe(true)
    expect(el.paused).toBe(false)
    expect(el.currentTime).toBe(0)
  })

  it('rückt pro Frame vor (Rate), mit Schleife bzw. Ende samt Ereignissen', () => {
    const looped = video({ loop: true, playbackRate: 2 })
    const once = video()
    const { clock } = setup()
    const events: string[] = []
    for (const type of ['pause', 'ended']) once.addEventListener(type, () => events.push(type))
    void looped.play()
    void once.play()

    clock.advance(1)
    expect(looped.currentTime).toBe(2)
    expect(once.currentTime).toBe(1)
    clock.advance(1.5)
    expect(looped.currentTime).toBeCloseTo(2, 6) // (2 + 3) % 3
    expect(once.currentTime).toBe(2.5)
    clock.advance(1)
    expect(once.currentTime).toBe(3)
    expect(once.paused).toBe(true)
    expect(once.ended).toBe(true)
    expect(events).toEqual(['pause', 'ended'])
    expect(once.realPlays).toBe(0)
  })

  it('play/pause/currentTime wirken virtuell und feuern die App-Ereignisse', async () => {
    const el = video()
    const { clock } = setup()
    const events: string[] = []
    for (const type of ['play', 'playing', 'pause', 'seeked']) {
      el.addEventListener(type, () => events.push(type))
    }
    await el.play()
    el.currentTime = 1.25
    el.pause()
    await Promise.resolve()

    expect(events).toEqual(['play', 'playing', 'pause', 'seeked'])
    expect(el.currentTime).toBe(1.25)
    expect(el._time).toBe(0)
    expect(el.realPlays).toBe(0)
    clock.advance(1)
    expect(el.currentTime).toBe(1.25)
  })

  it('zeichnet das dekodierte Bild zur virtuellen Zeit statt des Elements', async () => {
    const el = video()
    const { clock, frameAt, createFrameSource } = setup()
    clock.adopt([el as unknown as HTMLVideoElement])
    void el.play()
    clock.advance(0.5)
    await clock.settle()

    const ctx = new FakeContext2D()
    ctx.drawImage(el)
    ctx.drawImage('kein-video')
    expect(frameAt).toHaveBeenLastCalledWith(0.5)
    expect(ctx.drawn).toEqual([{ frame: 0.5 }, 'kein-video'])
    expect(createFrameSource).toHaveBeenCalledTimes(1)

    clock.advance(0.5)
    await clock.settle()
    expect(createFrameSource).toHaveBeenCalledTimes(1)
    expect(frameAt).toHaveBeenLastCalledWith(1)
  })

  it('wartet vor dem Frame auf ein neu ladendes Video (z. B. Marker-Video)', async () => {
    const { clock } = setup()
    const el = new FakeVideo()
    el.src = 'blob:marker'
    let readyCallbackRan = false
    el.addEventListener('loadeddata', () => {
      // wie loadMarkerVideo → setBackgroundVideoWithDefaults
      el.currentTime = 0
      void el.play()
      readyCallbackRan = true
    })
    setTimeout(() => {
      el.readyState = 4
      el.dispatchEvent(new Event('loadeddata'))
    }, 5)

    await clock.settle()
    expect(readyCallbackRan).toBe(true)
    expect(clock.videos().map((v) => v.element)).toContain(el)
    expect(el.paused).toBe(false)
  })

  it('restore: Patches weg, echtes Element am virtuellen Stand, laufende spielen weiter', async () => {
    const el = video({ loop: true })
    const { clock, close } = setup()
    clock.adopt([el as unknown as HTMLVideoElement])
    void el.play()
    clock.advance(1.5)
    await clock.settle()
    clock.restore()

    expect(Object.prototype.hasOwnProperty.call(FakeVideo.prototype, 'play')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(FakeContext2D.prototype, 'drawImage')).toBe(true)
    expect(el._time).toBe(1.5)
    expect(el.realPlays).toBe(1)
    expect(el.paused).toBe(false)
    await Promise.resolve()
    expect(close).toHaveBeenCalled()
    const ctx = new FakeContext2D()
    ctx.drawImage(el)
    expect(ctx.drawn).toEqual([el])
  })
})
