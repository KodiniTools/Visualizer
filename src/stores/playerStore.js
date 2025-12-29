import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const usePlayerStore = defineStore('player', () => {
  // === STATE (Die Daten des Players) ===
  const playlist = ref([]);
  const currentTrackIndex = ref(0);
  const isPlaying = ref(false);
  const audioRef = ref(null);
  
  // Progress-Tracking direkt im Store
  const currentTime = ref(0);
  const duration = ref(0);

  // === GETTERS (Abgeleitete Daten, wie computed) ===
  const hasTracks = computed(() => playlist.value.length > 0);
  const currentTrack = computed(() => hasTracks.value ? playlist.value[currentTrackIndex.value] : null);
  
  // Progress-Percentage berechnen
  const progressPercentage = computed(() => {
    if (duration.value === 0) return 0;
    return (currentTime.value / duration.value) * 100;
  });

  // === ACTIONS (Die Funktionen, die den Zustand ändern) ===

  /**
   * Diese Funktion wird einmal von App.vue aufgerufen, um dem Store das Audio-Element zu geben.
   * Sie richtet auch ALLE Event Listener ein.
   */
  function setAudioRef(element) {
    // Falls bereits ein audioRef existiert, cleanup alte Listener
    if (audioRef.value) {
      removeAllListeners(audioRef.value);
    }

    audioRef.value = element;

    // Event Listener hinzufügen
    if (audioRef.value) {
      addAllListeners(audioRef.value);
      console.log('[PlayerStore] Audio element connected and listeners added');
    }
  }

  /**
   * Fügt alle benötigten Event Listener zum Audio-Element hinzu
   */
  function addAllListeners(audio) {
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
  }

  /**
   * Entfernt alle Event Listener vom Audio-Element
   */
  function removeAllListeners(audio) {
    audio.removeEventListener('play', handlePlay);
    audio.removeEventListener('pause', handlePause);
    audio.removeEventListener('ended', handleEnded);
    audio.removeEventListener('timeupdate', handleTimeUpdate);
    audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    audio.removeEventListener('durationchange', handleDurationChange);
  }

  // === EVENT HANDLERS ===
  
  function handlePlay() {
    isPlaying.value = true;
    console.log('[PlayerStore] Playing');
  }

  function handlePause() {
    isPlaying.value = false;
    console.log('[PlayerStore] Paused');
  }

  function handleEnded() {
    isPlaying.value = false;
    console.log('[PlayerStore] Track ended - NO AUTOPLAY');
    // ✨ WICHTIG: Kein automatisches Abspielen des nächsten Tracks
  }

  function handleTimeUpdate() {
    if (audioRef.value) {
      currentTime.value = audioRef.value.currentTime;
    }
  }

  function handleLoadedMetadata() {
    if (audioRef.value) {
      duration.value = audioRef.value.duration || 0;
      console.log('[PlayerStore] Metadata loaded, duration:', duration.value);
    }
  }

  function handleDurationChange() {
    if (audioRef.value) {
      duration.value = audioRef.value.duration || 0;
      console.log('[PlayerStore] Duration changed:', duration.value);
    }
  }

  // === PLAYER ACTIONS ===

  function addTracks(files) {
    if (!files || files.length === 0) return;
    const wasEmpty = !hasTracks.value;
    const newTracks = Array.from(files).map(file => ({ 
      name: file.name, 
      url: URL.createObjectURL(file) 
    }));
    playlist.value.push(...newTracks);
    if (wasEmpty) {
      loadTrack(0);
      console.log('[PlayerStore] First track loaded - NO AUTOPLAY');
    }
  }

  function loadTrack(index) {
    if (!audioRef.value || index < 0 || index >= playlist.value.length) {
      console.warn('[PlayerStore] Cannot load track:', index);
      return;
    }
    
    currentTrackIndex.value = index;
    audioRef.value.src = playlist.value[index].url;
    audioRef.value.load();
    
    // Reset progress
    currentTime.value = 0;
    duration.value = 0;
    
    console.log('[PlayerStore] Track loaded (no autoplay):', playlist.value[index].name);
  }

  function playTrack(index) {
    loadTrack(index);
    if (audioRef.value) {
      audioRef.value.play().catch(error => {
        console.error('[PlayerStore] Playback error:', error);
        isPlaying.value = false;
      });
    }
  }

  function togglePlayPause() {
    if (!audioRef.value || !hasTracks.value) {
      console.warn('[PlayerStore] Cannot toggle play/pause: no audio or tracks');
      return;
    }
    
    if (isPlaying.value) {
      audioRef.value.pause();
    } else {
      audioRef.value.play().catch(error => {
        console.error('[PlayerStore] Playback error:', error);
        isPlaying.value = false;
      });
    }
  }

  function stopPlayer() {
    if (!audioRef.value) return;
    audioRef.value.pause();
    audioRef.value.currentTime = 0;
    currentTime.value = 0;
    isPlaying.value = false;
  }

  // ✨ WICHTIG: Next/Prev Tracks spielen NICHT automatisch ab
  // Sie laden nur den Track, außer der Player war bereits am Abspielen
  function nextTrack() {
    if (!hasTracks.value) return;
    const wasPlaying = isPlaying.value;
    const newIndex = (currentTrackIndex.value + 1) % playlist.value.length;
    loadTrack(newIndex);
    
    // Nur abspielen wenn vorher auch abgespielt wurde
    if (wasPlaying && audioRef.value) {
      audioRef.value.play().catch(error => {
        console.error('[PlayerStore] Playback error:', error);
        isPlaying.value = false;
      });
    }
  }

  function prevTrack() {
    if (!hasTracks.value) return;
    const wasPlaying = isPlaying.value;
    const newIndex = (currentTrackIndex.value - 1 + playlist.value.length) % playlist.value.length;
    loadTrack(newIndex);
    
    // Nur abspielen wenn vorher auch abgespielt wurde
    if (wasPlaying && audioRef.value) {
      audioRef.value.play().catch(error => {
        console.error('[PlayerStore] Playback error:', error);
        isPlaying.value = false;
      });
    }
  }

  function seekTo(time) {
    if (!audioRef.value) return;
    audioRef.value.currentTime = time;
    currentTime.value = time;
  }

  function clearPlaylist() {
    stopPlayer();
    playlist.value.forEach(track => URL.revokeObjectURL(track.url));
    playlist.value = [];
    currentTrackIndex.value = 0;
    currentTime.value = 0;
    duration.value = 0;
    if (audioRef.value) audioRef.value.src = "";
  }

  /**
   * Ordnet einen Track in der Playlist per Drag & Drop neu an
   * @param {number} fromIndex - Ursprüngliche Position
   * @param {number} toIndex - Neue Position
   */
  function reorderPlaylist(fromIndex, toIndex) {
    // Validierung
    if (fromIndex < 0 || fromIndex >= playlist.value.length) return false;
    if (toIndex < 0 || toIndex >= playlist.value.length) return false;
    if (fromIndex === toIndex) return false;

    // Track entfernen und an neuer Position einfügen
    const [movedTrack] = playlist.value.splice(fromIndex, 1);
    playlist.value.splice(toIndex, 0, movedTrack);

    // CurrentTrackIndex anpassen, damit der aktive Track weiterhin aktiv bleibt
    if (fromIndex === currentTrackIndex.value) {
      // Der aktive Track wurde verschoben
      currentTrackIndex.value = toIndex;
    } else if (fromIndex < currentTrackIndex.value && toIndex >= currentTrackIndex.value) {
      // Ein Track vor dem aktiven wurde nach hinten verschoben
      currentTrackIndex.value--;
    } else if (fromIndex > currentTrackIndex.value && toIndex <= currentTrackIndex.value) {
      // Ein Track hinter dem aktiven wurde nach vorne verschoben
      currentTrackIndex.value++;
    }

    console.log('[PlayerStore] Playlist reordered:', fromIndex, '->', toIndex);
    return true;
  }

  // Cleanup-Funktion
  function cleanup() {
    if (audioRef.value) {
      removeAllListeners(audioRef.value);
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
    
    // Getters
    hasTracks, 
    currentTrack,
    progressPercentage,
    
    // Actions
    setAudioRef,
    addTracks,
    loadTrack,
    playTrack,
    togglePlayPause,
    stopPlayer,
    nextTrack,
    prevTrack,
    seekTo,
    clearPlaylist,
    reorderPlaylist,
    cleanup
  };
});
