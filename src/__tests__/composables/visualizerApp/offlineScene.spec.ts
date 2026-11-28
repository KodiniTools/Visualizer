import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import {
  collectSceneVideos,
  createOfflineScene,
} from '../../../composables/visualizerApp/offlineScene'
import type { CanvasManagerRef } from '../../../composables/types'

const v = (name: string) => ({ name }) as unknown as HTMLVideoElement

describe('collectSceneVideos', () => {
  it('sammelt Hintergrund-, Workspace-, Canvas- und Kachel-Videos ohne Doppelte', () => {
    const bg = v('bg')
    const ws = v('ws')
    const canvas = v('canvas')
    const tile = v('tile')
    expect(
      collectSceneVideos({
        canvasManager: {
          videoBackground: { videoElement: bg },
          workspaceVideoBackground: { videoElement: ws },
        },
        videoManager: {
          videos: [{ videoElement: canvas }, { videoElement: null }, { videoElement: bg }],
        },
        tiles: [{ video: tile }, { video: null }, {}],
      }),
    ).toEqual([bg, ws, canvas, tile])
  })

  it('ohne Quellen: leer', () => {
    expect(collectSceneVideos({})).toEqual([])
    expect(collectSceneVideos({ canvasManager: null, videoManager: null, tiles: null })).toEqual([])
  })
})

describe('createOfflineScene', () => {
  it('reicht die Videos der App durch (ohne Quelle: leer)', () => {
    const renderLoop = { beginOffline: vi.fn(), renderOfflineFrame: vi.fn(), endOffline: vi.fn() }
    const deps = {
      renderLoop,
      canvasRef: ref(null),
      canvasManagerInstance: ref(null) as unknown as CanvasManagerRef,
    }
    const clip = v('clip')
    expect(createOfflineScene({ ...deps, videos: () => [clip] }).videos?.()).toEqual([clip])
    expect(createOfflineScene(deps).videos?.()).toEqual([])
  })
})
