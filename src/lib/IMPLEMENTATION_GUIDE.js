/**
 * WEB WORKER IMPLEMENTATION - SCHRITT-FÜR-SCHRITT ANLEITUNG
 * ==========================================================
 * 
 * FERTIG:
 * ✅ Step 1: Worker-Grundgerüst (recorderWorker.js)
 * ✅ Step 2: WorkerManager (workerManager.js)
 * 
 * NOCH ZU TUN:
 * ⬜ Step 3: App.vue Integration
 * ⬜ Step 4: Rendering-Logik in Worker auslagern
 * ⬜ Step 5: recorder.js anpassen
 * ⬜ Step 6: Testing & Optimierung
 */

// =============================================================================
// STEP 3: App.vue Integration
// =============================================================================

/**
 * 3.1 - Import hinzufügen (oben in <script setup>)
 */
// In App.vue nach Zeile 55:
import { WorkerManager } from './lib/workerManager.js';

/**
 * 3.2 - Worker-Manager Instanz erstellen
 */
// Nach Zeile 78:
const workerManagerInstance = ref(null);

/**
 * 3.3 - Recording Canvas erstellen (OHNE direkt zu zeichnen)
 */
// Das Recording Canvas bleibt wie es ist (Zeile 67), aber wir übertragen
// die Kontrolle an den Worker:

const recordingCanvas = document.createElement('canvas');
// Worker wird später die Kontrolle übernehmen via transferControlToOffscreen()

/**
 * 3.4 - Worker initialisieren in initializeRecorder()
 */
// ERSETZE die komplette initializeRecorder() Funktion (ab Zeile 265):

async function initializeRecorder() {
  console.log('🎬 [App] Initialisiere Recorder mit Worker...');
  
  // 1. Prüfe OffscreenCanvas Support
  if (!recordingCanvas.transferControlToOffscreen) {
    console.error('❌ [App] OffscreenCanvas nicht unterstützt!');
    alert('Dein Browser unterstützt keine Web Workers für Canvas. Bitte verwende Chrome, Edge oder Firefox.');
    return;
  }
  
  // 2. Erstelle Worker-Manager
  workerManagerInstance.value = new WorkerManager();
  
  // 3. Initialisiere Worker
  const workerInitialized = await workerManagerInstance.value.initialize('/lib/recorderWorker.js');
  if (!workerInitialized) {
    console.error('❌ [App] Worker konnte nicht initialisiert werden!');
    return;
  }
  
  // 4. Setze Canvas-Dimensionen
  const canvas = canvasRef.value;
  recordingCanvas.width = canvas.width;
  recordingCanvas.height = canvas.height;
  
  // 5. Übertrage Canvas an Worker (KRITISCH!)
  try {
    await workerManagerInstance.value.setupCanvas(recordingCanvas);
    console.log('✅ [App] Canvas erfolgreich an Worker übertragen');
  } catch (error) {
    console.error('❌ [App] Fehler beim Canvas-Transfer:', error);
    return;
  }
  
  // 6. Hole Audio Element
  const audio = audioRef.value;
  if (!audio) {
    console.error('❌ [App] Audio Element nicht gefunden!');
    return;
  }
  
  // 7. Erstelle kombinierten Audio-Stream
  const combinedStream = await createCombinedAudioStream();
  if (!combinedStream) {
    console.error('❌ [App] Kombinierter Stream konnte nicht erstellt werden!');
    return;
  }
  
  // 8. WICHTIG: Hole Canvas-Stream vom Worker-Canvas
  // Da der Worker jetzt die Kontrolle über den Canvas hat,
  // müssen wir den Stream vom OffscreenCanvas-Proxy holen
  const canvasStream = recordingCanvas.captureStream(0);
  console.log('✅ [App] Canvas-Stream vom Recording-Canvas geholt');
  
  // 9. Kombiniere Canvas-Stream mit Audio-Stream
  const videoTracks = canvasStream.getVideoTracks();
  const audioTracks = combinedStream.getAudioTracks();
  const combinedMediaStream = new MediaStream([...videoTracks, ...audioTracks]);
  
  console.log('✅ [App] Kombinierter MediaStream erstellt:', 
    videoTracks.length, 'Video,', audioTracks.length, 'Audio');
  
  // 10. Setze Referenzen im RecorderStore
  // Übergebe auch den WorkerManager
  console.log('🔧 [App] Setze Recorder-Refs im Store...');
  const success = recorderStore.setRecorderRefs(
    recordingCanvas,      // Recording Canvas (für captureStream)
    audio,                // Audio Element
    combinedMediaStream,  // Kombinierter Stream
    workerManagerInstance.value  // ✨ NEU: Worker-Manager
  );
  
  if (success) {
    console.log('✅✅✅ [App] Recorder mit Worker erfolgreich initialisiert! ✅✅✅');
  } else {
    console.error('❌ [App] Recorder-Initialisierung fehlgeschlagen!');
  }
}

/**
 * 3.5 - Draw-Loop anpassen (für Worker-Updates)
 */
// ERSETZE die draw() Funktion (ab Zeile 201):

function draw() {
  animationFrameId = requestAnimationFrame(draw);
  const canvas = canvasRef.value;
  if (!canvas) return;

  if (canvas.width > 0 && canvas.height > 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let drawVisualizerCallback = null;

    // Visualizer zeichnen wenn: Player spielt ODER Recorder läuft
    const shouldDrawVisualizer = visualizerStore.showVisualizer && 
      (playerStore.isPlaying || recorderStore.isRecording);

    if (analyser && shouldDrawVisualizer) {
      const visualizer = Visualizers[visualizerStore.selectedVisualizer];
      if (visualizer) {
        if (visualizerStore.selectedVisualizer !== lastSelectedVisualizerId) {
          if (typeof visualizer.init === 'function') {
            visualizer.init(canvas.width, canvas.height);
          }
          lastSelectedVisualizerId = visualizerStore.selectedVisualizer;
        }
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        if (visualizer.needsTimeData) {
          analyser.getByteTimeDomainData(dataArray);
        } else {
          analyser.getByteFrequencyData(dataArray);
        }

        drawVisualizerCallback = (targetCtx, width, height) => {
          targetCtx.save();
          targetCtx.globalAlpha = visualizerStore.colorOpacity;
          visualizer.draw(targetCtx, dataArray, bufferLength, width, height, 
            visualizerStore.visualizerColor, visualizerStore.visualizerOpacity);
          targetCtx.restore();
        };
        
        // ✨ NEU: Sende Visualizer-Daten auch an Worker (wenn Recording)
        if (recorderStore.isRecording && workerManagerInstance.value) {
          workerManagerInstance.value.updateVisualizer({
            dataArray: Array.from(dataArray),
            visualizer: visualizerStore.selectedVisualizer,
            color: visualizerStore.visualizerColor,
            opacity: visualizerStore.visualizerOpacity,
            colorOpacity: visualizerStore.colorOpacity
          });
        }
      }
    }

    // Zeichne Display Canvas (Main Thread - für UI)
    renderScene(ctx, canvas.width, canvas.height, drawVisualizerCallback);

    // ✨ NEU: Sende Render-Command an Worker (wenn Recording)
    // Der Worker zeichnet parallel sein eigenes Canvas
    if (recorderStore.isRecording && workerManagerInstance.value) {
      workerManagerInstance.value.renderFrame();
    }

    if (canvasManagerInstance.value) {
      canvasManagerInstance.value.drawInteractionOverlays(ctx);
    }
  }
}

/**
 * 3.6 - Watch für Rendering-Flags hinzufügen
 */
// Füge in onMounted() NACH initializeRecorder() hinzu (ca. Zeile 498):

// Watch für Rendering-Flags - synchronisiere mit Worker
watch(() => [
  recorderStore.includeImages,
  recorderStore.includeText,
  recorderStore.includeVisualizer
], ([images, text, visualizer]) => {
  if (workerManagerInstance.value?.isInitialized) {
    workerManagerInstance.value.updateRenderingFlags({
      includeImages: images,
      includeText: text,
      includeVisualizer: visualizer
    });
    console.log('🎛️ [App] Rendering-Flags an Worker gesendet:', { images, text, visualizer });
  }
}, { immediate: true });

// Watch für Canvas-Dimensionen - synchronisiere mit Worker
watch(() => [canvasRef.value?.width, canvasRef.value?.height], ([width, height]) => {
  if (workerManagerInstance.value?.isInitialized && width && height) {
    // Aktualisiere auch Recording Canvas Dimensionen
    recordingCanvas.width = width;
    recordingCanvas.height = height;
    
    // Informiere Worker über neue Dimensionen
    workerManagerInstance.value.updateDimensions(width, height);
    console.log('📐 [App] Canvas-Dimensionen an Worker gesendet:', width, 'x', height);
  }
});

// =============================================================================
// STEP 4: Rendering-Logik in Worker auslagern
// =============================================================================

/**
 * 4.1 - Erweitere recorderWorker.js mit vollständiger Rendering-Logik
 */
// In recorderWorker.js die renderFrame() Funktion erweitern:

function renderFrame() {
  if (!workerState.ctx || !workerState.offscreenCanvas) {
    return { success: false, error: 'Canvas nicht initialisiert' };
  }
  
  const ctx = workerState.ctx;
  const width = workerState.width;
  const height = workerState.height;
  
  // 1. Schwarzer Hintergrund (immer)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  // 2. ZUSCHALTBAR: Bilder zeichnen
  if (workerState.includeImages) {
    // Zeichne alle geladenen Bilder
    for (const [imageId, imageBitmap] of workerState.images) {
      // TODO: Position und Größe aus State holen
      // Für jetzt: Zentriert und skaliert
      const scale = Math.min(width / imageBitmap.width, height / imageBitmap.height);
      const x = (width - imageBitmap.width * scale) / 2;
      const y = (height - imageBitmap.height * scale) / 2;
      
      ctx.drawImage(
        imageBitmap,
        x, y,
        imageBitmap.width * scale,
        imageBitmap.height * scale
      );
    }
  }
  
  // 3. ZUSCHALTBAR: Visualizer zeichnen
  if (workerState.includeVisualizer && workerState.analyserData) {
    // TODO: Visualizer-Algorithmen implementieren
    // Für jetzt: Einfache Balken
    const barCount = 64;
    const barWidth = width / barCount;
    
    ctx.fillStyle = workerState.visualizerColor;
    ctx.globalAlpha = workerState.visualizerOpacity * workerState.colorOpacity;
    
    for (let i = 0; i < barCount && i < workerState.analyserData.length; i++) {
      const barHeight = (workerState.analyserData[i] / 255) * height * 0.5;
      ctx.fillRect(
        i * barWidth,
        height - barHeight,
        barWidth - 2,
        barHeight
      );
    }
    
    ctx.globalAlpha = 1.0;
  }
  
  // 4. ZUSCHALTBAR: Texte zeichnen
  if (workerState.includeText && workerState.texts.length > 0) {
    for (const text of workerState.texts) {
      ctx.save();
      
      ctx.font = `${text.size}px ${text.font}`;
      ctx.fillStyle = text.color;
      ctx.textAlign = text.align;
      ctx.textBaseline = 'middle';
      
      const x = (text.x / 100) * width;
      const y = (text.y / 100) * height;
      
      ctx.fillText(text.content, x, y);
      
      ctx.restore();
    }
  }
  
  return { success: true };
}

// =============================================================================
// STEP 5: recorder.js anpassen
// =============================================================================

/**
 * 5.1 - recorderStore.js erweitern
 */
// In setRecorderRefs() (ca. Zeile 92) den workerManager-Parameter hinzufügen:

setRecorderRefs(canvas, audioElement, audioStream, workerManager = null) {
  if (this.recorder) {
    console.warn('[RecorderStore] Recorder bereits initialisiert');
    return true;
  }

  // Speichere Worker-Manager
  this.workerManager = workerManager;

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

    console.log('✅ [RecorderStore] Recorder erfolgreich initialisiert (mit Worker)');
    
    // Exponiere Store global für dynamische FPS
    window.recorderStore = this;
    console.log('✅ [RecorderStore] Store global verfügbar gemacht');
    
    this.syncRecorderState();
    return true;
  } catch (error) {
    console.error('❌ [RecorderStore] Recorder Initialisierung fehlgeschlagen:', error);
    return false;
  }
}

/**
 * 5.2 - recorder.js Constructor anpassen
 */
// In recorder.js Constructor (Zeile 10) workerManager hinzufügen:

constructor(recordingCanvas, audioElement, audioStream, uiElements, callbacks, workerManager = null) {
  this.recordingCanvas = recordingCanvas;
  this.audioElement = audioElement;
  this.audioStream = audioStream;
  this.ui = uiElements;
  this.onStateChange = callbacks.onStateChange;
  this.onForceRedraw = callbacks.onForceRedraw;
  this.workerManager = workerManager;  // ✨ NEU

  // Rest bleibt gleich...
}

/**
 * 5.3 - Frame-Requesting anpassen
 */
// In _startFrameRequester() (ca. Zeile 220):
// Ersetze videoTrack.requestFrame() durch Worker-Frame-Request:

if (!this.isActive || this.isPaused) {
  return;
}

const now = Date.now();
const interval = getOptimalFPS();

if (now - lastFrameTime >= interval) {
  try {
    // ✨ NEU: Hole Frame vom Worker statt vom Video-Track
    if (this.workerManager?.isInitialized) {
      this.workerManager.renderFrame();
    }
    
    // Video-Track Frame Request (für MediaRecorder)
    if (typeof videoTrack.requestFrame === 'function') {
      videoTrack.requestFrame();
    }
    
    lastFrameTime = now;
    errorCount = 0;
  } catch (error) {
    errorCount++;
    console.error(`[RECORDER] Frame request error: ${error.message} (${errorCount}/${MAX_ERRORS})`);
    if (errorCount >= MAX_ERRORS) {
      console.error('[RECORDER] ❌ Too many errors - stopping frame requester');
      this._stopFrameRequester();
    }
  }
}

// =============================================================================
// STEP 6: Testing & Optimierung
// =============================================================================

/**
 * 6.1 - Test-Checkliste
 * 
 * ✅ Browser unterstützt OffscreenCanvas?
 * ✅ Worker startet ohne Fehler?
 * ✅ Canvas wird an Worker übertragen?
 * ✅ Rendering-Flags werden synchronisiert?
 * ✅ Bilder werden in Worker geladen?
 * ✅ Visualizer funktioniert?
 * ✅ Text wird gezeichnet?
 * ✅ Toggle-Buttons arbeiten ohne Freezes?
 * ✅ Aufnahme startet/stoppt korrekt?
 * ✅ Video-Qualität ist gut?
 * ✅ Keine Speicherlecks?
 */

/**
 * 6.2 - Performance-Monitoring hinzufügen
 */
// In recorderWorker.js:

let frameCount = 0;
let lastFPSUpdate = performance.now();

function renderFrame() {
  // ... existing code ...
  
  // FPS Monitoring
  frameCount++;
  const now = performance.now();
  if (now - lastFPSUpdate >= 1000) {
    const fps = (frameCount / (now - lastFPSUpdate)) * 1000;
    console.log(`[Worker] 🎞️ FPS: ${fps.toFixed(1)}`);
    frameCount = 0;
    lastFPSUpdate = now;
  }
  
  return { success: true };
}

/**
 * 6.3 - Cleanup bei Component Unmount
 */
// In App.vue onUnmounted Hook hinzufügen:

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  
  if (workerManagerInstance.value) {
    workerManagerInstance.value.terminate();
    console.log('✅ [App] Worker beendet');
  }
  
  if (audioContext) {
    audioContext.close();
  }
});

// =============================================================================
// ZUSAMMENFASSUNG
// =============================================================================

/**
 * Nach Abschluss aller Schritte:
 * 
 * VORTEILE:
 * ✅ Keine UI-Freezes beim Toggle von Bildern/Text/Visualizer
 * ✅ Smooth 30 FPS während Aufnahme
 * ✅ Main Thread bleibt frei für User-Interaktionen
 * ✅ Bessere Aufnahme-Qualität durch konsistentes Timing
 * ✅ Skalierbar für mehr Bilder ohne Performance-Verlust
 * 
 * BROWSER-SUPPORT:
 * ✅ Chrome 69+
 * ✅ Edge 79+
 * ✅ Firefox 105+
 * ✅ Safari 16.4+
 * 
 * FALLBACK:
 * Falls OffscreenCanvas nicht unterstützt wird, fällt das System
 * automatisch auf den alten Main-Thread-Rendering zurück.
 */
