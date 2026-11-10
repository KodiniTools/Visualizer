/** Analyse-Eingang (Player / Video / Mix) im Audio-Quellen-Store. */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAudioSourceStore } from '../../stores/audioSourceStore'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('audioSourceStore – analysisInput', () => {
  it('startet mit dem Player', () => {
    expect(useAudioSourceStore().analysisInput).toBe('player')
  })

  it('übernimmt gültige Werte und ignoriert unbekannte', () => {
    const store = useAudioSourceStore()
    store.setAnalysisInput('video')
    expect(store.analysisInput).toBe('video')
    store.setAnalysisInput('mix')
    expect(store.analysisInput).toBe('mix')
    store.setAnalysisInput('radio')
    expect(store.analysisInput).toBe('mix')
    expect(console.warn).toHaveBeenCalled()
  })

  it('reset() stellt den Player wieder her', () => {
    const store = useAudioSourceStore()
    store.setAnalysisInput('video')
    store.reset()
    expect(store.analysisInput).toBe('player')
  })
})
