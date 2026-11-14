/** Canvas-Videos hinter oder vor dem Visualizer zeichnen (wie Bilder). */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { stub } from '../helpers/canvasStubs'
import { VideoManager, type VideoObject } from '../../lib/videoManager'
import { ref } from 'vue'
import { createSceneRenderer, type SceneEffects } from '../../composables/renderLoop/sceneRenderer'

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

describe('Szene – Ebene folgt dem Schalter in jedem Frame', () => {
  /** Ein Live-Frame: Reihenfolge von Videos und Visualizer */
  function frame() {
    drawn = []
    const scene = createSceneRenderer({
      canvasRef: ref(null),
      canvasManagerInstance: ref(null),
      multiImageManagerInstance: ref(null),
      videoManagerInstance: ref(mgr),
      getTextManager: () => null,
      drawWithPunch: (cb, ctx, w, h) => cb?.(ctx, w, h),
      effects: stub<SceneEffects>({}),
    })
    const ctx = stub<CanvasRenderingContext2D>({ canvas: CANVAS, fillRect: () => {} })
    scene.renderScene(ctx, 1000, 500, () => void drawn.push('VIZ'))
    return drawn
  }

  it('beliebig oft umschalten – auch während der Wiedergabe und für Marker-Videos', () => {
    const placed = add('placed')
    const marker = add('marker')
    placed.isPlaying = true
    // Marker-Video: bis zum Marker ausgeblendet, dann eingeblendet
    mgr.setMarkerHidden(marker.id, true)
    expect(frame()).toEqual(['VIZ', 'placed'])

    for (const behind of [true, false, true, false, true]) {
      placed.fotoSettings!.renderBehindVisualizer = behind
      marker.fotoSettings!.renderBehindVisualizer = behind
      mgr.setMarkerHidden(marker.id, false)
      expect(frame()).toEqual(behind ? ['placed', 'marker', 'VIZ'] : ['VIZ', 'placed', 'marker'])
    }
  })

  it('Video ohne fotoSettings liegt vor dem Visualizer (kein Absturz)', () => {
    const v = add('bare')
    delete (v as { fotoSettings?: unknown }).fotoSettings
    expect(frame()).toEqual(['VIZ', 'bare'])
  })
})
