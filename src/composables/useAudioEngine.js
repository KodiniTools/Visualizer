const SILENT_GAIN = 0.0001
const ACTIVE_GAIN = 1

export function useAudioEngine({ audioRef, audioSourceStore, playerStore }) {
  let audioContext = null
  let analyser = null
  let sourceNode = null
  let outputGain = null
  let recordingDest = null
  let recordingGain = null
  let bassFilter = null
  let trebleFilter = null
  let micRecordingGain = null
  let micRecordingSourceNode = null
  let micRecordingStream = null
  let recordingMixer = null

  let microphoneSourceNode = null
  let microphoneAudioContext = null
  let microphoneAnalyser = null

  const videoSourceNodes = new Map()
  let videoRecordingGain = null

  function getAnalyser() {
    return analyser
  }
  function getMicrophoneAnalyser() {
    return microphoneAnalyser
  }
  function getMicrophoneAudioContext() {
    return microphoneAudioContext
  }
  function getAudioContext() {
    return audioContext
  }

  function setupAudioContext() {
    if (audioContext || !audioRef.value) return

    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    sourceNode = audioContext.createMediaElementSource(audioRef.value)
    outputGain = audioContext.createGain()

    bassFilter = audioContext.createBiquadFilter()
    bassFilter.type = 'lowshelf'
    bassFilter.frequency.value = 200
    bassFilter.gain.value = 0

    trebleFilter = audioContext.createBiquadFilter()
    trebleFilter.type = 'highshelf'
    trebleFilter.frequency.value = 3000
    trebleFilter.gain.value = 0

    recordingGain = audioContext.createGain()
    recordingGain.gain.value = 0

    micRecordingGain = audioContext.createGain()
    micRecordingGain.gain.value = 0

    recordingMixer = audioContext.createGain()
    recordingMixer.gain.value = 1

    recordingDest = audioContext.createMediaStreamDestination()

    sourceNode.connect(bassFilter)
    bassFilter.connect(trebleFilter)
    trebleFilter.connect(outputGain)
    outputGain.connect(audioContext.destination)
    sourceNode.connect(analyser)

    trebleFilter.connect(recordingGain)
    recordingGain.connect(recordingMixer)
    micRecordingGain.connect(recordingMixer)
    recordingMixer.connect(recordingDest)
  }

  function setBassGain(gain) {
    if (bassFilter) bassFilter.gain.value = gain
  }

  function setTrebleGain(gain) {
    if (trebleFilter) trebleFilter.gain.value = gain
  }

  function enableRecorderAudio() {
    if (recordingGain) recordingGain.gain.value = ACTIVE_GAIN
  }

  function disableRecorderAudio() {
    if (recordingGain) recordingGain.gain.value = SILENT_GAIN
  }

  async function setupMicrophoneSource() {
    try {
      const stream = await audioSourceStore.startMicrophone(
        audioSourceStore.selectedDeviceId !== 'default' ? audioSourceStore.selectedDeviceId : null,
      )
      if (!stream) return false

      if (microphoneAudioContext) {
        try {
          if (microphoneSourceNode) microphoneSourceNode.disconnect()
          await microphoneAudioContext.close()
        } catch {}
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      try {
        microphoneAudioContext = new AudioContextClass({ sampleRate: 48000 })
      } catch {
        microphoneAudioContext = new AudioContextClass()
      }

      if (microphoneAudioContext.state === 'suspended') {
        await microphoneAudioContext.resume()
      }

      microphoneAnalyser = microphoneAudioContext.createAnalyser()
      microphoneAnalyser.fftSize = 2048
      microphoneAnalyser.smoothingTimeConstant = 0.8

      microphoneSourceNode = microphoneAudioContext.createMediaStreamSource(stream)
      const micGain = microphoneAudioContext.createGain()
      micGain.gain.value = 1.0
      microphoneSourceNode.connect(micGain)
      micGain.connect(microphoneAnalyser)

      const silentGain = microphoneAudioContext.createGain()
      silentGain.gain.value = 0
      micGain.connect(silentGain)
      silentGain.connect(microphoneAudioContext.destination)

      return true
    } catch (error) {
      console.error('[AudioEngine] Fehler beim Setup des Mikrofons:', error)
      audioSourceStore.errorMessage = error.message
      return false
    }
  }

  function disconnectMicrophoneSource() {
    if (microphoneSourceNode) {
      try {
        microphoneSourceNode.disconnect()
      } catch {}
      microphoneSourceNode = null
    }
    if (microphoneAudioContext) {
      try {
        microphoneAudioContext.close()
      } catch {}
      microphoneAudioContext = null
      microphoneAnalyser = null
    }
    audioSourceStore.stopMicrophone()
  }

  async function switchAudioSource(sourceType) {
    if (sourceType === 'microphone') {
      const success = await setupMicrophoneSource()
      if (success) audioSourceStore.setSourceType('microphone')
      return success
    } else {
      disconnectMicrophoneSource()
      audioSourceStore.setSourceType('player')
      return true
    }
  }

  async function connectMicToRecordingChain() {
    if (!audioContext || !micRecordingGain) return false

    if (micRecordingSourceNode) {
      try {
        micRecordingSourceNode.disconnect()
      } catch {}
      micRecordingSourceNode = null
    }

    if (micRecordingStream) {
      micRecordingStream.getTracks().forEach((t) => t.stop())
      micRecordingStream = null
    }

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {})
      }

      const deviceId = audioSourceStore.selectedDeviceId
      const constraints = {
        audio: {
          deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      micRecordingStream = await navigator.mediaDevices.getUserMedia(constraints)
      const audioTracks = micRecordingStream.getAudioTracks()
      if (!audioTracks.length || audioTracks[0].readyState !== 'live') return false

      micRecordingSourceNode = audioContext.createMediaStreamSource(micRecordingStream)
      micRecordingSourceNode.connect(micRecordingGain)
      return true
    } catch (error) {
      console.error('[AudioEngine] Fehler beim Verbinden des Mikrofons:', error)
      return false
    }
  }

  function disconnectMicFromRecordingChain() {
    if (micRecordingSourceNode) {
      try {
        micRecordingSourceNode.disconnect()
      } catch {}
      micRecordingSourceNode = null
    }
    if (micRecordingStream) {
      micRecordingStream.getTracks().forEach((t) => t.stop())
      micRecordingStream = null
    }
  }

  async function toggleRecordingMicrophone(enable) {
    if (!recordingGain || !micRecordingGain) return false

    if (enable) {
      if (!audioSourceStore.isMicrophoneActive) {
        const ok = await setupMicrophoneSource()
        if (ok) audioSourceStore.setSourceType('microphone')
      }
      if (!micRecordingSourceNode) {
        const connected = await connectMicToRecordingChain()
        if (!connected) return false
      }
      recordingGain.gain.value = ACTIVE_GAIN
      micRecordingGain.gain.value = ACTIVE_GAIN
    } else {
      recordingGain.gain.value = ACTIVE_GAIN
      micRecordingGain.gain.value = SILENT_GAIN
      disconnectMicrophoneSource()
      audioSourceStore.setSourceType('player')
    }

    return true
  }

  function connectVideoToRecording(videoElement, volume = 1) {
    if (videoSourceNodes.has(videoElement)) return true

    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {})
    }

    if (!recordingMixer) {
      recordingMixer = audioContext.createGain()
      recordingMixer.gain.value = 1
      if (!recordingDest) recordingDest = audioContext.createMediaStreamDestination()
      recordingMixer.connect(recordingDest)
    }

    try {
      if (!videoRecordingGain) {
        videoRecordingGain = audioContext.createGain()
        videoRecordingGain.gain.value = ACTIVE_GAIN
        videoRecordingGain.connect(recordingMixer)
      }

      const videoSource = audioContext.createMediaElementSource(videoElement)
      const gainNode = audioContext.createGain()
      gainNode.gain.value = volume
      videoSource.connect(gainNode)
      gainNode.connect(audioContext.destination)
      gainNode.connect(videoRecordingGain)
      videoSourceNodes.set(videoElement, { sourceNode: videoSource, gainNode })
      return true
    } catch (error) {
      console.error('[AudioEngine] Fehler beim Verbinden des Video-Audios:', error)
      return false
    }
  }

  function disconnectVideoFromRecording(videoElement) {
    const nodes = videoSourceNodes.get(videoElement)
    if (!nodes) return
    try {
      nodes.gainNode.disconnect()
      videoSourceNodes.delete(videoElement)
    } catch {}
  }

  function setVideoVolume(videoElement, volume) {
    const nodes = videoSourceNodes.get(videoElement)
    if (nodes?.gainNode) nodes.gainNode.gain.value = volume
  }

  async function fadeOutRecordingAudio(duration = 50) {
    if (!recordingMixer || !audioContext) return
    const now = audioContext.currentTime
    const fadeTime = duration / 1000
    recordingMixer.gain.cancelScheduledValues(now)
    recordingMixer.gain.setValueAtTime(recordingMixer.gain.value, now)
    recordingMixer.gain.exponentialRampToValueAtTime(0.001, now + fadeTime)
    await new Promise((r) => setTimeout(r, duration))
    recordingMixer.gain.setValueAtTime(0, audioContext.currentTime)
  }

  async function fadeInRecordingAudio(duration = 50) {
    if (!recordingMixer || !audioContext) return
    const now = audioContext.currentTime
    const fadeTime = duration / 1000
    recordingMixer.gain.cancelScheduledValues(now)
    recordingMixer.gain.setValueAtTime(0.001, now)
    recordingMixer.gain.exponentialRampToValueAtTime(1, now + fadeTime)
    await new Promise((r) => setTimeout(r, duration))
  }

  async function createCombinedAudioStream() {
    if (!recordingDest) return null

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {})
    }

    const micConnected = await connectMicToRecordingChain()
    if (!micConnected) {
      console.warn('[AudioEngine] Mic-Pfad nicht verbunden - Live-Umschaltung nicht möglich')
    }

    recordingGain.gain.value = ACTIVE_GAIN
    micRecordingGain.gain.value = ACTIVE_GAIN
    await new Promise((r) => setTimeout(r, 300))

    recordingGain.gain.value = ACTIVE_GAIN
    micRecordingGain.gain.value = SILENT_GAIN

    return recordingDest.stream
  }

  function cleanup() {
    disconnectMicFromRecordingChain()
    disconnectMicrophoneSource()
    if (audioContext) {
      try {
        audioContext.close()
      } catch {}
    }
  }

  function exposeGlobals() {
    window.switchAudioSource = switchAudioSource
    window.toggleRecordingMicrophone = toggleRecordingMicrophone
    window.connectVideoToRecording = connectVideoToRecording
    window.disconnectVideoFromRecording = disconnectVideoFromRecording
    window.setVideoVolume = setVideoVolume
    window.fadeOutRecordingAudio = fadeOutRecordingAudio
    window.fadeInRecordingAudio = fadeInRecordingAudio
    window.getAudioStreamForRecorder = createCombinedAudioStream
    window.setBassGain = setBassGain
    window.setTrebleGain = setTrebleGain
  }

  return {
    setupAudioContext,
    enableRecorderAudio,
    disableRecorderAudio,
    setupMicrophoneSource,
    disconnectMicrophoneSource,
    disconnectMicFromRecordingChain,
    createCombinedAudioStream,
    cleanup,
    exposeGlobals,
    getAnalyser,
    getMicrophoneAnalyser,
    getMicrophoneAudioContext,
    getAudioContext,
  }
}
