export function useVisualizerLoop({ getRecordingCanvasStream, setRecordingCanvasStream }) {
  // NOTE: Recording frames are driven by the Recorder's own frame requester
  // (recorder.js → 'recorder:forceRedraw' → renderRecordingScene). A previous
  // implementation ran an extra requestAnimationFrame loop here that rendered
  // nothing — it only burned main-thread cycles during recording. That loop is
  // gone; this composable now only owns tearing down the recording canvas
  // stream when recording stops.

  function startVisualizerLoop() {
    // No-op: kept so existing call sites (recorder setup / VisualizerApp) work.
    // The recorder drives its own continuous frame requests.
  }

  function stopVisualizerLoop() {
    const stream = getRecordingCanvasStream()
    if (stream) {
      try {
        stream.getTracks().forEach((track) => {
          if (track.readyState !== 'ended') track.stop()
        })
        setRecordingCanvasStream(null)
      } catch (error) {
        console.error('[VisualizerLoop] Fehler beim Cleanup des Canvas-Streams:', error)
      }
    }
  }

  return { startVisualizerLoop, stopVisualizerLoop }
}
