import { ref, watch } from 'vue'
import { useRecorderStore } from '../stores/recorderStore.js'

export function useMicrophoneToggle() {
  const recorderStore = useRecorderStore()
  const microphoneEnabled = ref(false)
  const isSwitchingSource = ref(false)

  watch(
    () => recorderStore.isRecording,
    (isRecording) => {
      if (!isRecording) microphoneEnabled.value = false
    },
  )

  async function toggleMicrophone() {
    isSwitchingSource.value = true
    try {
      if (window.toggleRecordingMicrophone) {
        const success = await window.toggleRecordingMicrophone(microphoneEnabled.value)
        if (!success) microphoneEnabled.value = !microphoneEnabled.value
      } else {
        microphoneEnabled.value = !microphoneEnabled.value
      }
    } catch {
      microphoneEnabled.value = !microphoneEnabled.value
    } finally {
      isSwitchingSource.value = false
    }
  }

  return { microphoneEnabled, isSwitchingSource, toggleMicrophone }
}
