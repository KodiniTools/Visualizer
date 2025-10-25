// recorderWorker.js - Schritt 1: Grundgerüst
/**
 * Web Worker für Canvas-Rendering
 * Entlastet Main Thread von schweren Rendering-Operationen
 * 
 * ✅ STEP 1: Grundgerüst mit OffscreenCanvas
 */

// Worker State
const workerState = {
  offscreenCanvas: null,
  ctx: null,
  width: 0,
  height: 0,
  isRecording: false,
  
  // Rendering-Flags (synchron mit recorderStore)
  includeImages: true,
  includeText: true,
  includeVisualizer: true,
  
  // Assets
  images: new Map(), // ImageBitmap Cache
  fonts: new Map(),  // Font Face Daten
  
  // Visualizer State
  analyserData: null,
  selectedVisualizer: 'bars',
  visualizerColor: '#6ea8fe',
  visualizerOpacity: 1.0,
  colorOpacity: 1.0,
  
  // Text State
  texts: [],
  
  // Frame-Requesting
  frameRequesterInterval: null,
  frameRequesterRunning: false,
  videoTrack: null
};

/**
 * Initialisiert Worker mit OffscreenCanvas
 */
function initializeCanvas(canvas, width, height) {
  try {
    workerState.offscreenCanvas = canvas;
    workerState.ctx = canvas.getContext('2d');
    workerState.width = width;
    workerState.height = height;
    
    console.log('[Worker] ✅ OffscreenCanvas initialisiert:', width, 'x', height);
    return { success: true };
  } catch (error) {
    console.error('[Worker] ❌ Fehler bei Canvas-Init:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Aktualisiert Canvas-Dimensionen
 */
function updateDimensions(width, height) {
  workerState.width = width;
  workerState.height = height;
  
  if (workerState.offscreenCanvas) {
    workerState.offscreenCanvas.width = width;
    workerState.offscreenCanvas.height = height;
  }
  
  console.log('[Worker] 📐 Canvas-Dimensionen aktualisiert:', width, 'x', height);
  return { success: true };
}

/**
 * Aktualisiert Rendering-Flags
 */
function updateRenderingFlags(flags) {
  workerState.includeImages = flags.includeImages ?? workerState.includeImages;
  workerState.includeText = flags.includeText ?? workerState.includeText;
  workerState.includeVisualizer = flags.includeVisualizer ?? workerState.includeVisualizer;
  
  console.log('[Worker] 🎛️ Rendering-Flags aktualisiert:', {
    images: workerState.includeImages,
    text: workerState.includeText,
    visualizer: workerState.includeVisualizer
  });
  
  return { success: true };
}

/**
 * Lädt Bild als ImageBitmap
 */
async function loadImage(imageId, imageBlob) {
  try {
    const imageBitmap = await createImageBitmap(imageBlob);
    workerState.images.set(imageId, imageBitmap);
    
    console.log('[Worker] 🖼️ Bild geladen:', imageId, imageBitmap.width, 'x', imageBitmap.height);
    return { success: true };
  } catch (error) {
    console.error('[Worker] ❌ Fehler beim Bild-Laden:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Entfernt Bild aus Cache
 */
function removeImage(imageId) {
  const image = workerState.images.get(imageId);
  if (image) {
    image.close(); // ImageBitmap freigeben
    workerState.images.delete(imageId);
    console.log('[Worker] 🗑️ Bild entfernt:', imageId);
  }
  return { success: true };
}

/**
 * Aktualisiert Visualizer-Daten
 */
function updateVisualizerData(data) {
  workerState.analyserData = data.dataArray;
  workerState.selectedVisualizer = data.visualizer || workerState.selectedVisualizer;
  workerState.visualizerColor = data.color || workerState.visualizerColor;
  workerState.visualizerOpacity = data.opacity ?? workerState.visualizerOpacity;
  workerState.colorOpacity = data.colorOpacity ?? workerState.colorOpacity;
  
  return { success: true };
}

/**
 * Aktualisiert Text-Daten
 */
function updateTexts(texts) {
  workerState.texts = texts;
  console.log('[Worker] 📝 Texte aktualisiert:', texts.length, 'Texte');
  return { success: true };
}

/**
 * Startet Aufnahme
 */
function startRecording() {
  workerState.isRecording = true;
  console.log('[Worker] 🎬 Aufnahme gestartet');
  return { success: true };
}

/**
 * Stoppt Aufnahme
 */
function stopRecording() {
  workerState.isRecording = false;
  console.log('[Worker] ⏹️ Aufnahme gestoppt');
  return { success: true };
}

/**
 * Rendert einen einzelnen Frame
 * Diese Funktion wird später die komplette Rendering-Logik enthalten
 */
function renderFrame() {
  if (!workerState.ctx || !workerState.offscreenCanvas) {
    return { success: false, error: 'Canvas nicht initialisiert' };
  }
  
  const ctx = workerState.ctx;
  const width = workerState.width;
  const height = workerState.height;
  
  // Schwarzer Hintergrund (immer)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  // TODO: In späteren Schritten:
  // - Bilder zeichnen (wenn includeImages)
  // - Visualizer zeichnen (wenn includeVisualizer)
  // - Text zeichnen (wenn includeText)
  
  return { success: true };
}

/**
 * Message Handler - Empfängt Befehle vom Main Thread
 */
self.addEventListener('message', async (event) => {
  const { type, data, requestId } = event.data;
  
  let response = { type, requestId, success: false };
  
  try {
    switch (type) {
      case 'INIT_CANVAS':
        response = { ...response, ...initializeCanvas(data.canvas, data.width, data.height) };
        break;
        
      case 'UPDATE_DIMENSIONS':
        response = { ...response, ...updateDimensions(data.width, data.height) };
        break;
        
      case 'UPDATE_FLAGS':
        response = { ...response, ...updateRenderingFlags(data) };
        break;
        
      case 'LOAD_IMAGE':
        response = { ...response, ...await loadImage(data.imageId, data.imageBlob) };
        break;
        
      case 'REMOVE_IMAGE':
        response = { ...response, ...removeImage(data.imageId) };
        break;
        
      case 'UPDATE_VISUALIZER':
        response = { ...response, ...updateVisualizerData(data) };
        break;
        
      case 'UPDATE_TEXTS':
        response = { ...response, ...updateTexts(data.texts) };
        break;
        
      case 'START_RECORDING':
        response = { ...response, ...startRecording() };
        break;
        
      case 'STOP_RECORDING':
        response = { ...response, ...stopRecording() };
        break;
        
      case 'RENDER_FRAME':
        response = { ...response, ...renderFrame() };
        break;
        
      default:
        response = { 
          ...response, 
          success: false, 
          error: `Unbekannter Message-Type: ${type}` 
        };
    }
  } catch (error) {
    response = { 
      ...response, 
      success: false, 
      error: error.message 
    };
    console.error('[Worker] ❌ Fehler bei', type, ':', error);
  }
  
  // Sende Antwort zurück an Main Thread
  self.postMessage(response);
});

console.log('[Worker] ✅ Worker gestartet und bereit');
