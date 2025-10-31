// workerManager.js - Worker-Manager für Main Thread mit Vite Support
/**
 * WorkerManager - Steuert den Recorder Worker vom Main Thread aus
 * Managed die Kommunikation zwischen Main Thread und Worker
 * 
 * ✅ STEP 2: Worker-Manager mit Promise-basierter API
 * ✅ VITE FIX: Korrekte Worker-Initialisierung für Vite
 */

class WorkerManager {
  constructor() {
    this.worker = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.isInitialized = false;
    this.offscreenCanvas = null;
  }

  /**
   * Initialisiert den Worker - ✅ VITE-kompatibel
   */
  async initialize(workerPath = '/src/lib/recorderWorker.js') {
    if (this.worker) {
      console.warn('[WorkerManager] Worker bereits initialisiert');
      return true;
    }

    try {
      // ✅ VITE FIX: Verwende new URL() für Vite-kompatiblen Import
      // Falls das fehlschlägt, versuche direkten Pfad
      let workerUrl;
      
      try {
        // Versuche zuerst Vite-Style mit import.meta.url
        workerUrl = new URL('./recorderWorker.js', import.meta.url);
        console.log('[WorkerManager] 🔧 Verwende Vite-Style Worker-URL:', workerUrl.href);
      } catch (e) {
        // Fallback auf direkten Pfad
        workerUrl = workerPath;
        console.log('[WorkerManager] 🔧 Verwende direkten Worker-Pfad:', workerUrl);
      }
      
      // Erstelle Worker
      this.worker = new Worker(workerUrl, { type: 'module' });
      
      // Setup Message Handler
      this.worker.addEventListener('message', (event) => {
        this._handleWorkerMessage(event);
      });
      
      // Setup Error Handler
      this.worker.addEventListener('error', (error) => {
        console.error('[WorkerManager] ❌ Worker Error:', error);
        console.error('[WorkerManager] Error details:', {
          message: error.message,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno
        });
      });
      
      // Setup MessageError Handler
      this.worker.addEventListener('messageerror', (error) => {
        console.error('[WorkerManager] ❌ Worker Message Error:', error);
      });
      
      console.log('[WorkerManager] ✅ Worker erfolgreich erstellt');
      
      // Warte kurz um zu sehen ob Worker lädt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('[WorkerManager] ❌ Fehler beim Worker-Erstellen:', error);
      console.error('[WorkerManager] Error Stack:', error.stack);
      return false;
    }
  }

  /**
   * Überträgt Canvas als OffscreenCanvas an Worker
   */
  async setupCanvas(canvas) {
    if (!canvas) {
      throw new Error('Canvas ist null oder undefined');
    }

    // Prüfe OffscreenCanvas Support
    if (!canvas.transferControlToOffscreen) {
      throw new Error('OffscreenCanvas wird nicht unterstützt');
    }

    try {
      // Übertrage Canvas Control an Worker
      this.offscreenCanvas = canvas.transferControlToOffscreen();
      
      console.log('[WorkerManager] 🔄 Übertrage Canvas an Worker...');
      console.log('[WorkerManager] Canvas Dimensionen:', canvas.width, 'x', canvas.height);
      
      const response = await this._sendMessage('INIT_CANVAS', {
        canvas: this.offscreenCanvas,
        width: canvas.width,
        height: canvas.height
      }, [this.offscreenCanvas]);
      
      if (response.success) {
        this.isInitialized = true;
        console.log('[WorkerManager] ✅ Canvas an Worker übertragen');
        return true;
      } else {
        throw new Error(response.error || 'Canvas-Init fehlgeschlagen');
      }
    } catch (error) {
      console.error('[WorkerManager] ❌ Fehler beim Canvas-Setup:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert Canvas-Dimensionen
   */
  async updateDimensions(width, height) {
    if (!this.isInitialized) {
      console.warn('[WorkerManager] Worker nicht initialisiert');
      return false;
    }

    const response = await this._sendMessage('UPDATE_DIMENSIONS', { width, height });
    return response.success;
  }

  /**
   * Lädt Bild in Worker
   */
  async loadImage(imageId, imageBlob) {
    if (!this.isInitialized) {
      console.warn('[WorkerManager] Worker nicht initialisiert');
      return false;
    }

    const response = await this._sendMessage('LOAD_IMAGE', {
      imageId,
      imageBlob
    });
    
    return response.success;
  }

  /**
   * Entfernt Bild aus Worker
   */
  async removeImage(imageId) {
    if (!this.isInitialized) {
      console.warn('[WorkerManager] Worker nicht initialisiert');
      return false;
    }

    const response = await this._sendMessage('REMOVE_IMAGE', { imageId });
    return response.success;
  }

  /**
   * Aktualisiert Visualizer-Daten
   */
  async updateVisualizer(visualizerData) {
    if (!this.isInitialized) return false;

    const response = await this._sendMessage('UPDATE_VISUALIZER', visualizerData);
    return response.success;
  }

  /**
   * Aktualisiert Text-Daten
   */
  async updateTexts(texts) {
    if (!this.isInitialized) return false;

    const response = await this._sendMessage('UPDATE_TEXTS', { texts });
    return response.success;
  }

  /**
   * Startet Aufnahme
   */
  async startRecording() {
    if (!this.isInitialized) return false;

    const response = await this._sendMessage('START_RECORDING', {});
    return response.success;
  }

  /**
   * Stoppt Aufnahme
   */
  async stopRecording() {
    if (!this.isInitialized) return false;

    const response = await this._sendMessage('STOP_RECORDING', {});
    return response.success;
  }

  /**
   * Fordert Worker auf, einen Frame zu rendern
   */
  async renderFrame() {
    if (!this.isInitialized) return false;

    // ✅ PERFORMANCE: Fire and forget - keine await
    // Wir warten nicht auf die Antwort um den Main Thread nicht zu blockieren
    this._sendMessageNoWait('RENDER_FRAME', {});
    return true;
  }

  /**
   * Sendet Message an Worker OHNE auf Antwort zu warten (Fire & Forget)
   */
  _sendMessageNoWait(type, data) {
    if (!this.worker) {
      return;
    }

    const requestId = ++this.requestId;
    
    try {
      this.worker.postMessage({ type, data, requestId });
    } catch (error) {
      console.error('[WorkerManager] Fehler beim Senden:', error);
    }
  }

  /**
   * Sendet Message an Worker und wartet auf Antwort
   */
  _sendMessage(type, data, transferables = []) {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker nicht initialisiert'));
        return;
      }

      const requestId = ++this.requestId;
      
      // Speichere Promise-Resolver
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // ✅ LÄNGERER Timeout für Canvas-Transfer (10 Sekunden)
      const timeoutDuration = type === 'INIT_CANVAS' ? 10000 : 5000;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Timeout bei ${type}`));
      }, timeoutDuration);
      
      // Überschreibe Resolver um Timeout zu clearen
      const originalResolve = this.pendingRequests.get(requestId).resolve;
      this.pendingRequests.get(requestId).resolve = (value) => {
        clearTimeout(timeout);
        originalResolve(value);
      };
      
      // Sende Message
      try {
        this.worker.postMessage({ type, data, requestId }, transferables);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        console.error('[WorkerManager] Fehler beim Senden:', error);
        reject(error);
      }
    });
  }

  /**
   * Handled Antworten vom Worker
   */
  _handleWorkerMessage(event) {
    const { requestId, ...response } = event.data;
    
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      pending.resolve(response);
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Beendet Worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.pendingRequests.clear();
      console.log('[WorkerManager] ✅ Worker beendet');
    }
  }
}

export { WorkerManager };
