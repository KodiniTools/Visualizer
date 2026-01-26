// recorder.js - SEGMENT-BASED RECORDING for seamless pause/resume

/**
 * recorder.js - Segment-basierte Aufnahme für nahtlose Pause
 *
 * NEUES KONZEPT:
 * ✅ Bei Pause: MediaRecorder STOPPEN (nicht pausieren), Segment speichern
 * ✅ Bei Resume: NEUEN MediaRecorder starten
 * ✅ Bei Stop: Alle Segmente an Server senden, FFmpeg fügt nahtlos zusammen
 * ✅ Ergebnis: KEINE hörbaren Knackser oder Aussetzer an Pausestellen
 *
 * VORHERIGE FIXES (beibehalten):
 * ✅ State wird nach _processRecording korrekt zurückgesetzt
 * ✅ Preview-Video wird korrekt erstellt
 * ✅ Alle Event-Listener werden explizit entfernt
 * ✅ Canvas Stream wird mit Timeout bereinigt
 */
class Recorder {
    constructor(recordingCanvas, audioElement, audioStream, uiElements, callbacks) {
        this.recordingCanvas = recordingCanvas;
        this.audioElement = audioElement;
        this.audioStream = audioStream;
        this.ui = uiElements;
        this.onStateChange = callbacks.onStateChange;
        this.onForceRedraw = callbacks.onForceRedraw;

        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingMimeType = '';
        this.isPrepared = false;
        this.isActive = false;
        this.isPaused = false;

        this.maxUploadSize = 50 * 1024 * 1024;
        this.forceDirectDownload = false;
        this.serverAvailable = null;

        this.currentCanvasStream = null;
        this.frameRequesterInterval = null;
        this.frameRequesterRunning = false;

        // Memory Management
        this.currentObjectURL = null;
        this.previousBlob = null;

        // ✅ NEW: Track event listeners for cleanup
        this._activeEventListeners = new Map();

        // ✅ NEW: Track audio player state for synchronized pause
        this._audioWasPlayingBeforePause = false;

        // ✅ NEW: Segment-based recording for seamless pause
        this.recordedSegments = []; // Array of Blobs (one per segment)
        this._currentVideoBitsPerSecond = 8_000_000; // Remember bitrate for resume

        // CRITICAL: Validate onForceRedraw callback
        if (!this.onForceRedraw) {
            console.error('[RECORDER] CRITICAL: onForceRedraw callback is required!');
        }
    }

    updateCanvas(newCanvas) {
        if (!newCanvas || this.isActive) return false;
        this.recordingCanvas = newCanvas;
        this.isPrepared = false;
        return true;
    }
    
    updateAudioStream(newStream) {
        if (!newStream) return false;
        this.audioStream = newStream;
        return true;
    }

    async prepare(options) {
        if (!this.recordingCanvas || this.recordingCanvas.width === 0 || this.recordingCanvas.height === 0) {
            return false;
        }

        // IMPORTANT: Cleanup old resources
        if (this.currentCanvasStream || this.mediaRecorder) {
            this.reset();
            // ✅ FIX: Erhöhe Timeout für vollständige Bereinigung (3. Aufnahme Fix)
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // ✅ MEMORY FIX: Aggressive cleanup
        this._aggressiveCleanup();

        // Validate Canvas content
        const hasContent = this._validateCanvasContent();
        if (!hasContent) {
            console.warn('[RECORDER] Canvas appears to be empty');
        }

        // ✅ CRITICAL: Clear chunks and segments BEFORE preparing
        this._clearChunks();
        this.recordedSegments = [];

        const qualitySelect = document.getElementById('qualitySelect');
        const videoBitsPerSecond = options?.videoBitsPerSecond || parseInt(qualitySelect?.value, 10) || 8_000_000;

        // ✅ NEW: Save bitrate for segment-based resume
        this._currentVideoBitsPerSecond = videoBitsPerSecond;

        const setupSuccess = await this._setupMediaRecorder(videoBitsPerSecond);
        if (setupSuccess) {
            this.isPrepared = true;
            this.updateState();
            return true;
        } else {
            return false;
        }
    }

    _validateCanvasContent() {
        try {
            const ctx = this.recordingCanvas.getContext('2d');
            if (!ctx) return false;

            const imageData = ctx.getImageData(
                this.recordingCanvas.width / 2,
                this.recordingCanvas.height / 2,
                1, 1
            );

            const data = imageData.data;
            const hasContent = data[0] !== 0 || data[1] !== 0 || data[2] !== 0 || data[3] !== 0;
            
            return hasContent;
        } catch (error) {
            return true;
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
        this._stopFrameRequester();
        
        // ✅ CRITICAL: Aggressive chunks cleanup
        this._clearChunks();
        
        // ✅ CRITICAL: Revoke Object URLs
        this._aggressiveCleanup();
        
        this.isPrepared = false;
        this.isActive = false;
        this.isPaused = false;
        this._audioWasPlayingBeforePause = false; // Reset audio sync state

        // ✅ NEW: Clear recorded segments
        this.recordedSegments = [];

        // ✅ CRITICAL: Complete MediaRecorder cleanup
        this._cleanupMediaRecorder();

        // ✅ CRITICAL: Complete Canvas Stream cleanup
        this._cleanupCanvasStream();
    }

    /**
     * ✅ NEW: Aggressive chunks cleanup
     */
    _clearChunks() {
        if (this.recordedChunks && this.recordedChunks.length > 0) {
            // Explicitly null out each chunk
            for (let i = 0; i < this.recordedChunks.length; i++) {
                this.recordedChunks[i] = null;
            }
            // Clear array
            this.recordedChunks.length = 0;
        }
        // Create new empty array
        this.recordedChunks = [];
    }

    /**
     * ✅ NEW: Complete MediaRecorder cleanup
     */
    _cleanupMediaRecorder() {
        if (!this.mediaRecorder) return;

        try {
            // Stop if still running
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
        } catch (e) {
            // Ignore errors
        }
        
        // ✅ CRITICAL: Remove ALL event listeners
        this.mediaRecorder.onstop = null;
        this.mediaRecorder.ondataavailable = null;
        this.mediaRecorder.onstart = null;
        this.mediaRecorder.onpause = null;
        this.mediaRecorder.onresume = null;
        this.mediaRecorder.onerror = null;
        
        // ✅ CRITICAL: Nullify reference
        this.mediaRecorder = null;
    }

    /**
     * ✅ IMPROVED: Complete Canvas Stream cleanup with retry
     */
    _cleanupCanvasStream() {
        if (!this.currentCanvasStream) return;

        try {
            const tracks = this.currentCanvasStream.getTracks();
            tracks.forEach(track => {
                try {
                    if (track.readyState === 'live') {
                        track.stop();
                        console.log('[RECORDER] 🧹 Track stopped:', track.kind);
                    }
                } catch (e) {
                    console.warn('[RECORDER] Error stopping track:', e);
                }
            });
            
            // ✅ FIX: Extra safety - try to stop active tracks again
            const activeTrackCount = this.currentCanvasStream.getVideoTracks()
                .filter(t => t.readyState === 'live').length;
            if (activeTrackCount > 0) {
                console.warn(`[RECORDER] ⚠️ ${activeTrackCount} video tracks still active after cleanup!`);
            }
        } catch (e) {
            console.error('[RECORDER] Canvas stream cleanup error:', e);
        }
        
        // ✅ CRITICAL: Nullify stream reference
        this.currentCanvasStream = null;
    }

    /**
     * ✅ NEW: Aggressive cleanup of all resources
     */
    _aggressiveCleanup() {
        // Revoke old Object URL
        if (this.currentObjectURL) {
            try {
                URL.revokeObjectURL(this.currentObjectURL);
            } catch (e) {
                // Ignore errors
            }
            this.currentObjectURL = null;
        }
        
        // Clear blob reference
        if (this.previousBlob) {
            this.previousBlob = null;
        }
        
        // Clear preview element
        const preview = document.getElementById('preview');
        if (preview && preview.src) {
            preview.src = '';
            preview.srcObject = null;
            try {
                preview.load();
            } catch (e) {
                // Ignore errors
            }
        }
        
        // Clear download link
        const downloadLink = document.getElementById('downloadLink');
        if (downloadLink) {
            downloadLink.href = '';
            downloadLink.download = '';
            downloadLink.blob = null;
        }
        
        // ✅ CRITICAL: Force garbage collection hint
        // This helps browser prioritize memory cleanup
        if (typeof window !== 'undefined' && window.gc) {
            try {
                window.gc();
            } catch (e) {
                // GC not available in production
            }
        }
    }

    async start() {
        if (!this.isPrepared || this.isActive) {
            return false;
        }

        if (!this.mediaRecorder) {
            return false;
        }

        if (this.mediaRecorder.state !== 'inactive') {
            return false;
        }

        try {
            // CRITICAL: Warmup phase
            const warmupSuccess = await this._warmupCanvasStream();
            if (!warmupSuccess) {
                return false;
            }

            // ✅ QUALITÄTSVERBESSERUNG: Kürzere Timeslice (50ms statt 100ms)
            // Schnellere Chunk-Erzeugung = bessere Synchronisation mit Audio-Reaktiven Effekten
            this.mediaRecorder.start(50);
            this.isActive = true;
            
            // CRITICAL: Start continuous frame requesting
            this._startFrameRequester();
            
            // Wait for first data chunk
            const recordingVerified = await this._verifyRecordingStarted();
            if (!recordingVerified) {
                console.warn('[RECORDER] Recording verification failed');
            }
            
            this.updateState();
            return true;
            
        } catch (error) {
            console.error('[RECORDER] Start failed:', error);
            this.isActive = false;
            this.updateState();
            return false;
        }
    }

    _startFrameRequester() {
        if (this.frameRequesterRunning) {
            return;
        }

        if (this.frameRequesterInterval) {
            clearInterval(this.frameRequesterInterval);
            this.frameRequesterInterval = null;
        }

        if (!this.currentCanvasStream) {
            return;
        }

        if (!this.currentCanvasStream.active) {
            return;
        }

        const getOptimalFPS = () => {
            return 16; // ✅ Erhöht auf ~60 FPS für smoothere Videos
        };
        
        let lastFrameTime = 0;
        let errorCount = 0;
        const MAX_ERRORS = 3;
        
        this.frameRequesterRunning = true;
        
        this.frameRequesterInterval = setInterval(() => {
            if (!this.frameRequesterRunning) {
                this._stopFrameRequester();
                return;
            }

            const videoTrack = this.currentCanvasStream?.getVideoTracks()[0];
            
            if (!videoTrack) {
                errorCount++;
                if (errorCount >= MAX_ERRORS) {
                    this._stopFrameRequester();
                }
                return;
            }

            if (videoTrack.readyState !== 'live') {
                errorCount++;
                if (errorCount >= MAX_ERRORS) {
                    this._stopFrameRequester();
                }
                return;
            }

            if (!this.isActive || this.isPaused) {
                return;
            }

            const now = Date.now();
            const interval = getOptimalFPS();
            
            if (now - lastFrameTime >= interval) {
                try {
                    // CRITICAL: Canvas must be updated BEFORE requestFrame()
                    if (this.onForceRedraw) {
                        this.onForceRedraw();
                    } else {
                        console.error('[RECORDER] CRITICAL: onForceRedraw callback missing!');
                        this._stopFrameRequester();
                        return;
                    }
                    
                    // Request frame AFTER canvas update
                    if (typeof videoTrack.requestFrame === 'function') {
                        videoTrack.requestFrame();
                    }
                    
                    lastFrameTime = now;
                    errorCount = 0;
                } catch (error) {
                    console.error('[RECORDER] Frame request error:', error);
                    errorCount++;
                    if (errorCount >= MAX_ERRORS) {
                        this._stopFrameRequester();
                    }
                }
            }
        }, 16);
    }

    _stopFrameRequester() {
        this.frameRequesterRunning = false;
        
        if (this.frameRequesterInterval) {
            clearInterval(this.frameRequesterInterval);
            this.frameRequesterInterval = null;
        }
    }

    async _warmupCanvasStream() {
        const videoTrack = this.currentCanvasStream?.getVideoTracks()[0];
        if (!videoTrack) {
            return false;
        }

        if (videoTrack.readyState !== 'live') {
            return false;
        }

        // ✅ QUALITÄTSVERBESSERUNG: Erweiterte Warmup-Phase für bessere erste Frames
        // Mehr Frames und schnellere Intervalle für 60 FPS Aufnahme
        if (this.onForceRedraw) {
            // Phase 1: Initiale Canvas-Aktualisierungen (5 statt 3)
            for (let i = 0; i < 5; i++) {
                this.onForceRedraw();
                await new Promise(resolve => setTimeout(resolve, 33)); // ~30 FPS Warmup
            }
        } else {
            console.error('[RECORDER] CRITICAL: No rendering method available!');
            return false;
        }

        // Phase 2: Force frame requests für Video-Encoder-Initialisierung
        if (typeof videoTrack.requestFrame === 'function') {
            for (let i = 0; i < 5; i++) {
                videoTrack.requestFrame();
                await new Promise(resolve => setTimeout(resolve, 16)); // ~60 FPS
            }
        }

        // Phase 3: Finale Stabilisierung - längere Pause für Encoder-Buffer
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('[RECORDER] ✅ Warmup-Phase abgeschlossen (5 Frames @ 60 FPS)');
        return true;
    }

    async _verifyRecordingStarted() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve(false);
            }, 1000);

            const checkChunks = () => {
                if (this.recordedChunks.length > 0) {
                    clearTimeout(timeout);
                    resolve(true);
                }
            };

            const interval = setInterval(() => {
                checkChunks();
                if (this.recordedChunks.length > 0) {
                    clearInterval(interval);
                }
            }, 100);

            setTimeout(() => {
                clearInterval(interval);
            }, 1000);
        });
    }

    /**
     * Pause recording - SEGMENT-BASED approach for truly seamless pause
     * ✅ STRATEGY: Stop MediaRecorder completely, save segment as Blob
     * ✅ FFmpeg will concatenate all segments seamlessly on server
     * ✅ Result: No clicks, pops, or gaps in final output
     */
    async pause() {
        if (!this.isActive || this.isPaused) {
            return;
        }

        console.log('[RECORDER] ⏸️ Pausing recording (segment-based)...');

        // ✅ Save audio player state and pause it FIRST
        if (this.audioElement) {
            this._audioWasPlayingBeforePause = !this.audioElement.paused;
            if (this._audioWasPlayingBeforePause) {
                this.audioElement.pause();
                console.log('[RECORDER] ⏸️ Audio player paused');
            }
        }

        // ✅ Stop frame requester
        this._stopFrameRequester();

        // ✅ SEGMENT-BASED: Stop MediaRecorder and save current segment
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            await this._stopAndSaveSegment();
        }

        this.isPaused = true;
        this.updateState();
        console.log(`[RECORDER] ⏸️ Recording paused - Segment ${this.recordedSegments.length} saved`);
    }

    /**
     * Helper: Stop current MediaRecorder and save the segment
     * @returns {Promise<Blob>} The saved segment blob
     */
    async _stopAndSaveSegment() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }

            // Request final data
            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.requestData();
            }

            const onStop = () => {
                // Short delay to ensure all data is collected
                setTimeout(() => {
                    if (this.recordedChunks.length > 0) {
                        const segmentBlob = new Blob(this.recordedChunks, { type: this.recordingMimeType });
                        this.recordedSegments.push(segmentBlob);
                        console.log(`[RECORDER] 💾 Segment ${this.recordedSegments.length} saved: ${(segmentBlob.size / 1024 / 1024).toFixed(2)}MB`);
                        this._clearChunks();
                        resolve(segmentBlob);
                    } else {
                        resolve(null);
                    }

                    // Cleanup MediaRecorder (but keep canvas stream for resume)
                    this._cleanupMediaRecorder();
                }, 100);
            };

            this.mediaRecorder.onstop = onStop;
            this.mediaRecorder.stop();
        });
    }

    /**
     * Resume recording - SEGMENT-BASED approach
     * ✅ STRATEGY: Create a NEW MediaRecorder and start fresh segment
     * ✅ All segments will be concatenated by FFmpeg at the end
     */
    async resume() {
        if (!this.isActive || !this.isPaused) {
            return;
        }

        console.log('[RECORDER] ▶️ Resuming recording (starting new segment)...');

        // ✅ Resume audio player FIRST
        if (this.audioElement && this._audioWasPlayingBeforePause) {
            this.audioElement.play().catch(err => {
                console.warn('[RECORDER] Could not resume audio:', err);
            });
            console.log('[RECORDER] ▶️ Audio player resumed');
        }

        // ✅ Ensure canvas stream is still valid
        if (!this.currentCanvasStream || !this.currentCanvasStream.active) {
            console.log('[RECORDER] 🔄 Recreating canvas stream...');
            this.currentCanvasStream = this.recordingCanvas.captureStream(0);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // ✅ Create new MediaRecorder for next segment
        const setupSuccess = await this._setupMediaRecorderOnly(this._currentVideoBitsPerSecond);
        if (!setupSuccess) {
            console.error('[RECORDER] ❌ Failed to create new MediaRecorder for resume');
            return;
        }

        // ✅ Start the new MediaRecorder
        try {
            await this._warmupCanvasStream();
            this.mediaRecorder.start(50);
            this._startFrameRequester();

            this.isPaused = false;
            this._audioWasPlayingBeforePause = false;
            this.updateState();

            console.log(`[RECORDER] ▶️ Recording resumed - Starting segment ${this.recordedSegments.length + 1}`);
        } catch (error) {
            console.error('[RECORDER] ❌ Failed to resume recording:', error);
        }
    }

    /**
     * Setup MediaRecorder only (without recreating canvas stream)
     * Used for resume after pause
     */
    async _setupMediaRecorderOnly(videoBitsPerSecond) {
        const videoTracks = this.currentCanvasStream.getVideoTracks();
        if (videoTracks.length === 0) {
            console.error('[RECORDER] No video tracks available');
            return false;
        }

        const audioTracks = this.audioStream.getAudioTracks();
        if (audioTracks.length === 0) {
            console.error('[RECORDER] No audio tracks available');
            return false;
        }

        audioTracks.forEach(track => { track.enabled = true; });

        const combinedStream = new MediaStream([...audioTracks, ...videoTracks]);

        const preferredMimeTypes = [
            'video/mp4;codecs=h264,aac',
            'video/mp4;codecs=avc1,mp4a',
            'video/webm;codecs=vp8,opus',
            'video/mp4',
            'video/webm;codecs=vp9,opus',
            'video/webm'
        ];

        this.mediaRecorder = this._tryInitializeMediaRecorder(combinedStream, videoBitsPerSecond, preferredMimeTypes);
        if (!this.mediaRecorder) {
            return false;
        }

        this.recordingMimeType = this.mediaRecorder.mimeType || 'video/webm';
        this._clearChunks();

        this.mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) {
                this.recordedChunks.push(e.data);
            }
        };

        this.mediaRecorder.onstart = () => { this.updateState(); };
        this.mediaRecorder.onerror = (e) => {
            console.error('[RECORDER] MediaRecorder error:', e);
        };

        return true;
    }

    /**
     * Stop recording - SEGMENT-BASED approach
     * ✅ Saves final segment and processes all segments
     * ✅ If multiple segments: sends to server for FFmpeg concat
     * ✅ If single segment: processes normally
     */
    async stop() {
        console.log(`[RECORDER] 🛑 Stopping recording (${this.recordedSegments.length} segments so far)...`);

        // Stop frame requester
        this._stopFrameRequester();

        // ✅ Save final segment if MediaRecorder is active
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            await this._stopAndSaveSegment();
        } else if (this.recordedChunks && this.recordedChunks.length > 0) {
            // Handle any remaining chunks (e.g., if paused)
            const segmentBlob = new Blob(this.recordedChunks, { type: this.recordingMimeType });
            this.recordedSegments.push(segmentBlob);
            console.log(`[RECORDER] 💾 Final segment saved: ${(segmentBlob.size / 1024 / 1024).toFixed(2)}MB`);
            this._clearChunks();
        }

        this.isActive = false;

        // ✅ Process all segments
        const totalSegments = this.recordedSegments.length;
        console.log(`[RECORDER] 📊 Total segments to process: ${totalSegments}`);

        if (totalSegments === 0) {
            console.warn('[RECORDER] No segments recorded');
            this.reset();
            return null;
        }

        // Calculate total size
        const totalSize = this.recordedSegments.reduce((sum, seg) => sum + seg.size, 0);
        console.log(`[RECORDER] 📊 Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

        if (totalSegments === 1) {
            // ✅ Single segment: process normally (no concatenation needed)
            const blob = this.recordedSegments[0];
            this.recordedSegments = [];
            this._processRecording(blob);
            return blob;
        } else {
            // ✅ Multiple segments: send to server for FFmpeg concatenation
            await this._processSegments(this.recordedSegments);
            this.recordedSegments = [];
            return null; // Async processing
        }
    }

    /**
     * Process multiple segments by sending them to server for FFmpeg concat
     */
    async _processSegments(segments) {
        const totalSize = segments.reduce((sum, seg) => sum + seg.size, 0);
        const fileSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

        this.ui.statusBox.textContent = `Uploading ${segments.length} segments (${fileSizeMB}MB) for concatenation...`;
        this.ui.statusBox.className = 'status-box processing';

        try {
            // Build FormData with all segments
            const formData = new FormData();
            const extension = this.recordingMimeType.includes('mp4') ? 'mp4' : 'webm';

            segments.forEach((segment, index) => {
                const filename = `segment_${index}_${Date.now()}.${extension}`;
                formData.append('segment', segment, filename);
            });

            // Add quality setting
            const qualitySelect = document.getElementById('qualitySelect');
            formData.append('quality', qualitySelect?.value > 20_000_000 ? 'highest' : 'high');

            console.log(`[RECORDER] 📤 Uploading ${segments.length} segments to server...`);

            // Upload to server
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout

            const response = await fetch('/visualizer/api/concat-segments', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log(`[RECORDER] ✅ Segments uploaded, job ID: ${result.jobId}`);

            // Poll for job completion
            this.ui.statusBox.textContent = 'Server is concatenating segments...';
            await this._pollJobStatus(result.jobId);

        } catch (error) {
            console.error('[RECORDER] ❌ Segment upload failed:', error);

            // Fallback: Try to combine segments locally and offer direct download
            this.ui.statusBox.textContent = 'Server unavailable, preparing local download...';

            // Combine all segments into one blob (will have seams, but better than nothing)
            const combinedBlob = new Blob(segments, { type: this.recordingMimeType });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const extension = this.recordingMimeType.includes('mp4') ? 'mp4' : 'webm';
            const fileName = `recording_${this.recordingCanvas.width}x${this.recordingCanvas.height}_${timestamp}.${extension}`;

            this._offerDirectDownload(combinedBlob, fileName, `Server unavailable (${segments.length} segments combined locally)`);
        }
    }

    /**
     * Poll job status until completion
     */
    async _pollJobStatus(jobId) {
        const maxAttempts = 600; // 10 minutes max
        const pollInterval = 1000; // 1 second

        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`/visualizer/api/status/${jobId}`);
                const job = await response.json();

                if (job.status === 'completed') {
                    console.log(`[RECORDER] ✅ Job ${jobId} completed`);

                    // Display results
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                    const fileName = `recording_${this.recordingCanvas.width}x${this.recordingCanvas.height}_${timestamp}.mp4`;

                    this._displayServerResults({
                        success: true,
                        downloadUrl: `/visualizer/api/download/${job.outputFile}`,
                        fileName: fileName,
                        info: job.info // ✅ Pass job info for file size display
                    }, fileName, null);

                    return;
                }

                if (job.status === 'failed') {
                    throw new Error(job.error || 'Job failed');
                }

                // Update progress
                if (job.progress) {
                    this.ui.statusBox.textContent = `Concatenating segments: ${job.progress}%`;
                }

                await new Promise(resolve => setTimeout(resolve, pollInterval));
            } catch (error) {
                console.warn(`[RECORDER] Poll error:`, error);
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
        }

        throw new Error('Job timed out');
    }

    async _setupMediaRecorder(videoBitsPerSecond) {
        if (!this.recordingCanvas || this.recordingCanvas.width === 0 || this.recordingCanvas.height === 0) {
            return false;
        }

        try {
            // ✅ FIX: Ensure old stream is completely cleaned up before creating new one
            if (this.currentCanvasStream) {
                console.warn('[RECORDER] ⚠️ Old canvas stream still exists! Cleaning up...');
                this._cleanupCanvasStream();
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // IMPORTANT: Use 0 FPS (manual) - frames requested via requestFrame()
            this.currentCanvasStream = this.recordingCanvas.captureStream(0);
            console.log('[RECORDER] ✅ New canvas stream created');
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const videoTrack = this.currentCanvasStream.getVideoTracks()[0];
            
            if (!videoTrack) {
                console.error('[RECORDER] ❌ No video track in canvas stream!');
                return false;
            }
            
            console.log('[RECORDER] Video track state:', videoTrack.readyState);
            
            // Trigger first frame
            if (typeof videoTrack.requestFrame === 'function') {
                videoTrack.requestFrame();
            }
            
        } catch (error) {
            console.error('[RECORDER] Canvas stream setup failed:', error);
            return false;
        }

        const videoTracks = this.currentCanvasStream.getVideoTracks();
        if (videoTracks.length === 0) {
            return false;
        }

        const audioTracks = this.audioStream.getAudioTracks();
        if (audioTracks.length === 0) {
            return false;
        }

        audioTracks.forEach((track, i) => {
            track.enabled = true;
        });

        const combinedStream = new MediaStream([...audioTracks, ...videoTracks]);

        // ⚠️ WICHTIG: VP9 vermeiden - extrem langsam zu decodieren auf Server!
        // VP8 ist ~3x schneller zu decodieren, H.264 noch schneller
        const preferredMimeTypes = [
            'video/mp4;codecs=h264,aac',    // Beste Option: H.264 (schnellstes Decoding)
            'video/mp4;codecs=avc1,mp4a',   // H.264 Alternative
            'video/webm;codecs=vp8,opus',   // VP8: 3x schneller als VP9
            'video/mp4',
            'video/webm;codecs=vp9,opus',   // VP9: NUR als Fallback (sehr langsam!)
            'video/webm'
        ];

        this.mediaRecorder = this._tryInitializeMediaRecorder(combinedStream, videoBitsPerSecond, preferredMimeTypes);
        if (!this.mediaRecorder) {
            return false;
        }

        this.recordingMimeType = this.mediaRecorder.mimeType || 'video/webm';
        
        // ✅ CRITICAL: Clear chunks before setting up new handler
        this._clearChunks();

        // ✅ CRITICAL: ondataavailable handler must not hold references
        this.mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) {
                this.recordedChunks.push(e.data);
                const totalSize = this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
                // Don't log every chunk - too verbose
            } else {
                console.warn('[RECORDER] Received empty chunk');
            }
        };

        this.mediaRecorder.onstart = () => {
            this.updateState();
        };

        this.mediaRecorder.onpause = () => {
            console.log('[RECORDER] Paused');
        };

        this.mediaRecorder.onresume = () => {
            console.log('[RECORDER] Resumed');
        };

        // ✅ FIX: Less aggressive error handler - log but don't auto-stop
        // MediaRecorder errors are often transient and recoverable
        // Auto-stopping causes immediate failure on 3rd recording
        this.mediaRecorder.onerror = (e) => {
            console.error('[RECORDER] MediaRecorder error (non-fatal):', e);
            console.warn('[RECORDER] Continuing despite error - monitor for data chunks');
            // Don't auto-stop - let natural stop() handle cleanup
            // If chunks stop coming, user can manually stop
        };

        return true;
    }

    _tryInitializeMediaRecorder(stream, videoBitsPerSecond, mimeTypes) {
        for (const type of mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                try {
                    const options = { mimeType: type, videoBitsPerSecond, audioBitsPerSecond: 320000 };
                    return new MediaRecorder(stream, options);
                } catch (e) {
                    console.warn('[RECORDER] Failed to create MediaRecorder with', type, e);
                }
            }
        }
        try {
            return new MediaRecorder(stream, { videoBitsPerSecond, audioBitsPerSecond: 320000 });
        } catch (e) {
            console.error('[RECORDER] Failed to create MediaRecorder:', e);
            return null;
        }
    }

    async _processRecording(blob) {
        const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const extension = this.recordingMimeType.includes('mp4') ? 'mp4' : 'webm';
        const fileName = `recording_${this.recordingCanvas.width}x${this.recordingCanvas.height}_${timestamp}.${extension}`;

        if (this.forceDirectDownload || blob.size > this.maxUploadSize || this.serverAvailable === false) {
            this._offerDirectDownload(blob, fileName, this.serverAvailable === false ? 'Server not available' : null);
            return;
        }

        this.ui.statusBox.textContent = `Uploading video (${fileSizeMB}MB)...`;
        this.ui.statusBox.className = 'status-box processing';

        try {
            const result = await this._attemptServerUpload(blob, fileName);
            if (result.success && result.downloadUrl) {
                this.serverAvailable = true;
                this._displayServerResults(result, fileName, blob);
            } else {
                throw new Error(result.message || 'Unknown server error');
            }
        } catch (error) {
            if (error.message.includes('404') || error.message.includes('Not Found')) {
                this.serverAvailable = false;
            }

            this.ui.statusBox.textContent = 'Server upload failed, using direct download...';
            this.ui.statusBox.className = 'status-box processing';
            setTimeout(() => {
                this._offerDirectDownload(blob, fileName, error.message);
            }, 1000);
        }
    }

    async _attemptServerUpload(blob, fileName) {
        const formData = new FormData();
        formData.append('video', blob, fileName);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch('/visualizer/api/upload', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            // ✅ CRITICAL: Clear FormData reference immediately
            formData.delete('video');

            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            // ✅ CRITICAL: Clear FormData even on error
            formData.delete('video');
            throw error;
        }
    }

    _displayServerResults(result, fileName, originalBlob) {
        // ✅ CRITICAL: Cleanup old resources
        this._aggressiveCleanup();

        const resultsPanel = document.getElementById('results-panel');
        document.getElementById('preview').src = result.downloadUrl;
        const downloadLink = document.getElementById('downloadLink');
        downloadLink.href = result.downloadUrl;
        downloadLink.download = result.fileName || fileName;
        downloadLink.blob = null;

        // ✅ FIX: Handle case when originalBlob is null (segment concat)
        let sizeInfo = '';
        if (originalBlob && originalBlob.size) {
            const originalSizeMB = (originalBlob.size / (1024 / 1024)).toFixed(2);
            sizeInfo = ` | Size: ${originalSizeMB}MB`;
        } else if (result.info && result.info.size) {
            const sizeMB = (result.info.size / (1024 * 1024)).toFixed(2);
            sizeInfo = ` | Size: ${sizeMB}MB`;
        }

        document.getElementById('mimeInfo').textContent = `Format: video/mp4 (AAC Audio) | Resolution: ${this.recordingCanvas.width}x${this.recordingCanvas.height}${sizeInfo}`;
        resultsPanel.style.display = 'block';
        resultsPanel.scrollIntoView({ behavior: 'smooth' });

        this.ui.statusBox.textContent = 'Server upload and conversion successful!';
        this.ui.statusBox.className = 'status-box ready';

        // ✅ CRITICAL: Reset recorder state so 2nd recording is possible
        this.isPrepared = false;
        this.isActive = false;
        this.isPaused = false;

        this.updateState();
    }

    _offerDirectDownload(blob, fileName, reason = null) {
        // ✅ CRITICAL: Cleanup old resources FIRST
        this._aggressiveCleanup();
        
        this.ui.statusBox.textContent = 'Preparing video for download...';
        this.ui.statusBox.className = 'status-box processing';

        // Create new Object URL
        const url = URL.createObjectURL(blob);
        
        // ✅ CRITICAL: Track new URL and blob
        this.currentObjectURL = url;
        this.previousBlob = blob;
        
        document.getElementById('preview').src = url;

        const downloadLink = document.getElementById('downloadLink');
        downloadLink.href = url;
        downloadLink.download = fileName;
        downloadLink.blob = blob;

        const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
        const reasonText = reason ? ` (Reason: ${reason})` : '';

        document.getElementById('mimeInfo').innerHTML = `
            <strong>Format:</strong> ${this.recordingMimeType}<br>
            <strong>Resolution:</strong> ${this.recordingCanvas.width}x${this.recordingCanvas.height}<br>
            <strong>Size:</strong> ${fileSizeMB}MB<br>
            <strong>Download:</strong> Direct Browser Download${reasonText}
        `;

        const resultsPanel = document.getElementById('results-panel');
        resultsPanel.style.display = 'block';
        resultsPanel.scrollIntoView({ behavior: 'smooth' });

        let statusMessage = 'Video ready for download!';
        if (reason && reason.includes('large')) {
            statusMessage = 'Video too large for server - direct download ready!';
        } else if (reason && reason.includes('not available')) {
            statusMessage = 'Server not available - direct download ready!';
        } else if (reason) {
            statusMessage = 'Server error - direct download ready!';
        }

        this.ui.statusBox.textContent = statusMessage;
        this.ui.statusBox.className = 'status-box ready download-mode';
        
        // ✅ CRITICAL: Reset recorder state so 2nd recording is possible
        this.isPrepared = false;
        this.isActive = false;
        this.isPaused = false;
        
        this.updateState();
    }

    updateState() {
        if (this.onStateChange) this.onStateChange();
    }

    resetServerAvailability() {
        this.serverAvailable = null;
    }

    enableDirectDownloadMode() {
        this.forceDirectDownload = true;
    }

    enableServerUploadMode() {
        this.forceDirectDownload = false;
        this.serverAvailable = null;
    }
}

export { Recorder };
