import { ref } from 'vue'
import { useAudioSourceStore } from '../stores/audioSourceStore.js'

/**
 * Player vs. microphone audio-source switching and input-device selection for
 * the sticky player bar. Delegates the actual switching to the global
 * `window.switchAudioSource` hook installed by the audio engine.
 */
export function useAudioSourceControls() {
  const audioSourceStore = useAudioSourceStore()

  const selectedDevice = ref('default')

  const selectSource = async (sourceType) => {
    if (sourceType === audioSourceStore.sourceType) return
    if (window.switchAudioSource) {
      const success = await window.switchAudioSource(sourceType)
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
    if (window.switchAudioSource) {
      await window.switchAudioSource('player')
      await window.switchAudioSource('microphone')
    }
  }

  return { selectedDevice, selectSource, changeDevice }
}
