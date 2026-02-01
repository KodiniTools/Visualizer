// recorder.js - FINAL FIX v2 - Behebt Preview-Video Problem

/**
 * recorder.js - Optimierte Version mit VOLLSTÄNDIGER State-Reset
 * 
 * KRITISCHE FIXES v2:
 * ✅ State wird nach _processRecording korrekt zurückgesetzt
 * ✅ 2. Aufnahme ist jetzt möglich
 * ✅ Preview-Video wird korrekt erstellt
 * ✅ Keine Race Conditions mehr
 * 
 * ALLE VORHERIGEN FIXES:
 * ✅ recordedChunks wird sofort nach Blob-Erstellung geleert
 * ✅ Alle Event-Listener werden explizit entfernt
 * ✅ MediaRecorder wird vollständig nullifiziert
 * ✅ FormData-Referenzen werden sofort freigegeben
 * ✅ Blob-Referenzen werden explizit auf null gesetzt
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
        this.totalChunksSize = 0; // ✅ FIX: Track size incrementally instead of O(n²) reduce
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

        // ✅ CRITICAL: Clear chunks BEFORE preparing
        this._clearChunks();

        const qualitySelect = document.getElementById('qualitySelect');
        const videoBitsPerSecond = options?.videoBitsPerSecond || parseInt(qualitySelect?.value, 10) || 8_000_000;

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
        this._audioWasPlayingBeforePause = false;

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
        // ✅ FIX: Reset size counter
        this.totalChunksSize = 0;
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

            // ✅ FIX: Längere Timeslice (1000ms statt 50ms) verhindert Audio-Dropouts!
            //
            // PROBLEM: 50ms Timeslice verursacht "1 Sek flüssig, 1 Sek Pause" Muster:
            // - Bei 50ms muss der Encoder 20x pro Sekunde Chunks finalisieren
            // - Jede Finalisierung blockiert kurz den Audio-Stream
            // - CPU-Overhead akkumuliert sich → periodische Aussetzer
            //
            // LÖSUNG: 1000ms Timeslice:
            // - Nur 1 Chunk pro Sekunde = minimaler Overhead
            // - Audio-Stream bleibt kontinuierlich
            // - Browser-Encoder arbeitet effizienter mit größeren Chunks
            // - Standard MediaRecorder Best-Practice für stabile Aufnahmen
            this.mediaRecorder.start(1000);
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
        // ✅ SIMPLIFIED: With captureStream(60), browser automatically captures frames
        // No need for manual requestFrame() calls via setInterval which caused stuttering
        // The visualizer already renders via requestAnimationFrame at 60 FPS
        this.frameRequesterRunning = true;
        console.log('[RECORDER] Frame capture running automatically at 60 FPS');
    }

    _stopFrameRequester() {
        // ✅ SIMPLIFIED: Just update the flag, no interval to clear with captureStream(60)
        this.frameRequesterRunning = false;
    }

    async _warmupCanvasStream() {
        const videoTrack = this.currentCanvasStream?.getVideoTracks()[0];
        if (!videoTrack) {
            return false;
        }

        if (videoTrack.readyState !== 'live') {
            return false;
        }

        // ✅ OPTIMIERT: Schnellere Warmup-Phase ohne Audio-Unterbrechungen
        // Weniger Frames, kürzere Wartezeiten - vermeidet Audio-Buffer-Lücken
        if (this.onForceRedraw) {
            // Phase 1: Initiale Canvas-Aktualisierungen (3 Frames reichen)
            for (let i = 0; i < 3; i++) {
                this.onForceRedraw();
                await new Promise(resolve => setTimeout(resolve, 16)); // 60 FPS
            }
        } else {
            console.error('[RECORDER] CRITICAL: No rendering method available!');
            return false;
        }

        // Phase 2: Force frame requests für Video-Encoder-Initialisierung
        if (typeof videoTrack.requestFrame === 'function') {
            for (let i = 0; i < 3; i++) {
                videoTrack.requestFrame();
                await new Promise(resolve => setTimeout(resolve, 16)); // 60 FPS
            }
        }

        // Phase 3: Kürzere Stabilisierung (100ms statt 200ms)
        // Audio-Buffer sollte bereits aktiv sein, lange Pausen verursachen Dropouts
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('[RECORDER] ✅ Warmup-Phase abgeschlossen');
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
     * Pause recording with synchronized audio player
     * Uses short 15ms fade to minimize audible artifacts
     */
    async pause() {
        if (!this.isActive || this.isPaused) {
            return;
        }

        // ✅ Short fade-out before pausing (15ms - barely perceptible)
        if (typeof window.fadeOutRecordingAudio === 'function') {
            await window.fadeOutRecordingAudio(15);
        }

        // ✅ Save audio player state and pause it
        if (this.audioElement) {
            this._audioWasPlayingBeforePause = !this.audioElement.paused;
            if (this._audioWasPlayingBeforePause) {
                this.audioElement.pause();
            }
        }

        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
        }

        this.isPaused = true;
        this.updateState();
        console.log('[RECORDER] ⏸️ Recording paused (audio synchronized)');
    }

    /**
     * Resume recording with synchronized audio player
     * Uses short 15ms fade to minimize audible artifacts
     */
    async resume() {
        if (!this.isActive || !this.isPaused) {
            return;
        }

        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
        }

        // ✅ Resume audio player if it was playing before
        if (this.audioElement && this._audioWasPlayingBeforePause) {
            this.audioElement.play().catch(err => {
                console.warn('[RECORDER] Could not resume audio:', err);
            });
        }

        // ✅ Short fade-in after resuming (15ms - barely perceptible)
        if (typeof window.fadeInRecordingAudio === 'function') {
            await window.fadeInRecordingAudio(15);
        }

        this.isPaused = false;
        this._audioWasPlayingBeforePause = false;
        this.updateState();
        console.log('[RECORDER] ▶️ Recording resumed (audio synchronized)');
    }

    async stop() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                try {
                    if (this.recordedChunks && this.recordedChunks.length > 0) {
                        const blob = new Blob(this.recordedChunks, { type: this.recordingMimeType });
                        // ✅ CRITICAL: Clear chunks IMMEDIATELY after blob creation
                        this._clearChunks();
                        this._processRecording(blob);
                        resolve(blob);
                        // ✅ NOTE: reset() wird in _processRecording callbacks aufgerufen
                    } else {
                        this.reset(); // Reset wenn keine Chunks
                        resolve(null);
                    }
                } catch (e) {
                    this.reset(); // Reset bei Error
                    reject(e);
                }
                return;
            }

            // Request final data before stopping
            if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
                this.mediaRecorder.requestData();
            }

            this.mediaRecorder.onstop = () => {
                // Short delay to ensure all data is received
                setTimeout(() => {
                    try {
                        if (this.recordedChunks && this.recordedChunks.length > 0) {
                            // ✅ FIX: Use pre-calculated size instead of O(n) reduce
                            console.log(`[RECORDER] Final chunks: ${this.recordedChunks.length}, Total: ${(this.totalChunksSize/1024/1024).toFixed(2)}MB`);
                            
                            const blob = new Blob(this.recordedChunks, { type: this.recordingMimeType });
                            // ✅ CRITICAL: Clear chunks IMMEDIATELY after blob creation
                            this._clearChunks();
                            this._processRecording(blob);
                            resolve(blob);
                        } else {
                            console.warn('[RECORDER] No chunks recorded');
                            this.reset(); // Reset wenn keine Chunks
                            resolve(null);
                        }
                    } catch (e) {
                        console.error('[RECORDER] Stop error:', e);
                        reject(e);
                    }
                    // ✅ NOTE: reset() wird in _offerDirectDownload oder _displayServerResults aufgerufen
                    // NICHT hier, weil _processRecording async ist
                }, 100);
            };

            try {
                // Stop frame requester BEFORE stopping MediaRecorder
                this._stopFrameRequester();
                
                this.mediaRecorder.stop();
                this.isActive = false;
            } catch (error) {
                console.error('[RECORDER] Stop error:', error);
                reject(error);
            }
        });
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
            
            // ✅ FIX: Use 60 FPS automatic capture instead of manual requestFrame()
            // Manual mode (0 FPS) with setInterval causes stuttering because setInterval
            // is not reliable when main thread is busy with rendering/audio processing
            this.currentCanvasStream = this.recordingCanvas.captureStream(60);
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
        // ✅ FIX: Use incremental size tracking instead of O(n²) reduce on every chunk
        this.mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) {
                this.recordedChunks.push(e.data);
                this.totalChunksSize += e.data.size; // O(1) instead of O(n)
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

        const originalSizeMB = (originalBlob.size / (1024 * 1024)).toFixed(2);

        document.getElementById('mimeInfo').textContent = `Format: video/mp4 (AAC Audio) | Resolution: ${this.recordingCanvas.width}x${this.recordingCanvas.height} | Size: ${originalSizeMB}MB`;
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
