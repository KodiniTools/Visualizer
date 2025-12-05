<template>
  <div id="app-container">

    <div class="layout-grid">

      <aside class="left-toolbar">
        <TextManagerPanel />
        <FotoPanel />
      </aside>

      <main class="center-column">
        <div class="canvas-wrapper">
          <canvas ref="canvasRef"></canvas>
        </div>
      </main>

      <aside class="right-panel">
        <FileUploadPanel />
        <PlayerPanel />
        <RecorderPanel />
        <VisualizerPanel />
        <ControlsPanel />
        <CanvasControlPanel />
      </aside>

    </div>

    <audio ref="audioRef" crossOrigin="anonymous" style="display: none;"></audio>

    <!-- Onboarding & Help System -->
    <OnboardingWizard
      ref="onboardingWizardRef"
      @complete="onTutorialComplete"
      @skip="onTutorialSkip"
    />
    <QuickStartGuide
      ref="quickStartGuideRef"
      @show-tutorial="showTutorial"
    />

  </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, provide, watch, nextTick } from 'vue';
import { usePlayerStore } from './stores/playerStore.js';
import { useRecorderStore } from './stores/recorderStore.js';
import { useTextStore } from './stores/textStore.js';
import { useVisualizerStore } from './stores/visualizerStore.js';
import { useGridStore } from './stores/gridStore.js';
import { useWorkspaceStore } from './stores/workspaceStore.js';
import FileUploadPanel from './components/FileUploadPanel.vue';
import PlayerPanel from './components/PlayerPanel.vue';
import RecorderPanel from './components/RecorderPanel.vue';
import FotoPanel from './components/FotoPanel.vue';
import TextManagerPanel from './components/TextManagerPanel.vue';
import ControlsPanel from './components/ControlsPanel.vue';
import VisualizerPanel from './components/VisualizerPanel.vue';
import CanvasControlPanel from './components/CanvasControlPanel.vue';
import OnboardingWizard from './components/OnboardingWizard.vue';
import QuickStartGuide from './components/QuickStartGuide.vue';
import { Visualizers } from './lib/visualizers.js';
import { TextManager } from './lib/textManager.js';
import { CUSTOM_FONTS } from './lib/fonts.js';
import { FontManager } from './lib/fontManager.js';
import { CanvasManager } from './lib/canvasManager.js';
import { FotoManager } from './lib/fotoManager.js';
import { GridManager } from './lib/gridManager.js';
import { MultiImageManager } from './lib/multiImageManager.js';
import { KeyboardShortcuts } from './lib/keyboardShortcuts.js';

// Worker-Manager removed - always caused errors and fell back anyway

const playerStore = usePlayerStore();
const recorderStore = useRecorderStore();
const textStore = useTextStore();
const visualizerStore = useVisualizerStore();
const gridStore = useGridStore();
const workspaceStore = useWorkspaceStore();
const audioRef = ref(null);
const canvasRef = ref(null);

// Recording Canvas - wird für den Recorder verwendet
let recordingCanvas = document.createElement('canvas'); // ✅ FIX 1: let statt const!
let recordingCanvasStream = null; // ✅ NEU: Globale Referenz zum Canvas-Stream

let audioContext, analyser, sourceNode, outputGain, recordingDest, recordingGain;
let animationFrameId;
let textManagerInstance = null;
const lastSelectedVisualizerId = ref(null); // ✅ FIX: Reaktiv für Hot-Reload Unterstützung
let audioDataArray = null; // ✅ Wiederverwendbares Array für Audio-Daten (verhindert GC-Overhead)
const lastCanvasWidth = ref(0); // ✅ FIX: Reaktiv für Hot-Reload
const lastCanvasHeight = ref(0);
let visualizerCacheCanvas = null; // ✅ FIX: Offscreen canvas for visualizer caching
let visualizerCacheCtx = null;

const canvasManagerInstance = ref(null);
const fotoManagerInstance = ref(null);
const gridManagerInstance = ref(null);
const multiImageManagerInstance = ref(null);
const fontManagerInstance = ref(null);
const keyboardShortcutsInstance = ref(null);
const onboardingWizardRef = ref(null);
const quickStartGuideRef = ref(null);

// Worker-Manager instance removed - not needed

provide('fontManager', fontManagerInstance);
provide('canvasManager', canvasManagerInstance);
provide('fotoManager', fotoManagerInstance);
provide('multiImageManager', multiImageManagerInstance);

// Onboarding/Help Funktionen
function showTutorial() {
  if (onboardingWizardRef.value) {
    onboardingWizardRef.value.show();
  }
}

function onTutorialComplete() {
  console.log('✅ Tutorial abgeschlossen');
}

function onTutorialSkip() {
  console.log('⏭️ Tutorial übersprungen');
}

// =============================================================================
// ✅ OPTION 3: SEPARATE VISUALIZER RENDER-LOOP (verhindert Freeze bei Image-Toggle)
// =============================================================================

// Render-Loop State (außerhalb von Vue Reactivity für bessere Performance)
let visualizerAnimationId = null;
let isVisualizerActive = false;
let loopStartCount = 0; // ✅ NEU: Debug-Counter

/**
 * ✅ FIX: Startet Visualizer-Loop mit Force-Restart
 */
const startVisualizerLoop = () => {
  loopStartCount++;
  console.log(`🎨 [App] startVisualizerLoop (#${loopStartCount}, aktiv: ${isVisualizerActive})`);
  
  // ✅ FIX: Wenn bereits aktiv, ERST stoppen dann neu starten
  if (isVisualizerActive || visualizerAnimationId) {
    console.warn('⚠️ [App] Loop läuft bereits - erzwinge Neustart');
    stopVisualizerLoop();
    
    // Kurze Verzögerung für sauberen Restart
    setTimeout(() => {
      startVisualizerLoopInternal();
    }, 50);
    return;
  }
  
  startVisualizerLoopInternal();
};

/**
 * ✅ NEU: Interne Loop-Start Funktion
 */
const startVisualizerLoopInternal = () => {
  isVisualizerActive = true;
  console.log(`🎨 [App] Visualizer-Loop GESTARTET (#${loopStartCount})`);
  
  const renderFrame = () => {
    // ✅ FIX: Prüfe Flag ZUERST
    if (!isVisualizerActive) {
      console.log('🛑 [App] Visualizer-Loop gestoppt (Flag=false)');
      visualizerAnimationId = null;
      return;
    }
    
    try {
      // Die normale draw() Funktion kümmert sich bereits um alles
      // Diese Loop stellt nur sicher dass sie weiterläuft bei Vue Re-renders
      
      // Wenn Recording läuft, force Redraw vom Recording Canvas
      if (recorderStore.isRecording && recordingCanvas) {
        const recordingCtx = recordingCanvas.getContext('2d');
        if (recordingCtx && canvasRef.value) {
          // Die draw() Funktion macht bereits alles,
          // wir stellen nur sicher dass sie nicht durch Re-renders unterbrochen wird
        }
      }
      
    } catch (error) {
      console.error('❌ [App] Visualizer-Render Error:', error);
      // ✅ NEU: Bei Fehler Loop stoppen
      isVisualizerActive = false;
      visualizerAnimationId = null;
      return;
    }
    
    // ✅ FIX: Nur nächsten Frame anfordern wenn noch aktiv
    if (isVisualizerActive) {
      visualizerAnimationId = requestAnimationFrame(renderFrame);
    }
  };
  
  // Start Loop
  renderFrame();
};

/**
 * ✅ FIX: Stoppt Visualizer-Loop mit vollständigem Cleanup
 */
const stopVisualizerLoop = () => {
  console.log(`🛑 [App] stopVisualizerLoop (aktiv: ${isVisualizerActive}, ID: ${visualizerAnimationId})`);
  
  // ✅ FIX: Setze Flag SOFORT (entferne Early-Return Check)
  isVisualizerActive = false;
  
  // Cancel laufende Animation
  if (visualizerAnimationId) {
    cancelAnimationFrame(visualizerAnimationId);
    visualizerAnimationId = null;
    console.log('✅ [App] Animation Frame cancelled');
  }
  
  // ✅ NEU: Cleanup Recording Canvas Stream
  if (recordingCanvasStream) {
    try {
      recordingCanvasStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log(`✅ [App] Track gestoppt: ${track.kind}`);
        }
      });
      recordingCanvasStream = null;
      console.log('✅ [App] Canvas-Stream vollständig bereinigt');
    } catch (error) {
      console.error('❌ [App] Fehler beim Cleanup des Canvas-Streams:', error);
    }
  }
  
  console.log('🛑 [App] Visualizer-Loop GESTOPPT & bereinigt');
};

// =============================================================================
// END OPTION 3
// =============================================================================


function setupAudioContext() {
  if (audioContext || !audioRef.value) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  sourceNode = audioContext.createMediaElementSource(audioRef.value);
  outputGain = audioContext.createGain();

  // Recording Gain für dynamische Audio-Steuerung während Aufnahme
  recordingGain = audioContext.createGain();
  recordingGain.gain.value = 0; // Start: STUMM (Audio wird nur aufgenommen wenn Player aktiv spielt)

  recordingDest = audioContext.createMediaStreamDestination();

  sourceNode.connect(outputGain);
  outputGain.connect(audioContext.destination);
  sourceNode.connect(analyser);

  // Audio-Routing über Recording Gain zu Recording Destination
  sourceNode.connect(recordingGain);
  recordingGain.connect(recordingDest);

  console.log('✅ [App] Audio Context mit dynamischem Recording Gain eingerichtet');
}

// Funktionen für zuschaltbares Audio im Recorder
function enableRecorderAudio() {
  if (recordingGain) {
    recordingGain.gain.value = 1;
    console.log('🔊 [App] Recorder Audio ENABLED');
  }
}

function disableRecorderAudio() {
  if (recordingGain) {
    recordingGain.gain.value = 0;
    console.log('🔇 [App] Recorder Audio DISABLED');
  }
}

function onObjectSelected(selectedObject) {
  if (!window.fotoPanelControls) {
    setTimeout(() => onObjectSelected(selectedObject), 100);
    return;
  }

  const isImageSelected = selectedObject &&
    (selectedObject.type === 'image' ||
      selectedObject.type === 'background' ||
      selectedObject.type === 'workspace-background');

  if (window.fotoPanelControls.currentActiveImage) {
    window.fotoPanelControls.currentActiveImage.value = isImageSelected ? selectedObject : null;
  }

  window.fotoPanelControls.container.style.display = isImageSelected ? 'block' : 'none';

  if (isImageSelected && selectedObject.type === 'image' && window.fotoPanelControls.loadImageSettings) {
    window.fotoPanelControls.loadImageSettings(selectedObject);
  }
  else if (isImageSelected && fotoManagerInstance.value) {
    fotoManagerInstance.value.updateUIFromSettings(
      window.fotoPanelControls,
      selectedObject
    );
  }
}

function renderScene(ctx, canvasWidth, canvasHeight, drawVisualizerCallback) {
  if (canvasManagerInstance.value && !canvasManagerInstance.value.isCanvasEmpty()) {
    canvasManagerInstance.value.drawScene(ctx);
  } else {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  if (drawVisualizerCallback) {
    drawVisualizerCallback(ctx, canvasWidth, canvasHeight);
  }

  if (multiImageManagerInstance.value) {
    multiImageManagerInstance.value.drawImages(ctx);
  }

  if (textManagerInstance) {
    textManagerInstance.draw(ctx, canvasWidth, canvasHeight);
  }
}

// Separate Funktion für Recording Canvas - rendert IMMER alle Module
function renderRecordingScene(ctx, canvasWidth, canvasHeight, drawVisualizerCallback) {
  // Basis: Schwarzer Hintergrund (immer)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Canvas Manager (Bilder, Backgrounds)
  if (canvasManagerInstance.value && !canvasManagerInstance.value.isCanvasEmpty()) {
    canvasManagerInstance.value.drawScene(ctx);
  }

  // Visualizer
  if (drawVisualizerCallback) {
    drawVisualizerCallback(ctx, canvasWidth, canvasHeight);
  }

  // Multi Images
  if (multiImageManagerInstance.value) {
    multiImageManagerInstance.value.drawImages(ctx);
  }

  // Text
  if (textManagerInstance) {
    textManagerInstance.draw(ctx, canvasWidth, canvasHeight);
  }
}

// ✨ STEP 3.5: Draw-Loop mit Worker-Updates
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
        // ✅ FIX: Check for visualizer change OR canvas resize (mit reaktiven refs)
        const visualizerChanged = visualizerStore.selectedVisualizer !== lastSelectedVisualizerId.value;
        const canvasResized = canvas.width !== lastCanvasWidth.value || canvas.height !== lastCanvasHeight.value;

        if (visualizerChanged || canvasResized) {
          // ✅ NEU: Cleanup alter Visualizer-State wenn vorhanden
          if (lastSelectedVisualizerId.value && Visualizers[lastSelectedVisualizerId.value]) {
            const oldVisualizer = Visualizers[lastSelectedVisualizerId.value];
            if (typeof oldVisualizer.cleanup === 'function') {
              try {
                oldVisualizer.cleanup();
                console.log(`🧹 [App] Visualizer "${lastSelectedVisualizerId.value}" bereinigt`);
              } catch (e) {
                console.warn(`⚠️ [App] Cleanup-Fehler bei "${lastSelectedVisualizerId.value}":`, e);
              }
            }
          }

          // Initialisiere neuen Visualizer
          if (typeof visualizer.init === 'function') {
            visualizer.init(canvas.width, canvas.height);
          }
          lastSelectedVisualizerId.value = visualizerStore.selectedVisualizer;
          lastCanvasWidth.value = canvas.width;
          lastCanvasHeight.value = canvas.height;
        }

        const bufferLength = analyser.frequencyBinCount;
        // ✅ Performance: Array einmal erstellen und wiederverwenden
        if (!audioDataArray || audioDataArray.length !== bufferLength) {
          audioDataArray = new Uint8Array(bufferLength);
        }
        if (visualizer.needsTimeData) {
          analyser.getByteTimeDomainData(audioDataArray);
        } else {
          analyser.getByteFrequencyData(audioDataArray);
        }

        // ✅ FIX: Cache visualizer rendering to offscreen canvas (prevents double rendering)
        // Initialize or resize cache canvas if needed
        if (!visualizerCacheCanvas || visualizerCacheCanvas.width !== canvas.width || visualizerCacheCanvas.height !== canvas.height) {
          visualizerCacheCanvas = document.createElement('canvas');
          visualizerCacheCanvas.width = canvas.width;
          visualizerCacheCanvas.height = canvas.height;
          visualizerCacheCtx = visualizerCacheCanvas.getContext('2d');
        }

        // Render visualizer ONCE to cache canvas (with error handling)
        visualizerCacheCtx.clearRect(0, 0, canvas.width, canvas.height);
        visualizerCacheCtx.save();
        visualizerCacheCtx.globalAlpha = visualizerStore.colorOpacity;
        try {
          visualizer.draw(visualizerCacheCtx, audioDataArray, bufferLength, canvas.width, canvas.height, visualizerStore.visualizerColor, visualizerStore.visualizerOpacity);
          // ✅ NEU: Markiere Visualizer als funktionierend für Fallback
          visualizerStore.markVisualizerWorking(visualizerStore.selectedVisualizer);
        } catch (error) {
          console.error(`❌ Visualizer "${visualizerStore.selectedVisualizer}" Fehler:`, error);
          // ✅ VERBESSERT: Fallback zu letztem funktionierenden Visualizer
          visualizerCacheCtx.fillStyle = '#000';
          visualizerCacheCtx.fillRect(0, 0, canvas.width, canvas.height);
          // Wechsle zum letzten funktionierenden Visualizer
          visualizerStore.fallbackToLastWorking();
        }
        visualizerCacheCtx.restore();

        // ✅ Callback now copies from cache instead of re-rendering
        // ✨ NEU: Mit Position und Skalierung aus dem Store
        drawVisualizerCallback = (targetCtx, width, height, useTransform = true) => {
          const scale = visualizerStore.visualizerScale;
          const posX = visualizerStore.visualizerX;
          const posY = visualizerStore.visualizerY;

          // Berechne skalierte Größe
          const scaledWidth = canvas.width * scale;
          const scaledHeight = canvas.height * scale;

          // Berechne Position (zentriert auf den gewählten Punkt)
          const destX = width * posX - scaledWidth / 2;
          const destY = height * posY - scaledHeight / 2;

          if (useTransform && (scale !== 1.0 || posX !== 0.5 || posY !== 0.5)) {
            // Zeichne den Cache-Canvas an der gewünschten Position und Größe
            targetCtx.drawImage(
              visualizerCacheCanvas,
              0, 0, canvas.width, canvas.height,  // Source: ganzer Cache
              destX, destY, scaledWidth, scaledHeight  // Dest: skaliert + positioniert
            );
          } else {
            // Standard: 1:1 kopieren wenn keine Transformation
            if (width === canvas.width && height === canvas.height) {
              targetCtx.drawImage(visualizerCacheCanvas, 0, 0);
            } else {
              targetCtx.drawImage(visualizerCacheCanvas, 0, 0, width, height);
            }
          }
        };
      }
    }

    // Zeichne Display Canvas (Main Thread - für UI)
    renderScene(ctx, canvas.width, canvas.height, drawVisualizerCallback);

    // ✅ CRITICAL FIX: Wenn Recording läuft, zeichne auch auf Recording Canvas!
    // Recording Canvas bleibt im Main Thread und wird hier gezeichnet
    if (recorderStore.isRecording) {
      const recordingCtx = recordingCanvas.getContext('2d');
      if (recordingCtx) {
        // Zeichne Recording Scene (mit zuschaltbaren Modulen)
        // ✅ Uses cached visualizer - no duplicate rendering!
        renderRecordingScene(recordingCtx, recordingCanvas.width, recordingCanvas.height, drawVisualizerCallback);

        // ℹ️ HINWEIS: requestFrame() nicht nötig bei captureStream(30)
        // Der Stream captured automatisch 30 FPS vom Canvas
      }
    }

    // ✅ FIXED: drawInteractiveElements statt drawInteractionOverlays
    if (canvasManagerInstance.value) {
      canvasManagerInstance.value.drawInteractiveElements(ctx);
      canvasManagerInstance.value.drawWorkspaceOutline(ctx);
      if (gridManagerInstance.value) {
        gridManagerInstance.value.drawGrid(ctx);
      }
      if (multiImageManagerInstance.value && multiImageManagerInstance.value.getSelectedImage()) {
        multiImageManagerInstance.value.drawInteractiveElements(ctx);
      }
    }

    // Recording Canvas wird im Main Thread gezeichnet (siehe oben)
  }
}

async function createCombinedAudioStream() {
  if (!recordingDest) {
    console.error('[App] Recording Destination nicht verfügbar!');
    return null;
  }

  console.log('[App] 🎵 Erstelle kombinierten Audio-Stream...');
  const stream = recordingDest.stream;
  const tracks = stream.getAudioTracks();

  console.log('[App] Audio-Tracks gefunden:', tracks.length);
  tracks.forEach((track, i) => {
    console.log(`[App] Track ${i}:`, track.label, 'enabled:', track.enabled, 'readyState:', track.readyState);
  });

  return stream;
}

// Globale Funktion für Recorder um frischen Audio-Stream zu holen
window.getAudioStreamForRecorder = createCombinedAudioStream;

// ✅ CRITICAL: Globale Funktion für Canvas-Stream
// recorder.js MUSS diese Funktion verwenden statt selbst captureStream() aufzurufen!
window.getCanvasStreamForRecorder = function() {
  console.log('📹 [App] getCanvasStreamForRecorder() aufgerufen');
  
  // Cleanup alter Stream falls vorhanden
  if (recordingCanvasStream) {
    recordingCanvasStream.getTracks().forEach(track => track.stop());
    console.log('🧹 [App] Alter Canvas-Stream gestoppt');
  }
  
  // Erstelle neuen Stream mit 30 FPS
  recordingCanvasStream = recordingCanvas.captureStream(30);
  console.log('✅ [App] Neuer Canvas-Stream erstellt (30 FPS)');
  
  return recordingCanvasStream;
};

// ✨ STEP 3.4: Recorder mit Worker initialisieren
// 🔧 CRITICAL FIX: Worker bekommt EIGENES Canvas, Recording Canvas bleibt im Main Thread!
async function initializeRecorder() {
  console.log('🎬 [App] Initialisiere Recorder...');

  const canvas = canvasRef.value;
  recordingCanvas.width = canvas.width;
  recordingCanvas.height = canvas.height;

  // ✅ MONKEY PATCH: Überschreibe captureStream für recordingCanvas
  // Damit recorder.js IMMER 30 FPS bekommt, auch wenn es captureStream(0) aufruft!
  const originalCaptureStream = recordingCanvas.captureStream.bind(recordingCanvas);
  recordingCanvas.captureStream = function(frameRate) {
    console.log(`🎭 [App] captureStream() aufgerufen mit frameRate: ${frameRate}`);

    // Cleanup alter Stream falls vorhanden
    if (recordingCanvasStream) {
      recordingCanvasStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      });
      console.log('🧹 [App] Alter Canvas-Stream gestoppt');
    }

    // ✅ CRITICAL FIX: Rendere Canvas BEVOR Stream erstellt wird!
    // Dies stellt sicher dass der Stream einen gültigen Frame hat
    const recordingCtx = recordingCanvas.getContext('2d');
    if (recordingCtx && canvasManagerInstance.value) {
      renderRecordingScene(
        recordingCtx,
        recordingCanvas.width,
        recordingCanvas.height,
        null // Kein Visualizer beim Warmup
      );
      console.log('✅ [App] Recording Canvas pre-rendered für Stream');
    }

    // IMMER 30 FPS verwenden, egal was übergeben wurde!
    recordingCanvasStream = originalCaptureStream(30);
    console.log('✅ [App] Canvas-Stream mit 30 FPS erstellt (via Monkey Patch)');

    return recordingCanvasStream;
  };

  // Erstelle initialen Stream
  const canvasStream = recordingCanvas.captureStream(30);
  console.log('✅ [App] Canvas-Stream erstellt (30 FPS)');

  const audio = audioRef.value;
  if (!audio) {
    console.error('❌ [App] Audio Element nicht gefunden!');
    return;
  }

  const combinedAudioStream = await createCombinedAudioStream();
  if (!combinedAudioStream) {
    console.error('❌ [App] Kombinierter Stream konnte nicht erstellt werden!');
    return;
  }

  // Kombiniere Canvas-Stream mit Audio-Stream
  const videoTracks = canvasStream.getVideoTracks();
  const audioTracks = combinedAudioStream.getAudioTracks();
  const combinedMediaStream = new MediaStream([...videoTracks, ...audioTracks]);

  console.log('✅ [App] Kombinierter MediaStream erstellt:',
    videoTracks.length, 'Video,', audioTracks.length, 'Audio');

  console.log('🔧 [App] Setze Recorder-Refs im Store...');
  const success = recorderStore.setRecorderRefs(
    recordingCanvas,
    audio,
    combinedMediaStream,
    null  // Kein Worker-Manager mehr
  );

  if (success) {
    console.log('✅ [App] Recorder erfolgreich initialisiert');
  } else {
    console.error('❌ [App] Recorder-Initialisierung fehlgeschlagen!');
  }
}

onMounted(async () => {
  console.log('🚀 [App] onMounted - Starte Initialisierung...');

  // 1. FontManager initialisieren
  console.log('🎨 Initialisiere FontManager...');
  fontManagerInstance.value = new FontManager();
  try {
    const result = await fontManagerInstance.value.initialize(CUSTOM_FONTS);
    console.log(`✅ FontManager: ${result.loaded} Fonts geladen`);
  } catch (error) {
    console.error('❌ FontManager Fehler:', error);
  }

  // 2. Player initialisieren
  playerStore.setAudioRef(audioRef.value);
  if (audioRef.value) {
    audioRef.value.addEventListener('play', () => {
      playerStore.isPlaying = true;
      // ✅ AudioContext ist bereits initialisiert - nur resume wenn suspended
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      // Audio für Recorder einschalten wenn Player spielt
      enableRecorderAudio();
      if (canvasManagerInstance.value && multiImageManagerInstance.value) {
        keyboardShortcutsInstance.value = new KeyboardShortcuts(
          { playerStore, recorderStore, gridStore },
          {
            canvasManager: canvasManagerInstance.value,
            multiImageManager: multiImageManagerInstance.value
          }
        );
        keyboardShortcutsInstance.value.enable();
        console.log('⌨️ Keyboard Shortcuts aktiviert');
      }
    });
    audioRef.value.addEventListener('pause', () => {
      playerStore.isPlaying = false;
      // Audio für Recorder ausschalten wenn Player pausiert
      disableRecorderAudio();
    });
    audioRef.value.addEventListener('ended', () => {
      playerStore.nextTrack();
      // Audio für Recorder ausschalten wenn Track endet
      disableRecorderAudio();
    });
  }

  // 3. ✅ CRITICAL FIX: Audio-Context FRÜH initialisieren (WICHTIG für Recorder!)
  // Der Recorder braucht recordingDest beim Prepare, also müssen wir den AudioContext
  // schon JETZT erstellen, nicht erst beim Play!
  console.log('🎵 Initialisiere Audio-Context für Recorder...');
  setupAudioContext();
  console.log('✅ Audio-Context bereit - recordingDest verfügbar');

  // 4. Canvas initialisieren
  const canvas = canvasRef.value;
  if (canvas) {
    const presetKey = workspaceStore.selectedPresetKey;
    let canvasWidth = 1920;
    let canvasHeight = 1080;

    if (presetKey) {
      const socialMediaPresets = {
        'tiktok': { width: 1080, height: 1920 },
        'instagram-story': { width: 1080, height: 1920 },
        'instagram-post': { width: 1080, height: 1080 },
        'instagram-reel': { width: 1080, height: 1920 },
        'youtube-short': { width: 1080, height: 1920 },
        'youtube-video': { width: 1920, height: 1080 },
        'facebook-post': { width: 1200, height: 630 },
        'twitter-video': { width: 1280, height: 720 },
        'linkedin-video': { width: 1920, height: 1080 }
      };

      if (socialMediaPresets[presetKey]) {
        canvasWidth = socialMediaPresets[presetKey].width;
        canvasHeight = socialMediaPresets[presetKey].height;
      }
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    console.log(`🎨 Canvas initialisiert mit fester Auflösung: ${canvasWidth}x${canvasHeight}`);

    textManagerInstance = new TextManager(textStore);
    gridManagerInstance.value = new GridManager(canvas);
    fotoManagerInstance.value = new FotoManager(() => {});

    multiImageManagerInstance.value = new MultiImageManager(canvas, {
      redrawCallback: () => {},
      onImageSelected: onObjectSelected,
      onImageChanged: () => {},
      fotoManager: fotoManagerInstance.value  // ✨ FotoManager für Filter + Schatten
    });

    canvasManagerInstance.value = new CanvasManager(canvas, {
      redrawCallback: () => {},
      onObjectSelected: onObjectSelected,
      onStateChange: () => {},
      onTextDoubleClick: () => {},
      textManager: textManagerInstance,
      fotoManager: fotoManagerInstance.value,
      gridManager: gridManagerInstance.value,
      multiImageManager: multiImageManagerInstance.value
    });
    canvasManagerInstance.value.setupInteractionHandlers();

    watch(() => gridStore.isVisible, (newValue) => {
      if (gridManagerInstance.value) {
        gridManagerInstance.value.setVisibility(newValue);
      }
    }, { immediate: true });

    watch(() => workspaceStore.selectedPresetKey, (newKey) => {
      if (canvasManagerInstance.value) {
        canvasManagerInstance.value.setWorkspacePreset(newKey);

        if (newKey) {
          const socialMediaPresets = {
            'tiktok': { width: 1080, height: 1920 },
            'instagram-story': { width: 1080, height: 1920 },
            'instagram-post': { width: 1080, height: 1080 },
            'instagram-reel': { width: 1080, height: 1920 },
            'youtube-short': { width: 1080, height: 1920 },
            'youtube-video': { width: 1920, height: 1080 },
            'facebook-post': { width: 1200, height: 630 },
            'twitter-video': { width: 1280, height: 720 },
            'linkedin-video': { width: 1920, height: 1080 }
          };

          if (socialMediaPresets[newKey]) {
            canvas.width = socialMediaPresets[newKey].width;
            canvas.height = socialMediaPresets[newKey].height;

            // NEU: Auch Recording Canvas aktualisieren
            recordingCanvas.width = canvas.width;
            recordingCanvas.height = canvas.height;

            console.log(`🎨 Canvas-Größe geändert zu: ${canvas.width}x${canvas.height}`);

            // ✅ Visualizer bei Resize re-initialisieren
            const visualizer = Visualizers[visualizerStore.selectedVisualizer];
            if (visualizer?.init) {
              visualizer.init(canvas.width, canvas.height);
              console.log(`🎨 Visualizer "${visualizerStore.selectedVisualizer}" re-initialisiert`);
            }
          }
        } else {
          canvas.width = 1920;
          canvas.height = 1080;

          // NEU: Auch Recording Canvas zurücksetzen
          recordingCanvas.width = 1920;
          recordingCanvas.height = 1080;

          // ✅ Visualizer bei Resize re-initialisieren
          const visualizer = Visualizers[visualizerStore.selectedVisualizer];
          if (visualizer?.init) {
            visualizer.init(canvas.width, canvas.height);
            console.log(`🎨 Visualizer "${visualizerStore.selectedVisualizer}" re-initialisiert`);
          }

          console.log(`🎨 Canvas zurück zu Standard: 1920x1080`);
        }
      }
    }, { immediate: true });
  }

  // 5. NEU: Recorder initialisieren (Audio-Context ist jetzt bereit!)
  await initializeRecorder();

  // Watch für Canvas-Dimensionen - aktualisiere Recording Canvas
  watch(() => [canvasRef.value?.width, canvasRef.value?.height], ([width, height]) => {
    if (width && height) {
      // Aktualisiere Recording Canvas Dimensionen
      recordingCanvas.width = width;
      recordingCanvas.height = height;
      console.log('📐 [App] Recording Canvas Dimensionen aktualisiert:', width, 'x', height);
    }
  });

  // 6. Starte Draw-Loop
  draw();

  // ✅ FIX: Robuster Watch mit Verzögerung beim Start
  watch(() => recorderStore.isRecording, (isRecording) => {
    if (isRecording) {
      console.log('🎬 [App] Recording gestartet');
      // ✅ FIX: Kurze Verzögerung für sauberen Start
      setTimeout(() => {
        startVisualizerLoop();
      }, 100);
    } else {
      console.log('🛑 [App] Recording gestoppt');
      // ✅ FIX: Sofortiger Stop ohne Verzögerung
      stopVisualizerLoop();

      // ✅ SOLUTION: Erstelle Recording Canvas komplett NEU nach jeder Aufnahme
      // Grund: Browser behält interne Caches/States für Canvas-Objekte
      // - Image-Decoder-Caches bleiben hängen
      // - Stream-Kontexte werden nicht vollständig freigegeben
      // - Nur komplette Neuerststellung gibt garantiert sauberen Slate
      console.log('🔄 [App] Erstelle Recording Canvas neu...');

      // Stoppe und cleanup alter Stream
      if (recordingCanvasStream) {
        recordingCanvasStream.getTracks().forEach(track => track.stop());
        recordingCanvasStream = null;
      }

      // Erstelle komplett neuen Canvas
      const canvas = canvasRef.value;
      recordingCanvas = document.createElement('canvas');
      recordingCanvas.width = canvas.width;
      recordingCanvas.height = canvas.height;

      console.log('✅ [App] Frischer Recording Canvas erstellt:', recordingCanvas.width, 'x', recordingCanvas.height);

      // Update Recorder mit neuem Canvas
      if (recorderStore.recorder) {
        const updated = recorderStore.recorder.updateCanvas(recordingCanvas);
        if (updated) {
          console.log('✅ [App] Recorder mit neuem Canvas aktualisiert');
        } else {
          console.warn('⚠️ [App] Recorder konnte nicht aktualisiert werden');
        }
      }

      // Lösche normale Bilder (Text und Hintergrund bleiben erhalten)
      // Nutzer muss für jede Aufnahme neue Bilder hinzufügen
      if (canvasManagerInstance.value && canvasManagerInstance.value.multiImageManager) {
        canvasManagerInstance.value.multiImageManager.clear();
        console.log('✅ [App] Bilder gelöscht - Text/Hintergrund bleiben erhalten');
      }
    }
  });

  console.log('✅ [App] Initialisierung abgeschlossen');
});

// ✨ STEP 3.7: Cleanup bei Component Unmount
onUnmounted(() => {
  console.log('🧹 [App] Component wird unmounted - Cleanup...');
  
  // ✅ OPTION 3: Stoppe Visualizer-Loop
  stopVisualizerLoop();
  
  // Cleanup Canvas Stream
  if (recordingCanvasStream) {
    recordingCanvasStream.getTracks().forEach(track => {
      if (track.readyState !== 'ended') {
        track.stop();
      }
    });
    recordingCanvasStream = null;
    console.log('✅ [App] Canvas-Stream gestoppt und entfernt');
  }
  
  if (keyboardShortcutsInstance.value) {
    keyboardShortcutsInstance.value.destroy();
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Worker removed - no cleanup needed

  if (audioContext) {
    audioContext.close();
  }
});
</script>

<style>
/* Dieser globale Style-Block ist korrekt. */
*, *::before, *::after {
  box-sizing: border-box;
}
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: auto;
}
#app {
  height: 100%;
  background-color: #121212;
  color: #e0e0e0;
  font-family: sans-serif;
}
.layout-grid {
  display: grid;
  grid-template-columns: 380px 1fr 380px;
  grid-template-rows: minmax(0, 1fr);
  gap: 16px;
  height: 100vh;
  padding: 16px;
}
.left-toolbar, .center-column, .right-panel {
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0; /* WICHTIG: Ermöglicht flex-child overflow */
}
.left-toolbar, .right-panel {
  overflow-y: auto;
  overflow-x: hidden;
}
.center-column {
  min-width: 0;
  overflow: hidden;
}

/* Scrollbar Styling für die Side-Panels */
.left-toolbar::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  width: 8px;
}
.left-toolbar::-webkit-scrollbar-track,
.right-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
.left-toolbar::-webkit-scrollbar-thumb,
.right-panel::-webkit-scrollbar-thumb {
  background: rgba(110, 168, 254, 0.4);
  border-radius: 4px;
}
.left-toolbar::-webkit-scrollbar-thumb:hover,
.right-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(110, 168, 254, 0.6);
}
</style>

<style scoped>
/* Panel Styles */
.left-toolbar, .right-panel {
  background-color: #1a1a1a;
  border: 1px solid #2a2a2a;
  padding: 12px;
  gap: 12px;
}

/* ZUSÄTZLICHER PLATZ am Ende für Dropdown-Inhalte */
.right-panel {
  padding-bottom: 100px;
}

.canvas-wrapper {
  flex-grow: 1;
  background-color: #000;
  border-radius: 12px;
  overflow: auto;           /* ← war hidden */
  min-height: 0;
  display: flex;            /* ← NEU */
  align-items: center;      /* ← NEU: Vertikal zentrieren */
  justify-content: center;  /* ← NEU: Horizontal zentrieren */
}
canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  background-color: #000;
}
</style>
