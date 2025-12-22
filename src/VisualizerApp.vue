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
        <VideoPanel />
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

    <!-- Help System -->
    <QuickStartGuide ref="quickStartGuideRef" />

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
import { useAudioSourceStore } from './stores/audioSourceStore.js';
import FileUploadPanel from './components/FileUploadPanel.vue';
import PlayerPanel from './components/PlayerPanel.vue';
import RecorderPanel from './components/RecorderPanel.vue';
import FotoPanel from './components/FotoPanel.vue';
import VideoPanel from './components/VideoPanel.vue'; // ✨ NEU: Video-Panel
import TextManagerPanel from './components/TextManagerPanel.vue';
import ControlsPanel from './components/ControlsPanel.vue';
import VisualizerPanel from './components/VisualizerPanel.vue';
import CanvasControlPanel from './components/CanvasControlPanel.vue';
import QuickStartGuide from './components/QuickStartGuide.vue';
import { Visualizers } from './lib/visualizers.js';
import { TextManager } from './lib/textManager.js';
import { CUSTOM_FONTS } from './lib/fonts.js';
import { FontManager } from './lib/fontManager.js';
import { CanvasManager } from './lib/canvasManager.js';
import { FotoManager } from './lib/fotoManager.js';
import { GridManager } from './lib/gridManager.js';
import { MultiImageManager } from './lib/multiImageManager.js';
import { VideoManager } from './lib/videoManager.js'; // ✨ NEU: Video-Support
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
const audioSourceStore = useAudioSourceStore();
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
let microphoneSourceNode = null; // Separate source node for microphone
let microphoneAudioContext = null; // Separate AudioContext for microphone
let microphoneAnalyser = null; // Separate Analyser for microphone

// ✨ NEU: Mic-Zuschalten während Recording
let micRecordingGain = null; // Gain node for mic → recordingDest
let micRecordingSourceNode = null; // MediaStreamSource for mic in main context
let micRecordingStream = null; // ✨ SEPARATE Mic stream für Recording
// ✨ NEU: Direkter Recording-Ansatz - alle Audio geht durch einen einzigen Pfad
let recordingMixer = null; // Zentraler Mixer-Knoten für alle Recording-Quellen

// ✨ NEU: Video-Audio für Recording
let videoRecordingGain = null; // Gain node for video → recordingMixer
const videoSourceNodes = new Map(); // Map von videoElement → { sourceNode, gainNode }

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
const videoManagerInstance = ref(null); // ✨ NEU: VideoManager
const fontManagerInstance = ref(null);
const keyboardShortcutsInstance = ref(null);
const quickStartGuideRef = ref(null);

// ✅ FIX: Flag um zu tracken, ob die Canvas-Initialisierung bereits erfolgt ist
let canvasInitialized = false;

provide('fontManager', fontManagerInstance);
provide('canvasManager', canvasManagerInstance);
provide('fotoManager', fotoManagerInstance);
provide('multiImageManager', multiImageManagerInstance);
provide('videoManager', videoManagerInstance); // ✨ NEU: VideoManager

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

// ✅ KRITISCHER FIX: Canvas-Initialisierungsfunktion
// Diese Funktion initialisiert den Canvas und alle Manager-Instanzen.
// Sie wird aufgerufen, sobald der Canvas verfügbar ist.
function initializeCanvas(canvas) {
  if (canvasInitialized || !canvas) {
    return false;
  }

  console.log('[App] ✅ Canvas-Initialisierung wird durchgeführt...');

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
  console.log(`[App] Canvas Dimensionen gesetzt: ${canvasWidth}x${canvasHeight}`);

  // Recording Canvas synchronisieren
  recordingCanvas.width = canvasWidth;
  recordingCanvas.height = canvasHeight;

  textManagerInstance = new TextManager(textStore);
  gridManagerInstance.value = new GridManager(canvas);
  fotoManagerInstance.value = new FotoManager(() => {});

  multiImageManagerInstance.value = new MultiImageManager(canvas, {
    redrawCallback: () => {},
    onImageSelected: onObjectSelected,
    onImageChanged: () => {},
    fotoManager: fotoManagerInstance.value
  });

  videoManagerInstance.value = new VideoManager(canvas, {
    redrawCallback: () => {},
    onVideoSelected: onObjectSelected,
    onVideoChanged: () => {},
    fotoManager: fotoManagerInstance.value,
    audioElement: audioRef.value
  });

  canvasManagerInstance.value = new CanvasManager(canvas, {
    redrawCallback: () => {},
    onObjectSelected: onObjectSelected,
    onStateChange: () => {},
    onTextDoubleClick: () => {},
    textManager: textManagerInstance,
    fotoManager: fotoManagerInstance.value,
    gridManager: gridManagerInstance.value,
    multiImageManager: multiImageManagerInstance.value,
    videoManager: videoManagerInstance.value
  });
  canvasManagerInstance.value.setupInteractionHandlers();

  canvasManagerInstance.value.setBackgroundTilesStore(backgroundTilesStore);

  canvasInitialized = true;
  console.log('[App] ✅ Canvas-Initialisierung ABGESCHLOSSEN');
  console.log('[App] Manager-Status:', {
    canvasManager: !!canvasManagerInstance.value,
    multiImageManager: !!multiImageManagerInstance.value,
    videoManager: !!videoManagerInstance.value,
    fotoManager: !!fotoManagerInstance.value
  });

  return true;
}


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

  // ✨ NEU: Mic Recording Gain (für Live-Umschaltung während Aufnahme)
  micRecordingGain = audioContext.createGain();
  micRecordingGain.gain.value = 0; // Startet stumm - wird bei Umschaltung aktiviert

  // ✨ NEU: Zentraler Mixer - ALLE Audio-Quellen gehen hier durch
  // Dieser Knoten ist IMMER mit recordingDest verbunden
  recordingMixer = audioContext.createGain();
  recordingMixer.gain.value = 1; // Immer voll an

  recordingDest = audioContext.createMediaStreamDestination();

  sourceNode.connect(bassFilter);
  bassFilter.connect(trebleFilter);
  trebleFilter.connect(outputGain);
  outputGain.connect(audioContext.destination);

  sourceNode.connect(analyser);

  // ✨ NEU: Beide Quellen → Mixer → recordingDest
  // Player Audio → recordingGain → recordingMixer
  trebleFilter.connect(recordingGain);
  recordingGain.connect(recordingMixer);

  // Mic Audio → micRecordingGain → recordingMixer
  micRecordingGain.connect(recordingMixer);

  // Mixer → recordingDest (EINZIGER Pfad zum Recorder!)
  recordingMixer.connect(recordingDest);

  console.log('[App] Audio Context mit zentralem Recording-Mixer eingerichtet');
  console.log('[App] Audio-Graph: [Player|Mic] → Gains → Mixer → recordingDest');
  console.log('[App] ✅ Live Audio-Umschaltung für Recording vorbereitet');
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

// ✅ KRITISCH: Globale Konstanten für Audio-Gain
const SILENT_GAIN = 0.0001; // Unhörbar aber technisch aktiv - MediaRecorder braucht das!
const ACTIVE_GAIN = 1;

function enableRecorderAudio() {
  if (recordingGain) {
    recordingGain.gain.value = ACTIVE_GAIN;
    console.log('[App] Recorder Audio ENABLED');
  }
}

function disableRecorderAudio() {
  if (recordingGain) {
    // ✅ WICHTIG: Nie 0 verwenden! MediaRecorder braucht aktive Audio-Quellen
    recordingGain.gain.value = SILENT_GAIN;
    console.log('[App] Recorder Audio DISABLED (silent but active)');
  }
}

// ========== MICROPHONE AUDIO SOURCE ==========

/**
 * Initialize AudioContext if not already created (for microphone use)
 */
function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    console.log('[App] AudioContext created for microphone');
  }
  return audioContext;
}

/**
 * Setup microphone as audio source with SEPARATE AudioContext
 * This avoids conflicts with the player AudioContext
 */
async function setupMicrophoneSource() {
  try {
    // Get microphone stream first
    const stream = await audioSourceStore.startMicrophone(
      audioSourceStore.selectedDeviceId !== 'default' ? audioSourceStore.selectedDeviceId : null
    );

    if (!stream) {
      console.error('[App] Failed to get microphone stream');
      return false;
    }

    // Close existing microphone AudioContext if any
    if (microphoneAudioContext) {
      try {
        if (microphoneSourceNode) {
          microphoneSourceNode.disconnect();
        }
        await microphoneAudioContext.close();
        console.log('[App] Previous microphone AudioContext closed');
      } catch (e) {
        console.warn('[App] Error closing previous microphone context:', e);
      }
    }

    // Get the microphone's actual sample rate from the track settings
    const audioTrack = stream.getAudioTracks()[0];
    const trackSettings = audioTrack?.getSettings();
    const micSampleRate = trackSettings?.sampleRate;
    console.log('[App] Microphone track settings:', trackSettings);

    // Create AudioContext with a standard sample rate (48000 Hz)
    // Using a fixed rate avoids sample rate mismatch issues
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      microphoneAudioContext = new AudioContextClass({ sampleRate: 48000 });
    } catch (e) {
      console.warn('[App] Could not create AudioContext with 48000Hz, using default');
      microphoneAudioContext = new AudioContextClass();
    }
    console.log('[App] Created AudioContext for microphone, sample rate:', microphoneAudioContext.sampleRate);

    // Resume if suspended (MUST be done before creating nodes in some browsers)
    if (microphoneAudioContext.state === 'suspended') {
      await microphoneAudioContext.resume();
      console.log('[App] Microphone AudioContext resumed');
    }

    // Create analyser for microphone
    microphoneAnalyser = microphoneAudioContext.createAnalyser();
    microphoneAnalyser.fftSize = 2048;
    microphoneAnalyser.smoothingTimeConstant = 0.8;

    // Create MediaStreamSource from microphone
    microphoneSourceNode = microphoneAudioContext.createMediaStreamSource(stream);

    // IMPORTANT: Connect through a GainNode to ensure audio flows
    // Some browsers have issues with direct MediaStreamSource -> Analyser connections
    const micGain = microphoneAudioContext.createGain();
    micGain.gain.value = 1.0;

    microphoneSourceNode.connect(micGain);
    micGain.connect(microphoneAnalyser);

    // Also connect to a silent destination to keep the audio graph active
    // This is a workaround for a Chrome bug where MediaStreamSource
    // doesn't process audio unless connected to destination
    const silentGain = microphoneAudioContext.createGain();
    silentGain.gain.value = 0; // Silent - no audio output
    micGain.connect(silentGain);
    silentGain.connect(microphoneAudioContext.destination);

    console.log('[App] Microphone audio graph: source -> gain -> analyser');
    console.log('[App] Microphone audio graph: source -> gain -> silent -> destination (for Chrome bug)');
    console.log('[App] Microphone AudioContext state:', microphoneAudioContext.state);
    console.log('[App] Microphone Analyser fftSize:', microphoneAnalyser.fftSize, 'frequencyBinCount:', microphoneAnalyser.frequencyBinCount);

    // Verify stream is active
    const tracks = stream.getAudioTracks();
    console.log('[App] Audio tracks:', tracks.length, 'enabled:', tracks[0]?.enabled, 'muted:', tracks[0]?.muted);

    return true;

  } catch (error) {
    console.error('[App] Error setting up microphone source:', error);
    audioSourceStore.errorMessage = error.message;
    return false;
  }
}

/**
 * Disconnect microphone source and close its AudioContext
 */
function disconnectMicrophoneSource() {
  if (microphoneSourceNode) {
    try {
      microphoneSourceNode.disconnect();
      console.log('[App] Microphone source disconnected');
    } catch (e) {
      // Ignore disconnect errors
    }
    microphoneSourceNode = null;
  }

  if (microphoneAudioContext) {
    try {
      microphoneAudioContext.close();
      console.log('[App] Microphone AudioContext closed');
    } catch (e) {
      // Ignore close errors
    }
    microphoneAudioContext = null;
    microphoneAnalyser = null;
  }

  audioSourceStore.stopMicrophone();
}

/**
 * Switch audio source (called from PlayerPanel)
 */
async function switchAudioSource(sourceType) {
  console.log('[App] Switching audio source to:', sourceType);

  if (sourceType === 'microphone') {
    // Setup microphone
    const success = await setupMicrophoneSource();
    if (success) {
      audioSourceStore.setSourceType('microphone');
    }
    return success;
  } else {
    // Switch back to player
    disconnectMicrophoneSource();
    audioSourceStore.setSourceType('player');
    return true;
  }
}

// Expose switch function globally for PlayerPanel
window.switchAudioSource = switchAudioSource;

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

  // ✨ NEU: Videos zeichnen (über Bildern, aber unter Text)
  if (videoManagerInstance.value) {
    videoManagerInstance.value.drawVideos(ctx);
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

  // ✨ NEU: Videos zeichnen beim Recording
  if (videoManagerInstance.value) {
    videoManagerInstance.value.drawVideos(ctx);
  }

  if (textManagerInstance) {
    textManagerInstance.draw(ctx, canvasWidth, canvasHeight);
  }
}

// Debug counter for microphone logging
let micDebugCounter = 0;

function draw() {
  animationFrameId = requestAnimationFrame(draw);
  const canvas = canvasRef.value;
  if (!canvas) return;

  if (canvas.width > 0 && canvas.height > 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let drawVisualizerCallback = null;

    // Check if we should analyze audio (player playing, recording, or microphone active)
    const isMicActive = audioSourceStore.isMicrophoneActive;

    // Select the correct analyser based on audio source
    // Use microphone analyser when mic is active, otherwise use player analyser
    const activeAnalyser = isMicActive ? microphoneAnalyser : analyser;
    const activeContext = isMicActive ? microphoneAudioContext : audioContext;

    const shouldAnalyzeAudio = activeAnalyser && (
      playerStore.isPlaying ||
      recorderStore.isRecording ||
      isMicActive
    );

    // Debug logging for microphone (every ~60 frames = ~1 second)
    if (isMicActive && ++micDebugCounter % 60 === 0) {
      if (microphoneAnalyser && microphoneAudioContext) {
        // Test both frequency and time domain data
        const freqArray = new Uint8Array(microphoneAnalyser.frequencyBinCount);
        const timeArray = new Uint8Array(microphoneAnalyser.frequencyBinCount);

        microphoneAnalyser.getByteFrequencyData(freqArray);
        microphoneAnalyser.getByteTimeDomainData(timeArray);

        const freqSum = freqArray.reduce((a, b) => a + b, 0);
        const timeSum = timeArray.reduce((a, b) => a + b, 0);
        const timeAvg = timeSum / timeArray.length;

        // Check if microphone stream is still active
        const stream = audioSourceStore.microphoneStream;
        const track = stream?.getAudioTracks()[0];

        console.log('[Mic Debug] MicContext state:', microphoneAudioContext.state,
                    'FreqSum:', freqSum, 'TimeAvg:', timeAvg.toFixed(1),
                    '(should be ~128 for silence)',
                    'Track:', track?.readyState, track?.enabled ? 'enabled' : 'disabled');
      }
    }

    // Auto-resume AudioContext if suspended while microphone is active
    if (isMicActive && microphoneAudioContext && microphoneAudioContext.state === 'suspended') {
      microphoneAudioContext.resume().then(() => {
        console.log('[App] Microphone AudioContext auto-resumed');
      });
    }

    if (shouldAnalyzeAudio) {
      const bufferLength = activeAnalyser.frequencyBinCount;
      if (!audioDataArray || audioDataArray.length !== bufferLength) {
        audioDataArray = new Uint8Array(bufferLength);
      }
      activeAnalyser.getByteFrequencyData(audioDataArray);
      updateGlobalAudioData(audioDataArray, bufferLength);
    }

    const shouldDrawVisualizer = visualizerStore.showVisualizer &&
      (playerStore.isPlaying || recorderStore.isRecording || isMicActive);

    if (activeAnalyser && shouldDrawVisualizer) {
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

        const bufferLength = activeAnalyser.frequencyBinCount;
        if (!audioDataArray || audioDataArray.length !== bufferLength) {
          audioDataArray = new Uint8Array(bufferLength);
        }
        if (visualizer.needsTimeData) {
          activeAnalyser.getByteTimeDomainData(audioDataArray);
        } else {
          activeAnalyser.getByteFrequencyData(audioDataArray);
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

/**
 * ✨ NEU: Verbindet Mikrofon mit dem Recording-Kanal für Live-Umschaltung
 * WICHTIG: Wir holen einen SEPARATEN Mic-Stream für Recording,
 * da der Visualizer-Stream bereits vom microphoneAudioContext benutzt wird!
 */
async function connectMicToRecordingChain() {
  if (!audioContext || !micRecordingGain) {
    console.error('[App] AudioContext oder micRecordingGain nicht verfügbar');
    return false;
  }

  // Alte Mic-Source und Stream trennen/stoppen
  if (micRecordingSourceNode) {
    try {
      micRecordingSourceNode.disconnect();
    } catch (e) {
      // Ignore
    }
    micRecordingSourceNode = null;
  }

  // Alten Recording-Stream stoppen
  if (micRecordingStream) {
    micRecordingStream.getTracks().forEach(track => track.stop());
    micRecordingStream = null;
    console.log('[App] Alter Recording-Mic-Stream gestoppt');
  }

  try {
    // ✅ FIX: AudioContext muss resumed sein
    if (audioContext.state === 'suspended') {
      console.log('[App] AudioContext ist suspended - resume...');
      await audioContext.resume();
    }

    // ✨ WICHTIG: NEUEN Mic-Stream für Recording holen!
    // Der Visualizer-Stream wird vom microphoneAudioContext benutzt
    // und kann nicht gleichzeitig im Haupt-AudioContext verwendet werden
    console.log('[App] Hole separaten Mic-Stream für Recording...');

    const deviceId = audioSourceStore.selectedDeviceId;
    const constraints = {
      audio: {
        deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    micRecordingStream = await navigator.mediaDevices.getUserMedia(constraints);

    // Prüfe ob der Mic-Stream aktiv ist
    const audioTracks = micRecordingStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error('[App] Recording-Mic-Stream hat keine Audio-Tracks!');
      return false;
    }

    const track = audioTracks[0];
    console.log('[App] Recording Mic Track:', track.label);
    console.log('[App] Recording Mic Track Status:', track.readyState, 'enabled:', track.enabled);

    if (track.readyState !== 'live') {
      console.error('[App] Recording Mic Track ist nicht live!');
      return false;
    }

    // Erstelle MediaStreamSource im HAUPT-AudioContext
    micRecordingSourceNode = audioContext.createMediaStreamSource(micRecordingStream);

    // Verbinde mit Recording-Gain
    micRecordingSourceNode.connect(micRecordingGain);

    console.log('[App] ✅ SEPARATER Mikrofon-Stream mit Recording-Kanal verbunden');
    console.log('[App] AudioContext Sample Rate:', audioContext.sampleRate);
    console.log('[App] AudioContext State:', audioContext.state);

    return true;
  } catch (error) {
    console.error('[App] Fehler beim Verbinden des Mikrofons:', error);
    return false;
  }
}

/**
 * ✨ NEU: Trennt Mikrofon vom Recording-Kanal
 */
function disconnectMicFromRecordingChain() {
  if (micRecordingSourceNode) {
    try {
      micRecordingSourceNode.disconnect();
    } catch (e) {
      // Ignore
    }
    micRecordingSourceNode = null;
    console.log('[App] Mikrofon vom Recording-Kanal getrennt');
  }

  // ✨ NEU: Recording-Stream stoppen
  if (micRecordingStream) {
    micRecordingStream.getTracks().forEach(track => track.stop());
    micRecordingStream = null;
    console.log('[App] Recording-Mic-Stream gestoppt');
  }
}

/**
 * ✨ NEU: Schaltet Mikrofon ZU (additiv zum Player)
 * Player läuft IMMER, Mikrofon wird dazugemischt
 * @param {boolean} enable - true = Mic zuschalten, false = Mic abschalten
 */
async function toggleRecordingMicrophone(enable) {
  if (!recordingGain || !micRecordingGain) {
    console.error('[App] Recording Gains nicht verfügbar');
    return false;
  }

  console.log(`[App] Mikrofon ${enable ? 'ZUSCHALTEN' : 'ABSCHALTEN'}`);

  if (enable) {
    // ✨ 1. Visualizer-Mic aktivieren (für UI-Feedback)
    if (!audioSourceStore.isMicrophoneActive) {
      console.log('[App] Aktiviere Visualizer-Mikrofon...');
      const visSuccess = await setupMicrophoneSource();
      if (visSuccess) {
        audioSourceStore.setSourceType('microphone');
      }
    }

    // ✨ 2. Recording-Mic verbinden falls noch nicht geschehen
    if (!micRecordingSourceNode) {
      console.log('[App] Recording-Mic nicht verbunden - verbinde jetzt...');
      const connected = await connectMicToRecordingChain();
      if (!connected) {
        console.error('[App] Konnte Recording-Mic-Stream nicht verbinden');
        return false;
      }
    }

    // ✅ BEIDE aktiv: Player UND Mic!
    recordingGain.gain.value = ACTIVE_GAIN;
    micRecordingGain.gain.value = ACTIVE_GAIN;

    console.log('[App] ✅ Mikrofon ZUGESCHALTET (Player + Mic)');
    console.log('[App] Gain-Werte: Player:', recordingGain.gain.value, 'Mic:', micRecordingGain.gain.value);

  } else {
    // ✅ Nur Player aktiv, Mic stumm
    recordingGain.gain.value = ACTIVE_GAIN;
    micRecordingGain.gain.value = SILENT_GAIN;

    // ✅ FIX: Visualizer-Mikrofon deaktivieren und zurück zu Player wechseln
    disconnectMicrophoneSource();
    audioSourceStore.setSourceType('player');

    console.log('[App] ✅ Mikrofon ABGESCHALTET (nur Player)');
    console.log('[App] Gain-Werte: Player:', recordingGain.gain.value, 'Mic:', micRecordingGain.gain.value);
  }

  return true;
}

// Expose für RecorderPanel
window.toggleRecordingMicrophone = toggleRecordingMicrophone;

// ========== VIDEO AUDIO FOR RECORDING ==========

/**
 * ✨ NEU: Verbindet ein Video-Element mit dem Recording-Graph
 * Das Video-Audio wird in den recordingMixer geleitet
 * @param {HTMLVideoElement} videoElement - Das Video-Element
 * @param {number} volume - Initiale Lautstärke (0-1)
 * @returns {boolean} Erfolg
 */
function connectVideoToRecording(videoElement, volume = 1) {
  // Prüfen ob bereits verbunden
  if (videoSourceNodes.has(videoElement)) {
    console.log('[App] Video bereits mit Recording verbunden');
    return true;
  }

  // ✅ FIX: AudioContext initialisieren falls noch nicht vorhanden
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('[App] AudioContext für Video erstellt');
  }

  // ✅ FIX: recordingMixer initialisieren falls noch nicht vorhanden
  if (!recordingMixer) {
    recordingMixer = audioContext.createGain();
    recordingMixer.gain.value = 1;

    if (!recordingDest) {
      recordingDest = audioContext.createMediaStreamDestination();
    }
    recordingMixer.connect(recordingDest);
    console.log('[App] recordingMixer für Video erstellt');
  }

  try {
    // VideoRecordingGain erstellen falls nicht vorhanden
    if (!videoRecordingGain) {
      videoRecordingGain = audioContext.createGain();
      videoRecordingGain.gain.value = ACTIVE_GAIN;
      videoRecordingGain.connect(recordingMixer);
      console.log('[App] ✅ Video-Recording-Gain erstellt');
    }

    // MediaElementSource für das Video erstellen
    const sourceNode = audioContext.createMediaElementSource(videoElement);
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;

    // Verbinden: Video → GainNode → Split
    sourceNode.connect(gainNode);

    // → Zum Lautsprecher (direkt zum destination, nicht über outputGain)
    gainNode.connect(audioContext.destination);

    // → Zum Recording-Mixer
    gainNode.connect(videoRecordingGain);

    // Speichern für späteres Disconnect
    videoSourceNodes.set(videoElement, { sourceNode, gainNode });

    console.log('[App] ✅ Video-Audio mit Recording verbunden, Volume:', volume);
    return true;

  } catch (error) {
    console.error('[App] Fehler beim Verbinden des Video-Audios:', error);
    return false;
  }
}

/**
 * Trennt ein Video-Element vom Recording-Graph
 * @param {HTMLVideoElement} videoElement
 */
function disconnectVideoFromRecording(videoElement) {
  const nodes = videoSourceNodes.get(videoElement);
  if (!nodes) return;

  try {
    nodes.gainNode.disconnect();
    // sourceNode kann nicht getrennt werden - wird vom Browser verwaltet
    videoSourceNodes.delete(videoElement);
    console.log('[App] Video-Audio vom Recording getrennt');
  } catch (error) {
    console.warn('[App] Fehler beim Trennen des Video-Audios:', error);
  }
}

/**
 * Setzt die Lautstärke eines verbundenen Videos
 * @param {HTMLVideoElement} videoElement
 * @param {number} volume - Lautstärke (0-1)
 */
function setVideoVolume(videoElement, volume) {
  const nodes = videoSourceNodes.get(videoElement);
  if (nodes && nodes.gainNode) {
    nodes.gainNode.gain.value = volume;
    console.log('[App] Video-Lautstärke gesetzt:', volume);
  }
}

// Expose für VideoPanel
window.connectVideoToRecording = connectVideoToRecording;
window.disconnectVideoFromRecording = disconnectVideoFromRecording;
window.setVideoVolume = setVideoVolume;

async function createCombinedAudioStream() {
  // ✨ GEÄNDERT: Immer recordingDest.stream zurückgeben für Live-Umschaltung
  if (!recordingDest) {
    console.error('[App] Recording Destination nicht verfügbar!');
    return null;
  }

  // ✅ FIX: AudioContext muss aktiv sein
  if (audioContext.state === 'suspended') {
    console.log('[App] AudioContext suspended - resume...');
    await audioContext.resume();
  }

  // ✨ WICHTIG: IMMER Mic-Recording-Stream VOR dem MediaRecorder-Start einrichten!
  // Der MediaRecorder erkennt neue Audio-Quellen nicht, die NACH dem Start verbunden werden.
  // Deshalb verbinden wir den Mic IMMER, aber mit minimalem Gain wenn Player aktiv ist.
  console.log('[App] Bereite Mic-Recording-Pfad vor (für Live-Umschaltung)...');
  const micConnected = await connectMicToRecordingChain();

  if (!micConnected) {
    console.warn('[App] Mic-Recording-Stream konnte nicht verbunden werden - Live-Umschaltung auf Mic nicht möglich');
  } else {
    console.log('[App] ✅ Mic-Recording-Pfad vorbereitet');
  }

  // ✅ NEUER ANSATZ: Player ist IMMER aktiv, Mic kann zugeschaltet werden
  // Das umgeht das Problem, dass der MediaRecorder Quellwechsel nicht erkennt
  console.log('[App] ⏳ Warmup: Beide Audio-Quellen aktivieren...');
  recordingGain.gain.value = ACTIVE_GAIN;
  micRecordingGain.gain.value = ACTIVE_GAIN;

  // ✨ Kurz warten, damit beide Quellen Audio-Samples liefern
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('[App] ✅ Warmup abgeschlossen');

  // ✅ Standard: Player aktiv, Mic stumm (kann während Aufnahme zugeschaltet werden)
  recordingGain.gain.value = ACTIVE_GAIN;
  micRecordingGain.gain.value = SILENT_GAIN;
  console.log('[App] ✅ Standard-Setup: Player aktiv, Mic bereit zum Zuschalten');

  const stream = recordingDest.stream;
  const tracks = stream.getAudioTracks();

  console.log('[App] Recording-Stream bereit:', tracks.length, 'Audio-Tracks');
  tracks.forEach((track, i) => {
    console.log(`[App] Recording Track ${i}: ${track.label}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
  });
  console.log('[App] recordingGain.gain.value:', recordingGain.gain.value);
  console.log('[App] micRecordingGain.gain.value:', micRecordingGain.gain.value);
  console.log('[App] ✅ Player-Audio aktiv, Mikrofon kann zugeschaltet werden');

  return stream;
}

// ✅ NEU: Debug-Funktion um Recording-Audio-Flow zu prüfen
window.debugRecordingAudio = function() {
  console.log('=== RECORDING AUDIO DEBUG ===');
  console.log('AudioContext State:', audioContext?.state);
  console.log('AudioContext Sample Rate:', audioContext?.sampleRate);
  console.log('recordingGain.gain.value:', recordingGain?.gain.value, '(Player)');
  console.log('micRecordingGain.gain.value:', micRecordingGain?.gain.value, '(Mic)');
  console.log('recordingMixer.gain.value:', recordingMixer?.gain.value);
  console.log('micRecordingSourceNode:', micRecordingSourceNode ? 'connected' : 'null');
  console.log('Audio-Graph: [Player→recordingGain] + [Mic→micRecordingGain] → recordingMixer → recordingDest');
  console.log('💡 Player ist IMMER aktiv, Mic kann zugeschaltet werden');

  if (recordingDest) {
    const tracks = recordingDest.stream.getAudioTracks();
    console.log('recordingDest tracks:', tracks.length);
    tracks.forEach((t, i) => {
      console.log(`  Track ${i}: ${t.label}, enabled: ${t.enabled}, readyState: ${t.readyState}`);
    });
  }

  // ✨ NEU: Separater Recording-Mic-Stream
  if (micRecordingStream) {
    const recMicTracks = micRecordingStream.getAudioTracks();
    console.log('Recording Mic stream (SEPARATE):', recMicTracks.length, 'tracks');
    recMicTracks.forEach((t, i) => {
      console.log(`  Rec Mic Track ${i}: ${t.label}, enabled: ${t.enabled}, readyState: ${t.readyState}`);
    });
  } else {
    console.log('Recording Mic stream: null (nicht aktiv)');
  }

  // Visualizer Mic stream (separat)
  if (audioSourceStore.microphoneStream) {
    const visMicTracks = audioSourceStore.microphoneStream.getAudioTracks();
    console.log('Visualizer Mic stream:', visMicTracks.length, 'tracks');
    visMicTracks.forEach((t, i) => {
      console.log(`  Vis Mic Track ${i}: ${t.label}, enabled: ${t.enabled}, readyState: ${t.readyState}`);
    });
  }

  console.log('=== END DEBUG ===');
};

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

  // ✅ KRITISCHER FIX: Watcher für Canvas-Verfügbarkeit SOFORT registrieren
  // Muss VOR allen await-Aufrufen passieren, damit wir keine Änderungen verpassen!
  watch(
    () => canvasRef.value,
    (newCanvas) => {
      if (newCanvas && !canvasInitialized) {
        console.log('[App] ✅ Canvas jetzt verfügbar (via Watcher) - starte Initialisierung');
        initializeCanvas(newCanvas);
      }
    },
    { immediate: true }
  );

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

  // ✅ KRITISCHER FIX: Canvas-Initialisierung mit Fallback
  // Versuche die Initialisierung sofort
  const canvas = canvasRef.value;
  if (canvas) {
    initializeCanvas(canvas);
  } else {
    console.warn('[App] ⚠️ Canvas noch nicht verfügbar - warte auf Verfügbarkeit...');
  }

  // ✅ Grid-Watcher (AUSSERHALB des if-Blocks, damit er immer registriert wird)
  watch(() => gridStore.isVisible, (newValue) => {
    if (gridManagerInstance.value) {
      gridManagerInstance.value.setVisibility(newValue);
    }
  }, { immediate: true });

  // ✅ Workspace-Preset-Watcher (AUSSERHALB des if-Blocks)
  watch(() => workspaceStore.selectedPresetKey, (newKey) => {
    const canvas = canvasRef.value;
    if (!canvas || !canvasManagerInstance.value) return;

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
  }, { immediate: true });

  console.log('[App] Versuche KeyboardShortcuts zu initialisieren...');
  console.log('[App] canvasManagerInstance.value:', !!canvasManagerInstance.value);
  console.log('[App] multiImageManagerInstance.value:', !!multiImageManagerInstance.value);

  // ✅ FIX: Keyboard-Shortcuts Initialisierungsfunktion
  function initKeyboardShortcuts() {
    if (keyboardShortcutsInstance.value) return; // Bereits initialisiert
    if (!canvasManagerInstance.value || !multiImageManagerInstance.value) return;

    keyboardShortcutsInstance.value = new KeyboardShortcuts(
      { playerStore, recorderStore, gridStore },
      {
        canvasManager: canvasManagerInstance.value,
        multiImageManager: multiImageManagerInstance.value
      }
    );
    keyboardShortcutsInstance.value.enable();
    console.log('[App] ✅ Keyboard Shortcuts aktiviert');
  }

  // Versuche sofortige Initialisierung
  initKeyboardShortcuts();

  // ✅ FIX: Falls Manager noch nicht bereit, warte auf sie
  if (!keyboardShortcutsInstance.value) {
    console.log('[App] Keyboard Shortcuts warten auf Manager-Initialisierung...');
    watch(
      () => [canvasManagerInstance.value, multiImageManagerInstance.value],
      () => {
        if (!keyboardShortcutsInstance.value) {
          initKeyboardShortcuts();
        }
      }
    );
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

      // ✅ FIX: Mic-Gain zurücksetzen BEVOR Stream getrennt wird
      if (micRecordingGain) {
        micRecordingGain.gain.value = SILENT_GAIN;
        console.log('[App] Mic-Gain zurückgesetzt auf SILENT');
      }

      // ✨ Recording Mic Stream stoppen
      disconnectMicFromRecordingChain();
      console.log('[App] Recording Mic Stream bereinigt');

      // ✅ FIX: Visualizer-Mikrofon deaktivieren wenn aktiv
      if (audioSourceStore.isMicrophoneActive) {
        disconnectMicrophoneSource();
        audioSourceStore.setSourceType('player');
        console.log('[App] Visualizer-Mikrofon nach Recording-Ende zurückgesetzt');
      }

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

  // Cleanup recording microphone stream
  disconnectMicFromRecordingChain();
  console.log('[App] Recording Mic cleanup completed');

  // Cleanup visualization microphone
  disconnectMicrophoneSource();
  console.log('[App] Microphone cleanup completed');

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
  background-color: #ffffff; /* Weißer Hintergrund statt schwarz */
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
  background-color: #ffffff; /* Weißer Hintergrund statt schwarz */
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
