import { ref, onMounted, watch } from 'vue'
import { usePlayerStore } from '../stores/playerStore.js'
import { getAudioEngine } from '../lib/audioEngineBridge.js'

/**
 * Volume + bass/treble EQ state for the sticky player bar. Persists values to
 * localStorage and keeps the audio element in sync (via the audio engine's EQ,
 * lib/audioEngineBridge.js).
 */
export function usePlayerVolumeEq() {
  const playerStore = usePlayerStore()

  const volume = ref(100)
  const bass = ref(0)
  const treble = ref(0)

  const updateVolume = () => {
    if (playerStore.audioRef) {
      playerStore.audioRef.volume = volume.value / 100
      localStorage.setItem('playerVolume', volume.value)
    }
  }
  const updateBass = () => {
    const engine = getAudioEngine()
    if (engine) {
      engine.setBassGain(parseFloat(bass.value))
      localStorage.setItem('playerBass', bass.value)
    }
  }
  const updateTreble = () => {
    const engine = getAudioEngine()
    if (engine) {
      engine.setTrebleGain(parseFloat(treble.value))
      localStorage.setItem('playerTreble', treble.value)
    }
  }

  onMounted(() => {
    const savedVolume = localStorage.getItem('playerVolume')
    if (savedVolume !== null) {
      volume.value = parseInt(savedVolume)
      updateVolume()
    } else if (playerStore.audioRef) {
      volume.value = Math.round(playerStore.audioRef.volume * 100)
    }

    watch(
      () => playerStore.audioRef,
      (audioRef) => {
        if (audioRef) {
          audioRef.volume = volume.value / 100
          console.log('[StickyPlayerBar] Audio-Lautstärke synchronisiert:', volume.value + '%')
        }
      },
      { immediate: true },
    )

    const savedBass = localStorage.getItem('playerBass')
    if (savedBass !== null) {
      bass.value = parseInt(savedBass)
      updateBass()
    }
    const savedTreble = localStorage.getItem('playerTreble')
    if (savedTreble !== null) {
      treble.value = parseInt(savedTreble)
      updateTreble()
    }
  })

  return { volume, bass, treble, updateVolume, updateBass, updateTreble }
}
