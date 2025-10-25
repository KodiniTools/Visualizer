// recorderStore.js
/**
 * Pinia Store für Recorder-Verwaltung
 * Arbeitet mit der optimierten recorder.js zusammen
 * NUR Player-Audio, KEIN Mikrofon-Recording
 * 
 * ✅ STABILITY FIX: Rigoroser Reset zwischen Aufnahmen
 * ✅ WORKER INTEGRATION: Worker-Manager Support
 * ✅ CRASH FIX: Toggle-Funktionen komplett entfernt (verursachten Abstürze bei 3+ Aufnahmen)
 */
import { defineStore } from 'pinia';
import { Recorder } from '../lib/recorder.js';

export const useRecorderStore = defineStore('recorder', {
    state: () => ({
        recorder: null,
        workerManager: null,  // ✨ NEU: Worker-Manager Referenz
        
        // Recorder Status
        isPrepared: false,
        isRecording: false,
        isPaused: false,
        
        // Zuschaltbare Module während Aufnahme
        includeImages: true,
        includeText: true,
        includeVisualizer: true,
        // Audio wird über Gain gesteuert (siehe App.vue)
        
        // Upload Konfiguration
        uploadMode: 'auto', // 'auto' | 'direct' | 'server'
        maxUploadSize: 50 * 1024 * 1024, // 50MB
        
        // UI Status
        recordingQuality: 8_000_000, // 8 Mbps default
        statusMessage: '',
        statusType: 'idle', // 'idle' | 'recording' | 'paused' | 'processing' | 'ready'
        
        // Aufnahme-Ergebnisse
        lastRecording: null,
        recordingResults: {
            visible: false,
            downloadUrl: null,
            fileName: null,
            mimeType: null,
            fileSize: 0,
            resolution: null
        }
    }),

    getters: {
        canPrepare: (state) => !state.isRecording && !state.isPrepared,
        canStart: (state) => state.isPrepared && !state.isRecording,
        canPause: (state) => state.isRecording && !state.isPaused,
        canResume: (state) => state.isRecording && state.isPaused,
        canStop: (state) => state.isRecording,
        
        recordButtonLabel: (state) => {
            if (state.isPaused) return 'Paused';
            if (state.isRecording) return 'Recording...';
            if (state.isPrepared) return 'Ready';
            return 'Prepare';
        },
        
        recordButtonClass: (state) => {
            if (state.isPaused) return 'paused';
            if (state.isRecording) return 'recording pulse';
            if (state.isPrepared) return 'ready';
            return 'idle';
        }
    },

    actions: {
        /**
         * Initialisiert den Recorder mit Canvas und Audio-Stream
         * Player ist nur externe Audioquelle, keine Steuerung
         * ✨ STEP 5.1: Worker-Manager Support hinzugefügt
         */
        setRecorderRefs(canvas, audioElement, audioStream, workerManager = null) {
            if (this.recorder) {
                console.warn('[RecorderStore] Recorder bereits initialisiert');
                return true;
            }

            // ✨ Speichere Worker-Manager
            this.workerManager = workerManager;
            console.log('[RecorderStore] Worker-Manager:', workerManager ? '✅ vorhanden' : '❌ nicht vorhanden');

            const uiElements = {
                statusBox: {
                    textContent: '',
                    className: ''
                }
            };

            const callbacks = {
                onStateChange: () => this.syncRecorderState(),
                onForceRedraw: () => {
                    window.dispatchEvent(new CustomEvent('recorder:forceRedraw'));
                    
                    // ✨ NEU: Fordere auch Worker-Frame an
                    if (this.workerManager?.isInitialized) {
                        this.workerManager.renderFrame();
                        console.log('[RecorderStore] Worker-Frame angefordert (onForceRedraw)');
                    }
                }
            };

            try {
                this.recorder = new Recorder(
                    canvas,
                    audioElement,
                    audioStream,
                    uiElements,
                    callbacks,
                    workerManager  // ✨ NEU: Übergebe Worker-Manager an Recorder
                );

                console.log('✅ [RecorderStore] Recorder erfolgreich initialisiert', 
                    workerManager ? '(mit Worker)' : '(ohne Worker)');
                
                // ✅ PERFORMANCE FIX: Exponiere Store global für dynamische FPS
                window.recorderStore = this;
                console.log('✅ [RecorderStore] Store global verfügbar gemacht');
                
                this.syncRecorderState();
                return true;
            } catch (error) {
                console.error('❌ [RecorderStore] Recorder Initialisierung fehlgeschlagen:', error);
                return false;
            }
        },

        /**
         * DEPRECATED: Mit captureStream(30) nicht mehr nötig
         * Browser nimmt automatisch 30 Frames pro Sekunde
         */
        requestFrame() {
            // Mit captureStream(30) brauchen wir kein manuelles requestFrame mehr
            // Diese Methode bleibt nur für Kompatibilität
            return;
        },

        /**
         * Synchronisiert den Store-State mit dem Recorder
         */
        syncRecorderState() {
            if (!this.recorder) return;

            this.isPrepared = this.recorder.isPrepared;
            this.isRecording = this.recorder.isActive;
            this.isPaused = this.recorder.isPaused;

            // Status-Update
            if (this.isRecording && this.isPaused) {
                this.statusType = 'paused';
                this.statusMessage = 'Recording paused';
            } else if (this.isRecording) {
                this.statusType = 'recording';
                this.statusMessage = 'Recording in progress...';
            } else if (this.isPrepared) {
                this.statusType = 'ready';
                this.statusMessage = 'Ready to record';
            } else {
                this.statusType = 'idle';
                this.statusMessage = '';
            }
        },

        /**
         * Canvas aktualisieren (z.B. bei Resize)
         */
        updateCanvas(newCanvas) {
            if (!this.recorder) {
                console.error('[RecorderStore] Recorder nicht initialisiert');
                return false;
            }

            const success = this.recorder.updateCanvas(newCanvas);
            if (success) {
                this.syncRecorderState();
            }
            return success;
        },

        /**
         * Bereitet Aufnahme vor
         * ✅ STABILITY FIX: Führt IMMER einen vollständigen Reset durch
         */
        async prepareRecording(options = {}) {
            if (!this.recorder) {
                throw new Error('Recorder nicht initialisiert');
            }

            // NOTFALL-SICHERHEIT: Stoppe laufenden Recorder falls aktiv
            if (this.isRecording) {
                console.warn('⚠️ [RecorderStore] Recorder läuft noch - stoppe zuerst!');
                try {
                    await this.stopRecording();
                    console.log('✅ [RecorderStore] Alter Recorder gestoppt');
                } catch (error) {
                    console.error('❌ [RecorderStore] Fehler beim Stoppen:', error);
                }
                // Warte kurz damit alles bereinigt wird
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // ✅ KRITISCH: Führe IMMER einen Reset durch, bevor eine neue Aufnahme vorbereitet wird.
            // Dies ist der wichtigste Fix, um den Zustand von der vorherigen Aufnahme zu löschen.
            // Verhindert Speicherlecks und Ressourcenkonflikte zwischen Aufnahmen.
            console.log('🧹 [RecorderStore] Führe vor der Vorbereitung einen vollständigen Reset durch...');
            this.recorder.reset();
            this.syncRecorderState(); // Synchronisiert den jetzt sauberen Zustand

            console.log('[RecorderStore] 🔄 Hole frischen Audio-Stream...');
            
            // KRITISCH: Hole FRISCHEN Audio-Stream bei jedem Prepare
            // Dies verhindert "tote" Audio-Tracks nach dem ersten Stop
            if (typeof window.getAudioStreamForRecorder === 'function') {
                try {
                    const freshAudioStream = await window.getAudioStreamForRecorder();
                    if (freshAudioStream) {
                        this.recorder.updateAudioStream(freshAudioStream);
                        console.log('✅ [RecorderStore] Frischer Audio-Stream gesetzt');
                    } else {
                        console.warn('⚠️ [RecorderStore] Kein Audio-Stream erhalten - fahre fort mit altem');
                    }
                } catch (error) {
                    console.error('❌ [RecorderStore] Fehler beim Holen des Audio-Streams:', error);
                    console.warn('⚠️ [RecorderStore] Fahre fort mit altem Audio-Stream');
                }
            } else {
                console.warn('⚠️ [RecorderStore] getAudioStreamForRecorder() nicht verfügbar');
            }

            const recordingOptions = {
                videoBitsPerSecond: options.quality || this.recordingQuality
            };

            // KRITISCH: await für async prepare()
            const success = await this.recorder.prepare(recordingOptions);
            this.syncRecorderState();

            if (success && this.isPrepared) {
                console.log('✅ [RecorderStore] Aufnahme vorbereitet');
                
                // ✨ NEU: Informiere Worker über Recording-Start
                if (this.workerManager?.isInitialized) {
                    await this.workerManager.startRecording();
                    console.log('✅ [RecorderStore] Worker über Recording-Start informiert');
                }
                
                return true;
            } else {
                console.error('❌ [RecorderStore] Aufnahme konnte nicht vorbereitet werden');
                return false;
            }
        },

        /**
         * Startet die Aufnahme
         */
        async startRecording() {
            if (!this.recorder || !this.isPrepared) {
                console.error('[RecorderStore] Recorder nicht bereit zum Start');
                return false;
            }

            const success = await this.recorder.start();
            this.syncRecorderState();

            if (success && this.isRecording) {
                console.log('✅ [RecorderStore] Aufnahme gestartet');
                return true;
            } else {
                console.error('❌ [RecorderStore] Aufnahme konnte nicht gestartet werden');
                return false;
            }
        },

        /**
         * Pausiert die Aufnahme (nur Video, Audio läuft weiter)
         * Player wird NICHT gesteuert - läuft unabhängig weiter
         */
        pauseRecording() {
            if (!this.recorder || !this.isRecording || this.isPaused) {
                console.error('[RecorderStore] Kann nicht pausieren - falscher State');
                return false;
            }

            console.log('[RecorderStore] Pausiere Aufnahme (nur Video, Audio läuft weiter)');
            this.recorder.pause();
            this.syncRecorderState();

            if (this.isPaused) {
                console.log('✅ [RecorderStore] Aufnahme pausiert');
                return true;
            } else {
                console.error('❌ [RecorderStore] Pause fehlgeschlagen');
                return false;
            }
        },

        /**
         * Setzt die Aufnahme fort (nur Video, Audio läuft weiter)
         * Player wird NICHT gesteuert - läuft unabhängig weiter
         */
        resumeRecording() {
            if (!this.recorder || !this.isRecording || !this.isPaused) {
                console.error('[RecorderStore] Kann nicht fortsetzen - falscher State');
                return false;
            }

            console.log('[RecorderStore] Setze Aufnahme fort (nur Video, Audio läuft weiter)');
            this.recorder.resume();
            this.syncRecorderState();

            if (!this.isPaused) {
                console.log('✅ [RecorderStore] Aufnahme fortgesetzt');
                return true;
            } else {
                console.error('❌ [RecorderStore] Resume fehlgeschlagen');
                return false;
            }
        },

        /**
         * Stoppt die Aufnahme und verarbeitet das Video
         * ✅ STABILITY FIX: Aggressiver State-Reset
         */
        async stopRecording() {
            if (!this.recorder || !this.isRecording) {
                console.error('[RecorderStore] Keine aktive Aufnahme zum Stoppen');
                return null;
            }

            console.log('[RecorderStore] Stoppe Aufnahme...');
            this.statusType = 'processing';
            this.statusMessage = 'Processing video...';

            try {
                const blob = await this.recorder.stop();
                
                // ✅ WICHTIG: State SOFORT und VOLLSTÄNDIG zurücksetzen
                // Dies ist aggressiver als das Warten auf syncRecorderState()
                // Verhindert Race Conditions und stellt sicher dass der State
                // zwischen Aufnahmen komplett sauber ist
                this.isPrepared = false;
                this.isRecording = false;
                this.isPaused = false;
                this.syncRecorderState(); // Sync mit dem (jetzt inaktiven) Recorder

                // ✨ NEU: Informiere Worker über Recording-Stop
                if (this.workerManager?.isInitialized) {
                    await this.workerManager.stopRecording();
                    console.log('✅ [RecorderStore] Worker über Recording-Stop informiert');
                }

                if (blob) {
                    this.lastRecording = {
                        blob,
                        timestamp: Date.now(),
                        size: blob.size
                    };
                    console.log('✅ [RecorderStore] Aufnahme gestoppt:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
                    console.log('✅ [RecorderStore] State aggressiv zurückgesetzt - bereit für neue Aufnahme');
                    return blob;
                } else {
                    console.warn('⚠️ [RecorderStore] Aufnahme gestoppt, aber kein Blob erhalten');
                    return null;
                }
            } catch (error) {
                console.error('❌ [RecorderStore] Fehler beim Stoppen:', error);
                
                // Bei Fehler: Forciere Reset
                this.isPrepared = false;
                this.isRecording = false;
                this.isPaused = false;
                this.statusType = 'idle';
                this.statusMessage = 'Error stopping recording';
                
                throw error;
            }
        },

        /**
         * Reset Recorder State
         */
        resetRecorder() {
            if (!this.recorder) return;

            this.recorder.reset();
            this.syncRecorderState();
            this.recordingResults.visible = false;
            console.log('✅ [RecorderStore] Recorder zurückgesetzt');
        },

        /**
         * Upload-Modus konfigurieren
         */
        setUploadMode(mode) {
            if (!this.recorder) return;

            this.uploadMode = mode;

            switch (mode) {
                case 'direct':
                    this.recorder.enableDirectDownloadMode();
                    console.log('[RecorderStore] Direct Download Modus aktiviert');
                    break;
                case 'server':
                    this.recorder.enableServerUploadMode();
                    console.log('[RecorderStore] Server Upload Modus aktiviert');
                    break;
                case 'auto':
                default:
                    this.recorder.enableServerUploadMode();
                    this.recorder.resetServerAvailability();
                    console.log('[RecorderStore] Auto Modus aktiviert (versucht Server, fällt auf Direct zurück)');
                    break;
            }
        },

        /**
         * Aufnahme-Qualität setzen
         */
        setRecordingQuality(bitsPerSecond) {
            this.recordingQuality = bitsPerSecond;
            console.log('[RecorderStore] Qualität gesetzt:', (bitsPerSecond / 1_000_000).toFixed(1), 'Mbps');
        },

        /**
         * Aufnahme-Ergebnisse anzeigen
         */
        showRecordingResults(results) {
            this.recordingResults = {
                visible: true,
                ...results
            };
        },

        /**
         * Aufnahme-Ergebnisse verstecken
         */
        hideRecordingResults() {
            this.recordingResults.visible = false;
        }
    }
});
