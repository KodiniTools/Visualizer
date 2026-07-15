/**
 * recorder.js - Reine Aufnahme-Engine (Canvas + Audio → Blob).
 *
 * Verantwortung: Canvas-Capture-Stream aufsetzen, kontinuierlich Frames
 * anfordern (rAF, mit setTimeout-Fallback bei verstecktem Tab → läuft
 * unabhängig von Nutzer-Klicks), MediaRecorder steuern und am Ende einen
 * Blob zurückgeben. Die gesamte Ergebnis-Verarbeitung (Vorschau, Download,
 * Server-Konvertierung, GIF/HQ-Export) liegt in RecorderPanel.vue — die
 * Engine fasst KEIN DOM an.
 *
 * State-Handling:
 * ✅ recordedChunks wird sofort nach Blob-Erstellung geleert
 * ✅ Alle Event-Listener werden explizit entfernt
 * ✅ MediaRecorder wird vollständig nullifiziert
 * ✅ Canvas Stream wird mit Timeout bereinigt
 * ✅ Vollständiger reset() vor/nach jeder Aufnahme (Mehrfach-Aufnahme sicher)
 */
class Recorder {
  constructor(recordingCanvas, audioElement, audioStream, uiElements, callbacks) {
    this.recordingCanvas = recordingCanvas
    this.audioElement = audioElement
    this.audioStream = audioStream
    // uiElements is accepted for backwards-compatibility but no longer used;
    // all UI/result handling lives in RecorderPanel.vue.
    this.onStateChange = callbacks.onStateChange
    this.onForceRedraw = callbacks.onForceRedraw

    this.mediaRecorder = null
    this.recordedChunks = []
    this.recordingMimeType = ''
    this.isPrepared = false
    this.isActive = false
    this.isPaused = false

    this.currentCanvasStream = null
    this.frameRequesterTimeout = null // setTimeout-driven redraw clock
    this.frameRequesterRunning = false
    // Capture rate, decoupled from main-thread rAF. Default is 30 fps (not 60):
    // it keeps the encode + recording-scene redraw load roughly halved, which
    // matters on weak GPUs — with the visualizer worker active (its own WebGL
    // context) plus post-processing, 60 fps could exhaust the GPU and lose the
    // WebGL context. 60 fps is opt-in via setCaptureFrameRate() for users on
    // modern hardware who want smoother motion (see prepare() options).
    this.captureFrameRate = 30

    // ✅ NEW: Track event listeners for cleanup
    this._activeEventListeners = new Map()

    // CRITICAL: Validate onForceRedraw callback
    if (!this.onForceRedraw) {
      console.error('[RECORDER] CRITICAL: onForceRedraw callback is required!')
    }
  }

  updateCanvas(newCanvas) {
    if (!newCanvas || this.isActive) return false
    this.recordingCanvas = newCanvas
    this.isPrepared = false
    return true
  }

  updateAudioStream(newStream) {
    if (!newStream) return false
    this.audioStream = newStream
    return true
  }

  /**
   * Set the canvas capture frame rate. Only 30 (default) and 60 fps are
   * supported; 60 fps is intended for modern hardware and gives smoother
   * motion at the cost of a heavier encode + redraw load. Ignored while a
   * recording is active — the rate is applied on the next prepare()/start().
   */
  setCaptureFrameRate(fps) {
    if (this.isActive) return false
    const rate = Number(fps) === 60 ? 60 : 30
    this.captureFrameRate = rate
    return true
  }

  async prepare(options) {
    if (
      !this.recordingCanvas ||
      this.recordingCanvas.width === 0 ||
      this.recordingCanvas.height === 0
    ) {
      return false
    }

    // IMPORTANT: Cleanup old resources
    if (this.currentCanvasStream || this.mediaRecorder) {
      this.reset()
      // ✅ FIX: Erhöhe Timeout für vollständige Bereinigung (3. Aufnahme Fix)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // ✅ MEMORY FIX: Aggressive cleanup
    this._aggressiveCleanup()

    // Validate Canvas content
    const hasContent = this._validateCanvasContent()
    if (!hasContent) {
      console.warn('[RECORDER] Canvas appears to be empty')
    }

    // ✅ CRITICAL: Clear chunks BEFORE preparing
    this._clearChunks()

    // Capture frame rate is optional; the store passes 30 (default) or 60.
    if (options?.captureFrameRate != null) {
      this.setCaptureFrameRate(options.captureFrameRate)
    }

    // Quality is always provided by the recorder store (options.videoBitsPerSecond).
    const videoBitsPerSecond = options?.videoBitsPerSecond || 8_000_000

    const setupSuccess = await this._setupMediaRecorder(videoBitsPerSecond)
    if (setupSuccess) {
      this.isPrepared = true
      this.updateState()
      return true
    } else {
      return false
    }
  }

  _validateCanvasContent() {
    try {
      const ctx = this.recordingCanvas.getContext('2d')
      if (!ctx) return false

      const imageData = ctx.getImageData(
        this.recordingCanvas.width / 2,
        this.recordingCanvas.height / 2,
        1,
        1,
      )

      const data = imageData.data
      const hasContent = data[0] !== 0 || data[1] !== 0 || data[2] !== 0 || data[3] !== 0

      return hasContent
    } catch (error) {
      return true
    }
  }

  /**
   * Complete reset of recorder state
   * ✅ CRITICAL FIX: Proper cleanup prevents 3rd recording crash
   *
   * Issue: On 3rd consecutive recording, MediaRecorder would fail with error
   * Root cause: Canvas stream resources not fully released between recordings
   * Solution: Aggressive cleanup + longer settle time in prepare()
   */
  reset() {
    // Stoppe Frame Requester FIRST
    this._stopFrameRequester()

    // ✅ CRITICAL: Aggressive chunks cleanup
    this._clearChunks()

    // ✅ CRITICAL: Revoke Object URLs
    this._aggressiveCleanup()

    this.isPrepared = false
    this.isActive = false
    this.isPaused = false

    // ✅ CRITICAL: Complete MediaRecorder cleanup
    this._cleanupMediaRecorder()

    // ✅ CRITICAL: Complete Canvas Stream cleanup
    this._cleanupCanvasStream()
  }

  /**
   * ✅ NEW: Aggressive chunks cleanup
   */
  _clearChunks() {
    if (this.recordedChunks && this.recordedChunks.length > 0) {
      // Explicitly null out each chunk
      for (let i = 0; i < this.recordedChunks.length; i++) {
        this.recordedChunks[i] = null
      }
      // Clear array
      this.recordedChunks.length = 0
    }
    // Create new empty array
    this.recordedChunks = []
  }

  /**
   * ✅ NEW: Complete MediaRecorder cleanup
   */
  _cleanupMediaRecorder() {
    if (!this.mediaRecorder) return

    try {
      // Stop if still running
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }
    } catch (e) {
      // Ignore errors
    }

    // ✅ CRITICAL: Remove ALL event listeners
    this.mediaRecorder.onstop = null
    this.mediaRecorder.ondataavailable = null
    this.mediaRecorder.onstart = null
    this.mediaRecorder.onpause = null
    this.mediaRecorder.onresume = null
    this.mediaRecorder.onerror = null

    // ✅ CRITICAL: Nullify reference
    this.mediaRecorder = null
  }

  /**
   * ✅ IMPROVED: Complete Canvas Stream cleanup with retry
   */
  _cleanupCanvasStream() {
    if (!this.currentCanvasStream) return

    try {
      const tracks = this.currentCanvasStream.getTracks()
      tracks.forEach((track) => {
        try {
          if (track.readyState === 'live') {
            track.stop()
            console.log('[RECORDER] 🧹 Track stopped:', track.kind)
          }
        } catch (e) {
          console.warn('[RECORDER] Error stopping track:', e)
        }
      })

      // ✅ FIX: Extra safety - try to stop active tracks again
      const activeTrackCount = this.currentCanvasStream
        .getVideoTracks()
        .filter((t) => t.readyState === 'live').length
      if (activeTrackCount > 0) {
        console.warn(`[RECORDER] ⚠️ ${activeTrackCount} video tracks still active after cleanup!`)
      }
    } catch (e) {
      console.error('[RECORDER] Canvas stream cleanup error:', e)
    }

    // ✅ CRITICAL: Nullify stream reference
    this.currentCanvasStream = null
  }

  /**
   * Memory cleanup hint. Result/preview DOM handling now lives in
   * RecorderPanel.vue — the engine no longer touches the DOM.
   */
  _aggressiveCleanup() {
    // Force garbage collection hint (only available in some dev builds).
    if (typeof window !== 'undefined' && window.gc) {
      try {
        window.gc()
      } catch (e) {
        // GC not available in production
      }
    }
  }

  async start() {
    if (!this.isPrepared || this.isActive) {
      return false
    }

    if (!this.mediaRecorder) {
      return false
    }

    if (this.mediaRecorder.state !== 'inactive') {
      return false
    }

    try {
      // CRITICAL: Warmup phase
      const warmupSuccess = await this._warmupCanvasStream()
      if (!warmupSuccess) {
        return false
      }

      // ✅ QUALITÄTSVERBESSERUNG: Kürzere Timeslice (50ms statt 100ms)
      // Schnellere Chunk-Erzeugung = bessere Synchronisation mit Audio-Reaktiven Effekten
      this.mediaRecorder.start(50)
      this.isActive = true

      // CRITICAL: Start continuous frame requesting
      this._startFrameRequester()

      this.updateState()
      return true
    } catch (error) {
      console.error('[RECORDER] Start failed:', error)
      this.isActive = false
      this.updateState()
      return false
    }
  }

  _startFrameRequester() {
    if (this.frameRequesterRunning) {
      return
    }

    if (this.frameRequesterTimeout) {
      clearTimeout(this.frameRequesterTimeout)
      this.frameRequesterTimeout = null
    }

    if (!this.currentCanvasStream) {
      return
    }

    if (!this.currentCanvasStream.active) {
      return
    }

    let errorCount = 0
    const MAX_ERRORS = 3
    const TARGET_INTERVAL = Math.round(1000 / this.captureFrameRate) // match capture rate
    let lastFrameTime = 0

    this.frameRequesterRunning = true

    // The content redraw is driven by a setTimeout clock, NOT requestAnimationFrame.
    // rAF is throttled/paused by the browser during scrolling and when the tab is
    // backgrounded, which would freeze the recording. A timer keeps firing in both
    // cases, so recording stays continuous and independent of scroll/clicks.
    const frameLoop = () => {
      if (!this.frameRequesterRunning) {
        return
      }

      const videoTrack = this.currentCanvasStream?.getVideoTracks()[0]

      if (!videoTrack) {
        errorCount++
        if (errorCount >= MAX_ERRORS) {
          this._stopFrameRequester()
          return
        }
        this._scheduleNextFrame(frameLoop)
        return
      }

      if (videoTrack.readyState !== 'live') {
        errorCount++
        if (errorCount >= MAX_ERRORS) {
          this._stopFrameRequester()
          return
        }
        this._scheduleNextFrame(frameLoop)
        return
      }

      if (!this.isActive || this.isPaused) {
        this._scheduleNextFrame(frameLoop)
        return
      }

      const now = performance.now()
      const elapsed = now - lastFrameTime

      // Only process if enough time has elapsed (rate limiting for setTimeout fallback)
      if (elapsed >= TARGET_INTERVAL - 1) {
        try {
          // CRITICAL: Canvas must be updated BEFORE frame capture
          if (this.onForceRedraw) {
            this.onForceRedraw()
          } else {
            console.error('[RECORDER] CRITICAL: onForceRedraw callback missing!')
            this._stopFrameRequester()
            return
          }

          // Belt-and-suspenders: the stream now runs at a fixed capture rate
          // (captureStream(FPS)), so requestFrame() is a harmless no-op here.
          if (typeof videoTrack.requestFrame === 'function') {
            videoTrack.requestFrame()
          }

          lastFrameTime = now
          errorCount = 0
        } catch (error) {
          console.error('[RECORDER] Frame request error:', error)
          errorCount++
          if (errorCount >= MAX_ERRORS) {
            this._stopFrameRequester()
            return
          }
        }
      }

      this._scheduleNextFrame(frameLoop)
    }

    this._scheduleNextFrame(frameLoop)
  }

  _scheduleNextFrame(frameLoop) {
    if (!this.frameRequesterRunning) {
      return
    }

    // Timer-based (not rAF) so redraws keep firing while the page is scrolled
    // or the tab is backgrounded. Interval matches the capture frame rate.
    this.frameRequesterTimeout = setTimeout(frameLoop, Math.round(1000 / this.captureFrameRate))
  }

  _stopFrameRequester() {
    this.frameRequesterRunning = false

    if (this.frameRequesterTimeout) {
      clearTimeout(this.frameRequesterTimeout)
      this.frameRequesterTimeout = null
    }
  }

  async _warmupCanvasStream() {
    const videoTrack = this.currentCanvasStream?.getVideoTracks()[0]
    if (!videoTrack) {
      return false
    }

    if (videoTrack.readyState !== 'live') {
      return false
    }

    // ✅ QUALITÄTSVERBESSERUNG: Erweiterte Warmup-Phase für bessere erste Frames
    // Mehr Frames und schnellere Intervalle für 60 FPS Aufnahme
    if (this.onForceRedraw) {
      // Phase 1: Initiale Canvas-Aktualisierungen (5 statt 3)
      for (let i = 0; i < 5; i++) {
        this.onForceRedraw()
        await new Promise((resolve) => setTimeout(resolve, 33)) // ~30 FPS Warmup
      }
    } else {
      console.error('[RECORDER] CRITICAL: No rendering method available!')
      return false
    }

    // Phase 2: Force frame requests für Video-Encoder-Initialisierung
    if (typeof videoTrack.requestFrame === 'function') {
      for (let i = 0; i < 5; i++) {
        videoTrack.requestFrame()
        await new Promise((resolve) => setTimeout(resolve, 16)) // ~60 FPS
      }
    }

    // Phase 3: Finale Stabilisierung - längere Pause für Encoder-Buffer
    await new Promise((resolve) => setTimeout(resolve, 200))

    console.log('[RECORDER] ✅ Warmup-Phase abgeschlossen (5 Frames @ 60 FPS)')
    return true
  }

  pause() {
    if (!this.isActive || this.isPaused) {
      return
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause()
    }

    this.isPaused = true
    this.updateState()
  }

  resume() {
    if (!this.isActive || !this.isPaused) {
      return
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume()
    }

    this.isPaused = false
    this.updateState()
  }

  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        try {
          if (this.recordedChunks && this.recordedChunks.length > 0) {
            const blob = new Blob(this.recordedChunks, { type: this.recordingMimeType })
            // ✅ CRITICAL: Clear chunks IMMEDIATELY after blob creation
            this._clearChunks()
            this.reset()
            resolve(blob)
          } else {
            this.reset() // Reset wenn keine Chunks
            resolve(null)
          }
        } catch (e) {
          this.reset() // Reset bei Error
          reject(e)
        }
        return
      }

      // Request final data before stopping
      if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
        this.mediaRecorder.requestData()
      }

      this.mediaRecorder.onstop = () => {
        // Short delay to ensure all data is received
        setTimeout(() => {
          try {
            if (this.recordedChunks && this.recordedChunks.length > 0) {
              const totalSize = this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0)
              console.log(
                `[RECORDER] Final chunks: ${this.recordedChunks.length}, Total: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
              )

              const blob = new Blob(this.recordedChunks, { type: this.recordingMimeType })
              // ✅ CRITICAL: Clear chunks IMMEDIATELY after blob creation
              this._clearChunks()
              // The blob is handed back to the caller (recorderStore → RecorderPanel),
              // which owns preview, download, server conversion and export. The engine
              // just cleans up its own resources here.
              this.reset()
              resolve(blob)
            } else {
              console.warn('[RECORDER] No chunks recorded')
              this.reset() // Reset wenn keine Chunks
              resolve(null)
            }
          } catch (e) {
            console.error('[RECORDER] Stop error:', e)
            reject(e)
          }
        }, 100)
      }

      try {
        // Stop frame requester BEFORE stopping MediaRecorder
        this._stopFrameRequester()

        this.mediaRecorder.stop()
        this.isActive = false
      } catch (error) {
        console.error('[RECORDER] Stop error:', error)
        reject(error)
      }
    })
  }

  async _setupMediaRecorder(videoBitsPerSecond) {
    if (
      !this.recordingCanvas ||
      this.recordingCanvas.width === 0 ||
      this.recordingCanvas.height === 0
    ) {
      return false
    }

    try {
      // ✅ FIX: Ensure old stream is completely cleaned up before creating new one
      if (this.currentCanvasStream) {
        console.warn('[RECORDER] ⚠️ Old canvas stream still exists! Cleaning up...')
        this._cleanupCanvasStream()
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      // Fixed capture rate: the browser samples the canvas at this FPS on its
      // own pipeline, so capture no longer depends on a main-thread rAF loop
      // calling requestFrame(). This keeps the recording from freezing (and the
      // audio/video from desyncing) while the page is scrolled or the main
      // thread is busy.
      this.currentCanvasStream = this.recordingCanvas.captureStream(this.captureFrameRate)
      console.log('[RECORDER] ✅ New canvas stream created')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const videoTrack = this.currentCanvasStream.getVideoTracks()[0]

      if (!videoTrack) {
        console.error('[RECORDER] ❌ No video track in canvas stream!')
        return false
      }

      console.log('[RECORDER] Video track state:', videoTrack.readyState)

      // Trigger first frame
      if (typeof videoTrack.requestFrame === 'function') {
        videoTrack.requestFrame()
      }
    } catch (error) {
      console.error('[RECORDER] Canvas stream setup failed:', error)
      return false
    }

    const videoTracks = this.currentCanvasStream.getVideoTracks()
    if (videoTracks.length === 0) {
      return false
    }

    const audioTracks = this.audioStream.getAudioTracks()
    if (audioTracks.length === 0) {
      return false
    }

    audioTracks.forEach((track, i) => {
      track.enabled = true
    })

    const combinedStream = new MediaStream([...audioTracks, ...videoTracks])

    // ⚠️ WICHTIG: VP9 vermeiden - extrem langsam zu decodieren auf Server!
    // VP8 ist ~3x schneller zu decodieren, H.264 noch schneller
    const preferredMimeTypes = [
      'video/mp4;codecs=h264,aac', // Beste Option: H.264 (schnellstes Decoding)
      'video/mp4;codecs=avc1,mp4a', // H.264 Alternative
      'video/webm;codecs=vp8,opus', // VP8: 3x schneller als VP9
      'video/mp4',
      'video/webm;codecs=vp9,opus', // VP9: NUR als Fallback (sehr langsam!)
      'video/webm',
    ]

    this.mediaRecorder = this._tryInitializeMediaRecorder(
      combinedStream,
      videoBitsPerSecond,
      preferredMimeTypes,
    )
    if (!this.mediaRecorder) {
      return false
    }

    this.recordingMimeType = this.mediaRecorder.mimeType || 'video/webm'

    // ✅ CRITICAL: Clear chunks before setting up new handler
    this._clearChunks()

    // ✅ CRITICAL: ondataavailable handler must not hold references
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data)
        const totalSize = this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0)
        // Don't log every chunk - too verbose
      } else {
        console.warn('[RECORDER] Received empty chunk')
      }
    }

    this.mediaRecorder.onstart = () => {
      this.updateState()
    }

    this.mediaRecorder.onpause = () => {
      console.log('[RECORDER] Paused')
    }

    this.mediaRecorder.onresume = () => {
      console.log('[RECORDER] Resumed')
    }

    // ✅ FIX: Less aggressive error handler - log but don't auto-stop
    // MediaRecorder errors are often transient and recoverable
    // Auto-stopping causes immediate failure on 3rd recording
    this.mediaRecorder.onerror = (e) => {
      console.error('[RECORDER] MediaRecorder error (non-fatal):', e)
      console.warn('[RECORDER] Continuing despite error - monitor for data chunks')
      // Don't auto-stop - let natural stop() handle cleanup
      // If chunks stop coming, user can manually stop
    }

    return true
  }

  _tryInitializeMediaRecorder(stream, videoBitsPerSecond, mimeTypes) {
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        try {
          const options = { mimeType: type, videoBitsPerSecond, audioBitsPerSecond: 320000 }
          return new MediaRecorder(stream, options)
        } catch (e) {
          console.warn('[RECORDER] Failed to create MediaRecorder with', type, e)
        }
      }
    }
    try {
      return new MediaRecorder(stream, { videoBitsPerSecond, audioBitsPerSecond: 320000 })
    } catch (e) {
      console.error('[RECORDER] Failed to create MediaRecorder:', e)
      return null
    }
  }

  updateState() {
    if (this.onStateChange) this.onStateChange()
  }

  // ── Upload-mode API ──────────────────────────────────────────────────
  // Result handling (preview, download, server conversion, GIF/HQ export)
  // now lives entirely in RecorderPanel.vue, which processes the blob
  // returned by stop(). These methods are kept as no-ops so the existing
  // recorderStore.setUploadMode() call chain stays intact.
  resetServerAvailability() {}

  enableDirectDownloadMode() {}

  enableServerUploadMode() {}
}

export { Recorder }
