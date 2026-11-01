import { ref } from 'vue'
import { useAudioSourceStore } from '../stores/audioSourceStore.js'
import { getAudioEngine } from '../lib/audioEngineBridge.js'

/**
 * Player vs. microphone audio-source switching and input-device selection for
 * the sticky player bar. Delegates the actual switching to the audio engine
 * (lib/audioEngineBridge.js).
 */
export function useAudioSourceControls() {
  const audioSourceStore = useAudioSourceStore()

  // Startwert aus dem Store (dauerhaft gemerktes Mikrofon)
  const selectedDevice = ref(audioSourceStore.selectedDeviceId || 'default')

  const selectSource = async (sourceType) => {
    if (sourceType === audioSourceStore.sourceType) return
    const engine = getAudioEngine()
    if (engine) {
      const success = await engine.switchAudioSource(sourceType)
      if (!success && sourceType === 'microphone') {
        console.log('[StickyPlayerBar] Failed to switch to microphone')
      }
    } else {
      console.error('[StickyPlayerBar] switchAudioSource not available')
    }
  }

  const changeDevice = async () => {
    if (!audioSourceStore.isMicrophoneSource) return
    audioSourceStore.selectedDeviceId = selectedDevice.value
    const engine = getAudioEngine()
    if (engine) {
      await engine.switchAudioSource('player')
      await engine.switchAudioSource('microphone')
    }
  }

  return { selectedDevice, selectSource, changeDevice }
}
