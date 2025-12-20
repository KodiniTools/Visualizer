<template>
  <div id="app-container">

    <!-- Language Switcher Bar -->
    <div class="language-bar">
      <router-link to="/" class="home-link" :title="t('app.backToHome')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </router-link>
      <button class="lang-btn" @click="toggleLocale" :title="locale === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'">
        <span class="lang-flag">{{ locale === 'de' ? '🇩🇪' : '🇬🇧' }}</span>
        <span class="lang-label">{{ locale === 'de' ? 'DE' : 'EN' }}</span>
      </button>
    </div>

    <div class="layout-grid">

      <aside class="left-toolbar">
        <TextManagerPanel />
        <FotoPanel />
      </aside>

      <main class="center-column">
        <!-- Canvas-Bilder Leiste (horizontal scrollbar) -->
        <div v-if="canvasImages.length > 0" class="canvas-images-bar">
          <span class="canvas-images-label">{{ t('app.imagesOnCanvas') }}:</span>
          <div class="canvas-images-scroll">
            <div
              v-for="(imgData, index) in canvasImages"
              :key="imgData.id"
              class="canvas-thumb"
              :class="{ 'selected': selectedCanvasImageId === imgData.id }"
              @click="selectCanvasImage(imgData)"
              :title="`${t('common.layer')} ${index + 1} - ${t('app.clickToSelect')}`"
            >
              <img :src="imgData.imageObject.src" alt="Canvas Bild">
              <span class="canvas-thumb-layer">{{ index + 1 }}</span>
            </div>
          </div>
        </div>

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
import { ref, computed, onMounted, onUnmounted, provide, watch, nextTick } from 'vue';
import { useI18n } from './lib/i18n.js';
import { usePlayerStore } from './stores/playerStore.js';
import { useRecorderStore } from './stores/recorderStore.js';
import { useTextStore } from './stores/textStore.js';
import { useVisualizerStore } from './stores/visualizerStore.js';
import { useGridStore } from './stores/gridStore.js';
import { useWorkspaceStore } from './stores/workspaceStore.js';
import { useBackgroundTilesStore } from './stores/backgroundTilesStore.js';
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
import { workerManager } from './lib/workerManager.js';

// Worker-Status
let useAudioWorker = false;

// i18n
const { t, locale, toggleLocale } = useI18n();

const playerStore = usePlayerStore();
const recorderStore = useRecorderStore();
const textStore = useTextStore();
const visualizerStore = useVisualizerStore();
const gridStore = useGridStore();
const workspaceStore = useWorkspaceStore();
const backgroundTilesStore = useBackgroundTilesStore();
const audioRef = ref(null);
const canvasRef = ref(null);

// Recording Canvas - wird für den Recorder verwendet
let recordingCanvas = document.createElement('canvas');
let recordingCanvasStream = null;

// Helper-Funktion um Monkey Patch auf Recording Canvas anzuwenden
function applyRecordingCanvasMonkeyPatch(canvas) {
  const originalCaptureStream = canvas.captureStream.bind(canvas);
  canvas.captureStream = function(frameRate) {
    console.log(`[App] captureStream() aufgerufen mit frameRate: ${frameRate}`);

    // Cleanup alter Stream falls vorhanden
    if (recordingCanvasStream) {
      recordingCanvasStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
        }
      });
      console.log('[App] Alter Canvas-Stream gestoppt');
    }

    // Rendere Canvas BEVOR Stream erstellt wird!
    const recordingCtx = canvas.getContext('2d');
    if (recordingCtx && canvasManagerInstance.value) {
      renderRecordingScene(
        recordingCtx,
        canvas.width,
        canvas.height,
        null // Kein Visualizer beim Warmup
      );
      console.log('[App] Recording Canvas pre-rendered für Stream');
    }

    // 60 FPS für smoothere Videos
    recordingCanvasStream = originalCaptureStream(60);
    console.log('[App] Canvas-Stream mit 60 FPS erstellt (via Monkey Patch)');

    return recordingCanvasStream;
  };
  console.log('[App] Monkey Patch auf Recording Canvas angewendet');
}

let audioContext, analyser, sourceNode, outputGain, recordingDest, recordingGain;
let bassFilter, trebleFilter; // EQ-Filter für Bass und Treble
let animationFrameId;
let textManagerInstance = null;
const lastSelectedVisualizerId = ref(null);
let audioDataArray = null;
const lastCanvasWidth = ref(0);
const lastCanvasHeight = ref(0);
let visualizerCacheCanvas = null;
let visualizerCacheCtx = null;

const canvasManagerInstance = ref(null);
const fotoManagerInstance = ref(null);
const gridManagerInstance = ref(null);
const multiImageManagerInstance = ref(null);
const fontManagerInstance = ref(null);
const keyboardShortcutsInstance = ref(null);
const onboardingWizardRef = ref(null);
const quickStartGuideRef = ref(null);

provide('fontManager', fontManagerInstance);
provide('canvasManager', canvasManagerInstance);
provide('fotoManager', fotoManagerInstance);
provide('multiImageManager', multiImageManagerInstance);

// AUDIO-ANALYSE FÜR AUDIO-REAKTIVE BILDER

// Globale Audio-Daten für audio-reaktive Elemente
window.audioAnalysisData = {
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  smoothBass: 0,
  smoothMid: 0,
  smoothTreble: 0,
  smoothVolume: 0
};

/**
 * Analysiert Audio-Daten und macht sie global verfügbar
 */
function updateGlobalAudioData(audioDataArray, bufferLength) {
  if (!audioDataArray || bufferLength === 0) return;

  if (useAudioWorker) {
    workerManager.analyzeAudio(audioDataArray, bufferLength);
    return;
  }

  updateGlobalAudioDataFallback(audioDataArray, bufferLength);
}

/**
 * Fallback Audio-Analyse im Main Thread
 */
function updateGlobalAudioDataFallback(audioDataArray, bufferLength) {
  const usableLength = Math.floor(bufferLength * 0.5);
  const bassEnd = Math.floor(usableLength * 0.15);
  const midEnd = Math.floor(usableLength * 0.35);

  let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0;
  let bassCount = 0, midCount = 0, trebleCount = 0;
  let treblePeak = 0;

  for (let i = 0; i < usableLength; i++) {
    const value = audioDataArray[i];
    totalSum += value;

    if (i < bassEnd) {
      bassSum += value;
      bassCount++;
    } else if (i < midEnd) {
      midSum += value;
      midCount++;
    } else {
      trebleSum += value;
      trebleCount++;
      if (value > treblePeak) treblePeak = value;
    }
  }

  const bass = bassCount > 0 ? Math.min(255, Math.floor((bassSum / bassCount) * 1.5)) : 0;
  const mid = midCount > 0 ? Math.min(255, Math.floor((midSum / midCount) * 2.0)) : 0;

  const trebleAvg = trebleCount > 0 ? (trebleSum / trebleCount) : 0;
  const trebleCombined = (trebleAvg * 0.6) + (treblePeak * 0.4);
  const treble = Math.min(255, Math.floor(trebleCombined * 8.0));

  const volume = usableLength > 0 ? Math.min(255, Math.floor((totalSum / usableLength) * 1.5)) : 0;

  applyAudioData({ bass, mid, treble, volume });
}

/**
 * Wendet Audio-Daten auf globales Objekt an
 */
function applyAudioData(data) {
  window.audioAnalysisData.bass = data.bass;
  window.audioAnalysisData.mid = data.mid;
  window.audioAnalysisData.treble = data.treble;
  window.audioAnalysisData.volume = data.volume;

  if (data.smoothBass !== undefined) {
    window.audioAnalysisData.smoothBass = data.smoothBass;
    window.audioAnalysisData.smoothMid = data.smoothMid;
    window.audioAnalysisData.smoothTreble = data.smoothTreble;
    window.audioAnalysisData.smoothVolume = data.smoothVolume;
  } else {
    const smoothFactor = 0.4;
    const trebleSmoothFactor = 0.5;

    window.audioAnalysisData.smoothBass = Math.floor(
      window.audioAnalysisData.smoothBass * (1 - smoothFactor) + data.bass * smoothFactor
    );
    window.audioAnalysisData.smoothMid = Math.floor(
      window.audioAnalysisData.smoothMid * (1 - smoothFactor) + data.mid * smoothFactor
    );
    window.audioAnalysisData.smoothTreble = Math.floor(
      window.audioAnalysisData.smoothTreble * (1 - trebleSmoothFactor) + data.treble * trebleSmoothFactor
    );
    window.audioAnalysisData.smoothVolume = Math.floor(
      window.audioAnalysisData.smoothVolume * (1 - smoothFactor) + data.volume * smoothFactor
    );
  }
}

// CANVAS-BILDER LEISTE

const selectedCanvasImageId = ref(null);

const canvasImages = computed(() => {
  const manager = multiImageManagerInstance.value;
  if (!manager) return [];
  return manager.getAllImages() || [];
});

function selectCanvasImage(imgData) {
  const manager = multiImageManagerInstance.value;
  const canvasManager = canvasManagerInstance.value;
  if (!manager || !imgData) return;

  if (canvasManager) {
    canvasManager.setActiveObject(imgData);
  } else {
    manager.setSelectedImage(imgData);
  }
  selectedCanvasImageId.value = imgData.id;

  if (window.fotoPanelControls?.currentActiveImage) {
    window.fotoPanelControls.currentActiveImage.value = imgData;
  }

  console.log('Canvas-Bild ausgewählt:', imgData.id);
}

function showTutorial() {
  if (onboardingWizardRef.value) {
    onboardingWizardRef.value.show();
  }
}

function onTutorialComplete() {
  console.log('Tutorial abgeschlossen');
}

function onTutorialSkip() {
  console.log('Tutorial übersprungen');
}

// SEPARATE VISUALIZER RENDER-LOOP

let visualizerAnimationId = null;
let isVisualizerActive = false;
let loopStartCount = 0;

const startVisualizerLoop = () => {
  loopStartCount++;
  console.log(`[App] startVisualizerLoop (#${loopStartCount}, aktiv: ${isVisualizerActive})`);

  if (isVisualizerActive || visualizerAnimationId) {
    console.warn('[App] Loop läuft bereits - erzwinge Neustart');
    stopVisualizerLoop();

    setTimeout(() => {
      startVisualizerLoopInternal();
    }, 50);
    return;
  }

  startVisualizerLoopInternal();
};

const startVisualizerLoopInternal = () => {
  isVisualizerActive = true;
  console.log(`[App] Visualizer-Loop GESTARTET (#${loopStartCount})`);

  const renderFrame = () => {
    if (!isVisualizerActive) {
      console.log('[App] Visualizer-Loop gestoppt (Flag=false)');
      visualizerAnimationId = null;
      return;
    }

    try {
      if (recorderStore.isRecording && recordingCanvas) {
        const recordingCtx = recordingCanvas.getContext('2d');
        if (recordingCtx && canvasRef.value) {
          // draw() macht bereits alles
        }
      }

    } catch (error) {
      console.error('[App] Visualizer-Render Error:', error);
      isVisualizerActive = false;
      visualizerAnimationId = null;
      return;
    }

    if (isVisualizerActive) {
      visualizerAnimationId = requestAnimationFrame(renderFrame);
    }
  };

  renderFrame();
};

const stopVisualizerLoop = () => {
  console.log(`[App] stopVisualizerLoop (aktiv: ${isVisualizerActive}, ID: ${visualizerAnimationId})`);

  isVisualizerActive = false;

  if (visualizerAnimationId) {
    cancelAnimationFrame(visualizerAnimationId);
    visualizerAnimationId = null;
    console.log('[App] Animation Frame cancelled');
  }

  if (recordingCanvasStream) {
    try {
      recordingCanvasStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log(`[App] Track gestoppt: ${track.kind}`);
        }
      });
      recordingCanvasStream = null;
      console.log('[App] Canvas-Stream vollständig bereinigt');
    } catch (error) {
      console.error('[App] Fehler beim Cleanup des Canvas-Streams:', error);
    }
  }

  console.log('[App] Visualizer-Loop GESTOPPT & bereinigt');
};


function setupAudioContext() {
  if (audioContext || !audioRef.value) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  sourceNode = audioContext.createMediaElementSource(audioRef.value);
  outputGain = audioContext.createGain();

  bassFilter = audioContext.createBiquadFilter();
  bassFilter.type = 'lowshelf';
  bassFilter.frequency.value = 200;
  bassFilter.gain.value = 0;

  trebleFilter = audioContext.createBiquadFilter();
  trebleFilter.type = 'highshelf';
  trebleFilter.frequency.value = 3000;
  trebleFilter.gain.value = 0;

  recordingGain = audioContext.createGain();
  recordingGain.gain.value = 0;

  recordingDest = audioContext.createMediaStreamDestination();

  sourceNode.connect(bassFilter);
  bassFilter.connect(trebleFilter);
  trebleFilter.connect(outputGain);
  outputGain.connect(audioContext.destination);

  sourceNode.connect(analyser);

  trebleFilter.connect(recordingGain);
  recordingGain.connect(recordingDest);

  console.log('[App] Audio Context mit EQ-Filtern und dynamischem Recording Gain eingerichtet');
}

function setBassGain(gain) {
  if (bassFilter) {
    bassFilter.gain.value = gain;
    console.log('[App] Bass gain:', gain, 'dB');
  }
}

function setTrebleGain(gain) {
  if (trebleFilter) {
    trebleFilter.gain.value = gain;
    console.log('[App] Treble gain:', gain, 'dB');
  }
}

function enableRecorderAudio() {
  if (recordingGain) {
    recordingGain.gain.value = 1;
    console.log('[App] Recorder Audio ENABLED');
  }
}

function disableRecorderAudio() {
  if (recordingGain) {
    recordingGain.gain.value = 0;
    console.log('[App] Recorder Audio DISABLED');
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

  if (isImageSelected && selectedObject.type === 'image' && selectedObject.id) {
    selectedCanvasImageId.value = selectedObject.id;
  } else if (!isImageSelected) {
    selectedCanvasImageId.value = null;
  }

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
  if (canvasManagerInstance.value) {
    canvasManagerInstance.value.drawScene(ctx);
  } else {
    ctx.fillStyle = '#ffffff';
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

function renderRecordingScene(ctx, canvasWidth, canvasHeight, drawVisualizerCallback) {
  if (canvasManagerInstance.value) {
    canvasManagerInstance.value.isRecording = true;
    canvasManagerInstance.value.drawScene(ctx);
    canvasManagerInstance.value.isRecording = false;
  } else {
    ctx.fillStyle = '#ffffff';
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

function draw() {
  animationFrameId = requestAnimationFrame(draw);
  const canvas = canvasRef.value;
  if (!canvas) return;

  if (canvas.width > 0 && canvas.height > 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let drawVisualizerCallback = null;

    if (analyser && (playerStore.isPlaying || recorderStore.isRecording)) {
      const bufferLength = analyser.frequencyBinCount;
      if (!audioDataArray || audioDataArray.length !== bufferLength) {
        audioDataArray = new Uint8Array(bufferLength);
      }
      analyser.getByteFrequencyData(audioDataArray);
      updateGlobalAudioData(audioDataArray, bufferLength);
    }

    const shouldDrawVisualizer = visualizerStore.showVisualizer &&
      (playerStore.isPlaying || recorderStore.isRecording);

    if (analyser && shouldDrawVisualizer) {
      const visualizer = Visualizers[visualizerStore.selectedVisualizer];
      if (visualizer) {
        const visualizerChanged = visualizerStore.selectedVisualizer !== lastSelectedVisualizerId.value;
        const canvasResized = canvas.width !== lastCanvasWidth.value || canvas.height !== lastCanvasHeight.value;

        if (visualizerChanged || canvasResized) {
          if (lastSelectedVisualizerId.value && Visualizers[lastSelectedVisualizerId.value]) {
            const oldVisualizer = Visualizers[lastSelectedVisualizerId.value];
            if (typeof oldVisualizer.cleanup === 'function') {
              try {
                oldVisualizer.cleanup();
                console.log(`[App] Visualizer "${lastSelectedVisualizerId.value}" bereinigt`);
              } catch (e) {
                console.warn(`[App] Cleanup-Fehler bei "${lastSelectedVisualizerId.value}":`, e);
              }
            }
          }

          if (typeof visualizer.init === 'function') {
            visualizer.init(canvas.width, canvas.height);
          }
          lastSelectedVisualizerId.value = visualizerStore.selectedVisualizer;
          lastCanvasWidth.value = canvas.width;
          lastCanvasHeight.value = canvas.height;
        }

        const bufferLength = analyser.frequencyBinCount;
        if (!audioDataArray || audioDataArray.length !== bufferLength) {
          audioDataArray = new Uint8Array(bufferLength);
        }
        if (visualizer.needsTimeData) {
          analyser.getByteTimeDomainData(audioDataArray);
        } else {
          analyser.getByteFrequencyData(audioDataArray);
        }

        if (!visualizerCacheCanvas || visualizerCacheCanvas.width !== canvas.width || visualizerCacheCanvas.height !== canvas.height) {
          visualizerCacheCanvas = document.createElement('canvas');
          visualizerCacheCanvas.width = canvas.width;
          visualizerCacheCanvas.height = canvas.height;
          visualizerCacheCtx = visualizerCacheCanvas.getContext('2d');
        }

        visualizerCacheCtx.clearRect(0, 0, canvas.width, canvas.height);
        visualizerCacheCtx.save();
        visualizerCacheCtx.globalAlpha = visualizerStore.colorOpacity;
        try {
          visualizer.draw(visualizerCacheCtx, audioDataArray, bufferLength, canvas.width, canvas.height, visualizerStore.visualizerColor, visualizerStore.visualizerOpacity);
          visualizerStore.markVisualizerWorking(visualizerStore.selectedVisualizer);
        } catch (error) {
          console.error(`Visualizer "${visualizerStore.selectedVisualizer}" Fehler:`, error);
          visualizerCacheCtx.fillStyle = '#000';
          visualizerCacheCtx.fillRect(0, 0, canvas.width, canvas.height);
          visualizerStore.fallbackToLastWorking();
        }
        visualizerCacheCtx.restore();

        drawVisualizerCallback = (targetCtx, width, height, useTransform = true) => {
          const scale = visualizerStore.visualizerScale;
          const posX = visualizerStore.visualizerX;
          const posY = visualizerStore.visualizerY;

          const scaledWidth = canvas.width * scale;
          const scaledHeight = canvas.height * scale;

          const destX = width * posX - scaledWidth / 2;
          const destY = height * posY - scaledHeight / 2;

          if (useTransform && (scale !== 1.0 || posX !== 0.5 || posY !== 0.5)) {
            targetCtx.drawImage(
              visualizerCacheCanvas,
              0, 0, canvas.width, canvas.height,
              destX, destY, scaledWidth, scaledHeight
            );
          } else {
            if (width === canvas.width && height === canvas.height) {
              targetCtx.drawImage(visualizerCacheCanvas, 0, 0);
            } else {
              targetCtx.drawImage(visualizerCacheCanvas, 0, 0, width, height);
            }
          }
        };
      }
    }

    renderScene(ctx, canvas.width, canvas.height, drawVisualizerCallback);

    if (recorderStore.isRecording) {
      const recordingCtx = recordingCanvas.getContext('2d');
      if (recordingCtx) {
        renderRecordingScene(recordingCtx, recordingCanvas.width, recordingCanvas.height, drawVisualizerCallback);
      }
    }

    if (canvasManagerInstance.value) {
      canvasManagerInstance.value.drawInteractiveElements(ctx);
      canvasManagerInstance.value.drawWorkspaceOutline(ctx);
      canvasManagerInstance.value.drawTextSelectionRect(ctx);
      canvasManagerInstance.value.drawTextPositionPreview(ctx);
      if (gridManagerInstance.value) {
        gridManagerInstance.value.drawGrid(ctx);
      }
      if (multiImageManagerInstance.value && multiImageManagerInstance.value.getSelectedImage()) {
        multiImageManagerInstance.value.drawInteractiveElements(ctx);
      }
    }
  }
}

async function createCombinedAudioStream() {
  if (!recordingDest) {
    console.error('[App] Recording Destination nicht verfügbar!');
    return null;
  }

  console.log('[App] Erstelle kombinierten Audio-Stream...');
  const stream = recordingDest.stream;
  const tracks = stream.getAudioTracks();

  console.log('[App] Audio-Tracks gefunden:', tracks.length);
  tracks.forEach((track, i) => {
    console.log(`[App] Track ${i}:`, track.label, 'enabled:', track.enabled, 'readyState:', track.readyState);
  });

  return stream;
}

window.getAudioStreamForRecorder = createCombinedAudioStream;

window.getCanvasStreamForRecorder = function() {
  console.log('[App] getCanvasStreamForRecorder() aufgerufen');

  if (recordingCanvasStream) {
    recordingCanvasStream.getTracks().forEach(track => track.stop());
    console.log('[App] Alter Canvas-Stream gestoppt');
  }

  recordingCanvasStream = recordingCanvas.captureStream(30);
  console.log('[App] Neuer Canvas-Stream erstellt (30 FPS)');

  return recordingCanvasStream;
};

async function initializeRecorder() {
  console.log('[App] Initialisiere Recorder...');

  const canvas = canvasRef.value;
  recordingCanvas.width = canvas.width;
  recordingCanvas.height = canvas.height;

  applyRecordingCanvasMonkeyPatch(recordingCanvas);

  const canvasStream = recordingCanvas.captureStream(60);
  console.log('[App] Canvas-Stream erstellt (60 FPS)');

  const audio = audioRef.value;
  if (!audio) {
    console.error('[App] Audio Element nicht gefunden!');
    return;
  }

  const combinedAudioStream = await createCombinedAudioStream();
  if (!combinedAudioStream) {
    console.error('[App] Kombinierter Stream konnte nicht erstellt werden!');
    return;
  }

  const videoTracks = canvasStream.getVideoTracks();
  const audioTracks = combinedAudioStream.getAudioTracks();
  const combinedMediaStream = new MediaStream([...videoTracks, ...audioTracks]);

  console.log('[App] Kombinierter MediaStream erstellt:',
    videoTracks.length, 'Video,', audioTracks.length, 'Audio');

  console.log('[App] Setze Recorder-Refs im Store...');
  const success = recorderStore.setRecorderRefs(
    recordingCanvas,
    audio,
    combinedMediaStream,
    null
  );

  if (success) {
    console.log('[App] Recorder erfolgreich initialisiert');
  } else {
    console.error('[App] Recorder-Initialisierung fehlgeschlagen!');
  }
}

onMounted(async () => {
  console.log('[App] onMounted - Starte Initialisierung...');

  console.log('[App] Initialisiere Web Workers...');
  try {
    const workerStatus = await workerManager.initAll();
    useAudioWorker = workerStatus.audio;

    if (useAudioWorker) {
      workerManager.onAudioData(applyAudioData);
      console.log('[App] Audio Worker aktiviert - Main Thread entlastet');
    } else {
      console.log('[App] Audio Worker nicht verfügbar - Fallback aktiv');
    }

    console.log('[App] Worker Status:', workerStatus);
  } catch (error) {
    console.warn('[App] Worker-Initialisierung fehlgeschlagen:', error);
    useAudioWorker = false;
  }

  console.log('Initialisiere FontManager...');
  fontManagerInstance.value = new FontManager();
  try {
    const result = await fontManagerInstance.value.initialize(CUSTOM_FONTS);
    console.log(`FontManager: ${result.loaded} Fonts geladen`);
  } catch (error) {
    console.error('FontManager Fehler:', error);
  }

  playerStore.setAudioRef(audioRef.value);
  if (audioRef.value) {
    audioRef.value.addEventListener('play', () => {
      playerStore.isPlaying = true;
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      enableRecorderAudio();
    });
    audioRef.value.addEventListener('pause', () => {
      playerStore.isPlaying = false;
      disableRecorderAudio();
    });
    audioRef.value.addEventListener('ended', () => {
      playerStore.nextTrack();
      disableRecorderAudio();
    });
  }

  console.log('Initialisiere Audio-Context für Recorder...');
  setupAudioContext();
  console.log('Audio-Context bereit - recordingDest verfügbar');

  window.setBassGain = setBassGain;
  window.setTrebleGain = setTrebleGain;

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
    console.log(`Canvas initialisiert mit fester Auflösung: ${canvasWidth}x${canvasHeight}`);

    textManagerInstance = new TextManager(textStore);
    gridManagerInstance.value = new GridManager(canvas);
    fotoManagerInstance.value = new FotoManager(() => {});

    multiImageManagerInstance.value = new MultiImageManager(canvas, {
      redrawCallback: () => {},
      onImageSelected: onObjectSelected,
      onImageChanged: () => {},
      fotoManager: fotoManagerInstance.value
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

    canvasManagerInstance.value.setBackgroundTilesStore(backgroundTilesStore);

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

            recordingCanvas.width = canvas.width;
            recordingCanvas.height = canvas.height;

            console.log(`Canvas-Größe geändert zu: ${canvas.width}x${canvas.height}`);

            const visualizer = Visualizers[visualizerStore.selectedVisualizer];
            if (visualizer?.init) {
              visualizer.init(canvas.width, canvas.height);
              console.log(`Visualizer "${visualizerStore.selectedVisualizer}" re-initialisiert`);
            }
          }
        } else {
          canvas.width = 1920;
          canvas.height = 1080;

          recordingCanvas.width = 1920;
          recordingCanvas.height = 1080;

          const visualizer = Visualizers[visualizerStore.selectedVisualizer];
          if (visualizer?.init) {
            visualizer.init(canvas.width, canvas.height);
            console.log(`Visualizer "${visualizerStore.selectedVisualizer}" re-initialisiert`);
          }

          console.log(`Canvas zurück zu Standard: 1920x1080`);
        }
      }
    }, { immediate: true });
  }

  console.log('[App] Versuche KeyboardShortcuts zu initialisieren...');
  console.log('[App] canvasManagerInstance.value:', !!canvasManagerInstance.value);
  console.log('[App] multiImageManagerInstance.value:', !!multiImageManagerInstance.value);

  if (canvasManagerInstance.value && multiImageManagerInstance.value) {
    keyboardShortcutsInstance.value = new KeyboardShortcuts(
      { playerStore, recorderStore, gridStore },
      {
        canvasManager: canvasManagerInstance.value,
        multiImageManager: multiImageManagerInstance.value
      }
    );
    keyboardShortcutsInstance.value.enable();
    console.log('Keyboard Shortcuts aktiviert (App-Start)');
  } else {
    console.error('[App] FEHLER: KeyboardShortcuts konnten nicht initialisiert werden!');
  }

  await initializeRecorder();

  watch(() => [canvasRef.value?.width, canvasRef.value?.height], ([width, height]) => {
    if (width && height) {
      recordingCanvas.width = width;
      recordingCanvas.height = height;
      console.log('[App] Recording Canvas Dimensionen aktualisiert:', width, 'x', height);
    }
  });

  draw();

  watch(() => recorderStore.isRecording, (isRecording) => {
    if (isRecording) {
      console.log('[App] Recording gestartet');
      setTimeout(() => {
        startVisualizerLoop();
      }, 100);
    } else {
      console.log('[App] Recording gestoppt');
      stopVisualizerLoop();

      console.log('[App] Erstelle Recording Canvas neu...');

      if (recordingCanvasStream) {
        recordingCanvasStream.getTracks().forEach(track => track.stop());
        recordingCanvasStream = null;
      }

      const canvas = canvasRef.value;
      recordingCanvas = document.createElement('canvas');
      recordingCanvas.width = canvas.width;
      recordingCanvas.height = canvas.height;

      console.log('[App] Frischer Recording Canvas erstellt:', recordingCanvas.width, 'x', recordingCanvas.height);

      applyRecordingCanvasMonkeyPatch(recordingCanvas);

      if (recorderStore.recorder) {
        const updated = recorderStore.recorder.updateCanvas(recordingCanvas);
        if (updated) {
          console.log('[App] Recorder mit neuem Canvas aktualisiert');
        } else {
          console.warn('[App] Recorder konnte nicht aktualisiert werden');
        }
      }

      if (canvasManagerInstance.value && canvasManagerInstance.value.multiImageManager) {
        canvasManagerInstance.value.multiImageManager.clear();
        console.log('[App] Bilder gelöscht - Text/Hintergrund bleiben erhalten');
      }
    }
  });

  console.log('[App] Initialisierung abgeschlossen');
});

onUnmounted(() => {
  console.log('[App] Component wird unmounted - Cleanup...');

  stopVisualizerLoop();

  if (recordingCanvasStream) {
    recordingCanvasStream.getTracks().forEach(track => {
      if (track.readyState !== 'ended') {
        track.stop();
      }
    });
    recordingCanvasStream = null;
    console.log('[App] Canvas-Stream gestoppt und entfernt');
  }

  if (keyboardShortcutsInstance.value) {
    keyboardShortcutsInstance.value.destroy();
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  workerManager.terminate();
  console.log('[App] Web Workers beendet');

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
  background-color: var(--bg, #0f1416);
  color: var(--text, #E9E9EB);
  font-family: var(--font-sans, sans-serif);
  font-size: 12px;
}
#app-container {
  min-height: 100%;
  background-color: var(--bg, #0f1416);
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Language Switcher Bar */
.language-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: linear-gradient(180deg, rgba(30, 40, 45, 0.95) 0%, rgba(15, 20, 22, 0.9) 100%);
  border-bottom: 1px solid var(--border-color, rgba(158, 190, 193, 0.15));
  flex-shrink: 0;
}

.home-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(96, 145, 152, 0.15);
  border: 1px solid rgba(96, 145, 152, 0.3);
  color: var(--accent-light, #BCE5E5);
  transition: all 0.2s ease;
  text-decoration: none;
}

.home-link:hover {
  background: rgba(96, 145, 152, 0.3);
  border-color: var(--accent, #609198);
  transform: translateY(-1px);
}

.home-link svg {
  width: 16px;
  height: 16px;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(96, 145, 152, 0.15);
  border: 1px solid rgba(96, 145, 152, 0.3);
  border-radius: 6px;
  color: var(--text, #E9E9EB);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lang-btn:hover {
  background: rgba(96, 145, 152, 0.3);
  border-color: var(--accent, #609198);
}

.lang-flag {
  font-size: 1rem;
}

.lang-label {
  letter-spacing: 0.5px;
}

.layout-grid {
  display: grid;
  grid-template-columns: 340px 1fr 340px;
  grid-template-rows: minmax(0, 1fr);
  gap: 12px;
  flex: 1;
  padding: 12px;
  min-height: 0;
}
.left-toolbar, .center-column, .right-panel {
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
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
  width: 6px;
}
.left-toolbar::-webkit-scrollbar-track,
.right-panel::-webkit-scrollbar-track {
  background: rgba(158, 190, 193, 0.1);
  border-radius: 3px;
}
.left-toolbar::-webkit-scrollbar-thumb,
.right-panel::-webkit-scrollbar-thumb {
  background: rgba(96, 145, 152, 0.4);
  border-radius: 3px;
}
.left-toolbar::-webkit-scrollbar-thumb:hover,
.right-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(96, 145, 152, 0.6);
}
</style>

<style scoped>
/* Panel Styles */
.left-toolbar, .right-panel {
  background-color: var(--panel, #151b1d);
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  padding: 10px;
  gap: 10px;
}

/* ZUSÄTZLICHER PLATZ am Ende für Dropdown-Inhalte */
.right-panel {
  padding-bottom: 80px;
}

.canvas-wrapper {
  flex-grow: 1;
  background-color: #000;
  border-radius: 12px;
  overflow: auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* CANVAS-BILDER LEISTE (horizontal scrollbar) */

.canvas-images-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(180deg, var(--panel, #151b1d) 0%, rgba(96, 145, 152, 0.08) 100%);
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 6px;
  border: 1px solid var(--border-color, rgba(158, 190, 193, 0.2));
  border-left: 2px solid var(--accent, #609198);
}

.canvas-images-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent, #609198);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.canvas-images-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 0;
  flex-grow: 1;
}

/* Horizontale Scrollbar */
.canvas-images-scroll::-webkit-scrollbar {
  height: 6px;
}

.canvas-images-scroll::-webkit-scrollbar-track {
  background: #1e1e1e;
  border-radius: 3px;
}

.canvas-images-scroll::-webkit-scrollbar-thumb {
  background: var(--muted, #A8A992);
  border-radius: 3px;
}

.canvas-images-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--accent, #609198);
}

.canvas-thumb {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 5px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--border-color, rgba(158, 190, 193, 0.3));
  transition: all 0.2s ease;
  background-color: var(--btn, #1c2426);
  flex-shrink: 0;
}

.canvas-thumb:hover {
  border-color: var(--accent, #609198);
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(96, 145, 152, 0.4);
}

.canvas-thumb.selected {
  border-color: var(--accent, #609198);
  box-shadow: 0 0 0 2px rgba(96, 145, 152, 0.5), 0 4px 12px rgba(96, 145, 152, 0.4);
}

.canvas-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.canvas-thumb-layer {
  position: absolute;
  bottom: 2px;
  left: 2px;
  background: rgba(96, 145, 152, 0.95);
  color: #E9E9EB;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  min-width: 12px;
  text-align: center;
}
</style>
