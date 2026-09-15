import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '../../stores/playerStore.js'

let store

beforeEach(() => {
  setActivePinia(createPinia())
  store = usePlayerStore()
})

describe('playerStore Frame-Takt', () => {
  it('getPreciseTime liest das Audio-Element, sonst currentTime', () => {
    store.currentTime = 3.5
    expect(store.getPreciseTime()).toBe(3.5)
    store.audioRef = { currentTime: 12.345 }
    expect(store.getPreciseTime()).toBe(12.345)
    store.audioRef = { currentTime: NaN }
    expect(store.getPreciseTime()).toBe(3.5)
  })

  it('benachrichtigt Listener nur während der Wiedergabe mit der präzisen Zeit', () => {
    const listener = vi.fn()
    store.onFrame(listener)
    store.audioRef = { currentTime: 7.891 }

    store.notifyFrame()
    expect(listener).not.toHaveBeenCalled()

    store.isPlaying = true
    store.notifyFrame()
    expect(listener).toHaveBeenCalledWith(7.891)
  })

  it('erlaubt das Abmelden und isoliert Fehler einzelner Listener', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = vi.fn(() => {
      throw new Error('boom')
    })
    const ok = vi.fn()
    const off = store.onFrame(failing)
    store.onFrame(ok)
    store.isPlaying = true
    store.audioRef = { currentTime: 1 }

    store.notifyFrame()
    expect(ok).toHaveBeenCalledTimes(1)

    off()
    store.notifyFrame()
    expect(failing).toHaveBeenCalledTimes(1)
    expect(ok).toHaveBeenCalledTimes(2)
    errorSpy.mockRestore()
  })
})
