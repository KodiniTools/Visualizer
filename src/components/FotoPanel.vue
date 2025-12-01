<template>
  <div class="foto-panel-wrapper">
    <!-- ✨ Upload-Bereich (immer sichtbar) -->
    <div class="upload-section">
      <h4>Bilder hinzufügen</h4>
      
      <div class="upload-area" @click="triggerFileInput">
        <input 
          type="file" 
          ref="fileInputRef" 
          @change="handleImageUpload" 
          accept="image/*"
          multiple
          style="display: none;"
        >
        <div class="upload-placeholder">
          <p>Klicken zum Hochladen</p>
          <small>Mehrere Bilder möglich (JPG, PNG, GIF, WebP)</small>
        </div>
      </div>

      <!-- ✨ NEU: Scrollbare Galerie mit Thumbnails -->
      <div v-if="imageGallery.length > 0" class="gallery-container">
        <div class="gallery-header">
          <span class="gallery-title">Galerie ({{ imageGallery.length }})</span>
          <button @click="clearAllImages" class="btn-clear-all">Alle löschen</button>
        </div>
        
        <div class="gallery-scroll">
          <div class="gallery-grid">
            <div 
              v-for="(imgData, index) in imageGallery" 
              :key="imgData.id"
              class="thumbnail-item"
              :class="{ 'selected': selectedImageIndex === index }"
              @click="selectImage(index)"
            >
              <img :src="imgData.img.src" :alt="imgData.name">
              <div class="thumbnail-overlay">
                <button @click.stop="deleteImage(index)" class="btn-delete-thumb">✕</button>
              </div>
              <div class="thumbnail-info">
                <span class="thumbnail-name">{{ imgData.name }}</span>
                <span class="thumbnail-size">{{ imgData.dimensions }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action-Buttons (nur sichtbar wenn Bild ausgewählt) -->
      <div v-if="selectedImage" class="action-buttons">
        <button @click="addImageToCanvas" class="btn-primary">
          Auf Canvas platzieren
        </button>
        <button @click="setAsBackground" class="btn-secondary">
          Als Hintergrund
        </button>
        <button @click="setAsWorkspaceBackground" class="btn-workspace">
          Als Workspace-Hintergrund
        </button>
      </div>

      <!-- Info-Text wenn keine Bilder -->
      <div v-if="imageGallery.length === 0" class="empty-state">
        <p>Keine Bilder hochgeladen</p>
      </div>
    </div>

    <!-- Filter-Bereich (nur sichtbar wenn Bild auf Canvas ausgewählt) -->
    <div class="foto-panel-container" ref="containerRef" style="display: none;">
      <h4>Bild bearbeiten</h4>

      <div class="control-group">
        <label>Filter-Preset</label>
        <select ref="presetSelectRef" @change="onPresetChange">
          <option value="">Kein Filter</option>
          <option v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ preset.name_de }}
          </option>
        </select>
      </div>

      <div class="control-group slider">
        <label>Helligkeit</label>
        <input type="range" min="0" max="200" value="100" ref="brightnessInputRef" @input="onBrightnessChange">
        <span ref="brightnessValueRef">100%</span>
      </div>

      <div class="control-group slider">
        <label>Kontrast</label>
        <input type="range" min="0" max="200" value="100" ref="contrastInputRef" @input="onContrastChange">
        <span ref="contrastValueRef">100%</span>
      </div>

      <div class="control-group slider">
        <label>Sättigung</label>
        <input type="range" min="0" max="200" value="100" ref="saturationInputRef" @input="onSaturationChange">
        <span ref="saturationValueRef">100%</span>
      </div>

      <div class="control-group slider">
        <label>Deckkraft</label>
        <input type="range" min="0" max="100" value="100" ref="opacityInputRef" @input="onOpacityChange">
        <span ref="opacityValueRef">100%</span>
      </div>

      <div class="control-group slider">
        <label>Unschärfe</label>
        <input type="range" min="0" max="20" value="0" step="1" ref="blurInputRef" @input="onBlurChange">
        <span ref="blurValueRef">0px</span>
      </div>

      <!-- MODERNE SCHATTEN & ROTATIONS-SEKTION -->
      <div class="modern-divider"></div>
      <div class="modern-section-header">
        <h4>Schatten & Effekte</h4>
      </div>

      <!-- Shadow Controls Group -->
      <div class="modern-controls-group">
        <!-- Schattenfarbe -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">Farbe</span>
          </label>
          <div class="modern-color-picker">
            <input 
              type="color" 
              ref="shadowColorInputRef"
              @input="onShadowColorChange"
              value="#000000"
              class="modern-color-input"
              title="Schattenfarbe wählen"
            />
            <input 
              type="text" 
              ref="shadowColorTextRef"
              @input="onShadowColorTextChange"
              value="#000000"
              class="modern-color-text"
              placeholder="#000000"
            />
          </div>
        </div>

        <!-- Schatten-Unschärfe -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">Unschärfe</span>
            <span class="label-value" ref="shadowBlurValueRef">0px</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max="50" 
            value="0" 
            step="1" 
            ref="shadowBlurInputRef" 
            @input="onShadowBlurChange"
            class="modern-slider shadow-slider"
          />
        </div>

        <!-- Schatten X-Offset -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">Horizontal</span>
            <span class="label-value" ref="shadowOffsetXValueRef">0px</span>
          </label>
          <input 
            type="range" 
            min="-50" 
            max="50" 
            value="0" 
            step="1" 
            ref="shadowOffsetXInputRef" 
            @input="onShadowOffsetXChange"
            class="modern-slider shadow-slider"
          />
        </div>

        <!-- Schatten Y-Offset -->
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">Vertikal</span>
            <span class="label-value" ref="shadowOffsetYValueRef">0px</span>
          </label>
          <input 
            type="range" 
            min="-50" 
            max="50" 
            value="0" 
            step="1" 
            ref="shadowOffsetYInputRef" 
            @input="onShadowOffsetYChange"
            class="modern-slider shadow-slider"
          />
        </div>
      </div>

      <!-- Rotation Section -->
      <div class="modern-section-header" style="margin-top: 20px;">
        <h4>Rotation</h4>
      </div>

      <div class="modern-controls-group">
        <div class="modern-control">
          <label class="modern-label">
            <span class="label-text">Drehwinkel</span>
            <span class="label-value" ref="rotationValueRef">0°</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value="50" 
            step="1" 
            ref="rotationInputRef" 
            @input="onRotationChange"
            class="modern-slider rotation-slider"
          />
          <div class="rotation-hint">← -180° | 0° | +180° →</div>
        </div>
      </div>

      <button @click="resetFilters" class="btn-secondary modern-reset-btn">
        Alle Filter zurücksetzen
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue';

// Refs für alle UI-Elemente
const containerRef = ref(null);
const presetSelectRef = ref(null);
const brightnessInputRef = ref(null);
const brightnessValueRef = ref(null);
const contrastInputRef = ref(null);
const contrastValueRef = ref(null);
const saturationInputRef = ref(null);
const saturationValueRef = ref(null);
const opacityInputRef = ref(null);
const opacityValueRef = ref(null);
const blurInputRef = ref(null);
const blurValueRef = ref(null);

// ✨ NEU: Refs für Schatten und Rotation
const shadowColorInputRef = ref(null);
const shadowColorTextRef = ref(null);
const shadowBlurInputRef = ref(null);
const shadowBlurValueRef = ref(null);
const shadowOffsetXInputRef = ref(null);
const shadowOffsetXValueRef = ref(null);
const shadowOffsetYInputRef = ref(null);
const shadowOffsetYValueRef = ref(null);
const rotationInputRef = ref(null);
const rotationValueRef = ref(null);

// ✨ NEU: Refs für Galerie-Funktionalität
const fileInputRef = ref(null);
const imageGallery = ref([]); // Array von Bildern
const selectedImageIndex = ref(null); // Aktuell ausgewählter Index

// Holen die Manager-Instanzen aus App.vue (als reactive refs)
const fotoManagerRef = inject('fotoManager');
const canvasManagerRef = inject('canvasManager');
const multiImageManagerRef = inject('multiImageManager');
const presets = ref([]);

// ✨ NEU: Aktuell ausgewähltes Bild auf dem Canvas
const currentActiveImage = ref(null);

// ✨ NEU: Computed für aktuell ausgewähltes Bild aus Galerie
const selectedImage = computed(() => {
  if (selectedImageIndex.value !== null && imageGallery.value[selectedImageIndex.value]) {
    return imageGallery.value[selectedImageIndex.value];
  }
  return null;
});

// ✨ NEU: Filter-Änderungs-Handler
function onBrightnessChange(event) {
  const value = parseInt(event.target.value);
  brightnessValueRef.value.textContent = value + '%';
  updateActiveImageSetting('brightness', value);
}

function onContrastChange(event) {
  const value = parseInt(event.target.value);
  contrastValueRef.value.textContent = value + '%';
  updateActiveImageSetting('contrast', value);
}

function onSaturationChange(event) {
  const value = parseInt(event.target.value);
  saturationValueRef.value.textContent = value + '%';
  updateActiveImageSetting('saturation', value);
}

function onOpacityChange(event) {
  const value = parseInt(event.target.value);
  opacityValueRef.value.textContent = value + '%';
  updateActiveImageSetting('opacity', value);
}

function onBlurChange(event) {
  const value = parseInt(event.target.value);
  blurValueRef.value.textContent = value + 'px';
  updateActiveImageSetting('blur', value);
}

// ✨ NEU: Schatten-Handler
function onShadowColorChange(event) {
  const value = event.target.value;
  shadowColorTextRef.value.value = value;
  updateActiveImageSetting('shadowColor', value);
}

function onShadowColorTextChange(event) {
  const value = event.target.value;
  shadowColorInputRef.value.value = value;
  updateActiveImageSetting('shadowColor', value);
}

function onShadowBlurChange(event) {
  const value = parseInt(event.target.value);
  shadowBlurValueRef.value.textContent = value + 'px';
  updateActiveImageSetting('shadowBlur', value);
}

function onShadowOffsetXChange(event) {
  const value = parseInt(event.target.value);
  shadowOffsetXValueRef.value.textContent = value + 'px';
  updateActiveImageSetting('shadowOffsetX', value);
}

function onShadowOffsetYChange(event) {
  const value = parseInt(event.target.value);
  shadowOffsetYValueRef.value.textContent = value + 'px';
  updateActiveImageSetting('shadowOffsetY', value);
}

function onRotationChange(event) {
  const sliderValue = parseInt(event.target.value);
  // Umrechnung: Slider 0-100 → Rotation -180° bis +180°
  // Slider 0 = -180°, Slider 50 = 0°, Slider 100 = +180°
  const actualRotation = (sliderValue - 50) * 3.6;
  rotationValueRef.value.textContent = Math.round(actualRotation) + '°';
  updateActiveImageSetting('rotation', actualRotation);
}

function onPresetChange(event) {
  const presetId = event.target.value;
  updateActiveImageSetting('preset', presetId || null);
  
  // Wenn ein Preset ausgewählt wurde, lade die Preset-Werte
  if (presetId && fotoManagerRef?.value) {
    const preset = presets.value.find(p => p.id === presetId);
    if (preset && preset.settings) {
      // Setze alle Werte aus dem Preset
      if (preset.settings.brightness !== undefined) {
        brightnessInputRef.value.value = preset.settings.brightness;
        brightnessValueRef.value.textContent = preset.settings.brightness + '%';
        updateActiveImageSetting('brightness', preset.settings.brightness);
      }
      if (preset.settings.contrast !== undefined) {
        contrastInputRef.value.value = preset.settings.contrast;
        contrastValueRef.value.textContent = preset.settings.contrast + '%';
        updateActiveImageSetting('contrast', preset.settings.contrast);
      }
      if (preset.settings.saturation !== undefined) {
        saturationInputRef.value.value = preset.settings.saturation;
        saturationValueRef.value.textContent = preset.settings.saturation + '%';
        updateActiveImageSetting('saturation', preset.settings.saturation);
      }
    }
  }
}

function resetFilters() {
  brightnessInputRef.value.value = 100;
  brightnessValueRef.value.textContent = '100%';
  contrastInputRef.value.value = 100;
  contrastValueRef.value.textContent = '100%';
  saturationInputRef.value.value = 100;
  saturationValueRef.value.textContent = '100%';
  opacityInputRef.value.value = 100;
  opacityValueRef.value.textContent = '100%';
  blurInputRef.value.value = 0;
  blurValueRef.value.textContent = '0px';
  
  // ✨ Schatten zurücksetzen
  shadowColorInputRef.value.value = '#000000';
  shadowColorTextRef.value.value = '#000000';
  shadowBlurInputRef.value.value = 0;
  shadowBlurValueRef.value.textContent = '0px';
  shadowOffsetXInputRef.value.value = 0;
  shadowOffsetXValueRef.value.textContent = '0px';
  shadowOffsetYInputRef.value.value = 0;
  shadowOffsetYValueRef.value.textContent = '0px';
  
  // ✨ Rotation zurücksetzen (Slider auf Mitte = 50 = 0°)
  rotationInputRef.value.value = 50;
  rotationValueRef.value.textContent = '0°';
  
  presetSelectRef.value.value = '';
  
  if (currentActiveImage.value) {
    // ✨ WICHTIG: Nutze fotoSettings statt settings (für FotoManager Kompatibilität)
    if (!currentActiveImage.value.fotoSettings) {
      currentActiveImage.value.fotoSettings = {};
    }
    
    currentActiveImage.value.fotoSettings.brightness = 100;
    currentActiveImage.value.fotoSettings.contrast = 100;
    currentActiveImage.value.fotoSettings.saturation = 100;
    currentActiveImage.value.fotoSettings.opacity = 100;
    currentActiveImage.value.fotoSettings.blur = 0;
    currentActiveImage.value.fotoSettings.hueRotate = 0;
    currentActiveImage.value.fotoSettings.grayscale = 0;
    currentActiveImage.value.fotoSettings.sepia = 0;
    currentActiveImage.value.fotoSettings.invert = 0;
    
    // ✨ Schatten und Rotation zurücksetzen
    currentActiveImage.value.fotoSettings.shadowColor = '#000000';
    currentActiveImage.value.fotoSettings.shadowBlur = 0;
    currentActiveImage.value.fotoSettings.shadowOffsetX = 0;
    currentActiveImage.value.fotoSettings.shadowOffsetY = 0;
    currentActiveImage.value.fotoSettings.rotation = 0;
    
    triggerRedraw();
  }
}

// ✨ NEU: Aktualisiert die Einstellungen des aktiven Bildes
function updateActiveImageSetting(property, value) {
  if (!currentActiveImage.value) {
    console.warn('⚠️ Kein aktives Bild zum Anwenden der Filter');
    return;
  }
  
  const imgData = currentActiveImage.value;
  
  // ✨ WICHTIG: Nutze fotoSettings statt settings (für FotoManager Kompatibilität)
  if (!imgData.fotoSettings) {
    imgData.fotoSettings = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      opacity: 100,
      blur: 0,
      hueRotate: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0,
      // ✨ Schatten und Rotation
      shadowColor: '#000000',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      rotation: 0
    };
  }
  
  imgData.fotoSettings[property] = value;
  
  console.log(`✏️ Filter aktualisiert: ${property} = ${value}`, imgData.fotoSettings);
  
  // Redraw triggern
  triggerRedraw();
}

// ✨ NEU: Lädt die Einstellungen eines Bildes in die UI
function loadImageSettings(imgData) {
  if (!imgData) {
    console.warn('⚠️ Keine Bilddaten zum Laden');
    return;
  }
  
  // ✨ WICHTIG: Nutze fotoSettings statt settings (für FotoManager Kompatibilität)
  const s = imgData.fotoSettings || imgData.settings || {};
  
  brightnessInputRef.value.value = s.brightness || 100;
  brightnessValueRef.value.textContent = (s.brightness || 100) + '%';
  
  contrastInputRef.value.value = s.contrast || 100;
  contrastValueRef.value.textContent = (s.contrast || 100) + '%';
  
  saturationInputRef.value.value = s.saturation || 100;
  saturationValueRef.value.textContent = (s.saturation || 100) + '%';
  
  opacityInputRef.value.value = s.opacity || 100;
  opacityValueRef.value.textContent = (s.opacity || 100) + '%';
  
  blurInputRef.value.value = s.blur || 0;
  blurValueRef.value.textContent = (s.blur || 0) + 'px';
  
  // ✨ Schatten und Rotation laden
  shadowColorInputRef.value.value = s.shadowColor || '#000000';
  shadowColorTextRef.value.value = s.shadowColor || '#000000';
  
  shadowBlurInputRef.value.value = s.shadowBlur || 0;
  shadowBlurValueRef.value.textContent = (s.shadowBlur || 0) + 'px';
  
  shadowOffsetXInputRef.value.value = s.shadowOffsetX || 0;
  shadowOffsetXValueRef.value.textContent = (s.shadowOffsetX || 0) + 'px';
  
  shadowOffsetYInputRef.value.value = s.shadowOffsetY || 0;
  shadowOffsetYValueRef.value.textContent = (s.shadowOffsetY || 0) + 'px';
  
  // ✨ Rotation: Umrechnung von tatsächlicher Rotation (-180° bis +180°) zu Slider-Wert (0-100)
  const rotation = s.rotation || 0;
  const sliderValue = Math.round((rotation / 3.6) + 50);
  rotationInputRef.value.value = sliderValue;
  rotationValueRef.value.textContent = Math.round(rotation) + '°';
  
  presetSelectRef.value.value = s.preset || '';
  
  console.log('📥 Filter-Einstellungen geladen:', s);
}

// ✨ NEU: Trigger einen Redraw
function triggerRedraw() {
  // Versuche über verschiedene Wege einen Redraw auszulösen
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(() => {
      // Die draw-Loop in App.vue läuft bereits
    });
  }
}

// Trigger File Input
function triggerFileInput() {
  fileInputRef.value?.click();
}

// ✨ ERWEITERT: Handle Image Upload (jetzt mit Multi-Upload)
function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // Jede Datei einzeln verarbeiten
  Array.from(files).forEach(file => {
    // Validierung
    if (!file.type.startsWith('image/')) {
      console.warn('Überspringe Nicht-Bild-Datei:', file.name);
      return;
    }

    // Bild laden
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Zur Galerie hinzufügen
        const imageData = {
          id: Date.now() + Math.random(), // Eindeutige ID
          img: img,
          name: file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name,
          dimensions: `${img.width}×${img.height}`,
          size: formatFileSize(file.size)
        };
        
        imageGallery.value.push(imageData);
        
        // Automatisch das erste Bild auswählen
        if (imageGallery.value.length === 1) {
          selectedImageIndex.value = 0;
        }
        
        console.log('✅ Bild zur Galerie hinzugefügt:', imageData.name, imageData.dimensions);
      };
      img.onerror = () => {
        alert(`Fehler beim Laden des Bildes: ${file.name}`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Input zurücksetzen für erneutes Hochladen
  event.target.value = '';
}

// ✨ NEU: Formatiere Dateigröße
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ✨ NEU: Bild aus Galerie auswählen
function selectImage(index) {
  selectedImageIndex.value = index;
  console.log('📌 Bild ausgewählt:', imageGallery.value[index].name);
}

// ✨ NEU: Einzelnes Bild aus Galerie löschen
function deleteImage(index) {
  const deletedImage = imageGallery.value[index];
  imageGallery.value.splice(index, 1);
  
  // Auswahl anpassen
  if (selectedImageIndex.value === index) {
    selectedImageIndex.value = imageGallery.value.length > 0 ? 0 : null;
  } else if (selectedImageIndex.value > index) {
    selectedImageIndex.value--;
  }
  
  console.log('🗑️ Bild gelöscht:', deletedImage.name);
}

// ✨ NEU: Alle Bilder löschen
function clearAllImages() {
  if (!confirm(`Alle ${imageGallery.value.length} Bilder aus der Galerie löschen?`)) {
    return;
  }
  
  imageGallery.value = [];
  selectedImageIndex.value = null;
  console.log('🗑️ Galerie geleert');
}

// GEÄNDERT: Bild auf Canvas platzieren - verwendet jetzt MultiImageManager
function addImageToCanvas() {
  if (!selectedImage.value) return;
  
  const multiImageManager = multiImageManagerRef?.value;
  if (!multiImageManager) {
    console.error('❌ MultiImageManager nicht verfügbar');
    return;
  }

  multiImageManager.addImage(selectedImage.value.img);
  console.log('✅ Bild auf Canvas platziert:', selectedImage.value.name);
}

// UNVERÄNDERT: Bild als Hintergrund setzen
function setAsBackground() {
  if (!selectedImage.value) return;
  
  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) {
    console.error('❌ CanvasManager nicht verfügbar');
    return;
  }

  canvasManager.setBackground(selectedImage.value.img);
  console.log('✅ Bild als Hintergrund gesetzt:', selectedImage.value.name);
}

// ✨ NEU: Bild als Workspace-Hintergrund setzen
function setAsWorkspaceBackground() {
  if (!selectedImage.value) return;
  
  const canvasManager = canvasManagerRef?.value;
  if (!canvasManager) {
    console.error('❌ CanvasManager nicht verfügbar');
    return;
  }

  const success = canvasManager.setWorkspaceBackground(selectedImage.value.img);
  if (success) {
    console.log('✅ Bild als Workspace-Hintergrund gesetzt:', selectedImage.value.name);
  } else {
    alert('⚠️ Bitte wählen Sie zuerst einen Social Media Workspace aus (z.B. TikTok, Instagram Story, etc.)');
  }
}

onMounted(() => {
  // Warte kurz falls Manager noch nicht initialisiert sind
  const initializePanel = () => {
    const fotoManager = fotoManagerRef?.value;
    
    if (!fotoManager) {
      console.warn('⏳ FotoManager noch nicht verfügbar, versuche erneut...');
      setTimeout(initializePanel, 100);
      return;
    }
    
    // Presets für das Dropdown-Menü laden
    presets.value = fotoManager.getAvailablePresets();

    // Ein Objekt mit allen DOM-Referenzen erstellen
    const controls = {
      container: containerRef.value,
      presetSelect: presetSelectRef.value,
      brightnessInput: brightnessInputRef.value,
      brightnessValue: brightnessValueRef.value,
      contrastInput: contrastInputRef.value,
      contrastValue: contrastValueRef.value,
      saturationInput: saturationInputRef.value,
      saturationValue: saturationValueRef.value,
      opacityInput: opacityInputRef.value,
      opacityValue: opacityValueRef.value,
      blurInput: blurInputRef.value,
      blurValue: blurValueRef.value,
      // ✨ NEU: Eigene Handler-Funktionen
      loadImageSettings: loadImageSettings,
      currentActiveImage: currentActiveImage
    };

    // Die UI-Handler im FotoManager mit den DOM-Elementen verbinden (für Hintergrund-Bilder)
    fotoManager.setupUIHandlers(controls);

    // Die Controls global verfügbar machen, damit App.vue sie finden kann
    window.fotoPanelControls = controls;
    
    console.log('✅ FotoPanel initialisiert');
  };
  
  initializePanel();
});

// ✨ NEU: Watcher für Änderungen am aktiven Bild
// Dieser wird von App.vue über window.fotoPanelControls.currentActiveImage gesetzt
watch(currentActiveImage, (newImage) => {
  if (newImage) {
    console.log('🖼️ Aktives Bild geändert:', newImage);
    
    // Panel anzeigen
    if (containerRef.value) {
      containerRef.value.style.display = 'block';
    }
    
    // Lade die Einstellungen des Bildes
    loadImageSettings(newImage);
  } else {
    // Panel verstecken
    if (containerRef.value) {
      containerRef.value.style.display = 'none';
    }
  }
}, { immediate: true });
</script>

<style scoped>
.foto-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Upload-Bereich Styles */
.upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #333;
}

.upload-section h4 {
  margin: 0 0 14px 0;
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.upload-area {
  border: 2px dashed #555;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #1e1e1e;
}

.upload-area:hover {
  border-color: #6ea8fe;
  background-color: #252525;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-placeholder p {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
}

.upload-placeholder small {
  font-size: 11px;
  color: #999;
}

/* ✨ NEU: Galerie-Container */
.gallery-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 12px;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.gallery-title {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
}

.btn-clear-all {
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid #555;
  background-color: #ff6b6b;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-all:hover {
  background-color: #ff5252;
}

/* ✨ NEU: Scrollbarer Galerie-Bereich */
.gallery-scroll {
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

/* Custom Scrollbar */
.gallery-scroll::-webkit-scrollbar {
  width: 6px;
}

.gallery-scroll::-webkit-scrollbar-track {
  background: #1e1e1e;
  border-radius: 3px;
}

.gallery-scroll::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.gallery-scroll::-webkit-scrollbar-thumb:hover {
  background: #6ea8fe;
}

/* ✨ NEU: Thumbnail-Grid */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.thumbnail-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background-color: #1e1e1e;
}

.thumbnail-item:hover {
  border-color: #6ea8fe;
  transform: scale(1.02);
}

.thumbnail-item.selected {
  border-color: #6ea8fe;
  box-shadow: 0 0 0 2px rgba(110, 168, 254, 0.3);
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.thumbnail-item:hover .thumbnail-overlay {
  opacity: 1;
}

.btn-delete-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: rgba(255, 69, 58, 0.95);
  color: white;
  border: 1.5px solid white;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-delete-thumb:hover {
  background-color: rgba(255, 69, 58, 1);
  transform: scale(1.1);
}

.thumbnail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  padding: 6px 6px 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.thumbnail-name {
  font-size: 10px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thumbnail-size {
  font-size: 9px;
  color: #ccc;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}

/* Action-Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-buttons button {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #555;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%);
  color: #121212;
  font-weight: 600;
  border-color: #6ea8fe;
  box-shadow: 0 2px 4px rgba(110, 168, 254, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #5a8fe6 0%, #4a7fd6 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(110, 168, 254, 0.3);
}

.btn-secondary {
  background-color: #2a2a2a;
  color: #e0e0e0;
  border: 1px solid #3a3a3a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
  font-weight: 600;
}

.btn-secondary:hover {
  background-color: #333;
  border-color: #4a4a4a;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-workspace {
  background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);
  color: #121212;
  font-weight: 600;
  border-color: #ffa726;
  box-shadow: 0 2px 4px rgba(255, 167, 38, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
}

.btn-workspace:hover {
  background: linear-gradient(135deg, #fb8c00 0%, #f57c00 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(255, 167, 38, 0.3);
}

/* Filter-Bereich Styles (unverändert) */
.foto-panel-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid #333;
  padding-top: 16px;
}

.foto-panel-container h4 {
  margin: 0 0 14px 0;
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.control-group.slider {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.control-group.slider label {
  grid-column: 1 / 3;
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.control-group.slider input {
  width: 100%;
}

.control-group.slider span {
  font-size: 11px;
  color: #6ea8fe;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  min-width: 50px;
  text-align: right;
}

.control-group select {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #555;
  background-color: #3a3a3a;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

.control-group select:hover,
.control-group select:focus {
  border-color: #6ea8fe;
  z-index: 100;
}

.foto-panel-container .btn-secondary {
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #555;
  background-color: #555;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.foto-panel-container .btn-secondary:hover {
  background-color: #666;
}

/* Range Slider Styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 5px;
  border-radius: 10px;
  background: linear-gradient(90deg, #2a2a2a 0%, #3a3a3a 100%);
  outline: none;
  cursor: pointer;
  border: 1px solid #333;
  transition: all 0.3s ease;
}

input[type="range"]:hover {
  border-color: #444;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), 0 0 0 0 rgba(110, 168, 254, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: linear-gradient(135deg, #5a8fe6 0%, #4a7fd6 100%);
  transform: scale(1.15);
  box-shadow: 
    0 3px 8px rgba(0, 0, 0, 0.5),
    0 0 0 4px rgba(110, 168, 254, 0.2),
    0 0 20px rgba(110, 168, 254, 0.4);
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6ea8fe 0%, #5a8fe6 100%);
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

input[type="range"]::-moz-range-thumb:hover {
  background: linear-gradient(135deg, #5a8fe6 0%, #4a7fd6 100%);
  transform: scale(1.15);
  box-shadow: 
    0 3px 8px rgba(0, 0, 0, 0.5),
    0 0 0 4px rgba(110, 168, 254, 0.2);
}

/* ✨ Color Picker Styling */
.color-picker-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-input {
  width: 50px;
  height: 38px;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  background-color: #2a2a2a;
}

.color-input:hover {
  border-color: #6ea8fe;
}

.color-text-input {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #555;
  background-color: #3a3a3a;
  color: #e0e0e0;
  font-size: 13px;
}

.color-text-input:focus {
  outline: none;
  border-color: #6ea8fe;
}

/* ✨ Divider */
.divider {
  height: 1px;
  background-color: #444;
  margin: 16px 0;
}

/* ✨ MODERNE SCHATTEN & ROTATIONS SEKTION */
.modern-divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, #6ea8fe, transparent);
  margin: 24px 0 20px 0;
  border-radius: 2px;
}

.modern-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.modern-section-header h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #aaa;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.modern-controls-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(42, 42, 42, 0.5);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(110, 168, 254, 0.1);
}

.modern-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modern-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #aaa;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-text {
  color: #bbb;
}

.label-value {
  color: #6ea8fe;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  min-width: 45px;
  text-align: right;
}

/* ✨ MODERNE SLIDER */
.modern-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

/* Shadow Slider - Lila/Blau Gradient */
.shadow-slider {
  background: linear-gradient(90deg, #1a1a2e 0%, #6ea8fe 50%, #a78bfa 100%);
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.2);
}

.shadow-slider:hover {
  box-shadow: 0 3px 12px rgba(110, 168, 254, 0.4);
  transform: scaleY(1.2);
}

/* Rotation Slider - Orange/Blau Gradient */
.rotation-slider {
  background: linear-gradient(90deg, #f97316 0%, #6ea8fe 50%, #3b82f6 100%);
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.2);
}

.rotation-slider:hover {
  box-shadow: 0 3px 12px rgba(59, 130, 246, 0.4);
  transform: scaleY(1.2);
}

/* Slider Thumb - Webkit (Chrome, Safari, Edge) */
.modern-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6ea8fe, #5a96e5);
  cursor: pointer;
  border: 3px solid #1a1a2e;
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.5), 0 0 0 0 rgba(110, 168, 254, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modern-slider::-webkit-slider-thumb:hover {
  transform: scale(1.3);
  box-shadow: 0 4px 16px rgba(110, 168, 254, 0.8), 0 0 0 8px rgba(110, 168, 254, 0.2);
}

.modern-slider::-webkit-slider-thumb:active {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.9), 0 0 0 12px rgba(110, 168, 254, 0.3);
}

/* Slider Thumb - Firefox */
.modern-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6ea8fe, #5a96e5);
  cursor: pointer;
  border: 3px solid #1a1a2e;
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modern-slider::-moz-range-thumb:hover {
  transform: scale(1.3);
  box-shadow: 0 4px 16px rgba(110, 168, 254, 0.8);
}

.modern-slider::-moz-range-thumb:active {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(110, 168, 254, 0.9);
}

/* ✨ MODERNER COLOR PICKER */
.modern-color-picker {
  display: flex;
  gap: 10px;
  align-items: center;
}

.modern-color-input {
  width: 45px;
  height: 45px;
  border: 2px solid #444;
  border-radius: 10px;
  cursor: pointer;
  background-color: #2a2a2a;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.modern-color-input:hover {
  border-color: #6ea8fe;
  box-shadow: 0 4px 16px rgba(110, 168, 254, 0.3);
  transform: scale(1.05);
}

.modern-color-text {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #444;
  background-color: #2a2a2a;
  color: #e0e0e0;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
}

.modern-color-text:focus {
  outline: none;
  border-color: #6ea8fe;
  box-shadow: 0 0 0 3px rgba(110, 168, 254, 0.2);
}

/* ✨ ROTATION HINT */
.rotation-hint {
  font-size: 10px;
  color: #666;
  text-align: center;
  margin-top: 4px;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

/* ✨ MODERNER RESET BUTTON */
.modern-reset-btn {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #555 0%, #3a3a3a 100%);
  border: 1px solid #666;
  transition: all 0.3s ease;
  font-weight: 500;
}

.modern-reset-btn:hover {
  background: linear-gradient(135deg, #666 0%, #4a4a4a 100%);
  border-color: #6ea8fe;
  box-shadow: 0 4px 12px rgba(110, 168, 254, 0.2);
  transform: translateY(-2px);
}
</style>
