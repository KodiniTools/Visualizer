export function useVisualizerLoop({ getRecordingCanvasStream, setRecordingCanvasStream }) {
  let visualizerAnimationId = null
  let isVisualizerActive = false
  let loopStartCount = 0

  function startVisualizerLoopInternal() {
    isVisualizerActive = true

    const renderFrame = () => {
      if (!isVisualizerActive) {
        visualizerAnimationId = null
        return
      }
      if (isVisualizerActive) {
        visualizerAnimationId = requestAnimationFrame(renderFrame)
      }
    }

    renderFrame()
  }

  function startVisualizerLoop() {
    loopStartCount++
    if (isVisualizerActive || visualizerAnimationId) {
      stopVisualizerLoop()
      setTimeout(startVisualizerLoopInternal, 50)
      return
    }
    startVisualizerLoopInternal()
  }

  function stopVisualizerLoop() {
    isVisualizerActive = false

    if (visualizerAnimationId) {
      cancelAnimationFrame(visualizerAnimationId)
      visualizerAnimationId = null
    }

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
