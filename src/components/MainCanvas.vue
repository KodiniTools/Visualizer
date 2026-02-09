
<template>
  <main class="center-column">
    <div class="canvas-wrapper">
      <canvas ref="canvasRef"></canvas>
    </div>
  </main>
</template>

<script setup>
// ✨ NEU: 'watch' wird für die Synchronisierung mit dem Store benötigt
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useCanvasStore } from '../stores/canvasStore.js';
import { useFontStore } from '../stores/fontStore.js';
// ✨ NEU: Der Store für das Grid wird importiert
import { useGridStore } from '../stores/gridStore.js';

import { CanvasManager } from '../lib/canvasManager.js';
import { TextManager } from '../lib/textManager.js';
import { FotoManager } from '../lib/fotoManager.js';
import { GridManager } from '../lib/gridManager.js';

const canvasStore = useCanvasStore();
const fontStore = useFontStore();
// ✨ NEU: Der Grid-Store wird instanziiert
const gridStore = useGridStore();
const canvasRef = ref(null);
const canvasEl = ref(null);
let manager;
const recordingCanvas = document.createElement('canvas');

let canvasManager;
let drawRecordingFrameCount = 0;

// Funktion, die von App.vue aufgerufen wird, um die Szene zu zeichnen
function drawScene() {
  if (canvasManager) {
    canvasManager.draw(canvasRef.value.getContext('2d'));
  }
}

// Funktion, die von App.vue aufgerufen wird, um den Aufnahme-Frame zu zeichnen
function drawRecordingFrame() {
  const canvas = canvasRef.value;
  if (!canvas) {
    console.warn('⚠️ drawRecordingFrame: canvas nicht verfügbar');
    return;
  }

  const recCtx = recordingCanvas.getContext('2d');
  recCtx.drawImage(canvas, 0, 0, recordingCanvas.width, recordingCanvas.height);

  drawRecordingFrameCount++;
  if (drawRecordingFrameCount % 60 === 0) {
    console.log(`🎬 drawRecordingFrame aufgerufen (${drawRecordingFrameCount} mal)`);
  }
}

function prepareRecordingCanvas() {
  const width = 1920;
  const height = 1080;
  recordingCanvas.width = width;
  recordingCanvas.height = height;
  drawRecordingFrameCount = 0;
  console.log('📐 Recording-Canvas vorbereitet:', width, 'x', height);

  const canvas = canvasRef.value;
  if (canvas) {
    const recCtx = recordingCanvas.getContext('2d');
    recCtx.drawImage(canvas, 0, 0, recordingCanvas.width, recordingCanvas.height);
    console.log('✅ Erster Frame ins Recording-Canvas gezeichnet');
  }
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  // Canvas bekommt nur Startauflösung, CSS macht Sizing
  canvas.width = 1920;
  canvas.height = 1080;

  const redraw = () => requestAnimationFrame(drawScene);

  // Der GridManager wird hier bereits korrekt initialisiert
  const gridManager = new GridManager(canvas);
  const fotoManager = new FotoManager(redraw);

  manager = new TextManager(fontStore.fontManager, redraw, () => {});

  const canvasDependencies = {
    textManager: manager,
    gridManager, // Er wird hier übergeben
    fotoManager,
    redrawCallback: redraw,
    onObjectSelected: (obj) => {
      if (obj && obj.type === 'text') canvasStore.setActiveTextObject(obj);
      else canvasStore.setActiveTextObject(null);
    },
  };
  canvasManager = new CanvasManager(canvas, canvasDependencies);
  canvasManager.setupInteractionHandlers();

  canvasStore.setTextManager(manager);

  // ✨ NEU: Watcher zur Synchronisierung des Grid-Zustands
  // Dieser Block "beobachtet" die `isVisible` Eigenschaft im Store.
  // Ändert sich der Wert (z.B. durch den Schalter im ControlsPanel),
  // wird die Sichtbarkeit im GridManager aktualisiert.
  watch(() => gridStore.isVisible, (newValue) => {
    if (gridManager) {
      gridManager.setVisibility(newValue);
      redraw(); // Fordert ein Neuzeichnen an, um das Grid anzuzeigen/auszublenden
    }
  }, {
    // `immediate: true` stellt sicher, dass der anfängliche Zustand
    // aus dem Store beim Laden der Komponente sofort übernommen wird.
    immediate: true
  });
});

onBeforeUnmount(() => {
  manager?.dispose?.();
});

// Gib die Funktionen und Elemente frei, damit App.vue darauf zugreifen kann
defineExpose({
  drawScene,
  drawRecordingFrame,
  prepareRecordingCanvas,
  getCanvasElement: () => canvasRef.value,
  getRecordingCanvas: () => recordingCanvas,
});
</script>

<style scoped>
.center-column {
  min-width: 0;
  padding: 0;
  background-color: transparent;
  border: none;
}
.canvas-wrapper {
  flex-grow: 1;
  background-color: var(--card-bg, #151b1d); /* Dunkler Hintergrund passend zu den Sidebars */
  border-radius: 12px;
  overflow: auto;        /* ← ÄNDERN: hidden → auto */
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
}
</style>
