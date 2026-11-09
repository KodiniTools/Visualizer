import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type AudioSourceType = 'player' | 'microphone'
export type MicrophonePermission = 'prompt' | 'granted' | 'denied' | 'error'

export interface AudioInputDevice {
  deviceId: string
  label: string
}

/** Fehlertext (message) eines unbekannten Fehlers, falls vorhanden. */
function errorDetail(error: unknown): string | undefined {
  return (error as { message?: string } | null)?.message
}

export const useAudioSourceStore = defineStore('audioSource', () => {
  // === STATE ===

  // Audio source type: 'player' or 'microphone'
  const sourceType = ref<AudioSourceType>('player')

  // Microphone stream reference
  const microphoneStream = ref<MediaStream | null>(null)

  // Microphone permission status: 'prompt', 'granted', 'denied', 'error'
  const microphonePermission = ref<MicrophonePermission>('prompt')

  // Is microphone currently active/listening
  const isMicrophoneActive = ref(false)

  // Fehler als i18n-Schlüssel unter `player.*` (Text wählt die Oberfläche je Sprache)
  const errorKey = ref('')
  // Technische Fehlermeldung des Browsers (unübersetzt, optional)
  const errorMessage = ref('')

  // Available audio input devices
  const audioInputDevices = ref<AudioInputDevice[]>([])

  // Selected device ID
  const selectedDeviceId = ref('default')

  // === GETTERS ===

  const isPlayerSource = computed(() => sourceType.value === 'player')
  const isMicrophoneSource = computed(() => sourceType.value === 'microphone')
  const hasMicrophoneAccess = computed(() => microphonePermission.value === 'granted')

  // === ACTIONS ===

  /**
   * Request microphone permission and get available devices
   */
  async function requestMicrophonePermission() {
    try {
      clearError()
      microphonePermission.value = 'prompt'

      // Request permission by getting a stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Permission granted
      microphonePermission.value = 'granted'

      // Stop the test stream immediately
      stream.getTracks().forEach((track) => track.stop())

      // Enumerate available devices
      await enumerateAudioDevices()

      console.log('[AudioSourceStore] Microphone permission granted')
      return true
    } catch (error) {
      console.error('[AudioSourceStore] Microphone permission error:', error)

      const key = microphoneErrorKey(error)
      microphonePermission.value = key === 'microphonePermissionDenied' ? 'denied' : 'error'
      setError(key ?? 'microphoneUnknownError', key ? '' : errorDetail(error))

      return false
    }
  }

  /**
   * Enumerate available audio input devices
   */
  async function enumerateAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      audioInputDevices.value = devices
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          // Ohne Freigabe liefern Browser leere Labels → Oberfläche nummeriert
          label: device.label || '',
        }))

      console.log('[AudioSourceStore] Found audio devices:', audioInputDevices.value.length)
    } catch (error) {
      console.error('[AudioSourceStore] Error enumerating devices:', error)
    }
  }

  /**
   * Start microphone capture
   */
  async function startMicrophone(deviceId: string | null = null): Promise<MediaStream | null> {
    try {
      clearError()

      // Stop any existing stream
      if (microphoneStream.value) {
        stopMicrophone()
      }

      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (error) {
        // Gemerktes Gerät nicht mehr vorhanden (abgesteckt/neu verbunden) →
        // mit dem Standardgerät starten statt dauerhaft zu scheitern
        const missing = ['OverconstrainedError', 'NotFoundError'].includes(
          (error as { name?: string } | null)?.name ?? '',
        )
        if (!deviceId || !missing) throw error
        console.warn('[AudioSourceStore] Gewähltes Mikrofon fehlt – Standardgerät', error)
        deviceId = null
        selectedDeviceId.value = 'default'
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { ...constraints.audio, deviceId: undefined },
        })
      }
      microphoneStream.value = stream
      isMicrophoneActive.value = true
      microphonePermission.value = 'granted'

      if (deviceId) {
        selectedDeviceId.value = deviceId
      }

      console.log('[AudioSourceStore] Microphone started')
      return stream
    } catch (error) {
      console.error('[AudioSourceStore] Error starting microphone:', error)
      const key = microphoneErrorKey(error)
      setError(key ?? 'microphoneStartFailed', key ? '' : errorDetail(error))
      isMicrophoneActive.value = false
      return null
    }
  }

  /**
   * Stop microphone capture
   */
  function stopMicrophone() {
    if (microphoneStream.value) {
      microphoneStream.value.getTracks().forEach((track) => {
        track.stop()
        console.log('[AudioSourceStore] Stopped track:', track.kind)
      })
      microphoneStream.value = null
    }
    isMicrophoneActive.value = false
    console.log('[AudioSourceStore] Microphone stopped')
  }

  /**
   * Switch audio source type
   */
  function setSourceType(type: string) {
    if (type !== 'player' && type !== 'microphone') {
      console.warn('[AudioSourceStore] Invalid source type:', type)
      return
    }

    // If switching away from microphone, stop it
    if (sourceType.value === 'microphone' && type === 'player') {
      stopMicrophone()
    }

    sourceType.value = type as AudioSourceType
    console.log('[AudioSourceStore] Source type changed to:', type)
  }

  /**
   * Toggle between player and microphone
   */
  async function toggleSource() {
    if (sourceType.value === 'player') {
      // Switch to microphone
      if (microphonePermission.value !== 'granted') {
        const granted = await requestMicrophonePermission()
        if (!granted) return false
      }
      setSourceType('microphone')
      return true
    } else {
      // Switch to player
      setSourceType('player')
      return true
    }
  }

  /**
   * Reset to default state
   */
  function reset() {
    stopMicrophone()
    sourceType.value = 'player'
    clearError()
  }

  /** Fehler setzen: i18n-Schlüssel plus optionale technische Meldung. */
  function setError(key: string, detail: string | undefined = '') {
    errorKey.value = key
    errorMessage.value = detail || ''
  }

  function clearError() {
    setError('', '')
  }

  return {
    // State
    sourceType,
    microphoneStream,
    microphonePermission,
    isMicrophoneActive,
    errorKey,
    errorMessage,
    audioInputDevices,
    selectedDeviceId,

    // Getters
    isPlayerSource,
    isMicrophoneSource,
    hasMicrophoneAccess,

    // Actions
    requestMicrophonePermission,
    enumerateAudioDevices,
    startMicrophone,
    stopMicrophone,
    setSourceType,
    toggleSource,
    reset,
    setError,
    clearError,
  }
})

/**
 * Bekannte getUserMedia-Fehler → i18n-Schlüssel (unter `player.*`);
 * null = unbekannt (dann zählt die technische Meldung).
 */
export function microphoneErrorKey(error: unknown): string | null {
  const name = (error as { name?: unknown } | null | undefined)?.name
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'microphonePermissionDenied'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'microphoneNotFound'
  return null
}
