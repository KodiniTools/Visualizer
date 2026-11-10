/** Canvas-Videos hinter oder vor dem Visualizer zeichnen (wie Bilder). */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { stub } from '../helpers/canvasStubs'
import { VideoManager, type VideoObject } from '../../lib/videoManager'

class FakeVideo extends EventTarget {
  readyState = 4
  videoWidth = 640
  videoHeight = 360
  duration = 6
  currentTime = 0
  paused = true
  loop = true
  muted = true
  playbackRate = 1
  crossOrigin = ''
  src = 'blob:video'
  load() {}
  play() {
    this.paused = false
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
}

const CANVAS = stub<HTMLCanvasElement>({ width: 1000, height: 500 })
let mgr: VideoManager
let drawn: VideoObject['name'][]

function add(name: string, renderBehindVisualizer?: boolean) {
  return mgr.addVideo(new FakeVideo() as unknown as HTMLVideoElement, {
    name,
    renderBehindVisualizer,
  }) as VideoObject
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  mgr = new VideoManager(CANVAS)
  drawn = []
  mgr._drawSingleVideo = (_ctx, video) => void drawn.push(video.name)
})

describe('VideoManager – hinter dem Visualizer', () => {
  it('addVideo übernimmt die Option in fotoSettings (Standard: davor)', () => {
    expect(add('a').fotoSettings?.renderBehindVisualizer).toBeFalsy()
    expect(add('b', true).fotoSettings?.renderBehindVisualizer).toBe(true)
  })

  it('drawVideos filtert nach Ebene; ohne Option werden alle gezeichnet', () => {
    add('front')
    add('behind', true)
    const ctx = stub<CanvasRenderingContext2D>({ canvas: CANVAS })

    mgr.drawVideos(ctx, { behindVisualizer: true })
    expect(drawn).toEqual(['behind'])

    drawn = []
    mgr.drawVideos(ctx, { behindVisualizer: false })
    expect(drawn).toEqual(['front'])

    drawn = []
    mgr.drawVideos(ctx)
    expect(drawn).toEqual(['front', 'behind'])
  })

  it('Audio-Synchronisation läuft nur einmal pro Frame', () => {
    add('a')
    const sync = vi.fn()
    mgr.syncAllVideosToAudio = sync
    mgr.syncWithAudio = true
    mgr.audioElement = stub<HTMLAudioElement>({ paused: false })
    const ctx = stub<CanvasRenderingContext2D>({ canvas: CANVAS })
    mgr.drawVideos(ctx, { behindVisualizer: true })
    mgr.drawVideos(ctx, { behindVisualizer: false })
    expect(sync).toHaveBeenCalledTimes(1)
  })
})
