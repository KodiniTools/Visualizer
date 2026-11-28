import { describe, it, expect, vi } from 'vitest'
import {
  createOfflineVideoAudio,
  isVideoAudible,
} from '../../../lib/offlineExport/offlineVideoAudio'
import type { VirtualVideo } from '../../../lib/offlineExport/offlineMediaClock'
import { createFakeContextFactory, fakeBuffer } from './fakeOfflineContext'

const element = (props: Partial<HTMLVideoElement> = {}) =>
  ({
    muted: false,
    volume: 1,
    playbackRate: 1,
    currentSrc: 'blob:clip',
    src: 'blob:clip',
    ...props,
  }) as HTMLVideoElement

const state = (el: HTMLVideoElement, time: number, playing = true): VirtualVideo => ({
  element: el,
  playing,
  ended: false,
  time,
})

function setup(buffer: AudioBuffer | null = fakeBuffer(4, 'clip')) {
  const log: string[] = []
  const { factory } = createFakeContextFactory(log)
  const context = factory(2, 48000, 48000)
  const destination = context.destination
  const decode = vi.fn(async () => buffer)
  const audio = createOfflineVideoAudio({ context, destination, decode })
  return { audio, log, decode }
}

describe('isVideoAudible', () => {
  it('nur laufend, nicht stumm, Lautstärke > 0', () => {
    expect(isVideoAudible(state(element(), 0))).toBe(true)
    expect(isVideoAudible(state(element(), 0, false))).toBe(false)
    expect(isVideoAudible(state(element({ muted: true }), 0))).toBe(false)
    expect(isVideoAudible(state(element({ volume: 0 }), 0))).toBe(false)
  })
})

describe('createOfflineVideoAudio', () => {
  it('startet den Ton ab der Video-Position und lässt ihn bei gleichmäßigem Lauf weiterlaufen', async () => {
    const { audio, log, decode } = setup()
    const el = element({ volume: 0.5 })
    await audio.update(1, [state(el, 0.25)])
    await audio.update(1.5, [state(el, 0.75)])
    expect(log).toEqual(['start 1 0.25'])
    expect(decode).toHaveBeenCalledTimes(1)
  })

  it('Seek/Schleife, Pause und Lautstärke ändern den Ton zur Frame-Zeit', async () => {
    const { audio, log } = setup()
    const el = element()
    await audio.update(0, [state(el, 0)])
    await audio.update(2, [state(el, 0)]) // Schleife bzw. Seek zurück
    ;(el as { volume: number }).volume = 0.3
    await audio.update(2.5, [state(el, 0.5)])
    await audio.update(3, [state(el, 1, false)]) // Pause
    expect(log).toEqual(['start 0 0', 'stop 2', 'start 2 0', 'gain.set 0.3@2.5', 'stop 3'])
  })

  it('Video ohne Ton oder hinter dem Ende der Tonspur bleibt still', async () => {
    const silent = setup(null)
    await silent.audio.update(0, [state(element(), 0)])
    expect(silent.log).toEqual([])

    const short = setup(fakeBuffer(1))
    await short.audio.update(0, [state(element(), 2)])
    expect(short.log).toEqual([])
  })
})
