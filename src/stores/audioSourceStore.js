import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAudioSourceStore = defineStore('audioSource', () => {
  // === STATE ===

  // Audio source type: 'player' or 'microphone'
  const sourceType = ref('player');

  // Microphone stream reference
  const microphoneStream = ref(null);

  // Microphone permission status: 'prompt', 'granted', 'denied', 'error'
  const microphonePermission = ref('prompt');

  // Is microphone currently active/listening
  const isMicrophoneActive = ref(false);

  // Error message if something goes wrong
  const errorMessage = ref('');

  // Available audio input devices
  const audioInputDevices = ref([]);

  // Selected device ID
  const selectedDeviceId = ref('default');

  // === GETTERS ===

  const isPlayerSource = computed(() => sourceType.value === 'player');
  const isMicrophoneSource = computed(() => sourceType.value === 'microphone');
  const hasMicrophoneAccess = computed(() => microphonePermission.value === 'granted');

  // === ACTIONS ===

  /**
   * Request microphone permission and get available devices
   */
  async function requestMicrophonePermission() {
    try {
      errorMessage.value = '';
      microphonePermission.value = 'prompt';

      // Request permission by getting a stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Permission granted
      microphonePermission.value = 'granted';

      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());

      // Enumerate available devices
      await enumerateAudioDevices();

      console.log('[AudioSourceStore] Microphone permission granted');
      return true;

    } catch (error) {
      console.error('[AudioSourceStore] Microphone permission error:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        microphonePermission.value = 'denied';
        errorMessage.value = 'Mikrofon-Zugriff wurde verweigert';
      } else if (error.name === 'NotFoundError') {
        microphonePermission.value = 'error';
        errorMessage.value = 'Kein Mikrofon gefunden';
      } else {
        microphonePermission.value = 'error';
        errorMessage.value = error.message || 'Unbekannter Fehler';
      }

      return false;
    }
  }

  /**
   * Enumerate available audio input devices
   */
  async function enumerateAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      audioInputDevices.value = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Mikrofon ${audioInputDevices.value.length + 1}`
        }));

      console.log('[AudioSourceStore] Found audio devices:', audioInputDevices.value.length);
    } catch (error) {
      console.error('[AudioSourceStore] Error enumerating devices:', error);
    }
  }

  /**
   * Start microphone capture
   */
  async function startMicrophone(deviceId = null) {
    try {
      errorMessage.value = '';

      // Stop any existing stream
      if (microphoneStream.value) {
        stopMicrophone();
      }

      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      microphoneStream.value = stream;
      isMicrophoneActive.value = true;
      microphonePermission.value = 'granted';

      if (deviceId) {
        selectedDeviceId.value = deviceId;
      }

      console.log('[AudioSourceStore] Microphone started');
      return stream;

    } catch (error) {
      console.error('[AudioSourceStore] Error starting microphone:', error);
      errorMessage.value = error.message || 'Mikrofon konnte nicht gestartet werden';
      isMicrophoneActive.value = false;
      return null;
    }
  }

  /**
   * Stop microphone capture
   */
  function stopMicrophone() {
    if (microphoneStream.value) {
      microphoneStream.value.getTracks().forEach(track => {
        track.stop();
        console.log('[AudioSourceStore] Stopped track:', track.kind);
      });
      microphoneStream.value = null;
    }
    isMicrophoneActive.value = false;
    console.log('[AudioSourceStore] Microphone stopped');
  }

  /**
   * Switch audio source type
   */
  function setSourceType(type) {
    if (type !== 'player' && type !== 'microphone') {
      console.warn('[AudioSourceStore] Invalid source type:', type);
      return;
    }

    // If switching away from microphone, stop it
    if (sourceType.value === 'microphone' && type === 'player') {
      stopMicrophone();
    }

    sourceType.value = type;
    console.log('[AudioSourceStore] Source type changed to:', type);
  }

  /**
   * Toggle between player and microphone
   */
  async function toggleSource() {
    if (sourceType.value === 'player') {
      // Switch to microphone
      if (microphonePermission.value !== 'granted') {
        const granted = await requestMicrophonePermission();
        if (!granted) return false;
      }
      setSourceType('microphone');
      return true;
    } else {
      // Switch to player
      setSourceType('player');
      return true;
    }
  }

  /**
   * Reset to default state
   */
  function reset() {
    stopMicrophone();
    sourceType.value = 'player';
    errorMessage.value = '';
  }

  return {
    // State
    sourceType,
    microphoneStream,
    microphonePermission,
    isMicrophoneActive,
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
    reset
  };
});
