import { describe, it, expect } from 'vitest'
import {
  buildOfflineMix,
  clipLength,
  duckChanges,
  DUCK_TIME_CONSTANT,
} from '../../../lib/offlineExport/offlineAudioMix'
import { createFakeContextFactory, fakeBuffer } from './fakeOfflineContext'
import type { FakeNode } from './fakeOfflineContext'

const clip = (start: number, duration: number, duck: number | null, offset = 0) => ({
  buffer: fakeBuffer(duration),
  start,
  offset,
  volume: 0.5,
  duck,
})

describe('duckChanges', () => {
  it('senkt den Song nur, solange ein Track mit Ducking läuft (niedrigster Wert)', () => {
    expect(
      duckChanges([clip(2, 4, 0.3), clip(3, 2, 0.1), clip(10, 1, null), clip(7, 1, 0.5, 0)]),
    ).toEqual([
      { time: 2, level: 0.3 },
      { time: 3, level: 0.1 },
      { time: 5, level: 0.3 },
      { time: 6, level: 1 },
      { time: 7, level: 0.5 },
      { time: 8, level: 1 },
    ])
  })

  it('berücksichtigt die Startposition im Track und ignoriert leere Clips', () => {
    expect(clipLength(clip(0, 5, 0.2, 3))).toBe(2)
    expect(duckChanges([clip(1, 5, 0.2, 3), clip(0, 2, 0.4, 2)])).toEqual([
      { time: 1, level: 0.2 },
      { time: 3, level: 1 },
    ])
    expect(duckChanges([])).toEqual([])
  })
})

describe('buildOfflineMix', () => {
  const find = (nodes: FakeNode[], kind: string) => nodes.filter((n) => n.kind === kind)

  it('baut die Kette der Live-Engine nach (Ducking → Bass → Höhen, Analyse vor dem EQ)', () => {
    const log: string[] = []
    const { factory, contexts } = createFakeContextFactory(log)
    const main = fakeBuffer(10, 'main')
    const mix = buildOfflineMix(
      {
        main,
        overlays: [clip(2, 3, 0.25), clip(20, 3, null)],
        bassDb: 6,
        trebleDb: -3,
        analysePlayer: true,
        duration: 10,
        sampleRate: 48000,
      },
      factory,
    )
    const ctx = contexts[0]!
    expect(ctx.channels).toBe(2)
    expect(ctx.length).toBe(480000)
    expect(mix.length).toBe(480000)

    const [bass, treble] = find(ctx.nodes, 'biquad')
    expect(bass).toMatchObject({ type: 'lowshelf', frequency: { value: 200 }, gain: { value: 6 } })
    expect(treble).toMatchObject({
      type: 'highshelf',
      frequency: { value: 3000 },
      gain: { value: -3 },
    })
    expect(bass!.connections).toEqual([treble])
    expect(treble!.connections).toEqual([ctx.nodes[0]]) // destination

    const analyser = find(ctx.nodes, 'analyser')[0]!
    expect(mix.analyser).toBe(analyser)
    expect(analyser.fftSize).toBe(2048)

    // Haupt-Track: Ducking-Gain → Bass, und direkt in den Analyse-Gain
    const [mainSource, overlaySource] = find(ctx.nodes, 'source')
    expect(mainSource!.buffer).toBe(main)
    const duck = mainSource!.connections[0]!
    const analysisGain = mainSource!.connections[1]!
    expect(duck.connections).toEqual([bass])
    expect(analysisGain.connections).toEqual([analyser])
    expect((analysisGain.gain as { value: number }).value).toBe(1)

    // Marker-Track: Lautstärke → Bass + Analyse; Start mit Offset
    const overlayGain = overlaySource!.connections[0]!
    expect((overlayGain.gain as { value: number }).value).toBe(0.5)
    expect(overlayGain.connections).toEqual([bass, analysisGain])
    expect(log).toContain('start 0 0')
    expect(log).toContain('start 2 0')
    // Track nach dem Ende des Songs wird nicht eingeplant
    expect(find(ctx.nodes, 'source')).toHaveLength(2)
    // Ducking-Automation
    expect(log).toContain(`gain.target 0.25@2/${DUCK_TIME_CONSTANT}`)
    expect(log).toContain(`gain.target 1@5/${DUCK_TIME_CONSTANT}`)
  })

  it('Analyse-Quelle „Video“: Player geht nicht in den Analyser', () => {
    const { factory, contexts } = createFakeContextFactory()
    buildOfflineMix(
      {
        main: fakeBuffer(1),
        overlays: [],
        bassDb: Number.NaN,
        trebleDb: 0,
        analysePlayer: false,
        duration: 1,
        sampleRate: 48000,
      },
      factory,
    )
    const ctx = contexts[0]!
    const mainSource = find(ctx.nodes, 'source')[0]!
    expect((mainSource.connections[1]!.gain as { value: number }).value).toBe(0)
    expect((find(ctx.nodes, 'biquad')[0]!.gain as { value: number }).value).toBe(0)
  })
})
