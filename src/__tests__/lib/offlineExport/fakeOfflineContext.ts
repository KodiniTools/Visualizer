// Attrappe eines OfflineAudioContext für die Offline-Export-Specs:
// protokolliert Knoten/Verbindungen und spielt suspend()/resume() in
// Zeitreihenfolge nach.
import type { OfflineMixContext } from '../../../lib/offlineExport/offlineAudioMix'

export interface FakeNode {
  kind: string
  connections: FakeNode[]
  connect: (target: FakeNode) => void
  [key: string]: unknown
}

export interface FakeContext {
  channels: number
  length: number
  sampleRate: number
  nodes: FakeNode[]
  suspendTimes: number[]
  /** Zeit des aktuell angehaltenen Zeitpunkts (Analyser liest sie) */
  now: number
  rendered: { tag: string }
}

function param(log: string[], name: string) {
  return {
    value: 0,
    setTargetAtTime: (v: number, t: number, c: number) => log.push(`${name}.target ${v}@${t}/${c}`),
  }
}

export function createFakeContextFactory(log: string[] = []) {
  const contexts: FakeContext[] = []
  const factory = (channels: number, length: number, sampleRate: number) => {
    const state: FakeContext = {
      channels,
      length,
      sampleRate,
      nodes: [],
      suspendTimes: [],
      now: 0,
      rendered: { tag: 'rendered' },
    }
    contexts.push(state)
    const node = (kind: string, extra: Record<string, unknown> = {}): FakeNode => {
      const n: FakeNode = {
        kind,
        connections: [],
        connect(target) {
          n.connections.push(target)
        },
        ...extra,
      }
      state.nodes.push(n)
      return n
    }
    const destination = node('destination')
    const pending = new Map<number, () => void>()
    let resumeWaiter: (() => void) | null = null

    const ctx = {
      destination,
      createBufferSource: () =>
        node('source', {
          buffer: null,
          start: (when = 0, offset = 0) => log.push(`start ${when} ${offset}`),
        }),
      createGain: () => node('gain', { gain: param(log, 'gain') }),
      createBiquadFilter: () =>
        node('biquad', { type: '', frequency: { value: 0 }, gain: { value: 0 } }),
      createAnalyser: () =>
        node('analyser', {
          fftSize: 0,
          frequencyBinCount: 4,
          getByteFrequencyData: (arr: Uint8Array) => arr.fill(Math.round(state.now * 10)),
          getByteTimeDomainData: (arr: Uint8Array) => arr.fill(128),
        }),
      suspend(time: number) {
        if (pending.has(time) || time <= state.now - 1e-9) {
          return Promise.reject(new Error(`invalid suspend ${time}`))
        }
        state.suspendTimes.push(time)
        return new Promise<void>((resolve) => pending.set(time, resolve))
      },
      resume() {
        const w = resumeWaiter
        resumeWaiter = null
        w?.()
        return Promise.resolve()
      },
      async startRendering() {
        // Bis keine Haltepunkte mehr anstehen: frühesten auslösen, auf resume() warten
        for (;;) {
          await Promise.resolve()
          const times = [...pending.keys()].sort((a, b) => a - b)
          if (times.length === 0) break
          const t = times[0] as number
          const resolve = pending.get(t) as () => void
          pending.delete(t)
          state.now = t
          const resumed = new Promise<void>((r) => (resumeWaiter = r))
          resolve()
          await resumed
        }
        return state.rendered as unknown as AudioBuffer
      },
    }
    return ctx as unknown as OfflineMixContext
  }
  return { factory, contexts }
}

/** AudioBuffer-Attrappe mit Dauer */
export const fakeBuffer = (duration: number, tag = 'buf') =>
  ({ duration, tag }) as unknown as AudioBuffer
