/**
 * useRecorderSetup - wires the offscreen recording canvas to the recorder store.
 *
 * The recording canvas and its capture stream live in the parent component
 * (they are shared with the render loop and the visualizer loop); this
 * composable owns the behaviour around them: the captureStream monkey-patch
 * that seeds the first frame, recorder initialization, the global stream
 * accessor, and the start/stop transition when recording toggles.
 */

import type { Ref } from 'vue'
import type { useRecorderStore } from '../stores/recorderStore'
import type { useAudioSourceStore } from '../stores/audioSourceStore'
import type { CanvasManagerRef } from './types'

/** Teil der Audio-Engine (useAudioEngine), den das Recorder-Setup nutzt */
export interface RecorderSetupAudioEngine {
  createCombinedAudioStream: (options?: { withMic?: boolean }) => Promise<MediaStream | null>
  disconnectMicFromRecordingChain: () => void
  disconnectMicrophoneSource: () => void
}

/** Teil des Render-Loops (useRenderLoop), den das Recorder-Setup nutzt */
export interface RecorderSetupRenderLoop {
  renderRecordingScene: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    extra: null,
  ) => void
}

/** Abhängigkeiten von useRecorderSetup */
export interface RecorderSetupDeps {
  canvasRef: Ref<HTMLCanvasElement | null | undefined>
  audioRef: Ref<HTMLAudioElement | null | undefined>
  audioEngine: RecorderSetupAudioEngine
  recorderStore: ReturnType<typeof useRecorderStore>
  audioSourceStore: ReturnType<typeof useAudioSourceStore>
  canvasManagerInstance: CanvasManagerRef
  /** wird erst beim Aufruf gelesen (vor diesem Composable definiert) */
  renderLoop: RecorderSetupRenderLoop
  startVisualizerLoop: () => void
  stopVisualizerLoop: () => void
  getRecordingCanvas: () => HTMLCanvasElement
  setRecordingCanvas: (c: HTMLCanvasElement) => void
  getRecordingCanvasStream: () => MediaStream | null
  setRecordingCanvasStream: (s: MediaStream | null) => void
}

export function useRecorderSetup({
  canvasRef,
  audioRef,
  audioEngine,
  recorderStore,
  audioSourceStore,
  canvasManagerInstance,
  renderLoop,
  startVisualizerLoop,
  stopVisualizerLoop,
  getRecordingCanvas,
  setRecordingCanvas,
  getRecordingCanvasStream,
  setRecordingCanvasStream,
}: RecorderSetupDeps) {
  function applyRecordingCanvasMonkeyPatch(canvas: HTMLCanvasElement) {
    const originalCaptureStream = canvas.captureStream.bind(canvas)
    canvas.captureStream = function (frameRate?: number) {
      const existingStream = getRecordingCanvasStream()
      if (existingStream) {
        existingStream.getTracks().forEach((track) => {
          if (track.readyState !== 'ended') track.stop()
        })
      }

      const recordingCtx = canvas.getContext('2d')
      if (recordingCtx && canvasManagerInstance.value) {
        renderLoop.renderRecordingScene(recordingCtx, canvas.width, canvas.height, null)
      }

      const stream = originalCaptureStream(frameRate)
      setRecordingCanvasStream(stream)
      return stream
    }
  }

  async function initializeRecorder() {
    const canvas = canvasRef.value
    if (!canvas) return

    const recordingCanvas = getRecordingCanvas()
    recordingCanvas.width = canvas.width || 1920
    recordingCanvas.height = canvas.height || 1080
    applyRecordingCanvasMonkeyPatch(recordingCanvas)

    const audio = audioRef.value
    if (!audio) {
      console.error('[App] Audio Element nicht gefunden!')
      return
    }

    // Ohne Mikrofon: sonst fragt die Seite schon beim Aufruf nach der
    // Mikrofon-Berechtigung. recorderStore holt vor jeder Aufnahme einen
    // frischen Stream inkl. Mikrofon (getAudioEngine().getAudioStreamForRecorder).
    const combinedAudioStream = await audioEngine.createCombinedAudioStream({ withMic: false })
    if (!combinedAudioStream) {
      console.error('[App] Audio Stream fehlgeschlagen!')
      return
    }

    const canvasStream = recordingCanvas.captureStream(60)
    const combinedMediaStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...combinedAudioStream.getAudioTracks(),
    ])

    recorderStore.setRecorderRefs(recordingCanvas, audio, combinedMediaStream)
  }

  function handleRecordingStateChange(isRecording: boolean) {
    if (isRecording) {
      setTimeout(() => startVisualizerLoop(), 100)
      return
    }

    stopVisualizerLoop()

    audioEngine.disconnectMicFromRecordingChain()
    if (audioSourceStore.isMicrophoneActive) {
      audioEngine.disconnectMicrophoneSource()
      audioSourceStore.setSourceType('player')
    }

    // Recreate recording canvas after recording ends.
    const existingStream = getRecordingCanvasStream()
    if (existingStream) {
      existingStream.getTracks().forEach((track) => track.stop())
      setRecordingCanvasStream(null)
    }

    const canvas = canvasRef.value
    const fresh = document.createElement('canvas')
    fresh.width = canvas?.width || 1920
    fresh.height = canvas?.height || 1080
    setRecordingCanvas(fresh)
    applyRecordingCanvasMonkeyPatch(fresh)

    if (recorderStore.recorder) {
      recorderStore.recorder.updateCanvas(fresh)
    }
  }

  return {
    applyRecordingCanvasMonkeyPatch,
    initializeRecorder,
    handleRecordingStateChange,
  }
}
