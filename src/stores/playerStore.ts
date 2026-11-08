import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface PlaylistTrack {
  name: string
  /** Object-URL der Audiodatei */
  url: string
}

export type PlayMode = 'none' | 'sequence' | 'repeat-one' | 'repeat-all' | 'shuffle'

/** Eintrag aus IndexedDB (geteilte Dateien); blob kann auch Rohdaten sein. */
export interface BlobTrackRecord {
  name: string
  blob: Blob | BlobPart
  mimeType?: string
}

export type FrameListener = (time: number) => void

/** play() wurde durch pause() unterbrochen – erwartbar, kein Fehler */
const isAbortError = (error: unknown) => (error as { name?: string } | null)?.name === 'AbortError'

export const usePlayerStore = defineStore('player', () => {
  // === STATE (Die Daten des Players) ===
  const playlist = ref<PlaylistTrack[]>([])
  const currentTrackIndex = ref(0)
  const isPlaying = ref(false)
  const audioRef = ref<HTMLAudioElement | null>(null)

  // Progress-Tracking direkt im Store
  const currentTime = ref(0)
  const duration = ref(0)

  // Playlist-Modus: 'none' | 'sequence' | 'repeat-one' | 'repeat-all' | 'shuffle'
  const playMode = ref<PlayMode>('none')

  // Stumm: nur die Lautsprecher-Ausgabe (useAudioEngine) – Visualizer-Analyse
  // und Aufnahme laufen weiter, die eingestellte Lautstärke bleibt erhalten
  const isMuted = ref(false)

  // === GETTERS (Abgeleitete Daten, wie computed) ===
  const hasTracks = computed(() => playlist.value.length > 0)
  const currentTrack = computed(() =>
    hasTracks.value ? (playlist.value[currentTrackIndex.value] ?? null) : null,
  )

  // Progress-Percentage berechnen
  const progressPercentage = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })

  // === ACTIONS (Die Funktionen, die den Zustand ändern) ===

  /**
   * Diese Funktion wird einmal von App.vue aufgerufen, um dem Store das Audio-Element zu geben.
   * Sie richtet auch ALLE Event Listener ein.
   */
  function setAudioRef(element: HTMLAudioElement | null) {
    // Falls bereits ein audioRef existiert, cleanup alte Listener
    if (audioRef.value) {
      removeAllListeners(audioRef.value)
    }

    audioRef.value = element

    // Event Listener hinzufügen
    if (audioRef.value) {
      addAllListeners(audioRef.value)
      console.log('[PlayerStore] Audio element connected and listeners added')

      // Falls Tracks bereits geladen wurden bevor das Audio-Element verfügbar war,
      // jetzt den aktuellen Track laden (behebt Timing-Problem mit shared files)
      if (hasTracks.value) {
        console.log('[PlayerStore] Tracks already in playlist - loading current track now')
        loadTrack(currentTrackIndex.value)
      }
    }
  }

  /**
   * Fügt alle benötigten Event Listener zum Audio-Element hinzu
   */
  function addAllListeners(audio: HTMLAudioElement) {
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('durationchange', handleDurationChange)
  }

  /**
   * Entfernt alle Event Listener vom Audio-Element
   */
  function removeAllListeners(audio: HTMLAudioElement) {
    audio.removeEventListener('play', handlePlay)
    audio.removeEventListener('pause', handlePause)
    audio.removeEventListener('ended', handleEnded)
    audio.removeEventListener('timeupdate', handleTimeUpdate)
    audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    audio.removeEventListener('durationchange', handleDurationChange)
  }

  // === EVENT HANDLERS ===

  function handlePlay() {
    isPlaying.value = true
    console.log('[PlayerStore] Playing')
  }

  function handlePause() {
    isPlaying.value = false
    console.log('[PlayerStore] Paused')
  }

  function handleEnded() {
    isPlaying.value = false
    console.log('[PlayerStore] Track ended, playMode:', playMode.value)

    if (!hasTracks.value) return

    if (playMode.value === 'repeat-one') {
      // Selben Track neu starten
      if (audioRef.value) {
        audioRef.value.currentTime = 0
        audioRef.value.play().catch(() => {})
      }
    } else if (playMode.value === 'sequence') {
      // Nächster Track, aber am Ende stoppen
      if (currentTrackIndex.value < playlist.value.length - 1) {
        _playNext(currentTrackIndex.value + 1)
      }
    } else if (playMode.value === 'repeat-all') {
      // Nächster Track, am Ende wieder von vorne
      const next = (currentTrackIndex.value + 1) % playlist.value.length
      _playNext(next)
    } else if (playMode.value === 'shuffle') {
      // Zufälliger Track (nicht der aktuelle)
      if (playlist.value.length > 1) {
        let next: number
        do {
          next = Math.floor(Math.random() * playlist.value.length)
        } while (next === currentTrackIndex.value)
        _playNext(next)
      }
    }
    // playMode === 'none': kein Autoplay
  }

  function _playNext(index: number) {
    loadTrack(index)
    if (!audioRef.value) return

    const audio = audioRef.value
    audio.addEventListener(
      'canplay',
      () => {
        audio.play().catch((err: unknown) => {
          if (!isAbortError(err)) console.error('[PlayerStore] Autoplay error:', err)
          isPlaying.value = false
        })
      },
      { once: true },
    )
  }

  function handleTimeUpdate() {
    if (audioRef.value) {
      currentTime.value = audioRef.value.currentTime
    }
  }

  function handleLoadedMetadata() {
    if (audioRef.value) {
      duration.value = audioRef.value.duration || 0
      console.log('[PlayerStore] Metadata loaded, duration:', duration.value)
    }
  }

  function handleDurationChange() {
    if (audioRef.value) {
      duration.value = audioRef.value.duration || 0
      console.log('[PlayerStore] Duration changed:', duration.value)
    }
  }

  // === PLAYER ACTIONS ===

  function addTracks(files: ArrayLike<File> | Iterable<File> | null | undefined) {
    if (!files || (files as ArrayLike<File>).length === 0) return
    const wasEmpty = !hasTracks.value
    const newTracks = Array.from(files).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }))
    playlist.value.push(...newTracks)
    if (wasEmpty) {
      loadTrack(0)
      console.log('[PlayerStore] First track loaded - NO AUTOPLAY')
    }
  }

  /**
   * Adds tracks from Blob objects (e.g. from IndexedDB shared files).
   * @returns Number of tracks successfully added
   */
  function addTracksFromBlobs(blobRecords: BlobTrackRecord[] | null | undefined): number {
    if (!blobRecords || blobRecords.length === 0) return 0
    const wasEmpty = !hasTracks.value
    let added = 0

    for (const record of blobRecords) {
      const blob =
        record.blob instanceof Blob
          ? record.blob
          : new Blob([record.blob], { type: record.mimeType || 'audio/wav' })

      if (blob.size === 0) {
        console.warn('[PlayerStore] Skipping empty blob:', record.name)
        continue
      }

      playlist.value.push({
        name: record.name,
        url: URL.createObjectURL(blob),
      })
      added++
    }

    if (wasEmpty && added > 0) {
      loadTrack(0)
      console.log('[PlayerStore] First shared track loaded - NO AUTOPLAY')
    }

    return added
  }

  function loadTrack(index: number) {
    const track = playlist.value[index]
    if (!audioRef.value || index < 0 || !track) {
      console.warn('[PlayerStore] Cannot load track:', index)
      return
    }

    currentTrackIndex.value = index
    audioRef.value.src = track.url
    audioRef.value.load()

    // Reset progress
    currentTime.value = 0
    duration.value = 0

    console.log('[PlayerStore] Track loaded (no autoplay):', track.name)
  }

  function playTrack(index: number) {
    loadTrack(index)
    if (audioRef.value) {
      audioRef.value.play().catch((error: unknown) => {
        if (isAbortError(error)) return // play() interrupted by pause() - expected
        console.error('[PlayerStore] Playback error:', error)
        isPlaying.value = false
      })
    }
  }

  function togglePlayPause() {
    if (!audioRef.value || !hasTracks.value) {
      console.warn('[PlayerStore] Cannot toggle play/pause: no audio or tracks')
      return
    }

    if (isPlaying.value) {
      audioRef.value.pause()
    } else {
      audioRef.value.play().catch((error: unknown) => {
        if (isAbortError(error)) return // play() interrupted by pause() - expected
        console.error('[PlayerStore] Playback error:', error)
        isPlaying.value = false
      })
    }
  }

  function setMuted(muted: unknown) {
    isMuted.value = !!muted
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
  }

  function stopPlayer() {
    if (!audioRef.value) return
    audioRef.value.pause()
    audioRef.value.currentTime = 0
    currentTime.value = 0
    isPlaying.value = false
  }

  // ✨ WICHTIG: Next/Prev Tracks spielen NICHT automatisch ab
  // Sie laden nur den Track, außer der Player war bereits am Abspielen
  function nextTrack() {
    if (!hasTracks.value) return
    const wasPlaying = isPlaying.value
    const newIndex = (currentTrackIndex.value + 1) % playlist.value.length
    loadTrack(newIndex)

    // Nur abspielen wenn vorher auch abgespielt wurde
    if (wasPlaying && audioRef.value) {
      audioRef.value.play().catch((error: unknown) => {
        if (isAbortError(error)) return
        console.error('[PlayerStore] Playback error:', error)
        isPlaying.value = false
      })
    }
  }

  function prevTrack() {
    if (!hasTracks.value) return
    const wasPlaying = isPlaying.value
    const newIndex = (currentTrackIndex.value - 1 + playlist.value.length) % playlist.value.length
    loadTrack(newIndex)

    // Nur abspielen wenn vorher auch abgespielt wurde
    if (wasPlaying && audioRef.value) {
      audioRef.value.play().catch((error: unknown) => {
        if (isAbortError(error)) return
        console.error('[PlayerStore] Playback error:', error)
        isPlaying.value = false
      })
    }
  }

  function seekTo(time: number) {
    if (!audioRef.value) return
    audioRef.value.currentTime = time
    currentTime.value = time
  }

  // ══════════════════ Frame-Takt (Render-Schleife) ══════════════════
  // `currentTime` wird nur per timeupdate (~4x/s) aktualisiert, damit die
  // Fortschrittsanzeige nicht 60x/s neu rendert. Für zeitkritische Logik
  // (Beat-Drop-Marker) meldet die Render-Schleife jeden Frame mit der
  // präzisen Position des Audio-Elements an registrierte Listener.
  const frameListeners = new Set<FrameListener>()

  /** Präzise Wiedergabeposition direkt vom Audio-Element (Sekunden). */
  function getPreciseTime() {
    const t = audioRef.value?.currentTime
    return typeof t === 'number' && !isNaN(t) ? t : currentTime.value
  }

  /**
   * Registriert einen Listener, der pro Render-Frame während der Wiedergabe
   * mit der präzisen Position aufgerufen wird.
   * @returns Funktion zum Abmelden
   */
  function onFrame(listener: FrameListener): () => boolean {
    frameListeners.add(listener)
    return () => frameListeners.delete(listener)
  }

  /** Wird von der Render-Schleife einmal pro Frame aufgerufen. */
  function notifyFrame() {
    if (!isPlaying.value || frameListeners.size === 0) return
    const time = getPreciseTime()
    for (const listener of frameListeners) {
      try {
        listener(time)
      } catch (e) {
        console.error('⚠️ [Player] Frame-Listener fehlgeschlagen:', e)
      }
    }
  }

  function clearPlaylist() {
    stopPlayer()
    playlist.value.forEach((track) => URL.revokeObjectURL(track.url))
    playlist.value = []
    currentTrackIndex.value = 0
    currentTime.value = 0
    duration.value = 0
    if (audioRef.value) audioRef.value.src = ''
  }

  /**
   * Ordnet einen Track in der Playlist per Drag & Drop neu an
   * @param fromIndex - Ursprüngliche Position
   * @param toIndex - Neue Position
   */
  function reorderPlaylist(fromIndex: number, toIndex: number): boolean {
    // Validierung
    if (fromIndex < 0 || fromIndex >= playlist.value.length) return false
    if (toIndex < 0 || toIndex >= playlist.value.length) return false
    if (fromIndex === toIndex) return false

    // Track entfernen und an neuer Position einfügen
    const [movedTrack] = playlist.value.splice(fromIndex, 1) as [PlaylistTrack]
    playlist.value.splice(toIndex, 0, movedTrack)

    // CurrentTrackIndex anpassen, damit der aktive Track weiterhin aktiv bleibt
    if (fromIndex === currentTrackIndex.value) {
      // Der aktive Track wurde verschoben
      currentTrackIndex.value = toIndex
    } else if (fromIndex < currentTrackIndex.value && toIndex >= currentTrackIndex.value) {
      // Ein Track vor dem aktiven wurde nach hinten verschoben
      currentTrackIndex.value--
    } else if (fromIndex > currentTrackIndex.value && toIndex <= currentTrackIndex.value) {
      // Ein Track hinter dem aktiven wurde nach vorne verschoben
      currentTrackIndex.value++
    }

    console.log('[PlayerStore] Playlist reordered:', fromIndex, '->', toIndex)
    return true
  }

  // Cleanup-Funktion
  function cleanup() {
    if (audioRef.value) {
      removeAllListeners(audioRef.value)
    }
  }

  // Alles zurückgeben
  return {
    // State
    playlist,
    currentTrackIndex,
    isPlaying,
    audioRef,
    currentTime,
    duration,
    playMode,
    isMuted,

    // Getters
    hasTracks,
    currentTrack,
    progressPercentage,

    // Actions
    setAudioRef,
    addTracks,
    addTracksFromBlobs,
    loadTrack,
    playTrack,
    togglePlayPause,
    setMuted,
    toggleMute,
    stopPlayer,
    nextTrack,
    prevTrack,
    seekTo,
    clearPlaylist,
    reorderPlaylist,
    cleanup,
    getPreciseTime,
    onFrame,
    notifyFrame,
  }
})
