/**
 * Audio-Einstellungen dauerhaft speichern: Wiedergabe-Modus, gewähltes
 * Mikrofon, Canvas-Audio-Effekte und Beat-Drop überstehen einen Neustart.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '../../stores/playerStore.js'
import { useAudioSourceStore } from '../../stores/audioSourceStore.js'
import { useAudioFxStore } from '../../stores/audioFxStore.js'
import { useBeatDropStore } from '../../stores/beatDropStore.js'
import {
  setupAudioSettingsPersistence,
  AUDIO_STORAGE_KEYS,
} from '../../lib/audioSettingsPersistence.js'
import { setupStorePersistence } from '../../lib/storePersistence.js'

let persistence
function restart() {
  persistence?.stop()
  setActivePinia(createPinia())
  const stores = {
    playerStore: usePlayerStore(),
    audioSourceStore: useAudioSourceStore(),
    audioFxStore: useAudioFxStore(),
    beatDropStore: useBeatDropStore(),
  }
  persistence = setupAudioSettingsPersistence(stores)
  return stores
}
const saved = (k) => JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEYS[k]))

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  localStorage.clear()
})
afterEach(() => {
  persistence?.stop()
  persistence = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Audio-Einstellungen – dauerhaft speichern', () => {
  it('ohne gespeicherte Werte: Standard, nichts geschrieben', () => {
    const s = restart()
    expect(s.playerStore.playMode).toBe('none')
    expect(s.audioFxStore.enabled).toBe(false)
    expect(Object.values(AUDIO_STORAGE_KEYS).map((k) => localStorage.getItem(k))).toEqual([
      null,
      null,
      null,
      null,
    ])
  })

  it('Wiedergabe-Modus, Mikrofon, Audio-FX und Beat-Drop überstehen einen Neustart', async () => {
    let s = restart()
    s.playerStore.playMode = 'shuffle'
    s.audioSourceStore.selectedDeviceId = 'mic-42'
    s.audioFxStore.enabled = true
    s.audioFxStore.glowColor = '#ff00aa'
    s.audioFxStore.pulseStrength = 77
    s.beatDropStore.enabled = true
    s.beatDropStore.source = 'mid'
    s.beatDropStore.strobeRate = 12
    await nextTick()
    vi.advanceTimersByTime(500)

    s = restart()
    expect(s.playerStore.playMode).toBe('shuffle')
    expect(s.audioSourceStore.selectedDeviceId).toBe('mic-42')
    expect(s.audioFxStore.enabled).toBe(true)
    expect(s.audioFxStore.glowColor).toBe('#ff00aa')
    expect(s.audioFxStore.pulseStrength).toBe(77)
    expect(s.beatDropStore.enabled).toBe(true)
    expect(s.beatDropStore.source).toBe('mid')
    expect(s.beatDropStore.strobeRate).toBe(12)
  })

  it('Laufzeitwerte werden nicht gespeichert (Wiedergabezeit, Stumm, Mikrofon an/aus)', async () => {
    const s = restart()
    s.playerStore.playMode = 'sequence'
    s.playerStore.currentTime = 42
    s.playerStore.isMuted = true
    s.audioSourceStore.isMicrophoneActive = true
    await nextTick()
    vi.advanceTimersByTime(500)
    expect(saved('player')).toEqual({ playMode: 'sequence' })
    expect(localStorage.getItem(AUDIO_STORAGE_KEYS.audioInput)).toBeNull() // Mikrofon an/aus zählt nicht
  })

  it('Wiedergabezeit allein löst kein Speichern aus', async () => {
    const s = restart()
    s.playerStore.currentTime = 10
    s.playerStore.currentTime = 11
    await nextTick()
    vi.advanceTimersByTime(500)
    expect(localStorage.getItem(AUDIO_STORAGE_KEYS.player)).toBeNull()
  })

  it('ungültige Werte werden verworfen', () => {
    localStorage.setItem(AUDIO_STORAGE_KEYS.player, JSON.stringify({ playMode: 'endlos' }))
    localStorage.setItem(AUDIO_STORAGE_KEYS.audioInput, JSON.stringify({ selectedDeviceId: '' }))
    localStorage.setItem(
      AUDIO_STORAGE_KEYS.audioFx,
      JSON.stringify({ enabled: 'ja', pulseStrength: 55, unbekannt: 1 }),
    )
    localStorage.setItem(AUDIO_STORAGE_KEYS.beatDrop, '{kaputt')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const s = restart()
    expect(s.playerStore.playMode).toBe('none')
    expect(s.audioSourceStore.selectedDeviceId).toBe('default')
    expect(s.audioFxStore.enabled).toBe(false)
    expect(s.audioFxStore.pulseStrength).toBe(55)
    expect(s.audioFxStore.unbekannt).toBeUndefined()
    expect(s.beatDropStore.enabled).toBe(false)
  })

  it('ausstehende Änderung wird beim Beenden gespeichert', async () => {
    const s = restart()
    s.beatDropStore.flashColor = '#123456'
    await nextTick()
    persistence.stop()
    persistence = null
    expect(saved('beatDrop').flashColor).toBe('#123456')
  })
})

describe('setupStorePersistence – Speicher voll', () => {
  it('kein Absturz, Werte im Store bleiben', async () => {
    setActivePinia(createPinia())
    const store = useBeatDropStore()
    const p = setupStorePersistence(store, { storageKey: 'x-test' })
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      store.enabled = true
      await nextTick()
      expect(() => vi.advanceTimersByTime(500)).not.toThrow()
      expect(store.enabled).toBe(true)
    } finally {
      Storage.prototype.setItem = orig
      p.stop()
    }
  })
})
