// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../lib/workerManager.js', () => ({
  workerManager: {
    initAll: vi.fn(),
    analyzeAudio: vi.fn(),
    onAudioData: vi.fn(),
    terminate: vi.fn(),
  },
}))

import { useGlobalAudioData } from '../../composables/useGlobalAudioData.js'
import { getAudioAnalysisData } from '../../lib/audio/audioAnalysisData.js'

/**
 * Verhaltenstest: Der globale Audio-Datensatz (Pegel, Glättung, Beat, Onsets)
 * wird pro Frame in dasselbe Objekt geschrieben, das alle Leser sehen.
 * Geprüft über getAudioAnalysisData().
 */
describe('useGlobalAudioData – globaler Audio-Datensatz', () => {
  it('stellt das Objekt beim Import mit allen Feldern auf 0 bereit (ohne window-Global)', () => {
    expect(window.audioAnalysisData).toBeUndefined()
    const d = getAudioAnalysisData()
    expect(Object.keys(d).sort()).toEqual(
      [
        'bass',
        'mid',
        'treble',
        'volume',
        'smoothBass',
        'smoothMid',
        'smoothTreble',
        'smoothVolume',
        'isBeat',
        'beatIntensity',
        'bpm',
        'beatConfidence',
        'onsetBass',
        'onsetMid',
        'onsetTreble',
        'onsetAll',
      ].sort(),
    )
  })

  it('applyAudioData schreibt Pegel, Worker-Glättung und Beat in dasselbe Objekt', () => {
    const before = getAudioAnalysisData()
    const { applyAudioData } = useGlobalAudioData()
    applyAudioData({
      bass: 200,
      mid: 100,
      treble: 50,
      volume: 150,
      smoothBass: 180,
      smoothMid: 90,
      smoothTreble: 40,
      smoothVolume: 140,
      isBeat: true,
      beatIntensity: 0.7,
      bpm: 120,
      beatConfidence: 0.9,
    })
    const d = getAudioAnalysisData()
    expect(d).toBe(before)
    expect([d.bass, d.mid, d.treble, d.volume]).toEqual([200, 100, 50, 150])
    expect([d.smoothBass, d.smoothMid, d.smoothTreble, d.smoothVolume]).toEqual([180, 90, 40, 140])
    expect([d.isBeat, d.beatIntensity, d.bpm, d.beatConfidence]).toEqual([true, 0.7, 120, 0.9])
    for (const k of ['onsetBass', 'onsetMid', 'onsetTreble', 'onsetAll']) {
      expect(typeof d[k]).toBe('number')
    }
  })

  it('ohne Worker-Glättung: eigene Glättung (0.4 / Höhen 0.5), Beat bleibt', () => {
    const { applyAudioData } = useGlobalAudioData()
    applyAudioData({
      bass: 0,
      mid: 0,
      treble: 0,
      volume: 0,
      smoothBass: 0,
      smoothMid: 0,
      smoothTreble: 0,
      smoothVolume: 0,
      isBeat: false,
    })
    applyAudioData({ bass: 100, mid: 50, treble: 200, volume: 80 })
    const d = getAudioAnalysisData()
    expect([d.smoothBass, d.smoothMid, d.smoothTreble, d.smoothVolume]).toEqual([40, 20, 100, 32])
    expect(d.isBeat).toBe(false)
  })

  it('Fallback-Analyse (ohne Worker) füllt die Pegel aus dem Spektrum', () => {
    const { updateGlobalAudioData } = useGlobalAudioData()
    const arr = new Uint8Array(1024).fill(100)
    updateGlobalAudioData(arr, 1024)
    const d = getAudioAnalysisData()
    expect(d.bass).toBe(150)
    expect(d.mid).toBe(200)
    expect(d.treble).toBe(255)
    expect(d.volume).toBe(150)
  })
})
