import { watch, type Ref } from 'vue'
import { registerAudioEngine, type AudioEngineApi } from '../lib/audioEngineBridge'
import type { AnalysisInput, useAudioSourceStore } from '../stores/audioSourceStore'
import type { usePlayerStore } from '../stores/playerStore'

const SILENT_GAIN = 0.0001
const ACTIVE_GAIN = 1

/** Ältere Safari-Versionen kennen nur webkitAudioContext */
type AudioContextCtor = typeof AudioContext
const AudioContextClassOf = (): AudioContextCtor =>
  window.AudioContext ||
  (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext

/** Abhängigkeiten von useAudioEngine */
export interface AudioEngineDeps {
  audioRef: Ref<HTMLAudioElement | null | undefined>
  audioSourceStore: ReturnType<typeof useAudioSourceStore>
  playerStore?: ReturnType<typeof usePlayerStore> | null
}

interface VideoAudioNodes {
  sourceNode: MediaElementAudioSourceNode
  gainNode: GainNode
}

export function useAudioEngine({ audioRef, audioSourceStore, playerStore }: AudioEngineDeps) {
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let sourceNode: MediaElementAudioSourceNode | null = null
  let outputGain: GainNode | null = null
  let recordingDest: MediaStreamAudioDestinationNode | null = null
  let recordingGain: GainNode | null = null
  let bassFilter: BiquadFilterNode | null = null
  let trebleFilter: BiquadFilterNode | null = null
  let micRecordingGain: GainNode | null = null
  let micRecordingSourceNode: MediaStreamAudioSourceNode | null = null
  let micRecordingStream: MediaStream | null = null
  let recordingMixer: GainNode | null = null

  let microphoneSourceNode: MediaStreamAudioSourceNode | null = null
  let microphoneAudioContext: AudioContext | null = null
  let microphoneAnalyser: AnalyserNode | null = null

  const videoSourceNodes = new Map<HTMLMediaElement, VideoAudioNodes>()
  let videoRecordingGain: GainNode | null = null

  // Analyse-Eingang: Player und Video-Ton laufen über je einen Gain in den
  // Analyser; audioSourceStore.analysisInput schaltet sie (Player/Video/Mix).
  let playerAnalysisGain: GainNode | null = null
  let videoAnalysisGain: GainNode | null = null

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

    audioContext = new (AudioContextClassOf())()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    sourceNode = audioContext.createMediaElementSource(audioRef.value)
    outputGain = audioContext.createGain()
    applyOutputMute()

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

    playerAnalysisGain = audioContext.createGain()
    videoAnalysisGain = audioContext.createGain()
    applyAnalysisInput()
    sourceNode.connect(playerAnalysisGain)
    playerAnalysisGain.connect(analyser)
    videoAnalysisGain.connect(analyser)

    trebleFilter.connect(recordingGain)
    recordingGain.connect(recordingMixer)
    micRecordingGain.connect(recordingMixer)
    recordingMixer.connect(recordingDest)
  }

  /** Analyse-Quelle anwenden: Player, Video-Ton oder beides (Mix). */
  function applyAnalysisInput() {
    const input: AnalysisInput = audioSourceStore.analysisInput ?? 'player'
    if (playerAnalysisGain) playerAnalysisGain.gain.value = input === 'video' ? 0 : ACTIVE_GAIN
    if (videoAnalysisGain) videoAnalysisGain.gain.value = input === 'player' ? 0 : ACTIVE_GAIN
  }
  watch(() => audioSourceStore.analysisInput, applyAnalysisInput)

  /**
   * Läuft gerade ein Video, dessen Ton in der Engine hängt (hörbar, nicht
   * pausiert)? Der Render-Loop zeichnet dann auch ohne laufenden Player.
   */
  function isVideoAudioPlaying(): boolean {
    for (const [video, nodes] of videoSourceNodes) {
      if (!video.paused && !video.ended && !video.muted && nodes.gainNode.gain.value > 0) {
        return true
      }
    }
    return false
  }

  /** Stumm (playerStore.isMuted) nur auf den Lautsprecher-Ausgang anwenden. */
  function applyOutputMute() {
    if (outputGain) outputGain.gain.value = playerStore?.isMuted ? 0 : ACTIVE_GAIN
  }
  if (playerStore) watch(() => playerStore.isMuted, applyOutputMute)

  function setBassGain(gain: number) {
    if (bassFilter) bassFilter.gain.value = gain
  }

  function setTrebleGain(gain: number) {
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
        } catch {
          // Aufräumen: Node/Context ist evtl. schon getrennt oder geschlossen
        }
      }

      const AudioContextClass = AudioContextClassOf()
      let micContext: AudioContext
      try {
        micContext = new AudioContextClass({ sampleRate: 48000 })
      } catch {
        micContext = new AudioContextClass()
      }
      microphoneAudioContext = micContext

      if (micContext.state === 'suspended') {
        await micContext.resume()
      }

      microphoneAnalyser = micContext.createAnalyser()
      microphoneAnalyser.fftSize = 2048
      microphoneAnalyser.smoothingTimeConstant = 0.8

      microphoneSourceNode = micContext.createMediaStreamSource(stream)
      const micGain = micContext.createGain()
      micGain.gain.value = 1.0
      microphoneSourceNode.connect(micGain)
      micGain.connect(microphoneAnalyser)

      const silentGain = micContext.createGain()
      silentGain.gain.value = 0
      micGain.connect(silentGain)
      silentGain.connect(micContext.destination)

      return true
    } catch (error) {
      console.error('[AudioEngine] Fehler beim Setup des Mikrofons:', error)
      audioSourceStore.setError('microphoneStartFailed', (error as Error | undefined)?.message)
      return false
    }
  }

  function disconnectMicrophoneSource() {
    if (microphoneSourceNode) {
      try {
        microphoneSourceNode.disconnect()
      } catch {
        // Aufräumen: Node/Context ist evtl. schon getrennt oder geschlossen
      }
      microphoneSourceNode = null
    }
    if (microphoneAudioContext) {
      try {
        void microphoneAudioContext.close()
      } catch {
        // Aufräumen: Node/Context ist evtl. schon getrennt oder geschlossen
      }
      microphoneAudioContext = null
      microphoneAnalyser = null
    }
    audioSourceStore.stopMicrophone()
  }

  async function switchAudioSource(sourceType: 'player' | 'microphone'): Promise<boolean> {
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
      } catch {
        // Aufräumen: Node/Context ist evtl. schon getrennt oder geschlossen
      }
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
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      micRecordingStream = stream
      const audioTracks = stream.getAudioTracks()
      if (!audioTracks.length || (audioTracks[0] as MediaStreamTrack).readyState !== 'live') {
        return false
      }

      // audioContext/micRecordingGain sind oben geprüft (await dazwischen)
      micRecordingSourceNode = (audioContext as AudioContext).createMediaStreamSource(stream)
      micRecordingSourceNode.connect(micRecordingGain as GainNode)
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
      } catch {
        // Aufräumen: Node/Context ist evtl. schon getrennt oder geschlossen
      }
      micRecordingSourceNode = null
    }
    if (micRecordingStream) {
      micRecordingStream.getTracks().forEach((t) => t.stop())
      micRecordingStream = null
    }
  }

  async function toggleRecordingMicrophone(enable: boolean): Promise<boolean> {
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
      ;(recordingGain as GainNode).gain.value = ACTIVE_GAIN
      ;(micRecordingGain as GainNode).gain.value = ACTIVE_GAIN
    } else {
      recordingGain.gain.value = ACTIVE_GAIN
      micRecordingGain.gain.value = SILENT_GAIN
      disconnectMicrophoneSource()
      audioSourceStore.setSourceType('player')
    }

    return true
  }

  function connectVideoToRecording(videoElement: HTMLMediaElement, volume = 1): boolean {
    if (videoSourceNodes.has(videoElement)) return true

    if (!audioContext) {
      audioContext = new (AudioContextClassOf())()
    }
    const ctx = audioContext

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    if (!recordingMixer) {
      recordingMixer = ctx.createGain()
      recordingMixer.gain.value = 1
      if (!recordingDest) recordingDest = ctx.createMediaStreamDestination()
      recordingMixer.connect(recordingDest)
    }
    const mixer = recordingMixer

    try {
      if (!videoRecordingGain) {
        videoRecordingGain = ctx.createGain()
        videoRecordingGain.gain.value = ACTIVE_GAIN
        videoRecordingGain.connect(mixer)
      }

      const videoSource = ctx.createMediaElementSource(videoElement)
      const gainNode = ctx.createGain()
      gainNode.gain.value = volume
      videoSource.connect(gainNode)
      gainNode.connect(ctx.destination)
      gainNode.connect(videoRecordingGain)
      // Analyse hinter der Lautstärke: ausgewertet wird, was man vom Video hört
      if (videoAnalysisGain) gainNode.connect(videoAnalysisGain)
      videoSourceNodes.set(videoElement, { sourceNode: videoSource, gainNode })
      return true
    } catch (error) {
      console.error('[AudioEngine] Fehler beim Verbinden des Video-Audios:', error)
      return false
    }
  }

  function disconnectVideoFromRecording(videoElement: HTMLMediaElement) {
    const nodes = videoSourceNodes.get(videoElement)
    if (!nodes) return
    try {
      nodes.gainNode.disconnect()
      videoSourceNodes.delete(videoElement)
    } catch {
      // Aufräumen: Node/Context ist evtl. schon getrennt oder geschlossen
    }
  }

  function setVideoVolume(videoElement: HTMLMediaElement, volume: number) {
    const nodes = videoSourceNodes.get(videoElement)
    if (nodes?.gainNode) nodes.gainNode.gain.value = volume
  }

  /**
   * Liefert den Audio-Stream für den Recorder.
   * @param options withMic=false verbindet das Mikrofon
   *   nicht (kein getUserMedia) – für die Initialisierung beim Seitenaufruf. Jede
   *   Aufnahme holt vor dem Start ohnehin einen frischen Stream mit Mikrofon.
   */
  async function createCombinedAudioStream({
    withMic = true,
  }: { withMic?: boolean } = {}): Promise<MediaStream | null> {
    if (!recordingDest) return null
    const dest = recordingDest

    // Wie in der JS-Version: recordingDest existiert nur mit audioContext und
    // (nach setupAudioContext) den Gain-Knoten.
    if ((audioContext as AudioContext).state === 'suspended') {
      ;(audioContext as AudioContext).resume().catch(() => {})
    }

    if (!withMic) {
      ;(recordingGain as GainNode).gain.value = ACTIVE_GAIN
      return dest.stream
    }

    const micConnected = await connectMicToRecordingChain()
    if (!micConnected) {
      console.warn('[AudioEngine] Mic-Pfad nicht verbunden - Live-Umschaltung nicht möglich')
    }

    ;(recordingGain as GainNode).gain.value = ACTIVE_GAIN
    ;(micRecordingGain as GainNode).gain.value = ACTIVE_GAIN
    await new Promise((r) => setTimeout(r, 300))
    ;(recordingGain as GainNode).gain.value = ACTIVE_GAIN
    ;(micRecordingGain as GainNode).gain.value = SILENT_GAIN

    return dest.stream
  }

  let unregisterEngine: (() => void) | null = null

  function cleanup() {
    unregisterEngine?.()
    unregisterEngine = null
    disconnectMicFromRecordingChain()
    disconnectMicrophoneSource()
    if (audioContext) {
      try {
        void audioContext.close()
      } catch {
        // Aufräumen: Node/Context ist evtl. schon getrennt oder geschlossen
      }
    }
  }

  /** Meldet die Engine bei lib/audioEngineBridge.js an (Zugriff über getAudioEngine()). */
  function registerEngine() {
    const api: AudioEngineApi = {
      switchAudioSource,
      toggleRecordingMicrophone,
      connectVideoToRecording,
      disconnectVideoFromRecording,
      setVideoVolume,
      getAudioStreamForRecorder: createCombinedAudioStream,
      setBassGain,
      setTrebleGain,
    }
    unregisterEngine?.()
    unregisterEngine = registerAudioEngine(api)
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
    registerEngine,
    getAnalyser,
    getMicrophoneAnalyser,
    getMicrophoneAudioContext,
    getAudioContext,
    isVideoAudioPlaying,
  }
}
