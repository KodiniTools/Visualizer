import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePlayerStore } from '../../stores/playerStore'
import { stub } from '../helpers/canvasStubs'

let store: ReturnType<typeof usePlayerStore>
let audio: { currentTime: number; paused: boolean; pause: () => void; play: () => Promise<void> }

beforeEach(() => {
  setActivePinia(createPinia())
  store = usePlayerStore()
  audio = {
    currentTime: 42,
    paused: false,
    pause: vi.fn(() => {
      audio.paused = true
    }),
    play: vi.fn(async () => {}),
  }
  store.audioRef = stub(audio)
  store.playlist = [{ name: 'a.wav', url: 'blob:a' }]
})

describe('playerStore Offline-Wiedergabe (Export)', () => {
  it('läuft stumm ab 0 s: Audio angehalten, isPlaying true, Position vom Export', () => {
    store.beginOfflinePlayback()
    expect(audio.pause).toHaveBeenCalled()
    expect(store.offlinePlayback).toBe(true)
    expect(store.isPlaying).toBe(true)
    expect(store.currentTime).toBe(0)

    store.setOfflinePosition(1.25)
    expect(store.currentTime).toBe(1.25)
    expect(store.getPreciseTime()).toBe(1.25)
    // Kein Seek des Audio-Elements pro Frame (Tempo); gespult wird erst am Ende
    expect(audio.currentTime).toBe(42)

    const listener = vi.fn()
    store.onFrame(listener)
    store.notifyFrame()
    expect(listener).toHaveBeenCalledWith(1.25)
  })

  it('ignoriert Bedienung und Events des Audio-Elements während des Exports', () => {
    store.beginOfflinePlayback()
    store.togglePlayPause()
    store.seekTo(10)
    store.nextTrack()
    expect(audio.play).not.toHaveBeenCalled()
    expect(store.currentTime).toBe(0)
    expect(store.isPlaying).toBe(true)
  })

  it('endet angehalten an der vorherigen Position', () => {
    store.beginOfflinePlayback()
    store.setOfflinePosition(3)
    store.endOfflinePlayback(7.5)
    expect(store.offlinePlayback).toBe(false)
    expect(store.isPlaying).toBe(false)
    expect(store.currentTime).toBe(7.5)
    expect(audio.currentTime).toBe(7.5)
    expect(store.getPreciseTime()).toBe(7.5)
  })

  it('setOfflinePosition und endOfflinePlayback wirken außerhalb des Exports nicht', () => {
    store.setOfflinePosition(5)
    expect(store.currentTime).toBe(0)
    store.isPlaying = true
    store.endOfflinePlayback(9)
    expect(store.isPlaying).toBe(true)
    expect(audio.currentTime).toBe(42)
  })
})
