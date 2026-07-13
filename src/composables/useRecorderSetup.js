/**
 * useRecorderSetup - wires the offscreen recording canvas to the recorder store.
 *
 * The recording canvas and its capture stream live in the parent component
 * (they are shared with the render loop and the visualizer loop); this
 * composable owns the behaviour around them: the captureStream monkey-patch
 * that seeds the first frame, recorder initialization, the global stream
 * accessor, and the start/stop transition when recording toggles.
 *
 * @param {Object} deps
 * @param {import('vue').Ref} deps.canvasRef
 * @param {import('vue').Ref} deps.audioRef
 * @param {Object} deps.audioEngine
 * @param {Object} deps.recorderStore
 * @param {Object} deps.audioSourceStore
 * @param {import('vue').Ref} deps.canvasManagerInstance
 * @param {Object} deps.renderLoop - accessed lazily (defined before this composable)
 * @param {()=>void} deps.startVisualizerLoop
 * @param {()=>void} deps.stopVisualizerLoop
 * @param {()=>HTMLCanvasElement} deps.getRecordingCanvas
 * @param {(c:HTMLCanvasElement)=>void} deps.setRecordingCanvas
 * @param {()=>MediaStream|null} deps.getRecordingCanvasStream
 * @param {(s:MediaStream|null)=>void} deps.setRecordingCanvasStream
 */
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
}) {
  function applyRecordingCanvasMonkeyPatch(canvas) {
    const originalCaptureStream = canvas.captureStream.bind(canvas)
    canvas.captureStream = function (frameRate) {
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

    const combinedAudioStream = await audioEngine.createCombinedAudioStream()
    if (!combinedAudioStream) {
      console.error('[App] Audio Stream fehlgeschlagen!')
      return
    }

    const canvasStream = recordingCanvas.captureStream(60)
    const combinedMediaStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...combinedAudioStream.getAudioTracks(),
    ])

    recorderStore.setRecorderRefs(recordingCanvas, audio, combinedMediaStream, null)
  }

  function exposeRecorderGlobals() {
    window.getCanvasStreamForRecorder = function () {
      const existingStream = getRecordingCanvasStream()
      if (existingStream) {
        existingStream.getTracks().forEach((track) => track.stop())
      }
      const stream = getRecordingCanvas().captureStream(0)
      setRecordingCanvasStream(stream)
      return stream
    }
  }

  function handleRecordingStateChange(isRecording) {
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
    exposeRecorderGlobals,
    handleRecordingStateChange,
  }
}
