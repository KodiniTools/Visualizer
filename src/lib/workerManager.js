/**
 * Worker Manager
 * Verwaltet Web Workers für Audio-Analyse, Visualizer und Bildfilter
 * Mit automatischem Fallback wenn Worker nicht verfügbar sind
 */

export class WorkerManager {
  constructor() {
    this.audioWorker = null;
    this.visualizerWorker = null;
    this.imageFilterWorker = null;

    this.audioWorkerReady = false;
    this.visualizerWorkerReady = false;
    this.imageFilterWorkerReady = false;

    this.audioCallback = null;
    this.pendingFilterJobs = new Map();

    // Feature Detection
    this.supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    this.supportsWorkers = typeof Worker !== 'undefined';

    console.log('[WorkerManager] Initialisiert', {
      supportsWorkers: this.supportsWorkers,
      supportsOffscreenCanvas: this.supportsOffscreenCanvas
    });
  }

  /**
   * Initialisiert den Audio-Analyse Worker
   */
  async initAudioWorker() {
    if (!this.supportsWorkers) {
      console.warn('[WorkerManager] Workers nicht unterstützt');
      return false;
    }

    try {
      this.audioWorker = new Worker(
        new URL('../workers/audioAnalysisWorker.js', import.meta.url),
        { type: 'module' }
      );

      return new Promise((resolve) => {
        this.audioWorker.onmessage = (e) => {
          const { type, data } = e.data;

          switch (type) {
            case 'ready':
              this.audioWorkerReady = true;
              console.log('[WorkerManager] Audio Worker bereit');
              resolve(true);
              break;

            case 'audioData':
              if (this.audioCallback) {
                this.audioCallback(data);
              }
              break;
          }
        };

        this.audioWorker.onerror = (error) => {
          console.error('[WorkerManager] Audio Worker Fehler:', error);
          this.audioWorkerReady = false;
          resolve(false);
        };

        // Timeout nach 5 Sekunden
        setTimeout(() => {
          if (!this.audioWorkerReady) {
            console.warn('[WorkerManager] Audio Worker Timeout');
            resolve(false);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('[WorkerManager] Audio Worker konnte nicht erstellt werden:', error);
      return false;
    }
  }

  /**
   * Initialisiert den Visualizer Worker mit OffscreenCanvas
   */
  async initVisualizerWorker(canvas) {
    if (!this.supportsWorkers || !this.supportsOffscreenCanvas) {
      console.warn('[WorkerManager] OffscreenCanvas nicht unterstützt');
      return false;
    }

    try {
      this.visualizerWorker = new Worker(
        new URL('../workers/visualizerWorker.js', import.meta.url),
        { type: 'module' }
      );

      const offscreen = canvas.transferControlToOffscreen();

      return new Promise((resolve) => {
        this.visualizerWorker.onmessage = (e) => {
          const { type } = e.data;

          switch (type) {
            case 'ready':
              // Canvas zum Worker senden
              this.visualizerWorker.postMessage(
                {
                  type: 'init',
                  canvas: offscreen,
                  width: canvas.width,
                  height: canvas.height
                },
                [offscreen]
              );
              break;

            case 'initialized':
              this.visualizerWorkerReady = true;
              console.log('[WorkerManager] Visualizer Worker bereit');
              resolve(true);
              break;

            case 'frame':
              // Frame wurde gerendert - kann hier verarbeitet werden
              break;
          }
        };

        this.visualizerWorker.onerror = (error) => {
          console.error('[WorkerManager] Visualizer Worker Fehler:', error);
          this.visualizerWorkerReady = false;
          resolve(false);
        };

        setTimeout(() => {
          if (!this.visualizerWorkerReady) {
            console.warn('[WorkerManager] Visualizer Worker Timeout');
            resolve(false);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('[WorkerManager] Visualizer Worker konnte nicht erstellt werden:', error);
      return false;
    }
  }

  /**
   * Initialisiert den Image Filter Worker
   */
  async initImageFilterWorker() {
    if (!this.supportsWorkers) {
      console.warn('[WorkerManager] Workers nicht unterstützt');
      return false;
    }

    try {
      this.imageFilterWorker = new Worker(
        new URL('../workers/imageFilterWorker.js', import.meta.url),
        { type: 'module' }
      );

      return new Promise((resolve) => {
        this.imageFilterWorker.onmessage = (e) => {
          const { type, imageData, jobId, error } = e.data;

          switch (type) {
            case 'ready':
              this.imageFilterWorkerReady = true;
              console.log('[WorkerManager] Image Filter Worker bereit');
              resolve(true);
              break;

            case 'filterResult':
              const pendingJob = this.pendingFilterJobs.get(jobId);
              if (pendingJob) {
                pendingJob.resolve(imageData);
                this.pendingFilterJobs.delete(jobId);
              }
              break;

            case 'error':
              const errorJob = this.pendingFilterJobs.get(jobId);
              if (errorJob) {
                errorJob.reject(new Error(error));
                this.pendingFilterJobs.delete(jobId);
              }
              break;
          }
        };

        this.imageFilterWorker.onerror = (error) => {
          console.error('[WorkerManager] Image Filter Worker Fehler:', error);
          this.imageFilterWorkerReady = false;
          resolve(false);
        };

        setTimeout(() => {
          if (!this.imageFilterWorkerReady) {
            console.warn('[WorkerManager] Image Filter Worker Timeout');
            resolve(false);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('[WorkerManager] Image Filter Worker konnte nicht erstellt werden:', error);
      return false;
    }
  }

  /**
   * Initialisiert alle Worker
   */
  async initAll(visualizerCanvas = null) {
    const results = await Promise.all([
      this.initAudioWorker(),
      this.initImageFilterWorker(),
      visualizerCanvas ? this.initVisualizerWorker(visualizerCanvas) : Promise.resolve(false)
    ]);

    console.log('[WorkerManager] Initialisierung abgeschlossen:', {
      audio: results[0],
      imageFilter: results[1],
      visualizer: results[2]
    });

    return {
      audio: results[0],
      imageFilter: results[1],
      visualizer: results[2]
    };
  }

  /**
   * Sendet Audio-Daten zur Analyse
   */
  analyzeAudio(audioDataArray, bufferLength) {
    if (!this.audioWorkerReady || !this.audioWorker) {
      return false;
    }

    // Kopie erstellen für Transfer
    const copy = new Uint8Array(audioDataArray);

    this.audioWorker.postMessage(
      {
        type: 'analyze',
        audioData: copy,
        bufferLength
      },
      [copy.buffer]
    );

    return true;
  }

  /**
   * Setzt Callback für Audio-Analyse Ergebnisse
   */
  onAudioData(callback) {
    this.audioCallback = callback;
  }

  /**
   * Wendet Filter auf ein Bild an (async)
   */
  async applyImageFilters(imageData, filters, blur = 0) {
    if (!this.imageFilterWorkerReady || !this.imageFilterWorker) {
      // Fallback: Filter im Main Thread (nicht implementiert hier)
      throw new Error('Image Filter Worker nicht verfügbar');
    }

    const jobId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    return new Promise((resolve, reject) => {
      this.pendingFilterJobs.set(jobId, { resolve, reject });

      // Kopie für Transfer
      const copy = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );

      this.imageFilterWorker.postMessage(
        {
          type: 'applyFilters',
          imageData: copy,
          filters,
          blur,
          jobId
        },
        [copy.data.buffer]
      );

      // Timeout nach 10 Sekunden
      setTimeout(() => {
        if (this.pendingFilterJobs.has(jobId)) {
          this.pendingFilterJobs.delete(jobId);
          reject(new Error('Filter Timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Rendert einen Visualizer-Frame (wenn Worker aktiv)
   */
  renderVisualizerFrame(visualizerName, audioData, bufferLength, color, opacity) {
    if (!this.visualizerWorkerReady || !this.visualizerWorker) {
      return false;
    }

    const copy = new Uint8Array(audioData);

    this.visualizerWorker.postMessage(
      {
        type: 'render',
        visualizer: visualizerName,
        audioData: copy,
        bufferLength,
        color,
        opacity
      },
      [copy.buffer]
    );

    return true;
  }

  /**
   * Aktualisiert Visualizer-Canvas Größe
   */
  resizeVisualizerCanvas(width, height) {
    if (this.visualizerWorkerReady && this.visualizerWorker) {
      this.visualizerWorker.postMessage({
        type: 'resize',
        width,
        height
      });
    }
  }

  /**
   * Beendet alle Worker
   */
  terminate() {
    if (this.audioWorker) {
      this.audioWorker.terminate();
      this.audioWorker = null;
      this.audioWorkerReady = false;
    }

    if (this.visualizerWorker) {
      this.visualizerWorker.terminate();
      this.visualizerWorker = null;
      this.visualizerWorkerReady = false;
    }

    if (this.imageFilterWorker) {
      this.imageFilterWorker.terminate();
      this.imageFilterWorker = null;
      this.imageFilterWorkerReady = false;
    }

    this.pendingFilterJobs.clear();
    console.log('[WorkerManager] Alle Worker beendet');
  }

  /**
   * Status-Check
   */
  getStatus() {
    return {
      audio: this.audioWorkerReady,
      visualizer: this.visualizerWorkerReady,
      imageFilter: this.imageFilterWorkerReady,
      supportsWorkers: this.supportsWorkers,
      supportsOffscreenCanvas: this.supportsOffscreenCanvas
    };
  }
}

// Singleton-Export
export const workerManager = new WorkerManager();
